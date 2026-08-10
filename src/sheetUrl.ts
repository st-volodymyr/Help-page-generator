/**
 * Google Sheets URL → CSV export URL. Shared by the web tool (main.ts) and
 * the CLI (cli.ts) so the two never drift on URL parsing.
 * Returns null when no spreadsheet id can be found.
 */
export function sheetToCsvUrl(url: string): string | null {
  const idMatch = url.match(/\/spreadsheets\/d\/([a-zA-Z0-9_-]+)/);
  if (!idMatch) return null;
  let csvUrl = `https://docs.google.com/spreadsheets/d/${idMatch[1]}/export?format=csv`;
  const gid = url.match(/[#&?]gid=(\d+)/);
  if (gid) csvUrl += `&gid=${gid[1]}`;
  return csvUrl;
}
