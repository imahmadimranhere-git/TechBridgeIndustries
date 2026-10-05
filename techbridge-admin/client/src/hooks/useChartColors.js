import { useEffect, useState } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';

const FALLBACKS = {
  brand: '#1d4ed8',
  info: '#2563eb',
  warning: '#ea580c',
  success: '#16a34a',
  danger: '#dc2626',
  purple: '#7c3aed',
};

function readColors() {
  const styles = getComputedStyle(document.documentElement);
  const read = (name) => styles.getPropertyValue(`--color-${name}`).trim() || FALLBACKS[name];
  return {
    brand: read('brand'),
    info: read('info'),
    warning: read('warning'),
    success: read('success'),
    danger: read('danger'),
    purple: read('purple'),
    grid: '#eef0f3',
    text: '#6b7280',
  };
}

/** Chart colours read from the same CSS variables as Tailwind, so charts always match the theme */
export function useChartColors() {
  const { branding } = useSettings();
  const [colors, setColors] = useState(readColors);

  useEffect(() => {
    // Wait one frame so SettingsContext has applied the new brand colour first
    const frame = requestAnimationFrame(() => setColors(readColors()));
    return () => cancelAnimationFrame(frame);
  }, [branding.brandPrimaryColor]);

  return colors;
}