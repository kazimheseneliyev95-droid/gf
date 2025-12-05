import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { LogOut, Briefcase, Plus, Trash2, User, ChevronDown, ChevronUp, CheckCircle, Star, PlayCircle, CheckSquare, Heart, MessageSquare, Home, AlertTriangle, Map, List, Gavel, Edit2, Layout, DollarSign } from 'lucide-react';
import { JobPost, JOB_STORAGE_KEY, WorkerReview, REVIEW_STORAGE_KEY, FavoriteWorker, FAVORITE_WORKERS_KEY } from './types';
import NotificationCenter from './components/NotificationCenter';
import ChatPanel from './components/ChatPanel';
import { createNotification, getWorkerAverageRating } from './utils';

import { getBadges, getRecommendedWorkers, calculateEmployerTrust, logActivity, getLowestBid, calculateWorkerQuality } from './utils/advancedFeatures';
import { isWorkerAvailable, getDistance } from './utils/advancedAnalytics';
import { isFeatureEnabled } from './utils/featureFlags';

import GamificationBadges from './components/GamificationBadges';
import DisputeModal from './components/DisputeModal';
import WorkerComparisonModal from './components/WorkerComparisonModal';
import RiskAlert from './components/RiskAlert';
import PremiumBadge from './components/PremiumBadge';
import BehaviorScore from './components/BehaviorScore';
import EditJobModal from './components/EditJobModal';
import EmployerProfileModal from './components/EmployerProfileModal';
import CreateJobModal from './components/CreateJobModal';
import TrustScoreDisplay from './components/TrustScoreDisplay';

