# Help Page Generator

Tool for generating localised help page HTML files from a Google Sheets translations spreadsheet. Two ways to use it: the browser tool (with live preview) or the CLI (writes files straight into a game repo).

🔗 **Live tool:** https://st-volodymyr.github.io/Help-page-generator/

## CLI usage

From a game repo root (any dev, nothing to install — only Node 18+):

```bash
npx github:st-volodymyr/Help-page-generator <sheet-url | file.xlsx | file.csv> [options]
```

Files are written straight into the game's `help/` folder. Languages are taken
from the game's `package.json` → `l10ntool.langs`, plus `en` (always).

| Option | Meaning |
|---|---|
| `--out <dir>` | Output folder (default `./help`, must exist) |
| `--game <dir>` | Game repo root with `package.json` (default: current dir) |
| `--langs a,b,c` | Override the language list entirely |
| `--values` | Write real values instead of `{{...}}` placeholders (same as unchecking "templatize" in the web tool) |
| `--name "Game"` | Override the auto-detected game name (cell A2) |
| `--rows 6:13` | Override the detected content row range (start:end, 1-based) |
| `-y`, `--yes` | Skip the interactive confirmation of game name / rows |

Before generating, the CLI shows the detected game name and content row range
(with a peek at the first/last row text) and asks to confirm — press Enter to
accept or type a correction. In CI (no terminal) or with `--yes` the detected
values are used as-is.

The run ends with a summary: updated files, warnings (lang in `langs` but
missing/empty in the sheet — existing file untouched), skipped sheet columns
not in `langs`, and stale `help_*.html` files worth deleting.

Optional per-game convenience script in the game's `package.json`:

```json
"scripts": { "help:gen": "npx github:st-volodymyr/Help-page-generator" }
```

then: `npm run help:gen -- <sheet-url>`.

## Web usage

1. Open the tool URL above
2. Paste your Google Sheet link **or** upload the `.xlsx` export — game name, row range, and language row are auto-detected
3. Review the detected languages (empty columns are flagged automatically)
4. Click **Generate & Preview** to see the result in the live preview panel
5. Use **↓ Download current language (.html)** or **↓ Download all languages (ZIP)** to export

## Sheet requirements

- Must be shared as **"Anyone with the link → Viewer"** for the URL option to work
- Alternatively export as `.xlsx` (File → Download → Microsoft Excel) and upload directly
- **Cell A2** — game name (auto-filled)
- **Language row** — row containing column headers like `English (EN)` or `EN - English` (auto-detected)
- **Content block** — starts at "How to Play", ends before "© copyright" (auto-detected)
- Blank rows between content rows create section breaks; the first row of each section is the title

## Template variables in generated HTML

| Variable | Source |
|---|---|
| `{{game_rtp}}` | Any `%` value in the "Return to Player" section |
| `{{maxWinnings}}` | First large formatted number (e.g. `250,000.00`) |
| `{{ante_bet_rules_rtp}}` | `%` values in the Ante Bet Rules section |
| `{{feature_buy_rules_rtp}}` | `%` values in the Feature Buy Rules section |
| `{{section_name_rtp_N}}` | Any other section with `%` values |

The preview panel lets you substitute live values for all detected parameters before downloading.

## Supported languages

`en` · `en-us-ct` · `el` · `es` · `fr-ca` · `fr` · `it` · `nl` · `pt-br` · `pt-pt` · `sv`

Two header formats are supported:
- Format A: `English (EN)`, `Spanish (ES)` …
- Format B: `EN - English`, `ES - Spanish` …

## Adding a new language

Add an entry to `HEADER_TO_CODE` in `src/config.ts` and rebuild:

```ts
'header text in sheet': 'lang-code',
```

## Development

```bash
npm install       # first-time setup
npm run dev       # dev server at http://localhost:5173
npm run build     # production build → docs/
npm run typecheck # type check only
```

After `npm run build`, commit the `docs/` folder — GitHub Pages serves from there.
