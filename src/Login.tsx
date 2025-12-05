import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  USERS_STORAGE_KEY, User, UserRole, AuthLanguage, 
  LAST_SESSION_KEY, UI_LANGUAGE_KEY, UserSession 
} from './types';
import { 
  ensureDemoUsers, hasCompletedOnboarding, saveWorkerOnboarding, 
  saveEmployerPreferences 
} from './utils/auth';
import { initializeAdmin } from './utils';

// Components
import LandingScreen from './components/auth/LandingScreen';
import LoginForm from './components/auth/LoginForm';
import RegisterForm from './components/auth/RegisterForm';
import OnboardingWorker from './components/auth/OnboardingWorker';
import OnboardingEmployer from './components/auth/OnboardingEmployer';
import LanguageSelector from './components/auth/LanguageSelector';

type AuthView = 'landing' | 'login' | 'register' | 'onboarding_worker' | 'onboarding_employer';

export default function Login() {
  const navigate = useNavigate();
  
  // State
  const [view, setView] = useState<AuthView>('landing');
  const [lang, setLang] = useState<AuthLanguage>('en');
  const [selectedRole, setSelectedRole] = useState<'employer' | 'worker' | null>(null);
  const [lastSession, setLastSession] = useState<UserSession | null>(null);
  
  // Form Feedback
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Temp User for Onboarding
  const [tempUser, setTempUser] = useState<{ username: string, role: UserRole } | null>(null);

  useEffect(() => {
    initializeAdmin();
    ensureDemoUsers();

    // Load Language
    const savedLang = localStorage.getItem(UI_LANGUAGE_KEY);
    if (savedLang) setLang(savedLang as AuthLanguage);

    // Load Last Session
    const sessionStr = localStorage.getItem(LAST_SESSION_KEY);
    if (sessionStr) {
      setLastSession(JSON.parse(sessionStr));
    }

    // Check if already logged in (Active Session)
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
      const user = JSON.parse(currentUserStr);
      redirectUser(user.role);
    }
  }, []);

  const handleLanguageChange = (l: AuthLanguage) => {
    setLang(l);
    localStorage.setItem(UI_LANGUAGE_KEY, l);
  };

  const redirectUser = (role: UserRole) => {
    if (role === 'admin') navigate('/admin');
    else if (role === 'worker') navigate('/worker');
    else if (role === 'employer') navigate('/employer');
    else navigate('/notes');
  };

  // --- ACTIONS ---

  const handleLogin = (username: string, pass: string, remember: boolean) => {
    setError(null);
    const usersStr = localStorage.getItem(USERS_STORAGE_KEY);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];
    
    const user = users.find(u => u.username === username);

    if (!user) {
      setError("Incorrect username or password.");
      return;
    }
    if (user.password !== pass) {
      setError("Incorrect username or password.");
      return;
    }
    if (user.isActive === false) {
      setError("This account has been deactivated by administrator.");
      return;
    }

    // Success
    const session: UserSession = { username: user.username, role: user.role };
    localStorage.setItem('currentUser', JSON.stringify(session));
    
    if (remember) {
      localStorage.setItem(LAST_SESSION_KEY, JSON.stringify(session));
    }

    // Check Onboarding
    if (user.role === 'worker' && !hasCompletedOnboarding(username, 'worker')) {
      setTempUser({ username, role: 'worker' });
      setView('onboarding_worker');
    } else if (user.role === 'employer' && !hasCompletedOnboarding(username, 'employer')) {
      setTempUser({ username, role: 'employer' });
      setView('onboarding_employer');
    } else {
      redirectUser(user.role);
    }
  };

  const handleRegister = (username: string, pass: string, role: UserRole) => {
    setError(null);
    setSuccess(null);

    // Validation
    if (username.length < 3) { setError("Username must be at least 3 characters."); return; }
    if (pass.length < 6) { setError("Password must be at least 6 characters."); return; }

    const usersStr = localStorage.getItem(USERS_STORAGE_KEY);
    const users: User[] = usersStr ? JSON.parse(usersStr) : [];

    if (users.some(u => u.username === username)) {
      setError("This username is already taken.");
      return;
    }

    // Create User
    const newUser: User = { username, password: pass, role, isActive: true };
    users.push(newUser);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    // Auto Login
    const session: UserSession = { username, role };
    localStorage.setItem('currentUser', JSON.stringify(session));

    // Go to Onboarding
    setTempUser({ username, role });
    if (role === 'worker') setView('onboarding_worker');
    else if (role === 'employer') setView('onboarding_employer');
    else redirectUser(role);
  };

  const handleDemoLogin = (role: 'employer' | 'worker') => {
    const username = role === 'employer' ? 'demoEmployer' : 'demoWorker';
    handleLogin(username, '123', false);
  };

  const handleOnboardingComplete = (data: any) => {
    if (!tempUser) return;
    if (tempUser.role === 'worker') saveWorkerOnboarding(data);
    else saveEmployerPreferences(data);
    redirectUser(tempUser.role);
  };

  // --- RENDER ---

  return (
    <>
      <LanguageSelector currentLang={lang} onChange={handleLanguageChange} />
      
      {view === 'landing' && (
        <LandingScreen 
          lang={lang}
          onSelectRole={(r) => { setSelectedRole(r); setView('register'); }}
          onLoginClick={() => setView('login')}
          lastSession={lastSession}
          onContinueSession={() => {
            if (lastSession) handleLogin(lastSession.username, '123', true); // Assuming token/auto-login logic, here simplified re-login or just redirect if session valid
            // In a real app, we'd check a token. Here, we just redirect if localStorage 'currentUser' was set, but we cleared it on logout.
            // For this demo, "Continue as" will just pre-fill login or try to auto-login if we stored password (unsafe) or just redirect if we assume session persistence.
            // Let's just redirect to login with pre-filled username for safety in this demo context.
            setView('login');
          }}
          onSwitchAccount={() => {
            localStorage.removeItem(LAST_SESSION_KEY);
            setLastSession(null);
          }}
        />
      )}

      {view === 'login' && (
        <LoginForm 
          lang={lang}
          onLogin={handleLogin}
          onDemoLogin={handleDemoLogin}
          onBack={() => setView('landing')}
          onRegisterClick={() => setView('register')}
          error={error}
        />
      )}

      {view === 'register' && (
        <RegisterForm 
          lang={lang}
          initialRole={selectedRole}
          onRegister={handleRegister}
          onBack={() => setView('landing')}
          onLoginClick={() => setView('login')}
          error={error}
          success={success}
        />
      )}

      {view === 'onboarding_worker' && tempUser && (
        <OnboardingWorker 
          lang={lang}
          username={tempUser.username}
          onComplete={handleOnboardingComplete}
          onSkip={() => redirectUser('worker')}
        />
      )}

      {view === 'onboarding_employer' && tempUser && (
        <OnboardingEmployer 
          lang={lang}
          username={tempUser.username}
          onComplete={handleOnboardingComplete}
          onSkip={() => redirectUser('employer')}
        />
      )}
    </>
  );
}
