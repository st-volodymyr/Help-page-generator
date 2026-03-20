# Help Page Generator

Browser-based tool for generating localised help page HTML files from a Google Sheets translations spreadsheet.

🔗 **Live tool:** https://st-volodymyr.github.io/Help-page-generator/

## Usage

1. Open the tool URL above
2. Paste your Google Sheet link **or** upload the `.xlsx` export
3. Confirm the game name (auto-filled from cell A2)
4. Click **Generate** — a ZIP of all language HTML files downloads instantly

## Requirements

The Google Sheet must be shared as **"Anyone with the link can view"** for the URL option to work.
Alternatively, export as `.xlsx` (File → Download → Microsoft Excel) and upload directly.

## Languages supported

`en` · `el` · `es` · `fr-ca` · `fr` · `it` · `nl` · `pt-br` · `pt-pt` · `sv`

## Adding a new language column

Open `index.html`, find `HEADER_TO_CODE` and add:
```js
'english us ct (en-us-ct)': 'en-us-ct',
```
