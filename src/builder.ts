import type { Section } from './types.js';

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function slugify(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

const PCT_RE   = /\d+[.,]\d+\s*%|\d+\s*%/;
const MONEY_RE = /\d{1,3}(?:[,. ]\d{3})+(?:[.,]\d{1,2})?/;

/** Sections whose slug contains 'return' keep the shared {{game_rtp}} template name. */
function isMainRtpSection(slug: string): boolean {
  return slug.includes('return');
}

export function processLine(line: string, rtpParamName = 'game_rtp'): string {
  if (!line) return '';
  if (PCT_RE.test(line))
    return esc(line
      .replace(/(\d+[.,]\d+)(\s*%)/, `{{${rtpParamName}}}$2`)
      .replace(/(\d+)(\s*%)/, `{{${rtpParamName}}}$2`)
    );
  if (MONEY_RE.test(line) && !line.includes('{{maxWinnings}}'))
    return [
      `<span class="not-configured_{{maxWinnings}}">`,
      `                ${esc(line.replace(MONEY_RE, '{{maxWinnings}}'))}`,
      `            </span>`,
    ].join('\n');
  return esc(line);
}

function buildSection(sec: Section, col: number): string {
  const id    = slugify(sec.enTitle) || 'section';
  const title = sec.titleByCol[col] ?? '';
  const lines = sec.contentByCol[col] ?? [];
  const ind   = '            ';

  const mainRtp = isMainRtpSection(id);
  let rtpCount = 0;

  const processedLines = lines.map((l, i) => {
    let paramName = 'game_rtp';
    if (!mainRtp && PCT_RE.test(l)) {
      rtpCount++;
      paramName = rtpCount === 1 ? `${id}_rtp` : `${id}_rtp_${rtpCount}`;
    }
    return ind + processLine(l, paramName) + (i < lines.length - 1 ? '\n' + ind + '<br>' : '');
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

export function buildHtml(gameName: string, sections: Section[], col: number): string {
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
    sections.map(s => buildSection(s, col)).join('\n\n'),
    '</div>',
  ].join('\n');
}
