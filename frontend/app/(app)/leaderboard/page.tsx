"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  Trophy, Flame, Target, Crown, Medal,
  Star, Zap, TrendingUp, Users, ArrowUp, ArrowDown, Minus
} from "lucide-react";
import { useProgressStore } from "@/lib/stores/progress-store";
import { ALL_TOPICS, RANK_INFO } from "@/lib/constants";
import Link from "next/link";

// ─── Mock leaderboard data ────────────────────────────────────────────────────

interface LeaderboardEntry {
  rank: number;
  name: string;
  avatar: string;
  xp: number;
  streak: number;
  accuracy: number;
  masteredTopics: number;
  rankTitle: string;
  rankEmoji: string;
  badge?: string;
  change?: "up" | "down" | "same";
  isYou?: boolean;
}

function buildMockLeaderboard(yourXP: number, yourStreak: number, yourAccuracy: number, yourMastered: number): LeaderboardEntry[] {
  const entries: LeaderboardEntry[] = [
    { rank: 1, name: "Arjun S.", avatar: "AS", xp: 12850, streak: 45, accuracy: 94, masteredTopics: 12, rankTitle: "Diamond", rankEmoji: "💎", badge: "🏆 #1 All Time", change: "same" },
    { rank: 2, name: "Priya M.", avatar: "PM", xp: 11200, streak: 38, accuracy: 91, masteredTopics: 11, rankTitle: "Diamond", rankEmoji: "💎", change: "up" },
    { rank: 3, name: "Rahul K.", avatar: "RK", xp: 9800, streak: 30, accuracy: 88, masteredTopics: 10, rankTitle: "Platinum", rankEmoji: "🥈", change: "down" },
    { rank: 4, name: "Sneha L.", avatar: "SL", xp: 8500, streak: 25, accuracy: 85, masteredTopics: 9, rankTitle: "Platinum", rankEmoji: "🥈", change: "up" },
    { rank: 5, name: "Dev P.", avatar: "DP", xp: 7200, streak: 21, accuracy: 82, masteredTopics: 8, rankTitle: "Gold", rankEmoji: "🥇", change: "same" },
    { rank: 6, name: "Ananya R.", avatar: "AR", xp: 6100, streak: 18, accuracy: 79, masteredTopics: 7, rankTitle: "Gold", rankEmoji: "🥇", change: "up" },
    { rank: 7, name: "Karthik B.", avatar: "KB", xp: 5400, streak: 15, accuracy: 76, masteredTopics: 6, rankTitle: "Gold", rankEmoji: "🥇", change: "down" },
    { rank: 8, name: "Meera J.", avatar: "MJ", xp: 4300, streak: 12, accuracy: 72, masteredTopics: 5, rankTitle: "Silver", rankEmoji: "⚔️", change: "up" },
    { rank: 9, name: "Vijay T.", avatar: "VT", xp: 3100, streak: 10, accuracy: 68, masteredTopics: 4, rankTitle: "Silver", rankEmoji: "⚔️", change: "same" },
    { rank: 10, name: "Riya C.", avatar: "RC", xp: 2200, streak: 7, accuracy: 64, masteredTopics: 3, rankTitle: "Silver", rankEmoji: "⚔️", change: "up" },
  ];

  // Find where "you" would rank
  const youEntry: LeaderboardEntry = {
    rank: 0,
    name: "You",
    avatar: "ME",
    xp: yourXP,
    streak: yourStreak,
    accuracy: yourAccuracy,
    masteredTopics: yourMastered,
    rankTitle: RANK_INFO[yourXP >= 10000 ? "diamond" : yourXP >= 5000 ? "platinum" : yourXP >= 2000 ? "gold" : yourXP >= 500 ? "silver" : "bronze"]?.label || "Bronze",
    rankEmoji: yourXP >= 10000 ? "💎" : yourXP >= 5000 ? "🥈" : yourXP >= 2000 ? "🥇" : "⚔️",
    isYou: true,
    change: "up",
  };

  // Insert "you" in the correct rank
  const allEntries = [...entries, youEntry].sort((a, b) => b.xp - a.xp);
  allEntries.forEach((e, i) => { e.rank = i + 1; });

  return allEntries;
}

type LeaderboardTab = "xp" | "streak" | "accuracy";

// ─── Component ────────────────────────────────────────────────────────────────

