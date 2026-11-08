"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { TreePine, Info, ChevronRight } from "lucide-react";

interface TreeNode {
  id: number;
  value: string | number;
  children: number[];
  x: number;
  y: number;
}

const TERM_EXPLANATIONS = [
  { term: "Root", def: "Topmost node with no parent", example: "In a file system, the drive C:\\ is the root", exam: "Root has degree = number of children" },
  { term: "Parent", def: "A node that has children", example: "If A→B, then A is parent of B", exam: "Every node except root has exactly one parent" },
  { term: "Child", def: "A node with a parent", example: "If A→B, then B is child of A", exam: "A node can have 0 or more children" },
  { term: "Sibling", def: "Nodes with the same parent", example: "B and C are siblings if both are children of A", exam: "Common in exam: 'Find siblings of node X'" },
  { term: "Degree", def: "Number of children of a node", example: "If A has 3 children: degree(A) = 3", exam: "Degree of tree = max degree among all nodes" },
  { term: "Level", def: "Distance from root (root is level 1 or 0)", example: "Root=Level 1, root's children=Level 2", exam: "Some books start from level 0, clarify in exam" },
  { term: "Height", def: "Length of longest path from node to leaf", example: "Height of tree = height of root", exam: "Leaf height = 0, empty tree height = -1" },
  { term: "Depth", def: "Length of path from root to that node", example: "Depth of root = 0", exam: "Depth and Level are related: Level = Depth + 1" },
  { term: "Subtree", def: "A node and all its descendants", example: "Every node is root of its own subtree", exam: "BST property must hold for all subtrees" },
  { term: "Leaf", def: "A node with no children (degree = 0)", example: "End nodes of a tree are leaves", exam: "Also called external nodes" },
];

