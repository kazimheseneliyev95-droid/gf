import React, { useState } from 'react';
import { Settings, ToggleLeft, ToggleRight, Save, AlertTriangle, BarChart2 } from 'lucide-react';
import { getAdminSettings, saveAdminSettings } from '../utils/featureFlags';
import { AdminSettings } from '../types';

export default function AdvancedSettings() {
  const [settings, setSettings] = useState<AdminSettings>(getAdminSettings());
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleFeature = (key: keyof AdminSettings['features']) => {
    setSettings(prev => ({
      ...prev,
      features: {
        ...prev.features,
        [key]: !prev.features[key]
      }
    }));
    setSaved(false);
  };

  const updateAnalyticsConfig = (key: keyof NonNullable<AdminSettings['analyticsConfig']>, value: any) => {
    setSettings(prev => ({
      ...prev,
      analyticsConfig: {
        priceDeviationThreshold: 15,
        slowResponseHours: 24,
        lowConversionThreshold: 30,
        enableExperimentalCharts: false,
        ...(prev.analyticsConfig || {}),
        [key]: value
      }
    }));
    setSaved(false);
  };

  const handleSave = () => {
    try {
      setError(null);
      saveAdminSettings(settings);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
      // Removed window.location.reload() to prevent white screen crash
    } catch (err) {
      console.error("Failed to save settings:", err);
      setError("Failed to save settings. Please try again.");
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-6 gap-4">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="text-blue-600" /> Advanced Features
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Toggle experimental and advanced modules. Changes apply immediately.
            </p>
          </div>
          <button 
            onClick={handleSave}
            className={`flex items-center gap-2 px-6 py-2 font-bold rounded-lg transition-colors ${
              saved 
                ? 'bg-green-600 hover:bg-green-700 text-white' 
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            <Save size={18} /> {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
            <AlertTriangle size={16} /> {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FeatureToggle 
            label="Worker Comparison View" 
            desc="Allows employers to compare offers side-by-side in a table."
            isOn={settings.features.workerComparisonView}
            onToggle={() => toggleFeature('workerComparisonView')}
          />
          <FeatureToggle 
            label="Worker Risk Alerts" 
            desc="Warns employers about potentially unreliable workers."
            isOn={settings.features.workerRiskAlerts}
            onToggle={() => toggleFeature('workerRiskAlerts')}
          />
          <FeatureToggle 
            label="Smart Availability Matching" 
            desc="Prioritizes available workers in offer lists."
            isOn={settings.features.smartAvailabilityMatching}
            onToggle={() => toggleFeature('smartAvailabilityMatching')}
          />
          <FeatureToggle 
            label="Location & Distance Matching" 
            desc="Shows approximate distance and sorts by proximity."
            isOn={settings.features.locationDistanceMatching}
            onToggle={() => toggleFeature('locationDistanceMatching')}
          />
          <FeatureToggle 
            label="Premium Badges" 
            desc="Highlights top-performing workers and employers."
            isOn={settings.features.premiumBadges}
            onToggle={() => toggleFeature('premiumBadges')}
          />
          <FeatureToggle 
            label="Behavioral Monitoring" 
            desc="Tracks and displays behavioral scores."
            isOn={settings.features.behaviorMonitoring}
            onToggle={() => toggleFeature('behaviorMonitoring')}
          />
          <FeatureToggle 
            label="LTV Analytics" 
            desc="Adds Lifetime Value dashboard to Admin Panel."
            isOn={settings.features.ltvAnalytics}
            onToggle={() => toggleFeature('ltvAnalytics')}
          />
          <FeatureToggle 
            label="Open Bidding (Auction Mode)" 
            desc="Allows employers to create jobs where workers can see the lowest bid and compete."
            isOn={settings.features.auctionMode}
            onToggle={() => toggleFeature('auctionMode')}
          />
        </div>

        {/* Analytics Configuration Section */}
        <div className="mt-8 pt-8 border-t border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
            <BarChart2 className="text-purple-600" size={20} /> Analytics Configuration
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-xs font-bold text-gray-700 mb-2">Price Deviation Alert (%)</label>
              <input 
                type="number" 
                value={settings.analyticsConfig?.priceDeviationThreshold ?? 15}
                onChange={(e) => updateAnalyticsConfig('priceDeviationThreshold', Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Triggers warning if final price deviates from budget by this %.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-xs font-bold text-gray-700 mb-2">Slow Response Threshold (Hours)</label>
              <input 
                type="number" 
                value={settings.analyticsConfig?.slowResponseHours ?? 24}
                onChange={(e) => updateAnalyticsConfig('slowResponseHours', Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Flags categories where first offer takes longer than this.</p>
            </div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <label className="block text-xs font-bold text-gray-700 mb-2">Low Conversion Alert (%)</label>
              <input 
                type="number" 
                value={settings.analyticsConfig?.lowConversionThreshold ?? 30}
                onChange={(e) => updateAnalyticsConfig('lowConversionThreshold', Number(e.target.value))}
                className="w-full p-2 border border-gray-300 rounded text-sm"
              />
              <p className="text-xs text-gray-500 mt-1">Warns if offer rate drops below this percentage.</p>
            </div>
          </div>
        </div>

        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> Disabling a feature will hide all its UI elements and stop its calculations immediately. 
            Data stored (like location or badges) will remain in the database but won't be visible.
          </p>
        </div>
      </div>
    </div>
  );
}

const FeatureToggle = ({ label, desc, isOn, onToggle }: any) => (
  <div 
    onClick={onToggle}
    className={`p-4 rounded-lg border cursor-pointer transition-all flex justify-between items-center ${
      isOn ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
    }`}
  >
    <div>
      <h3 className={`font-bold ${isOn ? 'text-blue-800' : 'text-gray-700'}`}>{label}</h3>
      <p className="text-xs text-gray-500 mt-1">{desc}</p>
    </div>
    <div className={isOn ? 'text-blue-600' : 'text-gray-400'}>
      {isOn ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
    </div>
  </div>
);
