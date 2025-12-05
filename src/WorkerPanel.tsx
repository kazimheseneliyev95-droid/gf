import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, HardHat, MapPin, Clock, DollarSign, Send, User, 
  CheckCircle, XCircle, Clock as ClockIcon, Briefcase, 
  PlayCircle, CheckSquare, Search, Edit2, Save, Trash2, 
  MessageSquare, Star, AlertCircle, Filter, AlertTriangle, Sparkles, Map
} from 'lucide-react';
import { 
  JobPost, JOB_STORAGE_KEY, JobApplication, JobCategory, 
  JOB_CATEGORIES, WORKER_PROFILE_KEY, WorkerProfileData, 
  REVIEW_STORAGE_KEY, WorkerReview 
} from './types';
import NotificationCenter from './components/NotificationCenter';
import ChatPanel from './components/ChatPanel';
import { createNotification } from './utils';

// Advanced Features
import { getBadges, getRecommendedJobs, logActivity } from './utils/advancedFeatures';
import { getDistance } from './utils/advancedAnalytics';
import { isFeatureEnabled } from './utils/featureFlags';

import GamificationBadges from './components/GamificationBadges';
import ProfileStrength from './components/ProfileStrength';
import AvailabilityScheduler from './components/AvailabilityScheduler';
import DisputeModal from './components/DisputeModal';
import PremiumBadge from './components/PremiumBadge';

type Tab = 'available' | 'recommended' | 'offers' | 'progress' | 'completed';

