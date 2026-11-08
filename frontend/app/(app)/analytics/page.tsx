"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, Calendar, Target, Flame, Trophy,
  BookOpen, CheckCircle, AlertCircle, ArrowRight, Zap, Brain,
  Clock, RefreshCcw, GraduationCap, Layers
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar,
  CartesianGrid, Legend, Cell
} from "recharts";
import { useProgressStore } from "@/lib/stores/progress-store";
import { ALL_TOPICS, RANK_INFO } from "@/lib/constants";
import Link from "next/link";
import { getAnalyticsPrediction } from "@/lib/api";

// ─── Heatmap ──────────────────────────────────────────────────────────────────
function StudyHeatmap({ studyDays }: { studyDays: Record<string, number> }) {
  const today = new Date();
  const days = Array.from({ length: 84 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() - 83 + i);
    const key = d.toISOString().split("T")[0];
    return { date: key, minutes: studyDays[key] || 0, label: d.toLocaleDateString() };
  });

  const maxMin = Math.max(...days.map(d => d.minutes), 1);

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {days.map((day, i) => {
          const intensity = day.minutes / maxMin;
          return (
            <div key={i} title={`${day.label}: ${day.minutes} min`}
              className="w-3 h-3 rounded-sm transition-all"
              style={{
                backgroundColor: day.minutes === 0
                  ? "rgba(255,255,255,0.05)"
                  : `rgba(99,102,241,${0.2 + intensity * 0.8})`,
              }} />
          );
        })}
      </div>
      <div className="flex items-center gap-2 mt-2 text-xs text-slate-500">
        <span>Less</span>
        <div className="flex gap-1">
          {[0.1, 0.3, 0.5, 0.7, 1].map((o, i) => (
            <div key={i} className="w-3 h-3 rounded-sm" style={{ backgroundColor: `rgba(99,102,241,${o})` }} />
          ))}
        </div>
        <span>More</span>
      </div>
    </div>
  );
}

// Custom Tooltip
const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload?.length) {
    return (
      <div className="glass-card px-3 py-2 text-xs">
        <div className="text-slate-400 mb-1">{label}</div>
        {payload.map((p: any, i: number) => (
          <div key={i} className="font-bold" style={{ color: p.color }}>{p.name}: {p.value}</div>
        ))}
      </div>
    );
  }
  return null;
};

