# Help Page Generator

Browser-based tool for generating localised help page HTML files from a Google Sheets translations spreadsheet.

🔗 **Live tool:** https://st-volodymyr.github.io/Help-page-generator/

## Usage

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

`en` · `en-ct` · `el` · `es` · `fr-ca` · `fr` · `it` · `nl` · `pt-br` · `pt-pt` · `sv`

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
