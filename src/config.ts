/**
 * Maps spreadsheet column header text (lowercase, trimmed) → language code.
 *
 * Two sheet formats are in use:
 *   Format A – parenthetical:  "English (EN)", "Greek (EL)", …
 *   Format B – dash-separated: "EN - ENGLISH", "EN-CT - ENGLISH CONNECTICUT", …
 *
 * Both formats are listed here so the tool accepts either without configuration.
 */
export const HEADER_TO_CODE: Record<string, string> = {
  // ── Format A: "Language (Code)" ───────────────────────────────
  'english (en)':                 'en',
  'english ct (en-ct)':           'en-ct',
  'english us ct (en-us-ct)':     'en-ct',
  'greek (el)':                   'el',
  'spanish (es)':                 'es',
  'french canadian (fr-ca)':      'fr-ca',
  'french (fr)':                  'fr',
  'italian (it)':                 'it',
  'dutch (nl)':                   'nl',
  'portuguese brazilian (pt-br)': 'pt-br',
  'portuguese (pt)':              'pt-pt',
  'swedish (se)':                 'sv',

  // ── Format B: "CODE - Language name" (from en-ct sheets) ──────
  'en - english':                      'en',
  'en-ct - english connecticut':       'en-ct',
  'el - greek':                        'el',
  'es - spanish':                      'es',
  'fr - ca french canadian':           'fr-ca',
  'fr - french':                       'fr',
  'it - italian':                      'it',
  'nl dutch':                          'nl',
  'nl - dutch':                        'nl',
  'pt - br portuguese brazilian':      'pt-br',
  'pt portuguese':                     'pt-pt',
  'pt - portuguese':                   'pt-pt',
  'se - sweedish':                     'sv',
  'se - swedish':                      'sv',
};
