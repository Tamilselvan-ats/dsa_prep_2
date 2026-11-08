"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  TreePine, Plus, Trash2, Info, ChevronRight, Zap,
  RefreshCcw, Eye, BookOpen, GraduationCap, Target
} from "lucide-react";
import { toast } from "sonner";
import { useProgressStore } from "@/lib/stores/progress-store";

// ─── Types ───────────────────────────────────────────────────────────────────

interface TreeNode {
  id: number;
  label: string;
  parentId: number | null;
  x: number;
  y: number;
  level: number;
  childIds: number[];
}

interface TermExplanation {
  term: string;
  def: string;
  formula?: string;
  example: string;
  exam: string;
  highlight: (nodes: TreeNode[], focused: number | null) => number[];
  color: string;
}

// ─── Default Example Tree ─────────────────────────────────────────────────────

function buildDefaultTree(): TreeNode[] {
  return [
    { id: 1, label: "A", parentId: null, x: 350, y: 55, level: 0, childIds: [2, 3, 4] },
    { id: 2, label: "B", parentId: 1,    x: 160, y: 145, level: 1, childIds: [5, 6] },
    { id: 3, label: "C", parentId: 1,    x: 350, y: 145, level: 1, childIds: [] },
    { id: 4, label: "D", parentId: 1,    x: 540, y: 145, level: 1, childIds: [7, 8] },
    { id: 5, label: "E", parentId: 2,    x: 80,  y: 240, level: 2, childIds: [] },
    { id: 6, label: "F", parentId: 2,    x: 240, y: 240, level: 2, childIds: [9] },
    { id: 7, label: "G", parentId: 4,    x: 460, y: 240, level: 2, childIds: [] },
    { id: 8, label: "H", parentId: 4,    x: 620, y: 240, level: 2, childIds: [] },
    { id: 9, label: "I", parentId: 6,    x: 240, y: 330, level: 3, childIds: [] },
  ];
}

// ─── Tree helpers ─────────────────────────────────────────────────────────────

function getDepth(nodeId: number, nodes: TreeNode[]): number {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return 0;
  return node.level;
}

function getHeight(nodeId: number, nodes: TreeNode[]): number {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return -1;
  if (node.childIds.length === 0) return 0;
  return 1 + Math.max(...node.childIds.map(cid => getHeight(cid, nodes)));
}

function getDescendants(nodeId: number, nodes: TreeNode[]): number[] {
  const node = nodes.find(n => n.id === nodeId);
  if (!node) return [];
  const result: number[] = [];
  const queue = [...node.childIds];
  while (queue.length > 0) {
    const id = queue.shift()!;
    result.push(id);
    const child = nodes.find(n => n.id === id);
    if (child) queue.push(...child.childIds);
  }
  return result;
}

function getAncestors(nodeId: number, nodes: TreeNode[]): number[] {
  const result: number[] = [];
  let current = nodes.find(n => n.id === nodeId);
  while (current?.parentId !== null && current?.parentId !== undefined) {
    result.push(current.parentId);
    current = nodes.find(n => n.id === current!.parentId);
  }
  return result;
}

function getTreeHeight(nodes: TreeNode[]): number {
  const root = nodes.find(n => n.parentId === null);
  if (!root) return 0;
  return getHeight(root.id, nodes);
}

function getTreeDegree(nodes: TreeNode[]): number {
  return Math.max(...nodes.map(n => n.childIds.length), 0);
}

function getLeaves(nodes: TreeNode[]): number[] {
  return nodes.filter(n => n.childIds.length === 0).map(n => n.id);
}

// ─── Term Definitions ─────────────────────────────────────────────────────────

