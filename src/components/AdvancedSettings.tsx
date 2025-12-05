import React, { useState, useEffect } from 'react';
import { Settings, ToggleLeft, ToggleRight, Save, AlertTriangle } from 'lucide-react';
import { getAdminSettings, saveAdminSettings } from '../utils/featureFlags';
import { AdminSettings } from '../types';

export default function AdvancedSettings() {
  const [settings, setSettings] = useState<AdminSettings>(getAdminSettings());
  const [saved, setSaved] = useState(false);

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

  const handleSave = () => {
    saveAdminSettings(settings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
    // Force reload to apply changes cleanly across app
    window.location.reload();
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Settings className="text-blue-600" /> Advanced Features
            </h2>
            <p className="text-sm text-gray-500 mt-1">
              Toggle experimental and advanced modules. Changes require a refresh.
            </p>
          </div>
          <button 
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors"
          >
            <Save size={18} /> {saved ? 'Saved!' : 'Save Changes'}
          </button>
        </div>

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
        </div>

        <div className="mt-8 p-4 bg-amber-50 border border-amber-200 rounded-lg flex items-start gap-3">
          <AlertTriangle className="text-amber-600 flex-shrink-0" size={20} />
          <p className="text-sm text-amber-800">
            <strong>Note:</strong> Disabling a feature will hide all its UI elements and stop its calculations. 
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
