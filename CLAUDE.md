# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # first-time setup
npm run dev          # dev server with HMR (http://localhost:5173)
npm run build        # production build → docs/  (commit docs/ to deploy)
npm run preview      # serve the docs/ build locally
npm run typecheck    # tsc --noEmit (no output = clean)
```

## Deployment

- GitHub Pages serves from the `docs/` folder on the `main` branch (Settings → Pages → Deploy from branch → main / docs)
- After any change: `npm run build` → commit `docs/` → push
- A GitHub Actions workflow (`.github/workflows/deploy.yml`) also exists as an alternative — requires Pages source set to "GitHub Actions"

## Architecture

Vite + TypeScript project. `index.html` at root, source modules in `src/`, production build output in `docs/`.

**External globals (CDN, loaded in `index.html`):**
- `XLSX` v0.18.5 — parses `.xlsx` file uploads
- `JSZip` v3.10.1 — bundles output HTML into a downloadable ZIP

**Module responsibilities:**

| File | Role |
|------|------|
| `src/types.ts` | Shared interfaces: `LangEntry`, `Section`, `AppState`, `ClogFn` |
| `src/globals.d.ts` | Type declarations for CDN globals (`XLSX`, `JSZip`) |
| `src/config.ts` | `HEADER_TO_CODE` map (header text → lang code), two formats supported |
| `src/state.ts` | Shared mutable state: `sheetData`, `langMap`, `generated`, `params` |
| `src/parser.ts` | `parseCSV`, `detectLanguages`, `detectHeaderRow`, `detectRowRange`, `markEmptyLanguages`, `parseSections`, `extractDefaults` |
| `src/builder.ts` | `buildHtml`, `buildSection`, `processLine`, `esc`, `slugify` |
| `src/generator.ts` | `generate()`, `extractParamDefaults()`, `downloadZip()`, `downloadSingle()` |
| `src/preview.ts` | Preview panel open/close, `buildPreviewDoc`, dynamic param inputs, live substitution |
| `src/main.ts` | DOM wiring, event listeners, UI state (steps, console, lang chips) |
| `src/style.css` | All styles including CSS-grid split-panel layout |

**Data flow:**
```
Input (Google Sheets URL or .xlsx upload)
  → parseCSV / XLSX → state.sheetData
  → detectHeaderRow → detectRowRange → detectLanguages → state.langMap
  → markEmptyLanguages → empty columns flagged (on=false, empty=true)
  → user configures game name, row range, active languages
  → generate(): parseSections + buildHtml per lang → state.generated
  → extractParamDefaults() → state.params (all {{...}} param defaults from EN col)
  → openPreview() → dynamic param inputs built from state.params → iframe srcdoc
  → downloadSingle() / downloadZip() → file export
```

**Preview panel:**
- `.app-shell` uses CSS grid: `grid-template-columns: 1fr 0px` → `440px 1fr` when `.preview-open`
- Transition animates the split (Chrome 107+, Firefox 119+)
- Preview renders in `<iframe srcdoc>` with dark game-matching styles (#0d0d0d bg, #fff text, Arial)
- Param inputs are built dynamically in two groups: **// main** (`game_rtp`, `maxWinnings`) and **// section rtp** (all others)
- `not-configured_{{maxWinnings}}` class → replaced with `is-configured` when value is set

**`processLine` substitution rules:**
- Line with `%` in a section whose slug contains `return` → `{{game_rtp}}`
- Line with `%` in any other section → `{{section_slug_rtp}}` (2nd occurrence: `_rtp_2`, etc.)
- Line with large formatted number (`\d{1,3}(?:[,. ]\d{3})+`) → `{{maxWinnings}}` wrapped in `<span class="not-configured_{{maxWinnings}}">`

**Loading new sheet resets all state:**
- Closes preview, clears `state.generated`, `state.params`, game name field, success card, resets to step 1

## Supported Languages

`en`, `en-ct`, `el`, `es`, `fr-ca`, `fr`, `it`, `nl`, `pt-br`, `pt-pt`, `sv`

Two header formats in `HEADER_TO_CODE` (`src/config.ts`):
- Format A: `"English (EN)"`, `"Spanish (ES)"` …
- Format B: `"EN - English"`, `"ES - Spanish"` …

To add a language, add both format variants to `HEADER_TO_CODE`.

## Input Sheet Format

- **Cell A2**: Game name (auto-filled into the UI)
- **Language row**: Row with ≥2 known language headers — auto-detected by `detectHeaderRow`
- **Content block**: Starts at first row containing "How to Play", ends at the "©/copyright" row (inclusive) — auto-detected by `detectRowRange`
- Blank rows in content block = section breaks; first non-blank row of each block = section title (from col 0 / enTitle)
- Sheet must be shared as "Anyone with the link can view" for URL-based loading

## UI Behaviour Notes

- **Steps bar**: 2 steps only — "Load sheet" (step1) and "Generate" (step3 ID kept for back-compat)
- **Load button**: disabled and URL field highlighted yellow when URL is empty; button highlights blue when URL is filled
- **Language chips**: empty columns shown with dashed border + "empty" badge, unchecked by default
- **Download single**: filename format is `help_LANGCODE.html` (e.g. `help_fr-ca.html`)
- **Download ZIP**: filename format is `help_pages_GAMENAME.zip`
