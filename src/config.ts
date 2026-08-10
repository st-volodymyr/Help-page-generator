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
  'english ct (en-ct)':           'en-us-ct',
  'english us ct (en-us-ct)':     'en-us-ct',
  'english-social (en-sc)':       'en-SOCIAL',
  'english - social (en-sc)':     'en-SOCIAL',
  'english social (en-sc)':       'en-SOCIAL',
  'german-social (de-sc)':        'de-SOCIAL',
  'german - social (de-sc)':      'de-SOCIAL',
  'german social (de-sc)':        'de-SOCIAL',
  'greek (el)':                   'el',
  'spanish (es)':                 'es',
  'french canadian (fr-ca)':      'fr-ca',
  'french (fr)':                  'fr',
  'italian (it)':                 'it',
  'dutch (nl)':                   'nl',
  'portuguese brazilian (pt-br)': 'pt-br',
  'portuguese (pt)':              'pt-pt',
  'portuguese (pt-pt)':           'pt-pt',
  'portuguese european (pt-pt)':  'pt-pt',
  'swedish (se)':                 'sv',
  'swedish (sv)':                 'sv',

  // ── Format B: "CODE - Language name" (from en-ct sheets) ──────
  'en - english':                      'en',
  'en-ct - english connecticut':       'en-us-ct',
  'en-sc - english social':            'en-SOCIAL',
  'en-sc - english (social casino)':   'en-SOCIAL',
  'de-sc - german social':             'de-SOCIAL',
  'de-sc - german (social casino)':    'de-SOCIAL',
  'el - greek':                        'el',
  'es - spanish':                      'es',
  'fr - ca french canadian':           'fr-ca',
  'fr-ca - french canadian':           'fr-ca',
  'fr - french':                       'fr',
  'it - italian':                      'it',
  'nl dutch':                          'nl',
  'nl - dutch':                        'nl',
  'pt - br portuguese brazilian':      'pt-br',
  'pt-br - portuguese brazilian':      'pt-br',
  'pt portuguese':                     'pt-pt',
  'pt - portuguese':                   'pt-pt',
  'pt-pt - portuguese':                'pt-pt',
  'pt-pt - portuguese european':       'pt-pt',
  'se - sweedish':                     'sv',
  'se - swedish':                      'sv',
  'sv - swedish':                      'sv',
};

/** Raw codes that differ from the code our games/filenames use. */
const CODE_ALIAS: Record<string, string> = {
  'en-ct': 'en-us-ct',
  'pt':    'pt-pt',
  'se':    'sv',
  'en-sc': 'en-SOCIAL',
  'de-sc': 'de-SOCIAL',
};

/**
 * Header cell text → language code. Exact HEADER_TO_CODE entries win; unknown
 * spellings fall back to extracting the code from "Language (CODE)" or
 * "CODE - Language" forms, so a new sheet variant ("Swedish(SV)",
 * "Portuguese (PT-PT )") works without a config change.
 */
export function headerToCode(raw: string): string | null {
  const t = String(raw ?? '').trim().toLowerCase();
  if (!t) return null;
  if (HEADER_TO_CODE[t]) return HEADER_TO_CODE[t];
  const m = t.match(/\(\s*([a-z]{2}(?:-[a-z]{2,6})?)\s*\)\s*$/)   // "Language (CODE)"
         ?? t.match(/^([a-z]{2}(?:-[a-z]{2,6})?)\s*-\s+\S/);       // "CODE - Language"
  if (!m) return null;
  return CODE_ALIAS[m[1]] ?? m[1];
}