function buildTerms(): TermExplanation[] {
  return [
    {
      term: "Root",
      def: "The topmost node of the tree with no parent node.",
      formula: "parent(Root) = NULL",
      example: "In this tree, node A is the Root.",
      exam: "Every tree has exactly ONE root. Root has degree = number of its children.",
      color: "#10b981",
      highlight: (nodes) => {
        const root = nodes.find(n => n.parentId === null);
        return root ? [root.id] : [];
      },
    },
    {
      term: "Parent",
      def: "A node that has one or more children.",
      formula: "If A→B, A = Parent of B",
      example: "A is parent of B, C, D. B is parent of E, F.",
      exam: "Every node except root has exactly one parent.",
      color: "#6366f1",
      highlight: (nodes, focused) => {
        if (focused !== null) {
          const node = nodes.find(n => n.id === focused);
          return node?.parentId !== null && node?.parentId !== undefined ? [node.parentId] : [];
        }
        return nodes.filter(n => n.childIds.length > 0).map(n => n.id);
      },
    },
    {
      term: "Child",
      def: "A node connected below its parent in the tree.",
      formula: "If A→B, B = Child of A",
      example: "B, C, D are children of A.",
      exam: "A node can have 0 or more children. Number of children = degree of that node.",
      color: "#8b5cf6",
      highlight: (nodes, focused) => {
        if (focused !== null) {
          const node = nodes.find(n => n.id === focused);
          return node?.childIds || [];
        }
        return nodes.filter(n => n.parentId !== null).map(n => n.id);
      },
    },
    {
      term: "Sibling",
      def: "Nodes that share the same parent node.",
      formula: "parent(X) = parent(Y) ⟹ X and Y are siblings",
      example: "B, C, D are siblings (all children of A).",
      exam: "Find siblings of node X → all nodes with same parent.",
      color: "#f59e0b",
      highlight: (nodes, focused) => {
        if (focused !== null) {
          const node = nodes.find(n => n.id === focused);
          if (node?.parentId !== null && node?.parentId !== undefined) {
            const parent = nodes.find(n => n.id === node.parentId);
            return (parent?.childIds || []).filter(id => id !== focused);
          }
        }
        return [];
      },
    },
    {
      term: "Leaf",
      def: "A node with no children (degree = 0). Also called external node.",
      formula: "degree(Leaf) = 0",
      example: "C, E, G, H, I are leaf nodes.",
      exam: "Leaf = external node. Non-leaf = internal node. Count of leaves is a common exam question.",
      color: "#22c55e",
      highlight: (nodes) => getLeaves(nodes),
    },
    {
      term: "Degree",
      def: "Number of children of a node. Degree of a tree = maximum degree among all nodes.",
      formula: "degree(node) = number of children",
      example: "degree(A) = 3, degree(B) = 2, degree(D) = 2, degree(C) = 0 (leaf).",
      exam: "Degree of TREE = max degree = 3 here. Leaf has degree 0.",
      color: "#ec4899",
      highlight: (nodes, focused) => {
        if (focused !== null) return [focused, ...(nodes.find(n => n.id === focused)?.childIds || [])];
        const maxDeg = getTreeDegree(nodes);
        return nodes.filter(n => n.childIds.length === maxDeg).map(n => n.id);
      },
    },
    {
      term: "Level",
      def: "Level of a node = its distance from root + 1 (root is at Level 1).",
      formula: "level(root) = 1, level(child) = level(parent) + 1",
      example: "A=Level 1, B/C/D=Level 2, E/F/G/H=Level 3, I=Level 4.",
      exam: "Some books use Level 0 for root. Clarify in exams! Level = Depth + 1.",
      color: "#06b6d4",
      highlight: (nodes, focused) => {
        if (focused !== null) {
          const node = nodes.find(n => n.id === focused);
          return node ? nodes.filter(n => n.level === node.level).map(n => n.id) : [];
        }
        return nodes.map(n => n.id);
      },
    },
    {
      term: "Depth",
      def: "Length of path from root to that node (root has depth 0).",
      formula: "depth(root) = 0, depth(node) = depth(parent) + 1",
      example: "depth(A)=0, depth(B)=1, depth(E)=2, depth(I)=3.",
      exam: "Depth and Level are related: Level = Depth + 1. Depth of root = 0.",
      color: "#f97316",
      highlight: (nodes, focused) => {
        if (focused !== null) return [focused, ...getAncestors(focused, nodes)];
        return nodes.map(n => n.id);
      },
    },
    {
      term: "Height",
      def: "Length of longest path from a node down to a leaf.",
      formula: "height(leaf) = 0, height(node) = 1 + max(height(children))",
      example: "height(A) = 3, height(B) = 2, height(I) = 0 (leaf).",
      exam: "Tree height = height of root. Empty tree height = -1.",
      color: "#a855f7",
      highlight: (nodes, focused) => {
        if (focused !== null) return [focused, ...getDescendants(focused, nodes)];
        const root = nodes.find(n => n.parentId === null);
        return root ? [root.id, ...getDescendants(root.id, nodes)] : [];
      },
    },
    {
      term: "Subtree",
      def: "A node and all its descendants form a subtree.",
      formula: "subtree(X) = {X} ∪ descendants(X)",
      example: "subtree(B) = {B, E, F, I}.",
      exam: "Every node is the root of its own subtree. BST property must hold for all subtrees.",
      color: "#84cc16",
      highlight: (nodes, focused) => {
        if (focused !== null) return [focused, ...getDescendants(focused, nodes)];
        return [];
      },
    },
    {
      term: "Ancestor",
      def: "Any node on the path from a given node up to the root.",
      formula: "ancestors(X) = parent chain from X to root",
      example: "ancestors(I) = {F, B, A}.",
      exam: "Root is ancestor of every node. Direct ancestor = parent.",
      color: "#fb923c",
      highlight: (nodes, focused) => {
        if (focused !== null) return [focused, ...getAncestors(focused, nodes)];
        return [];
      },
    },
    {
      term: "Descendant",
      def: "Any node reachable by going downward from a given node.",
      formula: "descendants(X) = all nodes below X",
      example: "descendants(B) = {E, F, I}.",
      exam: "X is descendant of Y if Y is an ancestor of X.",
      color: "#34d399",
      highlight: (nodes, focused) => {
        if (focused !== null) return [focused, ...getDescendants(focused, nodes)];
        return [];
      },
    },
  ];
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TreeLabPage() {
  const { addXP, updateTopicMastery } = useProgressStore();
  const [nodes, setNodes] = useState<TreeNode[]>(buildDefaultTree());
  const [selectedTermIdx, setSelectedTermIdx] = useState<number | null>(null);
  const [focusedNode, setFocusedNode] = useState<number | null>(null);
  const [addMode, setAddMode] = useState<"off" | "selectParent">("off");
  const [newLabel, setNewLabel] = useState("");
  const [hoveredNode, setHoveredNode] = useState<number | null>(null);
  const [mode, setMode] = useState<"learn" | "quiz">("learn");
  const [quizIdx, setQuizIdx] = useState(0);
  const [quizAnswer, setQuizAnswer] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [termsLearned, setTermsLearned] = useState<Set<number>>(new Set());
  const nextId = useRef(10);
  const terms = buildTerms();

  const selectedTerm = selectedTermIdx !== null ? terms[selectedTermIdx] : null;

  // ── Highlighted node IDs ─────────────────────────────────────────────────
  const highlightedIds: Set<number> = new Set(
    selectedTerm ? selectedTerm.highlight(nodes, focusedNode) : []
  );

  // ── Node click handler ────────────────────────────────────────────────────
  const handleNodeClick = useCallback((nodeId: number) => {
    if (addMode === "selectParent") {
      // Add child to this node
      if (!newLabel.trim()) {
        toast.error("Enter a label for the new node first");
        return;
      }
      const parent = nodes.find(n => n.id === nodeId)!;
      const childCount = parent.childIds.length;
      const newX = parent.x + (childCount - 0.5) * 100;
      const newY = parent.y + 90;
      const id = nextId.current++;
      const newNode: TreeNode = {
        id, label: newLabel.trim().toUpperCase().slice(0, 2),
        parentId: nodeId, x: newX, y: newY,
        level: parent.level + 1, childIds: [],
      };
      setNodes(prev => prev.map(n =>
        n.id === nodeId ? { ...n, childIds: [...n.childIds, id] } : n
      ).concat(newNode));
      setNewLabel("");
      setAddMode("off");
      toast.success(`Node "${newNode.label}" added as child of "${parent.label}"`);
      addXP(5, "tree-node-added");
      return;
    }
    setFocusedNode(prev => prev === nodeId ? null : nodeId);
  }, [addMode, newLabel, nodes, addXP]);

  // ── Delete node ───────────────────────────────────────────────────────────
  const deleteNode = useCallback((nodeId: number) => {
    const node = nodes.find(n => n.id === nodeId);
    if (!node || node.parentId === null) { toast.error("Cannot delete root"); return; }
    const toDelete = new Set([nodeId, ...getDescendants(nodeId, nodes)]);
    setNodes(prev => prev
      .filter(n => !toDelete.has(n.id))
      .map(n => n.id === node.parentId
        ? { ...n, childIds: n.childIds.filter(c => c !== nodeId) }
        : n
      )
    );
    if (focusedNode !== null && toDelete.has(focusedNode)) setFocusedNode(null);
    toast.success("Node deleted");
  }, [nodes, focusedNode]);

  // ── Reset tree ────────────────────────────────────────────────────────────
  const resetTree = () => {
    setNodes(buildDefaultTree());
    setFocusedNode(null);
    setAddMode("off");
    nextId.current = 10;
    toast.success("Tree reset to default");
  };

  // ── Term learned ──────────────────────────────────────────────────────────
  const markTermLearned = (idx: number) => {
    if (!termsLearned.has(idx)) {
      setTermsLearned(prev => new Set([...prev, idx]));
      addXP(10, "tree-term-learned");
      if (termsLearned.size + 1 === terms.length) {
        updateTopicMastery("tree-terminology", { masteryScore: 90, practiceScore: 85 });
        toast.success("🌳 Tree Terminology Mastered! +10 XP");
      }
    }
  };

  // ── Computed stats ────────────────────────────────────────────────────────
  const root = nodes.find(n => n.parentId === null);
  const treeStats = {
    height: root ? getHeight(root.id, nodes) : 0,
    degree: getTreeDegree(nodes),
    leaves: getLeaves(nodes).length,
    nodes: nodes.length,
    levels: root ? Math.max(...nodes.map(n => n.level)) + 1 : 0,
  };

  const focusedStats = focusedNode !== null ? {
    node: nodes.find(n => n.id === focusedNode),
    depth: getDepth(focusedNode, nodes),
    height: getHeight(focusedNode, nodes),
    degree: nodes.find(n => n.id === focusedNode)?.childIds.length || 0,
    isLeaf: (nodes.find(n => n.id === focusedNode)?.childIds.length || 0) === 0,
    isRoot: nodes.find(n => n.id === focusedNode)?.parentId === null,
  } : null;

  // ── SVG ViewBox ───────────────────────────────────────────────────────────
  const maxX = Math.max(...nodes.map(n => n.x)) + 60;
  const maxY = Math.max(...nodes.map(n => n.y)) + 60;
  const svgW = Math.max(700, maxX);
  const svgH = Math.max(380, maxY);

  // ─── Quiz Mode ────────────────────────────────────────────────────────────
  interface QuizQuestion {
    question: string;
    answers: { label: string; nodeIds: number[] }[];
    correctIdx: number;
  }

  function buildQuizQuestions(): QuizQuestion[] {
    const leaves = getLeaves(nodes);
    const root = nodes.find(n => n.parentId === null);
    const internalNodes = nodes.filter(n => n.childIds.length > 0);
    return [
      {
        question: `Which node is the ROOT?`,
        answers: [
          { label: root?.label || "A", nodeIds: root ? [root.id] : [] },
          { label: nodes[2]?.label || "C", nodeIds: nodes[2] ? [nodes[2].id] : [] },
          { label: nodes[4]?.label || "E", nodeIds: nodes[4] ? [nodes[4].id] : [] },
        ],
        correctIdx: 0,
      },
      {
        question: `Which nodes are LEAVES (no children)?`,
        answers: [
          { label: "All nodes", nodeIds: nodes.map(n => n.id) },
          { label: leaves.map(id => nodes.find(n => n.id === id)?.label).join(", "), nodeIds: leaves },
          { label: internalNodes.map(n => n.label).join(", "), nodeIds: internalNodes.map(n => n.id) },
        ],
        correctIdx: 1,
      },
      {
        question: `What is the HEIGHT of the tree?`,
        answers: [
          { label: `${treeStats.height}`, nodeIds: [] },
          { label: `${treeStats.height + 1}`, nodeIds: [] },
          { label: `${treeStats.levels}`, nodeIds: [] },
        ],
        correctIdx: 0,
      },
      {
        question: `What is the DEGREE of the tree?`,
        answers: [
          { label: `${treeStats.degree - 1}`, nodeIds: [] },
          { label: `${treeStats.nodes}`, nodeIds: [] },
          { label: `${treeStats.degree}`, nodeIds: [] },
        ],
        correctIdx: 2,
      },
    ];
  }

  const quizQuestions = buildQuizQuestions();
  const currentQuiz = quizQuestions[quizIdx % quizQuestions.length];

  const handleQuizAnswer = (idx: number) => {
    setQuizAnswer(idx);
    if (idx === currentQuiz.correctIdx) {
      setQuizScore(s => s + 1);
      addXP(15, "tree-quiz-correct");
      toast.success("✅ Correct! +15 XP");
    } else {
      toast.error("❌ Incorrect. See the tree for the right answer.");
    }
    setTimeout(() => {
      setQuizAnswer(null);
      setQuizIdx(i => i + 1);
    }, 2000);
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black gradient-text">🌳 Tree Terminology Lab</h1>
          <p className="text-slate-400 mt-1 text-sm">
            Interactive tree — click terms to highlight, click nodes to inspect, add/remove nodes
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMode(m => m === "learn" ? "quiz" : "learn")}
            className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all border ${
              mode === "quiz"
                ? "bg-purple-500/20 text-purple-300 border-purple-500/30"
                : "bg-indigo-500/20 text-indigo-300 border-indigo-500/30"
            }`}
          >
            {mode === "quiz" ? <BookOpen className="w-4 h-4" /> : <Target className="w-4 h-4" />}
            {mode === "quiz" ? "Learn Mode" : "Quiz Mode"}
          </button>
          <button
            onClick={resetTree}
            className="p-2 rounded-xl bg-white/5 border border-white/10 text-slate-400 hover:text-white transition-all"
            title="Reset tree"
          >
            <RefreshCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Tree Stats Row */}
      <div className="grid grid-cols-5 gap-3">
        {[
          { label: "Nodes", value: treeStats.nodes, color: "text-indigo-400" },
          { label: "Height", value: treeStats.height, color: "text-purple-400" },
          { label: "Degree", value: treeStats.degree, color: "text-cyan-400" },
          { label: "Leaves", value: treeStats.leaves, color: "text-green-400" },
          { label: "Levels", value: treeStats.levels, color: "text-orange-400" },
        ].map((s, i) => (
          <motion.div key={i} className="glass-card p-3 text-center"
            initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
            <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
            <div className="text-xs text-slate-400 mt-0.5">{s.label}</div>
          </motion.div>
        ))}
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        {/* SVG Tree — takes 3 cols */}
        <div className="lg:col-span-3 space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <TreePine className="w-4 h-4 text-green-400" />
                <span className="text-sm font-semibold text-white">
                  {addMode === "selectParent"
                    ? "🖱️ Click a node to add child there"
                    : focusedNode ? `Selected: Node ${nodes.find(n => n.id === focusedNode)?.label}` : "Interactive Tree"}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {addMode === "off" ? (
                  <div className="flex items-center gap-2">
                    <input
                      value={newLabel}
                      onChange={e => setNewLabel(e.target.value)}
                      placeholder="Label"
                      className="w-16 px-2 py-1 rounded-lg bg-slate-800/60 border border-slate-700/50 text-slate-200 text-xs"
                      maxLength={2}
                    />
                    <button
                      onClick={() => {
                        if (!newLabel.trim()) { toast.error("Enter a node label"); return; }
                        setAddMode("selectParent");
                        toast.info("Click a node to add child there");
                      }}
                      className="p-1.5 rounded-lg bg-green-500/20 text-green-400 border border-green-500/30 hover:bg-green-500/30 transition-all"
                      title="Add node"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                    {focusedNode !== null && focusedNode !== root?.id && (
                      <button
                        onClick={() => deleteNode(focusedNode)}
                        className="p-1.5 rounded-lg bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30 transition-all"
                        title="Delete selected node"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                ) : (
                  <button
                    onClick={() => setAddMode("off")}
                    className="text-xs text-slate-400 hover:text-white px-3 py-1 rounded-lg bg-white/5 border border-white/10"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* SVG */}
            <div className="overflow-auto">
              <svg
                viewBox={`0 0 ${svgW} ${svgH}`}
                width={svgW} height={svgH}
                className="w-full border border-white/5 rounded-xl bg-black/20"
                style={{ minHeight: 300 }}
              >
                {/* Level lines */}
                {Array.from(new Set(nodes.map(n => n.level))).map(level => {
                  const nodesAtLevel = nodes.filter(n => n.level === level);
                  const avgY = nodesAtLevel.reduce((s, n) => s + n.y, 0) / nodesAtLevel.length;
                  return (
                    <line key={level}
                      x1={0} y1={avgY}
                      x2={svgW} y2={avgY}
                      stroke="rgba(255,255,255,0.03)"
                      strokeWidth="1"
                      strokeDasharray="6 4"
                    />
                  );
                })}

                {/* Level labels */}
                {Array.from(new Set(nodes.map(n => n.level))).map(level => {
                  const nodesAtLevel = nodes.filter(n => n.level === level);
                  const avgY = nodesAtLevel.reduce((s, n) => s + n.y, 0) / nodesAtLevel.length;
                  return (
                    <text key={level} x={8} y={avgY + 4}
                      fill="rgba(148,163,184,0.4)" fontSize="10">
                      L{level + 1}
                    </text>
                  );
                })}

                {/* Edges */}
                {nodes.map(node =>
                  node.childIds.map(childId => {
                    const child = nodes.find(n => n.id === childId)!;
                    const isHighlighted = highlightedIds.has(node.id) && highlightedIds.has(childId);
                    return (
                      <motion.line
                        key={`${node.id}-${childId}`}
                        x1={node.x} y1={node.y}
                        x2={child.x} y2={child.y}
                        stroke={isHighlighted ? selectedTerm?.color || "#6366f1" : "rgba(99,102,241,0.25)"}
                        strokeWidth={isHighlighted ? 2.5 : 1.5}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.3 }}
                      />
                    );
                  })
                )}

                {/* Nodes */}
                {nodes.map(node => {
                  const isHighlighted = highlightedIds.has(node.id);
                  const isSelected = focusedNode === node.id;
                  const isHovered = hoveredNode === node.id;
                  const isAddTarget = addMode === "selectParent";
                  const nodeColor = isHighlighted && selectedTerm
                    ? selectedTerm.color
                    : isSelected ? "#6366f1" : "#475569";

                  return (
                    <g
                      key={node.id}
                      style={{ cursor: "pointer" }}
                      onClick={() => handleNodeClick(node.id)}
                      onMouseEnter={() => setHoveredNode(node.id)}
                      onMouseLeave={() => setHoveredNode(null)}
                    >
                      {/* Glow ring for highlighted nodes */}
                      {(isHighlighted || isSelected) && (
                        <circle
                          cx={node.x} cy={node.y} r={30}
                          fill="none"
                          stroke={nodeColor}
                          strokeWidth="1.5"
                          strokeOpacity={0.3}
                        />
                      )}
                      {/* Add mode pulse */}
                      {isAddTarget && (
                        <circle cx={node.x} cy={node.y} r={28}
                          fill="none" stroke="#10b981" strokeWidth="1.5"
                          strokeDasharray="4 2" strokeOpacity={0.5}
                        />
                      )}
                      {/* Node circle */}
                      <circle
                        cx={node.x} cy={node.y} r={22}
                        fill={isHighlighted
                          ? `${nodeColor}33`
                          : isSelected ? "rgba(99,102,241,0.3)" : "rgba(30,41,59,0.8)"}
                        stroke={nodeColor}
                        strokeWidth={isHighlighted || isSelected ? 2.5 : 1.5}
                      />
                      {/* Node label */}
                      <text x={node.x} y={node.y + 5}
                        textAnchor="middle"
                        fill={isHighlighted || isSelected ? "#fff" : "#cbd5e1"}
                        fontSize="13" fontWeight="bold"
                      >
                        {node.label}
                      </text>
                      {/* Depth label */}
                      <text x={node.x} y={node.y + 36}
                        textAnchor="middle"
                        fill="rgba(148,163,184,0.5)" fontSize="9"
                      >
                        d={node.level}
                      </text>
                      {/* Hovered tooltip */}
                      {isHovered && (
                        <g>
                          <rect x={node.x + 25} y={node.y - 20}
                            width={100} height={40} rx={6}
                            fill="rgba(15,23,42,0.95)" stroke="rgba(99,102,241,0.4)" strokeWidth="1"
                          />
                          <text x={node.x + 75} y={node.y - 5}
                            textAnchor="middle" fill="#94a3b8" fontSize="9">
                            Depth: {node.level} | Deg: {node.childIds.length}
                          </text>
                          <text x={node.x + 75} y={node.y + 8}
                            textAnchor="middle" fill="#94a3b8" fontSize="9">
                            {node.childIds.length === 0 ? "🍃 Leaf" : `Children: ${node.childIds.length}`}
                          </text>
                        </g>
                      )}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Focused node stats */}
            <AnimatePresence>
              {focusedStats && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="w-4 h-4 text-indigo-400" />
                    <span className="text-sm font-bold text-indigo-300">
                      Node {focusedStats.node?.label} — Details
                    </span>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-xs">
                    {[
                      { label: "Depth", value: focusedStats.depth },
                      { label: "Height", value: focusedStats.height },
                      { label: "Degree", value: focusedStats.degree },
                      { label: "Type", value: focusedStats.isRoot ? "Root" : focusedStats.isLeaf ? "Leaf" : "Internal" },
                    ].map((s, i) => (
                      <div key={i} className="bg-white/5 p-2 rounded-lg text-center">
                        <div className="text-white font-bold">{s.value}</div>
                        <div className="text-slate-400">{s.label}</div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Quiz Mode */}
          {mode === "quiz" && (
            <motion.div
              className="glass-card p-5 border border-purple-500/30"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Target className="w-4 h-4 text-purple-400" />
                  <span className="font-bold text-white">Quick Quiz</span>
                </div>
                <span className="text-xs bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full border border-purple-500/30">
                  Score: {quizScore}
                </span>
              </div>
              <p className="text-sm text-slate-200 mb-3">{currentQuiz.question}</p>
              <div className="space-y-2">
                {currentQuiz.answers.map((ans, i) => (
                  <button
                    key={i}
                    onClick={() => quizAnswer === null && handleQuizAnswer(i)}
                    className={`w-full text-left px-4 py-2.5 rounded-xl text-sm font-medium transition-all border ${
                      quizAnswer === null
                        ? "bg-white/5 border-white/10 hover:bg-indigo-500/15 hover:border-indigo-500/30"
                        : i === currentQuiz.correctIdx
                          ? "bg-green-500/20 border-green-500/40 text-green-300"
                          : i === quizAnswer
                            ? "bg-red-500/20 border-red-500/40 text-red-300"
                            : "bg-white/5 border-white/10 opacity-50"
                    }`}
                  >
                    {String.fromCharCode(65 + i)}. {ans.label}
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Right Panel — Terms + Detail */}
        <div className="lg:col-span-2 space-y-4">
          {/* Term List */}
          <div className="glass-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              <h2 className="font-bold text-white text-sm">
                Terminology ({termsLearned.size}/{terms.length} learned)
              </h2>
            </div>
            {/* Progress bar */}
            <div className="h-1.5 bg-slate-800 rounded-full mb-3 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-500"
                style={{ width: `${(termsLearned.size / terms.length) * 100}%` }}
              />
            </div>
            <div className="space-y-1 max-h-80 overflow-y-auto pr-1">
              {terms.map((term, i) => (
                <motion.button
                  key={i}
                  onClick={() => {
                    setSelectedTermIdx(prev => prev === i ? null : i);
                    setFocusedNode(null);
                    markTermLearned(i);
                  }}
                  className={`w-full p-2.5 rounded-xl text-left flex items-center justify-between gap-2 transition-all text-sm ${
                    selectedTermIdx === i
                      ? "border border-opacity-50 bg-opacity-20"
                      : "bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/8"
                  }`}
                  style={selectedTermIdx === i ? {
                    backgroundColor: `${term.color}22`,
                    borderColor: `${term.color}60`,
                  } : {}}
                  whileHover={{ scale: 1.01 }}
                  whileTap={{ scale: 0.99 }}
                >
                  <div className="flex items-center gap-2">
                    <div
                      className="w-5 h-5 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0"
                      style={termsLearned.has(i)
                        ? { backgroundColor: `${term.color}30`, color: term.color }
                        : { backgroundColor: "rgba(255,255,255,0.08)", color: "#64748b" }
                      }
                    >
                      {termsLearned.has(i) ? "✓" : i + 1}
                    </div>
                    <span className={`font-semibold ${selectedTermIdx === i ? "text-white" : "text-slate-300"}`}>
                      {term.term}
                    </span>
                  </div>
                  <ChevronRight
                    className="w-3 h-3 text-slate-500 flex-shrink-0 transition-transform"
                    style={{ transform: selectedTermIdx === i ? "rotate(90deg)" : "none" }}
                  />
                </motion.button>
              ))}
            </div>
          </div>

          {/* Term Detail Card */}
          <AnimatePresence mode="wait">
            {selectedTerm && (
              <motion.div
                key={selectedTermIdx}
                className="glass-card p-4 border"
                style={{ borderColor: `${selectedTerm.color}40` }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                    style={{ backgroundColor: `${selectedTerm.color}25` }}>
                    <TreePine className="w-4 h-4" style={{ color: selectedTerm.color }} />
                  </div>
                  <h3 className="font-black text-lg text-white">{selectedTerm.term}</h3>
                </div>
                <div className="space-y-3 text-sm">
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">Definition</span>
                    <p className="text-slate-200 mt-1">{selectedTerm.def}</p>
                  </div>
                  {selectedTerm.formula && (
                    <div className="p-2 bg-black/30 rounded-lg font-mono text-xs text-indigo-300 border border-indigo-500/20">
                      {selectedTerm.formula}
                    </div>
                  )}
                  <div>
                    <span className="text-xs text-slate-500 uppercase tracking-wide">In This Tree</span>
                    <p className="text-slate-200 mt-1">{selectedTerm.example}</p>
                  </div>
                  <div className="p-3 rounded-xl border"
                    style={{ backgroundColor: `${selectedTerm.color}12`, borderColor: `${selectedTerm.color}30` }}>
                    <span className="text-xs font-bold" style={{ color: selectedTerm.color }}>🎯 EXAM TIP</span>
                    <p className="text-slate-300 text-xs mt-1">{selectedTerm.exam}</p>
                  </div>
                  {/* Node selector for context-aware highlights */}
                  {["Parent", "Child", "Sibling", "Degree", "Level", "Depth", "Height", "Subtree", "Ancestor", "Descendant"].includes(selectedTerm.term) && (
                    <div>
                      <span className="text-xs text-slate-500 uppercase tracking-wide mb-1 block">Select node for highlight</span>
                      <div className="flex flex-wrap gap-1">
                        {nodes.map(n => (
                          <button key={n.id}
                            onClick={() => setFocusedNode(prev => prev === n.id ? null : n.id)}
                            className={`px-2 py-1 rounded-lg text-xs font-bold border transition-all ${
                              focusedNode === n.id
                                ? "text-white border-opacity-60"
                                : "bg-white/5 border-white/10 text-slate-400"
                            }`}
                            style={focusedNode === n.id
                              ? { backgroundColor: `${selectedTerm.color}30`, borderColor: selectedTerm.color, color: selectedTerm.color }
                              : {}}
                          >
                            {n.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Memory trick */}
          {!selectedTerm && (
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-2">
                <GraduationCap className="w-4 h-4 text-yellow-400" />
                <span className="font-bold text-sm text-white">📚 Memory Tricks</span>
              </div>
              <div className="space-y-2 text-xs text-slate-400">
                <p>🌳 Think of a family tree: Root = ancestor, leaves = youngest generation.</p>
                <p>📏 Height = how TALL the tree is from that node down.</p>
                <p>📍 Depth = how FAR you are from the root.</p>
                <p>🌿 Degree = how many direct children a node has.</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Quick Reference Table */}
      <div className="glass-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <Info className="w-4 h-4 text-cyan-400" />
          <h2 className="font-bold text-white">Quick Reference — This Tree</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/10">
                <th className="text-left text-slate-400 pb-2 pr-4">Node</th>
                <th className="text-left text-slate-400 pb-2 pr-4">Level</th>
                <th className="text-left text-slate-400 pb-2 pr-4">Depth</th>
                <th className="text-left text-slate-400 pb-2 pr-4">Height</th>
                <th className="text-left text-slate-400 pb-2 pr-4">Degree</th>
                <th className="text-left text-slate-400 pb-2 pr-4">Type</th>
                <th className="text-left text-slate-400 pb-2">Parent</th>
              </tr>
            </thead>
            <tbody>
              {nodes.map(node => {
                const height = getHeight(node.id, nodes);
                const parent = nodes.find(n => n.id === node.parentId);
                const isLeaf = node.childIds.length === 0;
                const isRoot = node.parentId === null;
                return (
                  <tr key={node.id}
                    className={`border-b border-white/5 cursor-pointer transition-all ${
                      focusedNode === node.id ? "bg-indigo-500/10" : "hover:bg-white/5"
                    }`}
                    onClick={() => setFocusedNode(prev => prev === node.id ? null : node.id)}
                  >
                    <td className="py-2 pr-4 font-bold text-indigo-300">{node.label}</td>
                    <td className="py-2 pr-4 text-slate-300">{node.level + 1}</td>
                    <td className="py-2 pr-4 text-slate-300">{node.level}</td>
                    <td className="py-2 pr-4 text-slate-300">{height}</td>
                    <td className="py-2 pr-4 text-slate-300">{node.childIds.length}</td>
                    <td className="py-2 pr-4">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        isRoot ? "bg-green-500/20 text-green-300" :
                        isLeaf ? "bg-orange-500/20 text-orange-300" :
                        "bg-slate-500/20 text-slate-300"
                      }`}>
                        {isRoot ? "Root" : isLeaf ? "Leaf" : "Internal"}
                      </span>
                    </td>
                    <td className="py-2 text-slate-400">{parent?.label || "—"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
