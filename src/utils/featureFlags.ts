import { ADMIN_SETTINGS_KEY, AdminSettings } from '../types';

// Event name for real-time updates
export const ADMIN_SETTINGS_EVENT = 'admin_settings_updated';

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
  // Dispatch event so components can re-render immediately without page reload
  window.dispatchEvent(new Event(ADMIN_SETTINGS_EVENT));
};

export const isFeatureEnabled = (feature: keyof AdminSettings['features']): boolean => {
  const settings = getAdminSettings();
  return settings.features[feature];
};
