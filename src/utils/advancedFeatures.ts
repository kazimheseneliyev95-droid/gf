import { 
  User, JobPost, WorkerReview, JobApplication, WorkerProfileData, EmployerProfileData,
  Badge, BadgeType, ActivityLog, Dispute, WorkerAvailability,
  JOB_STORAGE_KEY, REVIEW_STORAGE_KEY, WORKER_PROFILE_KEY, EMPLOYER_PROFILE_KEY,
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

// --- 3. WORKER QUALITY SCORE (Legacy) ---
// Kept for backward compatibility if needed, but Trust Score is preferred now.
export const calculateWorkerQuality = (workerUsername: string): number => {
  return calculateTrustScore(workerUsername, 'worker').score;
};

// --- 4. EMPLOYER TRUST SCORE (Legacy) ---
export const calculateEmployerTrust = (employerUsername: string): number => {
  return calculateTrustScore(employerUsername, 'employer').score;
};

// --- 5. TRUST SCORE (NEW LOGIC) ---
export const calculateTrustScore = (username: string, role: UserRole) => {
  const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
  const reviews = getLocalData<WorkerReview>(REVIEW_STORAGE_KEY);
  const disputes = getLocalData<Dispute>(DISPUTE_STORAGE_KEY);

  let score = 50; // Base score
  const breakdown: string[] = ['Base Score: 50'];

  if (role === 'employer') {
    // 1. Completed Jobs (+2 per job, max 20)
    const myJobs = jobs.filter(j => j.employerUsername === username);
    const completedCount = myJobs.filter(j => j.status === 'completed').length;
    const completedPoints = Math.min(completedCount * 2, 20);
    score += completedPoints;
    if (completedPoints > 0) breakdown.push(`Completed Jobs: +${completedPoints}`);

    // 2. Ratings (Avg - 3) * 8
    const myReviews = reviews.filter(r => r.employerUsername === username); // Reviews GIVEN by workers? Or ABOUT employer? 
    // Usually reviews table stores "workerReview" (review OF worker). 
    // We need reviews OF employer if they exist. 
    // Assuming current system stores reviews OF workers. 
    // If we don't have reviews OF employers, we use "Reviews Given" as a proxy for engagement or assume neutral.
    // Let's use "Response Rate" or similar if no direct ratings.
    // However, let's assume we might have added employer ratings or use a proxy.
    // For now, let's use "Avg Rating Given" as a proxy for "Good Client" (not perfect).
    // OR: Check if we have a field for rating employers. The types say `WorkerReview` has `workerUsername` and `employerUsername`.
    // It implies Employer reviews Worker.
    // Let's use "Disputes against" as primary negative.
    
    // Proxy: Completion Rate of posted jobs
    const postedCount = myJobs.length;
    const completionRate = postedCount > 0 ? completedCount / postedCount : 0;
    const reliabilityPoints = Math.round(completionRate * 10); // Max 10
    score += reliabilityPoints;
    if (reliabilityPoints > 0) breakdown.push(`Reliability: +${reliabilityPoints}`);

    // 3. Disputes (-10 per dispute, max 30)
    const myDisputes = disputes.filter(d => d.againstUser === username);
    const disputePenalty = Math.min(myDisputes.length * 10, 30);
    score -= disputePenalty;
    if (disputePenalty > 0) breakdown.push(`Disputes: -${disputePenalty}`);

  } else {
    // WORKER
    // 1. Completed Jobs (+2 per job, max 30)
    const completedCount = jobs.filter(j => j.assignedWorkerUsername === username && j.status === 'completed').length;
    const completedPoints = Math.min(completedCount * 2, 30);
    score += completedPoints;
    if (completedPoints > 0) breakdown.push(`Completed Jobs: +${completedPoints}`);

    // 2. Ratings (Avg - 3) * 10
    const myReviews = reviews.filter(r => r.workerUsername === username);
    if (myReviews.length > 0) {
      const avg = myReviews.reduce((sum, r) => sum + r.rating, 0) / myReviews.length;
      const ratingPoints = Math.round((avg - 3) * 10);
      score += ratingPoints;
      breakdown.push(`Ratings (${avg.toFixed(1)}): ${ratingPoints > 0 ? '+' : ''}${ratingPoints}`);
    }

    // 3. Disputes (-15 per dispute, max 45)
    const myDisputes = disputes.filter(d => d.againstUser === username);
    const disputePenalty = Math.min(myDisputes.length * 15, 45);
    score -= disputePenalty;
    if (disputePenalty > 0) breakdown.push(`Disputes: -${disputePenalty}`);
  }

  // Clamp
  score = Math.max(0, Math.min(100, Math.round(score)));

  return { score, breakdown };
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
    hasRegions: false,
    hasActivity: false
  };

  let score = 0;

  if (profile && profile.skills && profile.skills.length > 0) {
    checks.hasSkills = true;
    score += 25;
  }

  if (profile && profile.bio && profile.bio.trim().length >= 40) {
    checks.hasBio = true;
    score += 25;
  }

  if ((profile && profile.regions && profile.regions.length > 0) || (onboarding && onboarding.city)) {
    checks.hasRegions = true;
    score += 25;
  }

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

// --- EMPLOYER PROFILE HELPERS ---
export const getEmployerProfile = (username: string): EmployerProfileData | undefined => {
  const profiles = getLocalData<EmployerProfileData>(EMPLOYER_PROFILE_KEY);
  return profiles.find(p => p.username === username);
};

export const saveEmployerProfile = (data: EmployerProfileData) => {
  const profiles = getLocalData<EmployerProfileData>(EMPLOYER_PROFILE_KEY);
  const filtered = profiles.filter(p => p.username !== data.username);
  filtered.push(data);
  localStorage.setItem(EMPLOYER_PROFILE_KEY, JSON.stringify(filtered));
};

// --- 11. GAMIFICATION (BADGES) ---
export const getBadges = (username: string, role: UserRole): Badge[] => {
  const badges: Badge[] = [];
  
  if (role === 'worker') {
    const { score: quality } = calculateTrustScore(username, 'worker');
    const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
    const completed = jobs.filter(j => j.assignedWorkerUsername === username && j.status === 'completed').length;

    if (quality >= 80 && completed >= 5) {
      badges.push({ id: 'top-rated', label: 'Top Rated', description: 'High trust score & many jobs', icon: 'Award' });
    }
    if (quality >= 60 && quality < 80 && completed >= 2) {
      badges.push({ id: 'reliable-pro', label: 'Reliable', description: 'Consistent performance', icon: 'ShieldCheck' });
    }
    if (completed === 0) {
      badges.push({ id: 'newcomer', label: 'Newcomer', description: 'Welcome to the platform', icon: 'Sprout' });
    }
  } else if (role === 'employer') {
    const { score: trust } = calculateTrustScore(username, 'employer');
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
  
  let candidates = jobs.filter(j => 
    j.status === 'open' && 
    (!j.applications || !j.applications.some(a => a.workerUsername === workerUsername))
  );

  if (!profile) return candidates.slice(0, 5);

  const scored = candidates.map(job => {
    let score = 0;
    
    const hasSkill = profile.skills.some(s => 
      job.category.toLowerCase().includes(s.toLowerCase()) || 
      s.toLowerCase().includes(job.category.toLowerCase())
    );
    if (hasSkill) score += 50;
    
    if (profile.regions && profile.regions.length > 0) {
      const hasRegion = profile.regions.some(r => 
        job.address.toLowerCase().includes(r.toLowerCase())
      );
      if (hasRegion) score += 30;
    }

    if (job.budget > 100) score += 10;
    
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
    const { score: quality } = calculateTrustScore(w.username, 'worker');
    
    if (profile) {
      const hasSkill = profile.skills.some(s => 
        job.category.toLowerCase().includes(s.toLowerCase()) || 
        s.toLowerCase().includes(job.category.toLowerCase())
      );
      if (hasSkill) {
        score += 40;
        reasons.push("Skills match category");
      }

      if (profile.regions && profile.regions.some(r => job.address.toLowerCase().includes(r.toLowerCase()))) {
        score += 30;
        reasons.push("In service region");
      }
    }

    score += (quality * 0.5);
    if (quality > 80) reasons.push("Top rated worker");

    const avail = getLocalData<WorkerAvailability>(AVAILABILITY_STORAGE_KEY).find(a => a.username === w.username);
    if (avail && avail.availableDays.length > 0) {
      score += 10;
      reasons.push("Available this week");
    }

    return { username: w.username, score, matchReason: reasons.join(', ') || 'General match' };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
};

export const getLowestBid = (job: JobPost): number | null => {
  if (!job.applications || job.applications.length === 0) return null;
  return Math.min(...job.applications.map(a => a.offeredPrice));
};
