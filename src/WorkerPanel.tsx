import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  LogOut, HardHat, MapPin, DollarSign, Send, User, 
  CheckCircle, Clock as ClockIcon, Briefcase, 
  PlayCircle, CheckSquare, Search, Edit2, Save, 
  MessageSquare, Bookmark, AlertTriangle, Sparkles, Map, Gavel, Eye, Info, Home, Filter, Plus, X, HelpCircle, History
} from 'lucide-react';
import { 
  JobPost, JOB_STORAGE_KEY, JobApplication, JobCategory, 
  JOB_CATEGORIES, WORKER_PROFILE_KEY, WorkerProfileData, 
  REVIEW_STORAGE_KEY, WorkerReview, SAVED_JOBS_KEY, MediaItem, USERS_STORAGE_KEY, User as UserType,
  SavedSearch
} from './types';
import NotificationCenter from './components/NotificationCenter';
import ChatPanel from './components/ChatPanel';
import { createNotification } from './utils';
import { getConversationByJob } from './utils/chatManager';
import { getBadges, getRecommendedJobs, logActivity, getLowestBid, calculateProfileStrength, getSavedSearches, saveSearch } from './utils/advancedFeatures';
import { getDistance } from './utils/advancedAnalytics';
import { isFeatureEnabled } from './utils/featureFlags';

import GamificationBadges from './components/GamificationBadges';
import AvailabilityScheduler from './components/AvailabilityScheduler';
import DisputeModal from './components/DisputeModal';
import PremiumBadge from './components/PremiumBadge';
import CompletionModal from './components/CompletionModal';
import EmployerProfileModal from './components/EmployerProfileModal';
import JobDetailsModal from './components/JobDetailsModal';
import TrustScoreDisplay from './components/TrustScoreDisplay';
import ServiceLevelBadge from './components/ServiceLevelBadge';
import ActivityModal from './components/ActivityModal'; // RESTORED
import HelpModal from './components/HelpModal';
import JobStageStepper from './components/JobStageStepper'; // RESTORED: Multi-stage view

type Tab = 'available' | 'recommended' | 'saved' | 'offers' | 'progress' | 'completed';

