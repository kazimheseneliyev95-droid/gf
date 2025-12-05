import React from 'react';
import { Briefcase, HardHat, ArrowRight, LogIn } from 'lucide-react';
import { TEXTS } from '../../utils/auth';
import { AuthLanguage, UserSession } from '../../types';

interface Props {
  lang: AuthLanguage;
  onSelectRole: (role: 'employer' | 'worker') => void;
  onLoginClick: () => void;
  lastSession: UserSession | null;
  onContinueSession: () => void;
  onSwitchAccount: () => void;
}

export default function LandingScreen({ lang, onSelectRole, onLoginClick, lastSession, onContinueSession, onSwitchAccount }: Props) {
  const t = TEXTS[lang];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center p-6 font-sans relative overflow-hidden">
      
      {/* Decorative Blobs */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-blue-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob"></div>
      <div className="absolute top-0 right-0 w-64 h-64 bg-purple-200 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-blob animation-delay-2000"></div>
      
      <div className="max-w-4xl w-full z-10">
        
        {/* Header */}
        <div className="text-center mb-12 space-y-4">
          <div className="inline-flex items-center justify-center p-3 bg-white rounded-2xl shadow-sm mb-4">
            <Briefcase className="text-blue-600 mr-2" size={28} />
            <span className="text-2xl font-bold text-gray-900">Dualite<span className="text-blue-600">Work</span></span>
          </div>
          <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
            {t.landingTitle}
          </h1>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            {t.landingDesc}
          </p>
        </div>

        {/* Remember Me Banner */}
        {lastSession && (
          <div className="max-w-md mx-auto mb-8 bg-white/80 backdrop-blur-sm p-4 rounded-xl border border-blue-100 shadow-sm flex items-center justify-between animate-in fade-in slide-in-from-top-4">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-full ${lastSession.role === 'employer' ? 'bg-blue-100 text-blue-600' : 'bg-amber-100 text-amber-600'}`}>
                {lastSession.role === 'employer' ? <Briefcase size={20} /> : <HardHat size={20} />}
              </div>
              <div>
                <p className="text-xs text-gray-500">{t.welcomeBack}</p>
                <p className="font-bold text-gray-900">{lastSession.username}</p>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={onSwitchAccount} className="text-xs text-gray-500 hover:text-gray-700 px-2 py-1">
                {t.switchAccount}
              </button>
              <button 
                onClick={onContinueSession}
                className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold px-3 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
              >
                {t.continueAs} <ArrowRight size={12} />
              </button>
            </div>
          </div>
        )}

        {/* Main Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
          
          {/* Employer Card */}
          <button 
            onClick={() => onSelectRole('employer')}
            className="group relative bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-blue-200 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-blue-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
              <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center text-blue-600 mb-4 group-hover:scale-110 transition-transform">
                <Briefcase size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-blue-600 transition-colors">{t.hireBtn}</h3>
              <p className="text-sm text-gray-500">{t.employerDesc}</p>
            </div>
          </button>

          {/* Worker Card */}
          <button 
            onClick={() => onSelectRole('worker')}
            className="group relative bg-white p-8 rounded-2xl shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-100 hover:border-amber-200 text-left overflow-hidden"
          >
            <div className="absolute top-0 right-0 w-24 h-24 bg-amber-50 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
            <div className="relative z-10">
              <div className="bg-amber-100 w-12 h-12 rounded-xl flex items-center justify-center text-amber-600 mb-4 group-hover:scale-110 transition-transform">
                <HardHat size={24} />
              </div>
              <h3 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-amber-600 transition-colors">{t.workBtn}</h3>
              <p className="text-sm text-gray-500">{t.workerDesc}</p>
            </div>
          </button>

        </div>

        {/* Footer Links */}
        <div className="mt-12 text-center space-y-4">
          <button 
            onClick={onLoginClick}
            className="inline-flex items-center gap-2 text-gray-600 hover:text-blue-600 font-medium transition-colors"
          >
            <LogIn size={18} />
            {t.loginLink}
          </button>
        </div>

      </div>
    </div>
  );
}
