"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Brain, Layers, TreePine, Hash, Target, BookOpen, BarChart3,
  Flame, Trophy, TrendingUp, Zap, ArrowRight, Star, Clock,
  CheckCircle, XCircle, AlertCircle, GitBranch, FlaskConical
} from "lucide-react";
import { useProgressStore } from "@/lib/stores/progress-store";
import { DSA_TOPICS, RANK_INFO } from "@/lib/constants";

const QUICK_ACTIONS = [
  { icon: Brain, label: "Chat with DSA Buddy", href: "/tutor", color: "from-indigo-500 to-purple-600", desc: "AI-powered tutoring" },
  { icon: Star, label: "AVL Tree Master", href: "/visualizer/avl", color: "from-yellow-500 to-orange-500", desc: "Most important topic" },
  { icon: Target, label: "Take a CT Test", href: "/exam", color: "from-red-500 to-pink-600", desc: "Test your knowledge" },
  { icon: Flame, label: "Daily Challenge", href: "/challenge", color: "from-orange-500 to-red-500", desc: "Today's challenge" },
];

const TOPIC_CARDS = [
  { icon: Layers, label: "Stack Lab", href: "/visualizer/stack", color: "text-indigo-400", bg: "bg-indigo-500/10", unit: "Unit 3" },
  { icon: GitBranch, label: "Queue Suite", href: "/visualizer/queue", color: "text-purple-400", bg: "bg-purple-500/10", unit: "Unit 3" },
  { icon: GitBranch, label: "Recursion", href: "/visualizer/recursion", color: "text-cyan-400", bg: "bg-cyan-500/10", unit: "Unit 3" },
  { icon: FlaskConical, label: "Infix/Postfix", href: "/visualizer/infix-postfix", color: "text-blue-400", bg: "bg-blue-500/10", unit: "Unit 3" },
  { icon: TreePine, label: "BST Master", href: "/visualizer/bst", color: "text-green-400", bg: "bg-green-500/10", unit: "Unit 4" },
  { icon: Star, label: "AVL Master", href: "/visualizer/avl", color: "text-yellow-400", bg: "bg-yellow-500/10", unit: "Unit 4" },
  { icon: TreePine, label: "Tree Traversal", href: "/visualizer/traversal", color: "text-teal-400", bg: "bg-teal-500/10", unit: "Unit 4" },
  { icon: Hash, label: "Hashing Lab", href: "/visualizer/hashing", color: "text-orange-400", bg: "bg-orange-500/10", unit: "Unit 4" },
];

