import { Router, Request, Response } from 'express';
export const progressRouter = Router();

// In-memory progress store (MVP — syncs with frontend Zustand persist)
interface TopicMastery {
  masteryScore: number;
  practiceScore: number;
  lastReviewed: string;
  reviewCount: number;
  nextReviewDate?: string;
}

interface UserProgress {
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
  lastActive: string;
  updatedAt: string;
}

const progressStore = new Map<string, UserProgress>();

function calculateLevel(xp: number): number {
  return Math.floor(1 + Math.sqrt(xp / 100));
}

function calculateRank(xp: number): string {
  if (xp >= 10000) return 'diamond';
  if (xp >= 5000) return 'platinum';
  if (xp >= 2000) return 'gold';
  if (xp >= 500) return 'silver';
  return 'bronze';
}

// GET /api/progress/:userId
progressRouter.get('/:userId', async (req: Request, res: Response) => {
  try {
    const userId = req.params.userId;
    const prog = progressStore.get(userId);

    if (!prog) {
      // Return default progress for new users
      const defaultProgress: UserProgress = {
        userId,
        xp: 0,
        level: 1,
        streak: 0,
        longestStreak: 0,
        rank: 'bronze',
        questionsAttempted: 0,
        questionsCorrect: 0,
        studyMinutes: 0,
        studyDays: {},
        topicMastery: {},
        achievements: [],
        lastActive: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      return res.json({ success: true, progress: defaultProgress, isNew: true });
    }

    return res.json({ success: true, progress: prog });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch progress', message: err.message });
  }
});

// POST /api/progress/update — full progress sync
progressRouter.post('/update', async (req: Request, res: Response) => {
  try {
    const { userId, progress } = req.body;

    if (!userId) return res.status(400).json({ error: 'userId is required' });

    const existing = progressStore.get(userId) || {
      userId,
      xp: 0, level: 1, streak: 0, longestStreak: 0, rank: 'bronze',
      questionsAttempted: 0, questionsCorrect: 0,
      studyMinutes: 0, studyDays: {}, topicMastery: {}, achievements: [],
      lastActive: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updated: UserProgress = {
      ...existing,
      ...progress,
      userId, // ensure userId is not overwritten
      level: calculateLevel(progress?.xp ?? existing.xp),
      rank: calculateRank(progress?.xp ?? existing.xp),
      updatedAt: new Date().toISOString(),
    };

    progressStore.set(userId, updated);

    return res.json({
      success: true,
      progress: updated,
      computed: { level: updated.level, rank: updated.rank },
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update progress', message: err.message });
  }
});

// POST /api/progress/xp — add XP event
progressRouter.post('/xp', async (req: Request, res: Response) => {
  try {
    const { userId, amount, reason, topic } = req.body;

    if (!userId || !amount) return res.status(400).json({ error: 'userId and amount are required' });

    const prog = progressStore.get(userId) || {
      userId, xp: 0, level: 1, streak: 0, longestStreak: 0, rank: 'bronze',
      questionsAttempted: 0, questionsCorrect: 0,
      studyMinutes: 0, studyDays: {}, topicMastery: {}, achievements: [],
      lastActive: new Date().toISOString(), updatedAt: new Date().toISOString(),
    };

    const newXP = prog.xp + amount;
    const newLevel = calculateLevel(newXP);
    const leveledUp = newLevel > prog.level;

    prog.xp = newXP;
    prog.level = newLevel;
    prog.rank = calculateRank(newXP);
    prog.updatedAt = new Date().toISOString();

    progressStore.set(userId, prog);

    return res.json({
      success: true,
      xpAdded: amount,
      totalXP: newXP,
      level: newLevel,
      rank: prog.rank,
      leveledUp,
      reason,
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to add XP', message: err.message });
  }
});

// POST /api/progress/mastery — update topic mastery
progressRouter.post('/mastery', async (req: Request, res: Response) => {
  try {
    const { userId, topicId, masteryScore, practiceScore } = req.body;

    if (!userId || !topicId) return res.status(400).json({ error: 'userId and topicId are required' });

    const prog = progressStore.get(userId);
    if (!prog) return res.status(404).json({ error: 'User progress not found' });

    const existing = prog.topicMastery[topicId] || {
      masteryScore: 0, practiceScore: 0,
      lastReviewed: new Date().toISOString(),
      reviewCount: 0,
    };

    // SM-2 inspired: calculate next review date based on mastery
    const easeFactor = Math.max(1.3, 2.5 - (100 - (masteryScore ?? existing.masteryScore)) * 0.02);
    const interval = existing.reviewCount === 0 ? 1 : existing.reviewCount === 1 ? 6 :
      Math.round((existing.reviewCount - 1) * easeFactor);

    const nextReview = new Date();
    nextReview.setDate(nextReview.getDate() + interval);

    prog.topicMastery[topicId] = {
      masteryScore: masteryScore ?? existing.masteryScore,
      practiceScore: practiceScore ?? existing.practiceScore,
      lastReviewed: new Date().toISOString(),
      reviewCount: existing.reviewCount + 1,
      nextReviewDate: nextReview.toISOString(),
    };

    prog.updatedAt = new Date().toISOString();
    progressStore.set(userId, prog);

    return res.json({
      success: true,
      topicId,
      mastery: prog.topicMastery[topicId],
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update mastery', message: err.message });
  }
});
