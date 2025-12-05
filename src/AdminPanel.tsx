import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  LogOut, Users, Briefcase, FileText, MessageSquare, Bell, Settings, 
  Shield, Search, Trash2, CheckCircle, XCircle, Lock, Unlock, BarChart2,
  AlertTriangle, Activity, TrendingUp, Sliders
} from 'lucide-react';
import { 
  User, JobPost, WorkerReview, JobMessage, Notification,
  USERS_STORAGE_KEY, JOB_STORAGE_KEY, REVIEW_STORAGE_KEY, MESSAGE_STORAGE_KEY, NOTIFICATION_KEY
} from './types';
import AdminAnalytics from './components/AdminAnalytics';
import DisputeCenter from './components/DisputeCenter';
import ActivityLogViewer from './components/ActivityLogViewer';
import AdvancedSettings from './components/AdvancedSettings';
import LTVDashboard from './components/LTVDashboard';
import { isFeatureEnabled } from './utils/featureFlags';

type AdminTab = 'dashboard' | 'analytics' | 'ltv' | 'users' | 'jobs' | 'offers' | 'reviews' | 'messages' | 'notifications' | 'disputes' | 'logs' | 'advanced' | 'settings';

export default function AdminPanel() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<AdminTab>('dashboard');
  
  // Data States
  const [users, setUsers] = useState<User[]>([]);
  const [jobs, setJobs] = useState<JobPost[]>([]);
  const [reviews, setReviews] = useState<WorkerReview[]>([]);
  const [messages, setMessages] = useState<JobMessage[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Search States
  const [userSearch, setUserSearch] = useState('');
  const [jobSearch, setJobSearch] = useState('');

  // Feature Flags
  const showLTV = isFeatureEnabled('ltvAnalytics');

  useEffect(() => {
    const currentUserStr = localStorage.getItem('currentUser');
    if (!currentUserStr) {
      navigate('/');
      return;
    }
    try {
      const user = JSON.parse(currentUserStr);
      if (user.role !== 'admin') {
        if (user.role === 'employer') navigate('/employer');
        else navigate('/worker');
      }
    } catch (e) {
      navigate('/');
    }

    loadAllData();
  }, [navigate]);

  const loadAllData = () => {
    const usersStr = localStorage.getItem(USERS_STORAGE_KEY);
    if (usersStr) setUsers(JSON.parse(usersStr));

    const jobsStr = localStorage.getItem(JOB_STORAGE_KEY);
    if (jobsStr) setJobs(JSON.parse(jobsStr));

    const reviewsStr = localStorage.getItem(REVIEW_STORAGE_KEY);
    if (reviewsStr) setReviews(JSON.parse(reviewsStr));

    const msgsStr = localStorage.getItem(MESSAGE_STORAGE_KEY);
    if (msgsStr) setMessages(JSON.parse(msgsStr));

    const notesStr = localStorage.getItem(NOTIFICATION_KEY);
    if (notesStr) setNotifications(JSON.parse(notesStr));
  };

  const toggleUserStatus = (username: string) => {
    if (username === 'kaz') return; // Protect admin
    const updatedUsers = users.map(u => {
      if (u.username === username) {
        return { ...u, isActive: u.isActive === undefined ? false : !u.isActive };
      }
      return u;
    });
    setUsers(updatedUsers);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
  };

  const deleteJob = (jobId: string) => {
    if (!confirm('Are you sure you want to delete this job?')) return;
    const updatedJobs = jobs.filter(j => j.id !== jobId);
    setJobs(updatedJobs);
    localStorage.setItem(JOB_STORAGE_KEY, JSON.stringify(updatedJobs));
  };

  const deleteReview = (reviewId: string) => {
    if (!confirm('Delete this review?')) return;
    const updatedReviews = reviews.filter(r => r.id !== reviewId);
    setReviews(updatedReviews);
    localStorage.setItem(REVIEW_STORAGE_KEY, JSON.stringify(updatedReviews));
  };

  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  // Stats
  const stats = {
    totalUsers: users.length,
    activeJobs: jobs.filter(j => j.status === 'open').length,
    completedJobs: jobs.filter(j => j.status === 'completed').length,
    totalReviews: reviews.length,
    totalMessages: messages.length
  };

  const filteredUsers = users.filter(u => u.username.toLowerCase().includes(userSearch.toLowerCase()));
  const filteredJobs = jobs.filter(j => j.title.toLowerCase().includes(jobSearch.toLowerCase()) || j.employerUsername.toLowerCase().includes(jobSearch.toLowerCase()));

  return (
    <div className="min-h-screen bg-gray-100 font-sans flex">
      
      {/* Sidebar */}
      <div className="w-64 bg-gray-900 text-gray-300 flex flex-col fixed h-full z-10">
        <div className="p-6 border-b border-gray-800 flex items-center gap-3">
          <Shield className="text-blue-500" size={24} />
          <div>
            <h1 className="font-bold text-white">Admin Panel</h1>
            <p className="text-xs text-gray-500">System Management</p>
          </div>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {[
            { id: 'dashboard', icon: Briefcase, label: 'Dashboard' },
            { id: 'analytics', icon: BarChart2, label: 'Analytics' },
            ...(showLTV ? [{ id: 'ltv', icon: TrendingUp, label: 'LTV Dashboard' }] : []),
            { id: 'users', icon: Users, label: 'Users' },
            { id: 'jobs', icon: FileText, label: 'Jobs' },
            { id: 'offers', icon: CheckCircle, label: 'Offers' },
            { id: 'reviews', icon: CheckCircle, label: 'Reviews' },
            { id: 'messages', icon: MessageSquare, label: 'Messages' },
            { id: 'notifications', icon: Bell, label: 'Notifications' },
            { id: 'disputes', icon: AlertTriangle, label: 'Disputes' },
            { id: 'logs', icon: Activity, label: 'Activity Logs' },
            { id: 'advanced', icon: Sliders, label: 'Advanced Features' },
            { id: 'settings', icon: Settings, label: 'Settings' },
          ].map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id as AdminTab)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-colors ${
                activeTab === item.id 
                  ? 'bg-blue-600 text-white' 
                  : 'hover:bg-gray-800 hover:text-white'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
        </nav>

        <div className="p-4 border-t border-gray-800">
          <button 
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-red-400 hover:bg-gray-800 hover:text-red-300 transition-colors"
          >
            <LogOut size={18} /> Logout
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 flex-1 p-8 overflow-y-auto h-screen">
        
        {activeTab === 'dashboard' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-gray-900">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500 font-medium">Total Users</p>
                <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalUsers}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500 font-medium">Active Jobs</p>
                <p className="text-3xl font-bold text-blue-600 mt-2">{stats.activeJobs}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500 font-medium">Completed Jobs</p>
                <p className="text-3xl font-bold text-green-600 mt-2">{stats.completedJobs}</p>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                <p className="text-sm text-gray-500 font-medium">Total Messages</p>
                <p className="text-3xl font-bold text-purple-600 mt-2">{stats.totalMessages}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'analytics' && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Advanced Analytics</h2>
            <AdminAnalytics 
              users={users} 
              jobs={jobs} 
              reviews={reviews} 
              messages={messages} 
              notifications={notifications} 
            />
          </div>
        )}

        {activeTab === 'ltv' && showLTV && (
          <div className="space-y-6">
            <h2 className="text-2xl font-bold text-gray-900">Lifetime Value (LTV) Analytics</h2>
            <LTVDashboard />
          </div>
        )}

        {activeTab === 'users' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search users..." 
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
                />
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Username</th>
                    <th className="px-6 py-4 font-semibold">Role</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {filteredUsers.map(user => (
                    <tr key={user.username} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium text-gray-900">{user.username}</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                          user.role === 'admin' ? 'bg-purple-100 text-purple-700' :
                          user.role === 'employer' ? 'bg-blue-100 text-blue-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {user.isActive !== false ? (
                          <span className="flex items-center gap-1 text-green-600 text-xs font-bold bg-green-50 px-2 py-1 rounded-full w-fit">
                            <CheckCircle size={12} /> Active
                          </span>
                        ) : (
                          <span className="flex items-center gap-1 text-red-600 text-xs font-bold bg-red-50 px-2 py-1 rounded-full w-fit">
                            <XCircle size={12} /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-right">
                        {user.role !== 'admin' && (
                          <button 
                            onClick={() => toggleUserStatus(user.username)}
                            className={`p-2 rounded-lg transition-colors ${
                              user.isActive !== false 
                                ? 'bg-red-50 text-red-600 hover:bg-red-100' 
                                : 'bg-green-50 text-green-600 hover:bg-green-100'
                            }`}
                            title={user.isActive !== false ? "Deactivate User" : "Activate User"}
                          >
                            {user.isActive !== false ? <Lock size={16} /> : <Unlock size={16} />}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'jobs' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold text-gray-900">Job Management</h2>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 text-gray-400" size={16} />
                <input 
                  type="text" 
                  placeholder="Search jobs..." 
                  value={jobSearch}
                  onChange={e => setJobSearch(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none w-64"
                />
              </div>
            </div>

            <div className="grid gap-4">
              {filteredJobs.map(job => (
                <div key={job.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-900">{job.title}</h3>
                    <p className="text-sm text-gray-500">Employer: {job.employerUsername} • Status: {job.status}</p>
                    <p className="text-xs text-gray-400 mt-1">ID: {job.id}</p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-blue-600">{job.budget} ₼</span>
                    <button 
                      onClick={() => deleteJob(job.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'offers' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-gray-900">All Offers</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-xs">
                  <tr>
                    <th className="px-6 py-4 font-semibold">Job ID</th>
                    <th className="px-6 py-4 font-semibold">Worker</th>
                    <th className="px-6 py-4 font-semibold">Price</th>
                    <th className="px-6 py-4 font-semibold">Status</th>
                    <th className="px-6 py-4 font-semibold">Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {jobs.flatMap(job => (job.applications || []).map(app => ({ ...app, jobId: job.id }))).map(app => (
                    <tr key={app.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono text-xs text-gray-500">{app.jobId.slice(0, 8)}...</td>
                      <td className="px-6 py-4 font-medium">{app.workerUsername}</td>
                      <td className="px-6 py-4 text-blue-600 font-bold">{app.offeredPrice} ₼</td>
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-full text-xs font-bold uppercase ${
                          app.status === 'accepted' ? 'bg-green-100 text-green-700' :
                          app.status === 'rejected' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {app.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-500 text-xs">{new Date(app.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-gray-900">Reviews Moderation</h2>
            <div className="grid gap-4">
              {reviews.map(review => (
                <div key={review.id} className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-bold text-gray-900 text-sm">
                        {review.employerUsername} <span className="text-gray-400 font-normal">reviewed</span> {review.workerUsername}
                      </p>
                      <div className="flex text-amber-400 my-1">
                        {[1, 2, 3, 4, 5].map(star => (
                          <span key={star}>{star <= review.rating ? '★' : '☆'}</span>
                        ))}
                      </div>
                      <p className="text-gray-600 text-sm italic">"{review.comment}"</p>
                    </div>
                    <button 
                      onClick={() => deleteReview(review.id)}
                      className="text-red-400 hover:text-red-600 text-xs font-medium"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-gray-900">System Messages</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-xs sticky top-0">
                    <tr>
                      <th className="px-6 py-3 font-semibold">From</th>
                      <th className="px-6 py-3 font-semibold">Message</th>
                      <th className="px-6 py-3 font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {messages.map(msg => (
                      <tr key={msg.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium">
                          {msg.senderUsername} 
                          <span className="text-xs text-gray-400 font-normal ml-1">({msg.from})</span>
                        </td>
                        <td className="px-6 py-3 text-gray-600 truncate max-w-xs">{msg.text}</td>
                        <td className="px-6 py-3 text-xs text-gray-400">{new Date(msg.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'notifications' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-gray-900">Notification Logs</h2>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="max-h-[600px] overflow-y-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-gray-50 border-b border-gray-200 text-gray-500 uppercase tracking-wider text-xs sticky top-0">
                    <tr>
                      <th className="px-6 py-3 font-semibold">Recipient</th>
                      <th className="px-6 py-3 font-semibold">Type</th>
                      <th className="px-6 py-3 font-semibold">Time</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {notifications.map(n => (
                      <tr key={n.id} className="hover:bg-gray-50">
                        <td className="px-6 py-3 font-medium">{n.username}</td>
                        <td className="px-6 py-3">
                          <span className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-xs font-mono">{n.type}</span>
                        </td>
                        <td className="px-6 py-3 text-xs text-gray-400">{new Date(n.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'disputes' && (
          <div className="animate-in fade-in duration-300">
            <DisputeCenter />
          </div>
        )}

        {activeTab === 'logs' && (
          <div className="animate-in fade-in duration-300">
            <ActivityLogViewer />
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="animate-in fade-in duration-300">
            <AdvancedSettings />
          </div>
        )}

        {activeTab === 'settings' && (
          <div className="space-y-6 animate-in fade-in duration-300">
            <h2 className="text-2xl font-bold text-gray-900">System Settings</h2>
            <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-200">
              <h3 className="font-bold text-lg text-gray-800 mb-4">Danger Zone</h3>
              <p className="text-gray-600 mb-6 text-sm">
                Resetting the database will clear ALL users (except admin), jobs, offers, messages, and reviews. 
                This action cannot be undone.
              </p>
              <button 
                onClick={() => {
                  if (confirm('CRITICAL WARNING: This will wipe all data. Are you sure?')) {
                    localStorage.clear();
                    // Re-init admin
                    const adminUser = { username: 'kaz', password: '1', role: 'admin', isActive: true };
                    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify([adminUser]));
                    alert('System reset complete. Please log in again.');
                    navigate('/');
                  }
                }}
                className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg transition-colors"
              >
                Reset Database
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
