import React from 'react';
import { Activity } from 'lucide-react';
import { getBehaviorMetrics } from '../utils/advancedAnalytics';
import { isFeatureEnabled } from '../utils/featureFlags';

export default function BehaviorScore({ username, role }: { username: string, role: 'worker' | 'employer' }) {
  if (!isFeatureEnabled('behaviorMonitoring')) return null;

  const metrics = getBehaviorMetrics(username, role);

  return (
    <div className="flex items-center gap-2 bg-gray-50 px-2 py-1 rounded border border-gray-200" title="Behavior Score">
      <Activity size={12} className="text-blue-500" />
      <span className="text-xs font-bold text-gray-700">{metrics.score.toFixed(0)}</span>
    </div>
  );
}
