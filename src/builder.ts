import type { Section } from './types.js';

export function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export function slugify(t: string): string {
  return t.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

export function processLine(line: string): string {
  if (!line) return '';
  if (/\d+[.,]\d+\s*%|\d+\s*%/.test(line))
    return esc(line
      .replace(/(\d+[.,]\d+)(\s*%)/, '{{game_rtp}}$2')
      .replace(/(\d+)(\s*%)/, '{{game_rtp}}$2')
    );
  const re = /\d{1,3}(?:[,. ]\d{3})+(?:[.,]\d{1,2})?/;
  if (re.test(line) && !line.includes('{{maxWinnings}}'))
    return [
      `<span class="not-configured_{{maxWinnings}}">`,
      `                ${esc(line.replace(re, '{{maxWinnings}}'))}`,
      `            </span>`,
    ].join('\n');
  return esc(line);
}

function buildSection(sec: Section, col: number): string {
  const id    = slugify(sec.enTitle);
  const title = sec.titleByCol[col] ?? '';
  const lines = sec.contentByCol[col] ?? [];
  const ind   = '            ';
  return [
    `    <div id="help__${id}">`,
    `        <h2>${esc(title)}${title ? ':' : ''}</h2>`,
    '',
    '        <p>',
    lines.map((l, i) => ind + processLine(l) + (i < lines.length - 1 ? '\n' + ind + '<br>' : '')).join('\n'),
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
