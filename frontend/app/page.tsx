"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Brain, Zap, Target, Trophy, BookOpen, Code, TreePine,
  Hash, Layers, GitBranch, ChevronRight, Star, Users,
  TrendingUp, Shield, Cpu, BarChart3, ArrowRight, Sparkles,
  Play, GraduationCap
} from "lucide-react";

const features = [
  { icon: Brain, title: "AI Personal Tutor", desc: "DSA Buddy teaches like a friend — simple, technical, or exam-mode", color: "text-indigo-400", bg: "bg-indigo-500/10", href: "/tutor" },
  { icon: Layers, title: "Stack & Queue Lab", desc: "Watch push, pop, peek animate in real-time with step control", color: "text-purple-400", bg: "bg-purple-500/10", href: "/visualizer/stack" },
  { icon: GitBranch, title: "Recursion Visualizer", desc: "See function calls, call stack, and Tower of Hanoi live", color: "text-cyan-400", bg: "bg-cyan-500/10", href: "/visualizer/recursion" },
  { icon: TreePine, title: "BST & AVL Master", desc: "Insert, delete, rotate AVL trees step-by-step with explanations", color: "text-green-400", bg: "bg-green-500/10", href: "/visualizer/avl" },
  { icon: Hash, title: "Hashing Lab", desc: "Division, Multiplication, Mid-Square, Folding, Chaining, Probing", color: "text-orange-400", bg: "bg-orange-500/10", href: "/visualizer/hashing" },
  { icon: Target, title: "AI Exam Mode", desc: "CT Tests, Mock Exams with auto evaluation and leaderboard", color: "text-red-400", bg: "bg-red-500/10", href: "/exam" },
  { icon: BookOpen, title: "Question Bank", desc: "MCQ, 2M, 5M, 8M, 13M, 15M, HOTS — unlimited AI-generated", color: "text-pink-400", bg: "bg-pink-500/10", href: "/questions" },
  { icon: BarChart3, title: "Analytics Dashboard", desc: "Study heatmap, mastery scores, weak topics, CT prediction", color: "text-yellow-400", bg: "bg-yellow-500/10", href: "/analytics" },
];

const stats = [
  { label: "DSA Topics Covered", value: "40+", icon: BookOpen },
  { label: "AI-Generated Questions", value: "∞", icon: Sparkles },
  { label: "Visualizers Built", value: "12", icon: Code },
  { label: "Exam Patterns", value: "5", icon: Target },
];

const syllabus = [
  { unit: "UNIT 3", topics: ["Stack ADT", "Queue ADT", "Infix ↔ Postfix", "Recursion", "Tower of Hanoi", "Circular Queue", "Priority Queue", "Round Robin"], color: "border-indigo-500/40 bg-indigo-500/5" },
  { unit: "UNIT 4", topics: ["Binary Search Tree", "AVL Tree (LL/RR/LR/RL)", "Tree Traversals", "Hashing Methods", "Collision Resolution", "Tree Terminology", "BST Operations", "Open Addressing"], color: "border-purple-500/40 bg-purple-500/5" },
];

