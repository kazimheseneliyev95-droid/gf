import { User, JobPost, WorkerReview, JobMessage, JobApplication, JobCategory } from '../types';

// --- Types ---

export interface AnalyticsData {
  users: User[];
  jobs: JobPost[];
  reviews: WorkerReview[];
  messages: JobMessage[];
}

export interface DateRange {
  start: Date;
  end: Date;
}

// --- Helpers ---

export const filterByDate = <T extends { createdAt: string }>(data: T[], range: '7d' | '30d' | '90d' | 'all'): T[] => {
  if (range === 'all') return data;
  
  const now = new Date();
  const past = new Date();
  
  if (range === '7d') past.setDate(now.getDate() - 7);
  if (range === '30d') past.setDate(now.getDate() - 30);
  if (range === '90d') past.setDate(now.getDate() - 90);
  
  return data.filter(item => new Date(item.createdAt) >= past);
};

// --- Funnel Analytics ---

export const getFunnelStats = (jobs: JobPost[]) => {
  const posted = jobs.length;
  const withOffers = jobs.filter(j => j.applications && j.applications.length > 0).length;
  // Assigned: Has an accepted offer or status is processing/completed
  const assigned = jobs.filter(j => 
    j.status === 'processing' || 
    j.status === 'completed' || 
    (j.applications && j.applications.some(a => a.status === 'accepted'))
  ).length;
  const completed = jobs.filter(j => j.status === 'completed').length;

  return {
    posted,
    withOffers,
    assigned,
    completed,
    conversion: {
      toOffers: posted > 0 ? (withOffers / posted) * 100 : 0,
      toAssigned: withOffers > 0 ? (assigned / withOffers) * 100 : 0,
      toCompleted: assigned > 0 ? (completed / assigned) * 100 : 0,
      overall: posted > 0 ? (completed / posted) * 100 : 0
    }
  };
};

// --- Pricing Analytics ---

export const getPricingAnalytics = (jobs: JobPost[]) => {
  // Filter only jobs with accepted offers for pricing analysis
  const jobsWithPrice = jobs.filter(j => 
    j.applications && j.applications.some(a => a.status === 'accepted')
  );

  const categoryStats: { [key: string]: { 
    count: number, 
    totalBudget: number, 
    totalAccepted: number,
    deltas: number[] 
  } } = {};

  jobsWithPrice.forEach(job => {
    const acceptedApp = job.applications.find(a => a.status === 'accepted');
    if (!acceptedApp) return;

    const cat = job.category;
    if (!categoryStats[cat]) categoryStats[cat] = { count: 0, totalBudget: 0, totalAccepted: 0, deltas: [] };

    categoryStats[cat].count++;
    categoryStats[cat].totalBudget += job.budget;
    categoryStats[cat].totalAccepted += acceptedApp.offeredPrice;
    
    // Delta: (Accepted - Budget) / Budget
    // Fix: Handle budget = 0 to avoid Infinity
    const delta = job.budget > 0 
      ? ((acceptedApp.offeredPrice - job.budget) / job.budget) * 100 
      : 0;
      
    categoryStats[cat].deltas.push(delta);
  });

  return Object.entries(categoryStats).map(([category, data]) => ({
    category,
    avgBudget: data.totalBudget / data.count,
    avgAccepted: data.totalAccepted / data.count,
    avgDeltaPercent: data.deltas.reduce((a, b) => a + b, 0) / data.count,
    jobCount: data.count
  }));
};

// --- Time Analytics ---

