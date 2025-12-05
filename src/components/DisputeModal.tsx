import React, { useState } from 'react';
import { AlertTriangle, X } from 'lucide-react';
import { Dispute, DISPUTE_STORAGE_KEY } from '../types';
import { logActivity } from '../utils/advancedFeatures';

interface DisputeModalProps {
  isOpen: boolean;
  onClose: () => void;
  jobId: string;
  openedBy: string;
  againstUser: string;
}

const PROBLEM_TYPES = [
  "Worker didn't show up",
  "Job quality is poor",
  "Job is late",
  "Payment dispute",
  "Other"
];

export default function DisputeModal({ isOpen, onClose, jobId, openedBy, againstUser }: DisputeModalProps) {
  const [description, setDescription] = useState('');
  const [problemType, setProblemType] = useState(PROBLEM_TYPES[0]);

  if (!isOpen) return null;

  const handleSubmit = () => {
    if (!description.trim()) return;

    const str = localStorage.getItem(DISPUTE_STORAGE_KEY);
    const disputes: Dispute[] = str ? JSON.parse(str) : [];

    const newDispute: Dispute = {
      id: crypto.randomUUID(),
      jobId,
      openedBy,
      againstUser,
      description,
      status: 'open',
      createdAt: new Date().toISOString(),
      problemType
    };

    disputes.push(newDispute);
    localStorage.setItem(DISPUTE_STORAGE_KEY, JSON.stringify(disputes));
    
    logActivity(openedBy, 'employer', 'DISPUTE_OPENED', { jobId, againstUser, type: problemType });
    
    alert('Report submitted. Admin will review shortly.');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-red-600 flex items-center gap-2">
            <AlertTriangle size={20} /> Report a Problem
          </h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>
        
        <p className="text-sm text-gray-600 mb-4">
          Reporting an issue with <strong>{againstUser}</strong> for Job ID: <span className="font-mono text-xs">{jobId.slice(0,8)}</span>.
        </p>

        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-700 mb-1">Problem Type</label>
          <select 
            value={problemType}
            onChange={(e) => setProblemType(e.target.value)}
            className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none bg-white"
          >
            {PROBLEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div className="mb-4">
          <label className="block text-xs font-bold text-gray-700 mb-1">Description</label>
          <textarea
            value={description}
            onChange={e => setDescription(e.target.value)}
            placeholder="Describe the issue in detail..."
            className="w-full h-32 p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-red-500 outline-none resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 py-2 bg-gray-100 text-gray-600 rounded-lg text-sm font-medium">Cancel</button>
          <button onClick={handleSubmit} className="flex-1 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Submit Report</button>
        </div>
      </div>
    </div>
  );
}