export default function WorkerPanel() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [userFullData, setUserFullData] = useState<UserType | null>(null);
  const [availableJobs, setAvailableJobs] = useState<JobPost[]>([]);
  const [reviews, setReviews] = useState<WorkerReview[]>([]);
  
  const [activeTab, setActiveTab] = useState<Tab>('available');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  
  const [chatSession, setChatSession] = useState<{
    isOpen: boolean;
    jobId: string;
    partnerUsername: string;
    jobTitle: string;
  } | null>(null);

  const [applicationInputs, setApplicationInputs] = useState<{ [key: string]: { price: string, message: string, canMeetDeadline: boolean } }>({});

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | 'All'>('All');
  const [minBudget, setMinBudget] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>([]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState<WorkerProfileData>({ username: '', skills: [], regions: [], bio: '', availabilityStatus: 'available', hiddenJobIds: [] });
  const [skillInput, setSkillInput] = useState('');
  const [regionInput, setRegionInput] = useState('');
  const [validationErrors, setValidationErrors] = useState<{ bio?: string, skills?: string }>({});

  const [stats, setStats] = useState({ completed: 0, earned: 0, rating: 0, completedThisMonth: 0 });
  const [badges, setBadges] = useState<any[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<JobPost[]>([]);
  const [profileStrengthScore, setProfileStrengthScore] = useState(0);

  const [savedJobs, setSavedJobs] = useState<string[]>([]);

  const showLoc = isFeatureEnabled('locationDistanceMatching');
  const showPremium = isFeatureEnabled('premiumBadges');
  const showAuction = isFeatureEnabled('auctionMode');

  const [disputeModal, setDisputeModal] = useState<{isOpen: boolean, jobId: string, against: string}>({ isOpen: false, jobId: '', against: '' });
  const [completionModal, setCompletionModal] = useState<{isOpen: boolean, job: JobPost | null}>({ isOpen: false, job: null });
  const [employerProfileModal, setEmployerProfileModal] = useState<{isOpen: boolean, username: string | null}>({ isOpen: false, username: null });
  const [viewJobModal, setViewJobModal] = useState<{isOpen: boolean, job: JobPost | null}>({ isOpen: false, job: null });
  const [helpModalOpen, setHelpModalOpen] = useState(false);
  const [activityModalOpen, setActivityModalOpen] = useState(false); // RESTORED

  useEffect(() => {
    const sessionStr = localStorage.getItem('currentUser');
    if (!sessionStr) {
      navigate('/');
      return;
    }
    try {
      const user = JSON.parse(sessionStr);
      if (user.role !== 'worker') {
        navigate('/');
        return;
      }
      setCurrentUser(user);
      loadData(user.username);
      loadSavedJobs(user.username);
      setSavedSearches(getSavedSearches(user.username));
      
      const usersStr = localStorage.getItem(USERS_STORAGE_KEY);
      if (usersStr) {
        const users: UserType[] = JSON.parse(usersStr);
        const full = users.find(u => u.username === user.username);
        if (full) setUserFullData(full);
      }
    } catch (e) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    const jobId = searchParams.get('jobId');
    const section = searchParams.get('section');

    if (jobId && availableJobs.length > 0) {
      const job = availableJobs.find(j => j.id === jobId);
      if (job) {
        if (job.status === 'processing') setActiveTab('progress');
        else if (job.status === 'completed') setActiveTab('completed');
        else if (job.applications.some(a => a.workerUsername === currentUser?.username)) setActiveTab('offers');
        else setActiveTab('available');

        if (section === 'chat') {
          setChatSession({
            isOpen: true,
            jobId: job.id,
            partnerUsername: job.employerUsername,
            jobTitle: job.title
          });
        }

        setTimeout(() => {
          const element = document.getElementById(`job-${jobId}`);
          if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }, [searchParams, availableJobs, currentUser]);

  const loadData = (username: string) => {
    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (allJobsStr) {
      let allJobs: JobPost[] = JSON.parse(allJobsStr);
      setAvailableJobs(allJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      
      let completed = 0;
      let completedThisMonth = 0;
      let earned = 0;
      const now = new Date();
      
      allJobs.forEach(job => {
        if (job.status === 'completed' && job.assignedWorkerUsername === username) {
          completed++;
          const myApp = job.applications?.find(a => a.workerUsername === username && a.status === 'accepted');
          if (myApp) earned += myApp.offeredPrice;
          
          if (job.completedAt) {
            const completedDate = new Date(job.completedAt);
            if (completedDate.getMonth() === now.getMonth() && completedDate.getFullYear() === now.getFullYear()) {
              completedThisMonth++;
            }
          }
        }
      });

      const allReviewsStr = localStorage.getItem(REVIEW_STORAGE_KEY);
      let rating = 0;
      let myReviews: WorkerReview[] = [];
      if (allReviewsStr) {
        const allReviews: WorkerReview[] = JSON.parse(allReviewsStr);
        myReviews = allReviews.filter(r => r.workerUsername === username);
        setReviews(allReviews); 
        if (myReviews.length > 0) {
          rating = myReviews.reduce((sum, r) => sum + r.rating, 0) / myReviews.length;
        }
      }

      setStats({ completed, earned, rating, completedThisMonth });
      setBadges(getBadges(username, 'worker'));
      setRecommendedJobs(getRecommendedJobs(username));
    }

    const allProfilesStr = localStorage.getItem(WORKER_PROFILE_KEY);
    if (allProfilesStr) {
      const allProfiles: WorkerProfileData[] = JSON.parse(allProfilesStr);
      const myProfile = allProfiles.find(p => p.username === username);
      if (myProfile) {
        setProfileData({ ...myProfile, regions: myProfile.regions || [] });
      } else {
        setProfileData({ username, skills: [], regions: [], bio: '', availabilityStatus: 'available' });
      }
    }
    
    setProfileStrengthScore(calculateProfileStrength(username));
  };

  const loadSavedJobs = (username: string) => {
    const str = localStorage.getItem(SAVED_JOBS_KEY);
    if (str) {
      const allSaved: Record<string, string[]> = JSON.parse(str);
      setSavedJobs(allSaved[username] || []);
    }
  };

  const toggleSavedJob = (jobId: string) => {
    if (!currentUser) return;
    const newSaved = savedJobs.includes(jobId) 
      ? savedJobs.filter(id => id !== jobId)
      : [...savedJobs, jobId];
    
    setSavedJobs(newSaved);
    
    const str = localStorage.getItem(SAVED_JOBS_KEY);
    const allSaved: Record<string, string[]> = str ? JSON.parse(str) : {};
    allSaved[currentUser.username] = newSaved;
    localStorage.setItem(SAVED_JOBS_KEY, JSON.stringify(allSaved));
  };

  const handleSaveSearch = () => {
    if (!currentUser) return;
    const name = prompt("Name this search:");
    if (!name) return;
    
    const newSearch: SavedSearch = {
      id: crypto.randomUUID(),
      name,
      filters: { category: selectedCategory, minBudget, searchTerm }
    };
    
    saveSearch(currentUser.username, newSearch);
    setSavedSearches([...savedSearches, newSearch]);
  };

  const applySavedSearch = (search: SavedSearch) => {
    setSelectedCategory(search.filters.category as any);
    setMinBudget(search.filters.minBudget);
    setSearchTerm(search.filters.searchTerm);
  };

  const handleNotInterested = (jobId: string) => {
    if (!currentUser) return;
    const newHidden = [...(profileData.hiddenJobIds || []), jobId];
    const newProfile = { ...profileData, hiddenJobIds: newHidden };
    setProfileData(newProfile);
    
    const allProfilesStr = localStorage.getItem(WORKER_PROFILE_KEY);
    const allProfiles: WorkerProfileData[] = allProfilesStr ? JSON.parse(allProfilesStr) : [];
    const updated = allProfiles.filter(p => p.username !== currentUser.username);
    updated.push({ ...newProfile, username: currentUser.username });
    localStorage.setItem(WORKER_PROFILE_KEY, JSON.stringify(updated));
    
    loadData(currentUser.username); // Refresh recommendations
  };

  const handleInputChange = (jobId: string, field: 'price' | 'message' | 'canMeetDeadline', value: any) => {
    setApplicationInputs(prev => ({
      ...prev,
      [jobId]: {
        ...(prev[jobId] || { price: '', message: '', canMeetDeadline: true }),
        [field]: value
      }
    }));
  };

  const handleSendOffer = (jobId: string, employerUsername: string) => {
    if (!currentUser) return;
    const inputs = applicationInputs[jobId] || { price: '', message: '', canMeetDeadline: true };
    if (!inputs.price || Number(inputs.price) <= 0) {
      alert("Please enter a valid price.");
      return;
    }

    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (!allJobsStr) return;
    const allJobs: JobPost[] = JSON.parse(allJobsStr);
    const jobIndex = allJobs.findIndex(j => j.id === jobId);

    if (jobIndex === -1) return;
    const job = allJobs[jobIndex];
    
    if (job.status !== 'open') {
      alert("This job has already been taken or closed.");
      loadData(currentUser.username);
      return;
    }

    if (!job.applications) job.applications = [];
    const existingAppIndex = job.applications.findIndex(a => a.workerUsername === currentUser.username);
    
    if (job.isAuction && showAuction && existingAppIndex !== -1) {
      job.applications[existingAppIndex].offeredPrice = Number(inputs.price);
      if (inputs.message) job.applications[existingAppIndex].message = inputs.message;
      job.applications[existingAppIndex].createdAt = new Date().toISOString(); 
      logActivity(currentUser.username, 'worker', 'BID_UPDATED', { jobId, price: inputs.price });
      setSuccessMessage("Bid updated successfully!");
    } else {
      const newApplication: JobApplication = {
        id: crypto.randomUUID(),
        workerUsername: currentUser.username,
        offeredPrice: Number(inputs.price),
        message: inputs.message,
        createdAt: new Date().toISOString(),
        status: 'pending',
        canMeetDeadline: inputs.canMeetDeadline
      };
      job.applications.push(newApplication);
      logActivity(currentUser.username, 'worker', 'OFFER_SENT', { jobId, price: inputs.price });
      setSuccessMessage("Offer sent successfully!");
      createNotification(employerUsername, 'newOffer', jobId, { workerName: currentUser.username }, 'offers');
    }

    localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(allJobs));
    setApplicationInputs(prev => { const newState = { ...prev }; delete newState[jobId]; return newState; });
    loadData(currentUser.username);
    setTimeout(() => setSuccessMessage(null), 3000);
    setActiveTab('offers');
  };

  const handleSaveProfile = () => {
    if (!currentUser) return;
    const errors: { bio?: string, skills?: string } = {};
    let isValid = true;

    if (profileData.bio && profileData.bio.trim().length < 40) {
      errors.bio = "Please write a bit more about yourself (at least 40 characters).";
      isValid = false;
    }
    if (profileData.skills.length === 0) {
      errors.skills = "Add at least one skill.";
      isValid = false;
    }
    setValidationErrors(errors);
    if (!isValid) return;

    const allProfilesStr = localStorage.getItem(WORKER_PROFILE_KEY);
    const allProfiles: WorkerProfileData[] = allProfilesStr ? JSON.parse(allProfilesStr) : [];
    const updatedProfiles = allProfiles.filter(p => p.username !== currentUser.username);
    updatedProfiles.push({ ...profileData, username: currentUser.username });
    
    localStorage.setItem(WORKER_PROFILE_KEY, JSON.stringify(updatedProfiles));
    logActivity(currentUser.username, 'worker', 'PROFILE_UPDATED');
    setIsEditingProfile(false);
    loadData(currentUser.username); 
  };

  const addSkill = () => {
    const val = skillInput.trim();
    if (!val) return;
    if (profileData.skills.some(s => s.toLowerCase() === val.toLowerCase())) { setSkillInput(''); return; }
    setProfileData(prev => ({ ...prev, skills: [...prev.skills, val] }));
    setSkillInput('');
  };

  const addRegion = () => {
    const val = regionInput.trim();
    if (!val) return;
    if (profileData.regions?.some(r => r.toLowerCase() === val.toLowerCase())) { setRegionInput(''); return; }
    setProfileData(prev => ({ ...prev, regions: [...(prev.regions || []), val] }));
    setRegionInput('');
  };

  const handleCompleteJob = (checklist: any, media: MediaItem[]) => {
    if (!completionModal.job || !currentUser) return;
    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (!allJobsStr) return;
    const allJobs: JobPost[] = JSON.parse(allJobsStr);
    const jobIndex = allJobs.findIndex(j => j.id === completionModal.job!.id);

    if (jobIndex !== -1) {
      allJobs[jobIndex].completionChecklist = { worker: checklist, employer: undefined };
      if (!allJobs[jobIndex].media) allJobs[jobIndex].media = { before: [], after: [] };
      allJobs[jobIndex].media!.after = media;
      localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(allJobs));
      createNotification(allJobs[jobIndex].employerUsername, 'jobReminder', allJobs[jobIndex].id, { message: "Worker has completed the job. Please review." }, 'details');
      alert("Completion details submitted. Employer will review.");
      setCompletionModal({ isOpen: false, job: null });
      loadData(currentUser.username);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  const handleChatClose = () => {
    setChatSession(prev => prev ? { ...prev, isOpen: false } : null);
    if (searchParams.get('section') === 'chat') {
      const newParams = new URLSearchParams(searchParams);
      newParams.delete('section');
      setSearchParams(newParams, { replace: true });
    }
  };

  if (!currentUser) return null;

  const availableTabJobs = availableJobs.filter(job => {
    const hasApplied = job.applications?.some(app => app.workerUsername === currentUser.username);
    const isAssigned = !!job.assignedWorkerUsername;
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || job.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || job.category === selectedCategory;
    const matchesBudget = !minBudget || job.budget >= Number(minBudget);
    return job.status === 'open' && !hasApplied && !isAssigned && matchesSearch && matchesCategory && matchesBudget;
  });

  const savedTabJobs = availableJobs.filter(job => savedJobs.includes(job.id));
  const myOffersJobs = availableJobs.filter(job => job.applications?.some(app => app.workerUsername === currentUser.username));
  const inProgressJobs = availableJobs.filter(job => job.status === 'processing' && job.assignedWorkerUsername === currentUser.username);
  const completedJobs = availableJobs.filter(job => job.status === 'completed' && job.assignedWorkerUsername === currentUser.username);

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-20 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <HardHat className="text-blue-600" /> Worker Panel
              </h1>
              <div className="flex items-center gap-3 mt-1 text-sm">
                <p className="text-gray-500">Welcome, <span className="font-semibold text-blue-600">{currentUser.username}</span></p>
                <span className="text-gray-300">|</span>
                <Link to="/home" className="text-gray-600 hover:text-blue-600 font-medium flex items-center gap-1"><Home size={14} /> Home</Link>
                <span className="text-gray-300">|</span>
                <Link to="/inbox" className="text-gray-600 hover:text-purple-600 font-medium flex items-center gap-1"><MessageSquare size={14} /> Messages</Link>
                <span className="text-gray-300">|</span>
                <button onClick={() => setIsEditingProfile(true)} className={`font-medium hover:underline ${profileStrengthScore > 70 ? 'text-green-600' : 'text-yellow-600'}`}>
                  Profile ({profileStrengthScore}%)
                </button>
                <span className="text-gray-300">|</span>
                {profileData.availabilityStatus === 'available' ? (
                   <span className="text-green-700 text-xs font-bold bg-green-50 px-2 py-0.5 rounded-full border border-green-100">Available</span>
                ) : (
                   <span className="text-gray-600 text-xs font-bold bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">Busy</span>
                )}
                <TrustScoreDisplay username={currentUser.username} role="worker" />
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {/* RESTORED: Compact Activity Button */}
            <button onClick={() => setActivityModalOpen(true)} className="p-2 text-gray-400 hover:text-blue-600" title="Recent Activity">
              <History size={20} />
            </button>
            <button onClick={() => setHelpModalOpen(true)} className="p-2 text-gray-400 hover:text-blue-600"><HelpCircle size={20} /></button>
            <NotificationCenter username={currentUser.username} />
            <button onClick={() => setIsEditingProfile(true)} className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-full"><Edit2 size={20} /></button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg"><LogOut size={16} /> Logout</button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="bg-green-100 p-2.5 rounded-full text-green-600"><CheckSquare size={20} /></div>
              <div><p className="text-xs text-gray-500 font-medium">Jobs Done</p><p className="text-xl font-bold text-gray-900">{stats.completed}</p></div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="bg-blue-100 p-2.5 rounded-full text-blue-600"><DollarSign size={20} /></div>
              <div><p className="text-xs text-gray-500 font-medium">Earned</p><p className="text-xl font-bold text-gray-900">{stats.earned} ₼</p></div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="bg-amber-100 p-2.5 rounded-full text-amber-600"><Sparkles size={20} /></div>
              <div><p className="text-xs text-gray-500 font-medium">Rating</p><p className="text-xl font-bold text-gray-900">{reviews.length > 0 ? stats.rating.toFixed(1) : '-'}</p></div>
            </div>
          </div>
          <div className="lg:col-span-1 space-y-4">
            <AvailabilityScheduler username={currentUser.username} />
            {/* ActivityTimeline removed from here, moved to modal */}
          </div>
        </div>

        {successMessage && <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-center shadow-sm">{successMessage}</div>}

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {[
              { id: 'available', label: 'Available', icon: Search, count: availableTabJobs.length },
              { id: 'recommended', label: 'For You', icon: Sparkles, count: recommendedJobs.length },
              { id: 'saved', label: 'Saved', icon: Bookmark, count: savedTabJobs.length },
              { id: 'offers', label: 'My Offers', icon: Briefcase, count: myOffersJobs.length },
              { id: 'progress', label: 'In Progress', icon: PlayCircle, count: inProgressJobs.length },
              { id: 'completed', label: 'Completed', icon: CheckSquare, count: completedJobs.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex-1 min-w-[100px] py-4 text-sm font-medium flex items-center justify-center gap-2 relative ${activeTab === tab.id ? 'text-blue-600 bg-blue-50/30' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                <tab.icon size={16} /> {tab.label}
                {tab.count > 0 && <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'}`}>{tab.count}</span>}
                {activeTab === tab.id && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />}
              </button>
            ))}
          </div>

          <div className="p-6 bg-gray-50/50 min-h-[400px]">
            {(activeTab === 'available' || activeTab === 'recommended') && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-col gap-3 shadow-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                      <Filter size={16} /> Filters
                    </div>
                    <div className="flex gap-2">
                      {savedSearches.map(s => (
                        <button key={s.id} onClick={() => applySavedSearch(s)} className="text-xs bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded border border-gray-300">
                          {s.name}
                        </button>
                      ))}
                      <button onClick={handleSaveSearch} className="text-xs text-blue-600 hover:underline">Save Search</button>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                    <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none" />
                    <select value={selectedCategory} onChange={(e) => setSelectedCategory(e.target.value as any)} className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none">
                      <option value="All">All Categories</option>
                      {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input type="number" placeholder="Min Budget" value={minBudget} onChange={(e) => setMinBudget(e.target.value)} className="w-28 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm outline-none" />
                  </div>
                </div>

                {(activeTab === 'available' ? availableTabJobs : recommendedJobs).length === 0 ? (
                  <div className="text-center py-12 text-gray-500"><Search size={48} className="mx-auto text-gray-300 mb-3" /><p>No jobs found.</p></div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {(activeTab === 'available' ? availableTabJobs : recommendedJobs).map(job => {
                      const inputs = applicationInputs[job.id] || { price: '', message: '', canMeetDeadline: true };
                      const isSaved = savedJobs.includes(job.id);
                      const myApp = job.applications?.find(a => a.workerUsername === currentUser.username);

                      return (
                        <div key={job.id} id={`job-${job.id}`} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 hover:shadow-md transition-all relative">
                          <div className="flex justify-between items-start mb-2">
                            <div>
                              <h3 className="font-bold text-gray-900">{job.title}</h3>
                              <div className="flex gap-2 mt-1">
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{job.category}</span>
                                {activeTab === 'recommended' && <span className="text-[10px] bg-green-100 text-green-700 px-2 py-0.5 rounded font-bold flex items-center gap-1"><Sparkles size={10} /> Recommended</span>}
                              </div>
                            </div>
                            <div className="flex gap-2">
                              {activeTab === 'recommended' && (
                                <button onClick={() => handleNotInterested(job.id)} className="p-1.5 text-gray-400 hover:text-red-500" title="Not Interested"><X size={16} /></button>
                              )}
                              <button onClick={() => setViewJobModal({ isOpen: true, job })} className="p-1.5 bg-gray-100 text-gray-500 hover:text-blue-600 rounded-full"><Eye size={16} /></button>
                              <button onClick={() => toggleSavedJob(job.id)} className={`p-1.5 rounded-full ${isSaved ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400'}`}><Bookmark size={16} fill={isSaved ? "currentColor" : "none"} /></button>
                            </div>
                          </div>
                          
                          {/* RESTORED: Job Stage Stepper */}
                          <JobStageStepper job={job} application={myApp} currentWorkerUsername={currentUser.username} />

                          <div className="space-y-2 text-sm text-gray-600 mt-3">
                            <div className="flex items-center gap-2"><DollarSign size={14} className="text-gray-400" /><span className="font-semibold text-gray-900">{job.budget} ₼</span></div>
                            <div className="flex items-center gap-2"><MapPin size={14} className="text-gray-400" /><span>{job.address}</span></div>
                          </div>
                          <div className="mt-4 pt-4 border-t border-gray-100">
                            <div className="flex gap-2 mb-2">
                              <input type="number" placeholder="Price" value={inputs.price} onChange={(e) => handleInputChange(job.id, 'price', e.target.value)} className="w-24 px-2 py-1 border rounded text-sm" />
                              <input type="text" placeholder="Message..." value={inputs.message} onChange={(e) => handleInputChange(job.id, 'message', e.target.value)} className="flex-1 px-2 py-1 border rounded text-sm" />
                            </div>
                            <button onClick={() => handleSendOffer(job.id, job.employerUsername)} className="w-full bg-blue-600 hover:bg-blue-700 text-white py-1.5 rounded text-sm font-medium">Send Offer</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
            {/* Other tabs logic (Saved, Offers, Progress, Completed) remains similar to previous implementation */}
            {activeTab === 'saved' && (
              <div className="grid gap-4 md:grid-cols-2">
                {savedTabJobs.map(job => {
                  const myApp = job.applications?.find(a => a.workerUsername === currentUser.username);
                  return (
                    <div key={job.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
                      <h3 className="font-bold">{job.title}</h3>
                      <JobStageStepper job={job} application={myApp} currentWorkerUsername={currentUser.username} />
                      <button onClick={() => setViewJobModal({ isOpen: true, job })} className="text-blue-600 text-sm hover:underline mt-2">View Details</button>
                    </div>
                  );
                })}
              </div>
            )}
            {activeTab === 'offers' && (
              <div className="space-y-4">
                {myOffersJobs.map(job => {
                  const myApp = job.applications?.find(a => a.workerUsername === currentUser.username);
                  return (
                    <div key={job.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm flex flex-col gap-3">
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold">{job.title}</h3>
                          <p className="text-sm text-gray-500">Offered: {myApp?.offeredPrice} ₼</p>
                        </div>
                        <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${myApp?.status === 'accepted' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'}`}>{myApp?.status}</span>
                      </div>
                      <JobStageStepper job={job} application={myApp} currentWorkerUsername={currentUser.username} />
                    </div>
                  );
                })}
              </div>
            )}
            {activeTab === 'progress' && (
              <div className="space-y-4">
                {inProgressJobs.map(job => (
                  <div key={job.id} className="bg-white p-5 rounded-xl border border-blue-200 shadow-sm">
                    <div className="flex justify-between mb-4">
                      <h3 className="font-bold">{job.title}</h3>
                      <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded font-bold">IN PROGRESS</span>
                    </div>
                    <JobStageStepper job={job} currentWorkerUsername={currentUser.username} />
                    <div className="flex gap-2 mt-4">
                      <button onClick={() => setChatSession({ isOpen: true, jobId: job.id, partnerUsername: job.employerUsername, jobTitle: job.title })} className="flex-1 bg-purple-50 text-purple-700 py-2 rounded font-bold text-sm">Chat</button>
                      <button onClick={() => setCompletionModal({ isOpen: true, job })} className="flex-1 bg-green-600 text-white py-2 rounded font-bold text-sm">Complete</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {activeTab === 'completed' && (
              <div className="space-y-4">
                {completedJobs.map(job => (
                  <div key={job.id} className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm opacity-80 hover:opacity-100 transition-opacity">
                    <h3 className="font-bold">{job.title}</h3>
                    <JobStageStepper job={job} currentWorkerUsername={currentUser.username} />
                    <p className="text-sm text-gray-500 mt-2">Completed on {new Date(job.completedAt!).toLocaleDateString()}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Modals */}
        {isEditingProfile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 overflow-y-auto max-h-[90vh]">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Profile</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Bio</label>
                  <textarea value={profileData.bio} onChange={e => setProfileData({...profileData, bio: e.target.value})} className="w-full p-2 border rounded text-sm h-24" placeholder="Tell us about yourself..." />
                  {validationErrors.bio && <p className="text-xs text-red-500">{validationErrors.bio}</p>}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Skills</label>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={skillInput} onChange={e => setSkillInput(e.target.value)} className="flex-1 p-2 border rounded text-sm" placeholder="Add skill" />
                    <button onClick={addSkill} className="bg-gray-100 p-2 rounded"><Plus size={16} /></button>
                  </div>
                  <div className="flex flex-wrap gap-1">{profileData.skills.map(s => <span key={s} className="bg-gray-100 px-2 py-1 rounded text-xs">{s}</span>)}</div>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Regions</label>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={regionInput} onChange={e => setRegionInput(e.target.value)} className="flex-1 p-2 border rounded text-sm" placeholder="Add region" />
                    <button onClick={addRegion} className="bg-gray-100 p-2 rounded"><Plus size={16} /></button>
                  </div>
                  <div className="flex flex-wrap gap-1">{profileData.regions?.map(r => <span key={r} className="bg-gray-100 px-2 py-1 rounded text-xs">{r}</span>)}</div>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setIsEditingProfile(false)} className="flex-1 py-2 bg-gray-100 rounded text-sm">Cancel</button>
                <button onClick={handleSaveProfile} className="flex-1 py-2 bg-blue-600 text-white rounded text-sm">Save</button>
              </div>
            </div>
          </div>
        )}

        <DisputeModal isOpen={disputeModal.isOpen} onClose={() => setDisputeModal({ ...disputeModal, isOpen: false })} jobId={disputeModal.jobId} openedBy={currentUser.username} againstUser={disputeModal.against} role="worker" />
        <CompletionModal isOpen={completionModal.isOpen} onClose={() => setCompletionModal({ ...completionModal, isOpen: false })} onSubmit={handleCompleteJob} job={completionModal.job!} />
        {employerProfileModal.isOpen && employerProfileModal.username && <EmployerProfileModal isOpen={employerProfileModal.isOpen} onClose={() => setEmployerProfileModal({ isOpen: false, username: null })} username={employerProfileModal.username} readOnly={true} />}
        {viewJobModal.isOpen && viewJobModal.job && <JobDetailsModal isOpen={viewJobModal.isOpen} onClose={() => setViewJobModal({ isOpen: false, job: null })} job={viewJobModal.job} currentWorkerUsername={currentUser.username} viewerRole="worker" onReport={() => setDisputeModal({ isOpen: true, jobId: viewJobModal.job!.id, against: viewJobModal.job!.employerUsername })} onOfferSent={() => loadData(currentUser.username)} />}
        <HelpModal isOpen={helpModalOpen} onClose={() => setHelpModalOpen(false)} />
        <ActivityModal isOpen={activityModalOpen} onClose={() => setActivityModalOpen(false)} username={currentUser.username} />

        {chatSession && currentUser && (
          <ChatPanel 
            isOpen={chatSession.isOpen}
            onClose={handleChatClose}
            jobId={chatSession.jobId}
            currentUsername={currentUser.username}
            otherUsername={chatSession.partnerUsername}
            currentUserRole="worker"
            jobTitle={chatSession.jobTitle}
          />
        )}
      </div>
    </div>
  );
}
