import { state } from './state.js';
import type { LangEntry } from './types.js';

let activeLang: string | null = null;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function getActiveLang(): string | null { return activeLang; }

export function buildPreviewDoc(rawHtml: string, params: Record<string, string>): string {
  let html = rawHtml;

  // maxWinnings has a special CSS class trick
  const maxWin = params['maxWinnings'];
  if (maxWin) {
    html = html.replace(/not-configured_\{\{maxWinnings\}\}/g, 'is-configured');
    html = html.replace(/\{\{maxWinnings\}\}/g, maxWin);
  }

  // Replace all other params generically
  Object.entries(params).forEach(([key, val]) => {
    if (key !== 'maxWinnings' && val) {
      html = html.replace(new RegExp(`\\{\\{${escapeRegex(key)}\\}\\}`, 'g'), val);
    }
  });

  return `<!DOCTYPE html>
<html><head><meta charset="UTF-8">
<style>
  body {
    background: #0d0d0d;
    color: #ffffff;
    font-family: Arial, Helvetica, sans-serif;
    font-size: 14px;
    line-height: 1.6;
    padding: 40px 30px 60px;
    margin: 0;
  }
  .preview-wrap { max-width: 740px; margin: 0 auto; }
  #content-help h1 { font-size: 24px; font-weight: 700; text-align: center; margin-bottom: 24px; }
  #content-help h2 { font-size: 18px; font-weight: 700; margin: 20px 0 10px; }
  #content-help p  { margin: 0 0 10px; }
  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: #0d0d0d; }
  ::-webkit-scrollbar-thumb { background: #333; border-radius: 3px; }
</style>
</head><body><div class="preview-wrap">${html}</div></body></html>`;
}

function collectParams(): Record<string, string> {
  const params: Record<string, string> = {};
  $('previewVarsRow').querySelectorAll<HTMLInputElement>('[data-param]').forEach(input => {
    params[input.dataset.param!] = input.value.trim();
  });
  return params;
}

function refresh(): void {
  if (!activeLang || !state.generated[activeLang]) return;
  ($<HTMLIFrameElement>('previewFrame')).srcdoc = buildPreviewDoc(
    state.generated[activeLang],
    collectParams(),
  );
}

function makeInput(key: string, inputClass: string): HTMLDivElement {
  const defaultVal = state.params[key] ?? '';
  const group = document.createElement('div');
  group.className = 'preview-var-group';

  const label = document.createElement('span');
  label.className = 'var-label';
  label.textContent = `{{${key}}}`;

  const input = document.createElement('input');
  input.className = `var-input ${inputClass}`;
  input.type = 'text';
  input.dataset.param = key;
  input.placeholder = defaultVal || key;
  input.value = defaultVal;
  input.addEventListener('input', refresh);

  group.appendChild(label);
  group.appendChild(input);
  return group;
}

function makeGroupRow(labelText: string, keys: string[], inputClass: string): HTMLDivElement {
  const row = document.createElement('div');
  row.className = 'vars-group';

  const lbl = document.createElement('span');
  lbl.className = 'vars-group-label';
  lbl.textContent = labelText;
  row.appendChild(lbl);

  keys.forEach(k => row.appendChild(makeInput(k, inputClass)));
  return row;
}

/**
 * @param langs      Active (generated) languages
 * @param allLangs   All detected languages including empty ones
 */
export function openPreview(langs: LangEntry[], allLangs: LangEntry[]): void {
  activeLang = langs[0].code;

  // Build grouped param inputs
  const varsRow = $('previewVarsRow');
  varsRow.innerHTML = '';

  const mainKeys   = ['game_rtp', 'maxWinnings'].filter(k => k in state.params);
  const sectionKeys = Object.keys(state.params).filter(k => !mainKeys.includes(k));

  if (mainKeys.length)    varsRow.appendChild(makeGroupRow('// main', mainKeys, 'var-input-main'));
  if (sectionKeys.length) varsRow.appendChild(makeGroupRow('// section rtp', sectionKeys, 'var-input-param'));

  // Build language tabs
  const tabsEl = $('previewLangTabs');
  tabsEl.innerHTML = '';
  allLangs.forEach(lang => {
    const btn = document.createElement('button');
    btn.className = 'preview-lang-btn' + (lang.code === activeLang ? ' active' : '') + (lang.empty ? ' lang-empty' : '');
    btn.textContent = lang.empty ? `${lang.code} (empty)` : lang.code;
    btn.disabled = lang.empty;
    btn.title = lang.empty ? `${lang.code} — no content in this row range` : lang.code;
    btn.addEventListener('click', () => {
      if (lang.empty) return;
      activeLang = lang.code;
      tabsEl.querySelectorAll<HTMLButtonElement>('.preview-lang-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      refresh();
    });
    tabsEl.appendChild(btn);
  });

  refresh();
  $('appShell').classList.add('preview-open');
}

export function closePreview(): void {
  $('appShell').classList.remove('preview-open');
  ($<HTMLIFrameElement>('previewFrame')).srcdoc = '';
  $('previewLangTabs').innerHTML = '';
}
