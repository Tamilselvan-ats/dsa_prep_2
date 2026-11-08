"use client";
// Achievements & Gamification Page — badges, rank progression, milestones

import { useMemo } from "react";
import { motion } from "framer-motion";
import {
  Trophy, Star, Zap, Flame, Brain, Target, Award,
  Shield, TrendingUp, BookOpen, Code, GraduationCap,
  CheckCircle, Lock, Crown
} from "lucide-react";
import { useProgressStore } from "@/lib/stores/progress-store";
import { ALL_TOPICS, RANK_INFO } from "@/lib/constants";
import Link from "next/link";

// ── Types ──────────────────────────────────────────────────────────────────

interface Badge {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  category: "learning" | "streak" | "mastery" | "exam" | "special";
  rarity: "common" | "rare" | "epic" | "legendary";
  requirement: string;
  xpReward: number;
  isUnlocked: (progress: any) => boolean;
}

// ── Badge Definitions ──────────────────────────────────────────────────────

const BADGES: Badge[] = [
  // Learning
  {
    id: "first_question",
    name: "First Step",
    description: "Attempted your first question",
    icon: <Star className="w-6 h-6" />,
    category: "learning",
    rarity: "common",
    requirement: "Attempt 1 question",
    xpReward: 50,
    isUnlocked: (p) => p.questionsAttempted >= 1,
  },
  {
    id: "question_10",
    name: "Getting Started",
    description: "Attempted 10 questions",
    icon: <BookOpen className="w-6 h-6" />,
    category: "learning",
    rarity: "common",
    requirement: "Attempt 10 questions",
    xpReward: 100,
    isUnlocked: (p) => p.questionsAttempted >= 10,
  },
  {
    id: "question_50",
    name: "Dedicated Learner",
    description: "Attempted 50 questions",
    icon: <BookOpen className="w-6 h-6" />,
    category: "learning",
    rarity: "rare",
    requirement: "Attempt 50 questions",
    xpReward: 250,
    isUnlocked: (p) => p.questionsAttempted >= 50,
  },
  {
    id: "question_100",
    name: "Century Club",
    description: "Attempted 100 questions",
    icon: <Trophy className="w-6 h-6" />,
    category: "learning",
    rarity: "epic",
    requirement: "Attempt 100 questions",
    xpReward: 500,
    isUnlocked: (p) => p.questionsAttempted >= 100,
  },
  // Streak
  {
    id: "streak_3",
    name: "On a Roll",
    description: "Maintained a 3-day study streak",
    icon: <Flame className="w-6 h-6" />,
    category: "streak",
    rarity: "common",
    requirement: "3-day streak",
    xpReward: 75,
    isUnlocked: (p) => p.streak >= 3,
  },
  {
    id: "streak_7",
    name: "Week Warrior",
    description: "Maintained a 7-day study streak",
    icon: <Flame className="w-6 h-6" />,
    category: "streak",
    rarity: "rare",
    requirement: "7-day streak",
    xpReward: 200,
    isUnlocked: (p) => p.streak >= 7,
  },
  {
    id: "streak_14",
    name: "Fortnight Fighter",
    description: "Maintained a 14-day study streak",
    icon: <Flame className="w-6 h-6" />,
    category: "streak",
    rarity: "epic",
    requirement: "14-day streak",
    xpReward: 500,
    isUnlocked: (p) => p.streak >= 14,
  },
  {
    id: "streak_30",
    name: "Monthly Master",
    description: "Maintained a 30-day study streak",
    icon: <Crown className="w-6 h-6" />,
    category: "streak",
    rarity: "legendary",
    requirement: "30-day streak",
    xpReward: 1000,
    isUnlocked: (p) => p.streak >= 30,
  },
  // Mastery
  {
    id: "first_mastery",
    name: "Topic Conqueror",
    description: "Achieved 80%+ mastery in any topic",
    icon: <Target className="w-6 h-6" />,
    category: "mastery",
    rarity: "rare",
    requirement: "80%+ mastery in 1 topic",
    xpReward: 300,
    isUnlocked: (p) => Object.values(p.topicMastery).some((m: any) => m.masteryScore >= 80),
  },
  {
    id: "mastery_5",
    name: "DSA Scholar",
    description: "Achieved 70%+ mastery in 5 topics",
    icon: <GraduationCap className="w-6 h-6" />,
    category: "mastery",
    rarity: "epic",
    requirement: "70%+ mastery in 5 topics",
    xpReward: 500,
    isUnlocked: (p) => Object.values(p.topicMastery).filter((m: any) => m.masteryScore >= 70).length >= 5,
  },
  {
    id: "mastery_all",
    name: "DSA Master",
    description: "Achieved 70%+ mastery in all 12 topics",
    icon: <Crown className="w-6 h-6" />,
    category: "mastery",
    rarity: "legendary",
    requirement: "70%+ mastery in all topics",
    xpReward: 2000,
    isUnlocked: (p) => Object.values(p.topicMastery).filter((m: any) => m.masteryScore >= 70).length >= 12,
  },
  // Exam
  {
    id: "first_exam",
    name: "Exam Taker",
    description: "Completed your first exam simulation",
    icon: <Shield className="w-6 h-6" />,
    category: "exam",
    rarity: "common",
    requirement: "Complete 1 exam",
    xpReward: 100,
    isUnlocked: (p) => p.questionsAttempted >= 20, // proxy
  },
  {
    id: "xp_1000",
    name: "Rising Star",
    description: "Earned 1,000 total XP",
    icon: <Zap className="w-6 h-6" />,
    category: "special",
    rarity: "rare",
    requirement: "Earn 1000 XP",
    xpReward: 100,
    isUnlocked: (p) => (p.xp + (p.level - 1) * 100) >= 1000,
  },
  {
    id: "xp_5000",
    name: "Power Learner",
    description: "Earned 5,000 total XP",
    icon: <Zap className="w-6 h-6" />,
    category: "special",
    rarity: "epic",
    requirement: "Earn 5000 XP",
    xpReward: 500,
    isUnlocked: (p) => (p.xp + (p.level - 1) * 100) >= 5000,
  },
  {
    id: "study_hour",
    name: "Hour Spent",
    description: "Studied for a total of 1 hour",
    icon: <Brain className="w-6 h-6" />,
    category: "learning",
    rarity: "common",
    requirement: "60 minutes of study",
    xpReward: 100,
    isUnlocked: (p) => p.studyMinutes >= 60,
  },
  {
    id: "study_10h",
    name: "Ten Hours Strong",
    description: "Studied for 10 total hours",
    icon: <Brain className="w-6 h-6" />,
    category: "learning",
    rarity: "rare",
    requirement: "600 minutes of study",
    xpReward: 500,
    isUnlocked: (p) => p.studyMinutes >= 600,
  },
  {
    id: "accuracy_90",
    name: "Sharp Mind",
    description: "Maintained 90%+ accuracy over 10+ questions",
    icon: <TrendingUp className="w-6 h-6" />,
    category: "exam",
    rarity: "epic",
    requirement: "90%+ accuracy, 10+ questions",
    xpReward: 400,
    isUnlocked: (p) => p.questionsAttempted >= 10 && (p.questionsCorrect / p.questionsAttempted) >= 0.9,
  },
  {
    id: "code_analyzer",
    name: "Code Debugger",
    description: "Used the AI Code Analyzer",
    icon: <Code className="w-6 h-6" />,
    category: "special",
    rarity: "common",
    requirement: "Analyze 1 code snippet",
    xpReward: 50,
    isUnlocked: (p) => p.questionsAttempted >= 1, // proxy
  },
];

