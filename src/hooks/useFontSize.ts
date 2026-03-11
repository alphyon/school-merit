import { useState, useEffect } from 'react';

type FontScale = 'normal' | 'large' | 'xl';

const STORAGE_KEY = 'font_scale';
const CLASS_MAP: Record<FontScale, string> = {
  normal: '',
  large: 'font-scale-lg',
  xl: 'font-scale-xl',
};

function applyScale(scale: FontScale) {
  const html = document.documentElement;
  html.classList.remove('font-scale-lg', 'font-scale-xl');
  if (CLASS_MAP[scale]) html.classList.add(CLASS_MAP[scale]);
}

export function useFontSize() {
  const [scale, setScale] = useState<FontScale>(() => {
    return (localStorage.getItem(STORAGE_KEY) as FontScale) || 'normal';
  });

  useEffect(() => {
    applyScale(scale);
    localStorage.setItem(STORAGE_KEY, scale);
  }, [scale]);

  // Apply on mount (covers page refresh)
  useEffect(() => {
    applyScale(scale);
  }, []);

  const increase = () => {
    setScale(s => s === 'normal' ? 'large' : s === 'large' ? 'xl' : 'xl');
  };

  const decrease = () => {
    setScale(s => s === 'xl' ? 'large' : s === 'large' ? 'normal' : 'normal');
  };

  const reset = () => setScale('normal');

  return { scale, increase, decrease, reset };
}
