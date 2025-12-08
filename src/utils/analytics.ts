import { User, JobPost, WorkerReview, JobMessage, JobApplication, JobCategory, JobStageCounts, CategoryPerformance, UserRiskMetrics, Dispute } from '../types';

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

// --- 1. Funnel Analytics ---

export const computeJobStageCounts = (jobs: JobPost[]): JobStageCounts => {
  const posted = jobs.length;
  const withOffer = jobs.filter(j => j.applications && j.applications.length > 0).length;
  const accepted = jobs.filter(j => 
    j.status === 'processing' || 
    j.status === 'completed' || 
    (j.applications && j.applications.some(a => a.status === 'accepted'))
  ).length;
  const completed = jobs.filter(j => j.status === 'completed').length;

  return { posted, withOffer, accepted, completed };
};

export const getFunnelStats = (jobs: JobPost[]) => {
  const counts = computeJobStageCounts(jobs);
  return {
    ...counts,
    assigned: counts.accepted, // Alias for backward compatibility
    withOffers: counts.withOffer, // Alias
    conversion: {
      toOffers: counts.posted > 0 ? (counts.withOffer / counts.posted) * 100 : 0,
      toAssigned: counts.withOffer > 0 ? (counts.accepted / counts.withOffer) * 100 : 0,
      toCompleted: counts.accepted > 0 ? (counts.completed / counts.accepted) * 100 : 0,
      overall: counts.posted > 0 ? (counts.completed / counts.posted) * 100 : 0
    }
  };
};

// --- 2. Category Performance ---

export const computeCategoryPerformance = (jobs: JobPost[], reviews: WorkerReview[]): CategoryPerformance[] => {
  const stats: Record<string, CategoryPerformance> = {};

  jobs.forEach(job => {
    const cat = job.category;
    if (!stats[cat]) {
      stats[cat] = { category: cat, jobCount: 0, jobsWithOffer: 0, avgRating: 0 };
    }
    
    stats[cat].jobCount++;
    if (job.applications && job.applications.length > 0) {
      stats[cat].jobsWithOffer++;
    }
  });

  // Calculate averages
  Object.keys(stats).forEach(cat => {
    const catJobs = jobs.filter(j => j.category === cat);
    
    // Time to First Offer
    let totalTime = 0;
    let countTime = 0;
    catJobs.forEach(j => {
      if (j.applications && j.applications.length > 0) {
        const sorted = [...j.applications].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
        const first = new Date(sorted[0].createdAt).getTime();
        const posted = new Date(j.createdAt).getTime();
        totalTime += (first - posted);
        countTime++;
      }
    });
    if (countTime > 0) {
      stats[cat].avgFirstOfferMinutes = Math.round((totalTime / countTime) / 60000);
    }

    // Rating
    const catReviews = reviews.filter(r => {
      const job = jobs.find(j => j.id === r.jobId);
      return job && job.category === cat;
    });
    if (catReviews.length > 0) {
      const totalRating = catReviews.reduce((sum, r) => sum + r.rating, 0);
      stats[cat].avgRating = totalRating / catReviews.length;
    }
  });

  return Object.values(stats);
};

// --- 3. Risk Metrics ---

export const computeUserRiskMetrics = (users: User[], jobs: JobPost[], disputes: Dispute[], reviews: WorkerReview[]): UserRiskMetrics[] => {
  const now = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(now.getDate() - 30);

  return users.map(user => {
    const userDisputes = disputes.filter(d => 
      d.againstUser === user.username && 
      new Date(d.createdAt) >= thirtyDaysAgo
    );

    const cancellations = 0; 

    let completed = 0;
    let avgRating = 0;

    if (user.role === 'worker') {
      const myJobs = jobs.filter(j => j.assignedWorkerUsername === user.username && j.status === 'completed');
      completed = myJobs.length;
      const myReviews = reviews.filter(r => r.workerUsername === user.username);
      if (myReviews.length > 0) {
        avgRating = myReviews.reduce((sum, r) => sum + r.rating, 0) / myReviews.length;
      }
    } else {
      const myJobs = jobs.filter(j => j.employerUsername === user.username && j.status === 'completed');
      completed = myJobs.length;
    }

    let riskScore = 0;
    riskScore += (userDisputes.length * 20);
    
    if (avgRating > 0 && avgRating < 2) riskScore += 50;
    else if (avgRating > 0 && avgRating < 3) riskScore += 20;

    riskScore -= Math.floor(completed / 5) * 10;
    riskScore = Math.max(0, Math.min(100, riskScore));

    let riskLevel: 'low' | 'medium' | 'high' = 'low';
    if (riskScore >= 80) riskLevel = 'high';
    else if (riskScore >= 50) riskLevel = 'medium';

    return {
      userId: user.username,
      role: user.role as 'worker' | 'employer',
      disputesLast30d: userDisputes.length,
      cancellationsLast30d: cancellations,
      accountsFromSameIp: 1, 
      totalCompletedJobs: completed,
      avgRating,
      riskScore,
      riskLevel
    };
  });
};