export const getTimeAnalytics = (jobs: JobPost[]) => {
  let totalTimeToFirstOffer = 0;
  let jobsWithOffersCount = 0;

  jobs.forEach(job => {
    const jobCreated = new Date(job.createdAt).getTime();

    // Time to First Offer
    if (job.applications && job.applications.length > 0) {
      // Sort applications by date to find the first one
      const sortedApps = [...job.applications].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
      const firstOfferTime = new Date(sortedApps[0].createdAt).getTime();
      totalTimeToFirstOffer += (firstOfferTime - jobCreated);
      jobsWithOffersCount++;
    }
  });

  // Convert ms to hours
  const avgTimeToFirstOfferHours = jobsWithOffersCount > 0 
    ? (totalTimeToFirstOffer / jobsWithOffersCount) / (1000 * 60 * 60) 
    : 0;

  return {
    avgTimeToFirstOfferHours
  };
};

// --- Score Calculations ---

export const calculateReliabilityScore = (
  workerUsername: string, 
  jobs: JobPost[], 
  reviews: WorkerReview[]
): number => {
  // 1. Completion Rate (Completed / Accepted)
  const acceptedJobs = jobs.filter(j => 
    j.applications && j.applications.some(a => a.workerUsername === workerUsername && a.status === 'accepted')
  );
  const completedJobs = acceptedJobs.filter(j => j.status === 'completed');
  
  const completionRatio = acceptedJobs.length > 0 ? completedJobs.length / acceptedJobs.length : 0;

  // 2. Average Rating
  const workerReviews = reviews.filter(r => r.workerUsername === workerUsername);
  const avgRating = workerReviews.length > 0 
    ? workerReviews.reduce((sum, r) => sum + r.rating, 0) / workerReviews.length 
    : 0;
  
  // 3. Cancelled/Rejected Ratio (Proxy for reliability)
  let totalApps = 0;
  let rejectedApps = 0;
  
  jobs.forEach(j => {
    if (!j.applications) return;
    const app = j.applications.find(a => a.workerUsername === workerUsername);
    if (app) {
      totalApps++;
      if (app.status === 'rejected') rejectedApps++;
    }
  });

  const negativeRatio = totalApps > 0 ? rejectedApps / totalApps : 0;

  // Formula: (Completion * 0.5) + (Rating/5 * 0.3) + ((1 - Negative) * 0.2)
  const score = (
    (completionRatio * 0.5) + 
    ((avgRating / 5) * 0.3) + 
    ((1 - negativeRatio) * 0.2)
  ) * 100;

  return Math.round(score) || 0;
};

export const calculateTrustScore = (
  employerUsername: string,
  jobs: JobPost[],
  reviews: WorkerReview[]
): number => {
  // 1. Job Completion Rate
  const postedJobs = jobs.filter(j => j.employerUsername === employerUsername);
  const completedJobs = postedJobs.filter(j => j.status === 'completed');
  const completionRate = postedJobs.length > 0 ? completedJobs.length / postedJobs.length : 0;

  // 2. Review Positivity (Avg rating they GIVE)
  const givenReviews = reviews.filter(r => r.employerUsername === employerUsername);
  const avgGivenRating = givenReviews.length > 0
    ? givenReviews.reduce((sum, r) => sum + r.rating, 0) / givenReviews.length
    : 0;

  // 3. Response Rate (Jobs with at least one accepted/rejected offer vs total jobs with offers)
  const jobsWithOffers = postedJobs.filter(j => j.applications && j.applications.length > 0);
  const respondedJobs = jobsWithOffers.filter(j => 
    j.applications && j.applications.some(a => a.status === 'accepted' || a.status === 'rejected')
  );
  const responseRate = jobsWithOffers.length > 0 ? respondedJobs.length / jobsWithOffers.length : 0;

  // Formula: (Completion * 0.4) + (Rating/5 * 0.3) + (ResponseRate * 0.3)
  const score = (
    (completionRate * 0.4) +
    ((avgGivenRating / 5) * 0.3) +
    (responseRate * 0.3)
  ) * 100;

  return Math.round(score) || 0;
};

// --- Aggregations ---

