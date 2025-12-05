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
  // Feature 12: Location
  location?: string; 
  coordinates?: { lat: number; lng: number };
}

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export type JobApplication = {
  id: string;
  workerUsername: string;
  offeredPrice: number;
  message?: string;
  createdAt: string;
  status: ApplicationStatus;
};

export type JobStatus = 'open' | 'processing' | 'completed';

export type JobCategory = 
  | "Plumbing"
  | "Electric"
  | "Painting"
  | "Cleaning"
  | "Carpentry"
  | "Other";

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
  
  // Feature 12: Location
  location?: string;
  coordinates?: { lat: number; lng: number };
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

export type WorkerProfileData = {
  username: string;
  skills: string[];
  bio?: string;
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
  | "newMessage";

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

// --- NEW ADVANCED TYPES ---

// 9. Availability
export type WorkerAvailability = {
  username: string;
  availableDays: string[]; // "Mon", "Tue", etc.
  updatedAt: string;
};

// 11. Gamification
export type BadgeType = 
  | "top-rated" 
  | "fast-responder" 
  | "reliable-pro" 
  | "great-employer" 
  | "frequent-poster"
  | "newcomer";

export interface Badge {
  id: BadgeType;
  label: string;
  description: string;
  icon: string; // Lucide icon name mapping
}

// 14. Disputes
export type DisputeStatus = "open" | "under_review" | "resolved" | "rejected";

export interface Dispute {
  id: string;
  jobId: string;
  openedBy: string; // worker or employer username
  againstUser: string; // other party
  description: string;
  createdAt: string;
  status: DisputeStatus;
  adminNotes?: string;
  resolvedAt?: string;
}

// 15. Activity Logs
export interface ActivityLog {
  id: string;
  user: string;         // username
  role: UserRole;
  action: string;       // e.g. "JOB_CREATED", "OFFER_SENT"
  details?: any;        // small payload: jobId, etc.
  createdAt: string;
}

// --- AUTH & ONBOARDING TYPES ---
export type WorkerOnboardingData = {
  username: string;
  category: string;
  city: string;
  priceLevel: 'Low' | 'Medium' | 'High';
  completedAt: string;
};

export type EmployerPreferences = {
  username: string;
  interestedCategories: string[];
  completedAt: string;
};

export type AuthLanguage = 'en' | 'az' | 'ru';

// --- ADMIN SETTINGS (FEATURE TOGGLES) ---
export interface AdminSettings {
  features: {
    workerComparisonView: boolean;
    workerRiskAlerts: boolean;
    smartAvailabilityMatching: boolean;
    locationDistanceMatching: boolean;
    premiumBadges: boolean;
    behaviorMonitoring: boolean;
    ltvAnalytics: boolean;
  }
}

// Storage Keys
export const JOB_STORAGE_KEY = 'jobPosts';
export const REVIEW_STORAGE_KEY = 'workerReviews';
export const WORKER_PROFILE_KEY = 'workerProfiles';
export const MESSAGE_STORAGE_KEY = 'jobMessages';
export const NOTIFICATION_KEY = 'notifications';
export const FAVORITE_WORKERS_KEY = 'favoriteWorkers';
export const USERS_STORAGE_KEY = 'users';

// New Storage Keys
export const AVAILABILITY_STORAGE_KEY = 'workerAvailability';
export const DISPUTE_STORAGE_KEY = 'disputes';
export const ACTIVITY_LOG_KEY = 'activityLogs';
export const WORKER_ONBOARDING_KEY = 'workerOnboarding';
export const EMPLOYER_PREFS_KEY = 'employerPreferences';
export const LAST_SESSION_KEY = 'lastSession';
export const UI_LANGUAGE_KEY = 'uiLanguage';
export const ADMIN_SETTINGS_KEY = 'adminSettings';

export const JOB_CATEGORIES: JobCategory[] = [
  "Plumbing", "Electric", "Painting", "Cleaning", "Carpentry", "Other"
];
