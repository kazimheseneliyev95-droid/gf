import React, { useState } from 'react';
import { CheckCircle, Circle, Info } from 'lucide-react';
import { getProfileStrengthDetails } from '../utils/advancedFeatures';

export default function ProfileStrength({ username }: { username: string }) {
  const { score, checks } = getProfileStrengthDetails(username);
  const [showChecklist, setShowChecklist] = useState(false);
  
  let color = 'bg-red-500';
  let text = 'Weak';
  if (score > 30) { color = 'bg-yellow-500'; text = 'Good'; }
  if (score > 70) { color = 'bg-green-500'; text = 'Strong'; }

  return (
    <div className="w-full max-w-xs relative">
      <div className="flex justify-between items-center mb-1">
        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-gray-600">Profile Strength</span>
          <button 
            onClick={() => setShowChecklist(!showChecklist)}
            className="text-gray-400 hover:text-blue-600"
            title="View details"
          >
            <Info size={12} />
          </button>
        </div>
        <span className={`text-xs font-bold ${
          score > 70 ? 'text-green-600' : score > 30 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          {text} ({score}%)
        </span>
      </div>
      
      <div 
        className="w-full bg-gray-200 rounded-full h-2 cursor-pointer"
        onClick={() => setShowChecklist(!showChecklist)}
        title="Click to see how to improve"
      >
        <div 
          className={`h-2 rounded-full transition-all duration-500 ${color}`} 
          style={{ width: `${score}%` }}
        ></div>
      </div>

      {score < 100 && !showChecklist && (
        <p 
          className="text-[10px] text-blue-600 mt-1 cursor-pointer hover:underline"
          onClick={() => setShowChecklist(true)}
        >
          Complete your profile to rank higher
        </p>
      )}

      {showChecklist && (
        <div className="mt-3 bg-white p-3 rounded-lg border border-gray-200 shadow-sm text-xs absolute z-10 w-full left-0">
          <p className="font-bold text-gray-700 mb-2">Improve your profile:</p>
          <ul className="space-y-1.5">
            <li className={`flex items-center gap-2 ${checks.hasSkills ? 'text-green-600 line-through opacity-70' : 'text-gray-600'}`}>
              {checks.hasSkills ? <CheckCircle size={12} /> : <Circle size={12} />}
              Add at least one skill
            </li>
            <li className={`flex items-center gap-2 ${checks.hasBio ? 'text-green-600 line-through opacity-70' : 'text-gray-600'}`}>
              {checks.hasBio ? <CheckCircle size={12} /> : <Circle size={12} />}
              Write a bio (40+ chars)
            </li>
            <li className={`flex items-center gap-2 ${checks.hasLocation ? 'text-green-600 line-through opacity-70' : 'text-gray-600'}`}>
              {checks.hasLocation ? <CheckCircle size={12} /> : <Circle size={12} />}
              Set your city/region
            </li>
            <li className={`flex items-center gap-2 ${checks.hasActivity ? 'text-green-600 line-through opacity-70' : 'text-gray-600'}`}>
              {checks.hasActivity ? <CheckCircle size={12} /> : <Circle size={12} />}
              Complete jobs or get rated
            </li>
          </ul>
          <button 
            onClick={() => setShowChecklist(false)}
            className="w-full mt-2 text-[10px] text-gray-400 hover:text-gray-600"
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
