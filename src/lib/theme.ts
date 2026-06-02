'use client';
import { useState, useEffect } from 'react';

/* ─── Gestion du thème clair/sombre, synchronisée entre composants ───
   Plusieurs boutons (flottant + en-tête) peuvent piloter le thème.
   On émet un évènement window 'themechange' pour que tous restent
   synchronisés sans état global lourd. */

export type Theme = 'light' | 'dark';

const EVT = 'themechange';

export function getTheme(): Theme {
  if (typeof document === 'undefined') return 'light';
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function setTheme(next: Theme) {
  if (typeof document === 'undefined') return;
  document.documentElement.classList.toggle('dark', next === 'dark');
  try { localStorage.setItem('theme', next); } catch { /* ignore */ }
  window.dispatchEvent(new CustomEvent(EVT, { detail: next }));
}

export function toggleTheme() {
  setTheme(getTheme() === 'dark' ? 'light' : 'dark');
}

/** Hook réactif : renvoie le thème courant, se met à jour partout. */
export function useTheme(): [Theme, () => void] {
  const [theme, setLocal] = useState<Theme>('light');

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocal(getTheme());
    const onChange = () => setLocal(getTheme());
    window.addEventListener(EVT, onChange);
    // Suit aussi un changement de préférence système si l'utilisateur n'a rien choisi
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onMq = () => { if (!localStorage.getItem('theme')) onChange(); };
    mq.addEventListener?.('change', onMq);
    return () => {
      window.removeEventListener(EVT, onChange);
      mq.removeEventListener?.('change', onMq);
    };
  }, []);

  return [theme, toggleTheme];
}
