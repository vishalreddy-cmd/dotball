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
  bg:        '#f0f2ff',
  surface:   '#ffffff',
  surface2:  '#e8eaff',
  border:    '#dde0f5',
  border2:   '#c8cceb',
  text:      '#0f1123',
  text2:     '#5b6785',
  text3:     '#9ca3af',
  accent:    '#6366f1',
  accentBg:  '#6366f112',
  accentText:'#4f52d4',
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
