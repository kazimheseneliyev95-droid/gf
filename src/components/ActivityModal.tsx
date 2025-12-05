import React from 'react';
import { X, Clock } from 'lucide-react';
import ActivityTimeline from './ActivityTimeline';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  username: string;
}

export default function ActivityModal({ isOpen, onClose, username }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col animate-in zoom-in-95 duration-200">
        <div className="p-5 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-2xl">
          <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Clock size={20} className="text-blue-600" /> Recent Activity
          </h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-200 rounded-full text-gray-500 transition-colors">
            <X size={20} />
          </button>
        </div>
        
        <div className="p-0 overflow-y-auto flex-1">
          <div className="p-4">
            <ActivityTimeline username={username} />
          </div>
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl text-center">
          <button onClick={onClose} className="text-sm text-gray-500 hover:text-gray-800 font-medium">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
