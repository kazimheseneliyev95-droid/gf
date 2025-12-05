import React, { useState, useEffect } from 'react';
import { Layers } from 'lucide-react';
import { JobPost, WorkerReview, JOB_STORAGE_KEY, REVIEW_STORAGE_KEY } from '../types';
import { computeCategoryPerformance } from '../utils/analytics';

export default function CategoryAnalytics() {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    const jobs = JSON.parse(localStorage.getItem(JOB_STORAGE_KEY) || '[]');
    const reviews = JSON.parse(localStorage.getItem(REVIEW_STORAGE_KEY) || '[]');
    setData(computeCategoryPerformance(jobs, reviews));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
        <Layers className="text-indigo-600" /> Category Performance
      </h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-3">Category</th>
              <th className="px-6 py-3">Total Jobs</th>
              <th className="px-6 py-3">Offer Rate</th>
              <th className="px-6 py-3">Avg First Offer</th>
              <th className="px-6 py-3">Avg Rating</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {data.map(cat => {
              const offerRate = cat.jobCount > 0 ? (cat.jobsWithOffer / cat.jobCount) * 100 : 0;
              return (
                <tr key={cat.category} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-bold text-gray-900">{cat.category}</td>
                  <td className="px-6 py-4">{cat.jobCount}</td>
                  <td className="px-6 py-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold ${
                      offerRate < 50 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                    }`}>
                      {offerRate.toFixed(0)}%
                    </span>
                  </td>
                  <td className="px-6 py-4 text-gray-600">
                    {cat.avgFirstOfferMinutes ? `${cat.avgFirstOfferMinutes}m` : '-'}
                  </td>
                  <td className="px-6 py-4 font-bold text-amber-500">
                    {cat.avgRating ? cat.avgRating.toFixed(1) : '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