// ── Rarity Config ──────────────────────────────────────────────────────────

const RARITY_CONFIG = {
  common:    { label: "Common",    color: "text-slate-300", border: "border-slate-500/40",   bg: "from-slate-700/30 to-slate-800/30",    glow: "" },
  rare:      { label: "Rare",      color: "text-blue-400",  border: "border-blue-500/40",    bg: "from-blue-900/30 to-indigo-900/30",    glow: "shadow-blue-500/20 shadow-md" },
  epic:      { label: "Epic",      color: "text-purple-400",border: "border-purple-500/40",  bg: "from-purple-900/30 to-pink-900/30",    glow: "shadow-purple-500/30 shadow-lg" },
  legendary: { label: "Legendary", color: "text-yellow-400",border: "border-yellow-500/40",  bg: "from-yellow-900/30 to-orange-900/30",  glow: "shadow-yellow-500/40 shadow-xl" },
};

const CATEGORY_CONFIG = {
  learning: { label: "Learning",  icon: "📚", color: "text-blue-400"   },
  streak:   { label: "Streaks",   icon: "🔥", color: "text-orange-400" },
  mastery:  { label: "Mastery",   icon: "🎯", color: "text-green-400"  },
  exam:     { label: "Exam",      icon: "📋", color: "text-red-400"    },
  special:  { label: "Special",   icon: "⚡", color: "text-yellow-400" },
};

