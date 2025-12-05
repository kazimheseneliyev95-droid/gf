import { 
  User, JobPost, WorkerReview, JobApplication, WorkerProfileData, 
  Badge, BadgeType, ActivityLog, Dispute, WorkerAvailability,
  JOB_STORAGE_KEY, REVIEW_STORAGE_KEY, WORKER_PROFILE_KEY, 
  ACTIVITY_LOG_KEY, DISPUTE_STORAGE_KEY, AVAILABILITY_STORAGE_KEY, 
  USERS_STORAGE_KEY, WORKER_ONBOARDING_KEY, WorkerOnboardingData,
  UserRole
} from '../types';

// --- DATA LOADING HELPERS ---
const getLocalData = <T>(key: string): T[] => {
  const str = localStorage.getItem(key);
  return str ? JSON.parse(str) : [];
};

// --- 15. ACTIVITY LOGGING ---
export const logActivity = (user: string, role: UserRole, action: string, details?: any) => {
  const logs = getLocalData<ActivityLog>(ACTIVITY_LOG_KEY);
  const newLog: ActivityLog = {
    id: crypto.randomUUID(),
    user,
    role,
    action,
    details,
    createdAt: new Date().toISOString()
  };
  logs.push(newLog);
  localStorage.setItem(ACTIVITY_LOG_KEY, JSON.stringify(logs));
};

// --- 3. WORKER QUALITY SCORE ---
export const calculateWorkerQuality = (workerUsername: string): number => {
  const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
  const reviews = getLocalData<WorkerReview>(REVIEW_STORAGE_KEY);

  // 1. Completion Rate
  let accepted = 0;
  let completed = 0;
  let rejected = 0;

  jobs.forEach(j => {
    const app = j.applications?.find(a => a.workerUsername === workerUsername);
    if (app) {
      if (app.status === 'accepted') accepted++;
      if (app.status === 'rejected') rejected++;
    }
    if (j.assignedWorkerUsername === workerUsername && j.status === 'completed') completed++;
  });

  const completionRate = accepted > 0 ? completed / accepted : 0;
  
  // 2. Rating
  const workerReviews = reviews.filter(r => r.workerUsername === workerUsername);
  const avgRating = workerReviews.length > 0 
    ? workerReviews.reduce((sum, r) => sum + r.rating, 0) / workerReviews.length 
    : 0;

  // 3. Negative Signals (Rejections)
  // If a worker applies a lot but gets rejected often, quality might be lower
  const totalApps = accepted + rejected; // simplified
  const rejectionRate = totalApps > 0 ? rejected / totalApps : 0;

  // Formula
  // (Completion * 0.4) + (Rating/5 * 0.4) + ((1 - Rejection) * 0.2)
  const score = (
    (completionRate * 0.4) + 
    ((avgRating / 5) * 0.4) + 
    ((1 - rejectionRate) * 0.2)
  ) * 100;

  return Math.min(100, Math.max(0, Math.round(score)));
};

// --- 4. EMPLOYER TRUST SCORE ---
export const calculateEmployerTrust = (employerUsername: string): number => {
  const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
  const reviews = getLocalData<WorkerReview>(REVIEW_STORAGE_KEY);

  const myJobs = jobs.filter(j => j.employerUsername === employerUsername);
  const completed = myJobs.filter(j => j.status === 'completed').length;
  
  // 1. Completion Ratio
  const completionRatio = myJobs.length > 0 ? completed / myJobs.length : 0;

  // 2. Response Rate
  let offersReceived = 0;
  let offersResponded = 0;
  myJobs.forEach(j => {
    const apps = j.applications || [];
    offersReceived += apps.length;
    offersResponded += apps.filter(a => a.status === 'accepted' || a.status === 'rejected').length;
  });
  const responseRate = offersReceived > 0 ? offersResponded / offersReceived : 0;

  // 3. Reviews Given (Generosity/Fairness proxy)
  const reviewsGiven = reviews.filter(r => r.employerUsername === employerUsername);
  const avgRatingGiven = reviewsGiven.length > 0 
    ? reviewsGiven.reduce((sum, r) => sum + r.rating, 0) / reviewsGiven.length 
    : 3; // Default to neutral if no reviews given

  // Formula
  const score = (
    (completionRatio * 0.5) + 
    (responseRate * 0.3) + 
    ((avgRatingGiven / 5) * 0.2)
  ) * 100;

  return Math.min(100, Math.max(0, Math.round(score)));
};

