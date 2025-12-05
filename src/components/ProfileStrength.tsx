import React from 'react';
import { calculateProfileStrength } from '../utils/advancedFeatures';

export default function ProfileStrength({ username }: { username: string }) {
  const strength = calculateProfileStrength(username);
  
  let color = 'bg-red-500';
  let text = 'Weak';
  if (strength > 40) { color = 'bg-yellow-500'; text = 'Good'; }
  if (strength > 80) { color = 'bg-green-500'; text = 'Strong'; }

  return (
    <div className="w-full max-w-xs">
      <div className="flex justify-between items-center mb-1">
        <span className="text-xs font-semibold text-gray-600">Profile Strength</span>
        <span className="text-xs text-gray-500">{text} ({strength}%)</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-1.5">
        <div 
          className={`h-1.5 rounded-full transition-all duration-500 ${color}`} 
          style={{ width: `${strength}%` }}
        ></div>
      </div>
      {strength < 100 && (
        <p className="text-[10px] text-blue-600 mt-1 cursor-pointer hover:underline">
          Complete your profile to rank higher
        </p>
      )}
    </div>
  );
}