// --- 4. Financial & Pricing Analytics (NEW) ---

export const getRevenueMetrics = (jobs: JobPost[]) => {
  const activeJobs = jobs.filter(j => j.status !== 'open'); // Count budget for active/completed
  const budgets = jobs.map(j => j.budget).filter(b => b > 0);
  
  const totalVolume = budgets.reduce((a, b) => a + b, 0);
  const avgBudget = budgets.length ? totalVolume / budgets.length : 0;
  const minBudget = budgets.length ? Math.min(...budgets) : 0;
  const maxBudget = budgets.length ? Math.max(...budgets) : 0;
  
  // Median
  const sortedBudgets = [...budgets].sort((a, b) => a - b);
  const mid = Math.floor(sortedBudgets.length / 2);
  const medianBudget = sortedBudgets.length ? (sortedBudgets.length % 2 !== 0 ? sortedBudgets[mid] : (sortedBudgets[mid - 1] + sortedBudgets[mid]) / 2) : 0;

  return { totalVolume, avgBudget, medianBudget, minBudget, maxBudget };
};

export const getJobsByStatus = (jobs: JobPost[]) => {
  const statusCounts: Record<string, number> = { open: 0, processing: 0, completed: 0 };
  jobs.forEach(j => {
    const s = j.status || 'open';
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  });
  return statusCounts;
};

export const getRevenueByCategory = (jobs: JobPost[]) => {
  const catStats: Record<string, { count: number, volume: number }> = {};
  jobs.forEach(j => {
    if (!catStats[j.category]) catStats[j.category] = { count: 0, volume: 0 };
    catStats[j.category].count++;
    catStats[j.category].volume += j.budget;
  });
  return Object.entries(catStats)
    .map(([category, stats]) => ({ category, ...stats }))
    .sort((a, b) => b.volume - a.volume);
};

export const getPricingAnalytics = (jobs: JobPost[]) => {
  const catStats: Record<string, { jobCount: number, totalBudget: number, totalAccepted: number, acceptedCount: number }> = {};
  
  jobs.forEach(j => {
    if (!catStats[j.category]) catStats[j.category] = { jobCount: 0, totalBudget: 0, totalAccepted: 0, acceptedCount: 0 };
    
    catStats[j.category].jobCount++;
    catStats[j.category].totalBudget += j.budget;
    
    const acceptedApp = j.applications?.find(a => a.status === 'accepted');
    if (acceptedApp) {
      catStats[j.category].totalAccepted += acceptedApp.offeredPrice;
      catStats[j.category].acceptedCount++;
    }
  });

  return Object.entries(catStats).map(([category, data]) => {
    const avgBudget = data.jobCount ? data.totalBudget / data.jobCount : 0;
    const avgAccepted = data.acceptedCount ? data.totalAccepted / data.acceptedCount : 0;
    const avgDeltaPercent = avgAccepted && avgBudget ? ((avgAccepted - avgBudget) / avgBudget) * 100 : 0;
    
    return {
      category,
      jobCount: data.jobCount,
      avgBudget,
      avgAccepted,
      avgDeltaPercent
    };
  }).sort((a, b) => b.jobCount - a.jobCount);
};

