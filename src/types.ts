export type UserRole = 'employer' | 'worker' | 'admin';

export type UserSession = {
  username: string;
  role: UserRole;
};

export interface User {
  username: string;
  password?: string;
  role: UserRole;
  isActive?: boolean;
}

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export type JobApplication = {
  id: string;
  workerUsername: string;
  offeredPrice: number;
  message?: string;
  estimatedDuration?: string; // New: Worker estimation
  createdAt: string;
  status: ApplicationStatus;
};

export type JobStatus = 'open' | 'processing' | 'completed' | 'awaiting_approval';

export type JobProgress = 'not_started' | 'started' | 'finished';

export type JobCategory = 
  | "Plumbing"
  | "Electric"
  | "Painting"
  | "Cleaning"
  | "Carpentry"
  | "Other";

export type MaterialsType = "Provided by employer" | "Provided by worker" | "Not needed";

export type JobPost = {
  id: string;
  employerUsername: string;
  title: string;
  description: string;
  budget: number;
  address: string;
  daysToComplete: number;
  createdAt: string;
  applications: JobApplication[];
  status: JobStatus;
  assignedWorkerUsername?: string;
  completedAt?: string;
  reviewed?: boolean;
  
  category: JobCategory;
  tags?: string[];

  // New Fields
  isAuction?: boolean;
  media?: string[]; // Array of URLs
  materials?: MaterialsType;
  progress?: JobProgress; // For tracking Start -> Finish
  progressStartedAt?: string;
};

export type WorkerReview = {
  id: string;
  workerUsername: string;
  employerUsername: string;
  jobId: string;
  rating: number; // 1-5
  comment: string;
  createdAt: string;
};

export type WorkerAvailability = 'Available' | 'Busy' | 'Available in 24h' | 'Available in 48h';

export type WorkerProfileData = {
  username: string;
  skills: string[];
  bio?: string;
  experience?: number; // Years
  portfolio?: string[]; // Image URLs
  availability?: WorkerAvailability;
  
  // Onboarding Data
  city?: string;
  priceLevel?: 'Low' | 'Medium' | 'High';
  onboardingCompleted?: boolean;
};

export type EmployerProfileData = {
  username: string;
  preferredCategories: string[];
  onboardingCompleted?: boolean;
};

export type JobMessage = {
  id: string;
  jobId: string;
  from: 'employer' | 'worker';
  senderUsername: string;
  text: string;
  createdAt: string;
  
  // Read status
  isReadByEmployer: boolean;
  isReadByWorker: boolean;
};

export type NotificationType = 
  | "newOffer"
  | "offerAccepted"
  | "offerRejected"
  | "newMessage"
  | "jobStarted"
  | "jobCompleted";

export type Notification = {
  id: string;
  username: string; // recipient
  type: NotificationType;
  jobId: string;
  createdAt: string;
  isRead: boolean;
  payload?: any; 
};

export type FavoriteWorker = {
  employerUsername: string;
  workerUsername: string;
  addedAt: string;
};

// Admin Feature Toggles
export type AdminSettings = {
  workerComparison: boolean;
  riskAlerts: boolean;
  smartMatching: boolean;
  locationMatching: boolean;
  premiumBadges: boolean;
  behavioralMonitoring: boolean;
  ltvAnalytics: boolean;
};

// Storage Keys
export const JOB_STORAGE_KEY = 'jobPosts';
export const REVIEW_STORAGE_KEY = 'workerReviews';
export const WORKER_PROFILE_KEY = 'workerProfiles';
export const EMPLOYER_PROFILE_KEY = 'employerProfiles'; // New
export const MESSAGE_STORAGE_KEY = 'jobMessages';
export const NOTIFICATION_KEY = 'notifications';
export const FAVORITE_WORKERS_KEY = 'favoriteWorkers';
export const USERS_STORAGE_KEY = 'users';
export const ADMIN_SETTINGS_KEY = 'adminSettings';
export const LAST_SESSION_KEY = 'lastSession'; // New

export const JOB_CATEGORIES: JobCategory[] = [
  "Plumbing", "Electric", "Painting", "Cleaning", "Carpentry", "Other"
];