export const getJobsByMonth = (jobs: JobPost[]) => {
  // Use a map with a sortable key (YYYY-MM) to ensure correct order
  const monthsMap: { [key: string]: { name: string, count: number } } = {};
  
  jobs.forEach(job => {
    const date = new Date(job.createdAt);
    // Key for sorting: 2023-01
    const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    // Display name: Jan 23
    const displayName = date.toLocaleString('default', { month: 'short', year: '2-digit' });
    
    if (!monthsMap[sortKey]) {
      monthsMap[sortKey] = { name: displayName, count: 0 };
    }
    monthsMap[sortKey].count++;
  });

  // Sort by key (date) and return values
  return Object.keys(monthsMap).sort().map(key => monthsMap[key]);
};

export const getOffersByCategory = (jobs: JobPost[]) => {
  const stats: { [key: string]: { jobs: number, offers: number, totalPrice: number } } = {};

  jobs.forEach(job => {
    const cat = job.category;
    if (!stats[cat]) stats[cat] = { jobs: 0, offers: 0, totalPrice: 0 };
    
    stats[cat].jobs += 1;
    const apps = job.applications || [];
    stats[cat].offers += apps.length;
    
    apps.forEach(app => {
      stats[cat].totalPrice += app.offeredPrice;
    });
  });

  return Object.entries(stats).map(([category, data]) => ({
    category,
    jobCount: data.jobs,
    offerCount: data.offers,
    avgPrice: data.offers > 0 ? Math.round(data.totalPrice / data.offers) : 0
  }));
};

export const getRatingsDistribution = (reviews: WorkerReview[]) => {
  const dist = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    const rating = Math.round(r.rating) as 1|2|3|4|5;
    if (dist[rating] !== undefined) dist[rating]++;
  });
  return dist;
};

export const getWorkerLeaderboard = (users: User[], jobs: JobPost[], reviews: WorkerReview[]) => {
  const workers = users.filter(u => u.role === 'worker');
  
  return workers.map(w => {
    const username = w.username;
    const workerReviews = reviews.filter(r => r.workerUsername === username);
    const avgRating = workerReviews.length > 0 
      ? workerReviews.reduce((sum, r) => sum + r.rating, 0) / workerReviews.length 
      : 0;
    
    let completed = 0;
    let offersSubmitted = 0;
    let offersAccepted = 0;
    let offersRejected = 0;
    
    jobs.forEach(j => {
      const apps = j.applications || [];
      const app = apps.find(a => a.workerUsername === username);
      if (app) {
        offersSubmitted++;
        if (app.status === 'accepted') offersAccepted++;
        if (app.status === 'rejected') offersRejected++;
      }
      if (j.assignedWorkerUsername === username && j.status === 'completed') completed++;
    });

    const acceptanceRate = offersSubmitted > 0 ? (offersAccepted / offersSubmitted) * 100 : 0;

    return {
      username,
      avgRating,
      completed,
      offersSubmitted,
      offersAccepted,
      offersRejected,
      acceptanceRate,
      reviewCount: workerReviews.length,
      score: calculateReliabilityScore(username, jobs, reviews)
    };
  }).sort((a, b) => b.score - a.score);
};

export const getEmployerLeaderboard = (users: User[], jobs: JobPost[], reviews: WorkerReview[]) => {
  const employers = users.filter(u => u.role === 'employer');

  return employers.map(e => {
    const username = e.username;
    const posted = jobs.filter(j => j.employerUsername === username);
    const completed = posted.filter(j => j.status === 'completed');
    
    let offersReceived = 0;
    let offersResponded = 0; // Accepted or Rejected

    posted.forEach(j => {
      const apps = j.applications || [];
      offersReceived += apps.length;
      offersResponded += apps.filter(a => a.status === 'accepted' || a.status === 'rejected').length;
    });

    const responseRate = offersReceived > 0 ? (offersResponded / offersReceived) * 100 : 0;

    return {
      username,
      posted: posted.length,
      completed: completed.length,
      offersReceived,
      responseRate,
      score: calculateTrustScore(username, jobs, reviews)
    };
  }).sort((a, b) => b.score - a.score);
};
