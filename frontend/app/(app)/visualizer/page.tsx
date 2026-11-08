"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  Layers, GitBranch, TreePine, Hash, FlaskConical, Shield,
  Star, ArrowRight, Zap
} from "lucide-react";

const VISUALIZER_GROUPS = [
  {
    unit: "UNIT 3 — Stack, Queue & Recursion",
    color: "border-indigo-500/30",
    items: [
      { icon: Layers, title: "Stack Visualizer", desc: "Push, Pop, Peek with animated step-by-step view", href: "/visualizer/stack", badge: "Interactive", color: "text-indigo-400", bg: "bg-indigo-500/10" },
      { icon: GitBranch, title: "Queue Suite", desc: "Linear, Circular, Priority Queue & Deque", href: "/visualizer/queue", badge: "4-in-1", color: "text-purple-400", bg: "bg-purple-500/10" },
      { icon: GitBranch, title: "Recursion Visualizer", desc: "Call stack, Tower of Hanoi, recursive trees", href: "/visualizer/recursion", badge: "Animated", color: "text-cyan-400", bg: "bg-cyan-500/10" },
      { icon: FlaskConical, title: "Infix/Postfix Lab", desc: "Conversion, evaluation with stack animations", href: "/visualizer/infix-postfix", badge: "Step-by-Step", color: "text-blue-400", bg: "bg-blue-500/10" },
      { icon: Shield, title: "Symbol Balancer", desc: "Live balancing checker with error highlighting", href: "/visualizer/balancing", badge: "Live", color: "text-green-400", bg: "bg-green-500/10" },
    ],
  },
  {
    unit: "UNIT 4 — Trees, AVL & Hashing",
    color: "border-purple-500/30",
    items: [
      { icon: TreePine, title: "Tree Lab", desc: "Interactive tree builder — learn all terminology", href: "/visualizer/tree", badge: "Interactive", color: "text-teal-400", bg: "bg-teal-500/10" },
      { icon: TreePine, title: "BST Master Lab", desc: "Insert, search, delete with path animation", href: "/visualizer/bst", badge: "Full-Featured", color: "text-green-400", bg: "bg-green-500/10" },
      { icon: Star, title: "AVL Tree Master", desc: "LL, RR, LR, RL rotations visualized perfectly", href: "/visualizer/avl", badge: "⭐ EXAM KEY", color: "text-yellow-400", bg: "bg-yellow-500/10" },
      { icon: TreePine, title: "Tree Traversal", desc: "Inorder, Preorder, Postorder with quiz mode", href: "/visualizer/traversal", badge: "Quiz Mode", color: "text-orange-400", bg: "bg-orange-500/10" },
      { icon: Hash, title: "Hashing Lab", desc: "5 methods: Division, Multiplication, Mid-Square...", href: "/visualizer/hashing", badge: "5 Methods", color: "text-pink-400", bg: "bg-pink-500/10" },
      { icon: Hash, title: "Collision Lab", desc: "Chaining, Linear, Quadratic, Double Hashing", href: "/visualizer/collision", badge: "4 Methods", color: "text-red-400", bg: "bg-red-500/10" },
    ],
  },
];

export default function VisualizerPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black gradient-text">Visualization Lab</h1>
        <p className="text-slate-400 mt-2">Master every DSA concept through interactive animations and step-by-step visualizations</p>
      </div>

      <div className="space-y-8">
        {VISUALIZER_GROUPS.map((group, gi) => (
          <div key={gi}>
            <h2 className={`text-sm font-bold uppercase tracking-widest mb-4 px-3 py-2 rounded-xl inline-block border ${group.color} text-slate-300`}>
              {group.unit}
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.items.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: (gi * 5 + i) * 0.04 }}
                  whileHover={{ scale: 1.02, y: -3 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <Link href={item.href}>
                    <div className="glass-card p-5 h-full cursor-pointer group relative overflow-hidden">
                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-11 h-11 rounded-xl ${item.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                          <item.icon className={`w-5 h-5 ${item.color}`} />
                        </div>
                        <span className={`text-xs font-bold px-2 py-1 rounded-full ${
                          item.badge.includes("EXAM") ? "bg-yellow-500/20 text-yellow-400 border border-yellow-500/30" : "bg-white/5 text-slate-400"
                        }`}>{item.badge}</span>
                      </div>
                      <h3 className="font-bold text-white mb-1 group-hover:text-indigo-300 transition-colors">{item.title}</h3>
                      <p className="text-slate-400 text-sm leading-relaxed">{item.desc}</p>
                      <div className="flex items-center gap-1 mt-4 text-indigo-400 text-sm font-medium opacity-0 group-hover:opacity-100 transition-opacity">
                        Open Visualizer <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </Link>
                </motion.div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
