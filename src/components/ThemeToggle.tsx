import React, { useState, useEffect } from 'react';
import { Sun, Moon, Monitor } from 'lucide-react';

type Theme = 'dark' | 'light' | 'system';

export const ThemeToggle: React.FC = () => {
  const [theme, setTheme] = useState<Theme>(() => {
    try {
      return (localStorage.getItem('iris_theme') as Theme) || 'dark';
    } catch {
      return 'dark';
    }
  });

  const applyTheme = (t: Theme) => {
    const root = document.documentElement;
    const isDark = t === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : t === 'dark';

    if (isDark) {
      root.classList.remove('light');
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
      root.classList.add('light');
    }
  };

  useEffect(() => {
    applyTheme(theme);
    try {
      localStorage.setItem('iris_theme', theme);
    } catch {}
  }, [theme]);

  // Listen for system preference changes
  useEffect(() => {
    if (theme !== 'system') return;
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => applyTheme('system');
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, [theme]);

  const cycleTheme = () => {
    const next: Theme = theme === 'dark' ? 'light' : theme === 'light' ? 'system' : 'dark';
    setTheme(next);
  };

  const icon = theme === 'dark' ? <Moon className="w-3.5 h-3.5" /> :
               theme === 'light' ? <Sun className="w-3.5 h-3.5" /> :
               <Monitor className="w-3.5 h-3.5" />;

  return (
    <button
      onClick={cycleTheme}
      className="btn-ripple p-2 rounded-full bg-[#141416] hover:bg-white/5 text-white/40 hover:text-white border border-white/5 hover:border-white/10 transition-all duration-200"
      title={`Theme: ${theme} (click to cycle)`}
      aria-label={`Switch theme (currently ${theme})`}
    >
      {icon}
    </button>
  );
};
