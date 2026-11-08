"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, LayoutDashboard, Layers, GitBranch, TreePine, Hash,
  BookOpen, Target, BarChart3, Trophy, Zap, Settings, Menu, X,
  Code, Cpu, GraduationCap, FlaskConical, Star, ChevronDown,
  Flame, Shield, Calendar, User
} from "lucide-react";
import { useProgressStore } from "@/lib/stores/progress-store";
import { RANK_INFO } from "@/lib/constants";

const NAV_ITEMS = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Dashboard", color: "text-indigo-400" },
  {
    label: "AI Tutor",
    icon: Brain,
    color: "text-purple-400",
    children: [
      { href: "/tutor", label: "DSA Buddy Chat", icon: Brain },
      { href: "/tutor/viva", label: "Viva Trainer", icon: GraduationCap },
      { href: "/tutor/algorithm", label: "Algorithm Lab", icon: Cpu },
      { href: "/tutor/code-analyzer", label: "Code Analyzer", icon: Code },
      { href: "/tutor/pseudocode", label: "Pseudocode Tutor", icon: FlaskConical },
    ],
  },
  {
    label: "Visualizers",
    icon: Layers,
    color: "text-cyan-400",
    children: [
      { href: "/visualizer/stack", label: "Stack Lab", icon: Layers },
      { href: "/visualizer/queue", label: "Queue Suite", icon: GitBranch },
      { href: "/visualizer/recursion", label: "Recursion", icon: GitBranch },
      { href: "/visualizer/infix-postfix", label: "Infix/Postfix Lab", icon: FlaskConical },
      { href: "/visualizer/balancing", label: "Symbol Checker", icon: Shield },
      { href: "/visualizer/tree", label: "Tree Lab", icon: TreePine },
      { href: "/visualizer/bst", label: "BST Master", icon: TreePine },
      { href: "/visualizer/avl", label: "AVL Master ⭐", icon: Star },
      { href: "/visualizer/traversal", label: "Tree Traversal", icon: TreePine },
      { href: "/visualizer/hashing", label: "Hashing Lab", icon: Hash },
      { href: "/visualizer/collision", label: "Collision Lab", icon: Hash },
    ],
  },
  {
    label: "Questions",
    icon: BookOpen,
    color: "text-green-400",
    children: [
      { href: "/questions", label: "Question Bank", icon: BookOpen },
      { href: "/questions/mcq", label: "MCQ Generator", icon: BookOpen },
      { href: "/questions/short", label: "Short Answers", icon: BookOpen },
      { href: "/questions/long", label: "Long Answers", icon: BookOpen },
      { href: "/questions/hots", label: "HOTS Questions", icon: Zap },
    ],
  },
  { href: "/exam", icon: Target, label: "Exam Mode", color: "text-red-400" },
  { href: "/exam/paper-generator", icon: GraduationCap, label: "Paper Generator", color: "text-orange-400" },
  { href: "/challenge", icon: Flame, label: "Daily Challenge", color: "text-yellow-400" },
  { href: "/analytics", icon: BarChart3, label: "Analytics", color: "text-pink-400" },
  { href: "/study-plan", icon: Calendar, label: "Study Plan 📅", color: "text-teal-400" },
  { href: "/leaderboard", icon: Trophy, label: "Leaderboard 🏆", color: "text-yellow-400" },
  { href: "/profile", icon: User, label: "My Profile", color: "text-slate-300" },
  {
    label: "Progress",
    icon: Trophy,
    color: "text-yellow-400",
    children: [
      { href: "/dashboard/achievements", label: "Achievements 🏆", icon: Trophy },
      { href: "/dashboard/revision", label: "Spaced Revision 📅", icon: BarChart3 },
    ],
  },
  { href: "/settings", icon: Settings, label: "AI Settings", color: "text-slate-400" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});
  const pathname = usePathname();
  const { progress, updateStreak } = useProgressStore();

  useEffect(() => {
    updateStreak();
  }, []);

  const rankInfo = RANK_INFO[progress.rank];

  const toggleGroup = (label: string) => {
    setExpandedGroups(prev => ({ ...prev, [label]: !prev[label] }));
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="flex h-screen bg-[#030712] overflow-hidden">
      {/* Sidebar Overlay (mobile) */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 glass border-r border-indigo-500/10 flex flex-col ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        } transition-transform duration-300`}
      >
        {/* Logo */}
        <div className="p-4 border-b border-indigo-500/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center glow-primary flex-shrink-0">
              <Brain className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="font-black text-sm gradient-text">DSA CT Master</div>
              <div className="text-xs text-slate-500">AI Learning Platform</div>
            </div>
          </div>
        </div>

        {/* User stats */}
        <div className="p-3 border-b border-indigo-500/10">
          <div className="glass-card p-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-xs font-bold">
                {progress.level}
              </div>
              <div>
                <div className="text-xs font-semibold text-white">Level {progress.level}</div>
                <div className="text-xs text-slate-400 capitalize">{rankInfo.emoji} {rankInfo.label}</div>
              </div>
            </div>
            <div className="text-right">
              <div className="text-xs font-bold text-indigo-400">{progress.xp} XP</div>
              <div className="flex items-center gap-1 text-orange-400 text-xs">
                <Flame className="w-3 h-3" />
                {progress.streak}
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-2 space-y-0.5">
          {NAV_ITEMS.map((item, i) => {
            if ("children" in item && item.children) {
              const isExpanded = expandedGroups[item.label];
              const isAnyChildActive = item.children.some(c => isActive(c.href));

              return (
                <div key={i}>
                  <button
                    onClick={() => toggleGroup(item.label)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                      isAnyChildActive
                        ? "bg-indigo-500/15 text-white"
                        : "text-slate-400 hover:bg-white/5 hover:text-white"
                    }`}
                  >
                    <item.icon className={`w-4 h-4 ${item.color} flex-shrink-0`} />
                    <span className="flex-1 text-left">{item.label}</span>
                    <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                      >
                        <div className="ml-4 mt-0.5 space-y-0.5">
                          {item.children.map((child, j) => (
                            <Link key={j} href={child.href}>
                              <div
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-all ${
                                  isActive(child.href)
                                    ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                                }`}
                                onClick={() => setSidebarOpen(false)}
                              >
                                <child.icon className="w-3.5 h-3.5 flex-shrink-0" />
                                {child.label}
                              </div>
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            return (
              <Link key={i} href={(item as any).href}>
                <div
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isActive((item as any).href)
                      ? "bg-indigo-500/20 text-indigo-300 border border-indigo-500/30"
                      : "text-slate-400 hover:bg-white/5 hover:text-white"
                  }`}
                  onClick={() => setSidebarOpen(false)}
                >
                  <item.icon className={`w-4 h-4 ${(item as any).color} flex-shrink-0`} />
                  {item.label}
                </div>
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-indigo-500/10">
          <div className="text-center text-xs text-slate-600">
            Powered by Gemini AI · v1.0
          </div>
        </div>
      </motion.aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="glass border-b border-indigo-500/10 px-4 py-3 flex items-center gap-3 flex-shrink-0">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="lg:hidden p-2 rounded-lg hover:bg-white/5 transition-colors"
          >
            {sidebarOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
          <div className="flex-1" />
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-2 glass-card px-3 py-1.5">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-sm font-bold text-orange-400">{progress.streak} day streak</span>
            </div>
            <div className="glass-card px-3 py-1.5 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-indigo-400" />
              <span className="text-sm font-bold gradient-text">{progress.xp} XP</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          <div className="particle-bg min-h-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
