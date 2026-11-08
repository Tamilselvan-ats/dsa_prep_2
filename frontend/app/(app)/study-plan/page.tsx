"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Calendar, Brain, Target, Clock, BookOpen, Zap,
  ChevronRight, Download, RefreshCcw, CheckCircle,
  Flame, AlertCircle, GraduationCap, Layers, Play
} from "lucide-react";
import { toast } from "sonner";
import { useAIStore } from "@/lib/stores/ai-store";
import { useProgressStore } from "@/lib/stores/progress-store";
import { ALL_TOPICS, DSA_TOPICS } from "@/lib/constants";
import { callGeminiDirect } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import Link from "next/link";

// ─── Types ───────────────────────────────────────────────────────────────────

interface StudyDay {
  date: string;
  dayLabel: string;
  dayOfWeek: string;
  sessions: StudySession[];
  totalMinutes: number;
  isToday: boolean;
  isPast: boolean;
}

interface StudySession {
  time: string;
  duration: number; // minutes
  topic: string;
  topicId: string;
  activity: string;
  activityType: "visualizer" | "mcq" | "long" | "tutor" | "revision" | "exam";
  link: string;
  priority: "high" | "medium" | "low";
  reason: string;
}

interface StudyPlan {
  examDate: string;
  daysLeft: number;
  dailyGoalMinutes: number;
  weeklyPlan: StudyDay[];
  weakTopics: string[];
  strongTopics: string[];
  predictedScore: number;
  aiAdvice: string;
  generatedAt: string;
}

// ─── Activity links ───────────────────────────────────────────────────────────

const ACTIVITY_LINKS: Record<string, { link: string; label: string }> = {
  "visualizer": { link: "/visualizer", label: "Open Visualizer" },
  "mcq": { link: "/questions/mcq", label: "Practice MCQs" },
  "long": { link: "/questions/long", label: "Long Questions" },
  "tutor": { link: "/tutor", label: "AI Tutor" },
  "revision": { link: "/dashboard/revision", label: "Spaced Revision" },
  "exam": { link: "/exam", label: "Mock Exam" },
};

const TOPIC_VISUALIZER_MAP: Record<string, string> = {
  "stack-adt": "/visualizer/stack",
  "expressions": "/visualizer/infix-postfix",
  "balancing-symbols": "/visualizer/balancing",
  "recursion": "/visualizer/recursion",
  "queue-adt": "/visualizer/queue",
  "scheduling": "/visualizer/queue",
  "tree-terminology": "/visualizer/tree",
  "bst": "/visualizer/bst",
  "tree-traversals": "/visualizer/traversal",
  "avl-tree": "/visualizer/avl",
  "hashing": "/visualizer/hashing",
  "collision-resolution": "/visualizer/collision",
};

// ─── Plan Generator ───────────────────────────────────────────────────────────

