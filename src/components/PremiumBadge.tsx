import React from 'react';
import { Crown } from 'lucide-react';
import { isPremiumWorker, isPremiumEmployer } from '../utils/advancedAnalytics';
import { isFeatureEnabled } from '../utils/featureFlags';

interface Props {
  username: string;
  role: 'worker' | 'employer';
  size?: 'sm' | 'md';
}

export default function PremiumBadge({ username, role, size = 'sm' }: Props) {
  if (!isFeatureEnabled('premiumBadges')) return null;

  const isPremium = role === 'worker' ? isPremiumWorker(username) : isPremiumEmployer(username);

  if (!isPremium) return null;

  return (
    <div className={`inline-flex items-center gap-1 bg-gradient-to-r from-amber-100 to-yellow-100 border border-amber-200 text-amber-800 rounded-full font-bold shadow-sm ${
      size === 'sm' ? 'px-1.5 py-0.5 text-[10px]' : 'px-3 py-1 text-xs'
    }`}>
      <Crown size={size === 'sm' ? 10 : 14} fill="currentColor" />
      <span>PREMIUM</span>
    </div>
  );
}