export default function AnalyticsPage() {
  const { progress } = useProgressStore();
  const rankInfo = RANK_INFO[progress.rank];
  const [backendPrediction, setBackendPrediction] = useState<any>(null);
  const [predicting, setPredicting] = useState(false);

  // Build mastery chart data
  const masteryData = ALL_TOPICS.slice(0, 10).map(t => ({
    name: t.name.substring(0, 12) + (t.name.length > 12 ? "…" : ""),
    fullName: t.name,
    mastery: progress.topicMastery[t.id]?.masteryScore || 0,
    practice: progress.topicMastery[t.id]?.practiceScore || 0,
  }));

  // Radar chart data (top 6 topics for radar)
  const radarData = ALL_TOPICS.slice(0, 6).map(t => ({
    topic: t.name.split(" ")[0],
    mastery: progress.topicMastery[t.id]?.masteryScore || 0,
  }));

  // Weekly XP trend (simulated from study days)
  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 6 + i);
    const key = d.toISOString().split("T")[0];
    const mins = progress.studyDays[key] || 0;
    return {
      day: d.toLocaleDateString("en", { weekday: "short" }),
      minutes: mins,
      xp: mins * 3,
    };
  });

  const weakTopics = ALL_TOPICS
    .map(t => ({ ...t, score: progress.topicMastery[t.id]?.masteryScore || 0 }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  const strongTopics = ALL_TOPICS
    .map(t => ({ ...t, score: progress.topicMastery[t.id]?.masteryScore || 0 }))
    .filter(t => t.score >= 70)
    .sort((a, b) => b.score - a.score)
    .slice(0, 5);

  const accuracy = progress.questionsAttempted > 0
    ? Math.round((progress.questionsCorrect / progress.questionsAttempted) * 100) : 0;

  const masteredCount = Object.values(progress.topicMastery).filter(t => t.masteryScore >= 80).length;
  const totalTopics = ALL_TOPICS.length;

  // Client-side CT score prediction
  const predictedScore = Math.min(50, Math.round(
    (accuracy * 0.3) + (masteredCount / totalTopics * 50 * 0.4) + (Math.min(progress.streak, 30) / 30 * 50 * 0.3)
  ));

  // Topics due for revision (SM-2 based)
  const topicsDueForRevision = ALL_TOPICS
    .map(t => {
      const m = progress.topicMastery[t.id];
      const nextDate = m?.nextRevisionAt;
      if (!nextDate) return null;
      const daysOverdue = Math.floor((Date.now() - new Date(nextDate).getTime()) / (1000 * 60 * 60 * 24));
      return daysOverdue >= 0 ? { ...t, daysOverdue, masteryScore: m.masteryScore } : null;
    })
    .filter(Boolean)
    .sort((a: any, b: any) => b.daysOverdue - a.daysOverdue)
    .slice(0, 5) as Array<{ id: string; name: string; slug: string; daysOverdue: number; masteryScore: number }>;

  // Fetch backend CT prediction
  const fetchBackendPrediction = async () => {
    setPredicting(true);
    try {
      const result = await getAnalyticsPrediction("local-user", progress);
      setBackendPrediction(result);
    } catch {
      // Backend not running — use client-side prediction
    } finally {
      setPredicting(false);
    }
  };

  const displayPrediction = backendPrediction?.prediction || {
    predicted: predictedScore,
    maxScore: 50,
    grade: predictedScore >= 45 ? "O" : predictedScore >= 40 ? "A+" : predictedScore >= 30 ? "A" : predictedScore >= 20 ? "B" : "C",
    recommendation: predictedScore >= 40
      ? "Excellent prep! Keep maintaining your practice."
      : "Focus on weaker topics and increase daily practice.",
    breakdown: {
      accuracy,
      avgMastery: Math.round(Object.values(progress.topicMastery).reduce((s, t) => s + t.masteryScore, 0) / Math.max(Object.values(progress.topicMastery).length, 1)),
      masteredTopics: masteredCount,
      consistencyScore: Math.round(Math.min(100, (progress.streak / 30) * 100)),
    },
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-black gradient-text">Analytics Dashboard</h1>
        <p className="text-slate-400 mt-1">Your complete learning journey — mastery, progress, and predictions</p>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Trophy, label: "Total XP", value: progress.xp.toLocaleString(), color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { icon: Flame, label: "Day Streak", value: progress.streak, color: "text-orange-400", bg: "bg-orange-500/10" },
          { icon: CheckCircle, label: "Questions Done", value: progress.questionsAttempted, color: "text-green-400", bg: "bg-green-500/10" },
          { icon: Target, label: "Accuracy", value: `${accuracy}%`, color: "text-cyan-400", bg: "bg-cyan-500/10" },
        ].map((s, i) => (
          <motion.div key={i} className="glass-card p-4" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className={`w-10 h-10 rounded-xl ${s.bg} flex items-center justify-center mb-3`}>
              <s.icon className={`w-5 h-5 ${s.color}`} />
            </div>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-1">{s.label}</div>
          </motion.div>
        ))}
      </div>

      {/* CT Score Prediction — Enhanced */}
      <div className="glass-card p-5 border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5" />
        <div className="relative">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-400" />
              <h2 className="font-bold text-white">CT Score Prediction (AI)</h2>
            </div>
            <button
              onClick={fetchBackendPrediction}
              disabled={predicting}
              className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 disabled:opacity-50"
            >
              <RefreshCcw className={`w-3 h-3 ${predicting ? "animate-spin" : ""}`} />
              {predicting ? "Analyzing..." : "Refresh"}
            </button>
          </div>
          <div className="flex items-center justify-between flex-wrap gap-6">
            {/* Score display */}
            <div className="text-center">
              <div className="text-6xl font-black gradient-text">{displayPrediction.predicted}/{displayPrediction.maxScore}</div>
              <div className="text-sm text-slate-400 mt-1">Predicted Score</div>
              <div className={`text-xl font-bold mt-2 ${displayPrediction.predicted >= 40 ? "text-green-400" : displayPrediction.predicted >= 30 ? "text-yellow-400" : "text-red-400"}`}>
                Grade: {displayPrediction.grade}
              </div>
            </div>
            {/* Breakdown */}
            <div className="flex-1 min-w-48 space-y-2">
              {[
                { label: "Answer Accuracy", value: displayPrediction.breakdown.accuracy, color: "from-cyan-500 to-blue-500" },
                { label: "Avg Topic Mastery", value: displayPrediction.breakdown.avgMastery, color: "from-purple-500 to-pink-500" },
                { label: "Topics Mastered", value: Math.round((displayPrediction.breakdown.masteredTopics / totalTopics) * 100), color: "from-green-500 to-emerald-500" },
                { label: "Study Consistency", value: displayPrediction.breakdown.consistencyScore, color: "from-orange-500 to-amber-500" },
              ].map((item, i) => (
                <div key={i}>
                  <div className="flex justify-between text-xs text-slate-400 mb-1">
                    <span>{item.label}</span><span className="font-bold text-white">{item.value}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className={`h-full bg-gradient-to-r ${item.color} rounded-full transition-all duration-700`}
                      style={{ width: `${item.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
            {/* Recommendation */}
            <div className="max-w-xs">
              <div className="text-xs font-semibold text-indigo-300 mb-1">🎯 AI Recommendation</div>
              <p className="text-xs text-slate-400 leading-relaxed">{displayPrediction.recommendation}</p>
              <div className="flex gap-2 mt-3">
                <Link href="/questions/mcq">
                  <button className="text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-3 py-1 rounded-lg hover:bg-indigo-500/30 transition-all">
                    Practice MCQs
                  </button>
                </Link>
                <Link href="/dashboard/revision">
                  <button className="text-xs bg-purple-500/20 text-purple-300 border border-purple-500/30 px-3 py-1 rounded-lg hover:bg-purple-500/30 transition-all">
                    Spaced Revision
                  </button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Topics Due for Revision */}
      {topicsDueForRevision.length > 0 && (
        <div className="glass-card p-5 border border-orange-500/20">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-orange-400" />
              <h2 className="font-bold text-white">Topics Due for Revision</h2>
              <span className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full border border-orange-500/30">
                {topicsDueForRevision.length} due
              </span>
            </div>
            <Link href="/dashboard/revision">
              <button className="text-xs text-orange-400 hover:text-orange-300 flex items-center gap-1">
                Start Revision <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
          <div className="space-y-2">
            {topicsDueForRevision.map((t, i) => (
              <div key={i} className="flex items-center gap-3 p-2 rounded-lg bg-slate-800/30">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                  t.daysOverdue > 7 ? "bg-red-500" : t.daysOverdue > 3 ? "bg-orange-500" : "bg-yellow-500"
                }`} />
                <div className="flex-1">
                  <span className="text-sm text-slate-200">{t.name}</span>
                  <span className="ml-2 text-xs text-slate-500">Mastery: {t.masteryScore}%</span>
                </div>
                <span className={`text-xs font-medium ${
                  t.daysOverdue > 7 ? "text-red-400" : t.daysOverdue > 3 ? "text-orange-400" : "text-yellow-400"
                }`}>
                  {t.daysOverdue}d overdue
                </span>
                <Link href={`/visualizer/${t.slug}`}>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300">Review →</button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Study Heatmap */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <Calendar className="w-5 h-5 text-indigo-400" />
            <h2 className="font-bold text-white">Study Heatmap (Last 12 Weeks)</h2>
          </div>
          <StudyHeatmap studyDays={progress.studyDays} />
          <div className="mt-3 text-xs text-slate-500">
            Total study time: {Math.round(progress.studyMinutes / 60)}h {progress.studyMinutes % 60}m
          </div>
        </div>

        {/* Weekly Activity */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <TrendingUp className="w-5 h-5 text-green-400" />
            <h2 className="font-bold text-white">Weekly Activity</h2>
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={weeklyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Bar dataKey="minutes" name="Minutes" radius={4}>
                {weeklyData.map((_, i) => (
                  <Cell key={i} fill={`rgba(99,102,241,${0.4 + (weeklyData[i].minutes / (Math.max(...weeklyData.map(d => d.minutes)) || 1)) * 0.6})`} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Topic Mastery Bar Chart */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-purple-400" />
          <h2 className="font-bold text-white">Topic Mastery Overview</h2>
        </div>
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={masteryData} margin={{ top: 0, right: 0, bottom: 20, left: -20 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
            <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 10 }} axisLine={false} tickLine={false} angle={-25} textAnchor="end" />
            <YAxis domain={[0, 100]} tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ color: "#94a3b8", fontSize: 12 }} />
            <Bar dataKey="mastery" name="Mastery" fill="#6366f1" radius={4} />
            <Bar dataKey="practice" name="Practice" fill="#8b5cf6" radius={4} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Weak Topics */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <AlertCircle className="w-5 h-5 text-red-400" />
            <h2 className="font-bold text-white">Weak Topics — Focus Here</h2>
          </div>
          <div className="space-y-3">
            {weakTopics.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 text-xs text-slate-500 text-center">{i + 1}</div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-200">{t.name}</span>
                    <span className="text-xs font-bold text-red-400">{t.score}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-red-500 to-orange-400 rounded-full" style={{ width: `${t.score}%` }} />
                  </div>
                </div>
                <Link href={`/visualizer/${t.slug}`}>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300 whitespace-nowrap">Study →</button>
                </Link>
              </div>
            ))}
            {weakTopics.length === 0 && <p className="text-slate-500 text-sm text-center py-4">No topics studied yet</p>}
          </div>
        </div>

        {/* Strong Topics */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-4">
            <CheckCircle className="w-5 h-5 text-green-400" />
            <h2 className="font-bold text-white">Strong Topics — Keep It Up!</h2>
          </div>
          <div className="space-y-3">
            {strongTopics.map((t, i) => (
              <div key={i} className="flex items-center gap-3">
                <div className="w-6 text-xs text-slate-500 text-center">🏆</div>
                <div className="flex-1">
                  <div className="flex justify-between mb-1">
                    <span className="text-sm text-slate-200">{t.name}</span>
                    <span className="text-xs font-bold text-green-400">{t.score}%</span>
                  </div>
                  <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full" style={{ width: `${t.score}%` }} />
                  </div>
                </div>
              </div>
            ))}
            {strongTopics.length === 0 && (
              <div className="text-center py-6">
                <p className="text-slate-500 text-sm mb-2">No mastered topics yet</p>
                <Link href="/visualizer"><button className="text-xs text-indigo-400">Start Learning →</button></Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Rank Progress */}
      <div className="glass-card p-5">
        <h2 className="font-bold text-white mb-4">Rank Progress</h2>
        <div className="flex items-center gap-4 mb-4">
          <div className="text-3xl">{rankInfo.emoji}</div>
          <div>
            <div className="font-bold text-white">{rankInfo.label} Rank</div>
            <div className="text-xs text-slate-400">{progress.xp} XP earned</div>
          </div>
        </div>
        <div className="space-y-2">
          {Object.entries(RANK_INFO).map(([rank, info]) => (
            <div key={rank} className="flex items-center gap-3">
              <span className="text-sm w-8">{info.emoji}</span>
              <span className={`text-sm w-20 ${progress.rank === rank ? "font-bold text-white" : "text-slate-400"}`}>{info.label}</span>
              <span className="text-xs text-slate-500 w-20">{info.minXP.toLocaleString()} XP</span>
              <div className="flex-1 h-1.5 bg-slate-800 rounded-full overflow-hidden">
                <div className={`h-full rounded-full transition-all ${progress.rank === rank ? "bg-gradient-to-r from-indigo-500 to-purple-500" : progress.xp >= info.minXP ? "bg-slate-600" : "bg-transparent"}`}
                  style={{ width: progress.xp >= info.minXP ? "100%" : "0%" }} />
              </div>
              {progress.rank === rank && <span className="text-xs text-indigo-400 font-bold">← Current</span>}
            </div>
          ))}
        </div>
      </div>

      {/* Skill Radar Chart */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Layers className="w-5 h-5 text-purple-400" />
          <h2 className="font-bold text-white">Skill Radar — Topic Coverage</h2>
        </div>
        {Object.keys(progress.topicMastery).length > 0 ? (
          <ResponsiveContainer width="100%" height={260}>
            <RadarChart data={radarData}>
              <PolarGrid stroke="rgba(255,255,255,0.08)" />
              <PolarAngleAxis dataKey="topic" tick={{ fill: "#94a3b8", fontSize: 11 }} />
              <PolarRadiusAxis domain={[0, 100]} tick={{ fill: "#64748b", fontSize: 10 }} />
              <Radar name="Mastery" dataKey="mastery" stroke="#6366f1" fill="#6366f1" fillOpacity={0.25} />
            </RadarChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-40 flex items-center justify-center">
            <div className="text-center">
              <GraduationCap className="w-10 h-10 text-slate-600 mx-auto mb-2" />
              <p className="text-slate-500 text-sm">Start learning to see your skill radar</p>
              <Link href="/visualizer"><button className="mt-2 text-xs text-indigo-400">Explore Visualizers →</button></Link>
            </div>
          </div>
        )}
      </div>

      {/* Quick Actions */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-5 h-5 text-yellow-400" />
          <h2 className="font-bold text-white">Quick Actions</h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: "Practice MCQs", href: "/questions/mcq", icon: Target, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
            { label: "Long Questions", href: "/questions/long", icon: BookOpen, color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/20" },
            { label: "HOTS Questions", href: "/questions/hots", icon: Brain, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/20" },
            { label: "Spaced Revision", href: "/dashboard/revision", icon: RefreshCcw, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20" },
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
    </div>
  );
}
