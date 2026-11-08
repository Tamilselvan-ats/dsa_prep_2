"use client";
// Spaced Repetition Revision Page — SM-2 based adaptive revision scheduling

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Brain, Clock, TrendingUp, CheckCircle, XCircle,
  RefreshCw, Star, Zap, ArrowRight, Target, Flame, BookOpen,
  ChevronRight, AlertCircle, Trophy
} from "lucide-react";
import { toast } from "sonner";
import { useProgressStore, TopicMastery } from "@/lib/stores/progress-store";
import { ALL_TOPICS } from "@/lib/constants";
import { motion as m } from "framer-motion";

// ── Types ──────────────────────────────────────────────────────────────────

interface RevisionItem {
  topicId: string;
  topicName: string;
  mastery: TopicMastery;
  daysOverdue: number;
  urgency: "critical" | "due" | "soon" | "scheduled";
  masteryPct: number;
  recommendedAction: string;
}

// ── SM-2 Helpers ───────────────────────────────────────────────────────────

function getDaysUntilRevision(nextRevisionAt?: string): number {
  if (!nextRevisionAt) return -999; // never revised = overdue
  const next = new Date(nextRevisionAt);
  const now = new Date();
  const diff = Math.floor((next.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  return diff;
}

function computeSM2NextRevision(masteryPct: number, practiceCount: number): string {
  // Simplified SM-2: easiness factor based on mastery
  const ef = Math.max(1.3, 2.5 - (1 - masteryPct / 100) * 1.2);
  const interval = practiceCount === 0 ? 1 : practiceCount === 1 ? 3 : Math.round((practiceCount - 1) * ef);
  const next = new Date();
  next.setDate(next.getDate() + Math.min(interval, 60));
  return next.toISOString();
}

function getRevisionItems(topicMastery: Record<string, TopicMastery>): RevisionItem[] {
  return ALL_TOPICS.map(topic => {
    const mastery = topicMastery[topic.id] || {
      topicId: topic.id,
      learningScore: 0, practiceScore: 0, revisionScore: 0,
      mockTestScore: 0, confidenceScore: 0, masteryScore: 0,
      practiceCount: 0, correctCount: 0,
    };

    const daysUntil = getDaysUntilRevision(mastery.nextRevisionAt);
    const masteryPct = mastery.masteryScore || (mastery.practiceCount > 0
      ? Math.round((mastery.correctCount / mastery.practiceCount) * 100)
      : 0);

    let urgency: RevisionItem["urgency"] = "scheduled";
    let recommendedAction = "On track";

    if (daysUntil < -7 || mastery.practiceCount === 0) {
      urgency = "critical";
      recommendedAction = mastery.practiceCount === 0 ? "Never studied — start now!" : `${Math.abs(daysUntil)} days overdue!`;
    } else if (daysUntil <= 0) {
      urgency = "due";
      recommendedAction = "Due for revision today";
    } else if (daysUntil <= 3) {
      urgency = "soon";
      recommendedAction = `Revision in ${daysUntil} day${daysUntil > 1 ? "s" : ""}`;
    } else {
      urgency = "scheduled";
      recommendedAction = `Next revision in ${daysUntil} days`;
    }

    return {
      topicId: topic.id,
      topicName: topic.name,
      mastery,
      daysOverdue: Math.max(0, -daysUntil),
      urgency,
      masteryPct,
      recommendedAction,
    };
  }).sort((a, b) => {
    const order = { critical: 0, due: 1, soon: 2, scheduled: 3 };
    return order[a.urgency] - order[b.urgency] || a.daysOverdue - b.daysOverdue;
  });
}

const URGENCY_CONFIG = {
  critical: { color: "text-red-400",    bg: "bg-red-500/10 border-red-500/30",      icon: "🔥", label: "Critical" },
  due:      { color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", icon: "⚡", label: "Due Today" },
  soon:     { color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", icon: "📌", label: "Coming Soon" },
  scheduled:{ color: "text-green-400",  bg: "bg-green-500/10 border-green-500/30",   icon: "✅", label: "On Track" },
};

function MasteryBar({ pct, size = "md" }: { pct: number; size?: "sm" | "md" }) {
  const color = pct >= 80 ? "bg-green-500" : pct >= 60 ? "bg-blue-500" : pct >= 40 ? "bg-yellow-500" : pct >= 20 ? "bg-orange-500" : "bg-red-500";
  const h = size === "sm" ? "h-1" : "h-1.5";
  return (
    <div className={`w-full ${h} bg-slate-700 rounded-full overflow-hidden`}>
      <motion.div className={`h-full ${color} rounded-full`} initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.8, delay: 0.1 }} />
    </div>
  );
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function RevisionPage() {
  const { progress, updateTopicMastery, addXP } = useProgressStore();
  const [filter, setFilter] = useState<"all" | "critical" | "due" | "soon" | "scheduled">("all");
  const [selectedTopic, setSelectedTopic] = useState<RevisionItem | null>(null);
  const [quickQuizActive, setQuickQuizActive] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizSubmitted, setQuizSubmitted] = useState(false);
  const [selfRating, setSelfRating] = useState<0 | 1 | 2 | 3 | 4 | 5 | null>(null);

  const items = useMemo(() => getRevisionItems(progress.topicMastery), [progress.topicMastery]);
  const filtered = filter === "all" ? items : items.filter(item => item.urgency === filter);

  const counts = {
    critical: items.filter(i => i.urgency === "critical").length,
    due:      items.filter(i => i.urgency === "due").length,
    soon:     items.filter(i => i.urgency === "soon").length,
    scheduled:items.filter(i => i.urgency === "scheduled").length,
  };

  const totalDue = counts.critical + counts.due;
  const avgMastery = Math.round(items.reduce((s, i) => s + i.masteryPct, 0) / items.length);

  const handleMarkRevised = (item: RevisionItem, rating: number) => {
    // SM-2: update next revision date based on self-rating (0-5)
    // Rating 0-2: fail → reschedule soon (1-3 days)
    // Rating 3-5: pass → exponential interval
    const newPracticeCount = item.mastery.practiceCount + 1;
    const masteryUpdate = rating >= 3 ? Math.min(item.masteryPct + (rating * 5), 100) : Math.max(item.masteryPct - 10, 0);

    const nextRevision = rating >= 3
      ? computeSM2NextRevision(masteryUpdate, newPracticeCount)
      : new Date(Date.now() + (rating === 0 ? 1 : 3) * 24 * 60 * 60 * 1000).toISOString();

    updateTopicMastery(item.topicId, {
      practiceCount: newPracticeCount,
      correctCount: item.mastery.correctCount + (rating >= 3 ? 1 : 0),
      masteryScore: masteryUpdate,
      revisionScore: masteryUpdate,
      lastStudiedAt: new Date().toISOString(),
      nextRevisionAt: nextRevision,
    });

    addXP(rating >= 3 ? 20 : 5, "Revision");
    toast.success(`${item.topicName} scheduled! Next: ${new Date(nextRevision).toLocaleDateString()}`);
    setSelectedTopic(null);
    setQuickQuizActive(false);
    setQuizAnswer("");
    setQuizSubmitted(false);
    setSelfRating(null);
  };

  const handleResetTopic = (topicId: string) => {
    updateTopicMastery(topicId, {
      practiceCount: 0,
      correctCount: 0,
      masteryScore: 0,
      nextRevisionAt: undefined,
      lastStudiedAt: undefined,
    });
    toast.info("Topic reset");
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
              <Calendar className="w-6 h-6 text-indigo-400" /> Spaced Repetition
            </h1>
            <p className="text-slate-400 text-sm mt-1">SM-2 adaptive revision schedule — study smarter, not harder</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className={`text-2xl font-black ${totalDue > 0 ? "text-red-400" : "text-green-400"}`}>{totalDue}</div>
              <div className="text-xs text-slate-500">due today</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-black text-indigo-400">{avgMastery}%</div>
              <div className="text-xs text-slate-500">avg mastery</div>
            </div>
          </div>
        </motion.div>

        {/* Summary Cards */}
        <div className="grid grid-cols-4 gap-3">
          {(["critical", "due", "soon", "scheduled"] as const).map(urg => {
            const cfg = URGENCY_CONFIG[urg];
            return (
              <button
                key={urg}
                onClick={() => setFilter(filter === urg ? "all" : urg)}
                className={`glass-card p-4 text-center transition-all border ${filter === urg ? cfg.bg : "border-transparent"}`}
              >
                <div className="text-2xl mb-1">{cfg.icon}</div>
                <div className={`text-xl font-black ${cfg.color}`}>{counts[urg]}</div>
                <div className="text-xs text-slate-500">{cfg.label}</div>
              </button>
            );
          })}
        </div>

        {/* Filter Bar */}
        <div className="flex gap-2 flex-wrap">
          {["all", "critical", "due", "soon", "scheduled"].map(f => (
            <button key={f} onClick={() => setFilter(f as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all capitalize ${
                filter === f ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" : "bg-slate-800/40 text-slate-500 border-slate-700/40"
              }`}
            >
              {f} {f !== "all" ? `(${counts[f as keyof typeof counts]})` : `(${items.length})`}
            </button>
          ))}
        </div>

        {/* Topic List */}
        <div className="space-y-2">
          <AnimatePresence>
            {filtered.map((item, i) => {
              const cfg = URGENCY_CONFIG[item.urgency];
              return (
                <motion.div
                  key={item.topicId}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`glass-card p-4 cursor-pointer hover:scale-[1.01] transition-transform border ${
                    selectedTopic?.topicId === item.topicId ? cfg.bg : "border-transparent"
                  }`}
                  onClick={() => setSelectedTopic(selectedTopic?.topicId === item.topicId ? null : item)}
                >
                  <div className="flex items-center gap-4">
                    {/* Urgency Indicator */}
                    <span className="text-xl shrink-0">{cfg.icon}</span>

                    {/* Topic Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-semibold text-slate-200 text-sm">{item.topicName}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full border ${cfg.bg} ${cfg.color}`}>{cfg.label}</span>
                      </div>
                      <MasteryBar pct={item.masteryPct} />
                      <div className="flex items-center gap-3 mt-1 text-xs text-slate-500">
                        <span>{item.masteryPct}% mastery</span>
                        <span>•</span>
                        <span>{item.mastery.practiceCount} sessions</span>
                        <span>•</span>
                        <span className={cfg.color}>{item.recommendedAction}</span>
                      </div>
                    </div>

                    {/* Score */}
                    <div className="text-right shrink-0">
                      <div className={`text-lg font-bold ${item.masteryPct >= 80 ? "text-green-400" : item.masteryPct >= 60 ? "text-blue-400" : item.masteryPct >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                        {item.masteryPct}%
                      </div>
                      <ChevronRight className={`w-4 h-4 text-slate-600 ml-auto transition-transform ${selectedTopic?.topicId === item.topicId ? "rotate-90" : ""}`} />
                    </div>
                  </div>

                  {/* Expanded Panel */}
                  <AnimatePresence>
                    {selectedTopic?.topicId === item.topicId && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="mt-4 pt-4 border-t border-slate-700/30 space-y-4">
                          {/* Stats */}
                          <div className="grid grid-cols-3 gap-3 text-center">
                            {[
                              { label: "Sessions", value: item.mastery.practiceCount, color: "text-indigo-400" },
                              { label: "Correct", value: item.mastery.correctCount, color: "text-green-400" },
                              { label: "Accuracy", value: `${item.mastery.practiceCount > 0 ? Math.round((item.mastery.correctCount / item.mastery.practiceCount) * 100) : 0}%`, color: "text-cyan-400" },
                            ].map(stat => (
                              <div key={stat.label} className="bg-slate-800/40 rounded-xl p-3">
                                <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                                <div className="text-xs text-slate-500">{stat.label}</div>
                              </div>
                            ))}
                          </div>

                          {/* Self-rating (after reviewing topic) */}
                          <div>
                            <div className="text-xs font-semibold text-slate-400 mb-2">
                              After reviewing this topic, rate your confidence:
                            </div>
                            <div className="grid grid-cols-6 gap-1.5">
                              {[
                                { r: 0, label: "Blank", color: "text-red-400", bg: "bg-red-500/20 border-red-500/40" },
                                { r: 1, label: "Hard",  color: "text-orange-400", bg: "bg-orange-500/20 border-orange-500/40" },
                                { r: 2, label: "Hard",  color: "text-yellow-400", bg: "bg-yellow-500/20 border-yellow-500/40" },
                                { r: 3, label: "Good",  color: "text-cyan-400", bg: "bg-cyan-500/20 border-cyan-500/40" },
                                { r: 4, label: "Easy",  color: "text-green-400", bg: "bg-green-500/20 border-green-500/40" },
                                { r: 5, label: "Easy!", color: "text-green-300", bg: "bg-green-400/20 border-green-400/40" },
                              ].map(({ r, label, color, bg }) => (
                                <button
                                  key={r}
                                  onClick={(e) => { e.stopPropagation(); setSelfRating(r as any); }}
                                  className={`p-2 rounded-lg border text-center transition-all ${selfRating === r ? bg : "bg-slate-800/40 border-slate-700/40"}`}
                                >
                                  <div className={`text-sm font-bold ${selfRating === r ? color : "text-slate-500"}`}>{r}</div>
                                  <div className="text-xs text-slate-600">{label}</div>
                                </button>
                              ))}
                            </div>
                          </div>

                          <div className="flex gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); if (selfRating !== null) handleMarkRevised(item, selfRating); else toast.error("Rate your confidence first"); }}
                              disabled={selfRating === null}
                              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm disabled:opacity-50"
                            >
                              <CheckCircle className="w-4 h-4" /> Mark Revised & Schedule Next
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); handleResetTopic(item.topicId); }}
                              className="px-4 py-2.5 rounded-xl bg-slate-700/40 border border-slate-600/40 text-slate-400 text-sm hover:bg-slate-600/40"
                            >
                              Reset
                            </button>
                          </div>

                          <div className="text-xs text-slate-600 text-center">
                            Rating 0-2 = redo in 1-3 days | Rating 3-5 = exponential interval (SM-2 algorithm)
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>

        {/* SM-2 Info */}
        <div className="glass-card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Brain className="w-5 h-5 text-purple-400" />
            <h3 className="font-semibold text-slate-300">How Spaced Repetition Works</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-slate-400">
            <div className="bg-slate-800/40 rounded-xl p-4">
              <div className="text-indigo-400 font-semibold mb-2">🧠 The Forgetting Curve</div>
              <p>Memory decays exponentially over time. Reviewing just before you forget strengthens retention most efficiently.</p>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-4">
              <div className="text-cyan-400 font-semibold mb-2">📐 SM-2 Algorithm</div>
              <p>Rate 0-2: Failed → redo in 1-3 days. Rate 3-5: Passed → interval multiplied by easiness factor (1.3–2.5).</p>
            </div>
            <div className="bg-slate-800/40 rounded-xl p-4">
              <div className="text-green-400 font-semibold mb-2">🎯 Optimal Strategy</div>
              <p>Study critical topics daily, review "due" topics immediately, and let the algorithm handle scheduling.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
