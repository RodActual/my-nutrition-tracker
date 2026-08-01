export const ACCENTS = [
  { id: 'emerald', label: 'Emerald', swatch: '#10b981' },
  { id: 'blue', label: 'Blue', swatch: '#3b82f6' },
  { id: 'violet', label: 'Violet', swatch: '#8b5cf6' },
  { id: 'rose', label: 'Rose', swatch: '#f43f5e' },
  { id: 'amber', label: 'Amber', swatch: '#f59e0b' },
  { id: 'teal', label: 'Teal', swatch: '#14b8a6' },
];

const MODE_KEY = 'nt_theme_mode'; // 'system' | 'light' | 'dark'
const ACCENT_KEY = 'nt_accent';

export function getStoredMode() {
  if (typeof window === 'undefined') return 'system';
  return localStorage.getItem(MODE_KEY) || 'system';
}

export function getStoredAccent() {
  if (typeof window === 'undefined') return 'emerald';
  return localStorage.getItem(ACCENT_KEY) || 'emerald';
}

export function resolveMode(mode) {
  if (mode === 'system') {
    if (typeof window === 'undefined') return 'dark';
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return mode;
}

export function applyTheme(mode, accent) {
  if (typeof document === 'undefined') return;
  document.documentElement.setAttribute('data-mode', resolveMode(mode));
  document.documentElement.setAttribute('data-accent', accent);
}

export function setMode(mode) {
  localStorage.setItem(MODE_KEY, mode);
  applyTheme(mode, getStoredAccent());
}

export function setAccent(accent) {
  localStorage.setItem(ACCENT_KEY, accent);
  applyTheme(getStoredMode(), accent);
}

// Inline script string injected before paint to avoid a flash of the wrong theme.
export const THEME_BOOT_SCRIPT = `
(function(){
  try {
    var mode = localStorage.getItem('${MODE_KEY}') || 'system';
    var accent = localStorage.getItem('${ACCENT_KEY}') || 'emerald';
    var resolved = mode === 'system'
      ? (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark')
      : mode;
    document.documentElement.setAttribute('data-mode', resolved);
    document.documentElement.setAttribute('data-accent', accent);
  } catch (e) {}
})();
`;
