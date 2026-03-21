declare const XLSX: {
  read(data: ArrayBuffer, opts: { type: string }): XLSXWorkbook;
  utils: {
    sheet_to_json(sheet: XLSXWorksheet, opts: { header: 1; defval: string }): string[][];
  };
};

interface XLSXWorkbook {
  SheetNames: string[];
  Sheets: Record<string, XLSXWorksheet>;
}

interface XLSXWorksheet {
  [key: string]: unknown;
}

declare class JSZip {
  file(name: string, content: string): void;
  generateAsync(opts: { type: 'blob' }): Promise<Blob>;
}
