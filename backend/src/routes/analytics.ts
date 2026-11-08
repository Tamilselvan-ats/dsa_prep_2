import { Router, Request, Response } from 'express';
export const analyticsRouter = Router();

// ─── Types ───────────────────────────────────────────────────────────────────

interface TopicMastery {
  masteryScore: number;
  practiceScore: number;
  lastReviewed: string;
  reviewCount: number;
  nextReviewDate?: string;
}

interface ProgressSnapshot {
  userId: string;
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  rank: string;
  questionsAttempted: number;
  questionsCorrect: number;
  studyMinutes: number;
  studyDays: Record<string, number>;
  topicMastery: Record<string, TopicMastery>;
  achievements: string[];
}

// In-memory analytics events log
interface AnalyticsEvent {
  userId: string;
  event: string;
  topic?: string;
  score?: number;
  duration?: number;
  timestamp: string;
  metadata?: Record<string, any>;
}

const analyticsEvents: AnalyticsEvent[] = [];

// ─── CT Score Prediction Formula ─────────────────────────────────────────────

function predictCTScore(progress: ProgressSnapshot): {
  predicted: number;
  maxScore: number;
  grade: string;
  breakdown: Record<string, number>;
  recommendation: string;
} {
  const topicMasteries = Object.values(progress.topicMastery);
  const avgMastery = topicMasteries.length > 0
    ? topicMasteries.reduce((s, t) => s + t.masteryScore, 0) / topicMasteries.length
    : 0;

  const accuracy = progress.questionsAttempted > 0
    ? (progress.questionsCorrect / progress.questionsAttempted) * 100 : 0;

  const masteredCount = topicMasteries.filter(t => t.masteryScore >= 80).length;
  const consistencyScore = Math.min(100, (progress.streak / 30) * 100);
  const studyDepth = Math.min(100, (progress.studyMinutes / 300) * 100); // 5h = full marks

  // Weighted formula: accuracy 30% + mastery breadth 25% + mastery depth 25% + consistency 20%
  const predictedPercent = Math.round(
    (accuracy * 0.30) +
    ((masteredCount / Math.max(topicMasteries.length, 1)) * 100 * 0.25) +
    (avgMastery * 0.25) +
    (consistencyScore * 0.20)
  );

  const maxScore = 50;
  const predicted = Math.min(maxScore, Math.round((predictedPercent / 100) * maxScore));

  const grade = predicted >= 45 ? 'O' : predicted >= 40 ? 'A+' : predicted >= 35 ? 'A' :
    predicted >= 30 ? 'B+' : predicted >= 25 ? 'B' : predicted >= 20 ? 'C' : 'F';

  const recommendation = predicted >= 40
    ? 'Excellent prep! Maintain your practice consistency.'
    : predicted >= 30
      ? 'On track. Focus on weaker topics and practice more questions.'
      : predicted >= 20
        ? 'Needs improvement. Increase daily study time and attempt more MCQs.'
        : 'Critical: Start revising all topics immediately using the visualizers.';

  return {
    predicted,
    maxScore,
    grade,
    breakdown: {
      accuracy: Math.round(accuracy),
      avgMastery: Math.round(avgMastery),
      masteredTopics: masteredCount,
      consistencyScore: Math.round(consistencyScore),
      studyDepth: Math.round(studyDepth),
    },
    recommendation,
  };
}

// ─── Topics Due for Revision (SM-2 Logic) ────────────────────────────────────

function getTopicsDueForRevision(topicMastery: Record<string, TopicMastery>): {
  topicId: string;
  masteryScore: number;
  daysOverdue: number;
  priority: 'high' | 'medium' | 'low';
}[] {
  const now = new Date();
  const due: { topicId: string; masteryScore: number; daysOverdue: number; priority: 'high' | 'medium' | 'low' }[] = [];

  for (const [topicId, mastery] of Object.entries(topicMastery)) {
    if (!mastery.nextReviewDate) continue;

    const nextReview = new Date(mastery.nextReviewDate);
    const daysOverdue = Math.floor((now.getTime() - nextReview.getTime()) / (1000 * 60 * 60 * 24));

    if (daysOverdue >= 0) {
      due.push({
        topicId,
        masteryScore: mastery.masteryScore,
        daysOverdue,
        priority: daysOverdue > 7 ? 'high' : daysOverdue > 3 ? 'medium' : 'low',
      });
    }
  }

  return due.sort((a, b) => b.daysOverdue - a.daysOverdue);
}

// ─── Routes ──────────────────────────────────────────────────────────────────

