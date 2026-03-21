import './style.css';
import { state } from './state.js';
import { parseCSV, detectLanguages, detectHeaderRow, detectRowRange, markEmptyLanguages } from './parser.js';
import { generate, downloadZip, downloadSingle } from './generator.js';
import { openPreview, closePreview, getActiveLang } from './preview.js';
import type { LogType } from './types.js';

// ── DOM refs ──────────────────────────────────────────────────
const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

const gameNameEl   = $<HTMLInputElement>('gameName');
const startRowEl   = $<HTMLInputElement>('startRow');
const endRowEl     = $<HTMLInputElement>('endRow');
const headerRowEl  = $<HTMLInputElement>('headerRow');
const generateBtn  = $<HTMLButtonElement>('generateBtn');
const fetchStatus  = $('fetchStatus');
const sheetUrlEl   = $<HTMLInputElement>('sheetUrl');
const fetchBtn     = $<HTMLButtonElement>('fetchBtn');
const dropZone     = $('dropZone');
const fileInput    = $<HTMLInputElement>('fileInput');
const successCard  = $('successCard');
const consoleBodyEl  = $('consoleBody');
const consoleCountEl = $('consoleCount');

// ── Console ───────────────────────────────────────────────────
let logCount = 0;
let consoleOpen = false;

function clog(type: LogType, msg: string): void {
  const t  = new Date();
  const ts = `${t.getHours().toString().padStart(2,'0')}:${t.getMinutes().toString().padStart(2,'0')}:${t.getSeconds().toString().padStart(2,'0')}`;
  const icons: Record<LogType, string> = { info: 'i', success: '✓', warn: '⚠', error: '✗' };
  const row = document.createElement('div');
  row.className = `c-row ${type}`;
  row.innerHTML = `<span class="c-icon">${icons[type]}</span><span class="c-msg">${msg}</span><span class="c-time">${ts}</span>`;
  consoleBodyEl.appendChild(row);
  consoleBodyEl.scrollTop = consoleBodyEl.scrollHeight;
  logCount++;
  consoleCountEl.textContent = String(logCount);
  consoleCountEl.classList.add('has-logs');
}

function toggleConsole(): void {
  consoleOpen = !consoleOpen;
  consoleBodyEl.classList.toggle('open', consoleOpen);
  $('consoleHead').classList.toggle('open', consoleOpen);
  $('consoleArrow').textContent = consoleOpen ? '▼' : '▶';
}

function clearConsole(e?: Event): void {
  e?.stopPropagation();
  consoleBodyEl.innerHTML = '';
  logCount = 0;
  consoleCountEl.textContent = '0';
  consoleCountEl.classList.remove('has-logs');
}

// ── Steps ─────────────────────────────────────────────────────
function setStep(n: number): void {
  $('step1').className = 'step-item' + (n >= 3 ? ' done' : ' active');
  $('step3').className = 'step-item' + (n >= 3 ? ' active' : '');
  const dot2 = $('dot2');
  if (n >= 2) dot2.classList.add('blue');
  if (n >= 3) { dot2.classList.remove('blue'); dot2.classList.add('green'); }
}

// ── Source tabs ───────────────────────────────────────────────
function switchSrc(tab: 'link' | 'file'): void {
  document.querySelectorAll<HTMLButtonElement>('.src-btn').forEach((b, i) =>
    b.classList.toggle('active', (i === 0) === (tab === 'link'))
  );
  $('srcLink').classList.toggle('active', tab === 'link');
  $('srcFile').classList.toggle('active', tab === 'file');
}

// ── Advanced toggle ───────────────────────────────────────────
function toggleAdv(): void {
  $('advToggle').classList.toggle('open');
  $('advBody').classList.toggle('open');
}