export default function TreeLabPage() {
  const [selectedTerm, setSelectedTerm] = useState<typeof TERM_EXPLANATIONS[0] | null>(null);

  // Simple example tree
  const exampleTree = {
    nodes: [
      { id: 1, label: "A", x: 300, y: 60, level: 1 },
      { id: 2, label: "B", x: 150, y: 140, level: 2 },
      { id: 3, label: "C", x: 300, y: 140, level: 2 },
      { id: 4, label: "D", x: 450, y: 140, level: 2 },
      { id: 5, label: "E", x: 80, y: 220, level: 3 },
      { id: 6, label: "F", x: 200, y: 220, level: 3 },
      { id: 7, label: "G", x: 380, y: 220, level: 3 },
      { id: 8, label: "H", x: 520, y: 220, level: 3 },
    ],
    edges: [
      [1, 2], [1, 3], [1, 4],
      [2, 5], [2, 6],
      [4, 7], [4, 8],
    ],
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black gradient-text">Tree Terminology Lab</h1>
        <p className="text-slate-400 mt-1">Learn all tree concepts interactively — click any term to see it highlighted on the tree</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Tree Visual */}
        <div className="space-y-4">
          <div className="glass-card p-6">
            <h2 className="font-bold text-white mb-4">Interactive Example Tree</h2>
            <svg viewBox="0 0 600 300" className="w-full border border-white/5 rounded-xl bg-black/20">
              {/* Edges */}
              {exampleTree.edges.map(([from, to], i) => {
                const fromNode = exampleTree.nodes.find(n => n.id === from)!;
                const toNode = exampleTree.nodes.find(n => n.id === to)!;
                return (
                  <line key={i} x1={fromNode.x} y1={fromNode.y} x2={toNode.x} y2={toNode.y}
                    stroke="rgba(99,102,241,0.4)" strokeWidth="2" />
                );
              })}
              {/* Nodes */}
              {exampleTree.nodes.map((node) => (
                <g key={node.id}>
                  <circle cx={node.x} cy={node.y} r="22"
                    fill="rgba(99,102,241,0.2)"
                    stroke={node.id === 1 ? "#10b981" : "rgba(99,102,241,0.6)"}
                    strokeWidth={node.id === 1 ? "3" : "2"} />
                  <text x={node.x} y={node.y + 5} textAnchor="middle"
                    fill="#e2e8f0" fontSize="14" fontWeight="bold">
                    {node.label}
                  </text>
                  {/* Level labels */}
                  {node.id <= 4 && (
                    <text x={node.x} y={node.y + 36} textAnchor="middle"
                      fill="rgba(148,163,184,0.5)" fontSize="10">
                      L{node.level}
                    </text>
                  )}
                </g>
              ))}
              {/* Annotations */}
              <text x="30" y="65" fill="#10b981" fontSize="11" fontWeight="bold">Root (A)</text>
              <text x="30" y="145" fill="#94a3b8" fontSize="10">Level 2</text>
              <text x="30" y="225" fill="#94a3b8" fontSize="10">Level 3 (Leaves)</text>
            </svg>

            {/* Tree facts */}
            <div className="mt-4 grid grid-cols-2 gap-2 text-xs">
              {[
                { label: "Root", value: "A" },
                { label: "Height", value: "2 (from root)" },
                { label: "Degree of A", value: "3 (B,C,D)" },
                { label: "Degree of tree", value: "3" },
                { label: "Leaves", value: "C, E, F, G, H" },
                { label: "Siblings of B", value: "C, D" },
              ].map((f, i) => (
                <div key={i} className="bg-white/5 p-2 rounded-lg flex justify-between">
                  <span className="text-slate-400">{f.label}:</span>
                  <span className="text-indigo-300 font-bold">{f.value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Term Detail */}
          {selectedTerm && (
            <motion.div
              className="glass-card p-5 border border-indigo-500/30"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <h3 className="font-black text-xl gradient-text mb-3">{selectedTerm.term}</h3>
              <div className="space-y-3">
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">Definition</span>
                  <p className="text-slate-200 mt-1">{selectedTerm.def}</p>
                </div>
                <div>
                  <span className="text-xs text-slate-500 uppercase tracking-wide">Example</span>
                  <p className="text-slate-200 mt-1">{selectedTerm.example}</p>
                </div>
                <div className="p-3 bg-yellow-500/10 border border-yellow-500/20 rounded-xl">
                  <span className="text-xs font-bold text-yellow-400">🎯 EXAM TIP</span>
                  <p className="text-slate-300 text-sm mt-1">{selectedTerm.exam}</p>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Terms Panel */}
        <div className="glass-card p-4">
          <h2 className="font-bold text-white mb-4">Tree Terminology — Click to Learn</h2>
          <div className="space-y-2">
            {TERM_EXPLANATIONS.map((term, i) => (
              <motion.button
                key={i}
                onClick={() => setSelectedTerm(selectedTerm?.term === term.term ? null : term)}
                className={`w-full p-3 rounded-xl text-left flex items-center justify-between gap-2 transition-all ${
                  selectedTerm?.term === term.term
                    ? "bg-indigo-500/20 border border-indigo-500/40"
                    : "bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/8"
                }`}
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-6 h-6 rounded-lg flex items-center justify-center text-xs font-bold ${
                    selectedTerm?.term === term.term ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-400"
                  }`}>{i + 1}</div>
                  <span className={`font-semibold text-sm ${selectedTerm?.term === term.term ? "text-indigo-300" : "text-white"}`}>
                    {term.term}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400 hidden sm:block">{term.def.substring(0, 25)}...</span>
                  <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${selectedTerm?.term === term.term ? "rotate-90" : ""}`} />
                </div>
              </motion.button>
            ))}
          </div>

          <div className="mt-4 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
            <p className="text-xs text-indigo-300">
              <span className="font-bold">📚 Memory Trick:</span> In a tree, think of a real family tree!
              The founder = Root, parents/children = nodes, cousins share grandparents = siblings at same level.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
