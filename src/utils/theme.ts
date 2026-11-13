/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ThemePreference = 'dark' | 'light' | 'system';
export type ResolvedTheme = 'dark' | 'light';

const DEFAULT_THEME_KEY = 'dem_theme_pref_default';

function getUserThemeKey(userIdentifier?: string | null): string {
  if (!userIdentifier) return DEFAULT_THEME_KEY;
  const sanitized = userIdentifier.replace(/[^a-zA-Z0-9_.-]/g, '_');
  return `dem_theme_pref_${sanitized}`;
}

export function getStoredThemePreference(userIdentifier?: string | null): ThemePreference {
  try {
    const userKey = getUserThemeKey(userIdentifier);
    const stored = localStorage.getItem(userKey) ?? localStorage.getItem(DEFAULT_THEME_KEY);
    if (stored === 'dark' || stored === 'light' || stored === 'system') {
      return stored;
    }
  } catch {
    // ignore storage access errors
  }
  return 'dark';
}

export function saveThemePreference(pref: ThemePreference, userIdentifier?: string | null): void {
  try {
    localStorage.setItem(DEFAULT_THEME_KEY, pref);
    if (userIdentifier) {
      localStorage.setItem(getUserThemeKey(userIdentifier), pref);
    }
  } catch {
    // ignore storage access errors
  }
}

export function resolveTheme(pref: ThemePreference): ResolvedTheme {
  if (pref === 'light') return 'light';
  if (pref === 'dark') return 'dark';
  if (typeof window !== 'undefined' && window.matchMedia) {
    return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
  }
  return 'dark';
}

export function applyThemeToDocument(pref: ThemePreference): ResolvedTheme {
  const resolved = resolveTheme(pref);
  if (typeof document !== 'undefined') {
    const root = document.documentElement;
    root.setAttribute('data-theme', resolved);
    if (resolved === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }
  return resolved;
}
