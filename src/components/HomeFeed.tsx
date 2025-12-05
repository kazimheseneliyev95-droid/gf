import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Search, Filter, MapPin, DollarSign, Briefcase, HardHat, ArrowLeft, Sparkles, Gavel, User, PlayCircle, CheckSquare } from 'lucide-react';
import { JobPost, JOB_STORAGE_KEY, JobCategory, JOB_CATEGORIES, UserRole, WORKER_PROFILE_KEY, WorkerProfileData } from '../types';
import { isFeatureEnabled } from '../utils/featureFlags';
import JobDetailsModal from './JobDetailsModal';

export default function HomeFeed() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<{ username: string, role: UserRole } | null>(null);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [filteredJobs, setFilteredJobs] = useState<JobPost[]>([]);
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | 'All'>('All');
  const [minBudget, setMinBudget] = useState('');
  
  // Worker Context
  const [workerProfile, setWorkerProfile] = useState<WorkerProfileData | null>(null);

  // Modal
  const [viewJob, setViewJob] = useState<JobPost | null>(null);

  const showAuction = isFeatureEnabled('auctionMode');

  useEffect(() => {
    const sessionStr = localStorage.getItem('currentUser');
    if (!sessionStr) {
      navigate('/');
      return;
    }
    const user = JSON.parse(sessionStr);
    setCurrentUser(user);

    // Load Jobs
    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (allJobsStr) {
      const allJobs: JobPost[] = JSON.parse(allJobsStr);
      // Sort by newest
      const sorted = allJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setJobs(sorted);
      setFilteredJobs(sorted);
    }

    // Load Worker Profile if applicable
    if (user.role === 'worker') {
      const profilesStr = localStorage.getItem(WORKER_PROFILE_KEY);
      if (profilesStr) {
        const profiles: WorkerProfileData[] = JSON.parse(profilesStr);
        const myProfile = profiles.find(p => p.username === user.username);
        if (myProfile) setWorkerProfile(myProfile);
      }
    }
  }, [navigate]);

  useEffect(() => {
    let result = jobs;

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(j => j.title.toLowerCase().includes(lower) || j.address.toLowerCase().includes(lower));
    }

    if (selectedCategory !== 'All') {
      result = result.filter(j => j.category === selectedCategory);
    }

    if (minBudget) {
      result = result.filter(j => j.budget >= Number(minBudget));
    }

    setFilteredJobs(result);
  }, [jobs, searchTerm, selectedCategory, minBudget]);

  if (!currentUser) return null;

  const isWorker = currentUser.role === 'worker';

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Navbar */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to={isWorker ? '/worker' : '/employer'} className="text-gray-500 hover:text-gray-900">
              <ArrowLeft size={20} />
            </Link>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              {isWorker ? <HardHat className="text-amber-600" /> : <Briefcase className="text-blue-600" />}
              Global Job Feed
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-sm text-gray-500">
               Logged in as <span className="font-bold text-gray-900">{currentUser.username}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 space-y-6">
        
        {/* Filters */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
            <Filter size={16} /> Filters:
          </div>
          <div className="relative flex-1 min-w-[200px]">
            <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
            <input 
              type="text" 
              placeholder="Search jobs..." 
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          <select 
            value={selectedCategory}
            onChange={e => setSelectedCategory(e.target.value as any)}
            className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="All">All Categories</option>
            {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <input 
            type="number" 
            placeholder="Min Budget" 
            value={minBudget}
            onChange={e => setMinBudget(e.target.value)}
            className="w-32 px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Job List */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {filteredJobs.map(job => {
            // Worker Match Logic
            let isMatch = false;
            if (isWorker && workerProfile) {
              const skillMatch = workerProfile.skills.some(s => job.category.toLowerCase().includes(s.toLowerCase()));
              const regionMatch = workerProfile.regions?.some(r => job.address.toLowerCase().includes(r.toLowerCase()));
              isMatch = skillMatch || (regionMatch ?? false);
            }

            const myApp = isWorker ? job.applications?.find(a => a.workerUsername === currentUser.username) : null;
            const isMyJob = !isWorker && job.employerUsername === currentUser.username;

            return (
              <div 
                key={job.id} 
                onClick={() => setViewJob(job)}
                className={`bg-white rounded-xl border shadow-sm p-5 hover:shadow-md transition-all cursor-pointer relative group ${
                  isMyJob ? 'border-blue-200 ring-1 ring-blue-50' : 'border-gray-200'
                }`}
              >
                {/* Badges */}
                <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                   {isWorker && isMatch && (
                     <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                       <Sparkles size={10} /> Match
                     </span>
                   )}
                   {isMyJob && (
                     <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded">
                       Your Job
                     </span>
                   )}
                   {myApp && (
                     <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                       myApp.status === 'accepted' ? 'bg-green-100 text-green-700' :
                       myApp.status === 'rejected' ? 'bg-red-100 text-red-700' :
                       'bg-amber-100 text-amber-700'
                     }`}>
                       {myApp.status === 'pending' ? 'Offer Sent' : myApp.status}
                     </span>
                   )}
                </div>

                <div className="mb-3 pr-16">
                  <h3 className="font-bold text-gray-900 line-clamp-1 group-hover:text-blue-600 transition-colors">{job.title}</h3>
                  <div className="flex gap-2 mt-1">
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{job.category}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      job.status === 'open' ? 'bg-green-50 text-green-700' :
                      job.status === 'processing' ? 'bg-blue-50 text-blue-700' :
                      'bg-gray-100 text-gray-500'
                    }`}>
                      {job.status}
                    </span>
                  </div>
                </div>

                <div className="space-y-2 text-sm text-gray-600 mb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign size={14} className="text-gray-400" />
                    {job.isAuction && showAuction ? (
                      <span className="font-bold text-purple-600 text-xs flex items-center gap-1">
                        <Gavel size={10} /> Open Bidding
                      </span>
                    ) : (
                      <span className="font-bold text-gray-900">{job.budget} ₼</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <MapPin size={14} className="text-gray-400" />
                    <span className="truncate">{job.address}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <User size={14} className="text-gray-400" />
                    <span className="truncate">{job.employerUsername}</span>
                  </div>
                </div>

                <p className="text-xs text-gray-400 mt-auto pt-3 border-t border-gray-50 flex justify-between items-center">
                  <span>{new Date(job.createdAt).toLocaleDateString()}</span>
                  <span className="group-hover:translate-x-1 transition-transform text-blue-600 font-medium">View Details →</span>
                </p>
              </div>
            );
          })}
        </div>

        {filteredJobs.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p>No jobs found matching your criteria.</p>
          </div>
        )}

        {/* Job Details Modal */}
        {viewJob && (
          <JobDetailsModal 
            isOpen={!!viewJob}
            onClose={() => setViewJob(null)}
            job={viewJob}
            currentWorkerUsername={isWorker ? currentUser.username : undefined}
            viewerRole={currentUser.role as 'worker' | 'employer'}
          />
        )}

      </div>
    </div>
  );
}
