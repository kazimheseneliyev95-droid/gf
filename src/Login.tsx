import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  User, Lock, ArrowRight, ArrowLeft, UserPlus, AlertCircle, CheckCircle, 
  KeyRound, Briefcase, HardHat, Globe, ChevronRight, LogIn, 
  CheckSquare, MapPin, DollarSign
} from 'lucide-react';
import { initializeAdmin } from './utils';
import { 
  USERS_STORAGE_KEY, User as UserType, LAST_SESSION_KEY, 
  WORKER_PROFILE_KEY, EMPLOYER_PROFILE_KEY, JOB_CATEGORIES,
  WorkerProfileData, EmployerProfileData
} from './types';

// --- Types & Interfaces ---

type ViewState = 'landing' | 'auth' | 'onboarding';
type FeedbackMessage = { type: 'success' | 'error' | null; text: string; };
type UserRole = 'employer' | 'worker';

// --- Helper Components ---

const LanguageSelector = () => (
  <div className="absolute top-4 right-4 flex items-center gap-1 text-xs font-medium text-gray-500 bg-white/80 backdrop-blur px-2 py-1 rounded-full border border-gray-200 cursor-pointer hover:bg-gray-50 transition-colors z-10">
    <Globe size={12} />
    <span>EN</span>
  </div>
);

