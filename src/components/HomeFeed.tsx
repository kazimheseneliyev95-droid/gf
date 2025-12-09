import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { Search, Filter, MapPin, DollarSign, Briefcase, HardHat, ArrowLeft, Sparkles, Gavel, User as UserIcon, ShieldCheck, Star, UserPlus } from 'lucide-react';
import { JobPost, JOB_STORAGE_KEY, JobCategory, JOB_CATEGORIES, UserRole, WORKER_PROFILE_KEY, WorkerProfileData, USERS_STORAGE_KEY, User, EMPLOYER_PROFILE_KEY, EmployerProfileData } from '../types';
import { isFeatureEnabled } from '../utils/featureFlags';
import { calculateTrustScore, getWorkerMatchScore, calculateEmployerTrust } from '../utils/advancedFeatures';
import { getWorkerAverageRating, createNotification } from '../utils';
import JobDetailsModal from './JobDetailsModal';
import InviteWorkerModal from './InviteWorkerModal';

export default function HomeFeed() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<{ username: string, role: UserRole } | null>(null);
  
  // Data
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [workers, setWorkers] = useState<User[]>([]);
  const [employers, setEmployers] = useState<User[]>([]);
  const [workerProfiles, setWorkerProfiles] = useState<WorkerProfileData[]>([]);
  const [employerProfiles, setEmployerProfiles] = useState<EmployerProfileData[]>([]);

  // Filtered Data
  const [filteredJobs, setFilteredJobs] = useState<JobPost[]>([]);
  const [filteredWorkers, setFilteredWorkers] = useState<User[]>([]);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | 'All'>('All');
  const [minBudget, setMinBudget] = useState('');
  
  // New Filters for Employer
  const [minRating, setMinRating] = useState<number>(0);
  const [availabilityFilter, setAvailabilityFilter] = useState<'all' | 'available'>('all');
  
  // Worker Context
  const [myWorkerProfile, setMyWorkerProfile] = useState<WorkerProfileData | null>(null);

  // Job Context (for Employer filtering)
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);

  // Modals
  const [viewJob, setViewJob] = useState<JobPost | null>(null);
  const [inviteModal, setInviteModal] = useState<{ isOpen: boolean, workerUsername: string | null }>({ isOpen: false, workerUsername: null });

  const showAuction = isFeatureEnabled('auctionMode');

  const loadData = () => {
    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (allJobsStr) {
      const allJobs: JobPost[] = JSON.parse(allJobsStr);
      const sorted = allJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setJobs(sorted);
      setFilteredJobs(sorted);
    }
  };

  useEffect(() => {
    const sessionStr = localStorage.getItem('currentUser');
    if (!sessionStr) {
      navigate('/');
      return;
    }
    const user = JSON.parse(sessionStr);
    setCurrentUser(user);

    loadData();

    const usersStr = localStorage.getItem(USERS_STORAGE_KEY);
    if (usersStr) {
      const allUsers: User[] = JSON.parse(usersStr);
      setWorkers(allUsers.filter(u => u.role === 'worker'));
      setEmployers(allUsers.filter(u => u.role === 'employer'));
    }

    const wProfilesStr = localStorage.getItem(WORKER_PROFILE_KEY);
    if (wProfilesStr) {
      const wProfs: WorkerProfileData[] = JSON.parse(wProfilesStr);
      setWorkerProfiles(wProfs);
      if (user.role === 'worker') {
        setMyWorkerProfile(wProfs.find(p => p.username === user.username) || null);
      }
    }

    const eProfilesStr = localStorage.getItem(EMPLOYER_PROFILE_KEY);
    if (eProfilesStr) {
      setEmployerProfiles(JSON.parse(eProfilesStr));
    }

    // Check URL for job context
    const urlJobId = searchParams.get('jobContext');
    if (urlJobId) setSelectedJobId(urlJobId);

  }, [navigate, searchParams]);

  useEffect(() => {
    if (!currentUser) return;

    if (currentUser.role === 'worker') {
      // Filter Jobs - Only show OPEN jobs for discovery
      let result = jobs.filter(j => j.status === 'open');
      
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
    } else {
      // Filter Workers (Employer View)
      let result = workers;
      
      // Apply Job Context Logic
      if (selectedJobId) {
        const job = jobs.find(j => j.id === selectedJobId);
        if (job) {
          // Auto-apply filters based on job
          // Note: We don't overwrite state to allow user to change it, but we filter the result
          result = result.filter(u => {
             const profile = workerProfiles.find(p => p.username === u.username);
             if (!profile) return false;
             // Basic match: Category overlap
             return profile.skills.some(s => s.toLowerCase().includes(job.category.toLowerCase()));
          });
        }
      }

      if (searchTerm) {
        const lower = searchTerm.toLowerCase();
        result = result.filter(u => {
          const profile = workerProfiles.find(p => p.username === u.username);
          return u.username.toLowerCase().includes(lower) || 
                 (profile && profile.skills.some(s => s.toLowerCase().includes(lower))) ||
                 (profile && profile.regions && profile.regions.some(r => r.toLowerCase().includes(lower)));
        });
      }
      
      if (selectedCategory !== 'All') {
        result = result.filter(u => {
          const profile = workerProfiles.find(p => p.username === u.username);
          return profile && profile.skills.some(s => s.toLowerCase().includes(selectedCategory.toLowerCase()));
        });
      }

      if (minRating > 0) {
        result = result.filter(u => getWorkerAverageRating(u.username) >= minRating);
      }

      if (availabilityFilter === 'available') {
        result = result.filter(u => {
          const profile = workerProfiles.find(p => p.username === u.username);
          return profile?.availabilityStatus === 'available';
        });
      }

      setFilteredWorkers(result);
    }
  }, [jobs, workers, searchTerm, selectedCategory, minBudget, currentUser, workerProfiles, selectedJobId, minRating, availabilityFilter]);

  const handleOfferSent = () => {
    loadData();
  };

  const handleInvite = (workerUsername: string) => {
    if (selectedJobId) {
      // Direct invite to context job
      createNotification(workerUsername, 'invitation', selectedJobId, { 
        employerName: currentUser?.username, 
        message: `${currentUser?.username} invited you to apply to their job.` 
      }, 'details');
      alert(`Invitation sent to ${workerUsername}!`);
    } else {
      // Open Modal to select job
      setInviteModal({ isOpen: true, workerUsername });
    }
  };

  if (!currentUser) return null;

  const isWorker = currentUser.role === 'worker';
  const contextJob = selectedJobId ? jobs.find(j => j.id === selectedJobId) : null;

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
              Global Home Feed
            </h1>
          </div>
          <div className="flex items-center gap-3">
             <div className="text-sm text-gray-500 hidden sm:block">
               Logged in as <span className="font-bold text-gray-900">{currentUser.username}</span>
             </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-4 grid grid-cols-1 lg:grid-cols-4 gap-6">
        
        {/* MAIN CONTENT AREA */}
        <div className="lg:col-span-3 space-y-6 order-2 lg:order-1">
          
          {/* Context Banner */}
          {!isWorker && contextJob && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex justify-between items-center animate-in fade-in">
              <div>
                <p className="text-xs text-blue-600 font-bold uppercase">Finding workers for:</p>
                <h3 className="font-bold text-gray-900">{contextJob.title}</h3>
              </div>
              <button onClick={() => setSelectedJobId(null)} className="text-sm text-blue-600 hover:underline">
                Clear Context
              </button>
            </div>
          )}

          {/* Filters */}
          <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder={isWorker ? "Search jobs..." : "Search workers..."}
                  value={searchTerm}
                  onChange={e => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              <select 
                value={selectedCategory}
                onChange={e => setSelectedCategory(e.target.value as any)}
                className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto"
              >
                <option value="All">All Categories</option>
                {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              
              {isWorker ? (
                <input 
                  type="number" 
                  placeholder="Min Budget" 
                  value={minBudget}
                  onChange={e => setMinBudget(e.target.value)}
                  className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-32"
                />
              ) : (
                <>
                  <select 
                    value={minRating}
                    onChange={e => setMinRating(Number(e.target.value))}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto"
                  >
                    <option value="0">Any Rating</option>
                    <option value="3">3+ Stars</option>
                    <option value="4">4+ Stars</option>
                    <option value="4.5">4.5+ Stars</option>
                  </select>
                  <select 
                    value={availabilityFilter}
                    onChange={e => setAvailabilityFilter(e.target.value as any)}
                    className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-full md:w-auto"
                  >
                    <option value="all">Any Status</option>
                    <option value="available">Available Now</option>
                  </select>
                </>
              )}
            </div>
          </div>

          {/* LIST CONTENT */}
          {isWorker ? (
            <div className="grid gap-4 md:grid-cols-2">
              {filteredJobs.map(job => {
                let isMatch = false;
                if (myWorkerProfile) {
                  const skillMatch = myWorkerProfile.skills.some(s => job.category.toLowerCase().includes(s.toLowerCase()));
                  const regionMatch = myWorkerProfile.regions?.some(r => job.address.toLowerCase().includes(r.toLowerCase()));
                  isMatch = skillMatch || (regionMatch ?? false);
                }

                const myApp = job.applications?.find(a => a.workerUsername === currentUser.username);
                const isPerDay = job.priceBasis === 'per_day';
                const dailyRate = isPerDay ? Math.round(job.budget / job.daysToComplete) : null;
                const empTrust = calculateEmployerTrust(job.employerUsername);

                return (
                  <div 
                    key={job.id} 
                    onClick={() => setViewJob(job)}
                    className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-all cursor-pointer relative group"
                  >
                    <div className="absolute top-3 right-3 flex flex-col gap-1 items-end">
                       {isMatch && (
                         <span className="bg-green-100 text-green-700 text-[10px] font-bold px-2 py-0.5 rounded flex items-center gap-1">
                           <Sparkles size={10} /> Match
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
                          <span className="font-bold text-gray-900">
                            {isPerDay ? (
                              <span>{dailyRate} ₼ / day <span className="text-xs text-gray-400">· {job.daysToComplete} days (≈ {job.budget} ₼ total)</span></span>
                            ) : (
                              <span>{job.budget} ₼ total <span className="text-xs text-gray-400">(Est. {job.daysToComplete} days)</span></span>
                            )}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <MapPin size={14} className="text-gray-400" />
                        <span className="truncate">{job.address}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <UserIcon size={14} className="text-gray-400" />
                        <span className="truncate">{job.employerUsername}</span>
                        {empTrust > 70 && <span className="text-[10px] bg-blue-50 text-blue-700 px-1 rounded">Trusted</span>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {filteredJobs.length === 0 && <p className="text-gray-500 text-center col-span-2 py-10">No jobs found.</p>}
            </div>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredWorkers.map(worker => {
                const profile = workerProfiles.find(p => p.username === worker.username);
                const { score: trustScore } = calculateTrustScore(worker.username, 'worker');
                const isAvailable = profile?.availabilityStatus === 'available';
                const rating = getWorkerAverageRating(worker.username);

                return (
                  <div key={worker.username} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-all flex flex-col relative">
                    {/* Invite Button */}
                    <button 
                      onClick={() => handleInvite(worker.username)}
                      className="absolute top-4 right-4 p-2 bg-blue-50 text-blue-600 rounded-full hover:bg-blue-100 transition-colors"
                      title="Invite to Job"
                    >
                      <UserPlus size={16} />
                    </button>

                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-500">
                          <UserIcon size={24} />
                        </div>
                        <div>
                          <Link to={`/worker/${worker.username}`} className="font-bold text-gray-900 hover:text-blue-600 hover:underline">
                            {worker.username}
                          </Link>
                          <div className="flex items-center gap-2 mt-1">
                            {isAvailable ? (
                              <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">Available</span>
                            ) : (
                              <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">Busy</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="mb-3">
                      <div className="flex items-center gap-2 mb-2">
                        <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold flex items-center gap-0.5">
                          <ShieldCheck size={10} /> {trustScore}
                        </span>
                        {rating > 0 && (
                          <div className="flex items-center gap-1 text-xs font-bold text-amber-500">
                            <Star size={12} fill="currentColor" /> {rating.toFixed(1)}
                          </div>
                        )}
                      </div>
                      
                      {profile?.skills && profile.skills.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {profile.skills.slice(0, 3).map(s => (
                            <span key={s} className="text-xs bg-gray-50 text-gray-600 px-2 py-0.5 rounded">{s}</span>
                          ))}
                          {profile.skills.length > 3 && <span className="text-xs text-gray-400">+{profile.skills.length - 3}</span>}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400 italic">No skills listed</p>
                      )}
                    </div>
                    
                    <div className="mt-auto pt-3 border-t border-gray-100 flex gap-2">
                      <Link 
                        to={`/worker/${worker.username}`}
                        className="flex-1 text-center border border-gray-200 text-gray-600 text-xs font-bold py-2 rounded hover:bg-gray-50 w-full"
                      >
                        View Profile
                      </Link>
                    </div>
                  </div>
                );
              })}
              {filteredWorkers.length === 0 && <p className="text-gray-500 text-center col-span-full py-10">No workers found.</p>}
            </div>
          )}
        </div>

        {/* SIDEBAR */}
        <div className="lg:col-span-1 space-y-6 order-1 lg:order-2">
          {isWorker ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Briefcase size={18} className="text-blue-600" /> Top Employers
              </h3>
              <div className="space-y-3">
                {employers.slice(0, 5).map(emp => {
                  const { score } = calculateTrustScore(emp.username, 'employer');
                  const postedCount = jobs.filter(j => j.employerUsername === emp.username).length;
                  return (
                    <div key={emp.username} className="p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex justify-between items-start">
                        <span className="font-bold text-sm text-gray-900">{emp.username}</span>
                        <span className="text-xs font-bold text-green-600 bg-green-50 px-1.5 py-0.5 rounded">{score}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">{postedCount} jobs posted</p>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
              <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Briefcase size={18} className="text-blue-600" /> Your Recent Jobs
              </h3>
              <div className="space-y-3">
                {jobs.filter(j => j.employerUsername === currentUser.username).slice(0, 3).map(job => (
                  <div 
                    key={job.id} 
                    onClick={() => setSelectedJobId(selectedJobId === job.id ? null : job.id)}
                    className={`p-3 rounded-lg border cursor-pointer transition-all ${selectedJobId === job.id ? 'bg-blue-100 border-blue-300 ring-1 ring-blue-300' : 'bg-blue-50/50 border-blue-100 hover:bg-blue-100'}`}
                  >
                    <h4 className="font-bold text-sm text-gray-900 truncate">{job.title}</h4>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-xs text-gray-500">{job.status}</span>
                      <span className="text-xs font-bold text-blue-600">{job.applications?.length || 0} offers</span>
                    </div>
                    {selectedJobId === job.id && (
                      <p className="text-[10px] text-blue-700 mt-2 font-bold flex items-center gap-1">
                        <Sparkles size={10} /> Filtering workers for this job
                      </p>
                    )}
                  </div>
                ))}
                <Link to="/employer" className="block text-center text-xs text-blue-600 hover:underline mt-2">
                  Manage all jobs
                </Link>
              </div>
            </div>
          )}
        </div>

        {viewJob && (
          <JobDetailsModal 
            isOpen={!!viewJob}
            onClose={() => setViewJob(null)}
            job={viewJob}
            currentWorkerUsername={isWorker ? currentUser.username : undefined}
            viewerRole={currentUser.role as 'worker' | 'employer'}
            onOfferSent={handleOfferSent}
          />
        )}

        {inviteModal.isOpen && inviteModal.workerUsername && (
          <InviteWorkerModal 
            isOpen={inviteModal.isOpen}
            onClose={() => setInviteModal({ isOpen: false, workerUsername: null })}
            workerUsername={inviteModal.workerUsername}
            employerUsername={currentUser.username}
          />
        )}

      </div>
    </div>
  );
}
