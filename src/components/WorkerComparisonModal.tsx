import React from 'react';
import { X, CheckCircle, AlertTriangle, Star, Clock } from 'lucide-react';
import { JobPost, JobApplication } from '../types';
import { calculateWorkerQuality } from '../utils/advancedFeatures';
import { isWorkerAvailable, getDistance, isPremiumWorker } from '../utils/advancedAnalytics';
import { isFeatureEnabled } from '../utils/featureFlags';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  job: JobPost;
  applications: JobApplication[];
}

export default function WorkerComparisonModal({ isOpen, onClose, job, applications }: Props) {
  if (!isOpen) return null;

  const showRisk = isFeatureEnabled('workerRiskAlerts');
  const showAvail = isFeatureEnabled('smartAvailabilityMatching');
  const showLoc = isFeatureEnabled('locationDistanceMatching');
  const showPremium = isFeatureEnabled('premiumBadges');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] flex flex-col animate-in zoom-in-95">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Compare Workers</h2>
            <p className="text-sm text-gray-500">Comparing {applications.length} offers for "{job.title}"</p>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} /></button>
        </div>

        <div className="overflow-auto p-6">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-gray-100 text-sm text-gray-500 uppercase">
                <th className="p-4">Worker</th>
                <th className="p-4">Price</th>
                <th className="p-4">Quality Score</th>
                {showAvail && <th className="p-4">Availability</th>}
                {showLoc && <th className="p-4">Distance</th>}
                <th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="text-sm">
              {applications.map(app => {
                const quality = calculateWorkerQuality(app.workerUsername);
                const isAvail = isWorkerAvailable(app.workerUsername);
                const dist = getDistance(app.workerUsername, job.address); // Using username as mock loc seed
                const isPrem = isPremiumWorker(app.workerUsername);

                return (
                  <tr key={app.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="p-4">
                      <div className="font-bold text-gray-900 flex items-center gap-2">
                        {app.workerUsername}
                        {showPremium && isPrem && (
                          <span className="bg-amber-100 text-amber-700 text-[10px] px-1.5 py-0.5 rounded border border-amber-200">PRO</span>
                        )}
                      </div>
                      {showRisk && quality < 40 && (
                        <div className="text-xs text-red-600 flex items-center gap-1 mt-1">
                          <AlertTriangle size={12} /> High Risk
                        </div>
                      )}
                    </td>
                    <td className="p-4 font-mono font-bold text-blue-600">{app.offeredPrice} ₼</td>
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                          <div className={`h-full ${quality > 70 ? 'bg-green-500' : 'bg-yellow-500'}`} style={{width: `${quality}%`}}></div>
                        </div>
                        <span className="font-bold">{quality}</span>
                      </div>
                    </td>
                    {showAvail && (
                      <td className="p-4">
                        {isAvail ? (
                          <span className="text-green-600 flex items-center gap-1 text-xs font-bold bg-green-50 px-2 py-1 rounded w-fit">
                            <CheckCircle size={12} /> Available
                          </span>
                        ) : (
                          <span className="text-gray-400 flex items-center gap-1 text-xs">
                            <Clock size={12} /> Busy
                          </span>
                        )}
                      </td>
                    )}
                    {showLoc && (
                      <td className="p-4 text-gray-600">
                        ~{dist} km
                      </td>
                    )}
                    <td className="p-4">
                      <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                        app.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {app.status}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