export default function WorkerPanel() {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<{ username: string } | null>(null);
  const [availableJobs, setAvailableJobs] = useState<JobPost[]>([]);
  const [reviews, setReviews] = useState<WorkerReview[]>([]);
  
  // UI State
  const [activeTab, setActiveTab] = useState<Tab>('available');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Inputs
  const [applicationInputs, setApplicationInputs] = useState<{ [key: string]: { price: string, message: string } }>({});

  // Filters (Available Jobs)
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<JobCategory | 'All'>('All');
  const [minBudget, setMinBudget] = useState<string>('');

  // Profile Edit
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileData, setProfileData] = useState<WorkerProfileData>({ username: '', skills: [], bio: '' });
  const [skillInput, setSkillInput] = useState('');

  // Stats & Badges
  const [stats, setStats] = useState({ completed: 0, earned: 0, rating: 0 });
  const [badges, setBadges] = useState<any[]>([]);
  const [recommendedJobs, setRecommendedJobs] = useState<JobPost[]>([]);

  // Feature Flags
  const showLoc = isFeatureEnabled('locationDistanceMatching');
  const showPremium = isFeatureEnabled('premiumBadges');

  // Dispute Modal
  const [disputeModal, setDisputeModal] = useState<{isOpen: boolean, jobId: string, against: string}>({
    isOpen: false, jobId: '', against: ''
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
    } catch (e) {
      navigate('/');
    }
  }, [navigate]);

  const loadData = (username: string) => {
    // Load Jobs
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
      
      // Calculate Stats
      let completed = 0;
      let earned = 0;
      allJobs.forEach(job => {
        if (job.status === 'completed' && job.assignedWorkerUsername === username) {
          completed++;
          const myApp = job.applications.find(a => a.workerUsername === username && a.status === 'accepted');
          if (myApp) earned += myApp.offeredPrice;
        }
      });

      // Load Reviews for Stats
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

      setStats({ completed, earned, rating });
      
      // Advanced: Badges & Recommendations
      setBadges(getBadges(username, 'worker'));
      setRecommendedJobs(getRecommendedJobs(username));
    }

    // Load Profile
    const allProfilesStr = localStorage.getItem(WORKER_PROFILE_KEY);
    if (allProfilesStr) {
      const allProfiles: WorkerProfileData[] = JSON.parse(allProfilesStr);
      const myProfile = allProfiles.find(p => p.username === username);
      if (myProfile) setProfileData(myProfile);
      else setProfileData({ username, skills: [], bio: '' });
    } else {
      setProfileData({ username, skills: [], bio: '' });
    }
  };

  // --- Actions ---

  const handleInputChange = (jobId: string, field: 'price' | 'message', value: string) => {
    setApplicationInputs(prev => ({
      ...prev,
      [jobId]: {
        ...(prev[jobId] || { price: '', message: '' }),
        [field]: value
      }
    }));
  };

  const handleSendOffer = (jobId: string, employerUsername: string) => {
    if (!currentUser) return;
    
    const inputs = applicationInputs[jobId] || { price: '', message: '' };
    if (!inputs.price || Number(inputs.price) <= 0) {
      alert("Please enter a valid price.");
      return;
    }

    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (!allJobsStr) return;

    const allJobs: JobPost[] = JSON.parse(allJobsStr);
    const jobIndex = allJobs.findIndex(j => j.id === jobId);

    if (jobIndex === -1) return;
    
    if (allJobs[jobIndex].status !== 'open') {
      alert("This job has already been taken or closed.");
      loadData(currentUser.username);
      return;
    }

    const newApplication: JobApplication = {
      id: crypto.randomUUID(),
      workerUsername: currentUser.username,
      offeredPrice: Number(inputs.price),
      message: inputs.message,
      createdAt: new Date().toISOString(),
      status: 'pending'
    };

    if (!allJobs[jobIndex].applications) allJobs[jobIndex].applications = [];
    allJobs[jobIndex].applications.push(newApplication);

    localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(allJobs));
    
    // Log Activity
    logActivity(currentUser.username, 'worker', 'OFFER_SENT', { jobId, price: inputs.price });

    setApplicationInputs(prev => {
      const newState = { ...prev };
      delete newState[jobId];
      return newState;
    });
    
    createNotification(employerUsername, 'newOffer', jobId, { workerName: currentUser.username });
    loadData(currentUser.username);
    setSuccessMessage("Offer sent successfully!");
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
    const allProfilesStr = localStorage.getItem(WORKER_PROFILE_KEY);
    const allProfiles: WorkerProfileData[] = allProfilesStr ? JSON.parse(allProfilesStr) : [];
    
    const updatedProfiles = allProfiles.filter(p => p.username !== currentUser.username);
    updatedProfiles.push({ ...profileData, username: currentUser.username });
    
    localStorage.setItem(WORKER_PROFILE_KEY, JSON.stringify(updatedProfiles));
    logActivity(currentUser.username, 'worker', 'PROFILE_UPDATED');
    setIsEditingProfile(false);
    loadData(currentUser.username); // Reload to update recommendations/strength
  };

  const addSkill = () => {
    if (skillInput.trim() && !profileData.skills.includes(skillInput.trim())) {
      setProfileData(prev => ({ ...prev, skills: [...prev.skills, skillInput.trim()] }));
      setSkillInput('');
    }
  };

  const removeSkill = (skill: string) => {
    setProfileData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  if (!currentUser) return null;

  // --- Filtering Logic for Tabs ---
  const availableTabJobs = availableJobs.filter(job => {
    const hasApplied = job.applications.some(app => app.workerUsername === currentUser.username);
    const isAssigned = !!job.assignedWorkerUsername;
    
    const matchesSearch = job.title.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          job.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || job.category === selectedCategory;
    const matchesBudget = !minBudget || job.budget >= Number(minBudget);

    return job.status === 'open' && !hasApplied && !isAssigned && matchesSearch && matchesCategory && matchesBudget;
  });

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
              <div className="flex items-center gap-2 mt-1">
                <p className="text-gray-500 text-sm">
                  Welcome, <span className="font-semibold text-blue-600">{currentUser.username}</span>
                </p>
                <GamificationBadges badges={badges} />
                {showPremium && <PremiumBadge username={currentUser.username} role="worker" />}
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
                <p className="text-xl font-bold text-gray-900">{stats.rating.toFixed(1)}</p>
              </div>
            </div>
          </div>

          {/* Availability & Strength */}
          <div className="lg:col-span-1 space-y-4">
            <AvailabilityScheduler username={currentUser.username} />
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
              { id: 'offers', label: 'My Offers', icon: Briefcase, count: myOffersJobs.length },
              { id: 'progress', label: 'In Progress', icon: PlayCircle, count: inProgressJobs.length },
              { id: 'completed', label: 'Completed', icon: CheckSquare, count: completedJobs.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as Tab)}
                className={`flex-1 min-w-[140px] py-4 text-sm font-medium flex items-center justify-center gap-2 transition-colors relative ${
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
            
            {/* 1. AVAILABLE JOBS TAB */}
            {activeTab === 'available' && (
              <div className="space-y-4">
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

                {availableTabJobs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Search size={48} className="mx-auto text-gray-300 mb-3" />
                    <p>No jobs available matching your criteria.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {availableTabJobs.map(job => {
                      const inputs = applicationInputs[job.id] || { price: '', message: '' };
                      const dist = showLoc ? getDistance(currentUser.username, job.address) : 0;

                      return (
                        <div key={job.id} className="bg-white rounded-xl border border-gray-200 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col">
                          <div className="p-5 flex-grow">
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <h3 className="font-bold text-gray-900">{job.title}</h3>
                                <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{job.category}</span>
                              </div>
                              <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded uppercase">Open</span>
                            </div>
                            
                            <div className="space-y-2 mt-3 text-sm text-gray-600">
                              <div className="flex items-center gap-2">
                                <DollarSign size={14} className="text-gray-400" />
                                <span className="font-semibold text-gray-900">{job.budget} ₼</span>
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
                            </div>
                          </div>
                          
                          <div className="p-4 bg-gray-50 border-t border-gray-100 space-y-2">
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

            {/* 1.5 RECOMMENDED TAB */}
            {activeTab === 'recommended' && (
              <div className="space-y-4">
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-100 mb-4">
                  <h3 className="font-bold text-purple-900 flex items-center gap-2">
                    <Sparkles size={18} /> Recommended For You
                  </h3>
                  <p className="text-sm text-purple-700 mt-1">
                    Based on your skills ({profileData.skills.join(', ') || 'None'}) and activity.
                  </p>
                </div>

                {recommendedJobs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <p>No specific recommendations yet. Add skills to your profile!</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {recommendedJobs.map(job => {
                      const inputs = applicationInputs[job.id] || { price: '', message: '' };
                      return (
                        <div key={job.id} className="bg-white rounded-xl border-2 border-purple-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden flex flex-col relative">
                          <div className="absolute top-0 right-0 bg-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                            MATCH
                          </div>
                          <div className="p-5 flex-grow">
                            <h3 className="font-bold text-gray-900">{job.title}</h3>
                            <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{job.category}</span>
                            <div className="mt-2 text-sm text-gray-600">
                              <span className="font-bold text-blue-600">{job.budget} ₼</span> • {job.address}
                            </div>
                          </div>
                          <div className="p-4 bg-gray-50 border-t border-gray-100">
                            <div className="relative mb-2">
                              <DollarSign className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                              <input
                                type="number"
                                placeholder="Your Offer"
                                value={inputs.price}
                                onChange={(e) => handleInputChange(job.id, 'price', e.target.value)}
                                className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                              />
                            </div>
                            <button
                              onClick={() => handleSendOffer(job.id, job.employerUsername)}
                              className="w-full bg-purple-600 hover:bg-purple-700 text-white py-2 rounded-lg text-sm font-medium transition-colors"
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

            {/* 2. MY OFFERS TAB */}
            {activeTab === 'offers' && (
              <div className="space-y-4">
                {myOffersJobs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <Briefcase size={48} className="mx-auto text-gray-300 mb-3" />
                    <p>You haven't sent any offers yet.</p>
                    <button onClick={() => setActiveTab('available')} className="text-blue-600 hover:underline mt-2 text-sm">Browse Available Jobs</button>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {myOffersJobs.map(({ job, application }) => (
                      <div key={application.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 relative">
                        <div className="absolute top-4 right-4">
                          <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase flex items-center gap-1 ${
                            application.status === 'accepted' ? 'bg-green-100 text-green-700' :
                            application.status === 'rejected' ? 'bg-red-100 text-red-700' :
                            'bg-yellow-100 text-yellow-700'
                          }`}>
                            {application.status}
                          </span>
                        </div>
                        <h3 className="font-bold text-gray-900 text-lg pr-20">{job.title}</h3>
                        <p className="text-sm text-gray-500 mb-4">Employer: {job.employerUsername}</p>
                        <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <span className="block text-xs text-gray-400 uppercase">Your Offer</span>
                            <span className="font-bold text-blue-600 text-lg">{application.offeredPrice} ₼</span>
                          </div>
                          <div className="bg-gray-50 p-2 rounded-lg">
                            <span className="block text-xs text-gray-400 uppercase">Sent Date</span>
                            <span className="font-medium text-gray-700">{new Date(application.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                        {application.status === 'pending' && (
                          <button 
                            onClick={() => handleCancelOffer(job.id, application.id)}
                            className="w-full py-2 border border-red-200 text-red-600 hover:bg-red-50 rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                          >
                            <Trash2 size={14} /> Cancel Offer
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* 3. IN PROGRESS TAB */}
            {activeTab === 'progress' && (
              <div className="space-y-4">
                {inProgressJobs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <PlayCircle size={48} className="mx-auto text-gray-300 mb-3" />
                    <p>No jobs currently in progress.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {inProgressJobs.map(job => {
                      const myApp = job.applications.find(a => a.workerUsername === currentUser.username);
                      return (
                        <div key={job.id} className="bg-white rounded-xl border border-blue-200 shadow-sm p-5 ring-1 ring-blue-50">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg">{job.title}</h3>
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{job.category}</span>
                            </div>
                            <span className="bg-teal-100 text-teal-700 text-xs font-bold px-2 py-1 rounded uppercase flex items-center gap-1">
                              <PlayCircle size={12} /> In Progress
                            </span>
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

                          <div className="flex gap-2 mt-4">
                            <ChatPanel 
                              jobId={job.id} 
                              currentUsername={currentUser.username} 
                              otherUsername={job.employerUsername} 
                              currentUserRole="worker"
                              jobTitle={job.title}
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

            {/* 4. COMPLETED TAB */}
            {activeTab === 'completed' && (
              <div className="space-y-4">
                {completedJobs.length === 0 ? (
                  <div className="text-center py-12 text-gray-500">
                    <CheckSquare size={48} className="mx-auto text-gray-300 mb-3" />
                    <p>No completed jobs yet.</p>
                  </div>
                ) : (
                  <div className="grid gap-4 md:grid-cols-2">
                    {completedJobs.map(job => {
                      const review = reviews.find(r => r.jobId === job.id);
                      return (
                        <div key={job.id} className="bg-white rounded-xl border border-gray-200 shadow-sm p-5 opacity-90 hover:opacity-100 transition-opacity">
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="font-bold text-gray-900 text-lg">{job.title}</h3>
                              <p className="text-sm text-gray-500">Employer: {job.employerUsername}</p>
                            </div>
                            <div className="flex gap-2">
                              <ChatPanel 
                                jobId={job.id} 
                                currentUsername={currentUser.username} 
                                otherUsername={job.employerUsername} 
                                currentUserRole="worker"
                                jobTitle={job.title}
                              />
                              <span className="bg-gray-100 text-gray-600 text-xs font-bold px-2 py-1 rounded uppercase flex items-center gap-1 h-fit">
                                <CheckSquare size={12} /> Completed
                              </span>
                            </div>
                          </div>

                          <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                            {review ? (
                              <div>
                                <div className="flex items-center gap-1 mb-1">
                                  <div className="flex text-amber-400">
                                    {[1, 2, 3, 4, 5].map(s => (
                                      <Star key={s} size={14} fill={s <= review.rating ? "currentColor" : "none"} className={s <= review.rating ? "" : "text-gray-300"} />
                                    ))}
                                  </div>
                                  <span className="text-sm font-bold text-gray-900">{review.rating}.0</span>
                                </div>
                                <p className="text-sm text-gray-600 italic">"{review.comment}"</p>
                              </div>
                            ) : (
                              <div className="flex items-center gap-2 text-gray-500 text-sm italic">
                                <Clock size={14} /> Waiting for employer review...
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
        </div>

        {/* Profile Edit Modal */}
        {isEditingProfile && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
              <h3 className="text-xl font-bold text-gray-900 mb-4">Edit Profile</h3>
              
              <div className="mb-6">
                <ProfileStrength username={currentUser.username} />
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Short Bio</label>
                  <textarea 
                    value={profileData.bio || ''}
                    onChange={(e) => setProfileData({...profileData, bio: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                    placeholder="Tell employers about yourself..."
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Skills</label>
                  <div className="flex gap-2 mb-2">
                    <input 
                      type="text" 
                      value={skillInput}
                      onChange={(e) => setSkillInput(e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="Add a skill (e.g. Plumbing)"
                    />
                    <button 
                      onClick={addSkill}
                      className="bg-blue-600 text-white px-3 py-2 rounded-lg text-sm font-medium"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {profileData.skills.map(skill => (
                      <span key={skill} className="bg-gray-100 text-gray-700 px-2 py-1 rounded-lg text-xs flex items-center gap-1">
                        {skill}
                        <button onClick={() => removeSkill(skill)} className="hover:text-red-500"><XCircle size={12} /></button>
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

        {/* Dispute Modal */}
        <DisputeModal 
          isOpen={disputeModal.isOpen} 
          onClose={() => setDisputeModal({ ...disputeModal, isOpen: false })}
          jobId={disputeModal.jobId}
          openedBy={currentUser.username}
          againstUser={disputeModal.against}
        />

      </div>
    </div>
  );
}
