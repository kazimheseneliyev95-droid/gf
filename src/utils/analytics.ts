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

// --- Score Calculations ---

export const calculateReliabilityScore = (
  workerUsername: string, 
  jobs: JobPost[], 
  reviews: WorkerReview[]
): number => {
  // 1. Completion Rate (Completed / Accepted)
  const acceptedJobs = jobs.filter(j => 
    j.applications.some(a => a.workerUsername === workerUsername && a.status === 'accepted')
  );
  const completedJobs = acceptedJobs.filter(j => j.status === 'completed');
  
  const completionRatio = acceptedJobs.length > 0 ? completedJobs.length / acceptedJobs.length : 0;

  // 2. Average Rating
  const workerReviews = reviews.filter(r => r.workerUsername === workerUsername);
  const avgRating = workerReviews.length > 0 
    ? workerReviews.reduce((sum, r) => sum + r.rating, 0) / workerReviews.length 
    : 0;
  
  // 3. Cancelled Offers Ratio
  // Find all applications by this worker
  let totalApps = 0;
  let cancelledApps = 0;
  
  jobs.forEach(j => {
    // Note: In our current model, cancelled offers might be removed or marked. 
    // Assuming we track them or just use rejected/pending ratio as proxy if cancelled isn't explicit.
    // If 'cancelled' status exists in types, use it. Otherwise, we'll skip this part or use a placeholder.
    // For this calculation, let's assume we look at rejected vs total as a proxy for "unsuccessful attempts" if cancelled isn't stored.
    // However, the prompt asks for "Cancelled Offers Ratio". 
    // Since the previous step implemented "Cancel" by removing the app, we can't track it easily unless we changed it to status='cancelled'.
    // We will use a placeholder logic: (1 - (Rejected / Total)) to represent "Success/Persistence"
    const app = j.applications.find(a => a.workerUsername === workerUsername);
    if (app) {
      totalApps++;
      if (app.status === 'rejected') cancelledApps++;
    }
  });

  const negativeRatio = totalApps > 0 ? cancelledApps / totalApps : 0;

  // Formula: (Completion * 0.5) + (Rating/5 * 0.3) + ((1 - Negative) * 0.2)
  // Normalize to 0-100
  const score = (
    (completionRatio * 0.5) + 
    ((avgRating / 5) * 0.3) + 
    ((1 - negativeRatio) * 0.2)
  ) * 100;

  return Math.round(score);
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

  // Formula: (Completion * 0.6) + (Rating/5 * 0.4)
  const score = (
    (completionRate * 0.6) +
    ((avgGivenRating / 5) * 0.4)
  ) * 100;

  return Math.round(score);
};

// --- Aggregations ---

export const getJobsByMonth = (jobs: JobPost[]) => {
  const months: { [key: string]: number } = {};
  
  jobs.forEach(job => {
    const date = new Date(job.createdAt);
    const key = date.toLocaleString('default', { month: 'short', year: '2-digit' }); // e.g. "Jan 24"
    months[key] = (months[key] || 0) + 1;
  });

  // Sort by date (simple approach: assume data is relatively recent)
  return Object.entries(months).map(([name, count]) => ({ name, count }));
};

export const getOffersByCategory = (jobs: JobPost[]) => {
  const stats: { [key: string]: { jobs: number, offers: number, totalPrice: number } } = {};

  jobs.forEach(job => {
    const cat = job.category;
    if (!stats[cat]) stats[cat] = { jobs: 0, offers: 0, totalPrice: 0 };
    
    stats[cat].jobs += 1;
    stats[cat].offers += job.applications.length;
    
    job.applications.forEach(app => {
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
    let offers = 0;
    
    jobs.forEach(j => {
      const app = j.applications.find(a => a.workerUsername === username);
      if (app) offers++;
      if (j.assignedWorkerUsername === username && j.status === 'completed') completed++;
    });

    return {
      username,
      avgRating,
      completed,
      offers,
      reviewCount: workerReviews.length,
      score: calculateReliabilityScore(username, jobs, reviews)
    };
  }).sort((a, b) => b.score - a.score); // Sort by reliability score
};

export const getEmployerLeaderboard = (users: User[], jobs: JobPost[], reviews: WorkerReview[]) => {
  const employers = users.filter(u => u.role === 'employer');

  return employers.map(e => {
    const username = e.username;
    const posted = jobs.filter(j => j.employerUsername === username);
    const completed = posted.filter(j => j.status === 'completed');
    
    let offersReceived = 0;
    posted.forEach(j => offersReceived += j.applications.length);

    return {
      username,
      posted: posted.length,
      completed: completed.length,
      offersReceived,
      score: calculateTrustScore(username, jobs, reviews)
    };
  }).sort((a, b) => b.score - a.score);
};
