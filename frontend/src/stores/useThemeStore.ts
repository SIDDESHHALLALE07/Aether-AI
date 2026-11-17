import { create } from 'zustand';
import type { ThemeMode } from '../types';
import { api } from '../services/api';

interface ThemeState {
  theme: ThemeMode;
  resolvedTheme: 'light' | 'dark';
  setTheme: (theme: ThemeMode) => void;
  toggleTheme: () => void;
  initTheme: () => void;
}

const getStoredTheme = (): ThemeMode => {
  if (typeof window === 'undefined') return 'system';
  try {
    const val = localStorage.getItem('aether_theme') as ThemeMode | null;
    if (val === 'light' || val === 'dark' || val === 'system') {
      return val;
    }
  } catch {}
  return 'system';
};

const resolveTheme = (mode: ThemeMode): 'light' | 'dark' => {
  if (mode === 'system') {
    if (typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      return 'dark';
    }
    return 'light';
  }
  return mode;
};

const applyToDOM = (resolved: 'light' | 'dark') => {
  if (typeof window === 'undefined') return;
  const root = document.documentElement;
  if (resolved === 'dark') {
    root.classList.add('dark');
    root.setAttribute('data-theme', 'dark');
    root.style.colorScheme = 'dark';
  } else {
    root.classList.remove('dark');
    root.setAttribute('data-theme', 'light');
    root.style.colorScheme = 'light';
  }
};

const initialTheme = getStoredTheme();
const initialResolved = resolveTheme(initialTheme);
applyToDOM(initialResolved);

// Watch OS preference changes when theme is set to 'system'
if (typeof window !== 'undefined' && window.matchMedia) {
  const mql = window.matchMedia('(prefers-color-scheme: dark)');
  const listener = () => {
    try {
      const current = useThemeStore.getState().theme;
      if (current === 'system') {
        const resolved = resolveTheme('system');
        applyToDOM(resolved);
        useThemeStore.setState({ resolvedTheme: resolved });
      }
    } catch {}
  };
  if (mql.addEventListener) {
    mql.addEventListener('change', listener);
  } else if ((mql as any).addListener) {
    (mql as any).addListener(listener);
  }
}

export const useThemeStore = create<ThemeState>((set, get) => ({
  theme: initialTheme,
  resolvedTheme: initialResolved,
  setTheme: (theme: ThemeMode) => {
    try {
      localStorage.setItem('aether_theme', theme);
    } catch {}
    const resolved = resolveTheme(theme);
    applyToDOM(resolved);
    set({ theme, resolvedTheme: resolved });

    // Sync in background to backend preferences if possible
    api.updateUserSettings({ theme }).catch(() => {});
  },
  toggleTheme: () => {
    const currentResolved = get().resolvedTheme;
    const nextTheme: ThemeMode = currentResolved === 'dark' ? 'light' : 'dark';
    get().setTheme(nextTheme);
  },
  initTheme: () => {
    const theme = getStoredTheme();
    const resolved = resolveTheme(theme);
    applyToDOM(resolved);
    set({ theme, resolvedTheme: resolved });
  },
}));
