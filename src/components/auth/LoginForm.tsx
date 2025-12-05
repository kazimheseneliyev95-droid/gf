import React, { useState } from 'react';
import { User, Lock, ArrowRight, AlertCircle } from 'lucide-react';
import { TEXTS } from '../../utils/auth';
import { AuthLanguage } from '../../types';

interface Props {
  lang: AuthLanguage;
  onLogin: (u: string, p: string, remember: boolean) => void;
  onDemoLogin: (role: 'employer' | 'worker') => void;
  onBack: () => void;
  onRegisterClick: () => void;
  error: string | null;
}

export default function LoginForm({ lang, onLogin, onDemoLogin, onBack, onRegisterClick, error }: Props) {
  const t = TEXTS[lang];
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onLogin(username, password, remember);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        
        <button onClick={onBack} className="text-sm text-gray-400 hover:text-gray-600 mb-6">
          ← {t.back}
        </button>

        <h2 className="text-2xl font-bold text-gray-900 mb-2">{t.loginTitle}</h2>
        <p className="text-sm text-gray-500 mb-6">Welcome back to DualiteWork</p>

        {error && (
          <div className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-lg text-sm flex items-center gap-2 mb-6">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-700 mb-1">{t.username}</label>
            <div className="relative">
              <User className="absolute left-3 top-2.5 text-gray-400" size={18} />
              <input 
                type="text" 
                value={username}
                onChange={e => setUsername(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                placeholder="Enter username"
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
                placeholder="Enter password"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input 
              type="checkbox" 
              id="remember" 
              checked={remember}
              onChange={e => setRemember(e.target.checked)}
              className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
            />
            <label htmlFor="remember" className="text-xs text-gray-600 cursor-pointer select-none">
              {t.rememberMe}
            </label>
          </div>

          <button 
            type="submit"
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {t.loginBtn} <ArrowRight size={16} />
          </button>
        </form>

        <div className="mt-6 pt-6 border-t border-gray-100">
          <p className="text-xs text-center text-gray-400 mb-4">Or try a demo account</p>
          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => onDemoLogin('employer')}
              className="px-3 py-2 bg-blue-50 text-blue-700 text-xs font-bold rounded-lg hover:bg-blue-100 transition-colors"
            >
              {t.demoEmployer}
            </button>
            <button 
              onClick={() => onDemoLogin('worker')}
              className="px-3 py-2 bg-amber-50 text-amber-700 text-xs font-bold rounded-lg hover:bg-amber-100 transition-colors"
            >
              {t.demoWorker}
            </button>
          </div>
        </div>

        <div className="mt-6 text-center">
          <button onClick={onRegisterClick} className="text-sm text-blue-600 hover:underline font-medium">
            {t.createLink}
          </button>
        </div>

      </div>
    </div>
  );
}
