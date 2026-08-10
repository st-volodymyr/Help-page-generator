/**
 * CLI entry point — generates help_<lang>.html files straight into a game
 * repo's help/ folder. Reuses the same parser/builder the web tool uses.
 *
 * Usage (from a game repo root):
 *   npx github:st-volodymyr/Help-page-generator <sheet-url | file.xlsx | file.csv> [options]
 *
 * Built into bin/cli.mjs by `npm run build:cli` (runs automatically via `prepare`).
 */
import { readFileSync, existsSync, readdirSync, writeFileSync, statSync } from 'node:fs';
import { resolve, join, extname } from 'node:path';
import { createInterface } from 'node:readline/promises';
import {
  parseCSV, detectHeaderRow, detectRowRange, detectLanguages, markEmptyLanguages, parseSections,
} from './parser.js';
import { sheetToCsvUrl } from './sheetUrl.js';
import { buildHtml } from './builder.js';
import type { LangEntry } from './types.js';

const USAGE = `
Usage: npx github:st-volodymyr/Help-page-generator <source> [options]

  <source>            Google Sheets URL (shared "Anyone with link"),
                      or a path to an .xlsx / .csv export.
                      If omitted, the CLI asks for it.

Options:
  --out <dir>         Output folder (default: help/ under --game). Must already exist.
  --game <dir>        Game repo root containing package.json (default: current dir)
  --langs a,b,c       Override the language list (skips package.json lookup)
  --values            Write real values instead of {{...}} placeholders
                      (same as unchecking "templatize" in the web tool);
                      also asked interactively, this sets the default
  --name "Game Name"  Override the auto-detected game name (sheet cell A2)
  --rows 6:13         Override the detected content rows (start:end, 1-based)
  -y, --yes           Accept detected game name / rows without asking
  -h, --help          Show this help

Before generating, the CLI shows the detected game name and row range and
asks to confirm — press Enter to accept, or type a correction. Works in
terminals and IDE run windows alike; with --yes, or when stdin is closed
(CI), the detected values are accepted automatically.
`;

interface Args {
  source: string;
  out: string | null;
  game: string;
  langs: string[] | null;
  values: boolean;
  name: string | null;
  rows: { start: number; end: number } | null;
  yes: boolean;
}

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function parseArgs(argv: string[]): Args {
  const a: Args = { source: '', out: null, game: '.', langs: null, values: false, name: null, rows: null, yes: false };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const next = (flag: string): string => {
      const v = argv[++i];
      if (v === undefined) fail(`${flag} requires a value`);
      return v;
    };
    if (arg === '-h' || arg === '--help') { console.log(USAGE); process.exit(0); }
    else if (arg === '--out')    a.out = next(arg);
    else if (arg === '--game')   a.game = next(arg);
    else if (arg === '--langs')  a.langs = next(arg).split(',').map(s => s.trim()).filter(Boolean);
    else if (arg === '--values') a.values = true;
    else if (arg === '--name')   a.name = next(arg);
    else if (arg === '--rows') {
      const m = next(arg).match(/^(\d+)[:\-](\d+)$/);
      if (!m) fail('--rows expects start:end, e.g. --rows 6:13');
      a.rows = { start: Number(m[1]), end: Number(m[2]) };
    }
    else if (arg === '-y' || arg === '--yes') a.yes = true;
    else if (arg.startsWith('-')) fail(`Unknown option: ${arg}\n${USAGE}`);
    else if (!a.source) a.source = arg;
    else fail(`Unexpected argument: ${arg}\n${USAGE}`);
  }
  return a;
}

/**
 * Lazy shared stdin prompter. stdin may be a pipe rather than a TTY (IDE run
 * windows) — still readable. EOF (true CI) makes every ask() return its
 * default immediately.
 */