// --- 6. PROFILE STRENGTH ---
export const getProfileStrengthDetails = (username: string) => {
  const profiles = getLocalData<WorkerProfileData>(WORKER_PROFILE_KEY);
  const profile = profiles.find(p => p.username === username);
  const onboarding = getLocalData<WorkerOnboardingData>(WORKER_ONBOARDING_KEY).find(o => o.username === username);
  const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
  const reviews = getLocalData<WorkerReview>(REVIEW_STORAGE_KEY);

  const checks = {
    hasSkills: false,
    hasBio: false,
    hasLocation: false,
    hasActivity: false
  };

  let score = 0;

  // 1. Skills (+25%)
  if (profile && profile.skills && profile.skills.length > 0) {
    checks.hasSkills = true;
    score += 25;
  }

  // 2. Bio (+25%) - Must be >= 40 chars
  if (profile && profile.bio && profile.bio.trim().length >= 40) {
    checks.hasBio = true;
    score += 25;
  }

  // 3. Location (+25%)
  if (onboarding && onboarding.city) {
    checks.hasLocation = true;
    score += 25;
  }

  // 4. Activity (+25%) - Completed jobs OR Rating
  const completedCount = jobs.filter(j => j.assignedWorkerUsername === username && j.status === 'completed').length;
  const hasRating = reviews.some(r => r.workerUsername === username);
  if (completedCount > 0 || hasRating) {
    checks.hasActivity = true;
    score += 25;
  }

  return { score, checks };
};

export const calculateProfileStrength = (username: string): number => {
  return getProfileStrengthDetails(username).score;
};

// --- 11. GAMIFICATION (BADGES) ---
export const getBadges = (username: string, role: UserRole): Badge[] => {
  const badges: Badge[] = [];
  
  if (role === 'worker') {
    const quality = calculateWorkerQuality(username);
    const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
    const completed = jobs.filter(j => j.assignedWorkerUsername === username && j.status === 'completed').length;

    if (quality >= 80 && completed >= 5) {
      badges.push({ id: 'top-rated', label: 'Top Rated', description: 'High quality score & many jobs', icon: 'Award' });
    }
    if (quality >= 60 && quality < 80 && completed >= 2) {
      badges.push({ id: 'reliable-pro', label: 'Reliable', description: 'Consistent performance', icon: 'ShieldCheck' });
    }
    if (completed === 0) {
      badges.push({ id: 'newcomer', label: 'Newcomer', description: 'Welcome to the platform', icon: 'Sprout' });
    }
  } else if (role === 'employer') {
    const trust = calculateEmployerTrust(username);
    const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
    const posted = jobs.filter(j => j.employerUsername === username).length;

    if (trust >= 80) {
      badges.push({ id: 'great-employer', label: 'Great Employer', description: 'High trust score', icon: 'ThumbsUp' });
    }
    if (posted >= 5) {
      badges.push({ id: 'frequent-poster', label: 'Frequent Poster', description: 'Posts jobs regularly', icon: 'Zap' });
    }
  }

  return badges;
};

// --- 1. RECOMMENDATION ENGINE ---

export const getRecommendedJobs = (workerUsername: string): JobPost[] => {
  const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
  const profiles = getLocalData<WorkerProfileData>(WORKER_PROFILE_KEY);
  const profile = profiles.find(p => p.username === workerUsername);
  
  // Filter open jobs not applied to
  let candidates = jobs.filter(j => 
    j.status === 'open' && 
    (!j.applications || !j.applications.some(a => a.workerUsername === workerUsername))
  );

  if (!profile) return candidates.slice(0, 5);

  // Score candidates
  const scored = candidates.map(job => {
    let score = 0;
    // Category match (simple string match in skills)
    const hasSkill = profile.skills.some(s => 
      job.category.toLowerCase().includes(s.toLowerCase()) || 
      s.toLowerCase().includes(job.category.toLowerCase())
    );
    if (hasSkill) score += 50;
    
    // Budget bonus (higher budget = better recommendation?)
    if (job.budget > 100) score += 10;
    
    // Recency
    const daysOld = (Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysOld < 3) score += 20;

    return { job, score };
  });

  return scored.sort((a, b) => b.score - a.score).map(s => s.job).slice(0, 5);
};

export const getRecommendedWorkers = (jobId: string): { username: string, score: number, matchReason: string }[] => {
  const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
  const profiles = getLocalData<WorkerProfileData>(WORKER_PROFILE_KEY);
  const users = getLocalData<User>(USERS_STORAGE_KEY);
  
  const job = jobs.find(j => j.id === jobId);
  if (!job) return [];

  const workers = users.filter(u => u.role === 'worker');

  const scored = workers.map(w => {
    let score = 0;
    let reasons: string[] = [];
    
    const profile = profiles.find(p => p.username === w.username);
    const quality = calculateWorkerQuality(w.username);
    
    // 1. Skill Match
    if (profile) {
      const hasSkill = profile.skills.some(s => 
        job.category.toLowerCase().includes(s.toLowerCase()) || 
        s.toLowerCase().includes(job.category.toLowerCase())
      );
      if (hasSkill) {
        score += 40;
        reasons.push("Skills match category");
      }
    }

    // 2. Quality Score
    score += (quality * 0.5);
    if (quality > 80) reasons.push("Top rated worker");

    // 3. Availability (Bonus)
    const avail = getLocalData<WorkerAvailability>(AVAILABILITY_STORAGE_KEY).find(a => a.username === w.username);
    if (avail && avail.availableDays.length > 0) {
      score += 10;
      reasons.push("Available this week");
    }

    return { username: w.username, score, matchReason: reasons.join(', ') || 'General match' };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
};

// --- AUCTION HELPER ---
export const getLowestBid = (job: JobPost): number | null => {
  if (!job.applications || job.applications.length === 0) return null;
  return Math.min(...job.applications.map(a => a.offeredPrice));
};
