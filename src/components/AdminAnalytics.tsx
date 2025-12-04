import React, { useState, useMemo } from 'react';
import { 
  Users, Briefcase, CheckCircle, Star, TrendingUp, 
  Calendar, Filter, PieChart, BarChart2, Award, AlertCircle 
} from 'lucide-react';
import { 
  User, JobPost, WorkerReview, JobMessage, Notification, JobCategory, JOB_CATEGORIES 
} from '../types';
import { 
  filterByDate, getJobsByMonth, getOffersByCategory, getRatingsDistribution,
  getWorkerLeaderboard, getEmployerLeaderboard
} from '../utils/analytics';

interface AdminAnalyticsProps {
  users: User[];
  jobs: JobPost[];
  reviews: WorkerReview[];
  messages: JobMessage[];
  notifications: Notification[];
}

type DateFilter = '7d' | '30d' | '90d' | 'all';

export default function AdminAnalytics({ users, jobs, reviews, messages, notifications }: AdminAnalyticsProps) {
  // --- Filters ---
  const [dateRange, setDateRange] = useState<DateFilter>('all');
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | 'All'>('All');

  // --- Filtered Data ---
  const filteredJobs = useMemo(() => {
    let data = filterByDate(jobs, dateRange);
    if (selectedCategory !== 'All') {
      data = data.filter(j => j.category === selectedCategory);
    }
    return data;
  }, [jobs, dateRange, selectedCategory]);

  const filteredReviews = useMemo(() => filterByDate(reviews, dateRange), [reviews, dateRange]);
  
  // --- Metrics Calculations ---
  
  const metrics = useMemo(() => {
    const totalUsers = users.length;
    const employers = users.filter(u => u.role === 'employer').length;
    const workers = users.filter(u => u.role === 'worker').length;
    
    // Job Metrics
    const totalJobs = filteredJobs.length;
    const openJobs = filteredJobs.filter(j => j.status === 'open').length;
    const completedJobs = filteredJobs.filter(j => j.status === 'completed').length;
    const completionRate = totalJobs > 0 ? Math.round((completedJobs / totalJobs) * 100) : 0;

    // Offer Metrics
    let totalOffers = 0;
    let acceptedOffers = 0;
    filteredJobs.forEach(j => {
      totalOffers += j.applications.length;
      if (j.applications.some(a => a.status === 'accepted')) acceptedOffers++;
    });
    const acceptanceRate = totalOffers > 0 ? Math.round((acceptedOffers / totalOffers) * 100) : 0;
    const avgOffersPerJob = totalJobs > 0 ? (totalOffers / totalJobs).toFixed(1) : '0';

    // Review Metrics
    const avgRating = filteredReviews.length > 0 
      ? (filteredReviews.reduce((sum, r) => sum + r.rating, 0) / filteredReviews.length).toFixed(1)
      : 'N/A';

    return {
      totalUsers, employers, workers,
      totalJobs, openJobs, completedJobs, completionRate,
      totalOffers, acceptanceRate, avgOffersPerJob,
      avgRating, totalReviews: filteredReviews.length
    };
  }, [users, filteredJobs, filteredReviews]);

  // --- Charts Data ---
  const jobsOverTime = useMemo(() => getJobsByMonth(jobs), [jobs]); // Use all jobs for trend
  const categoryStats = useMemo(() => getOffersByCategory(filteredJobs), [filteredJobs]);
  const ratingsDist = useMemo(() => getRatingsDistribution(filteredReviews), [filteredReviews]);

  // --- Leaderboards ---
  const workerLeaderboard = useMemo(() => getWorkerLeaderboard(users, jobs, reviews).slice(0, 5), [users, jobs, reviews]);
  const employerLeaderboard = useMemo(() => getEmployerLeaderboard(users, jobs, reviews).slice(0, 5), [users, jobs, reviews]);

  // --- Insights Generator ---
  const insights = useMemo(() => {
    const list = [];
    
    // Category Insight
    const sortedCats = [...categoryStats].sort((a, b) => b.offerCount - a.offerCount);
    if (sortedCats.length > 0) {
      list.push(`Workers in "${sortedCats[0].category}" are most active, receiving ${sortedCats[0].offerCount} offers.`);
    }

    // Rating Insight
    if (Number(metrics.avgRating) > 4.5) {
      list.push("Overall user satisfaction is extremely high (>4.5 stars).");
    } else if (Number(metrics.avgRating) < 3) {
      list.push("User satisfaction is low. Consider investigating recent disputes.");
    }

    // Completion Insight
    if (metrics.completionRate > 70) {
      list.push("Job completion rate is healthy at over 70%.");
    }

    return list;
  }, [categoryStats, metrics]);

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      
      {/* 1. Filters Bar */}
      <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center justify-between">
        <div className="flex items-center gap-2 text-gray-700 font-semibold">
          <Filter size={20} className="text-blue-600" />
          Analytics Filters
        </div>
        
        <div className="flex flex-wrap gap-3">
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

      {/* 2. Summary Cards (KPIs) */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <KPICard icon={Users} label="Total Users" value={metrics.totalUsers} subtext={`${metrics.workers} Workers, ${metrics.employers} Employers`} color="blue" />
        <KPICard icon={Briefcase} label="Total Jobs" value={metrics.totalJobs} subtext={`${metrics.completionRate}% Completion Rate`} color="purple" />
        <KPICard icon={CheckCircle} label="Offers Submitted" value={metrics.totalOffers} subtext={`${metrics.avgOffersPerJob} per job avg`} color="green" />
        <KPICard icon={Star} label="Avg Rating" value={metrics.avgRating} subtext={`Based on ${metrics.totalReviews} reviews`} color="amber" />
      </div>

      {/* 3. Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Jobs Over Time Chart */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <TrendingUp size={18} className="text-blue-600" /> Jobs Created Trend
          </h3>
          <div className="h-64 flex items-end justify-between gap-2">
            {jobsOverTime.slice(-12).map((item, idx) => {
              const max = Math.max(...jobsOverTime.map(d => d.count));
              const height = max > 0 ? (item.count / max) * 100 : 0;
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
            })}
          </div>
        </div>

        {/* Ratings Distribution */}
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="font-bold text-gray-800 mb-6 flex items-center gap-2">
            <Star size={18} className="text-amber-500" /> Ratings Distribution
          </h3>
          <div className="space-y-4">
            {[5, 4, 3, 2, 1].map(star => {
              const count = ratingsDist[star as keyof typeof ratingsDist];
              const max = Math.max(...Object.values(ratingsDist));
              const width = max > 0 ? (count / max) * 100 : 0;
              return (
                <div key={star} className="flex items-center gap-3">
                  <span className="text-sm font-medium text-gray-600 w-12 flex items-center gap-1">
                    {star} <Star size={12} fill="currentColor" className="text-amber-400" />
                  </span>
                  <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-amber-400 rounded-full transition-all duration-500"
                      style={{ width: `${width}%` }}
                    ></div>
                  </div>
                  <span className="text-xs text-gray-400 w-8 text-right">{count}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 4. Category Performance Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h3 className="font-bold text-gray-800 flex items-center gap-2">
            <PieChart size={18} className="text-purple-600" /> Category Performance
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3 font-semibold">Category</th>
                <th className="px-6 py-3 font-semibold">Jobs</th>
                <th className="px-6 py-3 font-semibold">Offers</th>
                <th className="px-6 py-3 font-semibold">Avg Price</th>
                <th className="px-6 py-3 font-semibold">Competition</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {categoryStats.map((cat) => (
                <tr key={cat.category} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium text-gray-900">{cat.category}</td>
                  <td className="px-6 py-4">{cat.jobCount}</td>
                  <td className="px-6 py-4">{cat.offerCount}</td>
                  <td className="px-6 py-4 font-mono text-blue-600">{cat.avgPrice} ₼</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-purple-500" 
                          style={{ width: `${Math.min((cat.offerCount / (cat.jobCount || 1)) * 10, 100)}%` }}
                        ></div>
                      </div>
                      <span className="text-xs text-gray-500">
                        {(cat.offerCount / (cat.jobCount || 1)).toFixed(1)} / job
                      </span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. Leaderboards */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Top Workers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Award size={18} className="text-amber-500" /> Top Workers
            </h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Worker</th>
                <th className="px-6 py-3">Score</th>
                <th className="px-6 py-3">Rating</th>
                <th className="px-6 py-3">Jobs</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {workerLeaderboard.map((w, i) => (
                <tr key={w.username} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium flex items-center gap-2">
                    <span className="text-gray-400 text-xs">#{i+1}</span> {w.username}
                  </td>
                  <td className="px-6 py-4 font-bold text-blue-600">{w.score}</td>
                  <td className="px-6 py-4 flex items-center gap-1">
                    <Star size={12} fill="currentColor" className="text-amber-400" /> {w.avgRating.toFixed(1)}
                  </td>
                  <td className="px-6 py-4">{w.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Top Employers */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-200">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Award size={18} className="text-blue-500" /> Top Employers
            </h3>
          </div>
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="px-6 py-3">Employer</th>
                <th className="px-6 py-3">Trust Score</th>
                <th className="px-6 py-3">Posted</th>
                <th className="px-6 py-3">Filled</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {employerLeaderboard.map((e, i) => (
                <tr key={e.username} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-medium flex items-center gap-2">
                    <span className="text-gray-400 text-xs">#{i+1}</span> {e.username}
                  </td>
                  <td className="px-6 py-4 font-bold text-green-600">{e.score}</td>
                  <td className="px-6 py-4">{e.posted}</td>
                  <td className="px-6 py-4">{e.completed}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. Insights Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-xl border border-blue-100 shadow-sm">
        <h3 className="font-bold text-blue-900 mb-4 flex items-center gap-2">
          <AlertCircle size={20} /> Automated Insights
        </h3>
        <div className="space-y-2">
          {insights.length > 0 ? (
            insights.map((text, idx) => (
              <div key={idx} className="flex items-start gap-3 bg-white/60 p-3 rounded-lg">
                <div className="mt-1 w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                <p className="text-sm text-blue-800">{text}</p>
              </div>
            ))
          ) : (
            <p className="text-sm text-gray-500 italic">Not enough data to generate insights yet.</p>
          )}
        </div>
      </div>

    </div>
  );
}

// --- Components ---

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
