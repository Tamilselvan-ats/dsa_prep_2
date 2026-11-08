"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  User, Flame, Trophy, Target, Brain, BookOpen,
  Zap, Star, Clock, TrendingUp, CheckCircle,
  Edit3, Save, X, Award, BarChart3, Calendar
} from "lucide-react";
import { useProgressStore } from "@/lib/stores/progress-store";
import { ALL_TOPICS, RANK_INFO } from "@/lib/constants";
import Link from "next/link";

// ─── Rank progressions ────────────────────────────────────────────────────────

const RANKS_ORDERED = ["bronze", "silver", "gold", "platinum", "diamond", "legend"] as const;

function getRankColor(rank: string): string {
  const colors: Record<string, string> = {
    bronze: "text-orange-700",
    silver: "text-slate-400",
    gold: "text-yellow-400",
    platinum: "text-cyan-400",
    diamond: "text-blue-400",
    legend: "text-purple-400",
  };
  return colors[rank] || "text-slate-400";
}

function getRankGradient(rank: string): string {
  const gradients: Record<string, string> = {
    bronze: "from-orange-800 to-orange-600",
    silver: "from-slate-500 to-slate-400",
    gold: "from-yellow-600 to-yellow-400",
    platinum: "from-cyan-600 to-cyan-400",
    diamond: "from-blue-600 to-blue-400",
    legend: "from-purple-600 to-pink-500",
  };
  return gradients[rank] || "from-slate-700 to-slate-600";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { progress, reset } = useProgressStore();
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState("DSA Student");
  const [editName, setEditName] = useState(name);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  const rankInfo = RANK_INFO[progress.rank];
  const rankIdx = RANKS_ORDERED.indexOf(progress.rank as typeof RANKS_ORDERED[number]);
  const nextRank = RANKS_ORDERED[rankIdx + 1];
  const nextRankInfo = nextRank ? RANK_INFO[nextRank] : null;

  const accuracy = progress.questionsAttempted > 0
    ? Math.round((progress.questionsCorrect / progress.questionsAttempted) * 100) : 0;

  const masteredCount = Object.values(progress.topicMastery).filter(t => t.masteryScore >= 80).length;
  const inProgressCount = Object.values(progress.topicMastery).filter(t => t.masteryScore >= 40 && t.masteryScore < 80).length;
  const studyHours = Math.floor(progress.studyMinutes / 60);
  const studyMins = progress.studyMinutes % 60;
  const achievementCount = progress.achievements.length;

  const topicsSorted = ALL_TOPICS
    .map(t => ({ ...t, score: progress.topicMastery[t.id]?.masteryScore || 0 }))
    .filter(t => t.score > 0)
    .sort((a, b) => b.score - a.score);

  const xpToNextRank = nextRankInfo ? nextRankInfo.minXP - progress.xp : 0;
  const xpProgress = nextRankInfo
    ? Math.min(100, ((progress.xp - rankInfo.minXP) / (nextRankInfo.minXP - rankInfo.minXP)) * 100)
    : 100;

  const saveProfile = () => {
    setName(editName);
    setEditing(false);
  };

  const confirmReset = () => {
    reset();
    setShowResetConfirm(false);
  };

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black gradient-text">👤 My Profile</h1>
        <p className="text-slate-400 mt-1 text-sm">Your learning journey, achievements, and progress overview</p>
      </div>

      {/* Profile Card */}
      <div className="glass-card p-6 relative overflow-hidden">
        <div className={`absolute inset-0 bg-gradient-to-br ${getRankGradient(progress.rank)} opacity-5`} />
        <div className="relative flex flex-col sm:flex-row items-center sm:items-start gap-6">
          {/* Avatar */}
          <div className="relative flex-shrink-0">
            <div className={`w-24 h-24 rounded-2xl bg-gradient-to-br ${getRankGradient(progress.rank)} flex items-center justify-center text-3xl font-black text-white shadow-2xl`}>
              {name.slice(0, 2).toUpperCase()}
            </div>
            <div className={`absolute -bottom-2 -right-2 w-8 h-8 rounded-xl bg-gradient-to-br ${getRankGradient(progress.rank)} flex items-center justify-center text-sm`}>
              {rankInfo.emoji}
            </div>
          </div>

          {/* Info */}
          <div className="flex-1 text-center sm:text-left">
            {editing ? (
              <div className="flex items-center gap-2 mb-2 justify-center sm:justify-start">
                <input
                  value={editName}
                  onChange={e => setEditName(e.target.value)}
                  className="bg-slate-800/60 border border-slate-700/50 rounded-xl px-3 py-1.5 text-white text-lg font-bold"
                  maxLength={30}
                  autoFocus
                />
                <button onClick={saveProfile} className="p-2 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={() => { setEditing(false); setEditName(name); }} className="p-2 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-1 justify-center sm:justify-start">
                <h2 className="text-2xl font-black text-white">{name}</h2>
                <button onClick={() => setEditing(true)} className="p-1 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all">
                  <Edit3 className="w-4 h-4" />
                </button>
              </div>
            )}
            <div className={`text-sm font-semibold ${getRankColor(progress.rank)} mb-2`}>
              {rankInfo.emoji} {rankInfo.label} · Level {progress.level}
            </div>
            <p className="text-slate-400 text-xs">
              Started learning DSA with AI-powered tools
            </p>

            {/* Rank Progress Bar */}
            <div className="mt-4 max-w-sm mx-auto sm:mx-0">
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>{rankInfo.label}</span>
                {nextRankInfo && (
                  <span>{nextRankInfo.emoji} {nextRankInfo.label} in {xpToNextRank.toLocaleString()} XP</span>
                )}
              </div>
              <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full bg-gradient-to-r ${getRankGradient(progress.rank)} rounded-full`}
                  initial={{ width: 0 }}
                  animate={{ width: `${xpProgress}%` }}
                  transition={{ duration: 0.8, ease: "easeOut" }}
                />
              </div>
            </div>
          </div>

          {/* Total XP Badge */}
          <div className="text-center flex-shrink-0">
            <div className="text-4xl font-black gradient-text">{progress.xp.toLocaleString()}</div>
            <div className="text-xs text-slate-400">Total XP</div>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Flame, label: "Day Streak", value: `${progress.streak}`, sub: `Best: ${progress.longestStreak}d`, color: "text-orange-400", bg: "bg-orange-500/10" },
          { icon: Target, label: "Accuracy", value: `${accuracy}%`, sub: `${progress.questionsCorrect}/${progress.questionsAttempted} correct`, color: "text-cyan-400", bg: "bg-cyan-500/10" },
          { icon: CheckCircle, label: "Topics Mastered", value: `${masteredCount}`, sub: `${inProgressCount} in progress`, color: "text-green-400", bg: "bg-green-500/10" },
          { icon: Clock, label: "Study Time", value: `${studyHours}h ${studyMins}m`, sub: "Total study time", color: "text-purple-400", bg: "bg-purple-500/10" },
        ].map((s, i) => (
          <motion.div key={i} className="glass-card p-4"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
            <div className="text-xs text-slate-600 mt-0.5">{s.sub}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Topic Mastery Overview */}
        <div className="glass-card p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-purple-400" />
              <h2 className="font-bold text-white">Topic Mastery</h2>
            </div>
            <span className="text-xs text-slate-400">{topicsSorted.length}/{ALL_TOPICS.length} started</span>
          </div>
          {topicsSorted.length > 0 ? (
            <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
              {topicsSorted.map((t, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-200">{t.name}</span>
                    <span className={`font-bold ${
                      t.score >= 80 ? "text-green-400" : t.score >= 50 ? "text-yellow-400" : "text-red-400"
                    }`}>{t.score}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${
                      t.score >= 80 ? "bg-gradient-to-r from-green-500 to-emerald-400" :
                      t.score >= 50 ? "bg-gradient-to-r from-yellow-500 to-amber-400" :
                      "bg-gradient-to-r from-red-500 to-orange-400"
                    }`} style={{ width: `${t.score}%` }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <Brain className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">No topics studied yet</p>
              <Link href="/visualizer">
                <button className="mt-2 text-xs text-indigo-400">Start Learning →</button>
              </Link>
            </div>
          )}
        </div>

        {/* Rank Journey */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Trophy className="w-5 h-5 text-yellow-400" />
            <h2 className="font-bold text-white">Rank Journey</h2>
          </div>
          <div className="space-y-3">
            {RANKS_ORDERED.map((rank, i) => {
              const info = RANK_INFO[rank];
              const isCurrent = rank === progress.rank;
              const isPast = i < rankIdx;
              const isFuture = i > rankIdx;
              return (
                <div key={rank} className={`flex items-center gap-3 p-2 rounded-xl transition-all ${
                  isCurrent ? `bg-gradient-to-r ${getRankGradient(rank)} bg-opacity-20 border border-opacity-30` : ""
                }`}
                  style={isCurrent ? { background: `${getRankGradient(rank)}15` } : {}}>
                  <span className="text-xl w-8 text-center">{info.emoji}</span>
                  <div className="flex-1">
                    <div className={`text-sm font-bold ${isCurrent ? "text-white" : isPast ? "text-slate-400" : "text-slate-600"}`}>
                      {info.label}
                    </div>
                    <div className="text-xs text-slate-500">{info.minXP.toLocaleString()} XP required</div>
                  </div>
                  {isCurrent && (
                    <span className={`text-xs font-bold px-2 py-0.5 rounded-full bg-gradient-to-r ${getRankGradient(rank)} text-white`}>
                      Current
                    </span>
                  )}
                  {isPast && <CheckCircle className="w-4 h-4 text-green-400 flex-shrink-0" />}
                  {isFuture && (
                    <span className="text-xs text-slate-600">
                      {(info.minXP - progress.xp).toLocaleString()} XP away
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Achievements Summary */}
      <div className="glass-card p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Award className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-white">Achievements</h2>
          </div>
          <Link href="/dashboard/achievements">
            <button className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
              View All <TrendingUp className="w-3 h-3" />
            </button>
          </Link>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <div className="text-4xl font-black text-indigo-400">{achievementCount}</div>
            <div className="text-xs text-slate-400">Unlocked</div>
          </div>
          <div className="flex-1">
            {achievementCount > 0 ? (
              <div className="flex flex-wrap gap-2">
                {progress.achievements.slice(0, 8).map((badge, i) => (
                  <span key={i} className="text-2xl" title={badge}>{badge}</span>
                ))}
                {achievementCount > 8 && (
                  <span className="text-sm text-slate-400">+{achievementCount - 8} more</span>
                )}
              </div>
            ) : (
              <p className="text-slate-500 text-sm">Start studying to earn achievements!</p>
            )}
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h2 className="font-bold text-white">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Analytics", href: "/analytics", icon: BarChart3, color: "text-pink-400", bg: "bg-pink-500/10 border-pink-500/20" },
            { label: "Study Plan", href: "/study-plan", icon: Calendar, color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/20" },
            { label: "Leaderboard", href: "/leaderboard", icon: Trophy, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20" },
            { label: "Achievements", href: "/dashboard/achievements", icon: Award, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
          ].map((action, i) => (
            <Link key={i} href={action.href}>
              <button className={`w-full p-3 rounded-xl border ${action.bg} flex flex-col items-center gap-2 hover:scale-105 transition-transform`}>
                <action.icon className={`w-5 h-5 ${action.color}`} />
                <span className="text-xs text-slate-300 text-center">{action.label}</span>
              </button>
            </Link>
          ))}
        </div>
      </div>

      {/* Danger Zone */}
      <div className="glass-card p-5 border border-red-500/20">
        <h2 className="font-bold text-red-400 mb-3">⚠️ Danger Zone</h2>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-slate-300">Reset All Progress</p>
            <p className="text-xs text-slate-500">This will permanently delete your XP, achievements, and mastery data.</p>
          </div>
          {!showResetConfirm ? (
            <button
              onClick={() => setShowResetConfirm(true)}
              className="px-4 py-2 rounded-xl bg-red-500/10 text-red-400 border border-red-500/30 text-sm hover:bg-red-500/20 transition-all"
            >
              Reset
            </button>
          ) : (
            <div className="flex gap-2">
              <button onClick={confirmReset}
                className="px-4 py-2 rounded-xl bg-red-600 text-white text-sm font-bold hover:bg-red-500 transition-all">
                Confirm Reset
              </button>
              <button onClick={() => setShowResetConfirm(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-slate-400 border border-white/10 text-sm hover:bg-white/10 transition-all">
                Cancel
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
