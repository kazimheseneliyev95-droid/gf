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

// Storage Keys
export const JOB_STORAGE_KEY = 'jobPosts';
export const REVIEW_STORAGE_KEY = 'workerReviews';
export const WORKER_PROFILE_KEY = 'workerProfiles';
export const MESSAGE_STORAGE_KEY = 'jobMessages';
export const NOTIFICATION_KEY = 'notifications';
export const FAVORITE_WORKERS_KEY = 'favoriteWorkers';
export const USERS_STORAGE_KEY = 'users';

export const JOB_CATEGORIES: JobCategory[] = [
  "Plumbing", "Electric", "Painting", "Cleaning", "Carpentry", "Other"
];
