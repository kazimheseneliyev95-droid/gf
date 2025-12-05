import React, { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';
import { Dispute, DISPUTE_STORAGE_KEY } from '../types';
import { logActivity } from '../utils/advancedFeatures';

export default function DisputeCenter() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);

  useEffect(() => {
    const str = localStorage.getItem(DISPUTE_STORAGE_KEY);
    if (str) setDisputes(JSON.parse(str));
  }, []);

  const updateStatus = (id: string, status: Dispute['status']) => {
    const updated = disputes.map(d => d.id === id ? { ...d, status, resolvedAt: new Date().toISOString() } : d);
    setDisputes(updated);
    localStorage.setItem(DISPUTE_STORAGE_KEY, JSON.stringify(updated));
    logActivity('admin', 'admin', 'DISPUTE_UPDATED', { id, status });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900">Problem Reports & Disputes</h2>
      
      <div className="grid gap-4">
        {disputes.length === 0 ? (
          <div className="bg-white p-8 text-center text-gray-500 rounded-xl border border-gray-200">
            No active reports.
          </div>
        ) : (
          disputes.map(d => (
            <div key={d.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-3 mb-2">
                  <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                    d.status === 'open' ? 'bg-red-100 text-red-700' :
                    d.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {d.status}
                  </span>
                  <span className="text-xs text-gray-400">{new Date(d.createdAt).toLocaleDateString()}</span>
                  {d.problemType && (
                    <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-100">
                      {d.problemType}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-gray-900 mb-1">
                  {d.openedBy} <span className="text-gray-400 font-normal">reported</span> {d.againstUser}
                </h3>
                <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg border border-gray-100">
                  "{d.description}"
                </p>
                <p className="text-xs text-gray-400 mt-2 font-mono">Job ID: {d.jobId}</p>
              </div>
              
              {d.status === 'open' && (
                <div className="flex flex-col gap-2 justify-center min-w-[140px]">
                  <button 
                    onClick={() => updateStatus(d.id, 'resolved')}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium transition-colors"
                  >
                    <CheckCircle size={16} /> Resolve
                  </button>
                  <button 
                    onClick={() => updateStatus(d.id, 'rejected')}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg text-sm font-medium transition-colors"
                  >
                    <XCircle size={16} /> Reject
                  </button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
