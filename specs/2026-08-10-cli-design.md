# CLI for Help Page Generator — Design

**Date:** 2026-08-10
**Status:** Approved pending user review

## Problem

Devs generate help pages in the browser tool (GitHub Pages), download a ZIP, and
manually copy `help_*.html` files into each game repo's `help/` folder. The manual
copy step is error-prone and slow. The tool exists only as a web page; the source
repo lives only on one machine, so any local-script solution would not be usable
by other devs.

## Solution

Add a Node CLI to this repo, runnable by any dev directly from GitHub:

```bash
npx github:st-volodymyr/Help-page-generator <sheet-url | file.xlsx> [options]
```

Run from a game repo's root, it fetches the translations sheet, builds the same
HTML the web tool builds, and writes `help_<lang>.html` files straight into the
game's `help/` folder. No install, no manual copying, always the latest version.

## CLI interface

```
Usage: npx github:st-volodymyr/Help-page-generator <source> [options]

  <source>            Google Sheets URL (shared "Anyone with link") or path to .xlsx

Options:
  --out <dir>         Output folder (default: ./help). Must already exist.
  --game <dir>        Game repo root to read package.json from (default: cwd)
  --langs a,b,c       Override the language list entirely (skip package.json)
  --values            Substitute {{param}} placeholders with values auto-detected
                      from the sheet (default: keep placeholders)
  --name <game name>  Override auto-detected game name (sheet cell A2)
```

## Language selection

The set of languages to generate is:

- `en` — always (default language). Projects that don't need it delete the file.
- Every language listed in `l10ntool.langs` of the game's `package.json`.
- `en-us-ct` gets no special treatment — it is generated only when a project
  lists it in `l10ntool.langs`, like any other language.
- `--langs` replaces the whole computed list when a project is non-standard.

Reconciliation rules and end-of-run summary:

| Case | Behaviour |
|---|---|
| Lang in list, sheet column present | Write `help_<lang>.html`, report "updated" |
| Lang in list, sheet column empty/missing | **Warning**; existing file left untouched |
| Sheet column present, lang not in list | Skip; reported in the final summary as "skipped (not in langs)" |
| `help_*.html` on disk for a lang not in list and not in sheet | Reported as "stale file, consider deleting" |

## Placeholders

Same single switch as the web version:

- Default: `{{game_rtp}}`, `{{maxWinnings}}`, etc. are written verbatim
  (projects like powerdragonxxxrtp94 substitute them at runtime).
- `--values`: substitute values auto-detected from the sheet — reuses the
  existing `extractDefaults` logic that powers the web preview.

## Architecture

New `src/cli.ts`. It reuses `parser.ts`, `builder.ts`, `config.ts` **unchanged**
(they are already DOM-free). The CLI replaces only what `main.ts` does in the
browser:

```
source argument
  ├─ URL   → fetch https://docs.google.com/spreadsheets/d/<id>/export?format=csv[&gid]
  │          (same URL scheme main.ts uses) → parseCSV
  └─ .xlsx → SheetJS (bundled) → rows

rows → detectHeaderRow → detectRowRange → detectLanguages     (existing code)
     → filter langs per package.json rules (new, CLI-only)
     → parseSections + buildHtml per lang                     (existing code)
     → [--values] substitute params via extractDefaults       (existing code)
     → write help_<lang>.html into --out
     → print summary (updated / warned / skipped / stale)
```

### Bug fix folded in

`src/config.ts`: language code `en-ct` → `en-us-ct`, so both the web tool and
the CLI emit `help_en-us-ct.html` — the filename game engines actually expect.

## Packaging & distribution

**Build-on-install (`prepare` script).** Chosen so future changes to the
generator are picked up automatically — `npx github:` resolves the branch HEAD
on each run and rebuilds from current source; there is no committed bundle that
can silently go stale.

- `package.json` gains:
  - `"bin": { "help-page-gen": "bin/cli.mjs" }`
  - `"prepare": "npm run build:cli"`
  - `"build:cli": "esbuild src/cli.ts --bundle --platform=node --format=esm --outfile=bin/cli.mjs"`
- `xlsx` (SheetJS) added as a devDependency, bundled into `bin/cli.mjs` by
  esbuild — the installed package has zero runtime dependencies.
- `bin/` is gitignored (built artifact, unlike `docs/` which GitHub Pages needs).
- Requires Node 18+ (native `fetch`) — already required by game build tooling.

## Error handling

- Sheet fetch fails (not shared / HTTP error): clear message suggesting the
  `.xlsx` export fallback — same guidance as the web tool.
- `--out` folder missing: error with hint (never silently create folders —
  protects against running from the wrong directory).
- No `l10ntool.langs` in package.json and no `--langs`: error explaining both
  options.
- Non-zero exit code on any error or on zero files written (CI-friendly).

## Per-game convenience (optional)

One line in a game's `package.json`:

```json
"help:gen": "npx github:st-volodymyr/Help-page-generator"
```

so devs run `npm run help:gen -- <sheet-url>`. Projects that substitute values
bake `--values` into the script. Not required — the raw `npx` command works
from any game repo.

## Testing

- Existing `npm run test` (money formatting) untouched.
- New CLI smoke test: fixture `.xlsx`/CSV → generate into a temp dir → compare
  against golden HTML files. Covers: lang filtering, `--values` on/off,
  `en-us-ct` filename, summary output.
- Acceptance check: run against powerdragonxxxrtp94's real sheet and
  `git diff help/` — only expected differences (e.g. the deleted
  `help_en-us-ct.html` staying absent).

## Out of scope

- No changes to the web UI or its workflow (it keeps working as today).
- No param substitution beyond the single `--values` switch (no per-param
  overrides until a project actually needs them).
- No auto-creation of `help/` folders, no CI wiring.
