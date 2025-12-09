import React from 'react';
import { X, HelpCircle, BookOpen, ShieldCheck, Star, Zap } from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
}

export default function HelpModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg animate-in zoom-in-95 flex flex-col max-h-[90vh]">
        <div className="p-6 border-b border-gray-100 flex justify-between items-center">
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <HelpCircle className="text-blue-600" /> Help & Guide
          </h2>
          <button onClick={onClose}><X size={24} className="text-gray-400 hover:text-gray-600" /></button>
        </div>
        
        <div className="p-6 space-y-6 overflow-y-auto flex-1">
          <section>
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
              <BookOpen size={18} className="text-purple-600" /> How It Works
            </h3>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1">
              <li>Employers post jobs describing their needs.</li>
              <li>Workers browse jobs and send offers.</li>
              <li>Once an offer is accepted, the job moves to "In Progress".</li>
              <li>Chat is available to discuss details.</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
              <ShieldCheck size={18} className="text-green-600" /> Trust Score
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              Your Trust Score increases when you complete jobs successfully and receive good ratings. 
              Disputes and cancellations lower your score. A high score unlocks badges and better visibility.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
              <Star size={18} className="text-amber-500" /> Reviews & Ratings
            </h3>
            <p className="text-sm text-gray-600 leading-relaxed">
              After a job is marked completed, both parties can rate each other. 
              Honest reviews help build a safe community.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-gray-800 flex items-center gap-2 mb-2">
              <Zap size={18} className="text-blue-500" /> Tips for Getting More Offers
            </h3>
            <ul className="text-sm text-gray-600 leading-relaxed list-disc list-inside space-y-1">
              <li>Write a clear and detailed job description.</li>
              <li>Set a realistic budget based on category averages.</li>
              <li>Add photos to help workers understand the task.</li>
              <li>Complete your profile to build trust.</li>
            </ul>
          </section>
        </div>
        
        <div className="p-4 border-t border-gray-100 bg-gray-50 rounded-b-2xl text-center flex flex-col gap-2">
          <button className="text-blue-600 font-bold text-sm hover:underline">
            Visit Help Center
          </button>
          <button onClick={onClose} className="text-gray-500 text-xs hover:text-gray-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