// ── Fetch sheet ───────────────────────────────────────────────
async function fetchSheet(): Promise<void> {
  const url = sheetUrlEl.value.trim();
  if (!url) return;

  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!idMatch) { showStatus('err', '✗ No spreadsheet ID found in this URL'); return; }

  const sheetId  = idMatch[1];
  const gidMatch = url.match(/[#&?]gid=(\d+)/);
  const gid      = gidMatch?.[1] ?? null;
  let   csvUrl   = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv`;
  if (gid) csvUrl += `&gid=${gid}`;

  showStatus('info', '↻ Loading sheet data…');
  fetchBtn.disabled = true;
  clog('info', 'Fetching: ' + csvUrl);

  try {
    const resp = await fetch(csvUrl);
    if (!resp.ok) {
      const msg = (resp.status === 401 || resp.status === 403)
        ? '✗ Access denied — share the sheet as "Anyone with the link → Viewer"'
        : `✗ HTTP ${resp.status} — could not fetch the sheet`;
      showStatus('err', msg); clog('error', msg); return;
    }
    const rows = parseCSV(await resp.text());
    onDataLoaded(rows, `Google Sheet (${rows.length} rows)`);
    showStatus('ok', `✓ Loaded successfully — ${rows.length} rows`);
  } catch (e) {
    showStatus('warn', '⚠ Could not fetch directly. Use the "Upload .xlsx" option instead.');
    clog('warn', 'Network/CORS error: ' + (e as Error).message);
  } finally {
    fetchBtn.disabled = false;
  }
}

function showStatus(type: string, msg: string): void {
  fetchStatus.className = `status visible ${type}`;
  fetchStatus.textContent = msg;
}

// ── File upload ───────────────────────────────────────────────
function handleFile(file: File): void {
  const reader = new FileReader();
  reader.onload = e => {
    try {
      const wb   = XLSX.read(e.target!.result as ArrayBuffer, { type: 'array' });
      const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]], { header: 1, defval: '' });
      onDataLoaded(rows, file.name);
      dropZone.classList.add('loaded');
      $('dzTitle').textContent = `✓ ${file.name} — ${rows.length} rows loaded`;
    } catch (err) { clog('error', 'Failed to read: ' + (err as Error).message); }
  };
  reader.readAsArrayBuffer(file);
}

// ── Data loaded ───────────────────────────────────────────────
function setHint(id: string, text: string, color: string): void {
  const el = $(id);
  el.textContent = text;
  (el as HTMLElement).style.color = color;
}

function onDataLoaded(rows: string[][], source: string): void {
  // Reset all previous session state
  closePreview();
  state.generated = {};
  state.params = {};
  gameNameEl.value = '';
  successCard.classList.remove('visible');
  setStep(1);

  state.sheetData = rows;

  // 1. Clear fields so detection starts fresh
  startRowEl.value  = '';
  endRowEl.value    = '';
  headerRowEl.value = '';
  setHint('startRowHint',  '// first help row',             '');
  setHint('endRowHint',    '// last help row',              '');
  setHint('headerRowHint', '// row with language column headers', '');

  // 2. Game name (always fill from new sheet)
  const name = String(rows[1]?.[0] ?? '').trim();
  if (name) gameNameEl.value = name;

  // 3. Detect header row first — must happen before detectLanguages
  const headerRow = detectHeaderRow(rows);
  if (headerRow !== null) {
    headerRowEl.value = String(headerRow);
    setHint('headerRowHint', '// auto-detected', 'var(--green)');
    clog('info', `Auto-detected language row ${headerRow}`);
  } else {
    setHint('headerRowHint', '// not found, enter manually', 'var(--yellow)');
    clog('warn', 'Language row not detected — no row with ≥2 known language columns found');
  }

  // 4. Detect content row range
  const { startRow, endRow } = detectRowRange(rows);
  if (startRow !== null) {
    startRowEl.value = String(startRow);
    setHint('startRowHint', '// auto-detected', 'var(--green)');
    clog('info', `Auto-detected start row ${startRow} ("How to Play")`);
  } else {
    setHint('startRowHint', '// not found, enter manually', 'var(--yellow)');
    clog('warn', '"How to Play" not found — enter start row manually');
  }
  if (endRow !== null) {
    endRowEl.value = String(endRow);
    setHint('endRowHint', '// auto-detected', 'var(--green)');
    clog('info', `Auto-detected end row ${endRow} (row before © copyright)`);
  } else {
    setHint('endRowHint', '// not found, enter manually', 'var(--yellow)');
    clog('warn', '"© / copyright" not found — enter end row manually');
  }

  // 5. Detect languages using the now-populated header row value
  redetectLanguages();

  setStep(2);
  checkReady();
  clog('success', `Loaded: ${source}`);
  if (name) clog('info', `game_name from A2: "${name}"`);
  const ready = state.langMap.filter(l => !l.empty);
  const empty = state.langMap.filter(l => l.empty);
  clog('info', `Languages detected: ${ready.map(l => l.code).join(', ') || 'none'}`);
  if (empty.length) clog('warn', `No content in range for: ${empty.map(l => l.code).join(', ')}`);
}

function redetectLanguages(): void {
  const headerRow = parseInt(headerRowEl.value, 10);
  if (!headerRow) {
    // No header row known yet — clear chips and wait
    $('langGrid').innerHTML = '<span style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">// enter language row to detect languages</span>';
    state.langMap = [];
    return;
  }
  state.langMap = detectLanguages(state.sheetData!, headerRow);

  const startRow = parseInt(startRowEl.value, 10);
  const endRow   = parseInt(endRowEl.value, 10);
  if (startRow && endRow) {
    markEmptyLanguages(state.langMap, state.sheetData!, startRow, endRow);
  }

  renderLangChips();
}

function renderLangChips(): void {
  const el = $('langGrid');
  el.innerHTML = '';
  if (!state.langMap.length) {
    el.innerHTML = '<span style="font-family:var(--mono);font-size:11px;color:var(--text-dim)">// none detected</span>';
    return;
  }
  state.langMap.forEach((lang, i) => {
    const lbl = document.createElement('label');
    lbl.className = 'lang-chip' + (lang.on ? ' on' : '') + (lang.empty ? ' empty' : '');
    lbl.title = lang.empty ? `${lang.code} — no content in this row range` : lang.code;
    lbl.innerHTML = `<input type="checkbox" ${lang.on ? 'checked' : ''}>${lang.code}${lang.empty ? ' <span class="chip-empty-badge">empty</span>' : ''}`;
    lbl.querySelector('input')!.addEventListener('change', (e: Event) => {
      state.langMap[i].on = (e.target as HTMLInputElement).checked;
      lbl.classList.toggle('on', state.langMap[i].on);
    });
    el.appendChild(lbl);
  });

  const emptyCount = state.langMap.filter(l => l.empty).length;
  if (emptyCount > 0) {
    clog('warn', `${emptyCount} language(s) have no content in rows ${startRowEl.value}–${endRowEl.value}: ${state.langMap.filter(l => l.empty).map(l => l.code).join(', ')}`);
  }
}

function checkReady(): void {
  const ready = !!(state.sheetData && gameNameEl.value.trim());
  generateBtn.disabled = !ready;
  if (ready) setStep(3);
}

// ── Generate ──────────────────────────────────────────────────
generateBtn.addEventListener('click', async () => {
  generateBtn.classList.add('loading');
  generateBtn.disabled = true;
  successCard.classList.remove('visible');
  if (!consoleOpen) toggleConsole();

  try {
    const gameName    = gameNameEl.value.trim();
    const startRow    = parseInt(startRowEl.value, 10);
    const endRow      = parseInt(endRowEl.value, 10);
    const activeLangs = state.langMap.filter(l => l.on);

    if (!activeLangs.length) { clog('error', 'No languages selected'); return; }

    clog('info', `game_name = "${gameName}"`);
    clog('info', `rows      = ${startRow}–${endRow}`);
    clog('info', `langs     = ${activeLangs.map(l => l.code).join(', ')}`);

    const { sections } = generate(gameName, startRow, endRow, activeLangs, clog);

    $('successDetail').textContent =
      `${activeLangs.length} files · ${sections.length} sections · "${gameName}"`;
    successCard.classList.add('visible');
    successCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

    openPreview(activeLangs, state.langMap);
  } catch (err) {
    clog('error', 'Exception: ' + (err as Error).message);
  } finally {
    generateBtn.classList.remove('loading');
    generateBtn.disabled = false;
  }
});

// ── Download buttons ──────────────────────────────────────────
$('dlZipBtn').addEventListener('click', async () => {
  const gameName    = gameNameEl.value.trim();
  const activeLangs = state.langMap.filter(l => l.on);
  if (!activeLangs.length || !gameName) return;
  await downloadZip(gameName, activeLangs, clog);
});

$('dlHtmlBtn').addEventListener('click', () => {
  const lang = getActiveLang();
  if (!lang) return;
  downloadSingle(lang, gameNameEl.value.trim(), clog);
});

// ── Load button enable/disable based on URL field ─────────────
function updateFetchBtn(): void {
  const hasUrl = sheetUrlEl.value.trim().length > 0;
  fetchBtn.disabled = !hasUrl;
  sheetUrlEl.classList.toggle('input-highlight', !hasUrl);
  fetchBtn.classList.toggle('btn-highlight', hasUrl);
}
updateFetchBtn();
sheetUrlEl.addEventListener('input', updateFetchBtn);

// ── Event wiring ──────────────────────────────────────────────
sheetUrlEl.addEventListener('keydown', (e: KeyboardEvent) => { if (e.key === 'Enter') fetchSheet(); });
gameNameEl.addEventListener('input', checkReady);
headerRowEl.addEventListener('change', () => {
  if (!state.sheetData) return;
  redetectLanguages();
  clog('info', `Re-detected from row ${headerRowEl.value}: ${state.langMap.map(l => l.code).join(', ')}`);
});

// Re-check empty status when content row range is changed manually
[startRowEl, endRowEl].forEach(el => el.addEventListener('change', () => {
  if (!state.sheetData || !state.langMap.length) return;
  const s = parseInt(startRowEl.value, 10);
  const e = parseInt(endRowEl.value, 10);
  if (!s || !e) return;
  markEmptyLanguages(state.langMap, state.sheetData, s, e);
  renderLangChips();
}));

dropZone.addEventListener('dragover',  (e: DragEvent) => { e.preventDefault(); dropZone.classList.add('drag-over'); });
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e: DragEvent) => {
  e.preventDefault(); dropZone.classList.remove('drag-over');
  const f = e.dataTransfer?.files[0];
  if (f) handleFile(f);
});
fileInput.addEventListener('change', () => { if (fileInput.files?.[0]) handleFile(fileInput.files[0]); });

$('consoleHead').addEventListener('click', toggleConsole);
$('clearConsoleBtn').addEventListener('click', clearConsole);
$('closePanelBtn').addEventListener('click', closePreview);

document.querySelectorAll<HTMLButtonElement>('.src-btn').forEach((btn, i) =>
  btn.addEventListener('click', () => switchSrc(i === 0 ? 'link' : 'file'))
);
$('advToggle').addEventListener('click', toggleAdv);
$('fetchBtn').addEventListener('click', fetchSheet);

