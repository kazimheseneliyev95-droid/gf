import React, { useState } from 'react';
import { X, Save, DollarSign, Clock, MapPin, AlertTriangle, Plus, Lock } from 'lucide-react';
import { JobPost, JobCategory, JOB_CATEGORIES, JOB_STORAGE_KEY } from '../types';
import { createNotification } from '../utils';
import { logActivity } from '../utils/advancedFeatures';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  job: JobPost;
  onSave: () => void;
  currentUser: string;
}

export default function EditJobModal({ isOpen, onClose, job, onSave, currentUser }: Props) {
  const [formData, setFormData] = useState<Partial<JobPost>>({
    ...job,
    tags: job.tags || [],
    media: job.media || { before: [], after: [] }
  });
  const [mediaUrl, setMediaUrl] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  // Determine editability based on status
  const hasOffers = job.applications && job.applications.length > 0;
  const isAccepted = job.status === 'processing' || job.status === 'completed';
  
  // Strict Lock: If accepted, completely read-only
  const isLocked = isAccepted; 
  
  // Warning: If pending offers exist but not accepted, show warning
  const showWarning = hasOffers && !isAccepted;

  const handleChange = (field: keyof JobPost, value: any) => {
    if (isLocked) return; // Prevent changes if locked
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleAddMedia = () => {
    if (isLocked) return;
    if (mediaUrl.trim()) {
      const newMedia = [...(formData.media?.before || []), { url: mediaUrl, type: 'image' as const }];
      setFormData(prev => ({ ...prev, media: { ...prev.media!, before: newMedia } }));
      setMediaUrl('');
    }
  };

  const handleRemoveMedia = (index: number) => {
    if (isLocked) return;
    const newMedia = [...(formData.media?.before || [])];
    newMedia.splice(index, 1);
    setFormData(prev => ({ ...prev, media: { ...prev.media!, before: newMedia } }));
  };

  const handleAddTag = () => {
    if (isLocked) return;
    if (tagInput.trim()) {
      setFormData(prev => ({ ...prev, tags: [...(prev.tags || []), tagInput.trim()] }));
      setTagInput('');
    }
  };

  const handleRemoveTag = (tag: string) => {
    if (isLocked) return;
    setFormData(prev => ({ ...prev, tags: (prev.tags || []).filter(t => t !== tag) }));
  };

  const handleSave = () => {
    if (isLocked) return;

    if (!formData.title || !formData.description) {
      setError("Title and Description are required.");
      return;
    }

    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (!allJobsStr) return;
    const allJobs: JobPost[] = JSON.parse(allJobsStr);
    const idx = allJobs.findIndex(j => j.id === job.id);
    if (idx === -1) return;

    // Update job
    const updatedJob = { ...allJobs[idx], ...formData };
    allJobs[idx] = updatedJob as JobPost;
    localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(allJobs));

    // Notifications for Pending Offers
    if (showWarning) {
      const pendingWorkers = job.applications.filter(a => a.status === 'pending').map(a => a.workerUsername);
      const uniqueWorkers = [...new Set(pendingWorkers)];
      uniqueWorkers.forEach(worker => {
        createNotification(worker, 'jobUpdated', job.id, { message: "A job you applied to has been updated." }, 'details');
      });
    }

    logActivity(currentUser, 'employer', 'JOB_UPDATED', { jobId: job.id });
    onSave();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            {isLocked && <Lock size={20} className="text-gray-400" />}
            {isLocked ? 'View Job Details' : 'Edit Job'}
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} /></button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4">
          {isLocked && (
            <div className="bg-red-50 border border-red-200 p-4 rounded-lg text-sm text-red-800 flex items-center gap-3">
              <Lock size={20} className="flex-shrink-0" />
              <div>
                <p className="font-bold">This job is locked.</p>
                <p>The job is already in progress or completed. You cannot edit it anymore.</p>
              </div>
            </div>
          )}
          {!isLocked && showWarning && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded-lg text-sm text-blue-800 flex items-center gap-2">
              <AlertTriangle size={16} />
              Workers have applied. Updating will notify them.
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Title</label>
            <input 
              type="text" 
              value={formData.title} 
              onChange={e => handleChange('title', e.target.value)}
              disabled={isLocked}
              className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
            <textarea 
              value={formData.description} 
              onChange={e => handleChange('description', e.target.value)}
              disabled={isLocked}
              className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none disabled:bg-gray-100 disabled:text-gray-500"
            />
          </div>

          {/* Category & Budget */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Category</label>
              <select 
                value={formData.category} 
                onChange={e => handleChange('category', e.target.value)}
                disabled={isLocked}
                className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white disabled:bg-gray-100 disabled:text-gray-500"
              >
                {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Budget (₼)</label>
              <div className="relative">
                <DollarSign className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                <input 
                  type="number" 
                  value={formData.budget} 
                  onChange={e => handleChange('budget', Number(e.target.value))}
                  disabled={isLocked || (job.isAuction && job.auctionMode === 'open')}
                  className="w-full pl-8 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Address & Days */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Address</label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                <input 
                  type="text" 
                  value={formData.address} 
                  onChange={e => handleChange('address', e.target.value)}
                  disabled={isLocked}
                  className="w-full pl-8 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">Days to Complete</label>
              <div className="relative">
                <Clock className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                <input 
                  type="number" 
                  value={formData.daysToComplete} 
                  onChange={e => handleChange('daysToComplete', Number(e.target.value))}
                  disabled={isLocked}
                  className="w-full pl-8 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none disabled:bg-gray-100 disabled:text-gray-500"
                />
              </div>
            </div>
          </div>

          {/* Tags */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Tags</label>
            {!isLocked && (
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={tagInput}
                  onChange={e => setTagInput(e.target.value)}
                  placeholder="Add tag"
                  className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button onClick={handleAddTag} className="bg-gray-100 p-2 rounded-lg hover:bg-gray-200"><Plus size={18} /></button>
              </div>
            )}
            <div className="flex flex-wrap gap-2">
              {(formData.tags || []).map(tag => (
                <span key={tag} className="bg-gray-100 text-gray-700 px-2 py-1 rounded text-xs flex items-center gap-1">
                  {tag}
                  {!isLocked && <button onClick={() => handleRemoveTag(tag)}><X size={12} /></button>}
                </span>
              ))}
              {(!formData.tags || formData.tags.length === 0) && isLocked && (
                <span className="text-xs text-gray-400 italic">No tags</span>
              )}
            </div>
          </div>

          {/* Media (Before) */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Before Photos</label>
            {!isLocked && (
              <div className="flex gap-2 mb-2">
                <input 
                  type="text" 
                  value={mediaUrl}
                  onChange={e => setMediaUrl(e.target.value)}
                  placeholder="Image URL"
                  className="flex-1 p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button onClick={handleAddMedia} className="bg-gray-100 p-2 rounded-lg hover:bg-gray-200"><Plus size={18} /></button>
              </div>
            )}
            <div className="flex gap-2 overflow-x-auto">
              {(formData.media?.before || []).map((m, i) => (
                <div key={i} className="relative w-16 h-16 rounded bg-gray-100 overflow-hidden group border border-gray-200">
                  <img src={m.url} alt="preview" className="w-full h-full object-cover" />
                  {!isLocked && (
                    <button 
                      onClick={() => handleRemoveMedia(i)}
                      className="absolute top-0 right-0 bg-red-500 text-white p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X size={12} />
                    </button>
                  )}
                </div>
              ))}
              {(!formData.media?.before || formData.media.before.length === 0) && isLocked && (
                <span className="text-xs text-gray-400 italic">No photos</span>
              )}
            </div>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">
            {isLocked ? 'Close' : 'Cancel'}
          </button>
          {!isLocked && (
            <button onClick={handleSave} className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 flex items-center justify-center gap-2">
              <Save size={16} /> Save Changes
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
