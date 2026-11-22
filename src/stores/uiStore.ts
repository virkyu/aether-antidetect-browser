import { create } from 'zustand';

export type Language = 'pl' | 'en';
export type ThemeColor = 'default' | 'emerald' | 'blue' | 'purple' | 'amber' | 'rose' | 'cyan';

export interface ThemeOption {
  id: ThemeColor;
  nameKey: 'themeDefault' | 'themeEmerald' | 'themeBlue' | 'themePurple' | 'themeCyan' | 'themeAmber' | 'themeRose';
  color: string;
}

export const THEME_OPTIONS: ThemeOption[] = [
  { id: 'default', nameKey: 'themeDefault', color: '#ffffff' },
  { id: 'emerald', nameKey: 'themeEmerald', color: '#10b981' },
  { id: 'blue', nameKey: 'themeBlue', color: '#3b82f6' },
  { id: 'purple', nameKey: 'themePurple', color: '#a855f7' },
  { id: 'cyan', nameKey: 'themeCyan', color: '#06b6d4' },
  { id: 'amber', nameKey: 'themeAmber', color: '#f59e0b' },
  { id: 'rose', nameKey: 'themeRose', color: '#f43f5e' },
];

interface UIState {
  zoomLevel: number;
  zoomIn: () => void;
  zoomOut: () => void;
  setZoom: (level: number) => void;
  resetZoom: () => void;
  language: Language;
  setLanguage: (lang: Language) => void;
  themeColor: ThemeColor;
  setThemeColor: (color: ThemeColor) => void;
}

const STORAGE_KEY = 'aether_ui_scale_v4';
const LANG_STORAGE_KEY = 'aether_language';
const THEME_STORAGE_KEY = 'aether_theme_color';
export const PRESET_ZOOM_LEVELS = [90, 100, 110, 125, 140, 150];

export function applyThemeColor(theme: ThemeColor): void {
  const doc = document.documentElement;
  doc.setAttribute('data-theme', theme);
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch (e) {
    // Ignore storage errors
  }
}

function getInitialTheme(): ThemeColor {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY) as ThemeColor;
    if (['default', 'emerald', 'blue', 'purple', 'amber', 'rose', 'cyan'].includes(saved)) {
      applyThemeColor(saved);
      return saved;
    }
  } catch (e) {}
  applyThemeColor('default');
  return 'default';
}

function getInitialLanguage(): Language {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    if (saved === 'en' || saved === 'pl') return saved;
  } catch (e) {}
  return 'pl';
}

export function applyScale(level: number): number {
  const clamped = Math.max(85, Math.min(160, level));
  const doc = document.documentElement;

  // AGGRESSIVELY PURGE any broken CSS zoom property
  try {
    doc.style.removeProperty('zoom');
    document.body.style.removeProperty('zoom');
    (doc.style as any).zoom = '1';
    (document.body.style as any).zoom = '1';
  } catch (e) {
    // Ignore
  }

  // Calculate clean root rem font size (15.5px = 100%)
  // Tailwind v4 uses rem for text, padding, margins, heights, widths
  // Changing root font-size scales the entire UI proportionally without breaking viewport boundaries!
  const baseFontSize = (15.5 * clamped) / 100;
  doc.style.fontSize = `${baseFontSize}px`;
  doc.style.setProperty('--ui-scale', (clamped / 100).toString());

  try {
    localStorage.setItem(STORAGE_KEY, clamped.toString());
  } catch (e) {
    // Ignore storage errors
  }
  return clamped;
}

function getInitialScale(): number {
  // Purge any broken legacy zoom/scale keys from older builds
  try {
    localStorage.removeItem('aether_ui_zoom');
    localStorage.removeItem('aether_ui_scale');
    localStorage.removeItem('aether_ui_scale_v2');
    localStorage.removeItem('aether_ui_scale_v3');
  } catch (e) {}

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = parseInt(saved, 10);
      if (!isNaN(parsed) && parsed >= 85 && parsed <= 160) {
        applyScale(parsed);
        return parsed;
      }
    }
  } catch (e) {
    // Fallback to 100%
  }

  applyScale(100);
  return 100;
}

export const useUIStore = create<UIState>((set) => ({
  zoomLevel: getInitialScale(),

  zoomIn: () =>
    set((state) => {
      // Find the next preset level higher than current, or +10
      const nextPreset = PRESET_ZOOM_LEVELS.find((lvl) => lvl > state.zoomLevel);
      const target = nextPreset ?? state.zoomLevel + 10;
      const next = applyScale(target);
      return { zoomLevel: next };
    }),

  zoomOut: () =>
    set((state) => {
      // Find the closest preset level lower than current, or -10
      const prevPreset = [...PRESET_ZOOM_LEVELS].reverse().find((lvl) => lvl < state.zoomLevel);
      const target = prevPreset ?? state.zoomLevel - 10;
      const next = applyScale(target);
      return { zoomLevel: next };
    }),

  setZoom: (level: number) =>
    set(() => {
      const next = applyScale(level);
      return { zoomLevel: next };
    }),

  resetZoom: () =>
    set(() => {
      const next = applyScale(100);
      return { zoomLevel: next };
    }),

  language: getInitialLanguage(),

  setLanguage: (lang: Language) => {
    try {
      localStorage.setItem(LANG_STORAGE_KEY, lang);
    } catch (e) {}
    set({ language: lang });
  },

  themeColor: getInitialTheme(),

  setThemeColor: (color: ThemeColor) => {
    applyThemeColor(color);
    set({ themeColor: color });
  },
}));
