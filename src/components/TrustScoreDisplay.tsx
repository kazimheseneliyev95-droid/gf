import React, { useState } from 'react';
import { ShieldCheck, Info } from 'lucide-react';
import { calculateTrustScore } from '../utils/advancedFeatures';
import { UserRole } from '../types';

interface Props {
  username: string;
  role: UserRole;
}

export default function TrustScoreDisplay({ username, role }: Props) {
  const [showTooltip, setShowTooltip] = useState(false);
  const { score, breakdown } = calculateTrustScore(username, role);

  let colorClass = 'text-red-600 bg-red-50 border-red-100';
  let label = 'Low';
  if (score >= 40) { colorClass = 'text-yellow-600 bg-yellow-50 border-yellow-100'; label = 'Fair'; }
  if (score >= 60) { colorClass = 'text-blue-600 bg-blue-50 border-blue-100'; label = 'Good'; }
  if (score >= 80) { colorClass = 'text-green-600 bg-green-50 border-green-100'; label = 'Excellent'; }

  return (
    <div className="relative inline-block">
      <button 
        onClick={() => setShowTooltip(!showTooltip)}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-bold transition-colors cursor-help ${colorClass}`}
      >
        <ShieldCheck size={14} />
        <span>Trust: {score}</span>
      </button>

      {showTooltip && (
        <div className="absolute top-full mt-2 right-0 w-64 bg-white rounded-xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in zoom-in-95">
          <div className="flex justify-between items-center mb-2">
            <h4 className="font-bold text-gray-900 text-sm">Trust Score</h4>
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${colorClass}`}>
              {label}
            </span>
          </div>
          <p className="text-xs text-gray-500 mb-3">
            Higher score means a more reliable partner.
          </p>
          <div className="space-y-1.5 mb-3 border-b border-gray-100 pb-2">
            {breakdown.map((item, i) => (
              <div key={i} className="text-xs flex justify-between items-center">
                <span className="text-gray-600">{item.split(':')[0]}</span>
                <span className={`font-mono font-bold ${item.includes('-') ? 'text-red-500' : 'text-green-600'}`}>
                  {item.split(':')[1]}
                </span>
              </div>
            ))}
          </div>
          <div className="text-[10px] text-gray-500">
            <strong>How to improve:</strong>
            <ul className="list-disc list-inside mt-1 space-y-0.5 text-gray-400">
              <li>Complete jobs on time</li>
              <li>Respond quickly to messages</li>
              <li>Maintain good ratings</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
