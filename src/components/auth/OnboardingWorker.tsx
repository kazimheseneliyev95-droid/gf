import React, { useState } from 'react';
import { HardHat, MapPin, DollarSign, Check } from 'lucide-react';
import { TEXTS } from '../../utils/auth';
import { AuthLanguage, JOB_CATEGORIES } from '../../types';

interface Props {
  lang: AuthLanguage;
  username: string;
  onComplete: (data: any) => void;
  onSkip: () => void;
}

export default function OnboardingWorker({ lang, username, onComplete, onSkip }: Props) {
  const t = TEXTS[lang];
  const [category, setCategory] = useState(JOB_CATEGORIES[0]);
  const [city, setCity] = useState('');
  const [priceLevel, setPriceLevel] = useState<'Low' | 'Medium' | 'High'>('Medium');

  const handleSubmit = () => {
    onComplete({ username, category, city, priceLevel, completedAt: new Date().toISOString() });
  };

  return (
    <div className="min-h-screen bg-amber-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 text-center animate-in zoom-in-95 duration-500">
        
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center text-amber-600 mx-auto mb-4">
          <HardHat size={32} />
        </div>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.onboardingTitle}</h2>
        <p className="text-gray-500 mb-8">{t.onboardingSub}</p>

        <div className="space-y-4 text-left">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">Main Skill / Category</label>
            <select 
              value={category} 
              onChange={e => setCategory(e.target.value as any)}
              className="w-full p-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none bg-white"
            >
              {JOB_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">City / Region</label>
            <div className="relative">
              <MapPin className="absolute left-3 top-3 text-gray-400" size={16} />
              <input 
                type="text" 
                value={city}
                onChange={e => setCity(e.target.value)}
                placeholder="e.g. Baku"
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-2">Price Level</label>
            <div className="grid grid-cols-3 gap-2">
              {['Low', 'Medium', 'High'].map((level) => (
                <button
                  key={level}
                  onClick={() => setPriceLevel(level as any)}
                  className={`py-2 rounded-lg text-xs font-bold border transition-all ${
                    priceLevel === level 
                      ? 'bg-amber-500 text-white border-amber-500' 
                      : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-3">
          <button 
            onClick={handleSubmit}
            className="w-full bg-amber-600 hover:bg-amber-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
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
