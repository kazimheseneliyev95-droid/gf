import React, { useState, useMemo } from 'react';
import { 
  Users, Briefcase, CheckCircle, Star, TrendingUp, 
  Filter, PieChart, Award, AlertCircle, Database, 
  ArrowDown, DollarSign, Clock, Activity, Layers,
  BarChart2, Search, Download, ChevronDown, ChevronUp
} from 'lucide-react';
import { 
  User, JobPost, WorkerReview, JobMessage, Notification, JobCategory, JOB_CATEGORIES 
} from '../types';
import { 
  filterByDate, getJobsByMonth, getOffersByCategory, getRatingsDistribution,
  getWorkerLeaderboard, getEmployerLeaderboard, getFunnelStats, getPricingAnalytics, getTimeAnalytics,
  getRevenueMetrics, getJobsByStatus, getRevenueByCategory
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
  const [showSchema, setShowSchema] = useState(false);
  
  // Research Table State
  const [jobSort, setJobSort] = useState<'date' | 'budget' | 'offers'>('date');
  const [jobSortDir, setJobSortDir] = useState<'asc' | 'desc'>('desc');

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
  const revenue = useMemo(() => getRevenueMetrics(filteredJobs), [filteredJobs]);
  const statusCounts = useMemo(() => getJobsByStatus(filteredJobs), [filteredJobs]);
  const revenueByCat = useMemo(() => getRevenueByCategory(filteredJobs), [filteredJobs]);
  
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

  // --- Helpers ---
  const handleSort = (key: 'date' | 'budget' | 'offers') => {
    if (jobSort === key) setJobSortDir(prev => prev === 'asc' ? 'desc' : 'asc');
    else { setJobSort(key); setJobSortDir('desc'); }
  };

  const sortedJobsList = useMemo(() => {
    return [...filteredJobs].sort((a, b) => {
      let valA, valB;
      if (jobSort === 'budget') { valA = a.budget; valB = b.budget; }
      else if (jobSort === 'offers') { valA = a.applications?.length || 0; valB = b.applications?.length || 0; }
      else { valA = new Date(a.createdAt).getTime(); valB = new Date(b.createdAt).getTime(); }
      
      return jobSortDir === 'asc' ? valA - valB : valB - valA;
    });
  }, [filteredJobs, jobSort, jobSortDir]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-sans">
      
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
          {/* Row 1: KPI Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard 
              icon={DollarSign} 
              label="Total Volume" 
              value={`${revenue.totalVolume.toLocaleString()} ₼`} 
              subtext={`Avg Job: ${revenue.avgBudget.toFixed(0)} ₼`} 
              color="green" 
            />
            <KPICard 
              icon={Briefcase} 
              label="Active Jobs" 
              value={filteredJobs.length} 
              subtext={`${statusCounts.open} Open / ${statusCounts.processing} In Progress`} 
              color="blue" 
            />
            <KPICard 
              icon={Activity} 
              label="Conversion Rate" 
              value={`${funnel.conversion.toAssigned.toFixed(0)}%`} 
              subtext="Offers → Assigned" 
              color="purple" 
            />
            <KPICard 
              icon={Clock} 
              label="Avg Response" 
              value={`${timeStats.avgTimeToFirstOfferHours.toFixed(1)}h`} 
              subtext="Time to first offer" 
              color="amber" 
            />
          </div>

          {/* Row 2: Revenue & Category Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Revenue by Category */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BarChart2 size={18} className="text-blue-600" /> Revenue & Volume by Category
              </h3>
              <div className="space-y-4">
                {revenueByCat.map((cat) => (
                  <div key={cat.category} className="group">
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-gray-700">{cat.category}</span>
                      <span className="text-gray-500 font-mono">{cat.volume.toLocaleString()} ₼ <span className="text-xs text-gray-400">({cat.count} jobs)</span></span>
                    </div>
                    <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 group-hover:bg-blue-600 transition-all duration-500" 
                        style={{ width: `${Math.min((cat.volume / (revenueByCat[0]?.volume || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Status Breakdown */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <PieChart size={18} className="text-purple-600" /> Jobs by Status
              </h3>
              <div className="flex items-center justify-center py-4">
                <div className="relative w-40 h-40 rounded-full border-[16px] border-gray-100 flex items-center justify-center">
                  <div className="text-center">
                    <span className="block text-2xl font-bold text-gray-900">{filteredJobs.length}</span>
                    <span className="text-xs text-gray-500 uppercase">Total</span>
                  </div>
                  {/* Simple CSS visualization of segments would be complex without a library, using list instead */}
                </div>
              </div>
              <div className="space-y-3 mt-2">
                <StatusRow label="Open" count={statusCounts.open} total={filteredJobs.length} color="bg-green-500" />
                <StatusRow label="In Progress" count={statusCounts.processing} total={filteredJobs.length} color="bg-blue-500" />
                <StatusRow label="Completed" count={statusCounts.completed} total={filteredJobs.length} color="bg-gray-500" />
              </div>
            </div>
          </div>

          {/* Row 3: Trends & Funnel */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Jobs Trend */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 lg:col-span-2">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <TrendingUp size={18} className="text-indigo-600" /> Performance Over Time
              </h3>
              <div className="h-56 flex items-end justify-between gap-3 px-2">
                {(() => {
                  const max = Math.max(...jobsOverTime.map(d => Math.max(d.posted, d.completed)), 1);
                  return jobsOverTime.map((item, idx) => (
                    <div key={idx} className="flex flex-col items-center gap-1 flex-1 group relative h-full justify-end">
                      <div className="flex gap-1 items-end h-full w-full justify-center">
                        {/* Posted Bar */}
                        <div 
                          className="w-3 bg-blue-200 hover:bg-blue-400 transition-all rounded-t-sm"
                          style={{ height: `${(item.posted / max) * 100}%` }}
                          title={`Posted: ${item.posted}`}
                        ></div>
                        {/* Completed Bar */}
                        <div 
                          className="w-3 bg-green-200 hover:bg-green-400 transition-all rounded-t-sm"
                          style={{ height: `${(item.completed / max) * 100}%` }}
                          title={`Completed: ${item.completed}`}
                        ></div>
                      </div>
                      <span className="text-[10px] text-gray-400 truncate w-full text-center mt-2 border-t border-gray-100 pt-1">{item.name}</span>
                    </div>
                  ));
                })()}
              </div>
              <div className="flex justify-center gap-6 mt-4 text-xs text-gray-500">
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-blue-200 rounded-sm"></div> Posted</div>
                <div className="flex items-center gap-2"><div className="w-3 h-3 bg-green-200 rounded-sm"></div> Completed</div>
              </div>
            </div>

            {/* Funnel */}
            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Layers size={18} className="text-amber-600" /> Conversion Funnel
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
          </div>
        </div>
      )}

      {/* === TAB: DEEP RESEARCH === */}
      {activeTab === 'research' && (
        <div className="space-y-8">
          
          {/* 1. Pricing Intelligence Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <DollarSign size={18} className="text-green-600" /> Pricing Intelligence
              </h3>
              <div className="text-xs text-gray-500">
                Market analysis based on {filteredJobs.length} jobs
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold">
                  <tr>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3">Avg Budget</th>
                    <th className="px-6 py-3">Avg Accepted Price</th>
                    <th className="px-6 py-3">Price Delta</th>
                    <th className="px-6 py-3">Sample Size</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {pricing.map((p) => (
                    <tr key={p.category} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{p.category}</td>
                      <td className="px-6 py-4 text-gray-500">{p.avgBudget.toFixed(0)} ₼</td>
                      <td className="px-6 py-4 font-bold text-gray-900">{p.avgAccepted > 0 ? `${p.avgAccepted.toFixed(0)} ₼` : '-'}</td>
                      <td className="px-6 py-4">
                        {p.avgAccepted > 0 ? (
                          <span className={`px-2 py-1 rounded-full text-xs font-bold ${
                            p.avgDeltaPercent > 5 ? 'bg-red-100 text-red-700' : 
                            p.avgDeltaPercent < -5 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {p.avgDeltaPercent > 0 ? '+' : ''}{p.avgDeltaPercent.toFixed(1)}%
                          </span>
                        ) : <span className="text-gray-400">-</span>}
                      </td>
                      <td className="px-6 py-4 text-gray-500">{p.jobCount} jobs</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Detailed Job Explorer */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-6 border-b border-gray-200 flex justify-between items-center">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <Search size={18} className="text-blue-600" /> Job Explorer
              </h3>
              <div className="flex gap-2">
                <button className="text-gray-400 hover:text-gray-600 p-1"><Download size={16} /></button>
              </div>
            </div>
            <div className="overflow-x-auto max-h-[500px]">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-semibold sticky top-0 z-10">
                  <tr>
                    <th className="px-6 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('date')}>
                      Date {jobSort === 'date' && (jobSortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3">Title</th>
                    <th className="px-6 py-3">Category</th>
                    <th className="px-6 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('budget')}>
                      Budget {jobSort === 'budget' && (jobSortDir === 'asc' ? '↑' : '↓')}
                    </th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 cursor-pointer hover:bg-gray-100" onClick={() => handleSort('offers')}>
                      Offers {jobSort === 'offers' && (jobSortDir === 'asc' ? '↑' : '↓')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {sortedJobsList.slice(0, 50).map(job => (
                    <tr key={job.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 text-gray-500 text-xs whitespace-nowrap">
                        {new Date(job.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-3 font-medium text-gray-900 truncate max-w-xs" title={job.title}>
                        {job.title}
                      </td>
                      <td className="px-6 py-3">
                        <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{job.category}</span>
                      </td>
                      <td className="px-6 py-3 font-mono text-blue-600">
                        {job.budget} ₼
                      </td>
                      <td className="px-6 py-3">
                        <span className={`text-xs font-bold px-2 py-0.5 rounded uppercase ${
                          job.status === 'completed' ? 'bg-green-100 text-green-700' :
                          job.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {job.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-600">
                        {job.applications?.length || 0}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="p-3 border-t border-gray-200 bg-gray-50 text-xs text-center text-gray-500">
              Showing top 50 jobs based on current filters
            </div>
          </div>

          {/* 3. Automated Insights */}
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

          {/* 4. Schema (Collapsible) */}
          <div className="border border-gray-200 rounded-xl overflow-hidden">
            <button 
              onClick={() => setShowSchema(!showSchema)}
              className="w-full flex justify-between items-center p-4 bg-gray-50 hover:bg-gray-100 transition-colors"
            >
              <h3 className="font-bold text-gray-700 flex items-center gap-2">
                <Database size={16} /> Data Schema & Models
              </h3>
              {showSchema ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
            </button>
            
            {showSchema && (
              <div className="p-6 bg-white grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 animate-in slide-in-from-top-2">
                <SchemaCard title="Users" fields={['username', 'role', 'isActive']} count={users.length} color="blue" />
                <SchemaCard title="Jobs" fields={['title', 'budget', 'status', 'category']} count={jobs.length} color="purple" />
                <SchemaCard title="Applications" fields={['worker', 'price', 'status']} count={funnel.withOffers} color="indigo" />
                <SchemaCard title="Reviews" fields={['rating', 'comment', 'jobId']} count={reviews.length} color="amber" />
                <SchemaCard title="Messages" fields={['sender', 'text', 'isRead']} count={messages.length} color="green" />
              </div>
            )}
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
          <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">{label}</p>
          <h3 className="text-2xl font-bold text-gray-900 mt-1">{value}</h3>
        </div>
        <div className={`p-3 rounded-lg ${colors[color]}`}>
          <Icon size={24} />
        </div>
      </div>
      <p className="text-xs text-gray-400 font-medium">{subtext}</p>
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

const StatusRow = ({ label, count, total, color }: any) => (
  <div className="flex items-center justify-between text-sm">
    <div className="flex items-center gap-2">
      <div className={`w-3 h-3 rounded-full ${color}`}></div>
      <span className="text-gray-600">{label}</span>
    </div>
    <div className="flex items-center gap-3">
      <span className="font-bold text-gray-900">{count}</span>
      <span className="text-xs text-gray-400 w-8 text-right">{((count / (total || 1)) * 100).toFixed(0)}%</span>
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
