import { 
  User, JobPost, WorkerReview, JobApplication, WorkerProfileData, EmployerProfileData,
  Badge, BadgeType, ActivityLog, Dispute, WorkerAvailability,
  JOB_STORAGE_KEY, REVIEW_STORAGE_KEY, WORKER_PROFILE_KEY, EMPLOYER_PROFILE_KEY,
  ACTIVITY_LOG_KEY, DISPUTE_STORAGE_KEY, AVAILABILITY_STORAGE_KEY, 
  USERS_STORAGE_KEY, WORKER_ONBOARDING_KEY, WorkerOnboardingData,
  UserRole,
  SAVED_SEARCHES_KEY, SavedSearch
} from '../types';

const getLocalData = <T>(key: string): T[] => {
  const str = localStorage.getItem(key);
  return str ? JSON.parse(str) : [];
};

// --- ACTIVITY LOGGING ---
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

// --- TRUST SCORE ---
export const calculateTrustScore = (username: string, role: UserRole) => {
  const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
  const reviews = getLocalData<WorkerReview>(REVIEW_STORAGE_KEY);
  const disputes = getLocalData<Dispute>(DISPUTE_STORAGE_KEY);

  let score = 50; // Base score
  const breakdown: string[] = ['Base Score: 50'];

  if (role === 'employer') {
    const myJobs = jobs.filter(j => j.employerUsername === username);
    const completedCount = myJobs.filter(j => j.status === 'completed').length;
    const completedPoints = Math.min(completedCount * 2, 20);
    score += completedPoints;
    if (completedPoints > 0) breakdown.push(`Completed Jobs: +${completedPoints}`);

    const postedCount = myJobs.length;
    const completionRate = postedCount > 0 ? completedCount / postedCount : 0;
    const reliabilityPoints = Math.round(completionRate * 10); 
    score += reliabilityPoints;
    if (reliabilityPoints > 0) breakdown.push(`Reliability: +${reliabilityPoints}`);

    const myDisputes = disputes.filter(d => d.againstUser === username);
    const disputePenalty = Math.min(myDisputes.length * 10, 30);
    score -= disputePenalty;
    if (disputePenalty > 0) breakdown.push(`Disputes: -${disputePenalty}`);

  } else {
    const completedCount = jobs.filter(j => j.assignedWorkerUsername === username && j.status === 'completed').length;
    const completedPoints = Math.min(completedCount * 2, 30);
    score += completedPoints;
    if (completedPoints > 0) breakdown.push(`Completed Jobs: +${completedPoints}`);

    const myReviews = reviews.filter(r => r.workerUsername === username);
    if (myReviews.length > 0) {
      const avg = myReviews.reduce((sum, r) => sum + r.rating, 0) / myReviews.length;
      const ratingPoints = Math.round((avg - 3) * 10);
      score += ratingPoints;
      breakdown.push(`Ratings (${avg.toFixed(1)}): ${ratingPoints > 0 ? '+' : ''}${ratingPoints}`);
    }

    const myDisputes = disputes.filter(d => d.againstUser === username);
    const disputePenalty = Math.min(myDisputes.length * 15, 45);
    score -= disputePenalty;
    if (disputePenalty > 0) breakdown.push(`Disputes: -${disputePenalty}`);
  }

  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, breakdown };
};

// --- PROFILE COMPLETION & STRENGTH ---
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

// --- MATCHING ALGORITHM ---
export const getWorkerMatchScore = (job: JobPost, workerUsername: string): number => {
  const profiles = getLocalData<WorkerProfileData>(WORKER_PROFILE_KEY);
  const profile = profiles.find(p => p.username === workerUsername);
  const { score: trustScore } = calculateTrustScore(workerUsername, 'worker');
  const disputes = getLocalData<Dispute>(DISPUTE_STORAGE_KEY);
  const hasDisputes = disputes.some(d => d.againstUser === workerUsername && d.status === 'open');

  let score = 0;

  if (!profile) return 10; // Base score for existing

  // 1. Skill Match (+40)
  const hasSkill = profile.skills.some(s => 
    job.category.toLowerCase().includes(s.toLowerCase()) || 
    s.toLowerCase().includes(job.category.toLowerCase())
  );
  if (hasSkill) score += 40;

  // 2. Region Match (+25)
  if (profile.regions && profile.regions.length > 0) {
    const hasRegion = profile.regions.some(r => 
      job.address.toLowerCase().includes(r.toLowerCase())
    );
    if (hasRegion) score += 25;
  }

  // 3. Availability (+15)
  if (profile.availabilityStatus === 'available') score += 15;

  // 4. Trust Score (+10 scaled)
  score += Math.min(trustScore / 10, 10);

  // 5. Penalties
  if (hasDisputes) score -= 20;

  return Math.max(0, Math.min(100, Math.round(score)));
};

// --- RECOMMENDATIONS ---
export const getRecommendedJobs = (workerUsername: string): JobPost[] => {
  const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
  const profiles = getLocalData<WorkerProfileData>(WORKER_PROFILE_KEY);
  const profile = profiles.find(p => p.username === workerUsername);
  
  // Filter out hidden jobs
  const hiddenIds = profile?.hiddenJobIds || [];

  let candidates = jobs.filter(j => 
    j.status === 'open' && 
    !hiddenIds.includes(j.id) &&
    (!j.applications || !j.applications.some(a => a.workerUsername === workerUsername))
  );

  const scored = candidates.map(job => ({
    job,
    score: getWorkerMatchScore(job, workerUsername)
  }));

  return scored
    .filter(s => s.score > 20) // Minimum relevance threshold
    .sort((a, b) => b.score - a.score)
    .map(s => s.job)
    .slice(0, 10);
};

export const getRecommendedWorkers = (jobId: string): { username: string, score: number, matchReason: string }[] => {
  const jobs = getLocalData<JobPost>(JOB_STORAGE_KEY);
  const users = getLocalData<User>(USERS_STORAGE_KEY);
  
  const job = jobs.find(j => j.id === jobId);
  if (!job) return [];

  const workers = users.filter(u => u.role === 'worker');

  const scored = workers.map(w => {
    const score = getWorkerMatchScore(job, w.username);
    let reasons: string[] = [];
    
    if (score > 70) reasons.push("Strong skill & location match");
    else if (score > 50) reasons.push("Good match");
    else reasons.push("Available");

    return { username: w.username, score, matchReason: reasons.join(', ') };
  });

  return scored.sort((a, b) => b.score - a.score).slice(0, 5);
};

// --- HELPERS ---
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

export const getBadges = (username: string, role: UserRole): Badge[] => {
  const badges: Badge[] = [];
  const { score } = calculateTrustScore(username, role);
  
  if (score >= 80) badges.push({ id: 'top-rated', label: 'Top Rated', description: 'High trust score', icon: 'Award' });
  
  return badges;
};

export const getLowestBid = (job: JobPost): number | null => {
  if (!job.applications || job.applications.length === 0) return null;
  return Math.min(...job.applications.map(a => a.offeredPrice));
};

export const calculateWorkerQuality = (username: string) => calculateTrustScore(username, 'worker').score;
export const calculateEmployerTrust = (username: string) => calculateTrustScore(username, 'employer').score;
