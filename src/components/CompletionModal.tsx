import React, { useState } from 'react';
import { CheckSquare, Upload, X, Image as ImageIcon } from 'lucide-react';
import { JobPost, MediaItem } from '../types';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (checklist: any, media: MediaItem[]) => void;
  job: JobPost;
}

export default function CompletionModal({ isOpen, onClose, onSubmit, job }: Props) {
  const [checklist, setChecklist] = useState({
    workCompleted: false,
    materialsHandled: false,
    problemResolved: false,
    cleanupDone: false,
    finalMediaUploaded: false
  });
  
  const [mediaUrl, setMediaUrl] = useState('');
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);

  if (!isOpen) return null;

  const toggleCheck = (key: keyof typeof checklist) => {
    setChecklist(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const addMedia = () => {
    if (mediaUrl.trim()) {
      setMediaItems([...mediaItems, { url: mediaUrl, type: 'image' }]);
      setMediaUrl('');
      setChecklist(prev => ({ ...prev, finalMediaUploaded: true }));
    }
  };

  const handleSubmit = () => {
    if (!checklist.workCompleted) {
      alert("Please confirm work is completed.");
      return;
    }
    onSubmit(checklist, mediaItems);
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 animate-in zoom-in-95">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-gray-900 flex items-center gap-2">
            <CheckSquare className="text-green-600" /> Complete Job
          </h3>
          <button onClick={onClose}><X size={20} className="text-gray-400" /></button>
        </div>

        <p className="text-sm text-gray-500 mb-6">
          Please confirm the following items before marking the job as done.
        </p>

        <div className="space-y-3 mb-6">
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={checklist.workCompleted} onChange={() => toggleCheck('workCompleted')} className="w-5 h-5 text-green-600 rounded" />
            <span className="text-sm font-medium text-gray-700">Work fully completed</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={checklist.problemResolved} onChange={() => toggleCheck('problemResolved')} className="w-5 h-5 text-green-600 rounded" />
            <span className="text-sm font-medium text-gray-700">Problem resolved</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={checklist.materialsHandled} onChange={() => toggleCheck('materialsHandled')} className="w-5 h-5 text-green-600 rounded" />
            <span className="text-sm font-medium text-gray-700">Materials handled as agreed</span>
          </label>
          <label className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
            <input type="checkbox" checked={checklist.cleanupDone} onChange={() => toggleCheck('cleanupDone')} className="w-5 h-5 text-green-600 rounded" />
            <span className="text-sm font-medium text-gray-700">Cleanup done</span>
          </label>
        </div>

        <div className="mb-6">
          <label className="block text-xs font-bold text-gray-700 mb-2">Upload After Photos (Optional)</label>
          <div className="flex gap-2 mb-2">
            <input 
              type="text" 
              placeholder="Paste image URL..." 
              value={mediaUrl}
              onChange={e => setMediaUrl(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
            />
            <button onClick={addMedia} className="bg-gray-100 hover:bg-gray-200 p-2 rounded-lg text-gray-600">
              <Upload size={18} />
            </button>
          </div>
          {mediaItems.length > 0 && (
            <div className="flex gap-2 overflow-x-auto py-2">
              {mediaItems.map((m, i) => (
                <div key={i} className="relative w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border border-gray-200">
                  <img src={m.url} alt="After" className="w-full h-full object-cover" />
                </div>
              ))}
            </div>
          )}
        </div>

        <button 
          onClick={handleSubmit}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors shadow-sm"
        >
          Submit Completion
        </button>
      </div>
    </div>
  );
}