// ── Main Component ──────────────────────────────────────────────────────────

export default function AchievementsPage() {
  const { progress } = useProgressStore();

  const { unlocked, locked } = useMemo(() => {
    const unlocked = BADGES.filter(b => b.isUnlocked(progress));
    const locked = BADGES.filter(b => !b.isUnlocked(progress));
    return { unlocked, locked };
  }, [progress]);

  const totalXPFromBadges = unlocked.reduce((s, b) => s + b.xpReward, 0);
  const rank = RANK_INFO[progress.rank];

  // Rank progression
  const ranks = Object.entries(RANK_INFO);
  const currentRankIdx = ranks.findIndex(([k]) => k === progress.rank);
  const nextRank = ranks[currentRankIdx + 1];

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
              <Trophy className="w-6 h-6 text-yellow-400" /> Achievements
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              {unlocked.length}/{BADGES.length} badges earned • {totalXPFromBadges} XP from badges
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-3xl">{rank.emoji}</div>
            <div>
              <div className="font-bold text-slate-200">{rank.label} Rank</div>
              <div className="text-xs text-slate-500">{progress.xp} XP • Level {progress.level}</div>
            </div>
          </div>
        </motion.div>

        {/* Rank Progression */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-5">
          <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
            <Crown className="w-5 h-5 text-yellow-400" /> Rank Progression
          </h3>
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            {ranks.map(([key, info], i) => {
              const isCurrentOrPast = i <= currentRankIdx;
              const isCurrent = key === progress.rank;
              return (
                <div key={key} className="flex items-center gap-2 shrink-0">
                  <div className={`flex flex-col items-center transition-all ${isCurrent ? "scale-110" : ""}`}>
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xl border-2 ${
                      isCurrent ? "border-yellow-400 bg-yellow-400/20" :
                      isCurrentOrPast ? "border-indigo-500/50 bg-indigo-500/10" :
                      "border-slate-700 bg-slate-800/40"
                    }`}>
                      {info.emoji}
                    </div>
                    <div className={`text-xs mt-1 font-semibold ${isCurrent ? "text-yellow-400" : isCurrentOrPast ? "text-indigo-400" : "text-slate-600"}`}>
                      {info.label}
                    </div>
                    <div className="text-xs text-slate-600">{info.minXP}+</div>
                  </div>
                  {i < ranks.length - 1 && (
                    <div className={`w-8 h-0.5 ${i < currentRankIdx ? "bg-indigo-500" : "bg-slate-700"}`} />
                  )}
                </div>
              );
            })}
          </div>
          {nextRank && (
            <div className="mt-3 flex items-center gap-3">
              <div className="flex-1">
                <div className="flex justify-between text-xs text-slate-500 mb-1">
                  <span>Progress to {nextRank[1].label}</span>
                  <span>{progress.xp} / {nextRank[1].minXP} XP</span>
                </div>
                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((progress.xp / nextRank[1].minXP) * 100, 100)}%` }}
                    transition={{ duration: 1, delay: 0.3 }}
                  />
                </div>
              </div>
              <div className="text-xl">{nextRank[1].emoji}</div>
            </div>
          )}
        </motion.div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Badges Earned", value: `${unlocked.length}/${BADGES.length}`, icon: <Trophy className="w-5 h-5" />, color: "text-yellow-400" },
            { label: "Current Streak", value: `${progress.streak}d`, icon: <Flame className="w-5 h-5" />, color: "text-orange-400" },
            { label: "Questions Done", value: progress.questionsAttempted, icon: <Target className="w-5 h-5" />, color: "text-green-400" },
            { label: "Study Time", value: `${Math.floor(progress.studyMinutes / 60)}h ${progress.studyMinutes % 60}m`, icon: <Brain className="w-5 h-5" />, color: "text-purple-400" },
          ].map(stat => (
            <div key={stat.label} className="glass-card p-4 text-center">
              <div className={`flex justify-center mb-2 ${stat.color}`}>{stat.icon}</div>
              <div className={`text-xl font-black ${stat.color}`}>{stat.value}</div>
              <div className="text-xs text-slate-500 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Unlocked Badges */}
        {unlocked.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}>
            <h2 className="font-bold text-slate-200 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-400" /> Earned Badges ({unlocked.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {unlocked.map((badge, i) => {
                const rarity = RARITY_CONFIG[badge.rarity];
                const category = CATEGORY_CONFIG[badge.category];
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.05 }}
                    className={`glass-card p-4 text-center bg-gradient-to-br ${rarity.bg} border ${rarity.border} ${rarity.glow} relative overflow-hidden`}
                  >
                    {/* Sparkle for legendary */}
                    {badge.rarity === "legendary" && (
                      <div className="absolute top-1 right-1 text-yellow-400 text-xs">✨</div>
                    )}
                    <div className={`text-3xl mb-2 ${rarity.color} flex justify-center`}>
                      {badge.icon}
                    </div>
                    <div className="font-bold text-slate-200 text-sm">{badge.name}</div>
                    <div className="text-xs text-slate-400 mt-1">{badge.description}</div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <span className={`text-xs font-semibold ${rarity.color}`}>{rarity.label}</span>
                      <span className="text-slate-600">•</span>
                      <span className="text-xs text-yellow-400">+{badge.xpReward} XP</span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* Locked Badges */}
        {locked.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
            <h2 className="font-bold text-slate-400 mb-4 flex items-center gap-2">
              <Lock className="w-5 h-5 text-slate-500" /> Locked Badges ({locked.length})
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {locked.map((badge, i) => {
                const rarity = RARITY_CONFIG[badge.rarity];
                return (
                  <motion.div
                    key={badge.id}
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: i * 0.03 }}
                    className="glass-card p-4 text-center opacity-50 relative"
                  >
                    <div className="absolute inset-0 bg-slate-900/60 rounded-[inherit] flex items-center justify-center">
                      <Lock className="w-6 h-6 text-slate-500" />
                    </div>
                    <div className="text-3xl mb-2 text-slate-700 flex justify-center">{badge.icon}</div>
                    <div className="font-bold text-slate-500 text-sm">{badge.name}</div>
                    <div className="text-xs text-slate-600 mt-1">{badge.requirement}</div>
                    <div className={`text-xs font-semibold mt-2 ${rarity.color} opacity-70`}>{rarity.label}</div>
                  </motion.div>
                );
              })}
            </div>
          </motion.div>
        )}

        {/* CTA */}
        {unlocked.length < BADGES.length && (
          <div className="glass-card p-6 text-center">
            <div className="text-3xl mb-3">🎯</div>
            <h3 className="font-bold text-slate-200 mb-2">Keep Going!</h3>
            <p className="text-slate-400 text-sm mb-4">
              You have {locked.length} more badge{locked.length > 1 ? "s" : ""} to unlock.
              The next one could be just around the corner!
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link href="/questions" className="px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm">
                Practice Questions
              </Link>
              <Link href="/dashboard/revision" className="px-4 py-2 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 font-semibold text-sm">
                Review Topics
              </Link>
            </div>
          </div>
        )}

        {unlocked.length === BADGES.length && (
          <div className="glass-card p-8 text-center bg-gradient-to-br from-yellow-900/30 to-orange-900/30 border border-yellow-500/30">
            <div className="text-5xl mb-3">👑</div>
            <h3 className="text-xl font-black text-yellow-400">ALL BADGES UNLOCKED!</h3>
            <p className="text-slate-300 mt-2">You are a true DSA Master. University topper status achieved!</p>
          </div>
        )}
      </div>
    </div>
  );
}
