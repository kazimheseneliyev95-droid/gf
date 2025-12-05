import React, { useState, useEffect } from 'react';
import { AlertTriangle, ShieldAlert, Search, Filter } from 'lucide-react';
import { getAdminRiskMetrics } from '../utils/advancedAnalytics';
import { UserRiskMetrics } from '../types';

export default function RiskMonitor() {
  const [metrics, setMetrics] = useState<UserRiskMetrics[]>([]);
  const [filter, setFilter] = useState<'all' | 'high' | 'medium'>('high');

  useEffect(() => {
    const data = getAdminRiskMetrics();
    setMetrics(data.sort((a, b) => b.riskScore - a.riskScore));
  }, []);

  const filtered = metrics.filter(m => {
    if (filter === 'all') return true;
    if (filter === 'high') return m.riskLevel === 'high';
    return m.riskLevel === 'medium' || m.riskLevel === 'high';
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ShieldAlert className="text-red-600" /> Risk Monitor
        </h2>
        <div className="flex gap-2">
          <select 
            value={filter} 
            onChange={(e) => setFilter(e.target.value as any)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
          >
            <option value="high">High Risk Only</option>
            <option value="medium">Medium & High</option>
            <option value="all">All Users</option>
          </select>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase text-xs">
            <tr>
              <th className="px-6 py-3">User</th>
              <th className="px-6 py-3">Risk Score</th>
              <th className="px-6 py-3">Disputes (30d)</th>
              <th className="px-6 py-3">Rating</th>
              <th className="px-6 py-3">Completed</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {filtered.map(m => (
              <tr key={m.userId} className="hover:bg-gray-50">
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{m.userId}</div>
                  <div className="text-xs text-gray-500 capitalize">{m.role}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                    m.riskLevel === 'high' ? 'bg-red-100 text-red-700' :
                    m.riskLevel === 'medium' ? 'bg-orange-100 text-orange-700' :
                    'bg-green-100 text-green-700'
                  }`}>
                    {m.riskScore} ({m.riskLevel.toUpperCase()})
                  </span>
                </td>
                <td className="px-6 py-4 text-red-600 font-bold">
                  {m.disputesLast30d > 0 ? m.disputesLast30d : '-'}
                </td>
                <td className="px-6 py-4">
                  {m.avgRating ? m.avgRating.toFixed(1) : 'N/A'}
                </td>
                <td className="px-6 py-4">
                  {m.totalCompletedJobs}
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                  No flagged accounts found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
