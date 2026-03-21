import { state } from './state.js';
import type { LangEntry } from './types.js';

let activeLang: string | null = null;

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;

export function getActiveLang(): string | null { return activeLang; }

export function buildPreviewDoc(rawHtml: string, rtp: string, maxWinnings: string): string {
  let html = rawHtml;
  if (rtp)        html = html.replace(/\{\{game_rtp\}\}/g, rtp);
  if (maxWinnings) {
    html = html.replace(/not-configured_\{\{maxWinnings\}\}/g, 'is-configured');
    html = html.replace(/\{\{maxWinnings\}\}/g, maxWinnings);
  }
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

function refresh(): void {
  if (!activeLang || !state.generated[activeLang]) return;
  ($<HTMLIFrameElement>('previewFrame')).srcdoc = buildPreviewDoc(
    state.generated[activeLang],
    $<HTMLInputElement>('rtpInput').value.trim(),
    $<HTMLInputElement>('maxWinInput').value.trim(),
  );
}

/**
 * @param langs      Active (generated) languages — used for tabs that can be clicked
 * @param allLangs   All detected languages including empty ones — shown as disabled tabs
 */
export function openPreview(langs: LangEntry[], allLangs: LangEntry[]): void {
  activeLang = langs[0].code;

  $<HTMLInputElement>('rtpInput').value    = state.defaults.rtp;
  $<HTMLInputElement>('maxWinInput').value = state.defaults.maxWinnings;

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

export function initPreviewInputs(): void {
  $('rtpInput').addEventListener('input', refresh);
  $('maxWinInput').addEventListener('input', refresh);
}