export default function EmployerPanel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<{ username: string, hasCompletedOnboarding?: boolean } | null>(null);
  
  // Data State
  const [myJobs, setMyJobs] = useState<JobPost[]>([]);
  const [favorites, setFavorites] = useState<(FavoriteWorker & { rating: number, quality: number })[]>([]);
  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);
  const [activeChatJobId, setActiveChatJobId] = useState<string | null>(null);
  const [activeChatWorker, setActiveChatWorker] = useState<string | null>(null);

  const [suggestedWorkers, setSuggestedWorkers] = useState<{ username: string, score: number, matchReason: string }[]>([]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'open' | 'processing' | 'completed'>('all');
  
  const [offerPriceMax, setOfferPriceMax] = useState<string>('');
  const [offerRatingMin, setOfferRatingMin] = useState<string>('');

  const [stats, setStats] = useState({ posted: 0, completed: 0, avgSpend: 0, open: 0 });
  const [badges, setBadges] = useState<any[]>([]);

  const showComparison = isFeatureEnabled('workerComparisonView');
  const showAvail = isFeatureEnabled('smartAvailabilityMatching');
  const showLoc = isFeatureEnabled('locationDistanceMatching');
  const showPremium = isFeatureEnabled('premiumBadges');
  const showBehavior = isFeatureEnabled('behaviorMonitoring');
  const showAuction = isFeatureEnabled('auctionMode');

  // Modals
  const [disputeModal, setDisputeModal] = useState<{isOpen: boolean, jobId: string, against: string}>({
    isOpen: false, jobId: '', against: ''
  });
  const [comparisonModal, setComparisonModal] = useState<{isOpen: boolean, job: JobPost | null}>({
    isOpen: false, job: null
  });
  const [editJobModal, setEditJobModal] = useState<{isOpen: boolean, job: JobPost | null}>({
    isOpen: false, job: null
  });
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const [createJobModalOpen, setCreateJobModalOpen] = useState(false);

  const [ratingModal, setRatingModal] = useState<{ isOpen: boolean, jobId: string | null, workerUsername: string | null }>({
    isOpen: false, jobId: null, workerUsername: null
  });
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  const [success, setSuccess] = useState('');

  const [checklistReviewJob, setChecklistReviewJob] = useState<JobPost | null>(null);

  useEffect(() => {
    const sessionStr = localStorage.getItem('currentUser');
    if (!sessionStr) {
      navigate('/');
      return;
    }
    try {
      const user = JSON.parse(sessionStr);
      if (user.role !== 'employer') {
        navigate('/');
        return;
      }
      setCurrentUser(user);
      loadMyJobs(user.username);
      loadFavorites(user.username);
      setBadges(getBadges(user.username, 'employer'));
    } catch (e) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    const jobId = searchParams.get('jobId');
    const section = searchParams.get('section');

    if (jobId) {
      setExpandedJobId(jobId);
      setSuggestedWorkers(getRecommendedWorkers(jobId));
      
      setTimeout(() => {
        const element = document.getElementById(`job-${jobId}`);
        if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 300);

      if (section === 'chat') {
        setActiveChatJobId(jobId);
      } else {
        setActiveChatJobId(null);
      }
    }
  }, [searchParams, myJobs.length]);

  const loadMyJobs = (username: string) => {
    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (allJobsStr) {
      let allJobs: JobPost[] = JSON.parse(allJobsStr);
      
      allJobs = allJobs.map(job => ({
        ...job,
        status: job.status || 'open',
        category: job.category || 'Other',
        description: job.description || '',
        applications: (job.applications || []).map(app => ({
          ...app,
          status: app.status || 'pending'
        }))
      }));

      const filtered = allJobs.filter(j => j.employerUsername === username);
      setMyJobs(filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));

      const completedJobs = filtered.filter(j => j.status === 'completed');
      const openJobs = filtered.filter(j => j.status === 'open');
      let totalSpend = 0;
      completedJobs.forEach(j => {
        const acceptedApp = j.applications.find(a => a.status === 'accepted');
        if (acceptedApp) totalSpend += acceptedApp.offeredPrice;
      });

      setStats({
        posted: filtered.length,
        completed: completedJobs.length,
        avgSpend: completedJobs.length ? totalSpend / completedJobs.length : 0,
        open: openJobs.length
      });
    }
  };

  const loadFavorites = (username: string) => {
    const allFavsStr = localStorage.getItem(FAVORITE_WORKERS_KEY);
    if (allFavsStr) {
      const allFavs: FavoriteWorker[] = JSON.parse(allFavsStr);
      const myFavs = allFavs.filter(f => f.employerUsername === username);
      
      const enrichedFavs = myFavs.map(f => ({
        ...f,
        rating: getWorkerAverageRating(f.workerUsername),
        quality: calculateWorkerQuality(f.workerUsername)
      }));
      
      setFavorites(enrichedFavs);
    }
  };

  const handleDeleteJob = (id: string) => {
    if (!confirm('Delete this job post?')) return;
    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (allJobsStr) {
      const allJobs: JobPost[] = JSON.parse(allJobsStr);
      const updated = allJobs.filter(j => j.id !== id);
      localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(updated));
      setMyJobs(myJobs.filter(j => j.id !== id));
      logActivity(currentUser!.username, 'employer', 'JOB_DELETED', { jobId: id });
    }
  };

  const handleAcceptOffer = (jobId: string, applicationId: string, workerUsername: string) => {
    if (!confirm(`Accept offer from ${workerUsername}? This will reject other offers and start the job.`)) return;

    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (!allJobsStr) return;

    const allJobs: JobPost[] = JSON.parse(allJobsStr);
    const jobIndex = allJobs.findIndex(j => j.id === jobId);

    if (jobIndex === -1) return;

    if (!allJobs[jobIndex].applications) allJobs[jobIndex].applications = [];

    allJobs[jobIndex].status = 'processing';
    allJobs[jobIndex].assignedWorkerUsername = workerUsername;

    allJobs[jobIndex].applications = allJobs[jobIndex].applications.map(app => {
      if (app.id === applicationId) {
        return { ...app, status: 'accepted' };
      } else {
        return { ...app, status: app.status === 'pending' ? 'rejected' : app.status };
      }
    });

    localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(allJobs));
    
    logActivity(currentUser!.username, 'employer', 'OFFER_ACCEPTED', { jobId, workerUsername });

    if (currentUser) loadMyJobs(currentUser.username);
    createNotification(workerUsername, 'offerAccepted', jobId, { employerName: currentUser?.username }, 'details');
  };

  const handleRejectOffer = (jobId: string, applicationId: string, workerUsername: string) => {
    if (!confirm("Reject this offer?")) return;

    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (!allJobsStr) return;

    const allJobs: JobPost[] = JSON.parse(allJobsStr);
    const jobIndex = allJobs.findIndex(j => j.id === jobId);

    if (jobIndex === -1) return;

    if (!allJobs[jobIndex].applications) allJobs[jobIndex].applications = [];

    const appIndex = allJobs[jobIndex].applications.findIndex(a => a.id === applicationId);
    if (appIndex !== -1) {
      allJobs[jobIndex].applications[appIndex].status = 'rejected';
      localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(allJobs));
      
      logActivity(currentUser!.username, 'employer', 'OFFER_REJECTED', { jobId, workerUsername });

      if (currentUser) loadMyJobs(currentUser.username);
      createNotification(workerUsername, 'offerRejected', jobId, { employerName: currentUser?.username }, 'details');
    }
  };

  const handleCompleteJob = (jobId: string, workerUsername: string) => {
    const job = myJobs.find(j => j.id === jobId);
    if (job?.completionChecklist?.worker?.workCompleted) {
      setChecklistReviewJob(job);
      return;
    }

    if (!confirm("Mark this job as completed? You will be asked to rate the worker.")) return;
    finalizeCompletion(jobId, workerUsername);
  };

  const finalizeCompletion = (jobId: string, workerUsername: string) => {
    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (!allJobsStr) return;

    const allJobs: JobPost[] = JSON.parse(allJobsStr);
    const jobIndex = allJobs.findIndex(j => j.id === jobId);

    if (jobIndex === -1) return;

    allJobs[jobIndex].status = 'completed';
    allJobs[jobIndex].completedAt = new Date().toISOString();

    if (allJobs[jobIndex].completionChecklist) {
      allJobs[jobIndex].completionChecklist!.employer = { confirmed: true };
    }

    localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(allJobs));
    
    logActivity(currentUser!.username, 'employer', 'JOB_COMPLETED', { jobId, workerUsername });

    if (currentUser) loadMyJobs(currentUser.username);
    setChecklistReviewJob(null);

    setRatingModal({ isOpen: true, jobId, workerUsername });
    setRatingValue(0);
    setRatingComment('');
  };

  const handleSubmitReview = () => {
    if (!currentUser || !ratingModal.jobId || !ratingModal.workerUsername) return;
    if (ratingValue === 0) {
      alert("Please select a star rating.");
      return;
    }

    const newReview: WorkerReview = {
      id: crypto.randomUUID(),
      workerUsername: ratingModal.workerUsername,
      employerUsername: currentUser.username,
      jobId: ratingModal.jobId,
      rating: ratingValue,
      comment: ratingComment,
      createdAt: new Date().toISOString()
    };

    const allReviewsStr = localStorage.getItem(REVIEW_STORAGE_KEY);
    const allReviews: WorkerReview[] = allReviewsStr ? JSON.parse(allReviewsStr) : [];
    allReviews.push(newReview);
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(allReviews));

    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (allJobsStr) {
      const allJobs: JobPost[] = JSON.parse(allJobsStr);
      const jobIndex = allJobs.findIndex(j => j.id === ratingModal.jobId);
      if (jobIndex !== -1) {
        allJobs[jobIndex].reviewed = true;
        localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(allJobs));
      }
    }

    logActivity(currentUser.username, 'employer', 'REVIEW_LEFT', { jobId: ratingModal.jobId, rating: ratingValue });

    if (currentUser) loadMyJobs(currentUser.username);
    setRatingModal({ isOpen: false, jobId: null, workerUsername: null });
    setSuccess("Review submitted successfully!");
    setTimeout(() => setSuccess(''), 3000);
  };

  const toggleApplications = (jobId: string) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
    } else {
      setExpandedJobId(jobId);
      setSuggestedWorkers(getRecommendedWorkers(jobId));
    }
    setOfferPriceMax('');
    setOfferRatingMin('');
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  if (!currentUser) return null;

  const filteredJobs = myJobs.filter(j => filterStatus === 'all' || j.status === filterStatus);

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-20 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Briefcase className="text-blue-600" />
                Employer Panel
              </h1>
              <div className="flex items-center gap-2 mt-1 text-sm">
                <p className="text-gray-500">
                  Welcome, <span className="font-semibold text-blue-600">{currentUser.username}</span>
                </p>
                <span className="text-gray-300">|</span>
                <Link to="/home" className="text-gray-600 hover:text-blue-600 font-medium flex items-center gap-1">
                  <Home size={14} /> Home Feed
                </Link>
                <span className="text-gray-300">|</span>
                <button 
                  onClick={() => setProfileModalOpen(true)}
                  className="text-blue-600 hover:underline font-medium"
                >
                  Profile
                </button>
                <span className="text-gray-300">|</span>
                <GamificationBadges badges={badges} />
                <PremiumBadge username={currentUser.username} role="employer" />
                {showBehavior && <BehaviorScore username={currentUser.username} role="employer" />}
                <TrustScoreDisplay username={currentUser.username} role="employer" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setCreateJobModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg transition-colors shadow-sm"
            >
              <Plus size={18} /> Post New Job
            </button>
            <NotificationCenter username={currentUser.username} />
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {/* Stats Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-blue-100 p-3 rounded-full text-blue-600"><Briefcase size={24} /></div>
            <div>
              <p className="text-sm text-gray-500">Jobs Posted</p>
              <p className="text-2xl font-bold text-gray-900">{stats.posted}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-green-100 p-3 rounded-full text-green-600"><CheckSquare size={24} /></div>
            <div>
              <p className="text-sm text-gray-500">Jobs Completed</p>
              <p className="text-2xl font-bold text-gray-900">{stats.completed}</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-purple-100 p-3 rounded-full text-purple-600"><DollarSign size={24} /></div>
            <div>
              <p className="text-sm text-gray-500">Avg Spend</p>
              <p className="text-2xl font-bold text-gray-900">{stats.avgSpend.toFixed(0)} ₼</p>
              <p className="text-[10px] text-gray-400">per job</p>
            </div>
          </div>
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="bg-amber-100 p-3 rounded-full text-amber-600"><Layout size={24} /></div>
            <div>
              <p className="text-sm text-gray-500">Open Jobs</p>
              <p className="text-2xl font-bold text-gray-900">{stats.open}</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* LEFT COLUMN: Favorites */}
          <div className="lg:col-span-1 space-y-6">
            
            {/* Favorites List */}
            <div className="bg-white rounded-xl shadow-sm p-6 border border-gray-200">
              <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Heart className="text-red-500" size={20} fill="currentColor" /> Favorite Workers
              </h2>
              {favorites.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-4">No favorites yet.</p>
              ) : (
                <div className="space-y-3">
                  {favorites.map(fav => (
                    <div key={fav.workerUsername} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-white rounded-full flex items-center justify-center text-gray-500 border border-gray-200">
                          <User size={16} />
                        </div>
                        <div>
                          <Link to={`/worker/${fav.workerUsername}`} className="font-bold text-gray-900 text-sm hover:text-blue-600 hover:underline">
                            {fav.workerUsername}
                          </Link>
                          <div className="flex items-center gap-2 text-xs text-gray-500">
                            {fav.rating > 0 && (
                              <span className="text-amber-500 flex items-center gap-0.5">
                                <Star size={10} fill="currentColor" /> {fav.rating.toFixed(1)}
                              </span>
                            )}
                            <span className="text-green-600 font-semibold">{fav.quality}% Qual.</span>
                          </div>
                        </div>
                      </div>
                      <Link to={`/worker/${fav.workerUsername}`} className="text-xs bg-white border border-gray-200 px-2 py-1 rounded text-gray-600 hover:text-blue-600 hover:border-blue-200">
                        Profile
                      </Link>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* RIGHT COLUMN: My Jobs List */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">My Posted Jobs</h2>
              <div className="flex gap-2">
                {[
                  { id: 'all', label: 'All' },
                  { id: 'open', label: `Open (${stats.open})` },
                  { id: 'processing', label: 'Processing' },
                  { id: 'completed', label: 'Completed' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setFilterStatus(tab.id as any)}
                    className={`px-3 py-1 text-xs font-medium rounded-full capitalize transition-colors ${
                      filterStatus === tab.id 
                        ? 'bg-blue-600 text-white' 
                        : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {success && <p className="text-xs text-green-600 bg-green-50 p-2 rounded border border-green-100">{success}</p>}

            {filteredJobs.length === 0 ? (
              <div className="bg-white rounded-xl p-12 text-center border-2 border-dashed border-gray-200 text-gray-500">
                {filterStatus === 'open' && "You have no open jobs. Post a new job to receive offers."}
                {filterStatus === 'processing' && "No jobs in progress right now."}
                {filterStatus === 'completed' && "No completed jobs yet."}
                {filterStatus === 'all' && "No jobs found."}
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredJobs.map((job) => (
                  <div key={job.id} id={`job-${job.id}`} className={`bg-white rounded-xl shadow-sm border overflow-hidden transition-all ${
                    job.status === 'completed' ? 'border-gray-200 opacity-90' : 
                    job.status === 'processing' ? 'border-blue-200 ring-1 ring-blue-100' : 'border-gray-100'
                  }`}>
                    <div className="p-5">
                      <div className="flex justify-between items-start">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-bold text-gray-900 text-lg">{job.title}</h3>
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{job.category}</span>
                            {job.isAuction && showAuction && (
                              <span className="bg-purple-100 text-purple-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 border border-purple-200">
                                <Gavel size={10} /> Auction
                              </span>
                            )}
                            {job.status === 'processing' && (
                              <span className="bg-blue-100 text-blue-700 text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                <PlayCircle size={10} /> Processing
                              </span>
                            )}
                            {job.status === 'completed' && (
                              <span className="bg-gray-100 text-gray-600 text-[10px] font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1">
                                <CheckSquare size={10} /> Completed
                              </span>
                            )}
                          </div>
                          <div className="text-blue-600 font-bold text-xl mt-1">
                            {job.isAuction ? 'Open Bidding' : `${job.budget} ₼`}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            onClick={() => setEditJobModal({ isOpen: true, job })}
                            className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Job"
                          >
                            <Edit2 size={18} />
                          </button>
                          <button onClick={() => handleDeleteJob(job.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                            <Trash2 size={18} />
                          </button>
                        </div>
                      </div>
                      
                      <p className="text-sm text-gray-600 mt-2 line-clamp-2">{job.description}</p>

                      <div className="flex gap-4 mt-3 text-sm text-gray-600">
                        <span className="flex items-center gap-1"><MapPin size={14} /> {job.address}</span>
                        <span className="flex items-center gap-1"><Clock size={14} /> {job.daysToComplete} days</span>
                        {job.materials && job.materials !== 'none' && (
                          <span className="flex items-center gap-1 text-xs bg-gray-100 px-2 py-0.5 rounded">
                            Materials: {job.materials === 'by_employer' ? 'Employer' : 'Worker'}
                          </span>
                        )}
                      </div>

                      {/* Job Actions */}
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <button 
                            onClick={() => toggleApplications(job.id)}
                            className={`flex items-center gap-2 text-sm font-medium transition-colors ${
                              job.applications.length > 0 || job.status === 'open' ? 'text-blue-600 hover:text-blue-800' : 'text-gray-400'
                            }`}
                          >
                            {expandedJobId === job.id ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                            {job.applications.length > 0 
                              ? `View ${job.applications.length} Offer${job.applications.length !== 1 ? 's' : ''}` 
                              : 'Manage & Suggestions'}
                          </button>
                          
                          {(job.status === 'processing' || job.status === 'completed') && job.assignedWorkerUsername && (
                            <ChatPanel 
                              jobId={job.id} 
                              currentUsername={currentUser.username} 
                              otherUsername={job.assignedWorkerUsername} 
                              currentUserRole="employer"
                              jobTitle={job.title}
                              forceOpen={activeChatJobId === job.id}
                            />
                          )}

                          {(job.status === 'processing' || job.status === 'completed') && job.assignedWorkerUsername && (
                            <button 
                              onClick={() => setDisputeModal({ isOpen: true, jobId: job.id, against: job.assignedWorkerUsername! })}
                              className="text-red-500 hover:text-red-700 p-2 flex items-center gap-1 text-xs font-bold"
                              title="Report a Problem"
                            >
                              <AlertTriangle size={16} /> Report Problem
                            </button>
                          )}
                        </div>

                        {job.status === 'processing' && job.assignedWorkerUsername && (
                          <button
                            onClick={() => handleCompleteJob(job.id, job.assignedWorkerUsername!)}
                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg flex items-center gap-1 transition-colors shadow-sm"
                          >
                            <CheckSquare size={14} /> 
                            {job.completionChecklist?.worker?.workCompleted ? 'Review Completion' : 'Mark as Completed'}
                          </button>
                        )}
                        
                        {job.status === 'completed' && job.reviewed && (
                          <span className="text-xs text-amber-600 font-medium flex items-center gap-1">
                            <Star size={12} fill="currentColor" /> Review Submitted
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Expanded Area: Offers & Suggestions */}
                    {expandedJobId === job.id && (
                      <div className="bg-gray-50 border-t border-gray-100 p-4 animate-in slide-in-from-top-2">
                        
                        {job.status === 'open' && (
                          <div className="mb-6">
                            <h4 className="text-xs font-bold text-purple-700 uppercase tracking-wider mb-3 flex items-center gap-2">
                              <Star size={12} /> Suggested Workers
                            </h4>
                            {suggestedWorkers.length === 0 ? (
                              <p className="text-xs text-gray-500 italic">No suggestions found.</p>
                            ) : (
                              <div className="flex gap-3 overflow-x-auto pb-2">
                                {suggestedWorkers.map(w => (
                                  <div key={w.username} className="min-w-[200px] bg-white p-3 rounded-lg border border-purple-100 shadow-sm">
                                    <div className="flex justify-between items-start">
                                      <Link to={`/worker/${w.username}`} className="font-bold text-gray-900 text-sm hover:text-blue-600 hover:underline">
                                        {w.username}
                                      </Link>
                                      <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">{w.score.toFixed(0)}% Match</span>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-1">{w.matchReason}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        )}

                        <div className="flex justify-between items-center mb-3">
                          <div className="flex items-center gap-3">
                            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider">Worker Offers</h4>
                            {job.isAuction && showAuction && (
                              <span className="text-xs font-bold text-purple-600 bg-purple-50 px-2 py-0.5 rounded border border-purple-100">
                                Best Offer: {getLowestBid(job) || '-'} ₼
                              </span>
                            )}
                          </div>
                          <div className="flex gap-2 items-center">
                            {showComparison && job.applications.length > 1 && (
                              <button 
                                onClick={() => setComparisonModal({ isOpen: true, job })}
                                className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold flex items-center gap-1 hover:bg-blue-200 mr-2"
                              >
                                <List size={12} /> Compare
                              </button>
                            )}
                            <input 
                              type="number" 
                              placeholder="Max Price" 
                              value={offerPriceMax}
                              onChange={e => setOfferPriceMax(e.target.value)}
                              className="w-20 px-2 py-1 text-xs border border-gray-200 rounded"
                            />
                            <input 
                              type="number" 
                              placeholder="Min Rating" 
                              value={offerRatingMin}
                              onChange={e => setOfferRatingMin(e.target.value)}
                              className="w-20 px-2 py-1 text-xs border border-gray-200 rounded"
                            />
                          </div>
                        </div>

                        {job.applications.length === 0 ? (
                          <p className="text-sm text-gray-500 italic text-center py-2">No workers have sent offers yet.</p>
                        ) : (
                          <div className="space-y-3">
                            {job.applications
                              .filter(app => {
                                if (offerPriceMax && app.offeredPrice > Number(offerPriceMax)) return false;
                                if (offerRatingMin) {
                                  const rating = getWorkerAverageRating(app.workerUsername);
                                  if (rating < Number(offerRatingMin)) return false;
                                }
                                return true;
                              })
                              .sort((a, b) => {
                                if (showAvail) {
                                  const aAvail = isWorkerAvailable(a.workerUsername);
                                  const bAvail = isWorkerAvailable(b.workerUsername);
                                  if (aAvail && !bAvail) return -1;
                                  if (!aAvail && bAvail) return 1;
                                }
                                if (showLoc) {
                                  const aDist = getDistance(a.workerUsername, job.address);
                                  const bDist = getDistance(b.workerUsername, job.address);
                                  return aDist - bDist;
                                }
                                if (job.isAuction && showAuction) {
                                  return a.offeredPrice - b.offeredPrice;
                                }
                                return 0;
                              })
                              .map((app) => {
                                const isAvail = showAvail ? isWorkerAvailable(app.workerUsername) : false;
                                const dist = showLoc ? getDistance(app.workerUsername, job.address) : 0;

                                return (
                                  <div key={app.id} className={`bg-white p-4 rounded-lg border shadow-sm flex flex-col sm:flex-row justify-between items-center gap-4 ${
                                    app.status === 'accepted' ? 'border-green-200 ring-1 ring-green-100' : 'border-gray-200'
                                  } ${app.status === 'rejected' ? 'opacity-60 bg-gray-50' : ''}`}>
                                    
                                    <div className="flex items-center gap-3 w-full sm:w-auto">
                                      <div className={`p-2 rounded-full ${
                                        app.status === 'accepted' ? 'bg-green-100 text-green-600' : 'bg-amber-100 text-amber-600'
                                      }`}>
                                        <User size={16} />
                                      </div>
                                      <div>
                                        <div className="flex items-center gap-2">
                                          <Link 
                                            to={`/worker/${app.workerUsername}`}
                                            className="text-sm font-bold text-gray-900 hover:text-blue-600 hover:underline"
                                          >
                                            {app.workerUsername}
                                          </Link>
                                          {showPremium && <PremiumBadge username={app.workerUsername} role="worker" />}
                                          {showBehavior && <BehaviorScore username={app.workerUsername} role="worker" />}
                                          
                                          {app.status === 'accepted' && <span className="text-[10px] bg-green-100 text-green-700 px-1.5 py-0.5 rounded font-bold">ACCEPTED</span>}
                                          {app.status === 'rejected' && <span className="text-[10px] bg-red-100 text-red-700 px-1.5 py-0.5 rounded font-bold">REJECTED</span>}
                                        </div>
                                        <div className="flex items-center gap-2 text-xs text-gray-500 mt-0.5">
                                          <span>{new Date(app.createdAt).toLocaleString()}</span>
                                          {showAvail && (
                                            <span className={`px-1.5 py-0.5 rounded font-bold ${isAvail ? 'bg-green-50 text-green-600' : 'bg-gray-100 text-gray-400'}`}>
                                              {isAvail ? 'Available' : 'Busy'}
                                            </span>
                                          )}
                                          {showLoc && (
                                            <span className="flex items-center gap-0.5 text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded">
                                              <Map size={10} /> ~{dist}km
                                            </span>
                                          )}
                                        </div>
                                        {app.message && <p className="text-xs text-gray-600 mt-1 italic">"{app.message}"</p>}
                                        {app.canMeetDeadline !== undefined && (
                                          <p className={`text-xs mt-1 font-medium ${app.canMeetDeadline ? 'text-green-600' : 'text-red-500'}`}>
                                            {app.canMeetDeadline ? '✓ Can meet deadline' : '⚠ Cannot meet deadline'}
                                          </p>
                                        )}
                                        <RiskAlert username={app.workerUsername} />
                                      </div>
                                    </div>

                                    <div className="flex items-center gap-4 w-full sm:w-auto justify-between sm:justify-end">
                                      <div className="text-right">
                                        <span className="block text-lg font-bold text-blue-600">{app.offeredPrice} ₼</span>
                                        <span className="text-[10px] text-gray-400 uppercase font-medium">Offer</span>
                                      </div>

                                      <div className="relative">
                                        <button 
                                          onClick={() => {
                                            setActiveChatJobId(job.id);
                                            setActiveChatWorker(app.workerUsername);
                                          }}
                                          className="p-2 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-full transition-colors"
                                          title={`Chat with ${app.workerUsername}`}
                                        >
                                          <MessageSquare size={18} />
                                        </button>
                                        {activeChatJobId === job.id && activeChatWorker === app.workerUsername && (
                                          <div className="absolute right-0 top-full mt-2 z-50">
                                            <ChatPanel 
                                              jobId={job.id} 
                                              currentUsername={currentUser.username} 
                                              otherUsername={app.workerUsername} 
                                              currentUserRole="employer"
                                              jobTitle={job.title}
                                              forceOpen={true}
                                            />
                                          </div>
                                        )}
                                      </div>

                                      {job.status === 'open' && app.status === 'pending' && (
                                        <div className="flex gap-2">
                                          <button
                                            onClick={() => handleRejectOffer(job.id, app.id, app.workerUsername)}
                                            className="bg-gray-100 hover:bg-red-100 text-gray-600 hover:text-red-600 text-xs font-bold px-3 py-2 rounded-lg transition-colors"
                                          >
                                            Reject
                                          </button>
                                          <button
                                            onClick={() => handleAcceptOffer(job.id, app.id, app.workerUsername)}
                                            className="bg-green-600 hover:bg-green-700 text-white text-xs font-bold px-3 py-2 rounded-lg transition-colors shadow-sm flex items-center gap-1"
                                          >
                                            <CheckCircle size={14} /> Accept
                                          </button>
                                        </div>
                                      )}
                                      
                                      {app.status === 'accepted' && (
                                        <div className="text-green-600 flex items-center gap-1 text-xs font-bold bg-green-50 px-3 py-2 rounded-lg">
                                          <CheckCircle size={14} /> Selected
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Checklist Review Modal */}
        {checklistReviewJob && (
          <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Review Completion</h3>
              <p className="text-sm text-gray-600 mb-4">
                Worker has marked this job as complete. Please review their checklist.
              </p>
              
              <div className="bg-gray-50 p-4 rounded-lg space-y-2 mb-4 border border-gray-100">
                {Object.entries(checklistReviewJob.completionChecklist?.worker || {}).map(([key, val]) => (
                  <div key={key} className="flex items-center gap-2">
                    {val ? <CheckCircle size={16} className="text-green-600" /> : <X size={16} className="text-red-400" />}
                    <span className="text-sm capitalize text-gray-700">{key.replace(/([A-Z])/g, ' $1')}</span>
                  </div>
                ))}
              </div>

              {checklistReviewJob.media?.after && checklistReviewJob.media.after.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-bold text-gray-700 mb-2">After Photos</p>
                  <div className="flex gap-2 overflow-x-auto">
                    {checklistReviewJob.media.after.map((m, i) => (
                      <div key={i} className="w-20 h-20 rounded bg-gray-100 overflow-hidden border border-gray-200">
                        <img src={m.url} alt="After" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button 
                  onClick={() => setChecklistReviewJob(null)}
                  className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => finalizeCompletion(checklistReviewJob.id, checklistReviewJob.assignedWorkerUsername!)}
                  className="flex-1 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700"
                >
                  Confirm & Complete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Rating Modal */}
        {ratingModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold text-gray-900 mb-2">Rate {ratingModal.workerUsername}</h3>
              <p className="text-sm text-gray-500 mb-6">Please rate your experience with this worker.</p>
              
              <div className="flex justify-center gap-2 mb-6">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => setRatingValue(star)}
                    className={`p-2 transition-transform hover:scale-110 focus:outline-none ${
                      star <= ratingValue ? 'text-amber-400' : 'text-gray-200'
                    }`}
                  >
                    <Star size={32} fill="currentColor" />
                  </button>
                ))}
              </div>

              <textarea
                placeholder="Write a short comment about the work..."
                value={ratingComment}
                onChange={(e) => setRatingComment(e.target.value)}
                className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none h-24 mb-6 bg-gray-50"
              />

              <div className="flex gap-3">
                <button
                  onClick={() => setRatingModal({ isOpen: false, jobId: null, workerUsername: null })}
                  className="flex-1 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSubmitReview}
                  className="flex-1 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-sm transition-colors shadow-sm"
                >
                  Submit Review
                </button>
              </div>
            </div>
          </div>
        )}

        <DisputeModal 
          isOpen={disputeModal.isOpen} 
          onClose={() => setDisputeModal({ ...disputeModal, isOpen: false })}
          jobId={disputeModal.jobId}
          openedBy={currentUser.username}
          againstUser={disputeModal.against}
          role="employer"
        />

        {comparisonModal.isOpen && comparisonModal.job && (
          <WorkerComparisonModal 
            isOpen={comparisonModal.isOpen}
            onClose={() => setComparisonModal({ isOpen: false, job: null })}
            job={comparisonModal.job}
            applications={comparisonModal.job.applications}
          />
        )}

        {editJobModal.isOpen && editJobModal.job && (
          <EditJobModal 
            isOpen={editJobModal.isOpen}
            onClose={() => setEditJobModal({ isOpen: false, job: null })}
            job={editJobModal.job}
            onSave={() => loadMyJobs(currentUser.username)}
            currentUser={currentUser.username}
          />
        )}

        <EmployerProfileModal 
          isOpen={profileModalOpen}
          onClose={() => setProfileModalOpen(false)}
          username={currentUser.username}
          currentUser={currentUser.username}
        />

        <CreateJobModal 
          isOpen={createJobModalOpen} 
          onClose={() => setCreateJobModalOpen(false)} 
          onSuccess={() => loadMyJobs(currentUser.username)}
          currentUser={currentUser.username}
        />

      </div>
    </div>
  );
}
