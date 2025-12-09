import React, { useState, useEffect } from 'react';
import { X, DollarSign, Clock, MapPin, Plus, Gavel, Image as ImageIcon, ArrowRight, ArrowLeft, CheckCircle, Info, Calculator } from 'lucide-react';
import { JobPost, JobCategory, JOB_CATEGORIES, JOB_STORAGE_KEY, MediaItem } from '../types';
import { isFeatureEnabled } from '../utils/featureFlags';
import { logActivity } from '../utils/advancedFeatures';
import { getCategoryAverageBudget } from '../utils/analytics';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  currentUser: string;
}

export default function CreateJobModal({ isOpen, onClose, onSuccess, currentUser }: Props) {
  const [step, setStep] = useState(1);
  
  // Form State
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<JobCategory>('Other');
  const [address, setAddress] = useState('');
  
  const [budget, setBudget] = useState('');
  const [days, setDays] = useState('');
  const [isAuction, setIsAuction] = useState(false);
  const [priceBasis, setPriceBasis] = useState<'total' | 'per_day'>('total');
  
  const [deadlineType, setDeadlineType] = useState<'none' | 'date' | 'relative'>('none');
  const [deadlineValue, setDeadlineValue] = useState('');
  const [materials, setMaterials] = useState<'by_employer' | 'by_worker' | 'none'>('none');
  
  const [tags, setTags] = useState('');
  const [mediaUrl, setMediaUrl] = useState('');
  const [beforeMedia, setBeforeMedia] = useState<MediaItem[]>([]);

  const [error, setError] = useState('');
  const [avgBudget, setAvgBudget] = useState<number | null>(null);
  
  const showAuction = isFeatureEnabled('auctionMode');

  useEffect(() => {
    if (isOpen) {
      // Calculate average budget for category hint
      const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
      if (allJobsStr) {
        const allJobs = JSON.parse(allJobsStr);
        setAvgBudget(getCategoryAverageBudget(category, allJobs));
      }
    }
  }, [category, isOpen]);

  if (!isOpen) return null;

  const handleAddMedia = () => {
    if (mediaUrl.trim()) {
      setBeforeMedia([...beforeMedia, { url: mediaUrl, type: 'image' }]);
      setMediaUrl('');
    }
  };

  const validateStep = (currentStep: number) => {
    setError('');
    if (currentStep === 1) {
      if (!title || !description || !address) {
        setError('Please fill in all required fields.');
        return false;
      }
    } else if (currentStep === 2) {
      if ((!isAuction && !budget) || !days) {
        setError('Please provide budget and timeline.');
        return false;
      }
    }
    return true;
  };

  const nextStep = () => {
    if (validateStep(step)) setStep(step + 1);
  };

  const prevStep = () => setStep(step - 1);

  const handleCreateJob = () => {
    if (!validateStep(3)) return; // Should be valid by now

    // Calculate final budget based on basis
    let finalBudget = Number(budget);
    if (priceBasis === 'per_day' && !isAuction) {
      finalBudget = Number(budget) * Number(days);
    }

    const newJob: JobPost = {
      id: crypto.randomUUID(),
      employerUsername: currentUser,
      title,
      description,
      budget: isAuction ? 0 : finalBudget,
      address,
      daysToComplete: Number(days),
      createdAt: new Date().toISOString(),
      applications: [],
      status: 'open',
      category,
      tags: tags.split(',').map(t => t.trim()).filter(t => t),
      isAuction: isAuction && showAuction,
      auctionMode: (isAuction && showAuction) ? 'open' : 'none',
      priceBasis, // NEW
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
    setPriceBasis('total');
    setStep(1);
    
    onSuccess();
    onClose();
  };

  // Calculated total for preview
  const calculatedTotal = priceBasis === 'per_day' && budget && days ? Number(budget) * Number(days) : Number(budget);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col animate-in zoom-in-95">
        
        {/* Header with Steps */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">Post a New Job</h2>
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={24} /></button>
          </div>
          
          <div className="flex items-center justify-between px-2">
            {[1, 2, 3].map((s) => (
              <div key={s} className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition-colors ${
                  step >= s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-400'
                }`}>
                  {s}
                </div>
                <span className={`text-xs font-medium hidden sm:block ${step >= s ? 'text-blue-600' : 'text-gray-400'}`}>
                  {s === 1 ? 'Basics' : s === 2 ? 'Pricing & Time' : 'Extras'}
                </span>
                {s < 3 && <div className={`h-1 w-12 sm:w-24 rounded-full mx-2 ${step > s ? 'bg-blue-600' : 'bg-gray-100'}`} />}
              </div>
            ))}
          </div>
        </div>

        <div className="p-6 overflow-y-auto">
          {error && <div className="mb-4 p-3 bg-red-50 text-red-600 rounded-lg text-sm flex items-center gap-2"><Info size={16} /> {error}</div>}

          {/* Step 1: Basics */}
          {step === 1 && (
            <div className="space-y-4 animate-in fade-in slide-in-from-right-4">
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Job Title *</label>
                <input type="text" placeholder="e.g. House Painting" value={title} onChange={e => setTitle(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Category</label>
                <select value={category} onChange={e => setCategory(e.target.value as JobCategory)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none bg-white">
                  {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Description *</label>
                <textarea placeholder="Describe the work needed..." value={description} onChange={e => setDescription(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-32 resize-none" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Address / Location *</label>
                <div className="relative">
                  <MapPin className="absolute left-3 top-2.5 text-gray-400" size={16} />
                  <input type="text" placeholder="City / Area" value={address} onChange={e => setAddress(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Pricing & Time */}
          {step === 2 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              
              {/* Pricing Model & Basis */}
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-4">
                {showAuction && (
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-2">Pricing Model</label>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="priceType" checked={!isAuction} onChange={() => setIsAuction(false)} className="text-blue-600 focus:ring-blue-500" />
                        Fixed Price
                      </label>
                      <label className="flex items-center gap-2 text-sm cursor-pointer">
                        <input type="radio" name="priceType" checked={isAuction} onChange={() => { setIsAuction(true); setBudget(''); }} className="text-blue-600 focus:ring-blue-500" />
                        <span className="flex items-center gap-1 text-purple-700 font-bold"><Gavel size={14} /> Open Bidding</span>
                      </label>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-2">Price Basis</label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="priceBasis" checked={priceBasis === 'total'} onChange={() => setPriceBasis('total')} className="text-blue-600 focus:ring-blue-500" />
                      Total Job Cost
                    </label>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="radio" name="priceBasis" checked={priceBasis === 'per_day'} onChange={() => setPriceBasis('per_day')} className="text-blue-600 focus:ring-blue-500" />
                      Per Day Rate
                    </label>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className={`block text-xs font-semibold mb-1 ${isAuction ? 'text-gray-400' : 'text-gray-700'}`}>
                    {priceBasis === 'per_day' ? 'Daily Rate (₼) *' : 'Total Budget (₼) *'}
                  </label>
                  <div className="relative">
                    <DollarSign className={`absolute left-3 top-2.5 ${isAuction ? 'text-gray-300' : 'text-gray-400'}`} size={16} />
                    <input type="number" placeholder={isAuction ? "Determined by bids" : "150"} value={isAuction ? '' : budget} onChange={e => setBudget(e.target.value)} disabled={isAuction} className={`w-full pl-10 pr-3 py-2 border rounded-lg text-sm outline-none ${isAuction ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed' : 'border-gray-200 focus:ring-2 focus:ring-blue-500'}`} />
                  </div>
                  {!isAuction && avgBudget && priceBasis === 'total' && (
                    <p className="text-[10px] text-blue-600 mt-1 flex items-center gap-1">
                      <Info size={10} /> Typical total for {category}: ~{avgBudget} ₼
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-700 mb-1">Estimated Days *</label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input type="number" placeholder="3" value={days} onChange={e => setDays(e.target.value)} className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                  </div>
                </div>
              </div>

              {/* Total Preview for Per Day */}
              {priceBasis === 'per_day' && !isAuction && budget && days && (
                <div className="bg-blue-50 p-3 rounded-lg flex items-center justify-between">
                  <span className="text-xs font-bold text-blue-700 uppercase">Estimated Total</span>
                  <div className="flex items-center gap-2 text-blue-800 font-bold">
                    <Calculator size={16} />
                    <span>{Number(budget)} × {days} days = {calculatedTotal} ₼</span>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Desired Completion</label>
                  <select value={deadlineType} onChange={e => setDeadlineType(e.target.value as any)} className="w-full px-2 py-1.5 text-sm border rounded mb-2 bg-white">
                    <option value="none">No strict deadline</option>
                    <option value="date">Specific Date</option>
                    <option value="relative">Relative (e.g. 2 days)</option>
                  </select>
                  {deadlineType !== 'none' && (
                    <input type={deadlineType === 'date' ? 'date' : 'text'} value={deadlineValue} onChange={e => setDeadlineValue(e.target.value)} placeholder={deadlineType === 'relative' ? 'e.g. Within 48 hours' : ''} className="w-full px-2 py-1.5 text-sm border rounded" />
                  )}
                </div>

                <div className="bg-gray-50 p-3 rounded-lg border border-gray-200">
                  <label className="block text-xs font-semibold text-gray-700 mb-2">Materials</label>
                  <select value={materials} onChange={e => setMaterials(e.target.value as any)} className="w-full px-2 py-1.5 text-sm border rounded bg-white">
                    <option value="none">Not specified</option>
                    <option value="by_employer">Provided by Employer</option>
                    <option value="by_worker">Provided by Worker</option>
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Extras */}
          {step === 3 && (
            <div className="space-y-5 animate-in fade-in slide-in-from-right-4">
              <div className="bg-gray-50 p-4 rounded-xl border border-gray-200">
                <label className="block text-xs font-semibold text-gray-700 mb-2">Photos (Before)</label>
                <div className="flex gap-2 mb-3">
                  <input type="text" placeholder="Image URL..." value={mediaUrl} onChange={e => setMediaUrl(e.target.value)} className="flex-1 px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 outline-none" />
                  <button type="button" onClick={handleAddMedia} className="bg-blue-100 hover:bg-blue-200 text-blue-600 p-2 rounded-lg transition-colors"><Plus size={18} /></button>
                </div>
                {beforeMedia.length > 0 ? (
                  <div className="flex gap-2 overflow-x-auto pb-2">
                    {beforeMedia.map((m, i) => (
                      <div key={i} className="w-16 h-16 rounded-lg bg-gray-200 overflow-hidden border border-gray-300 flex-shrink-0">
                        <img src={m.url} alt="preview" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-gray-400 italic">No photos added yet.</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-700 mb-1">Tags</label>
                <input type="text" placeholder="urgent, night shift, heavy lifting" value={tags} onChange={e => setTags(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none" />
                <p className="text-[10px] text-gray-500 mt-1">Comma separated</p>
              </div>
            </div>
          )}
        </div>

        <div className="p-6 border-t border-gray-200 flex justify-between gap-3">
          {step === 1 ? (
            <button onClick={onClose} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-200">Cancel</button>
          ) : (
            <button onClick={prevStep} className="px-6 py-2.5 bg-gray-100 text-gray-600 rounded-lg font-medium text-sm hover:bg-gray-200 flex items-center gap-2">
              <ArrowLeft size={16} /> Back
            </button>
          )}
          
          {step < 3 ? (
            <button onClick={nextStep} className="px-6 py-2.5 bg-blue-600 text-white rounded-lg font-medium text-sm hover:bg-blue-700 flex items-center gap-2 shadow-sm">
              Next <ArrowRight size={16} />
            </button>
          ) : (
            <button onClick={handleCreateJob} className="px-6 py-2.5 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 flex items-center gap-2 shadow-sm">
              <CheckCircle size={16} /> Post Job
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
