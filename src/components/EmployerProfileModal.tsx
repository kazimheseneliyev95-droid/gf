import React, { useState, useEffect } from 'react';
import { X, Save, Briefcase, MapPin, CheckSquare, DollarSign, User, Star, Clock, Info } from 'lucide-react';
import { EmployerProfileData, JOB_CATEGORIES } from '../types';
import { getEmployerProfile, saveEmployerProfile, calculateEmployerTrust } from '../utils/advancedFeatures';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  username: string;
  readOnly?: boolean;
  currentUser?: string; // If editing
}

export default function EmployerProfileModal({ isOpen, onClose, username, readOnly = false, currentUser }: Props) {
  const [profile, setProfile] = useState<EmployerProfileData>({
    username,
    companyName: '',
    city: '',
    bio: '',
    preferredCategories: [],
    activeHours: '',
    jobsPerMonth: ''
  });
  const [trustScore, setTrustScore] = useState(0);
  const [completeness, setCompleteness] = useState(0);

  useEffect(() => {
    if (isOpen) {
      const data = getEmployerProfile(username);
      if (data) setProfile(data);
      else setProfile(prev => ({ ...prev, username })); // Reset if new

      setTrustScore(calculateEmployerTrust(username));
    }
  }, [isOpen, username]);

  useEffect(() => {
    // Calculate completeness
    let filled = 0;
    const fields = ['companyName', 'city', 'bio', 'activeHours', 'jobsPerMonth'];
    fields.forEach(f => { if ((profile as any)[f]) filled++; });
    if (profile.preferredCategories && profile.preferredCategories.length > 0) filled++;
    setCompleteness(Math.round((filled / (fields.length + 1)) * 100));
  }, [profile]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (readOnly) return;
    saveEmployerProfile(profile);
    onClose();
  };

  const toggleCategory = (cat: string) => {
    if (readOnly) return;
    setProfile(prev => {
      const cats = prev.preferredCategories || [];
      return {
        ...prev,
        preferredCategories: cats.includes(cat) ? cats.filter(c => c !== cat) : [...cats, cat]
      };
    });
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col animate-in zoom-in-95 overflow-hidden">
        
        {/* Header */}
        <div className="relative h-32 bg-gradient-to-r from-blue-600 to-indigo-700 flex-shrink-0">
          <button onClick={onClose} className="absolute top-4 right-4 bg-black/20 text-white p-2 rounded-full hover:bg-black/40 transition-colors">
            <X size={20} />
          </button>
          <div className="absolute -bottom-12 left-8">
            <div className="w-24 h-24 bg-white rounded-full border-4 border-white shadow-md flex items-center justify-center text-blue-600 relative">
              <User size={48} />
              {!readOnly && (
                <div className="absolute bottom-0 right-0 bg-green-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full border-2 border-white">
                  {completeness}%
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="pt-14 px-8 pb-8 overflow-y-auto">
          {/* Info Header */}
          <div className="flex justify-between items-start mb-6">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{readOnly ? (profile.companyName || username) : 'Edit Profile'}</h2>
              {readOnly && profile.companyName && <p className="text-sm text-gray-500">@{username}</p>}
              <div className="flex items-center gap-2 mt-2">
                 <span className="bg-blue-100 text-blue-700 text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                   Trust Score: {trustScore}
                 </span>
                 {profile.city && (
                   <span className="text-gray-500 text-xs flex items-center gap-1">
                     <MapPin size={12} /> {profile.city}
                   </span>
                 )}
              </div>
            </div>
          </div>

          {/* Form / View */}
          <div className="space-y-4">
            {!readOnly && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Company / Display Name</label>
                <input 
                  type="text" 
                  value={profile.companyName || ''} 
                  onChange={e => setProfile({...profile, companyName: e.target.value})}
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Tech Solutions Ltd."
                />
              </div>
            )}

            {!readOnly && (
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">City / Location</label>
                <input 
                  type="text" 
                  value={profile.city || ''} 
                  onChange={e => setProfile({...profile, city: e.target.value})}
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="e.g. Baku"
                />
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Active Hours</label>
                {readOnly ? (
                  <p className="text-sm text-gray-800 flex items-center gap-1">
                    <Clock size={14} className="text-gray-400" /> {profile.activeHours || "Not specified"}
                  </p>
                ) : (
                  <input 
                    type="text" 
                    value={profile.activeHours || ''} 
                    onChange={e => setProfile({...profile, activeHours: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                    placeholder="e.g. Mon-Fri 9am-6pm"
                  />
                )}
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Jobs per Month</label>
                {readOnly ? (
                  <p className="text-sm text-gray-800 flex items-center gap-1">
                    <Briefcase size={14} className="text-gray-400" /> {profile.jobsPerMonth || "N/A"}
                  </p>
                ) : (
                  <>
                    <input 
                      type="text" 
                      value={profile.jobsPerMonth || ''} 
                      onChange={e => setProfile({...profile, jobsPerMonth: e.target.value})}
                      className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                      placeholder="e.g. 5-10"
                    />
                    <p className="text-[10px] text-gray-400 mt-1">Optional – helps us understand your hiring volume.</p>
                  </>
                )}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">About</label>
              {readOnly ? (
                <p className="text-sm text-gray-600 italic">{profile.bio || "No bio provided."}</p>
              ) : (
                <>
                  <textarea 
                    value={profile.bio || ''} 
                    onChange={e => setProfile({...profile, bio: e.target.value})}
                    className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none"
                    placeholder="Tell workers about your business or hiring needs..."
                  />
                  <p className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
                    <Info size={10} /> A clear description helps workers understand your needs.
                  </p>
                </>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-700 mb-2">Preferred Categories</label>
              <div className="flex flex-wrap gap-2">
                {JOB_CATEGORIES.map(cat => {
                  const isSelected = (profile.preferredCategories || []).includes(cat);
                  if (readOnly && !isSelected) return null;
                  return (
                    <button
                      key={cat}
                      onClick={() => toggleCategory(cat)}
                      disabled={readOnly}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        isSelected 
                          ? 'bg-blue-50 border-blue-500 text-blue-700' 
                          : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      }`}
                    >
                      {cat}
                    </button>
                  );
                })}
                {readOnly && (profile.preferredCategories || []).length === 0 && (
                  <span className="text-xs text-gray-400 italic">None specified</span>
                )}
              </div>
            </div>
          </div>

          {!readOnly && (
            <div className="mt-8 pt-4 border-t border-gray-100">
              <button 
                onClick={handleSave}
                className="w-full py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 shadow-sm"
              >
                <Save size={18} /> Save Profile
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
