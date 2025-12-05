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
  location?: string; 
  coordinates?: { lat: number; lng: number };
  // Feature: Onboarding Flag
  hasCompletedOnboarding?: boolean;
}

export type ApplicationStatus = 'pending' | 'accepted' | 'rejected' | 'cancelled';

export type JobApplication = {
  id: string;
  workerUsername: string;
  offeredPrice: number;
  message?: string;
  createdAt: string;
  status: ApplicationStatus;
  // Feature 5: Deadline confirmation
  canMeetDeadline?: boolean;
  estimatedDuration?: string;
};

export type JobStatus = 'open' | 'processing' | 'completed';

export type JobCategory = 
  | "Plumbing"
  | "Electric"
  | "Painting"
  | "Cleaning"
  | "Carpentry"
  | "Other";

export type MediaType = 'image' | 'video';
export type MediaItem = { url: string; type: MediaType };

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
  
  location?: string;
  coordinates?: { lat: number; lng: number };

  isAuction?: boolean;
  auctionMode?: 'open' | 'none';

  // Feature 5: Desired Completion
  desiredCompletion?: {
    type: 'date' | 'relative' | 'none';
    value: string;
  };

  // Feature 8: Materials
  materials?: 'by_employer' | 'by_worker' | 'none';

  // Feature 9: Media
  media?: {
    before: MediaItem[];
    after: MediaItem[];
  };

  // Feature 6: Checklist
  completionChecklist?: {
    worker: {
      workCompleted: boolean;
      materialsHandled: boolean;
      problemResolved: boolean;
      cleanupDone: boolean;
      finalMediaUploaded: boolean;
    };
    employer?: {
      confirmed: boolean;
      comment?: string;
    };
  };
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
  regions?: string[]; // New Field: Service Regions
  bio?: string;
  // Feature 4: Availability Status
  availabilityStatus?: 'available' | 'busy';
};

export type EmployerProfileData = {
  username: string;
  companyName?: string;
  avatarUrl?: string;
  city?: string;
  regions?: string[];
  bio?: string;
  preferredCategories?: string[];
};

export type JobMessage = {
  id: string;
  jobId: string;
  from: 'employer' | 'worker';
  senderUsername: string;
  text: string;
  createdAt: string;
  isReadByEmployer: boolean;
  isReadByWorker: boolean;
};

export type NotificationType = 
  | "newOffer"
  | "offerAccepted"
  | "offerRejected"
  | "newMessage"
  | "jobReminder" // Feature 2
  | "jobUpdated"; // Feature: Job Editing

export type NotificationSection = "offers" | "chat" | "details";

export type Notification = {
  id: string;
  username: string; // recipient
  type: NotificationType;
  jobId: string;
  section?: NotificationSection; // Feature: Navigation Section
  createdAt: string;
  isRead: boolean;
  payload?: any; 
};

export type FavoriteWorker = {
  employerUsername: string;
  workerUsername: string;
  addedAt: string;
};

export type WorkerAvailability = {
  username: string;
  availableDays: string[]; 
  updatedAt: string;
};

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
  icon: string; 
}

export type DisputeStatus = "open" | "under_review" | "resolved" | "rejected";

export interface Dispute {
  id: string;
  jobId: string;
  openedBy: string; 
  againstUser: string; 
  description: string;
  createdAt: string;
  status: DisputeStatus;
  adminNotes?: string;
  resolvedAt?: string;
  // Feature 1: Problem Type
  problemType?: string;
}

export interface ActivityLog {
  id: string;
  user: string;         
  role: UserRole;
  action: string;       
  details?: any;        
  createdAt: string;
}

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

export interface AdminSettings {
  features: {
    workerComparisonView: boolean;
    workerRiskAlerts: boolean;
    smartAvailabilityMatching: boolean;
    locationDistanceMatching: boolean;
    premiumBadges: boolean;
    behaviorMonitoring: boolean;
    ltvAnalytics: boolean;
    auctionMode: boolean; 
  }
}

// Storage Keys
export const JOB_STORAGE_KEY = 'jobPosts';
export const REVIEW_STORAGE_KEY = 'workerReviews';
export const WORKER_PROFILE_KEY = 'workerProfiles';
export const EMPLOYER_PROFILE_KEY = 'employerProfiles';
export const MESSAGE_STORAGE_KEY = 'jobMessages';
export const NOTIFICATION_KEY = 'notifications';
export const FAVORITE_WORKERS_KEY = 'favoriteWorkers';
export const USERS_STORAGE_KEY = 'users';
export const AVAILABILITY_STORAGE_KEY = 'workerAvailability';
export const DISPUTE_STORAGE_KEY = 'disputes';
export const ACTIVITY_LOG_KEY = 'activityLogs';
export const WORKER_ONBOARDING_KEY = 'workerOnboarding';
export const EMPLOYER_PREFS_KEY = 'employerPreferences';
export const LAST_SESSION_KEY = 'lastSession';
export const UI_LANGUAGE_KEY = 'uiLanguage';
export const ADMIN_SETTINGS_KEY = 'adminSettings';
// Feature 3: Saved Jobs
export const SAVED_JOBS_KEY = 'savedJobs'; 

export const JOB_CATEGORIES: JobCategory[] = [
  "Plumbing", "Electric", "Painting", "Cleaning", "Carpentry", "Other"
];
