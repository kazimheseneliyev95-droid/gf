import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { 
  LogOut, HardHat, MapPin, DollarSign, Send, User, 
  CheckCircle, XCircle, Clock as ClockIcon, Briefcase, 
  PlayCircle, CheckSquare, Search, Edit2, Save, 
  MessageSquare, Bookmark, AlertTriangle, Sparkles, Map, Gavel, Eye, Info, Home, Filter
} from 'lucide-react';
import { 
  JobPost, JOB_STORAGE_KEY, JobApplication, JobCategory, 
  JOB_CATEGORIES, WORKER_PROFILE_KEY, WorkerProfileData, 
  REVIEW_STORAGE_KEY, WorkerReview, SAVED_JOBS_KEY, MediaItem
} from './types';
import NotificationCenter from './components/NotificationCenter';
import ChatPanel from './components/ChatPanel';
import { createNotification } from './utils';

import { getBadges, getRecommendedJobs, logActivity, getLowestBid, calculateProfileStrength } from './utils/advancedFeatures';
import { getDistance } from './utils/advancedAnalytics';
import { isFeatureEnabled } from './utils/featureFlags';

import GamificationBadges from './components/GamificationBadges';
import ProfileStrength from './components/ProfileStrength';
import AvailabilityScheduler from './components/AvailabilityScheduler';
import DisputeModal from './components/DisputeModal';
import PremiumBadge from './components/PremiumBadge';
import CompletionModal from './components/CompletionModal';
import EmployerProfileModal from './components/EmployerProfileModal';
import JobDetailsModal from './components/JobDetailsModal';
import TrustScoreDisplay from './components/TrustScoreDisplay';

type Tab = 'available' | 'recommended' | 'saved' | 'offers' | 'progress' | 'completed';

