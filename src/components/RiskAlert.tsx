import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { getWorkerRisk } from '../utils/advancedAnalytics';
import { isFeatureEnabled } from '../utils/featureFlags';

export default function RiskAlert({ username }: { username: string }) {
  if (!isFeatureEnabled('workerRiskAlerts')) return null;

  const { isHighRisk, factors } = getWorkerRisk(username);

  if (!isHighRisk) return null;

  return (
    <div className="mt-2 bg-red-50 border border-red-100 rounded-lg p-2 flex items-start gap-2">
      <AlertTriangle className="text-red-600 flex-shrink-0 mt-0.5" size={14} />
      <div>
        <p className="text-xs font-bold text-red-700">Caution Recommended</p>
        <ul className="text-[10px] text-red-600 list-disc list-inside">
          {factors.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      </div>
    </div>
  );
}
