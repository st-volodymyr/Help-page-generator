export interface LangEntry {
  col: number;
  code: string;
  on: boolean;
  /** True when the column header was found but the content block has no non-empty cells */
  empty: boolean;
  /** Platform-specific column, e.g. "English - Social (EN-SC amwest)" → 'amwest' */
  variant?: LangVariant;
}

/** Platform word that QA appends inside the header parentheses. */
export type LangVariant = 'amwest';

export interface Section {
  enTitle: string;
  titleByCol: Record<number, string>;
  contentByCol: Record<number, string[]>;
}

export interface AppState {
  sheetData: string[][] | null;
  langMap: LangEntry[];
  generated: Record<string, string>;
  /** All template params with their extracted default values */
  params: Record<string, string>;
}

export type LogType = 'info' | 'success' | 'warn' | 'error';
export type ClogFn = (type: LogType, msg: string) => void;
