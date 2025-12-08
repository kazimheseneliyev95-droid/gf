import React, { useState } from 'react';
import { X, DollarSign, Clock, MapPin, Plus, Gavel, Image as ImageIcon } from 'lucide-react';
import { JobPost, JobCategory, JOB_CATEGORIES, JOB_STORAGE_KEY, MediaItem } from '../types';
import { isFeatureEnabled } from '../utils/featureFlags';
import { logActivity } from '../utils/advancedFeatures';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: string;
}

export default function CreateJobModal({ isOpen, onClose, onSuccess, currentUser }: Props) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [budget, setBudget] = useState('');
  const [address, setAddress] = useState('');
  const [days, setDays] = useState('');
  const [category, setCategory] = useState<JobCategory>('Other');
  const [tags, setTags] = useState('');
  const [isAuction, setIsAuction] = useState(false);
  
  const [deadlineType, setDeadlineType] = useState<'none' | 'date' | 'relative'>('none');
  const [deadlineValue, setDeadlineValue] = useState('');
  const [materials, setMaterials] = useState<'by_employer' | 'by_worker' | 'none'>('none');
  const [mediaUrl, setMediaUrl] = useState('');
  const [beforeMedia, setBeforeMedia] = useState<MediaItem[]>([]);

  const [error, setError] = useState('');
  const showAuction = isFeatureEnabled('auctionMode');

  if (!isOpen) return null;

  const handleAddMedia = () => {
    if (mediaUrl.trim()) {
      setBeforeMedia([...beforeMedia, { url: mediaUrl, type: 'image' }]);
      setMediaUrl('');
    }
  };

  const handleCreateJob = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!title || !description || (!isAuction && !budget) || !address || !days) {
      setError('Please fill in all required fields.');
      return;
    }

    // UPDATED: removed bidCap logic if it existed

    const newJob: JobPost = {
      id: crypto.randomUUID(),
      employerUsername: currentUser,
      title,
      description,
      budget: isAuction ? 0 : Number(budget),
      address,
      daysToComplete: Number(days),
      createdAt: new Date().toISOString(),
      applications: [],
      status: 'open',
      category,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      isAuction: isAuction && showAuction,
      auctionMode: (isAuction && showAuction) ? 'open' : 'none',
      desiredCompletion: deadlineType !== 'none' ? { type: deadlineType, value: deadlineValue } : undefined,
      materials,
      media: { before: beforeMedia, after: [] }
    };

    const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    const allJobs: JobPost[] = allJobsStr ? JSON.parse(allJobsStr) : [];
    allJobs.push(newJob);
    localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(allJobs));
    
    logActivity(currentUser, 'employer', 'JOB_CREATED', { jobId: newJob.id, auction: newJob.isAuction });

    // Reset
    setTitle(''); setDescription(''); setBudget(''); setAddress(''); setDays(''); setTags('');
    setIsAuction(false); setDeadlineType('none'); setDeadlineValue(''); setMaterials('none'); setBeforeMedia([]);
    
    onSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95">
        <div className="p-6 border-b border-gray-200 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900">Post a New Job</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} /></button>
        </div>

        <div className="p-6 overflow-y-auto">
          <form id="create-job-form" onSubmit={handleCreateJob} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Job Title *</label>
              <input type="text" placeholder="e.g. House Painting" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Description *</label>
              <textarea placeholder="Describe the work needed..." value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-24 resize-none" />
            </div>
            
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
              <select value={category} onChange={e => setCategory(e.target.value as JobCategory)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {showAuction && (
              <div className="bg-purple-50 p-3 rounded-lg border border-purple-100">
                <label className="block text-xs font-semibold text-purple-900 mb-2">Price Type</label>
                <div className="flex gap-3">
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="radio" name="priceType" checked={!isAuction} onChange={() => setIsAuction(false)} className="text-blue-600 focus:ring-blue-500" />
                    Fixed Price
                  </label>
                  <label className="flex items-center gap-2 text-xs cursor-pointer">
                    <input type="radio" name="priceType" checked={isAuction} onChange={() => { setIsAuction(true); setBudget(''); }} className="text-blue-600 focus:ring-blue-500" />
                    <span className="flex items-center gap-1 text-purple-700 font-bold"><Gavel size={12} /> Open Bidding</span>
                  </label>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={`block text-xs font-semibold mb-1 ${isAuction ? 'text-gray-400' : 'text-gray-700'}`}>Budget (₼) *</label>
                <div className="relative">
                  <DollarSign className={`absolute left-2.5 top-2.5 ${isAuction ? 'text-gray-300' : 'text-gray-400'}`} size={14} />
                  <input type="number" placeholder={isAuction ? "Determined by bids" : "150"} value={isAuction ? '' : budget} onChange={e => setBudget(e.target.value)} disabled={isAuction} className={`w-full pl-8 pr-2 py-2 border rounded-lg text-sm outline-none ${isAuction ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'}`} />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Days *</label>
                <div className="relative">
                  <Clock className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                  <input type="number" placeholder="3" value={days} onChange={e => setDays(e.target.value)} className="w-full pl-8 pr-2 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>

            {/* UPDATED: Removed Bid Cap UI section here */}

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Address *</label>
              <div className="relative">
                <MapPin className="absolute left-2.5 top-2.5 text-gray-400" size={14} />
                <input type="text" placeholder="City / Area" value={address} onChange={e => setAddress(e.target.value)} className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <label className="block text-xs font-semibold text-gray-700 mb-2">Desired Completion</label>
                <select value={deadlineType} onChange={e => setDeadlineType(e.target.value as any)} className="w-full px-2 py-1 text-xs border rounded mb-2">
                  <option value="none">None</option>
                  <option value="date">Specific Date</option>
                  <option value="relative">Relative</option>
                </select>
                {deadlineType !== 'none' && (
                  <input type={deadlineType === 'date' ? 'date' : 'text'} value={deadlineValue} onChange={e => setDeadlineValue(e.target.value)} placeholder={deadlineType === 'relative' ? 'e.g. Within 48 hours' : ''} className="w-full px-2 py-1 text-xs border rounded" />
                )}
              </div>

              <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                <label className="block text-xs font-semibold text-gray-700 mb-2">Materials</label>
                <select value={materials} onChange={e => setMaterials(e.target.value as any)} className="w-full px-2 py-1 text-xs border rounded">
                  <option value="none">Not specified</option>
                  <option value="by_employer">Provided by Employer</option>
                  <option value="by_worker">Provided by Worker</option>
                </select>
              </div>
            </div>

            <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
              <label className="block text-xs font-semibold text-gray-700 mb-2">Photos (Before)</label>
              <div className="flex gap-2 mb-2">
                <input type="text" placeholder="Image URL..." value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} className="flex-1 px-2 py-1 text-xs border rounded" />
                <button type="button" onClick={handleAddMedia} className="bg-blue-100 text-blue-600 p-1 rounded"><Plus size={14} /></button>
              </div>
              {beforeMedia.length > 0 && (
                <div className="flex gap-1 overflow-x-auto">
                  {beforeMedia.map((m, i) => (
                    <div key={i} className="w-10 h-10 rounded bg-gray-200 overflow-hidden border border-gray-300">
                      <img src={m.url} alt="preview" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">Tags</label>
              <input type="text" placeholder="urgent, night shift" value={tags} onChange={e => setTags(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}
          </form>
        </div>

        <div className="p-6 border-t border-gray-200 flex gap-3">
          <button onClick={onClose} className="flex-1 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium text-sm">Cancel</button>
          <button form="create-job-form" type="submit" className="flex-1 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium text-sm shadow-sm">Post Job</button>
        </div>
      </div>
    </div>
  );
}
