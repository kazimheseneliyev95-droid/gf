import React from 'react';
import { Award, ShieldCheck, Sprout, ThumbsUp, Zap } from 'lucide-react';
import { Badge } from '../types';

const iconMap: any = {
  'Award': Award,
  'ShieldCheck': ShieldCheck,
  'Sprout': Sprout,
  'ThumbsUp': ThumbsUp,
  'Zap': Zap
};

export default function GamificationBadges({ badges }: { badges: Badge[] }) {
  if (!badges || badges.length === 0) return null;

  return (
    <div className="flex gap-2">
      {badges.map(badge => {
        const Icon = iconMap[badge.icon] || Award;
        return (
          <div key={badge.id} className="group relative">
            <div className="p-1.5 bg-yellow-50 text-yellow-600 rounded-full border border-yellow-200 hover:bg-yellow-100 transition-colors cursor-help">
              <Icon size={16} />
            </div>
            
            {/* Tooltip */}
            <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-32 bg-gray-900 text-white text-xs rounded py-1 px-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-10 text-center">
              <p className="font-bold">{badge.label}</p>
              <p className="text-[10px] text-gray-300">{badge.description}</p>
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
