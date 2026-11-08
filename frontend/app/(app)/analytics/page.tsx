"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import {
  BarChart3, TrendingUp, Calendar, Target, Flame, Trophy,
  BookOpen, CheckCircle, AlertCircle, ArrowRight, Zap, Brain
} from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, Legend, Cell
} from "recharts";
import { useProgressStore } from "@/lib/stores/progress-store";
import { DSA_TOPICS, ALL_TOPICS, RANK_INFO } from "@/lib/constants";
import Link from "next/link";

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

  // Build mastery chart data
  const masteryData = ALL_TOPICS.slice(0, 10).map(t => ({
    name: t.name.substring(0, 12) + (t.name.length > 12 ? "…" : ""),
    fullName: t.name,
    mastery: progress.topicMastery[t.id]?.masteryScore || 0,
    practice: progress.topicMastery[t.id]?.practiceScore || 0,
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

  // Predicted CT score (naive formula)
  const predictedScore = Math.min(50, Math.round(
    (accuracy * 0.3) + (masteredCount / totalTopics * 50 * 0.4) + (Math.min(progress.streak, 30) / 30 * 50 * 0.3)
  ));

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

      {/* CT Score Prediction */}
      <div className="glass-card p-5 border border-indigo-500/30 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Brain className="w-5 h-5 text-indigo-400" />
              <h2 className="font-bold text-white">CT Score Prediction (AI)</h2>
            </div>
            <p className="text-slate-400 text-sm">Based on your mastery scores, accuracy, and study consistency</p>
          </div>
          <div className="text-center">
            <div className="text-5xl font-black gradient-text">{predictedScore}/50</div>
            <div className="text-xs text-slate-400 mt-1">Predicted Score</div>
          </div>
          <div className="text-right">
            <div className={`text-lg font-bold ${predictedScore >= 40 ? "text-green-400" : predictedScore >= 30 ? "text-yellow-400" : "text-red-400"}`}>
              {predictedScore >= 40 ? "🎯 Excellent" : predictedScore >= 30 ? "📈 On Track" : "⚠️ Needs Work"}
            </div>
            <Link href="/questions">
              <button className="mt-2 text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 ml-auto">
                Practice more <ArrowRight className="w-3 h-3" />
              </button>
            </Link>
          </div>
        </div>
      </div>

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
    </div>
  );
}