export const getTimeAnalytics = (jobs: JobPost[]) => {
  let totalTimeMs = 0;
  let count = 0;
  
  jobs.forEach(j => {
    if (j.applications && j.applications.length > 0) {
      const posted = new Date(j.createdAt).getTime();
      const earliest = Math.min(...j.applications.map(a => new Date(a.createdAt).getTime()));
      totalTimeMs += (earliest - posted);
      count++;
    }
  });
  
  return {
    avgTimeToFirstOfferHours: count ? (totalTimeMs / count) / (1000 * 60 * 60) : 0
  };
};

// --- Legacy Exports ---

export const getJobsByMonth = (jobs: JobPost[]) => {
  const monthsMap: { [key: string]: { name: string, posted: number, completed: number } } = {};
  
  jobs.forEach(job => {
    const date = new Date(job.createdAt);
    const sortKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
    const displayName = date.toLocaleString('default', { month: 'short', year: '2-digit' });
    
    if (!monthsMap[sortKey]) monthsMap[sortKey] = { name: displayName, posted: 0, completed: 0 };
    monthsMap[sortKey].posted++;
    
    if (job.status === 'completed' && job.completedAt) {
      const cDate = new Date(job.completedAt);
      const cSortKey = `${cDate.getFullYear()}-${String(cDate.getMonth() + 1).padStart(2, '0')}`;
      // Note: Completed might fall in a different month, but for simplicity in this view we track based on creation month or just increment the bucket
      // Better approach: Iterate months and count independently. 
      // For now, let's just count completed jobs that were *created* in this month to show conversion speed, OR
      // we can bucket by completion date. Let's stick to creation date for "Cohort" analysis.
      if (job.status === 'completed') monthsMap[sortKey].completed++;
    }
  });
  
  return Object.keys(monthsMap).sort().map(key => monthsMap[key]);
};

export const getOffersByCategory = (jobs: JobPost[]) => {
  const stats: any = {};
  jobs.forEach(job => {
    const cat = job.category;
    if (!stats[cat]) stats[cat] = { jobs: 0, offers: 0, totalPrice: 0 };
    stats[cat].jobs += 1;
    const apps = job.applications || [];
    stats[cat].offers += apps.length;
    apps.forEach(app => stats[cat].totalPrice += app.offeredPrice);
  });
  return Object.entries(stats).map(([category, data]: any) => ({
    category,
    jobCount: data.jobs,
    offerCount: data.offers,
    avgPrice: data.offers > 0 ? Math.round(data.totalPrice / data.offers) : 0
  }));
};

export const getRatingsDistribution = (reviews: WorkerReview[]) => {
  const dist: any = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
  reviews.forEach(r => {
    const rating = Math.round(r.rating);
    if (dist[rating] !== undefined) dist[rating]++;
  });
  return dist;
};

export const getWorkerLeaderboard = (users: User[], jobs: JobPost[], reviews: WorkerReview[]) => {
  return users.filter(u => u.role === 'worker').map(w => {
    const myJobs = jobs.filter(j => j.assignedWorkerUsername === w.username);
    const completed = myJobs.filter(j => j.status === 'completed').length;
    const myReviews = reviews.filter(r => r.workerUsername === w.username);
    const avgRating = myReviews.length ? myReviews.reduce((a,b) => a + b.rating, 0) / myReviews.length : 0;
    
    // Simplified score
    const score = Math.min(100, (completed * 5) + (avgRating * 10));

    return {
      username: w.username,
      score,
      avgRating,
      completed,
      acceptanceRate: 0, // Requires offer tracking
      offersSubmitted: 0,
      offersAccepted: 0,
      offersRejected: 0,
      reviewCount: myReviews.length
    };
  }).sort((a, b) => b.score - a.score);
};

export const getEmployerLeaderboard = (users: User[], jobs: JobPost[], reviews: WorkerReview[]) => {
  return users.filter(u => u.role === 'employer').map(e => {
    const myJobs = jobs.filter(j => j.employerUsername === e.username);
    const posted = myJobs.length;
    const completed = myJobs.filter(j => j.status === 'completed').length;
    const offersReceived = myJobs.reduce((acc, j) => acc + (j.applications?.length || 0), 0);
    
    const score = Math.min(100, (posted * 2) + (completed * 5));

    return {
      username: e.username,
      score,
      posted,
      completed,
      offersReceived,
      responseRate: 0
    };
  }).sort((a, b) => b.score - a.score);
};
