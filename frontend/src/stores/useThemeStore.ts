// Theme store — permanently light. Dark mode has been removed.
// This stub is kept for import compatibility during the transition.

import { create } from 'zustand';

interface ThemeState {
  theme: 'light';
  setTheme: (theme: 'light') => void;
}

// Ensure .dark class is never present (clear any legacy localStorage value)
if (typeof window !== 'undefined') {
  document.documentElement.classList.remove('dark');
  try { localStorage.removeItem('aether_theme'); } catch (_) {}
}

export const useThemeStore = create<ThemeState>(() => ({
  theme: 'light',
  setTheme: () => {
    // No-op: application is permanently light
  },
}));
