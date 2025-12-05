import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, User, ArrowLeft, MessageSquare, Heart, Briefcase } from 'lucide-react';
import { WorkerReview, REVIEW_STORAGE_KEY, WORKER_PROFILE_KEY, WorkerProfileData, FavoriteWorker, FAVORITE_WORKERS_KEY } from './types';
import { calculateWorkerQuality, getBadges } from './utils/advancedFeatures';
import { isFeatureEnabled } from './utils/featureFlags';
import GamificationBadges from './components/GamificationBadges';
import PremiumBadge from './components/PremiumBadge';
import BehaviorScore from './components/BehaviorScore';

export default function WorkerProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  
  const [reviews, setReviews] = useState<WorkerReview[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [profileData, setProfileData] = useState<WorkerProfileData | null>(null);
  
  const [currentUser, setCurrentUser] = useState<{ username: string, role: string } | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);

  // Advanced
  const [qualityScore, setQualityScore] = useState(0);
  const [badges, setBadges] = useState<any[]>([]);

  // Feature Flags
  const showPremium = isFeatureEnabled('premiumBadges');
  const showBehavior = isFeatureEnabled('behaviorMonitoring');

  useEffect(() => {
    const sessionStr = localStorage.getItem('currentUser');
    if (sessionStr) {
      setCurrentUser(JSON.parse(sessionStr));
    }
  }, []);

  useEffect(() => {
    if (!username) return;

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

  return (
    <div className="min-h-screen bg-gray-100 p-4 font-sans">
      <div className="max-w-3xl mx-auto space-y-6">
        
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
            <div className="w-24 h-24 bg-white border-4 border-white shadow-lg text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
              <User size={48} />
            </div>
            
            <div className="flex justify-center mb-2">
              <GamificationBadges badges={badges} />
            </div>

            <div className="flex items-center justify-center gap-2 mb-2">
              <h1 className="text-3xl font-bold text-gray-900">{username}</h1>
              {showPremium && <PremiumBadge username={username} role="worker" size="md" />}
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

            {/* Bio */}
            {profileData?.bio && (
              <p className="text-gray-600 max-w-lg mx-auto italic mb-6">"{profileData.bio}"</p>
            )}

            {/* Favorite Button (Employer Only) */}
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

        {/* Reviews List */}
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
            <MessageSquare className="text-blue-500" />
            Reviews
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
                      <Briefcase size={14} className="text-gray-500" />
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
    </div>
  );
}
