import { state } from './state.js';
import { parseSections, extractDefaults } from './parser.js';
import { buildHtml, slugify } from './builder.js';
import type { LangEntry, ClogFn } from './types.js';

const PCT_RE = /\d+[.,]\d+\s*%|\d+\s*%/;

function extractParamDefaults(
  sections: ReturnType<typeof parseSections>,
  enCol: number,
  block: string[][],
): Record<string, string> {
  const params: Record<string, string> = {};

  sections.forEach(sec => {
    const id = slugify(sec.enTitle) || 'section';
    const isMainRtp = id.includes('return');
    const lines = sec.contentByCol[enCol] ?? [];
    let rtpCount = 0;

    lines.forEach(line => {
      if (!PCT_RE.test(line)) return;
      if (isMainRtp) {
        // Extract value for the shared {{game_rtp}} param (last writer wins if multiple)
        const m = line.match(/(\d+[.,]\d+)(?=\s*%)|(\d+)(?=\s*%)/);
        if (m) params['game_rtp'] = (m[1] ?? m[2] ?? '').replace(',', '.');
      } else {
        rtpCount++;
        const paramName = rtpCount === 1 ? `${id}_rtp` : `${id}_rtp_${rtpCount}`;
        const m = line.match(/(\d+[.,]\d+)(?=\s*%)|(\d+)(?=\s*%)/);
        if (m) params[paramName] = (m[1] ?? m[2] ?? '').replace(',', '.');
      }
    });
  });

  const { maxWinnings } = extractDefaults(block, enCol);
  if (maxWinnings) params['maxWinnings'] = maxWinnings;

  return params;
}

export function generate(
  gameName: string,
  startRow: number,
  endRow: number,
  activeLangs: LangEntry[],
  clog: ClogFn,
): { sections: ReturnType<typeof parseSections> } {
  const block    = state.sheetData!.slice(startRow - 1, endRow);
  const sections = parseSections(block, activeLangs);
  clog('success', `Parsed ${sections.length} sections`);

  state.generated = {};
  activeLangs.forEach(lang => {
    state.generated[lang.code] = buildHtml(gameName, sections, lang.col);
    clog('success', `Built  help_${lang.code}.html`);
  });

  const enLang = activeLangs.find(l => l.code === 'en') ?? activeLangs[0];
  state.params = extractParamDefaults(sections, enLang.col, block);

  return { sections };
}

function triggerDownload(blob: Blob, filename: string): void {
  const a = Object.assign(document.createElement('a'), {
    href: URL.createObjectURL(blob),
    download: filename,
  });
  a.click();
  URL.revokeObjectURL(a.href);
}

function safeName(gameName: string): string {
  return gameName.replace(/[^a-zA-Z0-9_\-]/g, '_').replace(/_+/g, '_');
}

export async function downloadZip(gameName: string, activeLangs: LangEntry[], clog: ClogFn): Promise<void> {
  const zip = new JSZip();
  activeLangs.forEach(lang => {
    if (state.generated[lang.code]) {
      zip.file(`help_${lang.code}.html`, state.generated[lang.code]);
    }
  });
  const blob = await zip.generateAsync({ type: 'blob' });
  triggerDownload(blob, `help_pages_${safeName(gameName)}.zip`);
  clog('success', `ZIP downloaded (${activeLangs.length} files) ✓`);
}

export function downloadSingle(langCode: string, gameName: string, clog: ClogFn): void {
  const html = state.generated[langCode];
  if (!html) { clog('error', `No generated file for "${langCode}"`); return; }
  const blob = new Blob([html], { type: 'text/html' });
  triggerDownload(blob, `help_${langCode}_${safeName(gameName)}.html`);
  clog('success', `Downloaded help_${langCode}.html ✓`);
}
