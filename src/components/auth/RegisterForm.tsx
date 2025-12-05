import React, { useState } from 'react';
import { User, Lock, Briefcase, HardHat, AlertCircle, CheckCircle } from 'lucide-react';
import { TEXTS } from '../../utils/auth';
import { AuthLanguage, UserRole } from '../../types';

interface Props {
  lang: AuthLanguage;
  initialRole: 'employer' | 'worker' | null;
  onRegister: (u: string, p: string, role: UserRole) => void;
  onBack: () => void;
  onLoginClick: () => void;
  error: string | null;
  success: string | null;
}

export default function RegisterForm({ lang, initialRole, onRegister, onBack, onLoginClick, error, success }: Props) {
  const t = TEXTS[lang];
  const [role, setRole] = useState<'employer' | 'worker'>(initialRole || 'worker');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert("Passwords do not match");
      return;
    }
    onRegister(username, password, role);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 mb-6">
          ← {t.back}
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-6">{t.registerTitle}</h2>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2 mb-6">
            <AlertCircle size={16} /> {error}
          </div>
        )}
        
        {success && (
          <div className="bg-green-50 border border-green-100 text-green-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2 mb-6">
            <CheckCircle size={16} /> {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          
          {/* Role Selection */}
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div 
              onClick={() => setRole('employer')}
              className={`cursor-pointer border rounded-xl p-4 flex flex-col items-center text-center transition-all duration-200 ${
                role === 'employer' 
                  ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                  : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
              }`}
            >
              <Briefcase className={`h-6 w-6 mb-2 ${role === 'employer' ? 'text-blue-600' : 'text-gray-400'}`} />
              <span className={`text-sm font-bold ${role === 'employer' ? 'text-blue-700' : 'text-gray-700'}`}>{t.roleEmployer}</span>
              <span className="text-[10px] text-gray-500 mt-1 leading-tight">{t.employerDesc}</span>
            </div>

            <div 
              onClick={() => setRole('worker')}
              className={`cursor-pointer border rounded-xl p-4 flex flex-col items-center text-center transition-all duration-200 ${
                role === 'worker' 
                  ? 'border-amber-500 bg-amber-50 ring-1 ring-amber-500' 
                  : 'border-gray-200 hover:border-amber-300 hover:bg-gray-50'
              }`}
            >
              <HardHat className={`h-6 w-6 mb-2 ${role === 'worker' ? 'text-amber-600' : 'text-gray-400'}`} />
              <span className={`text-sm font-bold ${role === 'worker' ? 'text-amber-700' : 'text-gray-700'}`}>{t.roleWorker}</span>
              <span className="text-[10px] text-gray-500 mt-1 leading-tight">{t.workerDesc}</span>
            </div>
          </div>

          {/* Inputs */}
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t.username}</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Choose username"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t.password}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="password" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Min 6 characters"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t.confirmPassword}</label>
            <div className="relative">
              <Lock className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="password" 
                value={confirmPassword}
                onChange={e => setConfirmPassword(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Repeat password"
              />
            </div>
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors shadow-sm"
          >
            {t.registerBtn}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button onClick={onLoginClick} className="text-sm text-blue-600 hover:underline font-medium">
            {t.loginLink}
          </button>
        </div>

      </div>
    </div>
  );
}
