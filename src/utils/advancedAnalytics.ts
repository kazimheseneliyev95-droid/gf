import { 
  User, JobPost, WorkerReview, ServiceLevel, UserRiskMetrics,
  JOB_STORAGE_KEY, REVIEW_STORAGE_KEY, USERS_STORAGE_KEY, DISPUTE_STORAGE_KEY,
  UserRole, Dispute
} from '../types';
import { calculateWorkerQuality, calculateEmployerTrust } from './advancedFeatures';

const getLocalData = <T>(key: string): T[] => {
  const str = localStorage.getItem(key);
  return str ? JSON.parse(str) : [];
};

// --- SLA / SERVICE LEVELS ---

export const deriveServiceLevel = (
  completedJobs: number, 
  avgRating: number, 
  recentDisputes: number
): ServiceLevel => {
  if (completedJobs >= 50 && avgRating >= 4.8 && recentDisputes === 0) {
    return 'elite';
  }
  if (completedJobs >= 10 && avgRating >= 4.5 && recentDisputes <= 1) {
    return 'pro';
  }
  return 'basic';
};

export const updateServiceLevelsForWorkers = () => {
  const users = getLocalData<User>(USERS_STORAGE_KEY);
  const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
  const reviews = getLocalData<WorkerReview>(REVIEW_STORAGE_KEY);
  const disputes = getLocalData<Dispute>(DISPUTE_STORAGE_KEY);

  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  let hasChanges = false;

  const updatedUsers = users.map(user => {
    if (user.role !== 'worker') return user;

    const completed = jobs.filter(j => j.assignedWorkerUsername === user.username && j.status === 'completed').length;
    
    const myReviews = reviews.filter(r => r.workerUsername === user.username);
    const avgRating = myReviews.length > 0 
      ? myReviews.reduce((sum, r) => sum + r.rating, 0) / myReviews.length 
      : 0;

    const recentDisputes = disputes.filter(d => 
      d.againstUser === user.username && new Date(d.createdAt) >= thirtyDaysAgo
    ).length;

    const newLevel = deriveServiceLevel(completed, avgRating, recentDisputes);

    if (user.serviceLevel !== newLevel) {
      hasChanges = true;
      return { ...user, serviceLevel: newLevel };
    }
    return user;
  });

  if (hasChanges) {
    localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(updatedUsers));
  }
};

// --- RISK & FRAUD ---

// Re-exporting risk calculation for Admin Panel usage
import { computeUserRiskMetrics } from './analytics';

export const getAdminRiskMetrics = (): UserRiskMetrics[] => {
  const users = getLocalData<User>(USERS_STORAGE_KEY);
  const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
  const disputes = getLocalData<Dispute>(DISPUTE_STORAGE_KEY);
  const reviews = getLocalData<WorkerReview>(REVIEW_STORAGE_KEY);

  return computeUserRiskMetrics(users, jobs, disputes, reviews);
};

// --- LEGACY EXPORTS (Keeping for compatibility) ---
export const getWorkerRisk = (username: string) => {
  const quality = calculateWorkerQuality(username);
  const factors: string[] = [];
  if (quality < 40) factors.push("Very low quality score");
  return { isHighRisk: factors.length > 0, factors, level: factors.length > 0 ? 'High' : 'Low' };
};

export const getDistance = (userLoc: string | undefined, jobLoc: string): number => {
  if (!userLoc || !jobLoc) return 0;
  const combined = userLoc + jobLoc;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 20) + 1;
};

export const isPremiumWorker = (username: string): boolean => {
  const users = getLocalData<User>(USERS_STORAGE_KEY);
  const user = users.find(u => u.username === username);
  return user?.serviceLevel === 'elite' || user?.serviceLevel === 'pro';
};

export const isPremiumEmployer = (username: string): boolean => {
  const trust = calculateEmployerTrust(username);
  return trust > 80;
};

export const getBehaviorMetrics = (username: string, role: UserRole) => {
  // Simplified mock
  return { score: 85, positiveRatio: 90, completionRate: 80, completionRatio: 80, responseRatio: 90 };
};

export const getLTVMetrics = () => {
  // Simplified mock
  return { workers: [], employers: [] };
};

export const isWorkerAvailable = (username: string): boolean => {
  return true; // Simplified
};