// GET /api/analytics/:userId — full analytics for dashboard
analyticsRouter.get('/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;

    // In MVP, frontend sends progress snapshot via query or body
    // For full integration, fetch from progress store
    // Here we return a mock-enriched response that the frontend can populate
    const userEvents = analyticsEvents.filter(e => e.userId === userId);

    // Build event-based stats
    const topicEventMap: Record<string, { count: number; avgScore: number }> = {};
    for (const event of userEvents) {
      if (event.topic) {
        if (!topicEventMap[event.topic]) topicEventMap[event.topic] = { count: 0, avgScore: 0 };
        topicEventMap[event.topic].count++;
        if (event.score !== undefined) topicEventMap[event.topic].avgScore += event.score;
      }
    }

    const topicStats = Object.entries(topicEventMap).map(([topic, data]) => ({
      topic,
      sessions: data.count,
      avgScore: data.count > 0 ? Math.round(data.avgScore / data.count) : 0,
    }));

    return res.json({
      success: true,
      userId,
      stats: {
        totalEvents: userEvents.length,
        topicStats,
      },
      message: 'Analytics loaded. Send progress snapshot to /api/analytics/:userId/predict for CT prediction.',
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch analytics', message: err.message });
  }
});

// POST /api/analytics/:userId/predict — CT score prediction with progress snapshot
analyticsRouter.post('/:userId/predict', async (req: Request, res: Response) => {
  try {
    const { progress } = req.body as { progress: ProgressSnapshot };

    if (!progress) {
      return res.status(400).json({ error: 'Progress snapshot required in request body' });
    }

    const prediction = predictCTScore(progress);
    const dueForRevision = getTopicsDueForRevision(progress.topicMastery);

    // Build heatmap for last 12 weeks
    const heatmapData = Array.from({ length: 84 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 83 + i);
      const key = d.toISOString().split('T')[0];
      return {
        date: key,
        minutes: progress.studyDays[key] || 0,
        weekIndex: Math.floor(i / 7),
        dayIndex: i % 7,
      };
    });

    // Weekly trend
    const weeklyTrend = Array.from({ length: 7 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() - 6 + i);
      const key = d.toISOString().split('T')[0];
      return {
        day: d.toLocaleDateString('en', { weekday: 'short' }),
        date: key,
        minutes: progress.studyDays[key] || 0,
        xp: (progress.studyDays[key] || 0) * 3,
      };
    });

    // Topic mastery breakdown
    const topicBreakdown = Object.entries(progress.topicMastery)
      .map(([topicId, m]) => ({
        topicId,
        masteryScore: m.masteryScore,
        practiceScore: m.practiceScore,
        reviewCount: m.reviewCount,
        lastReviewed: m.lastReviewed,
        status: m.masteryScore >= 80 ? 'mastered' : m.masteryScore >= 50 ? 'learning' : 'weak',
      }))
      .sort((a, b) => b.masteryScore - a.masteryScore);

    return res.json({
      success: true,
      userId: req.params.userId,
      prediction,
      dueForRevision,
      heatmapData,
      weeklyTrend,
      topicBreakdown,
      summary: {
        totalXP: progress.xp,
        level: progress.level,
        streak: progress.streak,
        longestStreak: progress.longestStreak,
        questionsAttempted: progress.questionsAttempted,
        questionsCorrect: progress.questionsCorrect,
        accuracy: progress.questionsAttempted > 0
          ? Math.round((progress.questionsCorrect / progress.questionsAttempted) * 100) : 0,
        studyMinutes: progress.studyMinutes,
        studyHours: Math.round(progress.studyMinutes / 60 * 10) / 10,
        masteredTopics: Object.values(progress.topicMastery).filter(t => t.masteryScore >= 80).length,
        totalTopicsStudied: Object.keys(progress.topicMastery).length,
        achievements: progress.achievements?.length || 0,
        rank: progress.rank,
      },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to compute analytics', message: err.message });
  }
});

// POST /api/analytics/event — log an analytics event
analyticsRouter.post('/event', async (req: Request, res: Response) => {
  try {
    const { userId, event, topic, score, duration, metadata } = req.body;

    if (!userId || !event) {
      return res.status(400).json({ error: 'userId and event are required' });
    }

    const analyticsEvent: AnalyticsEvent = {
      userId,
      event,
      topic,
      score,
      duration,
      timestamp: new Date().toISOString(),
      metadata,
    };

    analyticsEvents.push(analyticsEvent);

    // Keep max 10000 events in memory
    if (analyticsEvents.length > 10000) {
      analyticsEvents.splice(0, analyticsEvents.length - 10000);
    }

    return res.status(201).json({ success: true, event: analyticsEvent });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to log event', message: err.message });
  }
});

// GET /api/analytics/leaderboard — top users by XP
analyticsRouter.get('/leaderboard/top', async (req: Request, res: Response) => {
  try {
    // In MVP, this would query from DB; return mock leaderboard
    const mockLeaderboard = [
      { rank: 1, name: 'You', xp: 0, streak: 0, masteredTopics: 0 },
    ];

    return res.json({ success: true, leaderboard: mockLeaderboard });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch leaderboard', message: err.message });
  }
});