export default function DashboardPage() {
  const { progress } = useProgressStore();
  const rankInfo = RANK_INFO[progress.rank];

  const accuracy = progress.questionsAttempted > 0
    ? Math.round((progress.questionsCorrect / progress.questionsAttempted) * 100)
    : 0;

  const allTopics = [...DSA_TOPICS.unit3, ...DSA_TOPICS.unit4];
  const masteredCount = Object.values(progress.topicMastery).filter(t => t.masteryScore >= 80).length;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Welcome Banner */}
      <motion.div
        className="glass-card p-6 relative overflow-hidden border border-indigo-500/20"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
      >
        <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 via-purple-500/5 to-pink-500/5" />
        <div className="relative flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-black text-white mb-1">
              Welcome back! 🚀
            </h1>
            <p className="text-slate-400">
              Ready to conquer Unit 3 & Unit 4? Your exam success starts here.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-center">
              <div className="text-3xl font-black gradient-text">{progress.level}</div>
              <div className="text-xs text-slate-400">Level</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-black text-orange-400">{progress.streak}</div>
              <div className="text-xs text-slate-400 flex items-center gap-1"><Flame className="w-3 h-3" /> Streak</div>
            </div>
            <div className="text-center">
              <div className="text-2xl">{rankInfo.emoji}</div>
              <div className="text-xs text-slate-400">{rankInfo.label}</div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { icon: Trophy, label: "Total XP", value: progress.xp.toLocaleString(), color: "text-indigo-400", bg: "bg-indigo-500/10" },
          { icon: CheckCircle, label: "Questions Done", value: progress.questionsAttempted, color: "text-green-400", bg: "bg-green-500/10" },
          { icon: TrendingUp, label: "Accuracy", value: `${accuracy}%`, color: "text-cyan-400", bg: "bg-cyan-500/10" },
          { icon: BookOpen, label: "Topics Mastered", value: `${masteredCount}/${allTopics.length}`, color: "text-purple-400", bg: "bg-purple-500/10" },
        ].map((stat, i) => (
          <motion.div
            key={i}
            className="glass-card p-4"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
          >
            <div className={`w-10 h-10 rounded-xl ${stat.bg} flex items-center justify-center mb-3`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div className="text-2xl font-black text-white">{stat.value}</div>
            <div className="text-sm text-slate-400 mt-1">{stat.label}</div>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-lg font-bold text-white mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {QUICK_ACTIONS.map((action, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ scale: 1.02, y: -2 }}
              whileTap={{ scale: 0.98 }}
            >
              <Link href={action.href}>
                <div className={`glass-card p-5 cursor-pointer group relative overflow-hidden`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${action.color} opacity-5 group-hover:opacity-10 transition-opacity`} />
                  <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${action.color} flex items-center justify-center mb-3`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <div className="font-semibold text-white text-sm">{action.label}</div>
                  <div className="text-xs text-slate-400 mt-1">{action.desc}</div>
                  <ArrowRight className="w-4 h-4 text-slate-500 mt-3 group-hover:text-indigo-400 group-hover:translate-x-1 transition-all" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Topic Cards */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-white">All Visualizers</h2>
          <Link href="/visualizer" className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1">
            View all <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TOPIC_CARDS.map((card, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.2 + i * 0.03 }}
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
            >
              <Link href={card.href}>
                <div className="glass-card p-4 cursor-pointer group">
                  <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center mb-3`}>
                    <card.icon className={`w-4 h-4 ${card.color}`} />
                  </div>
                  <div className="font-semibold text-sm text-white group-hover:text-indigo-300 transition-colors">{card.label}</div>
                  <div className={`text-xs mt-1 px-2 py-0.5 rounded-full inline-block ${
                    card.unit === "Unit 3"
                      ? "bg-indigo-500/15 text-indigo-400"
                      : "bg-purple-500/15 text-purple-400"
                  }`}>{card.unit}</div>
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Mastery Progress */}
      <div className="glass-card p-6">
        <h2 className="text-lg font-bold text-white mb-4">Topic Mastery</h2>
        <div className="space-y-3">
          {allTopics.slice(0, 6).map((topic, i) => {
            const mastery = progress.topicMastery[topic.id];
            const score = mastery?.masteryScore || 0;
            return (
              <div key={i}>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="text-sm text-slate-300">{topic.name}</span>
                  <span className={`text-xs font-bold ${
                    score >= 80 ? "text-green-400" :
                    score >= 50 ? "text-yellow-400" : "text-slate-500"
                  }`}>{score}%</span>
                </div>
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full ${
                      score >= 80 ? "bg-gradient-to-r from-green-500 to-emerald-400" :
                      score >= 50 ? "bg-gradient-to-r from-yellow-500 to-orange-400" :
                      "bg-gradient-to-r from-indigo-500 to-purple-500"
                    }`}
                    initial={{ width: 0 }}
                    animate={{ width: `${score}%` }}
                    transition={{ duration: 1, delay: i * 0.1 }}
                  />
                </div>
              </div>
            );
          })}
        </div>
        <Link href="/analytics">
          <button className="mt-4 w-full py-2 text-sm text-indigo-400 hover:text-indigo-300 border border-indigo-500/20 hover:border-indigo-500/40 rounded-xl transition-all">
            View Full Analytics →
          </button>
        </Link>
      </div>
    </div>
  );
}
