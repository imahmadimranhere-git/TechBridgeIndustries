import { useEffect } from 'react';
import { useSettings } from '../context/SettingsContext.jsx';

/** Browser tab title: "Clients | TechBridgeIndustries" */
export function usePageTitle(title) {
  const { branding } = useSettings();

  useEffect(() => {
    document.title = title ? `${title} | ${branding.companyName}` : branding.companyName;
  }, [title, branding.companyName]);
}