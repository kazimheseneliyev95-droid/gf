import React, { useState, useMemo } from 'react';
import { 
  Users, Briefcase, CheckCircle, Star, TrendingUp, 
  Filter, PieChart, Award, AlertCircle, Database, 
  ArrowDown, DollarSign, Clock, Activity, Layers
} from 'lucide-react';
import { 
  User, JobPost, WorkerReview, JobMessage, Notification, JobCategory, JOB_CATEGORIES 
} from '../types';
import { 
  filterByDate, getJobsByMonth, getOffersByCategory, getRatingsDistribution,
  getWorkerLeaderboard, getEmployerLeaderboard, getFunnelStats, getPricingAnalytics, getTimeAnalytics
} from '../utils/analytics';

interface AdminAnalyticsProps {
  users: User[];
  jobs: JobPost[];
  reviews: WorkerReview[];
  messages: JobMessage[];
  notifications: Notification[];
}

type DateFilter = '7d' | '30d' | '90d' | 'all';
type AnalyticsTab = 'dashboard' | 'research';

export default function AdminAnalytics({ users, jobs, reviews, messages, notifications }: AdminAnalyticsProps) {
  // --- State ---
  const [dateRange, setDateRange] = useState<DateFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | 'All'>('All');
  const [activeTab, setActiveTab] = useState<AnalyticsTab>('dashboard');

  // --- Filtered Data ---
  const filteredJobs = useMemo(() => {
    let data = filterByDate(jobs, dateRange);
    if (selectedCategory !== 'All') {
      data = data.filter(j => j.category === selectedCategory);
    }
    return data;
  }, [jobs, dateRange, selectedCategory]);

  const filteredReviews = useMemo(() => filterByDate(reviews, dateRange), [reviews, dateRange]);
  
  // --- Metrics ---
  const funnel = useMemo(() => getFunnelStats(filteredJobs), [filteredJobs]);
  const pricing = useMemo(() => getPricingAnalytics(filteredJobs), [filteredJobs]);
  const timeStats = useMemo(() => getTimeAnalytics(filteredJobs), [filteredJobs]);
  
  const workerLeaderboard = useMemo(() => getWorkerLeaderboard(users, filteredJobs, reviews), [users, filteredJobs, reviews]);
  const employerLeaderboard = useMemo(() => getEmployerLeaderboard(users, filteredJobs, reviews), [users, filteredJobs, reviews]);

  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const avgRating = filteredReviews.length > 0 
      ? (filteredReviews.reduce((sum, r) => sum + r.rating, 0) / filteredReviews.length).toFixed(1)
      : 'N/A';

    return { totalUsers, avgRating, totalReviews: filteredReviews.length };
  }, [users, filteredReviews]);

  // --- Charts Data ---
  const jobsOverTime = useMemo(() => getJobsByMonth(filteredJobs), [filteredJobs]);
  const categoryStats = useMemo(() => getOffersByCategory(filteredJobs), [filteredJobs]);
  const ratingsDist = useMemo(() => getRatingsDistribution(filteredReviews), [filteredReviews]);

  // --- Insights Generator ---
  const insights = useMemo(() => {
    const list = [];
    if (funnel.conversion.toOffers < 50) list.push(`Low offer rate: Only ${funnel.conversion.toOffers.toFixed(0)}% of jobs receive offers.`);
    if (funnel.conversion.toCompleted > 80) list.push("High completion rate: Once assigned, jobs are very likely to complete.");
    
    const highPriceCat = pricing.find(p => p.avgDeltaPercent > 10);
    if (highPriceCat) list.push(`Workers are charging >10% above budget in ${highPriceCat.category}.`);
    
    const lowPriceCat = pricing.find(p => p.avgDeltaPercent < -10);
    if (lowPriceCat) list.push(`Workers are undercutting budgets in ${lowPriceCat.category} by >10%.`);

    if (timeStats.avgTimeToFirstOfferHours > 24) list.push("Slow market: Avg time to first offer is over 24 hours.");

    return list;
  }, [funnel, pricing, timeStats]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      
      {/* 1. Header & Controls */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 justify-between items-center sticky top-0 z-10">
        <div className="flex items-center gap-4">
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'dashboard' ? 'bg-white text-blue-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Dashboard
            </button>
            <button
              onClick={() => setActiveTab('research')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                activeTab === 'research' ? 'bg-white text-purple-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Deep Research
            </button>
          </div>
        </div>
        
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2 text-gray-500 text-sm">
            <Filter size={16} />
          </div>
          <select 
            value={dateRange} 
            onChange={(e) => setDateRange(e.target.value as DateFilter)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="90d">Last 90 Days</option>
            <option value="all">All Time</option>
          </select>

          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value as JobCategory | 'All')}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="All">All Categories</option>
            {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
        </div>
      </div>

      {/* === TAB: DASHBOARD === */}
      {activeTab === 'dashboard' && (
        <div className="space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard icon={Briefcase} label="Active Jobs" value={filteredJobs.length} subtext={`${funnel.conversion.overall.toFixed(0)}% Completion Rate`} color="blue" />
            <KPICard icon={Activity} label="Conversion" value={`${funnel.conversion.toAssigned.toFixed(0)}%`} subtext="Offers -> Assigned" color="purple" />
            <KPICard icon={Clock} label="Avg Response" value={`${timeStats.avgTimeToFirstOfferHours.toFixed(1)}h`} subtext="Time to first offer" color="green" />
            <KPICard icon={Star} label="Satisfaction" value={metrics.avgRating} subtext={`${metrics.totalReviews} Reviews`} color="amber" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Funnel Chart */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-1">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Layers size={18} className="text-blue-600" /> Conversion Funnel
              </h3>
              <div className="space-y-4">
                <FunnelStep label="Jobs Posted" value={funnel.posted} percent={100} color="bg-blue-100 text-blue-700" />
                <div className="flex justify-center"><ArrowDown size={16} className="text-gray-300" /></div>
                <FunnelStep label="With Offers" value={funnel.withOffers} percent={funnel.conversion.toOffers} color="bg-purple-100 text-purple-700" />
                <div className="flex justify-center"><ArrowDown size={16} className="text-gray-300" /></div>
                <FunnelStep label="Assigned" value={funnel.assigned} percent={funnel.conversion.toAssigned} color="bg-indigo-100 text-indigo-700" />
                <div className="flex justify-center"><ArrowDown size={16} className="text-gray-300" /></div>
                <FunnelStep label="Completed" value={funnel.completed} percent={funnel.conversion.toCompleted} color="bg-green-100 text-green-700" />
              </div>
            </div>

            {/* Charts Area */}
            <div className="lg:col-span-2 space-y-6">
              {/* Jobs Trend */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <TrendingUp size={18} className="text-blue-600" /> Jobs Trend
                </h3>
                <div className="h-48 flex items-end justify-between gap-2">
                  {(() => {
                    // Calculate max outside the loop for O(N) instead of O(N^2)
                    const max = Math.max(...jobsOverTime.map(d => d.count), 1);
                    return jobsOverTime.map((item, idx) => {
                      const height = (item.count / max) * 100;
                      return (
                        <div key={idx} className="flex flex-col items-center gap-2 flex-1 group relative">
                          <div className="absolute bottom-full mb-2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                            {item.count} Jobs
                          </div>
                          <div 
                            className="w-full bg-blue-100 hover:bg-blue-500 transition-all rounded-t-md"
                            style={{ height: `${height}%`, minHeight: '4px' }}
                          ></div>
                          <span className="text-[10px] text-gray-500 truncate w-full text-center">{item.name}</span>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              {/* Category Performance */}
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                  <PieChart size={18} className="text-purple-600" /> Category Breakdown
                </h3>
                <div className="space-y-3">
                  {categoryStats.slice(0, 5).map((cat) => (
                    <div key={cat.category}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="font-medium text-gray-700">{cat.category}</span>
                        <span className="text-gray-500">{cat.offerCount} Offers</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500" 
                          style={{ width: `${Math.min((cat.offerCount / (categoryStats[0]?.offerCount || 1)) * 100, 100)}%` }}
                        ></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* === TAB: DEEP RESEARCH === */}
      {activeTab === 'research' && (
        <div className="space-y-8">
          
          {/* 1. Schema Visualization */}
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Database size={18} className="text-gray-500" /> Analytics Schema & Data Models
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <SchemaCard title="Users" fields={['username', 'role', 'isActive']} count={users.length} color="blue" />
              <SchemaCard title="Jobs" fields={['title', 'budget', 'status', 'category']} count={jobs.length} color="purple" />
              <SchemaCard title="Applications" fields={['worker', 'price', 'status']} count={funnel.withOffers} color="indigo" />
              <SchemaCard title="Reviews" fields={['rating', 'comment', 'jobId']} count={reviews.length} color="amber" />
              <SchemaCard title="Messages" fields={['sender', 'text', 'isRead']} count={messages.length} color="green" />
            </div>
          </div>

          {/* 2. Automated Insights */}
          <div className="bg-gradient-to-r from-blue-50 to-indigo-50 p-6 rounded-xl border border-blue-100">
            <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
              <AlertCircle size={20} /> Automated Intelligence
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {insights.length > 0 ? (
                insights.map((text, idx) => (
                  <div key={idx} className="flex items-start gap-3 bg-white/60 p-3 rounded-lg">
                    <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                    <p className="text-sm text-blue-800 font-medium">{text}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500 italic">Gathering more data to generate insights...</p>
              )}
            </div>
          </div>

          {/* 3. Pricing Intelligence Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <DollarSign size={18} className="text-green-600" /> Pricing Intelligence
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Avg Budget</th>
                    <th className="px-6 py-3">Avg Accepted</th>
                    <th className="px-6 py-3">Delta %</th>
                    <th className="px-6 py-3">Sample Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pricing.map((p) => (
                    <tr key={p.category} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{p.category}</td>
                      <td className="px-6 py-4 text-gray-500">{p.avgBudget.toFixed(0)} ₼</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{p.avgAccepted.toFixed(0)} ₼</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                          p.avgDeltaPercent > 5 ? 'bg-red-100 text-red-700' : 
                          p.avgDeltaPercent < -5 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                        }`}>
                          {p.avgDeltaPercent > 0 ? '+' : ''}{p.avgDeltaPercent.toFixed(1)}%
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500">{p.jobCount} jobs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 4. Worker Performance Leaderboard */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Award size={18} className="text-amber-500" /> Worker Reliability Scores
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Rank</th>
                    <th className="px-6 py-3">Worker</th>
                    <th className="px-6 py-3">Reliability Score</th>
                    <th className="px-6 py-3">Acceptance Rate</th>
                    <th className="px-6 py-3">Completed Jobs</th>
                    <th className="px-6 py-3">Rating</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {workerLeaderboard.slice(0, 10).map((w, i) => (
                    <tr key={w.username} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-400 font-mono">#{i + 1}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{w.username}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${w.score > 80 ? 'bg-green-500' : w.score > 50 ? 'bg-yellow-500' : 'bg-red-500'}`} 
                              style={{ width: `${w.score}%` }}
                            ></div>
                          </div>
                          <span className="font-bold text-gray-700">{w.score}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{w.acceptanceRate.toFixed(0)}%</td>
                      <td className="px-6 py-4 text-gray-600">{w.completed}</td>
                      <td className="px-6 py-4 flex items-center gap-1">
                        <Star size={12} fill="currentColor" className="text-amber-400" /> {w.avgRating.toFixed(1)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 5. Employer Trust Leaderboard */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <CheckCircle size={18} className="text-blue-500" /> Employer Trust Scores
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                  <tr>
                    <th className="px-6 py-3">Rank</th>
                    <th className="px-6 py-3">Employer</th>
                    <th className="px-6 py-3">Trust Score</th>
                    <th className="px-6 py-3">Response Rate</th>
                    <th className="px-6 py-3">Jobs Posted</th>
                    <th className="px-6 py-3">Offers Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {employerLeaderboard.slice(0, 10).map((e, i) => (
                    <tr key={e.username} className="hover:bg-gray-50">
                      <td className="px-6 py-4 text-gray-400 font-mono">#{i + 1}</td>
                      <td className="px-6 py-4 font-medium text-gray-900">{e.username}</td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${e.score > 80 ? 'bg-blue-500' : e.score > 50 ? 'bg-blue-300' : 'bg-gray-300'}`} 
                              style={{ width: `${e.score}%` }}
                            ></div>
                          </div>
                          <span className="font-bold text-gray-700">{e.score}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">{e.responseRate.toFixed(0)}%</td>
                      <td className="px-6 py-4 text-gray-600">{e.posted}</td>
                      <td className="px-6 py-4 text-gray-600">{e.offersReceived}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      )}
    </div>
  );
}

// --- Subcomponents ---

const KPICard = ({ icon: Icon, label, value, subtext, color }: any) => {
  const colors: any = {
    blue: 'bg-blue-50 text-blue-600',
    purple: 'bg-purple-50 text-purple-600',
    green: 'bg-green-50 text-green-600',
    amber: 'bg-amber-50 text-amber-600'
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div>
          <p className="text-sm font-medium text-gray-500">{label}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon size={24} />
        </div>
      </div>
      <p className="text-xs text-gray-400">{subtext}</p>
    </div>
  );
};

const FunnelStep = ({ label, value, percent, color }: any) => (
  <div className="relative">
    <div className="flex justify-between text-sm mb-1 font-medium text-gray-700">
      <span>{label}</span>
      <span>{value}</span>
    </div>
    <div className="w-full bg-gray-100 rounded-full h-8 overflow-hidden relative">
      <div 
        className={`h-full flex items-center justify-center text-xs font-bold transition-all duration-500 ${color}`} 
        style={{ width: `${Math.max(percent, 5)}%` }}
      >
        {percent.toFixed(0)}%
      </div>
    </div>
  </div>
);

const SchemaCard = ({ title, fields, count, color }: any) => {
  const colors: any = {
    blue: 'border-t-blue-500',
    purple: 'border-t-purple-500',
    indigo: 'border-t-indigo-500',
    amber: 'border-t-amber-500',
    green: 'border-t-green-500'
  };

  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm border border-gray-200 border-t-4 ${colors[color]}`}>
      <div className="flex justify-between items-center mb-2">
        <h4 className="font-bold text-gray-800">{title}</h4>
        <span className="text-xs bg-gray-100 px-2 py-0.5 rounded-full text-gray-500">{count}</span>
      </div>
      <div className="space-y-1">
        {fields.map((f: string) => (
          <div key={f} className="text-xs text-gray-500 font-mono bg-gray-50 px-1.5 py-0.5 rounded w-fit">
            {f}
          </div>
        ))}
      </div>
    </div>
  );
};
