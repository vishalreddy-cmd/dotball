'use client';
import { createContext, useContext, useState, useEffect } from 'react';

const ThemeCtx = createContext({ theme: 'dark', toggle: () => {}, t: {} });

export const DARK = {
  bg:        '#08090f',
  surface:   '#111421',
  surface2:  '#0d0f1a',
  border:    '#1c2035',
  border2:   '#252a40',
  text:      '#eef0ff',
  text2:     '#7a85a0',
  text3:     '#424960',
  accent:    '#6366f1',
  accentBg:  '#6366f118',
  accentText:'#818cf8',
};

export const LIGHT = {
  bg:        '#f5f0e8',   // warm cream, never stark white
  surface:   '#fdfaf5',   // warm off-white
  surface2:  '#ede8df',   // warm beige for alternates
  border:    '#ddd5c8',   // warm tan border
  border2:   '#ccc3b4',   // slightly darker tan
  text:      '#1c1208',   // near-black with warm tint
  text2:     '#6b5f50',   // warm brown-gray
  text3:     '#a89880',   // muted warm
  accent:    '#5b5ef0',   // indigo stays the same
  accentBg:  '#5b5ef010',
  accentText:'#4a4dd4',
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('db_theme')) || 'dark';
    setTheme(saved);
    document.documentElement.setAttribute('data-theme', saved);
  }, []);

  function toggle() {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    localStorage.setItem('db_theme', next);
    document.documentElement.setAttribute('data-theme', next);
  }

  const t = theme === 'dark' ? DARK : LIGHT;

  return (
    <ThemeCtx.Provider value={{ theme, toggle, t }}>
      {children}
    </ThemeCtx.Provider>
  );
}

export const useTheme = () => useContext(ThemeCtx);
