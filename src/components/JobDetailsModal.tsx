import React from 'react';
import { X, MapPin, Calendar, DollarSign, Clock, CheckCircle, User, Briefcase, Image as ImageIcon, Gavel, AlertTriangle } from 'lucide-react';
import { JobPost, JobApplication } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  job: JobPost;
  currentWorkerUsername?: string; // Optional now
  viewerRole?: 'worker' | 'employer'; // New prop to control view mode
  onReport?: () => void; // Optional report callback
}

export default function JobDetailsModal({ isOpen, onClose, job, currentWorkerUsername, viewerRole = 'worker', onReport }: Props) {
  if (!isOpen) return null;

  const myApplication = currentWorkerUsername ? job.applications?.find(a => a.workerUsername === currentWorkerUsername) : null;
  
  // For employer view, we might want to show the assigned worker's offer if viewing history
  // But typically history view is just job details + review.
  
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

          {/* My Application Status - Only for Worker View */}
          {viewerRole === 'worker' && myApplication && (
            <div className={`p-4 rounded-xl border ${
              myApplication.status === 'accepted' ? 'bg-green-50 border-green-200' : 
              myApplication.status === 'rejected' ? 'bg-red-50 border-red-200' : 
              'bg-blue-50 border-blue-200'
            }`}>
              <h3 className="font-bold text-gray-900 mb-2 text-sm uppercase tracking-wide">My Offer</h3>
              <div className="flex justify-between items-center">
                <div>
                  <p className="text-2xl font-bold text-gray-900">{myApplication.offeredPrice} ₼</p>
                  <p className="text-xs text-gray-500">Sent on {new Date(myApplication.createdAt).toLocaleString()}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-sm font-bold uppercase ${
                  myApplication.status === 'accepted' ? 'bg-green-200 text-green-800' : 
                  myApplication.status === 'rejected' ? 'bg-red-200 text-red-800' : 
                  'bg-blue-200 text-blue-800'
                }`}>
                  {myApplication.status}
                </div>
              </div>
              {myApplication.message && (
                <p className="mt-2 text-sm text-gray-600 italic">"{myApplication.message}"</p>
              )}
            </div>
          )}

          {/* Completion Info */}
          {job.status === 'completed' && (
            <div className="bg-gray-900 text-white p-4 rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="text-green-400" size={20} />
                <h3 className="font-bold">Job Completed</h3>
              </div>
              <p className="text-sm text-gray-300">
                This job was marked as completed on {job.completedAt ? new Date(job.completedAt).toLocaleDateString() : 'Unknown date'}.
              </p>
              {job.completionChecklist?.worker && (
                <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-gray-400">
                  <div className="flex items-center gap-2">
                    <span className={job.completionChecklist.worker.workCompleted ? 'text-green-400' : 'text-red-400'}>●</span> Work Done
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={job.completionChecklist.worker.cleanupDone ? 'text-green-400' : 'text-red-400'}>●</span> Cleanup Done
                  </div>
                </div>
              )}
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
