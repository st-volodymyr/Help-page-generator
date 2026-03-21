import type { AppState } from './types.js';

export const state: AppState = {
  sheetData: null,
  langMap: [],
  generated: {},
  defaults: { rtp: '', maxWinnings: '' },
};