const ranks = [
  { name: "Bronze", color: "text-orange-700" },
  { name: "Silver", color: "text-slate-300" },
  { name: "Gold", color: "text-yellow-400" },
  { name: "Platinum", color: "text-slate-200" },
  { name: "Diamond", color: "text-cyan-300" },
  { name: "Legend", color: "gradient-text" },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-animated particle-bg">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass border-b border-indigo-500/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center glow-primary">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-lg gradient-text">DSA CT Master</span>
          </div>
          <div className="hidden md:flex items-center gap-6">
            <Link href="/dashboard" className="text-slate-400 hover:text-white transition-colors text-sm">Dashboard</Link>
            <Link href="/tutor" className="text-slate-400 hover:text-white transition-colors text-sm">AI Tutor</Link>
            <Link href="/visualizer" className="text-slate-400 hover:text-white transition-colors text-sm">Visualizers</Link>
            <Link href="/exam" className="text-slate-400 hover:text-white transition-colors text-sm">Exam Mode</Link>
          </div>
          <Link href="/dashboard">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold text-sm glow-primary hover:from-indigo-600 hover:to-purple-700 transition-all"
            >
              Start Learning →
            </motion.button>
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 relative">
        <div className="max-w-6xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full glass border border-indigo-500/30 text-sm text-indigo-300 mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered DSA Learning — Unit 3 & Unit 4
            </div>
          </motion.div>

          <motion.h1
            className="text-5xl md:text-7xl font-black mb-6 leading-tight"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1 }}
          >
            <span className="text-white">From Average to</span>
            <br />
            <span className="gradient-text">University Topper</span>
          </motion.h1>

          <motion.p
            className="text-xl text-slate-400 max-w-3xl mx-auto mb-10 leading-relaxed"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
          >
            The world's most comprehensive AI-powered DSA learning system.
            <span className="text-indigo-400"> Teaches</span>,{" "}
            <span className="text-purple-400">Visualizes</span>,{" "}
            <span className="text-cyan-400">Tests</span>,{" "}
            <span className="text-green-400">Adapts</span>, and{" "}
            <span className="text-pink-400">Masters</span>{" "}
            every concept until you're exam-ready.
          </motion.p>

          <motion.div
            className="flex flex-col sm:flex-row gap-4 justify-center"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.3 }}
          >
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05, boxShadow: "0 0 40px rgba(99,102,241,0.5)" }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg flex items-center gap-2 group"
              >
                <Play className="w-5 h-5" />
                Start Your Journey
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
            </Link>
            <Link href="/visualizer">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 rounded-2xl glass border border-indigo-500/30 text-indigo-300 font-bold text-lg flex items-center gap-2 hover:border-indigo-500/60 transition-all"
              >
                <Layers className="w-5 h-5" />
                Explore Visualizers
              </motion.button>
            </Link>
          </motion.div>

          {/* Stats */}
          <motion.div
            className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-16"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.5 }}
          >
            {stats.map((stat, i) => (
              <div key={i} className="glass-card p-6 text-center">
                <stat.icon className="w-6 h-6 text-indigo-400 mx-auto mb-2" />
                <div className="text-3xl font-black gradient-text">{stat.value}</div>
                <div className="text-slate-400 text-sm mt-1">{stat.label}</div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="py-20 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-white mb-4">30 Powerful Features</h2>
            <p className="text-slate-400 text-lg">Every tool you need to ace your CT examination</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {features.map((feature, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                viewport={{ once: true }}
              >
                <Link href={feature.href}>
                  <div className="glass-card p-6 h-full hover:border-indigo-500/40 transition-all group cursor-pointer">
                    <div className={`w-12 h-12 rounded-xl ${feature.bg} flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <feature.icon className={`w-6 h-6 ${feature.color}`} />
                    </div>
                    <h3 className="font-bold text-white mb-2 group-hover:text-indigo-300 transition-colors">{feature.title}</h3>
                    <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                    <div className="flex items-center gap-1 mt-4 text-indigo-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                      Explore <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Syllabus Coverage */}
      <section className="py-20 px-4">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-black text-white mb-4">Complete Syllabus Coverage</h2>
            <p className="text-slate-400">Every topic from Unit 3 & Unit 4 — mastered completely</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            {syllabus.map((unit, i) => (
              <motion.div
                key={i}
                className={`glass-card p-6 border ${unit.color}`}
                initial={{ opacity: 0, x: i === 0 ? -20 : 20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
              >
                <h3 className="font-black text-lg gradient-text mb-4">{unit.unit}</h3>
                <div className="grid grid-cols-2 gap-2">
                  {unit.topics.map((topic, j) => (
                    <div key={j} className="flex items-center gap-2 text-sm">
                      <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                      <span className="text-slate-300">{topic}</span>
                    </div>
                  ))}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Ranks System */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-4xl font-black text-white mb-4">Rank Up As You Learn</h2>
          <p className="text-slate-400 mb-10">Earn XP, unlock achievements, climb the ranks from Bronze to Legend</p>
          <div className="flex flex-wrap justify-center gap-4">
            {ranks.map((rank, i) => (
              <motion.div
                key={i}
                className="glass-card px-6 py-4 flex items-center gap-2"
                initial={{ opacity: 0, scale: 0.9 }}
                whileInView={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.1 }}
                viewport={{ once: true }}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <Trophy className={`w-5 h-5 ${rank.color}`} />
                <span className={`font-bold ${rank.color}`}>{rank.name}</span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-4">
        <div className="max-w-4xl mx-auto">
          <motion.div
            className="glass-card p-12 text-center border border-indigo-500/30 relative overflow-hidden"
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-purple-500/5" />
            <GraduationCap className="w-16 h-16 text-indigo-400 mx-auto mb-6" />
            <h2 className="text-4xl font-black text-white mb-4">Ready to Top Your CT?</h2>
            <p className="text-slate-400 text-lg mb-8">
              Join thousands of students who transformed their DSA skills with AI-powered learning.
              Your exam success starts here.
            </p>
            <Link href="/dashboard">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-10 py-4 rounded-2xl bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-bold text-xl glow-primary"
              >
                Begin My DSA Mastery Journey 🚀
              </motion.button>
            </Link>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 border-t border-slate-800 text-center text-slate-500 text-sm">
        <p>DSA CT Master — Powered by Gemini AI · Built for University Toppers</p>
      </footer>
    </div>
  );
}
