import type { Section } from './types.js';
import { CROWN_STYLE } from './crownStyle.js';

/** 'pz' — PlayZido help fragment; 'crown' — Crown fragment (embedded fonts, scroll container). */
export type HelpFormat = 'pz' | 'crown';

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

/**
 * Comparable form of a max-win amount across locales: "[250,000.00]", "250.000,00"
 * and "250 000" all become "250000" (brackets, cents and separators dropped).
 */
export function amountKey(amount: string): string {
  return amount.replace(/[\[\]]/g, '').trim().replace(/[.,]\d{1,2}$/, '').replace(/\D/g, '');
}

/**
 * The max-win amount of one language column: the first money amount on a line
 * that is neither an RTP line nor a multiplier list. Other amounts in the column
 * are templatized only when they equal it — jackpot tiers such as
 * "Mega: 1,000x the players regular bet." look like amounts but are not max win.
 */
function findMaxWinKey(sections: Section[], col: number): string | undefined {
  for (const sec of sections)
    for (const l of sec.contentByCol[col] ?? []) {
      if (PCT_RE.test(l) || isMultiplierList(l)) continue;
      const m = l.match(MONEY_RE);
      if (m) return amountKey(m[0]);
    }
  return undefined;
}

/** Sections whose slug contains 'return' keep the shared {{game_rtp}} template name. */
function isMainRtpSection(slug: string): boolean {
  return slug.includes('return');
}

/**
 * `maxWin = false` keeps the real max-win amount (Crown has no {{maxWinnings}}
 * yet) — only the placeholder brackets ("[5,000]x") are dropped.
 */
export function processLine(
  line: string, rtpParamName = 'game_rtp', templatize = true, maxWin = true, maxWinKey?: string,
): string {
  if (!line) return '';
  if (!templatize) return esc(line);
  if (PCT_RE.test(line))
    return esc(line
      .replace(/(\d+[.,]\d+)(\s*%)/, `{{${rtpParamName}}}$2`)
      .replace(/(\d+)(\s*%)/, `{{${rtpParamName}}}$2`)
    );
  if (!maxWin) return esc(line.replace(MONEY_RE, m => m.replace(/^\[\s*|\s*\]$/g, '')));
  const money = line.match(MONEY_RE);
  if (money && !isMultiplierList(line) && !line.includes('{{maxWinnings}}')
      && (maxWinKey === undefined || amountKey(money[0]) === maxWinKey))
    return [
      `<span class="not-configured_{{maxWinnings}}">`,
      `                ${esc(line.replace(MONEY_RE, '{{maxWinnings}}'))}`,
      `            </span>`,
    ].join('\n');
  return esc(line);
}

/** Crown nests sections in .scroll-container, so every non-empty line gets 4 more spaces. */
function buildSection(
  sec: Section, col: number, templatize: boolean, format: HelpFormat, maxWinKey?: string,
): string {
  const indent = format === 'crown' ? '    ' : '';
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
    return ind + processLine(l, paramName, templatize, format !== 'crown', maxWinKey) + (i < lines.length - 1 ? '\n' + ind + '<br>' : '');
  });

  return [
    `    <div id="help__${id}">`,
    `        <h2>${esc(title)}${title ? ':' : ''}</h2>`,
    '',
    '        <p>',
    processedLines.join('\n'),
    '        </p>',
    '    </div>',
  ].join('\n').replace(/^(?=.)/gm, indent);
}

export function buildHtml(
  gameName: string, sections: Section[], col: number, templatize = true, format: HelpFormat = 'pz',
): string {
  const maxWinKey = findMaxWinKey(sections, col);
  const name = [
    '    <div id="help__name" style="text-align: center;">',
    `        <h1>${esc(gameName)}</h1>`,
    '    </div>',
  ];
  if (format === 'crown') {
    // Same shell as the Crown reference games (tarzanmultirush / tarzanxpotz).
    return [
      '<div id="content-help">',
      CROWN_STYLE,
      '',
      ...name,
      '',
      '    <div class="scroll-container">',
      '',
      sections.map(s => buildSection(s, col, templatize, format, maxWinKey)).join('\n\n'),
      '    </div>',
      '</div>',
    ].join('\n');
  }
  return [
    '<div id="content-help">',
    '    <style>',
    "        #content-help p { font-family: 'Quicksand Regular'; }",
    "        #content-help h1, #content-help h2, #content-help h3 { font-family: 'Quicksand Bold'; }",
    '        .visible_false, .not-configured_, .bfs_true { display: none; }',
    '    </style>',
    '',
    ...name,
    '',
    sections.map(s => buildSection(s, col, templatize, format, maxWinKey)).join('\n\n'),
    '</div>',
  ].join('\n');
}
