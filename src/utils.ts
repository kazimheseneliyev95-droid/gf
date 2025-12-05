import { NOTIFICATION_KEY, Notification, NotificationType, NotificationCategory, MESSAGE_STORAGE_KEY, JobMessage, REVIEW_STORAGE_KEY, WorkerReview, USERS_STORAGE_KEY, User, NotificationSection } from './types';

export const initializeAdmin = () => {
  const usersStr = localStorage.getItem(USERS_STORAGE_KEY);
  let users: User[] = usersStr ? JSON.parse(usersStr) : [];
  
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
  }
};

export const createNotification = (
  recipientUsername: string, 
  type: NotificationType, 
  jobId: string, 
  payload?: any,
  section?: NotificationSection
) => {
  const allNotesStr = localStorage.getItem(NOTIFICATION_KEY);
  const allNotes: Notification[] = allNotesStr ? JSON.parse(allNotesStr) : [];

  // Determine category based on type
  let category: NotificationCategory = 'system';
  if (type === 'newOffer' || type === 'offerAccepted' || type === 'offerRejected') category = 'offers';
  if (type === 'newMessage') category = 'messages';
  if (type === 'jobReminder' || type === 'jobUpdated') category = 'jobs';

  const newNote: Notification = {
    id: crypto.randomUUID(),
    username: recipientUsername,
    type,
    category,
    jobId,
    section,
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
    if (jobId && msg.jobId !== jobId) return false;
    if (role === 'employer') {
      return !msg.isReadByEmployer && msg.from === 'worker'; 
    } else {
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
