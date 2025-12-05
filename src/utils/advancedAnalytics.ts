import { 
  User, JobPost, WorkerReview, JobApplication, WorkerAvailability,
  JOB_STORAGE_KEY, REVIEW_STORAGE_KEY, USERS_STORAGE_KEY, AVAILABILITY_STORAGE_KEY,
  UserRole
} from '../types';
import { calculateWorkerQuality, calculateEmployerTrust } from './advancedFeatures';

const getLocalData = <T>(key: string): T[] => {
  const str = localStorage.getItem(key);
  return str ? JSON.parse(str) : [];
};

// --- FEATURE 10: WORKER RISK ALERTS ---
export const getWorkerRisk = (username: string) => {
  const quality = calculateWorkerQuality(username);
  const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
  const reviews = getLocalData<WorkerReview>(REVIEW_STORAGE_KEY);

  // Risk Factors
  const factors: string[] = [];
  
  // 1. Low Quality Score
  if (quality < 40) factors.push("Very low quality score");

  // 2. Cancellation Rate
  let applied = 0;
  let rejected = 0;
  jobs.forEach(j => {
    const app = j.applications?.find(a => a.workerUsername === username);
    if (app) {
      applied++;
      if (app.status === 'rejected') rejected++;
    }
  });
  if (applied > 5 && (rejected / applied) > 0.7) factors.push("High rejection rate (>70%)");

  // 3. Low Ratings
  const myReviews = reviews.filter(r => r.workerUsername === username);
  const avgRating = myReviews.length > 0 
    ? myReviews.reduce((sum, r) => sum + r.rating, 0) / myReviews.length 
    : 5;
  
  if (myReviews.length > 2 && avgRating < 3) factors.push("Consistently poor ratings");

  const isHighRisk = factors.length > 0;
  
  return { isHighRisk, factors, level: factors.length > 1 ? 'High' : 'Medium' };
};

// --- FEATURE 12: LOCATION & DISTANCE ---
// Mock distance calculator since we don't have real geo-db
export const getDistance = (userLoc: string | undefined, jobLoc: string): number => {
  if (!userLoc || !jobLoc) return 0;
  // Simple hash-based mock distance for demo consistency
  const combined = userLoc + jobLoc;
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    hash = ((hash << 5) - hash) + combined.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash % 20) + 1; // Returns 1-20 km
};

// --- FEATURE 13: PREMIUM BADGES ---
export const isPremiumWorker = (username: string): boolean => {
  const quality = calculateWorkerQuality(username);
  const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
  const completed = jobs.filter(j => j.assignedWorkerUsername === username && j.status === 'completed').length;
  return quality > 75 && completed >= 3;
};

export const isPremiumEmployer = (username: string): boolean => {
  const trust = calculateEmployerTrust(username);
  const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
  const posted = jobs.filter(j => j.employerUsername === username).length;
  return trust > 75 && posted >= 3;
};

// --- FEATURE 14: BEHAVIORAL MONITORING ---
export const getBehaviorMetrics = (username: string, role: UserRole) => {
  const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
  const reviews = getLocalData<WorkerReview>(REVIEW_STORAGE_KEY);
  
  if (role === 'worker') {
    const quality = calculateWorkerQuality(username);
    const myReviews = reviews.filter(r => r.workerUsername === username);
    const positiveReviews = myReviews.filter(r => r.rating >= 4).length;
    
    return {
      score: quality, // Reuse quality as base
      positiveRatio: myReviews.length > 0 ? (positiveReviews / myReviews.length) * 100 : 100,
      completionRate: quality > 0 ? quality * 0.8 : 0 // Mock derivation
    };
  } else {
    const trust = calculateEmployerTrust(username);
    const myJobs = jobs.filter(j => j.employerUsername === username);
    const completed = myJobs.filter(j => j.status === 'completed').length;
    
    return {
      score: trust,
      completionRatio: myJobs.length > 0 ? (completed / myJobs.length) * 100 : 0,
      responseRatio: trust * 0.9 // Mock derivation
    };
  }
};

// --- FEATURE 15: LTV ANALYTICS ---
export const getLTVMetrics = () => {
  const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
  const users = getLocalData<User>(USERS_STORAGE_KEY);

  // Worker LTV
  const workers = users.filter(u => u.role === 'worker').map(u => {
    let totalEarned = 0;
    let jobsCount = 0;
    jobs.forEach(j => {
      if (j.assignedWorkerUsername === u.username && j.status === 'completed') {
        const app = j.applications.find(a => a.workerUsername === u.username && a.status === 'accepted');
        if (app) {
          totalEarned += app.offeredPrice;
          jobsCount++;
        }
      }
    });
    return { username: u.username, totalEarned, jobsCount };
  }).sort((a, b) => b.totalEarned - a.totalEarned);

  // Employer LTV
  const employers = users.filter(u => u.role === 'employer').map(u => {
    let totalSpent = 0;
    let jobsCount = 0;
    jobs.forEach(j => {
      if (j.employerUsername === u.username && j.status === 'completed') {
        const app = j.applications.find(a => a.status === 'accepted');
        if (app) {
          totalSpent += app.offeredPrice;
          jobsCount++;
        }
      }
    });
    return { username: u.username, totalSpent, jobsCount };
  }).sort((a, b) => b.totalSpent - a.totalSpent);

  return { workers, employers };
};

// --- HELPER FOR AVAILABILITY ---
export const isWorkerAvailable = (username: string): boolean => {
  const avail = getLocalData<WorkerAvailability>(AVAILABILITY_STORAGE_KEY);
  const workerAvail = avail.find(a => a.username === username);
  // Simple check: if they have ANY days selected, they are "Available" for this demo
  return !!workerAvail && workerAvail.availableDays.length > 0;
};
