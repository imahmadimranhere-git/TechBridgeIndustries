import { createContext, useCallback, useContext, useEffect, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { publicApi } from '../api/public.js';
import { formatMoney as formatMoneyBase } from '../utils/formatMoney.js';
import { initialsOf } from '../utils/initials.js';

const SettingsContext = createContext(null);

const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

const DEFAULT_BRANDING = {
  companyName: import.meta.env.VITE_APP_NAME || 'TechBridgeIndustries',
  tagline: '',
  brandPrimaryColor: '#1d4ed8',
  brandSecondaryColor: '#0f172a',
  currencySymbol: 'Rs',
  logoUrl: null,
  website: '',
  email: '',
  phone: '',
};

// White or dark text, whichever is readable on the brand colour
function contrastText(hex) {
  const value = hex.replace('#', '');
  const [r, g, b] = [0, 2, 4].map((start) => parseInt(value.slice(start, start + 2), 16) / 255);
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return luminance > 0.6 ? '#111827' : '#ffffff';
}

function applyBrandColors(primary, secondary) {
  const root = document.documentElement;
  if (HEX_COLOR.test(primary)) {
    root.style.setProperty('--color-brand', primary);
    root.style.setProperty('--color-brand-contrast', contrastText(primary));
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', primary);
  }
  if (HEX_COLOR.test(secondary)) root.style.setProperty('--color-brand-secondary', secondary);
}

// Uploaded logo, or a generated square with the initials in the brand colour
function applyFavicon(logoUrl, companyName, color) {
  let link = document.querySelector('link[rel~="icon"]');
  if (!link) {
    link = document.createElement('link');
    link.rel = 'icon';
    document.head.appendChild(link);
  }

  if (logoUrl) {
    link.href = logoUrl;
    return;
  }

  const fill = HEX_COLOR.test(color) ? color : '#1d4ed8';
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">` +
    `<rect width="64" height="64" rx="14" fill="${fill}"/>` +
    `<text x="32" y="41" text-anchor="middle" font-family="Arial, sans-serif" font-size="24" font-weight="700" fill="${contrastText(fill)}">${initialsOf(companyName)}</text>` +
    `</svg>`;
  link.href = `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

export function SettingsProvider({ children }) {
  const brandingQuery = useQuery({
    queryKey: ['branding'],
    queryFn: publicApi.getBranding,
    staleTime: 5 * 60 * 1000,
  });

  const branding = useMemo(() => ({ ...DEFAULT_BRANDING, ...(brandingQuery.data ?? {}) }), [brandingQuery.data]);

  useEffect(() => {
    applyBrandColors(branding.brandPrimaryColor, branding.brandSecondaryColor);
  }, [branding.brandPrimaryColor, branding.brandSecondaryColor]);

  useEffect(() => {
    applyFavicon(branding.logoUrl, branding.companyName, branding.brandPrimaryColor);
  }, [branding.logoUrl, branding.companyName, branding.brandPrimaryColor]);

  // formatMoney that already knows the currency symbol from Settings
  
  const formatMoney = useCallback(
    (minor, options = {}) => formatMoneyBase(minor, { symbol: branding.currencySymbol, ...options }),
    [branding.currencySymbol]
  );

  const value = useMemo(
    () => ({
      branding,
      isLoading: brandingQuery.isLoading,
      formatMoney,
      refreshBranding: brandingQuery.refetch,
    }),
    [branding, brandingQuery.isLoading, formatMoney, brandingQuery.refetch]
  );

  return <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>;
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) throw new Error('useSettings must be used inside <SettingsProvider>');
  return context;
}