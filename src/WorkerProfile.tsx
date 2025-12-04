import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Star, User, ArrowLeft, MessageSquare, Heart, Briefcase, Clock, Award, ShieldCheck } from 'lucide-react';
import { WorkerReview, REVIEW_STORAGE_KEY, WORKER_PROFILE_KEY, WorkerProfileData, FavoriteWorker, FAVORITE_WORKERS_KEY, ADMIN_SETTINGS_KEY, AdminSettings } from './types';
import { getAdminSettings } from './utils';

export default function WorkerProfile() {
  const { username } = useParams<{ username: string }>();
  const navigate = useNavigate();
  
  const [reviews, setReviews] = useState<WorkerReview[]>([]);
  const [averageRating, setAverageRating] = useState<number | null>(null);
  const [profileData, setProfileData] = useState<WorkerProfileData | null>(null);
  
  const [currentUser, setCurrentUser] = useState<{ username: string, role: string } | null>(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [settings, setSettings] = useState<AdminSettings>(getAdminSettings());

  useEffect(() => {
    const sessionStr = localStorage.getItem('currentUser');
    if (sessionStr) {
      setCurrentUser(JSON.parse(sessionStr));
    }
    setSettings(getAdminSettings());
  }, []);

  useEffect(() => {
    if (!username) return;

    // Load Reviews
    const allReviewsStr = localStorage.getItem(REVIEW_STORAGE_KEY);
    if (allReviewsStr) {
      const allReviews: WorkerReview[] = JSON.parse(allReviewsStr);
      const workerReviews = allReviews.filter(r => r.workerUsername === username);
      workerReviews.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
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
      <div className="max-w-4xl mx-auto space-y-6">
        
        {/* Back Button */}
        <button 
          onClick={() => navigate(-1)}
          className="flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ArrowLeft size={20} /> Back
        </button>

        {/* Profile Header */}
        <div className="bg-white rounded-xl shadow-sm p-8 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-r from-blue-600 to-purple-600 opacity-10"></div>
          
          <div className="relative flex flex-col md:flex-row items-center md:items-start gap-6">
            <div className="w-32 h-32 bg-white border-4 border-white shadow-lg text-blue-600 rounded-full flex items-center justify-center flex-shrink-0">
              <User size={64} />
            </div>
            
            <div className="flex-1 text-center md:text-left">
              <div className="flex flex-col md:flex-row items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold text-gray-900">{username}</h1>
                {profileData?.availability && (
                  <span className={`px-3 py-1 rounded-full text-xs font-bold uppercase ${
                    profileData.availability === 'Available' ? 'bg-green-100 text-green-700' :
                    profileData.availability === 'Busy' ? 'bg-red-100 text-red-700' :
                    'bg-yellow-100 text-yellow-700'
                  }`}>
                    {profileData.availability}
                  </span>
                )}
              </div>

              {/* Stats Row */}
              <div className="flex flex-wrap justify-center md:justify-start gap-4 mb-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Star className="text-amber-400" size={16} fill="currentColor" />
                  <span className="font-bold text-gray-900">{averageRating ? averageRating.toFixed(1) : 'N/A'}</span>
                  <span>({reviews.length} reviews)</span>
                </div>
                {profileData?.experience && (
                  <div className="flex items-center gap-1">
                    <Briefcase size={16} />
                    <span>{profileData.experience} Years Exp.</span>
                  </div>
                )}
              </div>

              {/* Bio */}
              {profileData?.bio && (
                <p className="text-gray-600 italic mb-4 max-w-xl">"{profileData.bio}"</p>
              )}

              {/* Skills */}
              {profileData && profileData.skills.length > 0 && (
                <div className="flex flex-wrap justify-center md:justify-start gap-2 mb-6">
                  {profileData.skills.map(skill => (
                    <span key={skill} className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-medium">
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Badges (Toggle) */}
              {settings.premiumBadges && (
                <div className="flex gap-2 mb-6">
                  {averageRating && averageRating >= 4.5 && (
                    <span className="flex items-center gap-1 bg-amber-50 text-amber-700 px-2 py-1 rounded border border-amber-200 text-xs font-bold">
                      <Award size={14} /> Top Rated
                    </span>
                  )}
                  {reviews.length > 5 && (
                    <span className="flex items-center gap-1 bg-blue-50 text-blue-700 px-2 py-1 rounded border border-blue-200 text-xs font-bold">
                      <ShieldCheck size={14} /> Verified Pro
                    </span>
                  )}
                </div>
              )}

              {/* Favorite Button */}
              {currentUser?.role === 'employer' && (
                <button 
                  onClick={toggleFavorite}
                  className={`flex items-center gap-2 px-6 py-2 rounded-full font-medium transition-all ${
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
        </div>

        {/* Portfolio Section */}
        {profileData?.portfolio && profileData.portfolio.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Briefcase className="text-blue-500" /> Portfolio
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {profileData.portfolio.map((url, idx) => (
                <div key={idx} className="aspect-square rounded-lg overflow-hidden bg-gray-100 border border-gray-200 hover:shadow-md transition-all cursor-pointer">
                  <img src={url} alt={`Portfolio ${idx}`} className="w-full h-full object-cover hover:scale-105 transition-transform duration-300" />
                </div>
              ))}
            </div>
          </div>
        )}

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
    </div>
  );
}
