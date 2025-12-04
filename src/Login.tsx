import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { User, Lock, ArrowRight, UserPlus, AlertCircle, CheckCircle, KeyRound, Briefcase, HardHat } from 'lucide-react';
import { initializeAdmin } from './utils';
import { USERS_STORAGE_KEY, User as UserType } from './types';

type FeedbackMessage = {
  type: 'success' | 'error' | null;
  text: string;
};

type UserRole = 'employer' | 'worker';

export default function Login() {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  
  // Form States
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState<UserRole | null>(null);
  
  const [feedback, setFeedback] = useState<FeedbackMessage>({ type: null, text: '' });

  // Initialize Admin on Mount
  useEffect(() => {
    initializeAdmin();
  }, []);

  // Clear form and messages when switching tabs
  useEffect(() => {
    setFeedback({ type: null, text: '' });
    setUsername('');
    setPassword('');
    setConfirmPassword('');
    setRole(null);
  }, [isLogin]);

  // Check if already logged in
  useEffect(() => {
    const currentUserStr = localStorage.getItem('currentUser');
    if (currentUserStr) {
      try {
        const user = JSON.parse(currentUserStr);
        if (user.role === 'admin') navigate('/admin');
        else if (user.role === 'worker') navigate('/worker');
        else if (user.role === 'employer') navigate('/employer');
        else navigate('/notes');
      } catch (e) {
        navigate('/notes');
      }
    }
  }, [navigate]);

  const getUsers = (): UserType[] => {
    const users = localStorage.getItem(USERS_STORAGE_KEY);
    return users ? JSON.parse(users) : [];
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
      setFeedback({ type: 'error', text: 'User not found. Please register first.' });
      return;
    }

    if (user.password !== password) {
      setFeedback({ type: 'error', text: 'Incorrect password. Please try again.' });
      return;
    }

    // Check if account is active (default to true if undefined)
    if (user.isActive === false) {
      setFeedback({ type: 'error', text: 'This account has been deactivated by an administrator.' });
      return;
    }

    // SUCCESS: Save session (Username + Role) and Redirect
    setFeedback({ type: 'success', text: 'Login successful! Redirecting...' });
    
    const sessionData = {
      username: user.username,
      role: user.role || 'worker' // Fallback for legacy users
    };
    localStorage.setItem('currentUser', JSON.stringify(sessionData));
    
    setTimeout(() => {
      if (sessionData.role === 'admin') {
        navigate('/admin');
      } else if (sessionData.role === 'worker') {
        navigate('/worker');
      } else if (sessionData.role === 'employer') {
        navigate('/employer');
      } else {
        navigate('/notes');
      }
    }, 800);
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback({ type: null, text: '' });

    // 1. Validate Role Selection
    if (!role) {
      setFeedback({ type: 'error', text: 'Please select your account type (Employer or Worker).' });
      return;
    }

    // 2. Validate Text Fields
    if (!username || !password) {
      setFeedback({ type: 'error', text: 'Please fill in all fields.' });
      return;
    }

    if (password !== confirmPassword) {
      setFeedback({ type: 'error', text: 'Passwords do not match.' });
      return;
    }

    // 3. Check for duplicate username
    const users = getUsers();
    if (users.some((u) => u.username === username)) {
      setFeedback({ type: 'error', text: 'This username is already taken. Please choose another one.' });
      return;
    }

    // 4. Create and Save User
    const newUser: UserType = { 
      username, 
      password, 
      role,
      isActive: true
    };
    users.push(newUser);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));

    setFeedback({ type: 'success', text: 'Registration successful. Switching to login...' });
    
    // Switch to login after a brief delay
    setTimeout(() => {
      setIsLogin(true);
      setFeedback({ type: 'success', text: 'Registration successful. Please log in.' });
      setUsername(username); // Pre-fill username
      setPassword(''); 
      setRole(null);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden">
        
        {/* Header */}
        <div className="px-8 pt-8 pb-6 text-center">
          <h1 className="text-3xl font-bold text-gray-900">Login System</h1>
          <p className="text-gray-500 mt-2 text-sm">
            {isLogin ? 'Welcome back! Please login to continue.' : 'Create an account to get started.'}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-gray-200">
          <button
            onClick={() => setIsLogin(true)}
            className={`flex-1 py-4 text-sm font-medium transition-colors duration-200 focus:outline-none ${
              isLogin
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Login
          </button>
          <button
            onClick={() => setIsLogin(false)}
            className={`flex-1 py-4 text-sm font-medium transition-colors duration-200 focus:outline-none ${
              !isLogin
                ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50/50'
                : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
          >
            Register
          </button>
        </div>

        {/* Form Container */}
        <div className="p-8">
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-5">
            
            {/* ROLE SELECTION (Register Only) */}
            {!isLogin && (
              <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                <label className="text-sm font-semibold text-gray-700 block">
                  How do you want to register? <span className="text-red-500">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* Employer Option */}
                  <div 
                    onClick={() => setRole('employer')}
                    className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center text-center transition-all duration-200 ${
                      role === 'employer' 
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <Briefcase className={`h-6 w-6 mb-2 ${role === 'employer' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${role === 'employer' ? 'text-blue-700' : 'text-gray-700'}`}>Employer</span>
                    <span className="text-xs text-gray-500 mt-1">I want to hire</span>
                  </div>

                  {/* Worker Option */}
                  <div 
                    onClick={() => setRole('worker')}
                    className={`cursor-pointer border rounded-lg p-3 flex flex-col items-center text-center transition-all duration-200 ${
                      role === 'worker' 
                        ? 'border-blue-500 bg-blue-50 ring-1 ring-blue-500' 
                        : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                    }`}
                  >
                    <HardHat className={`h-6 w-6 mb-2 ${role === 'worker' ? 'text-blue-600' : 'text-gray-400'}`} />
                    <span className={`text-sm font-medium ${role === 'worker' ? 'text-blue-700' : 'text-gray-700'}`}>Worker</span>
                    <span className="text-xs text-gray-500 mt-1">I want to work</span>
                  </div>
                </div>
              </div>
            )}

            {/* Username Input */}
            <div className="space-y-1.5">
              <label htmlFor="username" className="text-sm font-semibold text-gray-700 block">
                Username
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="text"
                  id="username"
                  placeholder={isLogin ? "Enter your username" : "Choose a username"}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
                />
              </div>
            </div>

            {/* Password Input */}
            <div className="space-y-1.5">
              <label htmlFor="password" className="text-sm font-semibold text-gray-700 block">
                Password
              </label>
              <div className="relative group">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                </div>
                <input
                  type="password"
                  id="password"
                  placeholder={isLogin ? "Enter your password" : "Choose a password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
                />
              </div>
            </div>

            {/* Confirm Password (Register Only) */}
            {!isLogin && (
              <div className="space-y-1.5 animate-in fade-in slide-in-from-top-2 duration-300">
                <label htmlFor="confirmPassword"
                  className="text-sm font-semibold text-gray-700 block">
                  Confirm Password
                </label>
                <div className="relative group">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <KeyRound className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors" />
                  </div>
                  <input
                    type="password"
                    id="confirmPassword"
                    placeholder="Repeat your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition-all duration-200 bg-gray-50 focus:bg-white"
                  />
                </div>
              </div>
            )}

            {/* Action Button */}
            <button
              type="submit"
              className="w-full flex items-center justify-center bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 px-4 rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 shadow-md hover:shadow-lg active:scale-[0.98] mt-2"
            >
              {isLogin ? (
                <>
                  <span>Login</span>
                  <ArrowRight className="ml-2 h-4 w-4" />
                </>
              ) : (
                <>
                  <span>Register</span>
                  <UserPlus className="ml-2 h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Feedback Messages */}
          {feedback.text && (
            <div
              className={`mt-6 p-3 rounded-lg flex items-start gap-3 text-sm animate-in fade-in slide-in-from-bottom-2 duration-300 ${
                feedback.type === 'error'
                  ? 'bg-red-50 text-red-700 border border-red-100'
                  : 'bg-green-50 text-green-700 border border-green-100'
              }`}
            >
              {feedback.type === 'error' ? (
                <AlertCircle className="h-5 w-5 flex-shrink-0" />
              ) : (
                <CheckCircle className="h-5 w-5 flex-shrink-0" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
