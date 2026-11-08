import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface TopicMastery {
  topicId: string;
  learningScore: number;
  practiceScore: number;
  revisionScore: number;
  mockTestScore: number;
  confidenceScore: number;
  masteryScore: number;
  practiceCount: number;
  correctCount: number;
  lastStudiedAt?: string;
  nextRevisionAt?: string;
}

export interface UserProgress {
  xp: number;
  level: number;
  streak: number;
  longestStreak: number;
  lastActiveDate: string;
  rank: "bronze" | "silver" | "gold" | "platinum" | "diamond" | "legend";
  achievements: string[];
  topicMastery: Record<string, TopicMastery>;
  questionsAttempted: number;
  questionsCorrect: number;
  studyMinutes: number;
  studyDays: Record<string, number>; // date -> minutes
}

interface ProgressStore {
  progress: UserProgress;
  addXP: (amount: number, reason?: string) => void;
  updateTopicMastery: (topicId: string, update: Partial<TopicMastery>) => void;
  recordStudySession: (minutes: number) => void;
  recordQuestionAttempt: (correct: boolean) => void;
  updateStreak: () => void;
  reset: () => void;
}

const XP_FOR_LEVEL = (level: number) => level * 100 + 50;
const RANK_THRESHOLDS = { bronze: 0, silver: 500, gold: 1500, platinum: 3000, diamond: 6000, legend: 12000 };

function getRank(xp: number): UserProgress["rank"] {
  if (xp >= 12000) return "legend";
  if (xp >= 6000) return "diamond";
  if (xp >= 3000) return "platinum";
  if (xp >= 1500) return "gold";
  if (xp >= 500) return "silver";
  return "bronze";
}

const DEFAULT_PROGRESS: UserProgress = {
  xp: 0, level: 1, streak: 0, longestStreak: 0,
  lastActiveDate: "", rank: "bronze", achievements: [],
  topicMastery: {}, questionsAttempted: 0, questionsCorrect: 0,
  studyMinutes: 0, studyDays: {},
};

export const useProgressStore = create<ProgressStore>()(
  persist(
    (set, get) => ({
      progress: DEFAULT_PROGRESS,

      addXP: (amount, _reason?) =>
        set((state) => {
          let { xp, level } = state.progress;
          xp += amount;
          while (xp >= XP_FOR_LEVEL(level)) {
            xp -= XP_FOR_LEVEL(level);
            level++;
          }
          const rank = getRank(state.progress.xp + amount);
          return { progress: { ...state.progress, xp, level, rank } };
        }),

      updateTopicMastery: (topicId, update) =>
        set((state) => ({
          progress: {
            ...state.progress,
            topicMastery: {
              ...state.progress.topicMastery,
              [topicId]: {
                ...(state.progress.topicMastery[topicId] ?? {
                  topicId,
                  learningScore: 0,
                  practiceScore: 0,
                  revisionScore: 0,
                  mockTestScore: 0,
                  confidenceScore: 0,
                  masteryScore: 0,
                  practiceCount: 0,
                  correctCount: 0,
                }),
                ...update,
              },
            },
          },
        })),

      recordStudySession: (minutes) =>
        set((state) => {
          const today = new Date().toISOString().split("T")[0];
          const studyDays = { ...state.progress.studyDays, [today]: (state.progress.studyDays[today] || 0) + minutes };
          return { progress: { ...state.progress, studyMinutes: state.progress.studyMinutes + minutes, studyDays } };
        }),

      recordQuestionAttempt: (correct) =>
        set((state) => ({
          progress: {
            ...state.progress,
            questionsAttempted: state.progress.questionsAttempted + 1,
            questionsCorrect: state.progress.questionsCorrect + (correct ? 1 : 0),
          },
        })),

      updateStreak: () =>
        set((state) => {
          const today = new Date().toISOString().split("T")[0];
          const yesterday = new Date(Date.now() - 86400000).toISOString().split("T")[0];
          const { lastActiveDate, streak, longestStreak } = state.progress;
          if (lastActiveDate === today) return state;
          const newStreak = lastActiveDate === yesterday ? streak + 1 : 1;
          return {
            progress: {
              ...state.progress,
              lastActiveDate: today,
              streak: newStreak,
              longestStreak: Math.max(newStreak, longestStreak),
            },
          };
        }),

      reset: () => set({ progress: DEFAULT_PROGRESS }),
    }),
    { name: "dsa-progress" }
  )
);