export default function LeaderboardPage() {
  const { progress } = useProgressStore();
  const [tab, setTab] = useState<LeaderboardTab>("xp");

  const accuracy = progress.questionsAttempted > 0
    ? Math.round((progress.questionsCorrect / progress.questionsAttempted) * 100) : 0;
  const masteredCount = Object.values(progress.topicMastery).filter(t => t.masteryScore >= 80).length;

  const leaderboard = buildMockLeaderboard(progress.xp, progress.streak, accuracy, masteredCount);

  const sortedLeaderboard = [...leaderboard].sort((a, b) => {
    if (tab === "streak") return b.streak - a.streak;
    if (tab === "accuracy") return b.accuracy - a.accuracy;
    return b.xp - a.xp;
  }).map((e, i) => ({ ...e, rank: i + 1 }));

  const yourEntry = sortedLeaderboard.find(e => e.isYou);
  const yourRank = yourEntry?.rank || leaderboard.length;

  const rankColors: Record<number, string> = {
    1: "text-yellow-400",
    2: "text-slate-300",
    3: "text-orange-400",
  };

  const rankBg: Record<number, string> = {
    1: "bg-yellow-500/15 border-yellow-500/30",
    2: "bg-slate-500/15 border-slate-500/30",
    3: "bg-orange-500/15 border-orange-500/30",
  };

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black gradient-text">🏆 Leaderboard</h1>
        <p className="text-slate-400 mt-1 text-sm">
          See how you rank against other DSA CT Master students
        </p>
      </div>

      {/* Your Position Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card p-5 border border-indigo-500/30 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-4">
            <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-2xl font-black border-2 ${
              yourRank <= 3 ? rankBg[yourRank] || "bg-indigo-500/20 border-indigo-500/40" : "bg-indigo-500/20 border-indigo-500/40"
            }`}>
              {yourRank <= 3 ? ["🥇", "🥈", "🥉"][yourRank - 1] : `#${yourRank}`}
            </div>
            <div>
              <div className="text-xs text-slate-400">Your Current Rank</div>
              <div className={`text-3xl font-black ${rankColors[yourRank] || "text-indigo-400"}`}>
                #{yourRank}
              </div>
              <div className="text-xs text-slate-400">out of {leaderboard.length} students</div>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: "XP", value: progress.xp.toLocaleString(), icon: Zap, color: "text-indigo-400" },
              { label: "Streak", value: `${progress.streak}d`, icon: Flame, color: "text-orange-400" },
              { label: "Accuracy", value: `${accuracy}%`, icon: Target, color: "text-cyan-400" },
            ].map((s, i) => (
              <div key={i} className="text-center">
                <s.icon className={`w-4 h-4 ${s.color} mx-auto mb-1`} />
                <div className={`font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-500">{s.label}</div>
              </div>
            ))}
          </div>
          <div>
            {yourRank > 10 ? (
              <div className="text-sm text-slate-400 text-right">
                <div className="mb-1">Gap to Top 10:</div>
                <div className="text-indigo-400 font-bold">
                  {(sortedLeaderboard[9]?.xp || 0) - progress.xp} XP needed
                </div>
              </div>
            ) : (
              <div className="text-sm text-green-400 font-bold">
                🎉 You&apos;re in Top 10!
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-2">
        {[
          { key: "xp" as LeaderboardTab, label: "By XP", icon: Zap },
          { key: "streak" as LeaderboardTab, label: "By Streak", icon: Flame },
          { key: "accuracy" as LeaderboardTab, label: "By Accuracy", icon: Target },
        ].map(t => (
          <button key={t.key}
            onClick={() => setTab(t.key)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 border transition-all ${
              tab === t.key
                ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"
            }`}
          >
            <t.icon className="w-4 h-4" /> {t.label}
          </button>
        ))}
      </div>

      {/* Leaderboard Table */}
      <div className="glass-card overflow-hidden">
        {/* Top 3 Podium */}
        <div className="p-4 border-b border-white/5">
          <div className="flex items-end justify-center gap-4">
            {[1, 0, 2].map(rankOffset => {
              const entry = sortedLeaderboard[rankOffset];
              if (!entry) return null;
              const heights = [1, 2, 0];
              const h = heights[rankOffset];
              return (
                <motion.div
                  key={entry.rank}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: rankOffset * 0.1 }}
                  className={`flex flex-col items-center ${h === 2 ? "mb-0" : h === 1 ? "mb-4" : "mb-8"}`}
                >
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-xs font-black mb-2 ${
                    entry.isYou ? "bg-gradient-to-br from-indigo-500 to-purple-600" : "bg-slate-700"
                  }`}>
                    {entry.avatar}
                  </div>
                  <div className={`text-sm font-bold ${entry.isYou ? "text-indigo-300" : "text-white"}`}>
                    {entry.name}
                  </div>
                  <div className="text-xs text-slate-400">{entry.xp.toLocaleString()} XP</div>
                  <div className={`mt-2 w-20 rounded-t-xl flex items-center justify-center py-2 text-lg ${
                    entry.rank === 1 ? "bg-yellow-500/20 h-20" :
                    entry.rank === 2 ? "bg-slate-500/20 h-16" :
                    "bg-orange-500/20 h-12"
                  }`}>
                    {["🥇", "🥈", "🥉"][entry.rank - 1]}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>

        {/* Full Table */}
        <div className="divide-y divide-white/5">
          {sortedLeaderboard.map((entry, i) => (
            <motion.div
              key={entry.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.03 }}
              className={`flex items-center gap-4 px-4 py-3 transition-all ${
                entry.isYou
                  ? "bg-indigo-500/10 border-l-2 border-indigo-500"
                  : "hover:bg-white/5"
              }`}
            >
              {/* Rank */}
              <div className={`w-8 text-center font-black text-sm ${rankColors[entry.rank] || "text-slate-400"}`}>
                {entry.rank <= 3 ? ["🥇", "🥈", "🥉"][entry.rank - 1] : entry.rank}
              </div>

              {/* Change indicator */}
              <div className="w-4 flex justify-center">
                {entry.change === "up" && <ArrowUp className="w-3 h-3 text-green-400" />}
                {entry.change === "down" && <ArrowDown className="w-3 h-3 text-red-400" />}
                {entry.change === "same" && <Minus className="w-3 h-3 text-slate-600" />}
              </div>

              {/* Avatar */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-xs font-black flex-shrink-0 ${
                entry.isYou
                  ? "bg-gradient-to-br from-indigo-500 to-purple-600 text-white"
                  : "bg-slate-700/60 text-slate-300"
              }`}>
                {entry.avatar}
              </div>

              {/* Name */}
              <div className="flex-1 min-w-0">
                <div className={`font-semibold text-sm flex items-center gap-2 ${entry.isYou ? "text-indigo-300" : "text-white"}`}>
                  {entry.name}
                  {entry.isYou && <span className="text-xs bg-indigo-500/20 text-indigo-400 px-1.5 py-0.5 rounded-full">You</span>}
                  {entry.badge && <span className="text-xs bg-yellow-500/20 text-yellow-400 px-1.5 py-0.5 rounded-full">{entry.badge}</span>}
                </div>
                <div className="text-xs text-slate-500">{entry.rankEmoji} {entry.rankTitle}</div>
              </div>

              {/* Stats */}
              <div className="hidden sm:flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className={`font-bold ${tab === "xp" ? "text-indigo-400" : "text-slate-300"}`}>
                    {entry.xp.toLocaleString()}
                  </div>
                  <div className="text-xs text-slate-500">XP</div>
                </div>
                <div className="text-center">
                  <div className={`font-bold ${tab === "streak" ? "text-orange-400" : "text-slate-300"}`}>
                    {entry.streak}d
                  </div>
                  <div className="text-xs text-slate-500">Streak</div>
                </div>
                <div className="text-center">
                  <div className={`font-bold ${tab === "accuracy" ? "text-cyan-400" : "text-slate-300"}`}>
                    {entry.accuracy}%
                  </div>
                  <div className="text-xs text-slate-500">Accuracy</div>
                </div>
                <div className="text-center hidden md:block">
                  <div className="font-bold text-green-400">{entry.masteredTopics}</div>
                  <div className="text-xs text-slate-500">Mastered</div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Motivation */}
      <div className="glass-card p-5 border border-purple-500/20">
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp className="w-5 h-5 text-purple-400" />
          <h2 className="font-bold text-white">How to Climb the Leaderboard</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { icon: Zap, title: "Earn XP", desc: "Complete questions, viva sessions, and daily challenges", href: "/challenge", color: "text-indigo-400" },
            { icon: Flame, title: "Build Streak", desc: "Study every day to maintain your streak multiplier", href: "/dashboard", color: "text-orange-400" },
            { icon: Target, title: "Improve Accuracy", desc: "Practice MCQs on your weak topics to boost accuracy", href: "/questions/mcq", color: "text-cyan-400" },
          ].map((tip, i) => (
            <Link key={i} href={tip.href}>
              <div className="p-3 rounded-xl bg-white/5 border border-white/10 hover:border-white/20 transition-all cursor-pointer">
                <tip.icon className={`w-5 h-5 ${tip.color} mb-2`} />
                <div className="font-semibold text-white text-sm">{tip.title}</div>
                <p className="text-xs text-slate-400 mt-1">{tip.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