export default function WorkerPanel() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [availableJobs, setAvailableJobs] = useState<JobPost[]>([]);
  const [reviews, setReviews] = useState<WorkerReview[]>([]);
  
  const [activeTab, setActiveTab] = useState<Tab>('available');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [activeChatJobId, setActiveChatJobId] = useState<string | null>(null);

  const [applicationInputs, setApplicationInputs] = useState<{ [key: string]: { price: string, message: string, canMeetDeadline: boolean } }>({});

  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | 'All'>('All');
  const [minBudget, setMinBudget] = useState<string>('');

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState<WorkerProfileData>({ username: '', skills: [], regions: [], bio: '', availabilityStatus: 'available' });
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

  const [disputeModal, setDisputeModal] = useState<{isOpen: boolean, jobId: string, against: string}>({
    isOpen: false, jobId: '', against: ''
  });
  const [completionModal, setCompletionModal] = useState<{isOpen: boolean, job: JobPost | null}>({
    isOpen: false, job: null
  });
  const [employerProfileModal, setEmployerProfileModal] = useState<{isOpen: boolean, username: string | null}>({
    isOpen: false, username: null
  });
  const [viewJobModal, setViewJobModal] = useState<{isOpen: boolean, job: JobPost | null}>({
    isOpen: false, job: null
  });


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
    } catch (e) {
      navigate('/');
    }
  }, [navigate]);

  useEffect(() => {
    const jobId = searchParams.get('jobId');
    const section = searchParams.get('section');

    if (jobId) {
      const job = availableJobs.find(j => j.id === jobId);
      if (job) {
        if (job.status === 'processing') setActiveTab('progress');
        else if (job.status === 'completed') setActiveTab('completed');
        else if (job.applications.some(a => a.workerUsername === currentUser?.username)) setActiveTab('offers');
        else setActiveTab('available');

        if (section === 'chat') {
          setActiveChatJobId(jobId);
        } else {
          setActiveChatJobId(null);
        }

        setTimeout(() => {
          const element = document.getElementById(`job-${jobId}`);
          if (element) element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 300);
      }
    }
  }, [searchParams, availableJobs.length]);

  const loadData = (username: string) => {
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
      setAvailableJobs(allJobs.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      
      let completed = 0;
      let completedThisMonth = 0;
      let earned = 0;
      const now = new Date();
      
      allJobs.forEach(job => {
        if (job.status === 'completed' && job.assignedWorkerUsername === username) {
          completed++;
          const myApp = job.applications.find(a => a.workerUsername === username && a.status === 'accepted');
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
    } else {
      setProfileData({ username, skills: [], regions: [], bio: '', availabilityStatus: 'available' });
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

    setApplicationInputs(prev => {
      const newState = { ...prev };
      delete newState[jobId];
      return newState;
    });
    
    loadData(currentUser.username);
    setTimeout(() => setSuccessMessage(null), 3000);
    
    setActiveTab('offers');
  };

  const handleCancelOffer = (jobId: string, applicationId: string) => {
    if (!confirm("Are you sure you want to cancel this offer?")) return;

    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (!allJobsStr) return;

    const allJobs: JobPost[] = JSON.parse(allJobsStr);
    const jobIndex = allJobs.findIndex(j => j.id === jobId);

    if (jobIndex === -1) return;

    allJobs[jobIndex].applications = allJobs[jobIndex].applications.filter(app => app.id !== applicationId);

    localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(allJobs));
    
    logActivity(currentUser!.username, 'worker', 'OFFER_CANCELLED', { jobId });

    loadData(currentUser!.username);
    setSuccessMessage("Offer cancelled.");
    setTimeout(() => setSuccessMessage(null), 3000);
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
      errors.skills = "Add at least one skill to appear in relevant job matches.";
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

  const updateAvailabilityStatus = (status: 'available' | 'busy') => {
    if (!currentUser) return;
    const newProfile = { ...profileData, availabilityStatus: status };
    setProfileData(newProfile);
    
    const allProfilesStr = localStorage.getItem(WORKER_PROFILE_KEY);
    const allProfiles: WorkerProfileData[] = allProfilesStr ? JSON.parse(allProfilesStr) : [];
    const updatedProfiles = allProfiles.filter(p => p.username !== currentUser.username);
    updatedProfiles.push({ ...newProfile, username: currentUser.username });
    localStorage.setItem(WORKER_PROFILE_KEY, JSON.stringify(updatedProfiles));
    
    logActivity(currentUser.username, 'worker', 'AVAILABILITY_UPDATED', { status });
  };

  const addSkill = () => {
    const val = skillInput.trim();
    if (!val) return;
    
    if (profileData.skills.some(s => s.toLowerCase() === val.toLowerCase())) {
      setSkillInput('');
      return;
    }

    setProfileData(prev => ({ ...prev, skills: [...prev.skills, val] }));
    setSkillInput('');
    if (validationErrors.skills) setValidationErrors(prev => ({ ...prev, skills: undefined }));
  };

  const handleSkillKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addSkill();
    }
  };

  const removeSkill = (skill: string) => {
    setProfileData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const addRegion = () => {
    const val = regionInput.trim();
    if (!val) return;
    
    const currentRegions = profileData.regions || [];
    if (currentRegions.some(r => r.toLowerCase() === val.toLowerCase())) {
      setRegionInput('');
      return;
    }

    setProfileData(prev => ({ ...prev, regions: [...(prev.regions || []), val] }));
    setRegionInput('');
  };

  const handleRegionKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addRegion();
    }
  };

  const removeRegion = (region: string) => {
    setProfileData(prev => ({ ...prev, regions: (prev.regions || []).filter(r => r !== region) }));
  };

  const handleCompleteJob = (checklist: any, media: MediaItem[]) => {
    if (!completionModal.job || !currentUser) return;
    
    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (!allJobsStr) return;
    const allJobs: JobPost[] = JSON.parse(allJobsStr);
    const jobIndex = allJobs.findIndex(j => j.id === completionModal.job!.id);

    if (jobIndex !== -1) {
      allJobs[jobIndex].completionChecklist = {
        worker: checklist,
        employer: undefined
      };
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

  if (!currentUser) return null;

  const availableTabJobs = availableJobs.filter(job => {
    const hasApplied = job.applications.some(app => app.workerUsername === currentUser.username);
    const isAssigned = !!job.assignedWorkerUsername;
    
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || job.category === selectedCategory;
    const matchesBudget = !minBudget || job.budget >= Number(minBudget);

    return job.status === 'open' && !hasApplied && !isAssigned && matchesSearch && matchesCategory && matchesBudget;
  }).sort((a, b) => {
    const getScore = (job: JobPost) => {
      const skillMatch = profileData.skills.some(s => job.category.toLowerCase().includes(s.toLowerCase()));
      const regionMatch = profileData.regions?.some(r => job.address.toLowerCase().includes(r.toLowerCase()));
      
      if (skillMatch && regionMatch) return 3;
      if (skillMatch || regionMatch) return 2;
      return 1;
    };
    return getScore(b) - getScore(a);
  });

  const savedTabJobs = availableJobs.filter(job => savedJobs.includes(job.id));

  const myOffersJobs = availableJobs.filter(job => 
    job.applications.some(app => app.workerUsername === currentUser.username)
  ).map(job => {
    const myApp = job.applications.find(app => app.workerUsername === currentUser.username)!;
    return { job, application: myApp };
  });

  const inProgressJobs = availableJobs.filter(job => 
    job.status === 'processing' && job.assignedWorkerUsername === currentUser.username
  );

  const completedJobs = availableJobs.filter(job => 
    job.status === 'completed' && job.assignedWorkerUsername === currentUser.username
  );

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="bg-white rounded-xl shadow-sm p-4 sm:p-6 flex flex-col sm:flex-row justify-between items-center gap-4 sticky top-0 z-20 border-b border-gray-100">
          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <HardHat className="text-blue-600" />
                Worker Panel
              </h1>
              
              <div className="flex items-center gap-3 mt-1 text-sm">
                <p className="text-gray-500">
                  Welcome, <span className="font-semibold text-blue-600">{currentUser.username}</span>
                </p>
                <span className="text-gray-300">|</span>
                <Link to="/home" className="text-gray-600 hover:text-blue-600 font-medium flex items-center gap-1">
                  <Home size={14} /> Home Feed
                </Link>
                <span className="text-gray-300">|</span>
                <button 
                  onClick={() => setIsEditingProfile(true)}
                  className={`font-medium hover:underline ${
                    profileStrengthScore > 70 ? 'text-green-600' : profileStrengthScore > 30 ? 'text-yellow-600' : 'text-red-600'
                  }`}
                >
                  Profile: {profileStrengthScore > 70 ? 'Strong' : profileStrengthScore > 30 ? 'Good' : 'Weak'} ({profileStrengthScore}%)
                </button>
                <span className="text-gray-300">|</span>
                
                {profileData.availabilityStatus === 'available' ? (
                   <div className="flex items-center gap-1 bg-green-50 px-2 py-0.5 rounded-full border border-green-100">
                     <div className="w-2 h-2 rounded-full bg-green-500"></div>
                     <span className="text-green-700 text-xs font-bold">Available</span>
                   </div>
                ) : (
                   <div className="flex items-center gap-1 bg-gray-100 px-2 py-0.5 rounded-full border border-gray-200">
                     <div className="w-2 h-2 rounded-full bg-gray-400"></div>
                     <span className="text-gray-600 text-xs font-bold">Busy</span>
                   </div>
                )}
                
                <GamificationBadges badges={badges} />
                {showPremium && <PremiumBadge username={currentUser.username} role="worker" />}
                <TrustScoreDisplay username={currentUser.username} role="worker" />
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <NotificationCenter username={currentUser.username} />
            <button 
              onClick={() => setIsEditingProfile(true)}
              className="p-2 text-gray-600 hover:text-blue-600 hover:bg-gray-100 rounded-full transition-colors"
              title="Edit Profile"
            >
              <Edit2 size={20} />
            </button>
            <button onClick={handleLogout} className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors">
              <LogOut size={16} /> Logout
            </button>
          </div>
        </div>

        {/* Stats Dashboard & Advanced Modules */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Stats */}
          <div className="lg:col-span-2 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="bg-green-100 p-2.5 rounded-full text-green-600"><CheckSquare size={20} /></div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Jobs Completed</p>
                <p className="text-xl font-bold text-gray-900">{stats.completed}</p>
                {stats.completedThisMonth > 0 && <p className="text-[10px] text-green-600">This month: {stats.completedThisMonth}</p>}
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="bg-blue-100 p-2.5 rounded-full text-blue-600"><DollarSign size={20} /></div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Total Earned</p>
                <p className="text-xl font-bold text-gray-900">{stats.earned} ₼</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center gap-3">
              <div className="bg-amber-100 p-2.5 rounded-full text-amber-600"><Star size={20} /></div>
              <div>
                <p className="text-xs text-gray-500 font-medium">Avg Rating</p>
                <p className="text-xl font-bold text-gray-900">{reviews.length > 0 ? stats.rating.toFixed(1) : 'No reviews'}</p>
              </div>
            </div>
          </div>

          {/* Availability & Strength */}
          <div className="lg:col-span-1 space-y-4">
            <AvailabilityScheduler username={currentUser.username} />
            
            {profileData.availabilityStatus === 'busy' && (
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-xl shadow-sm flex flex-col gap-3 animate-in fade-in">
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-amber-100 rounded-full text-amber-600">
                    <ClockIcon size={18} />
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 text-sm">You are currently Busy</h4>
                    <p className="text-xs text-amber-700 mt-1">
                      Switching to "Available" helps you get more relevant job offers and appear in search results.
                    </p>
                  </div>
                </div>
                <button 
                  onClick={() => updateAvailabilityStatus('available')}
                  className="w-full py-2 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-lg transition-colors shadow-sm"
                >
                  Set to Available
                </button>
              </div>
            )}
          </div>
        </div>

        {successMessage && (
          <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-lg text-center animate-in fade-in slide-in-from-top-2 shadow-sm">
            {successMessage}
          </div>
        )}

        {/* TABS NAVIGATION */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex border-b border-gray-100 overflow-x-auto">
            {[
              { id: 'available', label: 'Available Jobs', icon: Search, count: availableTabJobs.length },
              { id: 'recommended', label: 'For You', icon: Sparkles, count: recommendedJobs.length },
              { id: 'saved', label: 'Saved', icon: Bookmark, count: savedTabJobs.length },
              { id: 'offers', label: 'My Offers', icon: Briefcase, count: myOffersJobs.length },
              { id: 'progress', label: 'In Progress', icon: PlayCircle, count: inProgressJobs.length },
              { id: 'completed', label: 'Completed', icon: CheckSquare, count: completedJobs.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex-1 min-w-[120px] py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
                  activeTab === tab.id 
                    ? 'text-blue-600 bg-blue-50/30' 
                    : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <tab.icon size={16} />
                {tab.label}
                {tab.count > 0 && (
                  <span className={`ml-1 text-xs px-1.5 py-0.5 rounded-full ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
                {activeTab === tab.id && (
                  <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600" />
                )}
              </button>
            ))}
          </div>

          {/* TAB CONTENT */}
          <div className="p-6 bg-gray-50/50 min-h-[400px]">
            
            {(activeTab === 'available' || activeTab === 'saved') && (
              <div className="space-y-4">
                {activeTab === 'available' && (
                  <div className="bg-white p-4 rounded-lg border border-gray-200 flex flex-wrap gap-3 items-center shadow-sm">
                    <div className="flex items-center gap-2 text-gray-500 text-sm font-medium">
                      <Filter size={16} /> Filters:
                    </div>
                    <input 
                      type="text" 
                      placeholder="Search title or address..." 
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                    <select 
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value as JobCategory | 'All')}
                      className="px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    >
                      <option value="All">All Categories</option>
                      {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                    </select>
                    <input 
                      type="number" 
                      placeholder="Min Budget" 
                      value={minBudget}
                      onChange={(e) => setMinBudget(e.target.value)}
                      className="w-28 px-3 py-1.5 bg-gray-50 border border-gray-200 rounded-md text-sm focus:ring-1 focus:ring-blue-500 outline-none"
                    />
                  </div>
                )}

                {activeTab === 'available' && profileData.availabilityStatus === 'busy' && (
                  <div className="bg-amber-50 border border-amber-100 text-amber-800 px-4 py-2 rounded-lg text-xs flex items-center gap-2">
                    <Info size={14} />
                    You are marked as <strong>Busy</strong>. Employers may see you as less available.
                  </div>
                )}

                {(activeTab === 'available' ? availableTabJobs : savedTabJobs).length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Search size={48} className="mx-auto text-gray-300 mb-3" />
                    <p>{activeTab === 'saved' ? "You haven't saved any jobs yet. Click the bookmark icon on a job to save it." : "No jobs found matching your criteria."}</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {(activeTab === 'available' ? availableTabJobs : savedTabJobs).map(job => {
                      const inputs = applicationInputs[job.id] || { price: '', message: '', canMeetDeadline: true };
                      const dist = showLoc ? getDistance(currentUser.username, job.address) : 0;
                      const lowestBid = showAuction && job.isAuction ? getLowestBid(job) : null;
                      const isSaved = savedJobs.includes(job.id);
                      
                      const skillMatch = profileData.skills.some(s => job.category.toLowerCase().includes(s.toLowerCase()));
                      const regionMatch = profileData.regions?.some(r => job.address.toLowerCase().includes(r.toLowerCase()));
                      const isBestMatch = skillMatch && regionMatch;

                      return (
                        <div key={job.id} id={`job-${job.id}`} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col relative">
                          {isBestMatch && (
                            <div className="absolute top-0 left-0 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded-br-lg z-10 flex items-center gap-1">
                              <Sparkles size={10} /> BEST MATCH
                            </div>
                          )}
                          {!isBestMatch && regionMatch && (
                            <div className="absolute top-0 left-0 bg-green-600 text-white text-[10px] font-bold px-2 py-1 rounded-br-lg z-10 flex items-center gap-1">
                              <MapPin size={10} /> REGION MATCH
                            </div>
                          )}

                          <div className="p-5 flex-grow pt-8">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-bold text-gray-900">{job.title}</h3>
                                <div className="flex gap-2 mt-1">
                                  <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{job.category}</span>
                                  {job.isAuction && showAuction && (
                                    <span className="bg-purple-100 text-purple-700 text-xs font-bold px-2 py-0.5 rounded uppercase flex items-center gap-1 border border-purple-200">
                                      <Gavel size={10} /> Auction
                                    </span>
                                  )}
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button 
                                  onClick={() => setViewJobModal({ isOpen: true, job })}
                                  className="p-1.5 rounded-full bg-gray-100 text-gray-500 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                  title="View Full Details"
                                >
                                  <Eye size={16} />
                                </button>
                                <button onClick={() => toggleSavedJob(job.id)} className={`p-1.5 rounded-full ${isSaved ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-400 hover:text-blue-500'}`}>
                                  <Bookmark size={16} fill={isSaved ? "currentColor" : "none"} />
                                </button>
                              </div>
                            </div>
                            
                            <div className="space-y-2 mt-3 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <User size={14} className="text-gray-400" />
                                <button 
                                  onClick={() => setEmployerProfileModal({ isOpen: true, username: job.employerUsername })}
                                  className="font-medium text-gray-900 hover:text-blue-600 hover:underline"
                                >
                                  {job.employerUsername}
                                </button>
                              </div>
                              <div className="flex items-center gap-2">
                                <DollarSign size={14} className="text-gray-400" />
                                {job.isAuction && showAuction ? (
                                  <span className="font-semibold text-purple-600">Open Bidding</span>
                                ) : (
                                  <span className="font-semibold text-gray-900">{job.budget} ₼</span>
                                )}
                                {job.isAuction && showAuction && (
                                  <span className="text-xs text-purple-600 font-medium ml-2">
                                    (Best Offer: {lowestBid ? `${lowestBid} ₼` : 'None'})
                                  </span>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <MapPin size={14} className="text-gray-400" />
                                <span>{job.address}</span>
                                {showLoc && (
                                  <span className="text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded flex items-center gap-0.5">
                                    <Map size={10} /> ~{dist}km
                                  </span>
                                )}
                              </div>
                              {job.materials && job.materials !== 'none' && (
                                <div className="text-xs bg-gray-50 px-2 py-1 rounded inline-block border border-gray-100">
                                  Materials: <strong>{job.materials === 'by_employer' ? 'Provided by Employer' : 'Provided by Worker'}</strong>
                                </div>
                              )}
                              {job.media?.before && job.media.before.length > 0 && (
                                <div className="flex gap-1 mt-1">
                                  {job.media.before.map((m, i) => (
                                    <div key={i} className="w-10 h-10 rounded bg-gray-100 overflow-hidden border border-gray-200">
                                      <img src={m.url} alt="Before" className="w-full h-full object-cover" />
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                          
                          <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2">
                            {job.desiredCompletion && (
                              <div className="mb-2 p-2 bg-blue-50 border border-blue-100 rounded text-xs text-blue-800">
                                <p className="font-bold mb-1">Employer Deadline:</p>
                                <p>{job.desiredCompletion.type === 'date' ? new Date(job.desiredCompletion.value).toLocaleDateString() : job.desiredCompletion.value}</p>
                                <label className="flex items-center gap-2 mt-2 cursor-pointer">
                                  <input 
                                    type="checkbox" 
                                    checked={inputs.canMeetDeadline}
                                    onChange={e => handleInputChange(job.id, 'canMeetDeadline', e.target.checked)}
                                    className="rounded text-blue-600"
                                  />
                                  <span>I can meet this deadline</span>
                                </label>
                              </div>
                            )}

                            <div className="relative">
                              <DollarSign className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                              <input
                                type="number"
                                placeholder="Your Offer Price (₼)"
                                value={inputs.price}
                                onChange={(e) => handleInputChange(job.id, 'price', e.target.value)}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>
                            <input
                              type="text"
                              placeholder="Message (optional)"
                              value={inputs.message}
                              onChange={(e) => handleInputChange(job.id, 'message', e.target.value)}
                              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            />
                            
                            {profileData.availabilityStatus === 'busy' && (
                              <p className="text-[10px] text-amber-600 flex items-center gap-1">
                                <AlertTriangle size={10} /> Warning: You are marked as Busy.
                              </p>
                            )}
                            
                            <button
                              onClick={() => handleSendOffer(job.id, job.employerUsername)}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg text-sm font-medium flex items-center justify-center gap-2 transition-colors"
                            >
                              <Send size={14} /> Send Offer
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'recommended' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-100 mb-4">
                  <h3 className="font-bold text-purple-900 flex items-center gap-2">
                    <Sparkles size={18} /> Recommended For You
                  </h3>
                </div>
                {recommendedJobs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No specific recommendations yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {recommendedJobs.map(job => {
                      const inputs = applicationInputs[job.id] || { price: '', message: '', canMeetDeadline: true };
                      return (
                        <div key={job.id} id={`job-${job.id}`} className="bg-white rounded-xl border-2 border-purple-100 shadow-sm p-5">
                          <div className="flex justify-between items-start">
                            <h3 className="font-bold text-gray-900">{job.title}</h3>
                            <button 
                              onClick={() => setViewJobModal({ isOpen: true, job })}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Eye size={12} /> Details
                            </button>
                          </div>
                          <div className="mt-2">
                             <input
                                type="number"
                                placeholder="Your Offer"
                                value={inputs.price}
                                onChange={(e) => handleInputChange(job.id, 'price', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-2"
                              />
                              <button
                                onClick={() => handleSendOffer(job.id, job.employerUsername)}
                                className="w-full bg-purple-600 text-white py-2 rounded-lg text-sm font-medium"
                              >
                                Send Offer
                              </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'offers' && (
              <div className="space-y-4">
                {myOffersJobs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Briefcase size={48} className="mx-auto text-gray-300 mb-3" />
                    <p>You haven't sent any offers yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {myOffersJobs.map(({ job, application }) => (
                      <div key={application.id} id={`job-${job.id}`} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5">
                        <div className="flex justify-between items-start">
                           <h3 className="font-bold text-gray-900">{job.title}</h3>
                           <button 
                              onClick={() => setViewJobModal({ isOpen: true, job })}
                              className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                            >
                              <Eye size={12} /> Details
                            </button>
                        </div>
                        <div className="mt-1 flex justify-between items-center">
                          <p className="text-sm text-gray-500">Offer: {application.offeredPrice} ₼</p>
                          <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                              application.status === 'accepted' ? 'bg-green-100 text-green-700' : 
                              application.status === 'rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                           }`}>{application.status}</span>
                        </div>
                        
                        {application.status === 'accepted' && (
                          <div className="mt-3 p-2 bg-green-50 rounded border border-green-100 text-xs text-green-800 flex items-center gap-2">
                            <CheckCircle size={14} />
                            Offer Accepted! Go to <button onClick={() => setActiveTab('progress')} className="underline font-bold">In Progress</button> tab.
                          </div>
                        )}

                        {application.status === 'pending' && (
                          <button 
                            onClick={() => handleCancelOffer(job.id, application.id)}
                            className="mt-3 text-red-600 text-xs hover:underline"
                          >
                            Cancel Offer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'progress' && (
              <div className="space-y-4">
                {inProgressJobs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <PlayCircle size={48} className="mx-auto text-gray-300 mb-3" />
                    <p>No active jobs currently.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {inProgressJobs.map(job => {
                      const myApp = job.applications.find(a => a.workerUsername === currentUser.username);
                      return (
                        <div key={job.id} id={`job-${job.id}`} className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 ring-1 ring-blue-50">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg">{job.title}</h3>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{job.category}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <button 
                                onClick={() => setViewJobModal({ isOpen: true, job })}
                                className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                              >
                                <Eye size={12} /> Details
                              </button>
                              <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-1 rounded uppercase flex items-center gap-1">
                                <PlayCircle size={12} /> In Progress
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2 mb-4 text-sm text-gray-600">
                            <div className="flex items-center gap-2">
                              <User size={14} className="text-gray-400" />
                              <span>Employer: <span className="font-medium text-gray-900">{job.employerUsername}</span></span>
                            </div>
                            <div className="flex items-center gap-2">
                              <DollarSign size={14} className="text-gray-400" />
                              <span>Accepted Price: <span className="font-bold text-green-600">{myApp?.offeredPrice} ₼</span></span>
                            </div>
                          </div>

                          <button 
                            onClick={() => setCompletionModal({ isOpen: true, job })}
                            className="w-full mb-3 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-2"
                          >
                            <CheckSquare size={16} /> Complete Job
                          </button>

                          <div className="flex gap-2 mt-4">
                            <ChatPanel 
                              jobId={job.id} 
                              currentUsername={currentUser.username} 
                              otherUsername={job.employerUsername} 
                              currentUserRole="worker"
                              jobTitle={job.title}
                              forceOpen={activeChatJobId === job.id}
                            />
                            <button 
                              onClick={() => setDisputeModal({ isOpen: true, jobId: job.id, against: job.employerUsername })}
                              className="text-gray-400 hover:text-red-500 p-2"
                              title="Report Issue"
                            >
                              <AlertTriangle size={18} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'completed' && (
              <div className="space-y-4">
                {completedJobs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckSquare size={48} className="mx-auto text-gray-300 mb-3" />
                    <p>No completed jobs yet — once you finish a job, it will appear here.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {completedJobs.map(job => (
                       <div 
                         key={job.id} 
                         id={`job-${job.id}`} 
                         className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 opacity-90 hover:opacity-100 hover:shadow-md transition-all group relative"
                       >
                          <div className="flex justify-between items-start">
                            <div>
                              <h3 className="font-bold text-gray-900 group-hover:text-blue-600 transition-colors">{job.title}</h3>
                              <p className="text-sm text-gray-500 mt-1">Completed on {job.completedAt ? new Date(job.completedAt).toLocaleDateString() : 'Unknown date'}</p>
                            </div>
                            <div className="flex gap-2">
                              <button 
                                onClick={() => setViewJobModal({ isOpen: true, job })}
                                className="bg-gray-100 p-2 rounded-full text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors"
                              >
                                <Eye size={18} />
                              </button>
                              <button 
                                onClick={() => setDisputeModal({ isOpen: true, jobId: job.id, against: job.employerUsername })}
                                className="bg-gray-100 p-2 rounded-full text-gray-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                                title="Report Issue"
                              >
                                <AlertTriangle size={18} />
                              </button>
                            </div>
                          </div>
                          <div className="mt-3 flex items-center gap-2 text-xs text-gray-400">
                            <span className="bg-gray-100 px-2 py-0.5 rounded">{job.category}</span>
                            <span>•</span>
                            <span>Employer: {job.employerUsername}</span>
                          </div>
                       </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </div>

        {isEditingProfile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Profile</h3>
              
              <div className="mb-6">
                <ProfileStrength username={currentUser.username} />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Availability Status</label>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setProfileData({...profileData, availabilityStatus: 'available'})}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                        profileData.availabilityStatus === 'available' 
                          ? 'bg-green-50 border-green-500 text-green-700' 
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      Available
                    </button>
                    <button 
                      onClick={() => setProfileData({...profileData, availabilityStatus: 'busy'})}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium border ${
                        profileData.availabilityStatus === 'busy' 
                          ? 'bg-gray-100 border-gray-400 text-gray-800' 
                          : 'border-gray-200 text-gray-600'
                      }`}
                    >
                      Busy
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Short Bio</label>
                  <textarea 
                    value={profileData.bio || ''}
                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                    className={`w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none ${
                      validationErrors.bio ? 'border-red-500' : 'border-gray-200'
                    }`}
                    placeholder="Tell employers about yourself..."
                  />
                  {validationErrors.bio && <p className="text-xs text-red-500 mt-1">{validationErrors.bio}</p>}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Skills</label>
                  <div className="flex gap-2 mb-2">
                    <input 
                      type="text" 
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      onKeyDown={handleSkillKeyDown}
                      className={`flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none ${
                        validationErrors.skills ? 'border-red-500' : 'border-gray-200'
                      }`}
                      placeholder="Add a skill (e.g. Plumbing)"
                    />
                    <button 
                      onClick={addSkill}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  {validationErrors.skills && <p className="text-xs text-red-500 mb-2">{validationErrors.skills}</p>}
                  
                  <div className="flex flex-wrap gap-2">
                    {profileData.skills.map(skill => (
                      <span key={skill} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                        {skill}
                        <button onClick={() => removeSkill(skill)} className="hover:text-red-500"><XCircle size={12} /></button>
                      </span>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Service Region(s)</label>
                  <div className="flex gap-2 mb-2">
                    <input 
                      type="text" 
                      value={regionInput}
                      onChange={(e) => setRegionInput(e.target.value)}
                      onKeyDown={handleRegionKeyDown}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Add a region (e.g. Baku)"
                    />
                    <button 
                      onClick={addRegion}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
                    >
                      <Plus size={16} />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {(profileData.regions || []).map(region => (
                      <span key={region} className="bg-indigo-50 text-indigo-700 px-2 py-1 rounded-lg text-xs flex items-center gap-1 border border-indigo-100">
                        {region}
                        <button onClick={() => removeRegion(region)} className="hover:text-indigo-900"><XCircle size={12} /></button>
                      </span>
                    ))}
                  </div>
                </div>

              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setIsEditingProfile(false)}
                  className="flex-1 py-2.5 text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg font-medium text-sm transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveProfile}
                  className="flex-1 py-2.5 text-white bg-blue-600 hover:bg-blue-700 rounded-lg font-medium text-sm transition-colors shadow-sm flex items-center justify-center gap-2"
                >
                  <Save size={16} /> Save Profile
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
          role="worker"
        />

        <CompletionModal 
          isOpen={completionModal.isOpen}
          onClose={() => setCompletionModal({ ...completionModal, isOpen: false })}
          onSubmit={handleCompleteJob}
          job={completionModal.job!}
        />

        {employerProfileModal.isOpen && employerProfileModal.username && (
          <EmployerProfileModal 
            isOpen={employerProfileModal.isOpen}
            onClose={() => setEmployerProfileModal({ isOpen: false, username: null })}
            username={employerProfileModal.username}
            readOnly={true}
          />
        )}

        {viewJobModal.isOpen && viewJobModal.job && (
          <JobDetailsModal 
            isOpen={viewJobModal.isOpen}
            onClose={() => setViewJobModal({ isOpen: false, job: null })}
            job={viewJobModal.job}
            currentWorkerUsername={currentUser.username}
            viewerRole="worker"
            onReport={() => setDisputeModal({ isOpen: true, jobId: viewJobModal.job!.id, against: viewJobModal.job!.employerUsername })}
          />
        )}

      </div>
    </div>
  );
}
