# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # first-time setup
npm run dev          # dev server with HMR (http://localhost:5173)
npm run build        # production build → dist/
npm run preview      # serve the dist/ build locally
npm run typecheck    # tsc --noEmit (no output = clean)
```

## Architecture

Vite project. `index.html` at root, source modules in `src/`.

**External globals (CDN, loaded in `index.html`):**
- `XLSX` v0.18.5 — parses `.xlsx` file uploads
- `JSZip` v3.10.1 — bundles output HTML into a downloadable ZIP

**Module responsibilities:**

| File | Role |
|------|------|
| `src/types.ts` | Shared interfaces: `LangEntry`, `Section`, `AppState`, `ClogFn` |
| `src/globals.d.ts` | Type declarations for CDN globals (`XLSX`, `JSZip`) |
| `src/config.ts` | `HEADER_TO_CODE` map (header text → lang code) |
| `src/state.ts` | Shared mutable state: `sheetData`, `langMap`, `generated`, `defaults` |
| `src/parser.ts` | `parseCSV`, `detectLanguages`, `parseSections`, `extractDefaults` |
| `src/builder.ts` | `buildHtml`, `buildSection`, `processLine`, `esc`, `slugify` |
| `src/generator.ts` | `generate()`, `downloadZip()`, `downloadSingle()` |
| `src/preview.ts` | Preview panel open/close, `buildPreviewDoc`, live var substitution |
| `src/main.ts` | DOM wiring, event listeners, UI state (steps, console, chips) |
| `src/style.css` | All styles including CSS-grid split-panel layout |

**Data flow:**
```
Input (Google Sheets URL or .xlsx upload)
  → parseCSV / XLSX → state.sheetData
  → detectLanguages → state.langMap
  → user configures game name, row range, active languages
  → generate(): parseSections + buildHtml per lang → state.generated
  → extractDefaults() → state.defaults (rtp, maxWinnings from EN col)
  → downloadZip() → ZIP download
  → openPreview() → preview panel slides in
```

**Preview panel layout:**
- `.app-shell` uses CSS grid: `grid-template-columns: 1fr 0px` → `440px 1fr` when `.preview-open`
- `grid-template-columns` transition animates the split (Chrome 107+, Firefox 119+)
- Preview renders in an `<iframe srcdoc>` — isolated styles, white background
- `{{game_rtp}}` and `{{maxWinnings}}` inputs default to values extracted from the EN column
- `not-configured_{{maxWinnings}}` class → replaced with `is-configured` so span is visible in preview

**`processLine` substitution rules:**
- Line with `%` → replace the number before `%` with `{{game_rtp}}`
- Line with large number (`\d{1,3}(?:[,. ]\d{3})+`) → replace with `{{maxWinnings}}` wrapped in `<span class="not-configured_{{maxWinnings}}">`

## Supported Languages

`en`, `el`, `es`, `fr-ca`, `fr`, `it`, `nl`, `pt-br`, `pt-pt`, `sv`

To add a language, add an entry to `HEADER_TO_CODE` in `src/config.js`.

## Input Sheet Format

- **Row 4**: Column headers (language names used for detection)
- **Cell A2**: Game name (auto-populated into the UI)
- **Rows 196–263** (default): Content rows — blank rows create section breaks, first non-blank row in a section is the section title
- Sheet must be shared as "Anyone with the link can view" for URL-based loading
