import { NOTIFICATION_KEY, Notification, NotificationType, MESSAGE_STORAGE_KEY, JobMessage, REVIEW_STORAGE_KEY, WorkerReview, USERS_STORAGE_KEY, User, ADMIN_SETTINGS_KEY, AdminSettings } from './types';

export const initializeAdmin = () => {
  const usersStr = localStorage.getItem(USERS_STORAGE_KEY);
  let users: User[] = usersStr ? JSON.parse(usersStr) : [];
  
  // Check if admin exists
  const adminExists = users.some(u => u.username === 'kaz');
  
  if (!adminExists) {
    const adminUser: User = {
      username: 'kaz',
      password: '1',
      role: 'admin',
      isActive: true
    };
    users.push(adminUser);
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users));
    console.log('Admin user initialized');
  }
};

export const getAdminSettings = (): AdminSettings => {
  const settingsStr = localStorage.getItem(ADMIN_SETTINGS_KEY);
  if (settingsStr) return JSON.parse(settingsStr);
  
  // Default Settings
  return {
    workerComparison: false,
    riskAlerts: false,
    smartMatching: false,
    locationMatching: false,
    premiumBadges: false,
    behavioralMonitoring: false,
    ltvAnalytics: false
  };
};

export const createNotification = (
  recipientUsername: string, 
  type: NotificationType, 
  jobId: string, 
  payload?: any
) => {
  const allNotesStr = localStorage.getItem(NOTIFICATION_KEY);
  const allNotes: Notification[] = allNotesStr ? JSON.parse(allNotesStr) : [];

  const newNote: Notification = {
    id: crypto.randomUUID(),
    username: recipientUsername,
    type,
    jobId,
    createdAt: new Date().toISOString(),
    isRead: false,
    payload
  };

  allNotes.push(newNote);
  localStorage.setItem(NOTIFICATION_KEY, JSON.stringify(allNotes));
};

export const getUnreadCount = (username: string): number => {
  const allNotesStr = localStorage.getItem(NOTIFICATION_KEY);
  if (!allNotesStr) return 0;
  const allNotes: Notification[] = JSON.parse(allNotesStr);
  return allNotes.filter(n => n.username === username && !n.isRead).length;
};

export const getChatUnreadCount = (username: string, role: 'employer' | 'worker', jobId?: string): number => {
  const allMsgsStr = localStorage.getItem(MESSAGE_STORAGE_KEY);
  if (!allMsgsStr) return 0;
  const allMsgs: JobMessage[] = JSON.parse(allMsgsStr);

  return allMsgs.filter(msg => {
    // If checking for specific job
    if (jobId && msg.jobId !== jobId) return false;
    
    // Logic: Count messages NOT sent by me (based on role), that are NOT read by me
    if (role === 'employer') {
      // I am employer, count messages from worker that I haven't read
      return !msg.isReadByEmployer && msg.from === 'worker'; 
    } else {
      // I am worker, count messages from employer that I haven't read
      return !msg.isReadByWorker && msg.from === 'employer'; 
    }
  }).length;
};

export const getWorkerAverageRating = (username: string): number => {
  const allReviewsStr = localStorage.getItem(REVIEW_STORAGE_KEY);
  if (!allReviewsStr) return 0;
  const allReviews: WorkerReview[] = JSON.parse(allReviewsStr);
  const workerReviews = allReviews.filter(r => r.workerUsername === username);
  if (workerReviews.length === 0) return 0;
  return workerReviews.reduce((sum, r) => sum + r.rating, 0) / workerReviews.length;
};
