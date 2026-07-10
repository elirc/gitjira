// LEARN (sprint 14): the theme controller. Three states, not two: 'light',
// 'dark', and 'system' (follow the OS). We persist the CHOICE, and reflect it by
// stamping data-theme on <html> — which is exactly what tokens.css keys off, so
// flipping the attribute re-themes the whole app with zero component changes.
const KEY = 'gj-theme';

/** @returns {'light'|'dark'|'system'} */
export function getThemePreference() {
  return localStorage.getItem(KEY) ?? 'system';
}

export function applyTheme(pref) {
  const root = document.documentElement;
  if (pref === 'system') {
    // Remove the override and let the prefers-color-scheme media query decide.
    root.removeAttribute('data-theme');
  } else {
    root.setAttribute('data-theme', pref);
  }
}

export function setThemePreference(pref) {
  localStorage.setItem(KEY, pref);
  applyTheme(pref);
}

// Call once at boot, before first paint, so there's no flash of the wrong theme.
export function initTheme() {
  applyTheme(getThemePreference());
}