export default function Login() {
  const navigate = useNavigate();
  
  // State: View Management
  const [view, setView] = useState<ViewState>('landing');
  const [isLogin, setIsLogin] = useState(true);
  
  // State: Form Data
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  const [rememberMe, setRememberMe] = useState(false);
  
  // State: Onboarding Data
  const [onboardingSkill, setOnboardingSkill] = useState(JOB_CATEGORIES[0]);
  const [onboardingCity, setOnboardingCity] = useState('');
  const [onboardingPrice, setOnboardingPrice] = useState<'Low' | 'Medium' | 'High'>('Medium');
  const [onboardingPrefs, setOnboardingPrefs] = useState<string[]>([]);

  // State: Feedback & Session
  const [feedback, setFeedback] = useState<FeedbackMessage>({ type: null, text: '' });
  const [lastSession, setLastSession] = useState<{ username: string, role: string } | null>(null);

  // --- Effects ---

  useEffect(() => {
    initializeAdmin();
    
    // Check for existing session
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
      redirectUser(JSON.parse(currentUserStr));
      return;
    }

    // Check for "Remember Me" session
    const lastSessionStr = localStorage.getItem(LAST_SESSION_KEY);
    if (lastSessionStr) {
      setLastSession(JSON.parse(lastSessionStr));
    }
  }, [navigate]);

  // Clear feedback when switching views
  useEffect(() => {
    setFeedback({ type: null, text: '' });
  }, [view, isLogin]);

  // --- Logic Helpers ---

  const getUsers = (): UserType[] => {
    const users = localStorage.getItem(USERS_STORAGE_KEY);
    return users ? JSON.parse(users) : [];
  };

  const redirectUser = (user: { role: string }) => {
    if (user.role === 'admin') navigate('/admin');
    else if (user.role === 'worker') navigate('/worker');
    else if (user.role === 'employer') navigate('/employer');
    else navigate('/notes');
  };

  const handleContinueSession = () => {
    if (lastSession) {
      localStorage.setItem('currentUser', JSON.stringify(lastSession));
      redirectUser(lastSession);
    }
  };

  const handleDemoLogin = (demoRole: UserRole) => {
    const demoUsername = demoRole === 'employer' ? 'demoEmployer' : 'demoWorker';
    const demoPassword = '123'; // Simple password for demo
    
    const users = getUsers();
    let user = users.find(u => u.username === demoUsername);

    // Create demo user if not exists
    if (!user) {
      user = { username: demoUsername, password: demoPassword, role: demoRole, isActive: true };
      users.push(user);
      localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    }

    // Login
    const sessionData = { username: user.username, role: user.role };
    localStorage.setItem('currentUser', JSON.stringify(sessionData));
    redirectUser(sessionData);
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback({ type: null, text: '' });

    if (!username || !password) {
      setFeedback({ type: 'error', text: 'Please enter both username and password.' });
      return;
    }

    const users = getUsers();
    const user = users.find((u) => u.username === username);

    if (!user) {
      setFeedback({ type: 'error', text: 'Incorrect username or password.' });
      return;
    }

    if (user.password !== password) {
      setFeedback({ type: 'error', text: 'Incorrect username or password.' });
      return;
    }

    if (user.isActive === false) {
      setFeedback({ type: 'error', text: 'This account has been deactivated by an administrator.' });
      return;
    }

    // Success
    const sessionData = { username: user.username, role: user.role };
    localStorage.setItem('currentUser', JSON.stringify(sessionData));
    
    if (rememberMe) {
      localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(sessionData));
    } else {
      localStorage.removeItem(LAST_SESSION_KEY);
    }

    // Check if onboarding is needed (simplified logic: if profile missing)
    if (user.role === 'worker') {
      const profiles = JSON.parse(localStorage.getItem(WORKER_PROFILE_KEY) || '[]');
      if (!profiles.find((p: any) => p.username === user.username)) {
        setRole('worker');
        setView('onboarding');
        return;
      }
    } else if (user.role === 'employer') {
      const profiles = JSON.parse(localStorage.getItem(EMPLOYER_PROFILE_KEY) || '[]');
      if (!profiles.find((p: any) => p.username === user.username)) {
        setRole('employer');
        setView('onboarding');
        return;
      }
    }

    redirectUser(sessionData);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback({ type: null, text: '' });

    // Validation
    if (!role) {
      setFeedback({ type: 'error', text: 'Please select "Employer" or "Worker".' });
      return;
    }
    if (username.length < 3) {
      setFeedback({ type: 'error', text: 'Username must be at least 3 characters.' });
      return;
    }
    if (password.length < 6) {
      setFeedback({ type: 'error', text: 'Password must be at least 6 characters.' });
      return;
    }
    if (password !== confirmPassword) {
      setFeedback({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    const users = getUsers();
    if (users.some((u) => u.username === username)) {
      setFeedback({ type: 'error', text: 'This username is already taken.' });
      return;
    }

    // Create User
    const newUser: UserType = { username, password, role, isActive: true };
    users.push(newUser);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    // Auto-login and go to Onboarding
    const sessionData = { username, role };
    localStorage.setItem('currentUser', JSON.stringify(sessionData));
    
    setView('onboarding');
  };

  const handleOnboardingSubmit = () => {
    if (!role) return;

    if (role === 'worker') {
      const profilesStr = localStorage.getItem(WORKER_PROFILE_KEY);
      const profiles: WorkerProfileData[] = profilesStr ? JSON.parse(profilesStr) : [];
      
      const newProfile: WorkerProfileData = {
        username,
        skills: [onboardingSkill], // Start with selected skill
        city: onboardingCity,
        priceLevel: onboardingPrice,
        onboardingCompleted: true,
        availability: 'Available'
      };
      
      // Merge if exists (rare case here)
      const existingIdx = profiles.findIndex(p => p.username === username);
      if (existingIdx >= 0) profiles[existingIdx] = { ...profiles[existingIdx], ...newProfile };
      else profiles.push(newProfile);
      
      localStorage.setItem(WORKER_PROFILE_KEY, JSON.stringify(profiles));
    } else {
      const profilesStr = localStorage.getItem(EMPLOYER_PROFILE_KEY);
      const profiles: EmployerProfileData[] = profilesStr ? JSON.parse(profilesStr) : [];
      
      const newProfile: EmployerProfileData = {
        username,
        preferredCategories: onboardingPrefs,
        onboardingCompleted: true
      };
      
      const existingIdx = profiles.findIndex(p => p.username === username);
      if (existingIdx >= 0) profiles[existingIdx] = { ...profiles[existingIdx], ...newProfile };
      else profiles.push(newProfile);
      
      localStorage.setItem(EMPLOYER_PROFILE_KEY, JSON.stringify(profiles));
    }

    redirectUser({ role });
  };

  // --- Render Views ---

  // 1. LANDING VIEW
  if (view === 'landing') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex flex-col items-center justify-center p-4 font-sans relative">
        <LanguageSelector />
        
        <div className="max-w-4xl w-full space-y-12 animate-in fade-in duration-500">
          {/* Hero Text */}
          <div className="text-center space-y-4">
            <h1 className="text-4xl md:text-5xl font-extrabold text-gray-900 tracking-tight">
              Find the perfect <span className="text-blue-600">match</span> for your job.
            </h1>
            <p className="text-lg text-gray-600 max-w-2xl mx-auto">
              A smart marketplace where employers post jobs and workers send offers. 
              Fast, reliable, and secure.
            </p>
          </div>

          {/* Main Action Cards */}
          <div className="grid md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Employer Card */}
            <button 
              onClick={() => { setRole('employer'); setIsLogin(false); setView('auth'); }}
              className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-transparent hover:border-blue-200 text-left flex flex-col gap-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-blue-50 w-24 h-24 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="bg-blue-100 w-12 h-12 rounded-xl flex items-center justify-center text-blue-600 z-10">
                <Briefcase size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">I want to HIRE</h3>
                <p className="text-gray-500 mt-2 text-sm">Post jobs, receive offers, and choose the best worker for your tasks.</p>
              </div>
              <div className="mt-auto flex items-center text-blue-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                Join as Employer <ArrowRight size={16} className="ml-2" />
              </div>
            </button>

            {/* Worker Card */}
            <button 
              onClick={() => { setRole('worker'); setIsLogin(false); setView('auth'); }}
              className="group bg-white p-8 rounded-2xl shadow-lg hover:shadow-xl transition-all border border-transparent hover:border-purple-200 text-left flex flex-col gap-4 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 bg-purple-50 w-24 h-24 rounded-bl-full -mr-4 -mt-4 transition-transform group-hover:scale-110"></div>
              <div className="bg-purple-100 w-12 h-12 rounded-xl flex items-center justify-center text-purple-600 z-10">
                <HardHat size={24} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900">I want to WORK</h3>
                <p className="text-gray-500 mt-2 text-sm">Find jobs, send offers, and build your reputation with reviews.</p>
              </div>
              <div className="mt-auto flex items-center text-purple-600 font-semibold text-sm group-hover:translate-x-1 transition-transform">
                Join as Worker <ArrowRight size={16} className="ml-2" />
              </div>
            </button>
          </div>

          {/* Footer Actions */}
          <div className="text-center space-y-4">
            {lastSession && (
              <div className="bg-white/80 backdrop-blur inline-flex items-center gap-4 px-6 py-3 rounded-full shadow-sm border border-gray-200 mb-4 animate-bounce-in">
                <span className="text-sm text-gray-600">Welcome back, <b>{lastSession.username}</b>!</span>
                <button onClick={handleContinueSession} className="text-sm font-bold text-blue-600 hover:underline">Continue</button>
                <span className="text-gray-300">|</span>
                <button onClick={() => { localStorage.removeItem(LAST_SESSION_KEY); setLastSession(null); }} className="text-xs text-gray-400 hover:text-gray-600">Switch</button>
              </div>
            )}
            
            <div className="flex justify-center gap-6 text-sm font-medium">
              <button onClick={() => { setIsLogin(true); setView('auth'); }} className="text-gray-600 hover:text-blue-600 transition-colors">
                Already have an account? Log in
              </button>
              <span className="text-gray-300">•</span>
              <button onClick={() => { setIsLogin(false); setView('auth'); }} className="text-gray-600 hover:text-blue-600 transition-colors">
                Create an account
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // 2. AUTH VIEW (LOGIN / REGISTER)
  if (view === 'auth') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans relative">
        <LanguageSelector />
        
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
          {/* Header */}
          <div className="px-8 pt-8 pb-6">
            <button onClick={() => setView('landing')} className="text-gray-400 hover:text-gray-600 text-xs flex items-center gap-1 mb-4 transition-colors">
              <ArrowLeft size={12} /> Back to Home
            </button>
            <h1 className="text-2xl font-bold text-gray-900">{isLogin ? 'Welcome Back' : 'Create Account'}</h1>
            <p className="text-gray-500 mt-1 text-sm">
              {isLogin ? 'Please login to continue.' : 'Join our marketplace today.'}
            </p>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-100 px-8">
            <button
              onClick={() => setIsLogin(true)}
              className={`pb-3 text-sm font-medium transition-colors relative ${
                isLogin ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Login
              {isLogin && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`pb-3 text-sm font-medium transition-colors relative ml-6 ${
                !isLogin ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Register
              {!isLogin && <div className="absolute bottom-0 left-0 w-full h-0.5 bg-blue-600 rounded-t-full"></div>}
            </button>
          </div>

          <div className="p-8">
            <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-5">
              
              {/* Register: Role Selection */}
              {!isLogin && (
                <div className="space-y-3 mb-6">
                  <label className="text-xs font-bold text-gray-500 uppercase tracking-wide">I want to be a:</label>
                  <div className="grid gap-3">
                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      role === 'employer' ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="radio" name="role" className="mt-1" checked={role === 'employer'} onChange={() => setRole('employer')} />
                      <div>
                        <span className="block font-bold text-gray-900 text-sm">Employer</span>
                        <span className="block text-xs text-gray-500 mt-0.5">Post jobs & hire workers.</span>
                      </div>
                      <Briefcase size={18} className="ml-auto text-gray-400" />
                    </label>

                    <label className={`flex items-start gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                      role === 'worker' ? 'border-purple-500 bg-purple-50 ring-1 ring-purple-500' : 'border-gray-200 hover:border-gray-300'
                    }`}>
                      <input type="radio" name="role" className="mt-1" checked={role === 'worker'} onChange={() => setRole('worker')} />
                      <div>
                        <span className="block font-bold text-gray-900 text-sm">Worker</span>
                        <span className="block text-xs text-gray-500 mt-0.5">Find jobs & send offers.</span>
                      </div>
                      <HardHat size={18} className="ml-auto text-gray-400" />
                    </label>
                  </div>
                </div>
              )}

              {/* Inputs */}
              <div className="space-y-4">
                <div className="relative group">
                  <User className="absolute left-3 top-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type="text"
                    placeholder="Username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white"
                  />
                </div>

                <div className="relative group">
                  <Lock className="absolute left-3 top-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                  <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white"
                  />
                </div>

                {!isLogin && (
                  <div className="relative group animate-in fade-in slide-in-from-top-2">
                    <KeyRound className="absolute left-3 top-3 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={18} />
                    <input
                      type="password"
                      placeholder="Confirm Password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none transition-all bg-gray-50 focus:bg-white"
                    />
                  </div>
                )}
              </div>

              {/* Login Extras */}
              {isLogin && (
                <div className="flex items-center justify-between text-sm">
                  <label className="flex items-center gap-2 cursor-pointer text-gray-600 hover:text-gray-900">
                    <input 
                      type="checkbox" 
                      checked={rememberMe} 
                      onChange={e => setRememberMe(e.target.checked)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500" 
                    />
                    Remember me
                  </label>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-all shadow-md hover:shadow-lg active:scale-[0.98] flex items-center justify-center gap-2"
              >
                {isLogin ? 'Login' : 'Create Account'}
                {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
              </button>

              {/* Feedback */}
              {feedback.text && (
                <div className={`p-3 rounded-lg text-sm flex items-start gap-2 animate-in fade-in ${
                  feedback.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
                }`}>
                  <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
                  {feedback.text}
                </div>
              )}
            </form>

            {/* Demo Logins */}
            {isLogin && (
              <div className="mt-8 pt-6 border-t border-gray-100">
                <p className="text-xs text-center text-gray-400 mb-3 uppercase font-bold tracking-wider">Quick Demo Access</p>
                <div className="grid grid-cols-2 gap-3">
                  <button 
                    onClick={() => handleDemoLogin('employer')}
                    className="py-2 px-3 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg text-xs font-bold transition-colors"
                  >
                    Demo Employer
                  </button>
                  <button 
                    onClick={() => handleDemoLogin('worker')}
                    className="py-2 px-3 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition-colors"
                  >
                    Demo Worker
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // 3. ONBOARDING VIEW
  if (view === 'onboarding') {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="p-8 text-center border-b border-gray-100">
            <div className={`w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 ${
              role === 'worker' ? 'bg-purple-100 text-purple-600' : 'bg-blue-100 text-blue-600'
            }`}>
              {role === 'worker' ? <HardHat size={32} /> : <Briefcase size={32} />}
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Welcome, {username}!</h2>
            <p className="text-gray-500 mt-2">Let's set up your profile to get you started.</p>
          </div>

          <div className="p-8 space-y-6">
            {role === 'worker' ? (
              // Worker Onboarding
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">What is your main skill?</label>
                  <div className="grid grid-cols-2 gap-2">
                    {JOB_CATEGORIES.filter(c => c !== 'Other').map(cat => (
                      <button
                        key={cat}
                        onClick={() => setOnboardingSkill(cat)}
                        className={`py-2 px-3 rounded-lg text-sm font-medium border transition-all ${
                          onboardingSkill === cat 
                            ? 'border-purple-500 bg-purple-50 text-purple-700' 
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">City / Region</label>
                  <div className="relative">
                    <MapPin className="absolute left-3 top-2.5 text-gray-400" size={16} />
                    <input 
                      type="text" 
                      placeholder="e.g. Baku"
                      value={onboardingCity}
                      onChange={e => setOnboardingCity(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Price Level</label>
                  <div className="flex gap-3">
                    {(['Low', 'Medium', 'High'] as const).map(level => (
                      <button
                        key={level}
                        onClick={() => setOnboardingPrice(level)}
                        className={`flex-1 py-2 rounded-lg text-sm font-medium border transition-all flex items-center justify-center gap-1 ${
                          onboardingPrice === level 
                            ? 'border-green-500 bg-green-50 text-green-700' 
                            : 'border-gray-200 hover:border-gray-300 text-gray-600'
                        }`}
                      >
                        {level === 'Low' && '$'}
                        {level === 'Medium' && '$$'}
                        {level === 'High' && '$$$'}
                        {level}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              // Employer Onboarding
              <>
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-3">What jobs do you usually post?</label>
                  <div className="space-y-2">
                    {JOB_CATEGORIES.map(cat => {
                      const isSelected = onboardingPrefs.includes(cat);
                      return (
                        <button
                          key={cat}
                          onClick={() => {
                            if (isSelected) setOnboardingPrefs(onboardingPrefs.filter(c => c !== cat));
                            else setOnboardingPrefs([...onboardingPrefs, cat]);
                          }}
                          className={`w-full flex items-center justify-between p-3 rounded-lg border transition-all ${
                            isSelected 
                              ? 'border-blue-500 bg-blue-50 text-blue-700' 
                              : 'border-gray-200 hover:bg-gray-50 text-gray-600'
                          }`}
                        >
                          <span className="font-medium text-sm">{cat}</span>
                          {isSelected ? <CheckSquare size={18} /> : <div className="w-4 h-4 border border-gray-300 rounded" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </>
            )}

            <div className="pt-4 flex flex-col gap-3">
              <button 
                onClick={handleOnboardingSubmit}
                className={`w-full py-3 rounded-lg text-white font-bold shadow-md hover:shadow-lg transition-all ${
                  role === 'worker' ? 'bg-purple-600 hover:bg-purple-700' : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                Complete Setup
              </button>
              <button 
                onClick={() => redirectUser({ role: role! })}
                className="text-gray-400 hover:text-gray-600 text-sm font-medium"
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
