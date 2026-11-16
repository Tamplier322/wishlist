import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { ViewMode } from '../../types';

const VIEW_MODE_KEY = 'wl_view_mode';
const THEME_KEY = 'wl_theme';

export type Theme = 'light' | 'dark';

function loadViewMode(): ViewMode {
  return localStorage.getItem(VIEW_MODE_KEY) === 'text' ? 'text' : 'cards';
}

function loadTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY);
  return stored === 'dark' ? 'dark' : 'light';
}

function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

interface UiState {

  viewMode: ViewMode;

  theme: Theme;
}

const initialTheme = loadTheme();
applyTheme(initialTheme);

const initialState: UiState = {
  viewMode: loadViewMode(),
  theme: initialTheme,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setViewMode(state, action: PayloadAction<ViewMode>) {
      state.viewMode = action.payload;
      localStorage.setItem(VIEW_MODE_KEY, action.payload);
    },
    setTheme(state, action: PayloadAction<Theme>) {
      state.theme = action.payload;
      localStorage.setItem(THEME_KEY, action.payload);
      applyTheme(action.payload);
    },
    toggleTheme(state) {
      const next = state.theme === 'dark' ? 'light' : 'dark';
      state.theme = next;
      localStorage.setItem(THEME_KEY, next);
      applyTheme(next);
    },
  },
});

export const { setViewMode, setTheme, toggleTheme } = uiSlice.actions;
export default uiSlice.reducer;

export const selectViewMode = (state: { ui: UiState }): ViewMode => state.ui.viewMode;
export const selectTheme = (state: { ui: UiState }): Theme => state.ui.theme;
