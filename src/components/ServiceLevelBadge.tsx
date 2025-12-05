import React from 'react';
import { Shield, Star, Zap } from 'lucide-react';
import { ServiceLevel } from '../types';

export default function ServiceLevelBadge({ level, size = 'sm' }: { level?: ServiceLevel, size?: 'sm' | 'md' }) {
  if (!level || level === 'basic') return null;

  const config = {
    pro: {
      color: 'bg-blue-100 text-blue-700 border-blue-200',
      icon: Star,
      label: 'PRO'
    },
    elite: {
      color: 'bg-purple-100 text-purple-700 border-purple-200',
      icon: Zap,
      label: 'ELITE'
    }
  };

  const { color, icon: Icon, label } = config[level];
  const sizeClass = size === 'sm' ? 'text-[10px] px-1.5 py-0.5' : 'text-xs px-2 py-1';
  const iconSize = size === 'sm' ? 10 : 12;

  return (
    <div className={`inline-flex items-center gap-1 rounded border font-bold uppercase tracking-wider ${color} ${sizeClass}`}>
      <Icon size={iconSize} fill="currentColor" />
      {label}
    </div>
  );
}
