import { ADMIN_SETTINGS_KEY, AdminSettings } from '../types';

const DEFAULT_SETTINGS: AdminSettings = {
  features: {
    workerComparisonView: false,
    workerRiskAlerts: false,
    smartAvailabilityMatching: false,
    locationDistanceMatching: false,
    premiumBadges: false,
    behaviorMonitoring: false,
    ltvAnalytics: false,
    auctionMode: false
  }
};

export const getAdminSettings = (): AdminSettings => {
  const str = localStorage.getItem(ADMIN_SETTINGS_KEY);
  if (!str) return DEFAULT_SETTINGS;
  try {
    const settings = JSON.parse(str);
    // Merge with defaults in case new keys were added
    return {
      features: { ...DEFAULT_SETTINGS.features, ...settings.features }
    };
  } catch (e) {
    return DEFAULT_SETTINGS;
  }
};

export const saveAdminSettings = (settings: AdminSettings) => {
  localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings));
  // Force a re-render or reload might be needed in a real app, 
  // but for this demo, React state updates or page refreshes will handle it.
};

export const isFeatureEnabled = (feature: keyof AdminSettings['features']): boolean => {
  const settings = getAdminSettings();
  return settings.features[feature];
};
