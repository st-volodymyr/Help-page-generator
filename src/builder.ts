import type { Section } from './types.js';

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function slugify(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const PCT_RE   = /\d+[.,]\d+\s*%|\d+\s*%/;
// Thousands separators seen in the source sheets: comma, period, plain space and
// the Unicode spaces the translators actually use — no-break (U+00A0), thin
// (U+2009) and narrow no-break (U+202F). Matching only the ASCII space silently
// left fr-ca "10 000" and sv "3 000" untemplatized.
const SEP      = /[,.\u0020\u00a0\u2009\u202f]/.source;
// A thousands-separated amount, e.g. "3,000", "3.000", "10 000", "1.234,50".
const AMOUNT   = String.raw`\d{1,3}(?:${SEP}\d{3})+(?:[.,]\d{1,2})?`;
// Source cells often bracket the placeholder value ("[3.000]x", "[10 000] fois").
// The brackets are part of the placeholder and must be consumed by the match,
// otherwise the output keeps them as "[{{maxWinnings}}]".
export const MONEY_RE = new RegExp(String.raw`\[\s*${AMOUNT}\s*\]|${AMOUNT}`);
// A line enumerating several bet multipliers (jackpot tiers such as
// "25x, 50x, 100x, 200x e 1.000x") is not a max-win statement, even though the
// European thousands separator makes "1.000x" look like an amount. A genuine
// max-win line quotes exactly one multiplier, so 2+ of them means "not max win".
const MULTIPLIER_RE = /\d(?:[.,\s]?\d)*\s*x/gi;

/** True when the line lists several bet multipliers rather than a single max-win amount. */
export function isMultiplierList(line: string): boolean {
  return (line.match(MULTIPLIER_RE) ?? []).length >= 2;
}

/** Sections whose slug contains 'return' keep the shared {{game_rtp}} template name. */
function isMainRtpSection(slug: string): boolean {
  return slug.includes('return');
}

export function processLine(line: string, rtpParamName = 'game_rtp', templatize = true): string {
  if (!line) return '';
  if (!templatize) return esc(line);
  if (PCT_RE.test(line))
    return esc(line
      .replace(/(\d+[.,]\d+)(\s*%)/, `{{${rtpParamName}}}$2`)
      .replace(/(\d+)(\s*%)/, `{{${rtpParamName}}}$2`)
    );
  if (MONEY_RE.test(line) && !isMultiplierList(line) && !line.includes('{{maxWinnings}}'))
    return [
      `<span class="not-configured_{{maxWinnings}}">`,
      `                ${esc(line.replace(MONEY_RE, '{{maxWinnings}}'))}`,
      `            </span>`,
    ].join('\n');
  return esc(line);
}

function buildSection(sec: Section, col: number, templatize: boolean): string {
  const id    = slugify(sec.enTitle) || 'section';
  const title = sec.titleByCol[col] ?? '';
  const lines = sec.contentByCol[col] ?? [];
  const ind   = '            ';

  const mainRtp = isMainRtpSection(id);
  let rtpCount = 0;

  const processedLines = lines.map((l, i) => {
    let paramName = 'game_rtp';
    if (templatize && !mainRtp && PCT_RE.test(l)) {
      rtpCount++;
      paramName = rtpCount === 1 ? `${id}_rtp` : `${id}_rtp_${rtpCount}`;
    }
    return ind + processLine(l, paramName, templatize) + (i < lines.length - 1 ? '\n' + ind + '<br>' : '');
  });

  return [
    `    <div id="help__${id}">`,
    `        <h2>${esc(title)}${title ? ':' : ''}</h2>`,
    '',
    '        <p>',
    processedLines.join('\n'),
    '        </p>',
    '    </div>',
  ].join('\n');
}

export function buildHtml(gameName: string, sections: Section[], col: number, templatize = true): string {
  return [
    '<div id="content-help">',
    '    <style>',
    "        #content-help p { font-family: 'Quicksand Regular'; }",
    "        #content-help h1, #content-help h2, #content-help h3 { font-family: 'Quicksand Bold'; }",
    '        .visible_false, .not-configured_, .bfs_true { display: none; }',
    '    </style>',
    '',
    '    <div id="help__name" style="text-align: center;">',
    `        <h1>${esc(gameName)}</h1>`,
    '    </div>',
    '',
    sections.map(s => buildSection(s, col, templatize)).join('\n\n'),
    '</div>',
  ].join('\n');
}