function generateLocalPlan(
  examDate: string,
  dailyMinutes: number,
  weakTopicIds: string[],
  strongTopicIds: string[],
): StudyPlan {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const exam = new Date(examDate);
  exam.setHours(0, 0, 0, 0);
  const daysLeft = Math.max(1, Math.ceil((exam.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));

  const weeklyPlan: StudyDay[] = [];
  const days = Math.min(daysLeft, 7);

  for (let i = 0; i < days; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = date.toISOString().split("T")[0];
    const dayOfWeek = date.toLocaleDateString("en", { weekday: "short" });
    const dayLabel = date.toLocaleDateString("en", { weekday: "long", month: "short", day: "numeric" });
    const isToday = i === 0;
    const isPast = false;

    const sessions: StudySession[] = [];
    let allocated = 0;

    // Day-based strategy
    const isExamDay = i === days - 1 && daysLeft <= 1;
    const isRevisionDay = daysLeft <= 3;

    if (isExamDay) {
      // Exam day — light revision only
      sessions.push({
        time: "08:00",
        duration: 30,
        topic: "Quick Revision — All Topics",
        topicId: "all",
        activity: "Spaced Revision",
        activityType: "revision",
        link: "/dashboard/revision",
        priority: "high",
        reason: "Exam day — final quick revision",
      });
    } else if (isRevisionDay) {
      // Last 3 days — focus on weak topics + mock
      for (const topicId of weakTopicIds.slice(0, 2)) {
        const topic = ALL_TOPICS.find(t => t.id === topicId);
        if (!topic || allocated >= dailyMinutes) break;
        sessions.push({
          time: `${8 + Math.floor(allocated / 60)}:${String(allocated % 60).padStart(2, "0")}`,
          duration: 45,
          topic: topic.name,
          topicId: topic.id,
          activity: "Visualizer + MCQ drill",
          activityType: "mcq",
          link: TOPIC_VISUALIZER_MAP[topic.id] || "/visualizer",
          priority: "high",
          reason: "Weak topic — prioritized for CT exam",
        });
        allocated += 45;
      }
      if (allocated < dailyMinutes) {
        sessions.push({
          time: `${8 + Math.floor(allocated / 60)}:${String(allocated % 60).padStart(2, "0")}`,
          duration: Math.min(60, dailyMinutes - allocated),
          topic: "Full Mock Exam",
          topicId: "all",
          activity: "Timed exam simulation",
          activityType: "exam",
          link: "/exam",
          priority: "high",
          reason: "Build exam stamina before CT",
        });
      }
    } else {
      // Normal days — systematic topic coverage
      const topicOrder = [
        ...(weakTopicIds.length > 0 ? weakTopicIds : []),
        ...ALL_TOPICS.filter(t => !weakTopicIds.includes(t.id) && !strongTopicIds.includes(t.id)).map(t => t.id),
        ...strongTopicIds,
      ];

      const dayTopicIdx = i % Math.max(topicOrder.length, 1);
      const primaryTopicId = topicOrder[dayTopicIdx] || ALL_TOPICS[0].id;
      const primaryTopic = ALL_TOPICS.find(t => t.id === primaryTopicId);

      if (primaryTopic && allocated + 40 <= dailyMinutes) {
        sessions.push({
          time: "08:00",
          duration: 40,
          topic: primaryTopic.name,
          topicId: primaryTopic.id,
          activity: "Learn with Visualizer",
          activityType: "visualizer",
          link: TOPIC_VISUALIZER_MAP[primaryTopic.id] || "/visualizer",
          priority: weakTopicIds.includes(primaryTopic.id) ? "high" : "medium",
          reason: weakTopicIds.includes(primaryTopic.id)
            ? "Weak topic — needs attention"
            : "Systematic curriculum coverage",
        });
        allocated += 40;
      }

      if (allocated + 30 <= dailyMinutes && primaryTopic) {
        sessions.push({
          time: `${8 + Math.floor(allocated / 60)}:${String(allocated % 60).padStart(2, "0")}`,
          duration: 30,
          topic: `${primaryTopic.name} — MCQ Practice`,
          topicId: primaryTopic.id,
          activity: "MCQ Quiz (10 questions)",
          activityType: "mcq",
          link: "/questions/mcq",
          priority: "medium",
          reason: "Reinforce learning with practice",
        });
        allocated += 30;
      }

      if (allocated + 30 <= dailyMinutes) {
        const secondTopicId = topicOrder[(dayTopicIdx + 1) % topicOrder.length];
        const secondTopic = ALL_TOPICS.find(t => t.id === secondTopicId);
        if (secondTopic) {
          sessions.push({
            time: `${8 + Math.floor(allocated / 60)}:${String(allocated % 60).padStart(2, "0")}`,
            duration: 30,
            topic: `${secondTopic.name} — Theory`,
            topicId: secondTopic.id,
            activity: "AI Tutor Explanation",
            activityType: "tutor",
            link: "/tutor",
            priority: "low",
            reason: "Cover additional topic",
          });
          allocated += 30;
        }
      }

      if (allocated + 20 <= dailyMinutes && i % 3 === 2) {
        sessions.push({
          time: `${8 + Math.floor(allocated / 60)}:${String(allocated % 60).padStart(2, "0")}`,
          duration: 20,
          topic: "Spaced Repetition Review",
          topicId: "revision",
          activity: "Review due topics",
          activityType: "revision",
          link: "/dashboard/revision",
          priority: "medium",
          reason: "SM-2 scheduled review",
        });
      }
    }

    weeklyPlan.push({
      date: dateStr,
      dayLabel,
      dayOfWeek,
      sessions,
      totalMinutes: sessions.reduce((s, sess) => s + sess.duration, 0),
      isToday,
      isPast,
    });
  }

  return {
    examDate,
    daysLeft,
    dailyGoalMinutes: dailyMinutes,
    weeklyPlan,
    weakTopics: weakTopicIds.map(id => ALL_TOPICS.find(t => t.id === id)?.name || id),
    strongTopics: strongTopicIds.map(id => ALL_TOPICS.find(t => t.id === id)?.name || id),
    predictedScore: Math.min(50, 15 + strongTopicIds.length * 3 - weakTopicIds.length * 2),
    aiAdvice: "",
    generatedAt: new Date().toISOString(),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function StudyPlanPage() {
  const { settings } = useAIStore();
  const { progress, addXP } = useProgressStore();

  // Form state
  const [examDate, setExamDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().split("T")[0];
  });
  const [dailyMinutes, setDailyMinutes] = useState(90);
  const [manualWeakIds, setManualWeakIds] = useState<string[]>([]);
  const [generating, setGenerating] = useState(false);
  const [plan, setPlan] = useState<StudyPlan | null>(null);
  const [aiAdvice, setAiAdvice] = useState("");
  const [selectedDay, setSelectedDay] = useState(0);
  const [completedSessions, setCompletedSessions] = useState<Set<string>>(new Set());

  // Derive weak/strong from progress store
  const weakTopicsFromProgress = ALL_TOPICS
    .map(t => ({ id: t.id, score: progress.topicMastery[t.id]?.masteryScore || 0 }))
    .filter(t => t.score < 50 && t.score > 0)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5)
    .map(t => t.id);

  const strongTopicsFromProgress = ALL_TOPICS
    .map(t => ({ id: t.id, score: progress.topicMastery[t.id]?.masteryScore || 0 }))
    .filter(t => t.score >= 70)
    .map(t => t.id);

  const effectiveWeakIds = manualWeakIds.length > 0 ? manualWeakIds : weakTopicsFromProgress;

  const toggleWeakTopic = (id: string) => {
    setManualWeakIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const generatePlan = async () => {
    setGenerating(true);
    toast.info("🧠 Generating your personalized study plan...");

    try {
      // Generate local plan first (instant)
      const localPlan = generateLocalPlan(examDate, dailyMinutes, effectiveWeakIds, strongTopicsFromProgress);
      setPlan(localPlan);
      setSelectedDay(0);

      // Then fetch AI advice
      const apiKey = settings.apiKey || process.env.NEXT_PUBLIC_GEMINI_KEY;
      if (apiKey) {
        const daysLeft = localPlan.daysLeft;
        const weakStr = localPlan.weakTopics.join(", ") || "none identified yet";
        const strongStr = localPlan.strongTopics.join(", ") || "none mastered yet";

        const advice = await callGeminiDirect(
          `Student profile:
- Days until CT exam: ${daysLeft}
- Daily study time: ${dailyMinutes} minutes
- Weak topics: ${weakStr}
- Strong topics: ${strongStr}
- Current XP: ${progress.xp}, Streak: ${progress.streak} days
- Questions attempted: ${progress.questionsAttempted}, Accuracy: ${
            progress.questionsAttempted > 0
              ? Math.round((progress.questionsCorrect / progress.questionsAttempted) * 100)
              : 0
          }%

Give a concise, motivating 3-paragraph study strategy:
1. Priority focus areas for this student
2. Daily study technique recommendations
3. Exam day advice

Be specific to DSA topics (stacks, queues, trees, BST, AVL, hashing). Keep each paragraph 2-3 sentences.`,
          "You are a DSA professor helping a student prepare for their CT exam. Give practical, actionable advice.",
          apiKey
        );
        setAiAdvice(advice);
        setPlan(prev => prev ? { ...prev, aiAdvice: advice } : null);
      }

      addXP(20, "study-plan-generated");
      toast.success("✅ Study plan ready! +20 XP");
    } catch (err) {
      toast.error("Plan generated locally. AI advice unavailable — check API key in Settings.");
    } finally {
      setGenerating(false);
    }
  };

  const markSessionDone = (sessionKey: string) => {
    setCompletedSessions(prev => {
      const next = new Set(prev);
      if (next.has(sessionKey)) { next.delete(sessionKey); return next; }
      next.add(sessionKey);
      addXP(10, "study-session-completed");
      toast.success("Session marked done! +10 XP");
      return next;
    });
  };

  const activityColors: Record<string, string> = {
    visualizer: "text-cyan-400 bg-cyan-500/10 border-cyan-500/20",
    mcq: "text-indigo-400 bg-indigo-500/10 border-indigo-500/20",
    long: "text-purple-400 bg-purple-500/10 border-purple-500/20",
    tutor: "text-green-400 bg-green-500/10 border-green-500/20",
    revision: "text-orange-400 bg-orange-500/10 border-orange-500/20",
    exam: "text-red-400 bg-red-500/10 border-red-500/20",
  };

  const priorityColors = {
    high: "text-red-400 bg-red-500/10 border border-red-500/20",
    medium: "text-yellow-400 bg-yellow-500/10 border border-yellow-500/20",
    low: "text-slate-400 bg-slate-500/10 border border-slate-500/20",
  };

  const minExamDate = new Date();
  minExamDate.setDate(minExamDate.getDate() + 1);

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-black gradient-text">📅 AI Study Plan Generator</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Personalized day-by-day study schedule based on your weak topics, available time, and exam date
        </p>
      </div>

      {/* Setup Form */}
      <div className="glass-card p-6">
        <div className="grid md:grid-cols-3 gap-6">
          {/* Exam Date */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-400" /> CT Exam Date
            </label>
            <input
              type="date"
              value={examDate}
              min={minExamDate.toISOString().split("T")[0]}
              onChange={e => setExamDate(e.target.value)}
              className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-200 text-sm"
            />
          </div>

          {/* Daily Time */}
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block flex items-center gap-2">
              <Clock className="w-4 h-4 text-orange-400" /> Daily Study Time
            </label>
            <div className="flex gap-2">
              {[30, 60, 90, 120].map(m => (
                <button key={m}
                  onClick={() => setDailyMinutes(m)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-medium border transition-all ${
                    dailyMinutes === m
                      ? "bg-orange-500/20 text-orange-300 border-orange-500/40"
                      : "bg-slate-800/40 text-slate-500 border-slate-700/40 hover:border-slate-600"
                  }`}
                >
                  {m}m
                </button>
              ))}
            </div>
          </div>

          {/* Generate Button */}
          <div className="flex flex-col justify-end">
            <button
              onClick={generatePlan}
              disabled={generating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
            >
              {generating ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
              ) : (
                <><Brain className="w-4 h-4" /> Generate My Plan</>
              )}
            </button>
          </div>
        </div>

        {/* Weak Topics Selection */}
        <div className="mt-5">
          <div className="flex items-center gap-2 mb-3">
            <AlertCircle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-slate-300">
              Weak Topics (auto-detected from your progress, or select manually)
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ALL_TOPICS.map(t => {
              const score = progress.topicMastery[t.id]?.masteryScore || 0;
              const autoWeak = weakTopicsFromProgress.includes(t.id);
              const manualSelected = manualWeakIds.includes(t.id);
              const isSelected = manualSelected || (autoWeak && manualWeakIds.length === 0);
              return (
                <button key={t.id}
                  onClick={() => toggleWeakTopic(t.id)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium border transition-all ${
                    isSelected
                      ? "bg-red-500/20 text-red-300 border-red-500/40"
                      : "bg-slate-800/40 text-slate-500 border-slate-700/40 hover:border-slate-600"
                  }`}
                >
                  {t.name} {score > 0 && <span className="opacity-60">({score}%)</span>}
                </button>
              );
            })}
          </div>
          {weakTopicsFromProgress.length === 0 && manualWeakIds.length === 0 && (
            <p className="text-xs text-slate-500 mt-2">
              No weak topics detected yet. Start practicing to get personalized recommendations.
            </p>
          )}
        </div>
      </div>

      {/* Generated Plan */}
      <AnimatePresence>
        {plan && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-6"
          >
            {/* Summary Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                { icon: Calendar, label: "Days Left", value: plan.daysLeft, color: "text-indigo-400", bg: "bg-indigo-500/10" },
                { icon: Clock, label: "Daily Goal", value: `${plan.dailyGoalMinutes}m`, color: "text-orange-400", bg: "bg-orange-500/10" },
                { icon: AlertCircle, label: "Weak Topics", value: plan.weakTopics.length, color: "text-red-400", bg: "bg-red-500/10" },
                { icon: Target, label: "Sessions Planned", value: plan.weeklyPlan.reduce((s, d) => s + d.sessions.length, 0), color: "text-green-400", bg: "bg-green-500/10" },
              ].map((s, i) => (
                <motion.div key={i} className="glass-card p-4"
                  initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.05 }}>
                  <div className={`w-9 h-9 rounded-xl ${s.bg} flex items-center justify-center mb-2`}>
                    <s.icon className={`w-5 h-5 ${s.color}`} />
                  </div>
                  <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                  <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
                </motion.div>
              ))}
            </div>

            {/* AI Advice */}
            {(aiAdvice || generating) && (
              <div className="glass-card p-5 border border-indigo-500/30 relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-purple-500/5" />
                <div className="relative">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-5 h-5 text-indigo-400" />
                    <h2 className="font-bold text-white">AI Professor Advice</h2>
                    {generating && <div className="w-3 h-3 border border-indigo-400/30 border-t-indigo-400 rounded-full animate-spin ml-1" />}
                  </div>
                  {aiAdvice ? (
                    <div className="text-sm text-slate-300 leading-relaxed prose prose-invert prose-sm max-w-none">
                      <ReactMarkdown>{aiAdvice}</ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-slate-400 text-sm">Fetching AI advice...</p>
                  )}
                </div>
              </div>
            )}

            {/* Daily Plan */}
            <div className="glass-card p-5">
              <div className="flex items-center gap-2 mb-4">
                <Layers className="w-5 h-5 text-purple-400" />
                <h2 className="font-bold text-white">
                  {plan.daysLeft <= 7 ? `Your ${plan.daysLeft}-Day Plan` : "Your 7-Day Plan"}
                </h2>
              </div>

              {/* Day tabs */}
              <div className="flex gap-2 mb-5 overflow-x-auto pb-2">
                {plan.weeklyPlan.map((day, i) => {
                  const done = day.sessions.filter(s =>
                    completedSessions.has(`${day.date}-${s.time}`)
                  ).length;
                  return (
                    <button key={i}
                      onClick={() => setSelectedDay(i)}
                      className={`flex-shrink-0 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                        selectedDay === i
                          ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40"
                          : day.isToday
                            ? "bg-green-500/15 text-green-400 border-green-500/30"
                            : "bg-white/5 text-slate-400 border-white/10 hover:border-white/20"
                      }`}
                    >
                      <div>{day.dayOfWeek}</div>
                      <div className="text-xs opacity-70">
                        {day.isToday ? "Today" : day.date.slice(5)}
                        {done > 0 && ` ✓${done}`}
                      </div>
                    </button>
                  );
                })}
              </div>

              {/* Selected Day Sessions */}
              {plan.weeklyPlan[selectedDay] && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="font-bold text-white">{plan.weeklyPlan[selectedDay].dayLabel}</h3>
                    <span className="text-xs text-slate-400">
                      Total: {plan.weeklyPlan[selectedDay].totalMinutes} min
                    </span>
                  </div>
                  <AnimatePresence>
                    {plan.weeklyPlan[selectedDay].sessions.map((session, si) => {
                      const key = `${plan.weeklyPlan[selectedDay].date}-${session.time}`;
                      const done = completedSessions.has(key);
                      return (
                        <motion.div key={si}
                          initial={{ opacity: 0, x: -10 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: si * 0.05 }}
                          className={`p-4 rounded-xl border transition-all ${
                            done
                              ? "bg-green-500/10 border-green-500/20 opacity-70"
                              : "bg-white/5 border-white/10"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex items-start gap-3 flex-1">
                              <div className="text-xs text-slate-500 w-10 flex-shrink-0 pt-0.5">
                                {session.time}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-2 flex-wrap mb-1">
                                  <span className={`font-semibold text-sm ${done ? "line-through text-slate-500" : "text-white"}`}>
                                    {session.topic}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${priorityColors[session.priority]}`}>
                                    {session.priority}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium border ${activityColors[session.activityType]}`}>
                                    {session.duration}m
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400">{session.activity}</p>
                                <p className="text-xs text-slate-500 mt-0.5 italic">{session.reason}</p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              <Link href={session.link}>
                                <button className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-1 ${
                                  activityColors[session.activityType]
                                } border`}>
                                  <Play className="w-3 h-3" />
                                  Start
                                </button>
                              </Link>
                              <button
                                onClick={() => markSessionDone(key)}
                                className={`p-1.5 rounded-lg transition-all border ${
                                  done
                                    ? "bg-green-500/20 text-green-400 border-green-500/30"
                                    : "bg-white/5 text-slate-400 border-white/10 hover:border-green-500/30"
                                }`}
                                title={done ? "Mark incomplete" : "Mark complete"}
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>

                  {plan.weeklyPlan[selectedDay].sessions.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <GraduationCap className="w-10 h-10 mx-auto mb-2 opacity-50" />
                      <p>Rest day — you&apos;ve earned it!</p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Topic Priority Summary */}
            <div className="grid md:grid-cols-2 gap-5">
              {/* Weak Topics */}
              {plan.weakTopics.length > 0 && (
                <div className="glass-card p-4 border border-red-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="w-4 h-4 text-red-400" />
                    <h3 className="font-bold text-white text-sm">🔴 Prioritize These Topics</h3>
                  </div>
                  <div className="space-y-1">
                    {plan.weakTopics.map((t, i) => {
                      const topicObj = ALL_TOPICS.find(x => x.name === t);
                      return (
                        <div key={i} className="flex items-center justify-between gap-2 p-2 bg-red-500/10 rounded-lg">
                          <span className="text-sm text-slate-200">{t}</span>
                          {topicObj && TOPIC_VISUALIZER_MAP[topicObj.id] && (
                            <Link href={TOPIC_VISUALIZER_MAP[topicObj.id]}>
                              <button className="text-xs text-red-400 hover:text-red-300">Study →</button>
                            </Link>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Strong Topics */}
              {plan.strongTopics.length > 0 && (
                <div className="glass-card p-4 border border-green-500/20">
                  <div className="flex items-center gap-2 mb-3">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    <h3 className="font-bold text-white text-sm">✅ Strong — Maintain These</h3>
                  </div>
                  <div className="space-y-1">
                    {plan.strongTopics.slice(0, 5).map((t, i) => (
                      <div key={i} className="flex items-center gap-2 p-2 bg-green-500/10 rounded-lg">
                        <span className="text-sm text-slate-200">{t}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Regenerate */}
            <div className="text-center">
              <button
                onClick={generatePlan}
                disabled={generating}
                className="px-6 py-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-sm hover:bg-white/10 transition-all flex items-center gap-2 mx-auto"
              >
                <RefreshCcw className="w-4 h-4" /> Regenerate Plan
              </button>
              <p className="text-xs text-slate-500 mt-2">
                Generated: {new Date(plan.generatedAt).toLocaleString()}
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {!plan && !generating && (
        <div className="text-center py-16 glass-card">
          <div className="text-6xl mb-4">📅</div>
          <h2 className="text-xl font-bold text-white mb-2">No Plan Generated Yet</h2>
          <p className="text-slate-400 text-sm mb-6 max-w-md mx-auto">
            Set your exam date, available study time, and select your weak topics above, then click Generate.
          </p>
          <div className="flex gap-3 justify-center">
            <Link href="/analytics">
              <button className="px-4 py-2 rounded-xl bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-sm flex items-center gap-2 hover:bg-indigo-500/30 transition-all">
                <Target className="w-4 h-4" /> Check Analytics First
              </button>
            </Link>
            <Link href="/dashboard/revision">
              <button className="px-4 py-2 rounded-xl bg-orange-500/20 text-orange-300 border border-orange-500/30 text-sm flex items-center gap-2 hover:bg-orange-500/30 transition-all">
                <RefreshCcw className="w-4 h-4" /> Review Revision Schedule
              </button>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
