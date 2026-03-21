import { HEADER_TO_CODE } from './config.js';
import type { LangEntry, Section } from './types.js';

export function parseCSV(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = [], f = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i], n = text[i + 1];
    if (q) {
      if (c === '"' && n === '"') { f += '"'; i++; }
      else if (c === '"') { q = false; }
      else { f += c; }
    } else {
      if (c === '"') { q = true; }
      else if (c === ',') { row.push(f); f = ''; }
      else if (c === '\r' && n === '\n') { row.push(f); rows.push(row); row = []; f = ''; i++; }
      else if (c === '\n' || c === '\r') { row.push(f); rows.push(row); row = []; f = ''; }
      else { f += c; }
    }
  }
  if (f || row.length) { row.push(f); rows.push(row); }
  return rows;
}

export function detectLanguages(rows: string[][], headerRow: number): LangEntry[] {
  const hdr = rows[headerRow - 1] ?? [];
  const langMap: LangEntry[] = [];
  hdr.forEach((cell, i) => {
    const code = HEADER_TO_CODE[String(cell ?? '').trim().toLowerCase()];
    if (code) langMap.push({ col: i, code, on: true, empty: false });
  });
  return langMap;
}

/**
 * Checks each detected language column within the content block.
 * If a column has no non-empty cells it is marked empty=true and on=false,
 * so it shows in the UI but is excluded from generation by default.
 */
export function markEmptyLanguages(
  langMap: LangEntry[],
  rows: string[][],
  startRow: number,
  endRow: number,
): void {
  const block = rows.slice(startRow - 1, endRow);
  langMap.forEach(lang => {
    const hasContent = block.some(row => String(row[lang.col] ?? '').trim() !== '');
    if (!hasContent) {
      lang.empty = true;
      lang.on    = false;
    }
  });
}

export function parseSections(block: string[][], langs: LangEntry[]): Section[] {
  const s: Section[] = []; let cur: Section | null = null, expT = true;
  block.forEach(row => {
    const blank = langs.every(l => String(row[l.col] ?? '').trim() === '');
    if (blank) { if (cur) s.push(cur); cur = null; expT = true; return; }
    if (expT) {
      cur = { enTitle: String(row[0] ?? '').trim(), titleByCol: {}, contentByCol: {} };
      langs.forEach(l => { cur!.titleByCol[l.col] = String(row[l.col] ?? '').trim(); cur!.contentByCol[l.col] = []; });
      expT = false;
    } else {
      if (cur) langs.forEach(l => cur!.contentByCol[l.col].push(String(row[l.col] ?? '').trim()));
    }
  });
  if (cur) s.push(cur);
  return s;
}

/**
 * Scan the sheet for the first row where at least 2 cells match a known language header.
 * Returns a 1-based row number, or null if not found.
 */
export function detectHeaderRow(rows: string[][]): number | null {
  for (let i = 0; i < rows.length; i++) {
    const matches = rows[i].filter(cell =>
      HEADER_TO_CODE[String(cell ?? '').trim().toLowerCase()]
    );
    if (matches.length >= 2) return i + 1; // 1-based
  }
  return null;
}

/**
 * Scan the sheet for the content block boundaries:
 *   startRow — first row whose ANY cell contains "how to play" (case-insensitive)
 *   endRow   — last row to include, set to the row before the "© / copyright" line
 * Returns 1-based row numbers matching what the UI fields expect.
 * Returns null for either value if not found.
 */
export function detectRowRange(rows: string[][]): { startRow: number | null; endRow: number | null } {
  let startRow: number | null = null;
  let endRow: number | null = null;

  for (let i = 0; i < rows.length; i++) {
    const text = rows[i].join(' ').toLowerCase();
    if (startRow === null && text.includes('how to play')) {
      startRow = i + 1; // 1-based; this row is the first included
    }
    if (startRow !== null && (text.includes('©') || text.includes('copyright'))) {
      // slice(startRow-1, endRow) — to exclude the copyright row itself,
      // set endRow = i (0-based copyright index = 1-based row before copyright)
      endRow = i;
      break;
    }
  }

  return { startRow, endRow };
}

/** Scan the EN (or first available) column for the raw RTP and maxWinnings values. */
export function extractDefaults(block: string[][], enCol: number): { rtp: string; maxWinnings: string } {
  let rtp = '', maxWinnings = '';
  const rtpRe   = /(\d+[.,]\d+)(?=\s*%)|(\d+)(?=\s*%)/;
  const moneyRe = /\d{1,3}(?:[,. ]\d{3})+(?:[.,]\d{1,2})?/;
  for (const row of block) {
    const cell = String(row[enCol] ?? '').trim();
    if (!rtp && /\d+[.,]\d+\s*%|\d+\s*%/.test(cell)) {
      const m = cell.match(rtpRe);
      if (m) rtp = (m[1] ?? m[2] ?? '').replace(',', '.');
    }
    if (!maxWinnings) {
      const m = cell.match(moneyRe);
      if (m) maxWinnings = m[0];
    }
    if (rtp && maxWinnings) break;
  }
  return { rtp, maxWinnings };
}
