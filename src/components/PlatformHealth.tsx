import React, { useState, useEffect } from 'react';
import { Activity, ArrowRight } from 'lucide-react';
import { JobPost, JOB_STORAGE_KEY } from '../types';
import { getFunnelStats, filterByDate } from '../utils/analytics';

export default function PlatformHealth() {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [range, setRange] = useState<'7d' | '30d' | '90d'>('30d');

  useEffect(() => {
    const str = localStorage.getItem(JOB_STORAGE_KEY);
    if (str) setJobs(JSON.parse(str));
  }, []);

  const filtered = filterByDate(jobs, range);
  const stats = getFunnelStats(filtered);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Activity className="text-blue-600" /> Platform Health Funnel
        </h2>
        <select 
          value={range} 
          onChange={(e) => setRange(e.target.value as any)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm"
        >
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="90d">Last 90 Days</option>
        </select>
      </div>

      <div className="grid grid-cols-4 gap-4">
        <MetricCard label="Posted" value={stats.posted} color="bg-gray-100" />
        <MetricCard label="With Offers" value={stats.withOffers} sub={`${stats.conversion.toOffers.toFixed(0)}%`} color="bg-blue-50 text-blue-700" />
        <MetricCard label="Accepted" value={stats.accepted} sub={`${stats.conversion.toAssigned.toFixed(0)}%`} color="bg-purple-50 text-purple-700" />
        <MetricCard label="Completed" value={stats.completed} sub={`${stats.conversion.toCompleted.toFixed(0)}%`} color="bg-green-50 text-green-700" />
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h3 className="font-bold text-gray-800 mb-4">Conversion Visualization</h3>
        <div className="flex items-center gap-2">
          <Bar percent={100} label="Posted" color="bg-gray-300" />
          <ArrowRight className="text-gray-300" size={20} />
          <Bar percent={stats.conversion.toOffers} label="Got Offers" color="bg-blue-500" />
          <ArrowRight className="text-gray-300" size={20} />
          <Bar percent={(stats.accepted / (stats.posted || 1)) * 100} label="Accepted" color="bg-purple-500" />
          <ArrowRight className="text-gray-300" size={20} />
          <Bar percent={stats.conversion.overall} label="Completed" color="bg-green-500" />
        </div>
      </div>
    </div>
  );
}

const MetricCard = ({ label, value, sub, color }: any) => (
  <div className={`p-4 rounded-xl border border-transparent ${color}`}>
    <p className="text-xs font-bold uppercase opacity-70">{label}</p>
    <p className="text-2xl font-bold">{value}</p>
    {sub && <p className="text-xs font-medium mt-1">Conv: {sub}</p>}
  </div>
);

const Bar = ({ percent, label, color }: any) => (
  <div className="flex-1">
    <div className="h-24 relative bg-gray-50 rounded-t-lg w-full flex items-end justify-center">
      <div className={`w-full mx-2 rounded-t ${color} transition-all duration-500`} style={{ height: `${Math.max(percent, 5)}%` }}></div>
    </div>
    <div className="text-center mt-2">
      <p className="text-xs font-bold text-gray-700">{label}</p>
      <p className="text-xs text-gray-500">{percent.toFixed(0)}%</p>
    </div>
  </div>
);