function makePrompter() {
  let rl: ReturnType<typeof createInterface> | null = null;
  let closed = false;
  // Piped stdin (IDE run windows, tests) delivers all lines at once; lines
  // emitted between ask() calls must be buffered, not dropped — rl.question()
  // alone loses them.
  const buffered: string[] = [];
  let waiting: ((line: string | null) => void) | null = null;
  return {
    async ask(label: string, current = ''): Promise<string> {
      if (!rl) {
        rl = createInterface({ input: process.stdin, output: process.stdout });
        rl.on('line', line => {
          if (waiting) { const w = waiting; waiting = null; w(line); }
          else buffered.push(line);
        });
        rl.on('close', () => {
          closed = true;
          if (waiting) { const w = waiting; waiting = null; w(null); }
        });
      }
      process.stdout.write(`${label}${current ? ` [${current}]` : ''}: `);
      let answer: string | null;
      if (buffered.length) { answer = buffered.shift()!; process.stdout.write(`${answer}\n`); }
      else if (closed) { answer = null; process.stdout.write('\n'); }
      else answer = await new Promise<string | null>(res => { waiting = res; });
      // Strip only a *paired* surrounding quote (Windows "Copy as path"), so a
      // value legitimately ending in a quote/apostrophe survives.
      return (answer ?? '').trim().replace(/^(["'])(.*)\1$/, '$2') || current;
    },
    close(): void { rl?.close(); },
  };
}

async function loadRows(source: string): Promise<string[][]> {
  if (/^https?:\/\//.test(source)) {
    const csvUrl = sheetToCsvUrl(source);
    if (!csvUrl) fail('Could not extract a spreadsheet id from the URL.');
    console.log(`Fetching ${csvUrl}`);
    const resp = await fetch(csvUrl, { redirect: 'follow' });
    if (!resp.ok) {
      fail(
        `HTTP ${resp.status} fetching the sheet.\n` +
        `  Make sure it is shared as "Anyone with the link → Viewer",\n` +
        `  or export it as .xlsx (File → Download) and pass the file path instead.`,
      );
    }
    const text = await resp.text();
    if (/<html/i.test(text.slice(0, 500))) {
      fail(
        'Got an HTML page instead of CSV — the sheet is not shared publicly.\n' +
        '  Share it as "Anyone with the link → Viewer", or use an .xlsx export.',
      );
    }
    return parseCSV(text);
  }

  const path = resolve(source);
  if (!existsSync(path)) fail(`File not found: ${path}`);
  if (extname(path).toLowerCase() === '.xlsx') {
    // Lazy: xlsx's module init is heavy and the URL/.csv paths never need it.
    const XLSX = await import('xlsx');
    const wb = XLSX.read(readFileSync(path), { type: 'buffer' });
    // raw:false → formatted cell text ("96.22%", "3,000"), matching what the
    // CSV export yields; raw values (0.9622, 3000) would break templatization.
    return XLSX.utils.sheet_to_json<string[]>(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '', raw: false })
      .map(row => row.map(cell => String(cell ?? '')));
  }
  return parseCSV(readFileSync(path, 'utf8'));
}

/** `en` is always wanted; the rest comes strictly from l10ntool.langs. */
function wantedLangs(args: Args): string[] {
  if (args.langs) return [...new Set(['en', ...args.langs])];
  const pkgPath = resolve(args.game, 'package.json');
  if (!existsSync(pkgPath)) {
    fail(`No package.json at ${pkgPath}.\n  Run from a game repo root, or pass --game <dir> / --langs a,b,c.`);
  }
  const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
  const langs: unknown = pkg?.l10ntool?.langs;
  if (!Array.isArray(langs)) {
    fail(`package.json has no "l10ntool.langs" array.\n  Pass --langs a,b,c to set the language list explicitly.`);
  }
  return [...new Set(['en', ...langs.map(String)])];
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv.slice(2));
  const prompt = makePrompter();

  if (!args.source) {
    if (args.yes) fail(`Missing <source>.\n${USAGE}`);
    args.source = await prompt.ask('Google Sheets URL or .xlsx/.csv path');
    if (!args.source) fail(`Missing <source>.\n${USAGE}`);
  }

  const outDir = resolve(args.out ?? join(args.game, 'help'));
  if (!existsSync(outDir) || !statSync(outDir).isDirectory()) {
    fail(`Output folder does not exist: ${outDir}\n  Create it first, or point --out at the game's help/ folder.`);
  }

  const wanted = wantedLangs(args);
  const rows = await loadRows(args.source);

  const headerRow = detectHeaderRow(rows);
  if (headerRow === null) fail('Could not find the language header row (need at least 2 known language headers).');
  const { startRow, endRow } = detectRowRange(rows);
  // With --yes there is nobody to ask; interactively the Start/End row prompts
  // below exist precisely to correct failed/wrong detection.
  if (!args.rows && args.yes && (startRow === null || endRow === null)) {
    fail('Could not detect the content block ("How to Play" … "© copyright").\n  Pass --rows start:end to set it explicitly.');
  }

  const langMap = detectLanguages(rows, headerRow);

  let gameName = args.name ?? String(rows[1]?.[0] ?? '').trim();
  let contentStart = args.rows?.start ?? startRow ?? NaN;
  let contentEnd = args.rows?.end ?? endRow ?? NaN;

  // Detection is often wrong on non-standard sheets (junk in A2, shifted
  // blocks) — confirm interactively unless --yes. stdin may be a pipe rather
  // than a TTY (IDE run windows), so don't gate on isTTY; instead treat EOF
  // on stdin (true CI) as "accept all defaults".
  if (!args.yes) {
    console.log('Detected settings — press Enter to accept, or type a correction:');
    gameName = await prompt.ask('  Game name', gameName);
    if (Number.isInteger(contentStart) && Number.isInteger(contentEnd)) {
      const first = rows[contentStart - 1]?.find(c => String(c).trim()) ?? '';
      const last  = rows[contentEnd - 1]?.find(c => String(c).trim()) ?? '';
      console.log(`  Row ${contentStart}: "${String(first).slice(0, 60)}" … row ${contentEnd}: "${String(last).slice(0, 60)}"`);
    } else {
      console.log('  Content block not auto-detected ("How to Play" … "© copyright") — enter the rows manually:');
    }
    contentStart = Number(await prompt.ask('  Start row', Number.isInteger(contentStart) ? String(contentStart) : ''));
    contentEnd   = Number(await prompt.ask('  End row', Number.isInteger(contentEnd) ? String(contentEnd) : ''));
    const mode = await prompt.ask('  Values mode — {{...}} placeholders or real values (p/v)', args.values ? 'v' : 'p');
    args.values = /^v/i.test(mode);
  }
  prompt.close();

  if (!gameName) fail('Could not read the game name from cell A2 — pass --name "Game Name".');
  if (!Number.isInteger(contentStart) || !Number.isInteger(contentEnd) ||
      contentStart < 1 || contentEnd < contentStart || contentEnd > rows.length) {
    fail(`Invalid row range ${contentStart}:${contentEnd} (sheet has ${rows.length} rows).`);
  }

  markEmptyLanguages(langMap, rows, contentStart, contentEnd);

  const updated: string[] = [];
  const warned: string[] = [];
  const skipped: string[] = [];

  const active: LangEntry[] = [];
  for (const code of wanted) {
    const lang = langMap.find(l => l.code === code);
    if (!lang) { warned.push(`${code} — no column in the sheet; existing file left untouched`); continue; }
    if (lang.empty) { warned.push(`${code} — column is empty; existing file left untouched`); continue; }
    active.push(lang);
  }
  for (const lang of langMap) {
    if (!wanted.includes(lang.code)) skipped.push(lang.code);
  }

  if (active.length === 0) fail('No requested language has content in the sheet — nothing to generate.');

  const block = rows.slice(contentStart - 1, contentEnd);
  const sections = parseSections(block, active);
  console.log(`Game: ${gameName} — ${sections.length} sections, rows ${contentStart}–${contentEnd}`);
  console.log(`Mode: ${args.values ? 'real values' : '{{...}} placeholders'}`);

  for (const lang of active) {
    const html = buildHtml(gameName, sections, lang.col, !args.values);
    writeFileSync(join(outDir, `help_${lang.code}.html`), html);
    updated.push(lang.code);
  }

  // A wanted lang whose column is missing already got a warning above —
  // its file is intentionally untouched, not stale.
  const keep = new Set(wanted.map(c => `help_${c}.html`));
  const stale = readdirSync(outDir)
    .filter(f => /^help_.+\.html$/.test(f) && !keep.has(f));

  console.log('');
  console.log(`✓ Updated (${updated.length}): ${updated.join(', ')}`);
  if (warned.length)  console.log(`⚠ Warnings:\n    ${warned.join('\n    ')}`);
  if (skipped.length) console.log(`— Skipped, in sheet but not in langs: ${skipped.join(', ')}`);
  if (stale.length)   console.log(`— Stale files in ${args.out} (lang not in list — consider deleting): ${stale.join(', ')}`);
}

main().catch((e: unknown) => fail(e instanceof Error ? e.message : String(e)));
