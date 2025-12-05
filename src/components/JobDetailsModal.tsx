import React, { useState } from 'react';
import { X, MapPin, Calendar, DollarSign, Clock, CheckCircle, User, Briefcase, Image as ImageIcon, Gavel, AlertTriangle, Send } from 'lucide-react';
import { JobPost, JobApplication, JOB_STORAGE_KEY, JobCategory } from '../types';
import { createNotification } from '../utils';
import { logActivity } from '../utils/advancedFeatures';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  job: JobPost;
  currentWorkerUsername?: string;
  viewerRole?: 'worker' | 'employer';
  onReport?: () => void;
  onOfferSent?: () => void; // NEW: Callback for state update
}

export default function JobDetailsModal({ isOpen, onClose, job, currentWorkerUsername, viewerRole = 'worker', onReport, onOfferSent }: Props) {
  const [offerPrice, setOfferPrice] = useState('');
  const [offerMessage, setOfferMessage] = useState('');
  const [canMeetDeadline, setCanMeetDeadline] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  if (!isOpen) return null;

  const myApplication = currentWorkerUsername ? job.applications?.find(a => a.workerUsername === currentWorkerUsername) : null;
  const canApply = viewerRole === 'worker' && job.status === 'open' && !myApplication && currentWorkerUsername;

  const handleSendOffer = () => {
    if (!currentWorkerUsername || !offerPrice) return;

    setIsSubmitting(true);
    
    setTimeout(() => {
      const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
      if (allJobsStr) {
        const allJobs: JobPost[] = JSON.parse(allJobsStr);
        const jobIndex = allJobs.findIndex(j => j.id === job.id);
        
        if (jobIndex !== -1) {
          const newApp: JobApplication = {
            id: crypto.randomUUID(),
            workerUsername: currentWorkerUsername,
            offeredPrice: Number(offerPrice),
            message: offerMessage,
            createdAt: new Date().toISOString(),
            status: 'pending',
            canMeetDeadline
          };

          if (!allJobs[jobIndex].applications) allJobs[jobIndex].applications = [];
          allJobs[jobIndex].applications.push(newApp);
          
          localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(allJobs));
          
          logActivity(currentWorkerUsername, 'worker', 'OFFER_SENT', { jobId: job.id, price: offerPrice, source: 'JobDetailsModal' });
          createNotification(job.employerUsername, 'newOffer', job.id, { workerName: currentWorkerUsername }, 'offers');
          
          setSuccessMsg("Offer sent successfully!");
          
          // Notify parent to update UI
          if (onOfferSent) onOfferSent();
        }
      }
      setIsSubmitting(false);
    }, 800);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-in zoom-in-95 overflow-hidden">
        
        {/* Header */}
        <div className="p-6 border-b border-gray-100 flex justify-between items-start bg-gray-50">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-xs font-bold bg-blue-100 text-blue-700 uppercase tracking-wide">
                {job.category}
              </span>
              <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wide ${
                job.status === 'open' ? 'bg-green-100 text-green-700' :
                job.status === 'processing' ? 'bg-blue-100 text-blue-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {job.status}
              </span>
            </div>
            <h2 className="text-2xl font-bold text-gray-900">{job.title}</h2>
            <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center gap-1"><User size={14} /> {job.employerUsername}</span>
              <span className="flex items-center gap-1"><Clock size={14} /> Posted {new Date(job.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full transition-colors">
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-8">
          
          {/* Main Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg"><DollarSign size={20} /></div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Budget / Price</p>
                  <p className="font-bold text-gray-900 text-lg">
                    {job.isAuction ? 'Open Bidding' : `${job.budget} ₼`}
                  </p>
                  {job.isAuction && <p className="text-xs text-purple-600 flex items-center gap-1"><Gavel size={10} /> Auction Mode</p>}
                </div>
              </div>
              
              <div className="flex items-start gap-3">
                <div className="p-2 bg-purple-50 text-purple-600 rounded-lg"><MapPin size={20} /></div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Location</p>
                  <p className="font-medium text-gray-900">{job.address}</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg"><Calendar size={20} /></div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Timeline</p>
                  <p className="font-medium text-gray-900">{job.daysToComplete} Days estimated</p>
                  {job.desiredCompletion && (
                    <p className="text-xs text-amber-700 mt-1">
                      Deadline: {job.desiredCompletion.type === 'date' ? new Date(job.desiredCompletion.value).toLocaleDateString() : job.desiredCompletion.value}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="p-2 bg-gray-100 text-gray-600 rounded-lg"><Briefcase size={20} /></div>
                <div>
                  <p className="text-xs font-bold text-gray-500 uppercase">Materials</p>
                  <p className="font-medium text-gray-900">
                    {job.materials === 'by_employer' ? 'Provided by Employer' : 
                     job.materials === 'by_worker' ? 'Provided by Worker' : 'Not specified / None'}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Description */}
          <div>
            <h3 className="font-bold text-gray-900 mb-2 text-sm uppercase tracking-wide">Description</h3>
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-100 text-gray-700 leading-relaxed whitespace-pre-wrap">
              {job.description}
            </div>
          </div>

          {/* Media */}
          {job.media && (job.media.before.length > 0 || job.media.after.length > 0) && (
            <div>
              <h3 className="font-bold text-gray-900 mb-3 text-sm uppercase tracking-wide flex items-center gap-2">
                <ImageIcon size={16} /> Photos
              </h3>
              <div className="space-y-4">
                {job.media.before.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-2">Before Work</p>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {job.media.before.map((m, i) => (
                        <div key={i} className="w-24 h-24 flex-shrink-0 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden">
                          <img src={m.url} alt="Before" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                {job.media.after.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-500 mb-2">After Work</p>
                    <div className="flex gap-3 overflow-x-auto pb-2">
                      {job.media.after.map((m, i) => (
                        <div key={i} className="w-24 h-24 flex-shrink-0 rounded-lg bg-gray-100 border border-gray-200 overflow-hidden">
                          <img src={m.url} alt="After" className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* My Application Status */}
          {viewerRole === 'worker' && (myApplication || successMsg) ? (
            <div className={`p-4 rounded-xl border ${
              (myApplication?.status === 'accepted' || successMsg) ? 'bg-green-50 border-green-200' : 
              myApplication?.status === 'rejected' ? 'bg-red-50 border-red-200' : 
              'bg-blue-50 border-blue-200'
            }`}>
              <h3 className="font-bold text-gray-900 mb-2 text-sm uppercase tracking-wide">My Offer</h3>
              {successMsg ? (
                 <div className="flex items-center gap-2 text-green-700 font-bold">
                   <CheckCircle size={20} /> {successMsg}
                 </div>
              ) : (
                <>
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-2xl font-bold text-gray-900">{myApplication?.offeredPrice} ₼</p>
                      <p className="text-xs text-gray-500">Sent on {myApplication && new Date(myApplication.createdAt).toLocaleString()}</p>
                    </div>
                    <div className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${
                      myApplication?.status === 'accepted' ? 'bg-green-200 text-green-800' : 
                      myApplication?.status === 'rejected' ? 'bg-red-200 text-red-800' : 
                      'bg-blue-200 text-blue-800'
                    }`}>
                      {myApplication?.status}
                    </div>
                  </div>
                  {myApplication?.message && (
                    <p className="mt-2 text-sm text-gray-600 italic">"{myApplication.message}"</p>
                  )}
                </>
              )}
            </div>
          ) : null}
          
          {/* Send Offer Form */}
          {canApply && !successMsg && (
            <div className="bg-white border border-blue-200 rounded-xl p-5 shadow-sm ring-1 ring-blue-50">
              <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                <Send size={18} className="text-blue-600" /> Send an Offer
              </h3>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-bold text-gray-700 mb-1">Your Price (₼)</label>
                    <div className="relative">
                      <DollarSign className="absolute left-3 top-2.5 text-gray-400" size={14} />
                      <input 
                        type="number" 
                        value={offerPrice}
                        onChange={e => setOfferPrice(e.target.value)}
                        className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                        placeholder="0.00"
                      />
                    </div>
                  </div>
                  {job.desiredCompletion && (
                    <div className="flex items-end pb-2">
                       <label className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
                         <input 
                           type="checkbox" 
                           checked={canMeetDeadline}
                           onChange={e => setCanMeetDeadline(e.target.checked)}
                           className="w-4 h-4 text-blue-600 rounded"
                         />
                         I can meet the deadline
                       </label>
                    </div>
                  )}
                </div>
                
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Message (Optional)</label>
                  <textarea 
                    value={offerMessage}
                    onChange={e => setOfferMessage(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none h-20 resize-none"
                    placeholder="Why are you the best fit for this job?"
                  />
                </div>
                
                <button 
                  onClick={handleSendOffer}
                  disabled={!offerPrice || isSubmitting}
                  className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  {isSubmitting ? 'Sending...' : 'Submit Offer'}
                </button>
              </div>
            </div>
          )}

          {/* Worker Report Button */}
          {viewerRole === 'worker' && (job.status === 'processing' || job.status === 'completed') && onReport && (
            <div className="border-t border-gray-100 pt-4 flex justify-end">
              <button 
                onClick={onReport}
                className="text-red-500 hover:text-red-700 text-xs font-bold flex items-center gap-1"
              >
                <AlertTriangle size={14} /> Report a Problem with this Job
              </button>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
