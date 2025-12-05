import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, User, ArrowLeft, MessageSquare, Heart, Briefcase, Clock, CheckSquare, Image as ImageIcon, Calendar, AlertTriangle, Eye } from 'lucide-react';
import { WorkerReview, REVIEW_STORAGE_KEY, WORKER_PROFILE_KEY, WorkerProfileData, FavoriteWorker, FAVORITE_WORKERS_KEY, JobPost, JOB_STORAGE_KEY, WorkerAvailability, AVAILABILITY_STORAGE_KEY, USERS_STORAGE_KEY, User as UserType } from './types';
import { calculateWorkerQuality, getBadges } from './utils/advancedFeatures';
import { isFeatureEnabled } from './utils/featureFlags';
import GamificationBadges from './components/GamificationBadges';
import PremiumBadge from './components/PremiumBadge';
import BehaviorScore from './components/BehaviorScore';
import JobDetailsModal from './components/JobDetailsModal';
import ServiceLevelBadge from './components/ServiceLevelBadge';

export default function WorkerProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  
  const [reviews, setReviews] = useState<WorkerReview[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [profileData, setProfileData] = useState<WorkerProfileData | null>(null);
  const [completedJobs, setCompletedJobs] = useState<JobPost[]>([]);
  const [availability, setAvailability] = useState<WorkerAvailability | null>(null);
  const [workerUser, setWorkerUser] = useState<UserType | null>(null);
  
  const [currentUser, setCurrentUser] = useState<{ username: string, role: string } | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Advanced
  const [qualityScore, setQualityScore] = useState(0);
  const [badges, setBadges] = useState<any[]>([]);
  const [topCategories, setTopCategories] = useState<string[]>([]);

  // Feature Flags
  const showPremium = isFeatureEnabled('premiumBadges');
  const showBehavior = isFeatureEnabled('behaviorMonitoring');

  // Modal
  const [viewJob, setViewJob] = useState<JobPost | null>(null);

  useEffect(() => {
    const sessionStr = localStorage.getItem('currentUser');
    if (sessionStr) {
      setCurrentUser(JSON.parse(sessionStr));
    }
  }, []);

  useEffect(() => {
    if (!username) return;

    // Load User Data (for SLA)
    const usersStr = localStorage.getItem(USERS_STORAGE_KEY);
    if (usersStr) {
      const users: UserType[] = JSON.parse(usersStr);
      const target = users.find(u => u.username === username);
      if (target) setWorkerUser(target);
    }

    // Load Reviews
    const allReviewsStr = localStorage.getItem(REVIEW_STORAGE_KEY);
    if (allReviewsStr) {
      const allReviews: WorkerReview[] = JSON.parse(allReviewsStr);
      const workerReviews = allReviews.filter(r => r.workerUsername === username);
      workerReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(b.createdAt).getTime());
      setReviews(workerReviews);

      if (workerReviews.length > 0) {
        const total = workerReviews.reduce((sum, r) => sum + r.rating, 0);
        setAverageRating(total / workerReviews.length);
      }
    }

    // Load Profile Data
    const allProfilesStr = localStorage.getItem(WORKER_PROFILE_KEY);
    if (allProfilesStr) {
      const allProfiles: WorkerProfileData[] = JSON.parse(allProfilesStr);
      const profile = allProfiles.find(p => p.username === username);
      if (profile) setProfileData(profile);
    }

    // Load Availability
    const allAvailStr = localStorage.getItem(AVAILABILITY_STORAGE_KEY);
    if (allAvailStr) {
      const allAvail: WorkerAvailability[] = JSON.parse(allAvailStr);
      const myAvail = allAvail.find(a => a.username === username);
      if (myAvail) setAvailability(myAvail);
    }

    // Load Work History
    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (allJobsStr) {
      const allJobs: JobPost[] = JSON.parse(allJobsStr);
      const history = allJobs.filter(j => j.assignedWorkerUsername === username && j.status === 'completed');
      history.sort((a, b) => new Date(b.completedAt || b.createdAt).getTime() - new Date(a.completedAt || a.createdAt).getTime());
      setCompletedJobs(history);

      const catCounts: Record<string, number> = {};
      history.forEach(j => {
        catCounts[j.category] = (catCounts[j.category] || 0) + 1;
      });
      
      const sortedCats = Object.entries(catCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(e => e[0]);
      setTopCategories(sortedCats);
    }

    // Check Favorite
    if (currentUser && currentUser.role === 'employer') {
      const allFavsStr = localStorage.getItem(FAVORITE_WORKERS_KEY);
      if (allFavsStr) {
        const allFavs: FavoriteWorker[] = JSON.parse(allFavsStr);
        setIsFavorite(allFavs.some(f => f.employerUsername === currentUser.username && f.workerUsername === username));
      }
    }

    // Advanced Stats
    setQualityScore(calculateWorkerQuality(username));
    setBadges(getBadges(username, 'worker'));

  }, [username, currentUser]);

  const toggleFavorite = () => {
    if (!currentUser || currentUser.role !== 'employer' || !username) return;

    const allFavsStr = localStorage.getItem(FAVORITE_WORKERS_KEY);
    let allFavs: FavoriteWorker[] = allFavsStr ? JSON.parse(allFavsStr) : [];

    if (isFavorite) {
      allFavs = allFavs.filter(f => !(f.employerUsername === currentUser.username && f.workerUsername === username));
    } else {
      allFavs.push({
        employerUsername: currentUser.username,
        workerUsername: username,
        addedAt: new Date().toISOString()
      });
    }

    localStorage.setItem(FAVORITE_WORKERS_KEY, JSON.stringify(allFavs));
    setIsFavorite(!isFavorite);
  };

  if (!username) return null;

  const availabilitySummary = availability && availability.availableDays.length > 0 
    ? `Available on: ${availability.availableDays.join(', ')}`
    : "Availability not set yet";

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} /> Back
        </button>

        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm p-8 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-24 bg-gradient-to-r from-blue-500 to-purple-600 opacity-10"></div>
          
          <div className="relative">
            <div className="w-24 h-24 bg-white border-4 border-white shadow-lg text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 relative">
              <User size={48} />
              {profileData?.availabilityStatus && (
                <div className={`absolute bottom-0 right-0 w-6 h-6 rounded-full border-2 border-white flex items-center justify-center ${
                  profileData.availabilityStatus === 'available' ? 'bg-green-500' : 'bg-gray-400'
                }`} title={profileData.availabilityStatus === 'available' ? 'Available' : 'Busy'}>
                  <div className="w-2 h-2 bg-white rounded-full"></div>
                </div>
              )}
            </div>
            
            <div className="flex justify-center mb-2">
              <GamificationBadges badges={badges} />
            </div>

            <div className="flex items-center justify-center gap-2 mb-1">
              <h1 className="text-3xl font-bold text-gray-900">{username}</h1>
              {showPremium && <PremiumBadge username={username} role="worker" size="md" />}
              {workerUser?.serviceLevel && <ServiceLevelBadge level={workerUser.serviceLevel} size="md" />}
            </div>

            {/* Availability Status Badge */}
            <div className="flex flex-col items-center gap-1 mb-4">
              {profileData?.availabilityStatus === 'available' ? (
                <span className="px-3 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold uppercase tracking-wide">
                  Available
                </span>
              ) : (
                <span className="px-3 py-1 rounded-full bg-gray-100 text-gray-600 text-xs font-bold uppercase tracking-wide">
                  Busy
                </span>
              )}
              <span className="text-xs text-gray-500 flex items-center gap-1">
                <Calendar size={12} /> {availabilitySummary}
              </span>
            </div>
            
            {showBehavior && (
              <div className="flex justify-center mb-4">
                <BehaviorScore username={username} role="worker" />
              </div>
            )}
            
            {/* Quality Score Badge */}
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gray-100 rounded-full mb-4">
              <span className="text-xs text-gray-500 font-semibold uppercase">Quality Score</span>
              <span className={`text-sm font-bold ${
                qualityScore > 80 ? 'text-green-600' : qualityScore > 50 ? 'text-yellow-600' : 'text-red-600'
              }`}>
                {qualityScore}
              </span>
            </div>

            {/* Skills */}
            {profileData && profileData.skills.length > 0 && (
              <div className="flex flex-wrap justify-center gap-2 mb-4">
                {profileData.skills.map(skill => (
                  <span key={skill} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                    {skill}
                  </span>
                ))}
              </div>
            )}

            <div className="flex items-center justify-center gap-2 mb-4">
              <div className="flex text-amber-400">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star 
                    key={star} 
                    size={20} 
                    fill={averageRating && star <= Math.round(averageRating) ? "currentColor" : "none"} 
                    className={averageRating && star <= Math.round(averageRating) ? "" : "text-gray-300"}
                  />
                ))}
              </div>
              <span className="text-lg font-bold text-gray-800">
                {averageRating ? averageRating.toFixed(1) : 'N/A'}
              </span>
              <span className="text-gray-400 text-sm">({reviews.length} reviews)</span>
            </div>

            {profileData?.bio && (
              <p className="text-gray-600 max-w-lg mx-auto italic mb-6">"{profileData.bio}"</p>
            )}

            {currentUser?.role === 'employer' && (
              <button 
                onClick={toggleFavorite}
                className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all mx-auto ${
                  isFavorite 
                    ? 'bg-red-50 text-red-600 border border-red-200' 
                    : 'bg-gray-900 text-white hover:bg-gray-800'
                }`}
              >
                <Heart size={18} fill={isFavorite ? "currentColor" : "none"} />
                {isFavorite ? 'Saved to Favorites' : 'Add to Favorites'}
              </button>
            )}
          </div>
        </div>

        {/* Work History & Reviews Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                <Briefcase className="text-blue-500" /> Work History
              </h2>
            </div>

            {topCategories.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                <span className="text-xs text-gray-500 font-medium py-1">Specialized in:</span>
                {topCategories.map(cat => (
                  <span key={cat} className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-xs font-semibold border border-blue-100">
                    {cat}
                  </span>
                ))}
              </div>
            )}
            
            {completedJobs.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200 text-gray-500">
                No completed jobs yet.
              </div>
            ) : (
              <div className="space-y-3">
                {completedJobs.map(job => {
                  const review = reviews.find(r => r.jobId === job.id);
                  const afterPhoto = job.media?.after?.[0]?.url;
                  const myApp = job.applications?.find(a => a.workerUsername === username);
                  
                  return (
                    <div 
                      key={job.id} 
                      onClick={() => setViewJob(job)}
                      className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-all cursor-pointer group"
                    >
                      <div className="flex gap-3">
                        <div className="w-16 h-16 rounded-lg bg-gray-100 flex-shrink-0 overflow-hidden border border-gray-200 flex items-center justify-center">
                          {afterPhoto ? (
                            <img src={afterPhoto} alt="Job" className="w-full h-full object-cover" />
                          ) : (
                            <CheckSquare className="text-gray-300" size={24} />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-1">
                            <h3 className="font-bold text-gray-900 truncate group-hover:text-blue-600 transition-colors">{job.title}</h3>
                            <span className="text-xs text-gray-400 whitespace-nowrap">{job.completedAt ? new Date(job.completedAt).toLocaleDateString() : 'Done'}</span>
                          </div>
                          
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{job.category}</span>
                            {myApp && (
                              <span className="text-[10px] font-mono text-gray-500">
                                {job.isAuction ? 'Bid' : 'Fixed'}: {myApp.offeredPrice} ₼
                              </span>
                            )}
                          </div>
                          
                          {review ? (
                            <div className="flex items-center gap-1">
                              <div className="flex text-amber-400">
                                {[1, 2, 3, 4, 5].map(s => (
                                  <Star key={s} size={10} fill={s <= review.rating ? "currentColor" : "none"} className={s <= review.rating ? "" : "text-gray-300"} />
                                ))}
                              </div>
                              <span className="text-xs font-bold text-gray-700 ml-1">{review.rating.toFixed(1)}</span>
                            </div>
                          ) : (
                            <span className="text-[10px] text-gray-400 italic">No rating</span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
              <MessageSquare className="text-blue-500" /> Reviews
            </h2>
            
            {reviews.length === 0 ? (
              <div className="bg-white rounded-xl p-8 text-center border border-gray-200 text-gray-500">
                This worker has no reviews yet.
              </div>
            ) : (
              reviews.map((review) => (
                <div key={review.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center gap-2">
                      <div className="bg-gray-100 p-1.5 rounded-full">
                        <User size={14} className="text-gray-500" />
                      </div>
                      <span className="font-semibold text-gray-900 text-sm">{review.employerUsername}</span>
                    </div>
                    <span className="text-xs text-gray-400">
                      {new Date(review.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  <div className="flex text-amber-400 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star 
                        key={star} 
                        size={16} 
                        fill={star <= review.rating ? "currentColor" : "none"} 
                        className={star <= review.rating ? "" : "text-gray-300"}
                      />
                    ))}
                  </div>
                  
                  <p className="text-gray-700 text-sm leading-relaxed">"{review.comment}"</p>
                </div>
              ))
            )}
          </div>

        </div>

        {viewJob && (
          <JobDetailsModal 
            isOpen={!!viewJob}
            onClose={() => setViewJob(null)}
            job={viewJob}
            viewerRole="employer"
          />
        )}
      </div>
    </div>
  );
}
