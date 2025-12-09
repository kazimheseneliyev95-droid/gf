import React, { useState, useEffect } from 'react';
import { X, Briefcase, CheckCircle, Search } from 'lucide-react';
import { JobPost, JOB_STORAGE_KEY } from '../types';
import { createNotification } from '../utils';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  workerUsername: string;
  employerUsername: string;
}

export default function InviteWorkerModal({ isOpen, onClose, workerUsername, employerUsername }: Props) {
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen) {
      const allJobsStr = localStorage.getItem(JOB_STORAGE_KEY);
      if (allJobsStr) {
        const allJobs: JobPost[] = JSON.parse(allJobsStr);
        // Filter for open jobs by this employer
        const myOpenJobs = allJobs.filter(j => 
          j.employerUsername === employerUsername && 
          j.status === 'open'
        );
        setJobs(myOpenJobs);
      }
    }
  }, [isOpen, employerUsername]);

  const handleInvite = () => {
    if (!selectedJobId) return;
    
    const job = jobs.find(j => j.id === selectedJobId);
    if (!job) return;

    createNotification(
      workerUsername,
      'invitation',
      selectedJobId,
      { 
        employerName: employerUsername, 
        jobTitle: job.title,
        message: `${employerUsername} invited you to check out their job: ${job.title}` 
      },
      'details'
    );

    alert(`Invitation sent to ${workerUsername}!`);
    onClose();
  };

  if (!isOpen) return null;

  const filteredJobs = jobs.filter(j => j.title.toLowerCase().includes(searchTerm.toLowerCase()));

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 animate-in zoom-in-95 flex flex-col max-h-[80vh]">
        
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-900 text-lg">Invite {workerUsername}</h3>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full"><X size={20} /></button>
        </div>

        <p className="text-sm text-gray-500 mb-4">Select a job to invite this worker to:</p>

        <div className="relative mb-4">
          <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
          <input 
            type="text" 
            placeholder="Search your jobs..." 
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        <div className="flex-1 overflow-y-auto space-y-2 mb-4">
          {filteredJobs.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm border-2 border-dashed border-gray-100 rounded-lg">
              No open jobs found.
            </div>
          ) : (
            filteredJobs.map(job => (
              <div 
                key={job.id}
                onClick={() => setSelectedJobId(job.id)}
                className={`p-3 rounded-xl border cursor-pointer transition-all ${
                  selectedJobId === job.id 
                    ? 'bg-blue-50 border-blue-500 ring-1 ring-blue-500' 
                    : 'bg-white border-gray-200 hover:border-blue-300'
                }`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-gray-900 text-sm">{job.title}</h4>
                    <p className="text-xs text-gray-500 mt-0.5">{job.category} • {job.budget} ₼</p>
                  </div>
                  {selectedJobId === job.id && <CheckCircle size={18} className="text-blue-600" />}
                </div>
              </div>
            ))
          )}
        </div>

        <button 
          onClick={handleInvite}
          disabled={!selectedJobId}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-colors"
        >
          Send Invitation
        </button>

      </div>
    </div>
  );
}
