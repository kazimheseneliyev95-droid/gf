import React, { useState } from 'react';
import { Briefcase, Check, CheckSquare } from 'lucide-react';
import { TEXTS } from '../../utils/auth';
import { AuthLanguage, JOB_CATEGORIES } from '../../types';

interface Props {
  lang: AuthLanguage;
  username: string;
  onComplete: (data: any) => void;
  onSkip: () => void;
}

export default function OnboardingEmployer({ lang, username, onComplete, onSkip }: Props) {
  const t = TEXTS[lang];
  const [selectedCats, setSelectedCats] = useState<string[]>([]);

  const toggleCat = (cat: string) => {
    setSelectedCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const handleSubmit = () => {
    onComplete({ username, interestedCategories: selectedCats, completedAt: new Date().toISOString() });
  };

  return (
    <div className="min-h-screen bg-blue-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center animate-in zoom-in-95 duration-500">
        
        <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 mx-auto mb-4">
          <Briefcase size={32} />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.onboardingTitle}</h2>
        <p className="text-gray-500 mb-8">What kind of jobs do you usually post?</p>

        <div className="grid grid-cols-2 gap-3 text-left mb-8">
          {JOB_CATEGORIES.map(cat => (
            <button
              key={cat}
              onClick={() => toggleCat(cat)}
              className={`p-3 rounded-lg border text-sm font-medium flex items-center gap-2 transition-all ${
                selectedCats.includes(cat)
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'border-gray-200 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                selectedCats.includes(cat) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'
              }`}>
                {selectedCats.includes(cat) && <Check size={10} className="text-white" />}
              </div>
              {cat}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <button 
            onClick={handleSubmit}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Check size={18} /> {t.saveContinue}
          </button>
          <button onClick={onSkip} className="text-sm text-gray-400 hover:text-gray-600">
            {t.skip}
          </button>
        </div>

      </div>
    </div>
  );
}
