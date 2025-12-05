import React, { useMemo } from 'react';
import { TrendingUp, DollarSign, Briefcase, Users } from 'lucide-react';
import { getLTVMetrics } from '../utils/advancedAnalytics';

export default function LTVDashboard() {
  const { workers, employers } = useMemo(() => getLTVMetrics(), []);

  const totalRevenue = workers.reduce((sum, w) => sum + w.totalEarned, 0);

  return (
    <div className="space-y-6 animate-in fade-in">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 text-green-600 rounded-lg"><DollarSign size={20} /></div>
            <h3 className="font-bold text-gray-700">Total Platform Volume</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{totalRevenue.toLocaleString()} ₼</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 text-blue-600 rounded-lg"><Briefcase size={20} /></div>
            <h3 className="font-bold text-gray-700">Active Earners</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{workers.filter(w => w.totalEarned > 0).length}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-purple-100 text-purple-600 rounded-lg"><Users size={20} /></div>
            <h3 className="font-bold text-gray-700">Active Spenders</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{employers.filter(e => e.totalSpent > 0).length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Workers LTV */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-blue-600" /> Top Workers by LTV
            </h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Worker</th>
                <th className="px-4 py-3">Jobs</th>
                <th className="px-4 py-3 text-right">Lifetime Earnings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workers.slice(0, 10).map((w, i) => (
                <tr key={w.username} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {i+1}. {w.username}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{w.jobsCount}</td>
                  <td className="px-4 py-3 text-right font-bold text-green-600">
                    {w.totalEarned.toLocaleString()} ₼
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Employers LTV */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <TrendingUp size={18} className="text-purple-600" /> Top Employers by Spend
            </h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
              <tr>
                <th className="px-4 py-3">Employer</th>
                <th className="px-4 py-3">Jobs</th>
                <th className="px-4 py-3 text-right">Lifetime Spend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employers.slice(0, 10).map((e, i) => (
                <tr key={e.username} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-900">
                    {i+1}. {e.username}
                  </td>
                  <td className="px-4 py-3 text-gray-500">{e.jobsCount}</td>
                  <td className="px-4 py-3 text-right font-bold text-blue-600">
                    {e.totalSpent.toLocaleString()} ₼
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
