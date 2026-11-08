"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { useProgressStore } from "@/lib/stores/progress-store";
import {
  Plus, Search, Trash2, RotateCcw, ChevronRight,
  BookOpen, Code2, Lightbulb, Info, TreePine, List
} from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BSTNode {
  val: number;
  left: BSTNode | null;
  right: BSTNode | null;
  id: string;
}

interface NodePosition {
  x: number;
  y: number;
  node: BSTNode;
}

type NodeState = "default" | "comparing" | "found" | "deleted" | "inserted" | "path";

interface NodeVisual {
  id: string;
  state: NodeState;
}

interface StepLog {
  id: number;
  message: string;
  type: "compare" | "action" | "result";
}

// ─── BST Logic ───────────────────────────────────────────────────────────────

let nodeIdCounter = 0;
function makeNode(val: number): BSTNode {
  return { val, left: null, right: null, id: `n${nodeIdCounter++}` };
}

function insertBST(root: BSTNode | null, val: number): { root: BSTNode; path: string[] } {
  const path: string[] = [];
  const newNode = makeNode(val);
  if (!root) return { root: newNode, path };
  let cur = root;
  while (true) {
    path.push(cur.id);
    if (val < cur.val) {
      if (!cur.left) { cur.left = newNode; break; }
      cur = cur.left;
    } else if (val > cur.val) {
      if (!cur.right) { cur.right = newNode; break; }
      cur = cur.right;
    } else break; // duplicate
  }
  return { root, path };
}

function searchBST(root: BSTNode | null, val: number): { found: boolean; path: string[] } {
  const path: string[] = [];
  let cur = root;
  while (cur) {
    path.push(cur.id);
    if (val === cur.val) return { found: true, path };
    cur = val < cur.val ? cur.left : cur.right;
  }
  return { found: false, path };
}

function findMin(node: BSTNode): BSTNode {
  let cur = node;
  while (cur.left) cur = cur.left;
  return cur;
}

function deleteBST(
  root: BSTNode | null, val: number
): { root: BSTNode | null; path: string[]; deletedId: string | null; caseType: string } {
  const path: string[] = [];
  let deletedId: string | null = null;
  let caseType = "";

  function del(node: BSTNode | null): BSTNode | null {
    if (!node) return null;
    path.push(node.id);
    if (val < node.val) {
      node.left = del(node.left);
    } else if (val > node.val) {
      node.right = del(node.right);
    } else {
      deletedId = node.id;
      if (!node.left && !node.right) { caseType = "leaf"; return null; }
      if (!node.left) { caseType = "one-child (right)"; return node.right; }
      if (!node.right) { caseType = "one-child (left)"; return node.left; }
      caseType = "two-children (inorder successor)";
      const successor = findMin(node.right);
      node.val = successor.val;
      node.id = node.id; // keep same id visually
      node.right = del(node.right);
      deletedId = null; // successor node is removed instead
    }
    return node;
  }

  const newRoot = del(root);
  return { root: newRoot, path, deletedId, caseType };
}

function getHeight(node: BSTNode | null): number {
  if (!node) return 0;
  return 1 + Math.max(getHeight(node.left), getHeight(node.right));
}

function getMin(node: BSTNode | null): number | null {
  if (!node) return null;
  let cur = node;
  while (cur.left) cur = cur.left;
  return cur.val;
}

function getMax(node: BSTNode | null): number | null {
  if (!node) return null;
  let cur = node;
  while (cur.right) cur = cur.right;
  return cur.val;
}

function inorder(node: BSTNode | null, arr: number[] = []): number[] {
  if (!node) return arr;
  inorder(node.left, arr);
  arr.push(node.val);
  inorder(node.right, arr);
  return arr;
}

function preorder(node: BSTNode | null, arr: number[] = []): number[] {
  if (!node) return arr;
  arr.push(node.val);
  preorder(node.left, arr);
  preorder(node.right, arr);
  return arr;
}

function postorder(node: BSTNode | null, arr: number[] = []): number[] {
  if (!node) return arr;
  postorder(node.left, arr);
  postorder(node.right, arr);
  arr.push(node.val);
  return arr;
}

function getInorderPredecessorSuccessor(
  root: BSTNode | null, val: number
): { predecessor: number | null; successor: number | null } {
  const sorted = inorder(root);
  const idx = sorted.indexOf(val);
  if (idx === -1) return { predecessor: null, successor: null };
  return {
    predecessor: idx > 0 ? sorted[idx - 1] : null,
    successor: idx < sorted.length - 1 ? sorted[idx + 1] : null,
  };
}

// ─── Tree Layout ─────────────────────────────────────────────────────────────

function computePositions(
  node: BSTNode | null,
  positions: Map<string, NodePosition>,
  x: number, y: number, spread: number, depth: number
) {
  if (!node) return;
  positions.set(node.id, { x, y, node });
  const childSpread = Math.max(spread * 0.5, 60);
  if (node.left) computePositions(node.left, positions, x - spread, y + 80, childSpread, depth + 1);
  if (node.right) computePositions(node.right, positions, x + spread, y + 80, childSpread, depth + 1);
}

function getAllEdges(
  node: BSTNode | null,
  positions: Map<string, NodePosition>
): Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> {
  if (!node) return [];
  const edges: Array<{ x1: number; y1: number; x2: number; y2: number; key: string }> = [];
  const pos = positions.get(node.id);
  if (pos && node.left) {
    const lp = positions.get(node.left.id);
    if (lp) edges.push({ x1: pos.x, y1: pos.y, x2: lp.x, y2: lp.y, key: `${node.id}-${node.left.id}` });
    edges.push(...getAllEdges(node.left, positions));
  }
  if (pos && node.right) {
    const rp = positions.get(node.right.id);
    if (rp) edges.push({ x1: pos.x, y1: pos.y, x2: rp.x, y2: rp.y, key: `${node.id}-${node.right.id}` });
    edges.push(...getAllEdges(node.right, positions));
  }
  return edges;
}

function getAllNodes(node: BSTNode | null, arr: BSTNode[] = []): BSTNode[] {
  if (!node) return arr;
  arr.push(node);
  getAllNodes(node.left, arr);
  getAllNodes(node.right, arr);
  return arr;
}

// ─── Node color map ──────────────────────────────────────────────────────────

const STATE_COLORS: Record<NodeState, { fill: string; stroke: string; text: string }> = {
  default:   { fill: "#312e81", stroke: "#6366f1", text: "#e0e7ff" },
  comparing: { fill: "#713f12", stroke: "#eab308", text: "#fef08a" },
  found:     { fill: "#14532d", stroke: "#22c55e", text: "#bbf7d0" },
  inserted:  { fill: "#134e4a", stroke: "#06b6d4", text: "#cffafe" },
  deleted:   { fill: "#7f1d1d", stroke: "#ef4444", text: "#fecaca" },
  path:      { fill: "#1e1b4b", stroke: "#818cf8", text: "#c7d2fe" },
};

// ─── Default Tree ────────────────────────────────────────────────────────────

function buildDefaultTree(): BSTNode {
  nodeIdCounter = 0;
  let root = makeNode(50);
  for (const v of [30, 70, 20, 40, 60, 80]) {
    const res = insertBST(root, v);
    root = res.root;
  }
  return root;
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function BSTPage() {
  const { addXP, updateTopicMastery, recordStudySession } = useProgressStore();
  const masteryUpdated = useRef(false);

  // Track study time
  useEffect(() => {
    const start = Date.now();
    return () => {
      const mins = Math.round((Date.now() - start) / 60000);
      if (mins >= 1) recordStudySession(mins);
    };
  }, [recordStudySession]);

  const [root, setRoot] = useState<BSTNode | null>(() => buildDefaultTree());
  const [inputVal, setInputVal] = useState("");
  const [searchVal, setSearchVal] = useState("");
  const [infoVal, setInfoVal] = useState("");
  const [nodeStates, setNodeStates] = useState<Map<string, NodeState>>(new Map());
  const [stepLog, setStepLog] = useState<StepLog[]>([]);
  const [logId, setLogId] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [activeTab, setActiveTab] = useState<"visual" | "code" | "tips">("visual");
  const [infoTab, setInfoTab] = useState<"stats" | "traversals">("stats");
  const animRef = useRef(false);

  const addLog = useCallback((message: string, type: StepLog["type"]) => {
    setLogId(id => {
      const newId = id + 1;
      setStepLog(prev => [{ id: newId, message, type }, ...prev.slice(0, 19)]);
      return newId;
    });
  }, []);

  const clearStates = useCallback(() => setNodeStates(new Map()), []);

  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

  // ── Insert ────────────────────────────────────────────────────────────────

  const handleInsert = async () => {
    const val = parseInt(inputVal);
    if (isNaN(val)) { toast.error("Enter a valid number"); return; }
    if (animating) return;
    setAnimating(true);
    animRef.current = true;

    const { root: newRoot, path } = insertBST(root, val);
    addLog(`Inserting ${val}...`, "action");

    for (let i = 0; i < path.length; i++) {
      const states = new Map<string, NodeState>();
      path.slice(0, i).forEach(id => states.set(id, "path"));
      states.set(path[i], "comparing");
      setNodeStates(states);
      const cur = getAllNodes(newRoot).find(n => n.id === path[i]);
      if (cur) {
        if (val < cur.val) addLog(`${val} < ${cur.val} → go left`, "compare");
        else if (val > cur.val) addLog(`${val} > ${cur.val} → go right`, "compare");
        else addLog(`${val} already exists`, "result");
      }
      await sleep(600);
    }

    // find inserted node
    const allNodes = getAllNodes(newRoot);
    const insertedNode = allNodes.find(n => n.val === val && !path.includes(n.id));
    const finalStates = new Map<string, NodeState>();
    path.forEach(id => finalStates.set(id, "path"));
    if (insertedNode) finalStates.set(insertedNode.id, "inserted");

    setNodeStates(finalStates);
    setRoot(newRoot);
    addLog(`✓ Inserted ${val}`, "result");
    addXP(5, "BST Insert");
    if (!masteryUpdated.current) {
      masteryUpdated.current = true;
      updateTopicMastery("bst", {
        masteryScore: 15,
        practiceScore: 10,
        lastStudiedAt: new Date().toISOString(),
        nextRevisionAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
    toast.success(`Inserted ${val}`);
    setInputVal("");
    await sleep(1500);
    clearStates();
    setAnimating(false);
  };

  // ── Search ────────────────────────────────────────────────────────────────

  const handleSearch = async () => {
    const val = parseInt(searchVal);
    if (isNaN(val)) { toast.error("Enter a valid number"); return; }
    if (animating) return;
    setAnimating(true);

    const { found, path } = searchBST(root, val);
    addLog(`Searching for ${val}...`, "action");

    for (let i = 0; i < path.length; i++) {
      const states = new Map<string, NodeState>();
      path.slice(0, i).forEach(id => states.set(id, "path"));
      states.set(path[i], "comparing");
      setNodeStates(states);
      const allNodes = getAllNodes(root);
      const cur = allNodes.find(n => n.id === path[i]);
      if (cur) {
        if (val === cur.val) addLog(`Found ${val} at node ${cur.val}!`, "result");
        else if (val < cur.val) addLog(`${val} < ${cur.val} → go left`, "compare");
        else addLog(`${val} > ${cur.val} → go right`, "compare");
      }
      await sleep(600);
    }

    const finalStates = new Map<string, NodeState>();
    path.forEach((id, i) => {
      if (i === path.length - 1 && found) finalStates.set(id, "found");
      else finalStates.set(id, "path");
    });
    setNodeStates(finalStates);

    if (found) { addLog(`✓ ${val} FOUND!`, "result"); addXP(3, "BST Search"); toast.success(`Found ${val}!`); }
    else { addLog(`✗ ${val} NOT FOUND`, "result"); toast.error(`${val} not found`); }

    await sleep(2000);
    clearStates();
    setAnimating(false);
    setSearchVal("");
  };

  // ── Delete ────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    const val = parseInt(inputVal);
    if (isNaN(val)) { toast.error("Enter a valid number"); return; }
    if (animating) return;
    setAnimating(true);

    const { root: newRoot, path, deletedId, caseType } = deleteBST(root, val);
    addLog(`Deleting ${val}...`, "action");

    for (let i = 0; i < path.length; i++) {
      const states = new Map<string, NodeState>();
      path.slice(0, i).forEach(id => states.set(id, "path"));
      states.set(path[i], "comparing");
      setNodeStates(states);
      await sleep(500);
    }

    if (deletedId) {
      const states = new Map<string, NodeState>();
      path.forEach(id => states.set(id, "path"));
      states.set(deletedId, "deleted");
      setNodeStates(states);
      addLog(`Case: ${caseType}`, "action");
      await sleep(800);
    }

    setRoot(newRoot);
    clearStates();
    addLog(`✓ Deleted ${val} (${caseType || "not found"})`, "result");
    addXP(8, "BST Delete");
    toast.success(`Deleted ${val}`);
    setInputVal("");
    setAnimating(false);
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = () => {
    nodeIdCounter = 0;
    setRoot(buildDefaultTree());
    setNodeStates(new Map());
    setStepLog([]);
    toast.info("Tree reset to default");
  };

  // ── Compute layout ────────────────────────────────────────────────────────

  const SVG_W = 700;
  const SVG_H = 400;
  const positions = new Map<string, NodePosition>();
  computePositions(root, positions, SVG_W / 2, 50, 160, 0);
  const edges = getAllEdges(root, positions);
  const allNodes = getAllNodes(root);

  // ── Info panel ───────────────────────────────────────────────────────────

  const height = getHeight(root);
  const minVal = getMin(root);
  const maxVal = getMax(root);
  const infoNum = parseInt(infoVal);
  const { predecessor, successor } =
    !isNaN(infoNum) ? getInorderPredecessorSuccessor(root, infoNum) : { predecessor: null, successor: null };
  const inorderArr = inorder(root);
  const preorderArr = preorder(root);
  const postorderArr = postorder(root);

  // ─── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-indigo-950/20 to-slate-950 p-4 md:p-6">
      <div className="max-w-7xl mx-auto space-y-6">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center">
          <h1 className="text-4xl font-bold gradient-text mb-2">BST Master Lab</h1>
          <p className="text-slate-400">Interactive Binary Search Tree Visualizer</p>
        </motion.div>

        {/* Main layout */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">

          {/* Left: Controls + Log */}
          <div className="xl:col-span-1 space-y-4">

            {/* Operations */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-4 space-y-3">
              <h3 className="text-indigo-300 font-semibold flex items-center gap-2">
                <TreePine size={16} /> Operations
              </h3>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Value</label>
                <input
                  type="number"
                  value={inputVal}
                  onChange={e => setInputVal(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") handleInsert(); }}
                  placeholder="Enter value..."
                  className="w-full bg-slate-800/60 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleInsert}
                  disabled={animating}
                  className="flex items-center justify-center gap-1 bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/50 text-indigo-200 rounded-lg py-2 text-sm transition-all disabled:opacity-40"
                >
                  <Plus size={14} /> Insert
                </button>
                <button
                  onClick={handleDelete}
                  disabled={animating}
                  className="flex items-center justify-center gap-1 bg-red-600/30 hover:bg-red-600/50 border border-red-500/50 text-red-200 rounded-lg py-2 text-sm transition-all disabled:opacity-40"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>

              <div>
                <label className="text-xs text-slate-400 mb-1 block">Search Value</label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    value={searchVal}
                    onChange={e => setSearchVal(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleSearch(); }}
                    placeholder="Search..."
                    className="flex-1 bg-slate-800/60 border border-slate-600 rounded-lg px-3 py-2 text-white text-sm focus:border-yellow-500 outline-none"
                  />
                  <button
                    onClick={handleSearch}
                    disabled={animating}
                    className="bg-yellow-600/30 hover:bg-yellow-600/50 border border-yellow-500/50 text-yellow-200 rounded-lg px-3 py-2 text-sm transition-all disabled:opacity-40"
                  >
                    <Search size={14} />
                  </button>
                </div>
              </div>

              <button
                onClick={handleReset}
                className="w-full flex items-center justify-center gap-2 bg-slate-700/50 hover:bg-slate-700 border border-slate-600 text-slate-300 rounded-lg py-2 text-sm transition-all"
              >
                <RotateCcw size={14} /> Reset Tree
              </button>
            </motion.div>

            {/* Color legend */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.1 } }} className="glass-card p-4">
              <h3 className="text-slate-300 font-semibold text-sm mb-3">Color Legend</h3>
              <div className="space-y-2">
                {[
                  { color: "bg-indigo-600", label: "Default node" },
                  { color: "bg-yellow-600", label: "Currently comparing" },
                  { color: "bg-indigo-900", label: "Traversal path" },
                  { color: "bg-green-700", label: "Found / Inserted" },
                  { color: "bg-red-700", label: "Deleted node" },
                ].map(item => (
                  <div key={item.label} className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${item.color}`} />
                    <span className="text-xs text-slate-400">{item.label}</span>
                  </div>
                ))}
              </div>
            </motion.div>

            {/* Step Log */}
            <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.2 } }} className="glass-card p-4">
              <h3 className="text-slate-300 font-semibold text-sm mb-3 flex items-center gap-2">
                <List size={14} /> Step Log
              </h3>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                <AnimatePresence>
                  {stepLog.length === 0 && (
                    <p className="text-slate-500 text-xs italic">Operations will be logged here...</p>
                  )}
                  {stepLog.map(log => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`text-xs px-2 py-1 rounded flex items-start gap-1 ${
                        log.type === "compare" ? "text-yellow-300 bg-yellow-900/20" :
                        log.type === "result"  ? "text-green-300 bg-green-900/20" :
                        "text-indigo-300 bg-indigo-900/20"
                      }`}
                    >
                      <ChevronRight size={10} className="mt-0.5 shrink-0" />
                      {log.message}
                    </motion.div>
                  ))}
                </AnimatePresence>
              </div>
            </motion.div>
          </div>

          {/* Center: SVG Tree */}
          <div className="xl:col-span-2 space-y-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }} className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-indigo-300 font-semibold">Binary Search Tree</h3>
                {animating && (
                  <motion.div animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 0.8 }}
                    className="text-xs text-yellow-400 bg-yellow-900/30 px-2 py-1 rounded-full">
                    Animating...
                  </motion.div>
                )}
              </div>

              {root ? (
                <svg width="100%" viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="overflow-visible">
                  {/* Edges */}
                  {edges.map(e => (
                    <line key={e.key} x1={e.x1} y1={e.y1} x2={e.x2} y2={e.y2}
                      stroke="#4338ca" strokeWidth={2} opacity={0.6} />
                  ))}
                  {/* Nodes */}
                  {allNodes.map(node => {
                    const pos = positions.get(node.id);
                    if (!pos) return null;
                    const state = nodeStates.get(node.id) ?? "default";
                    const col = STATE_COLORS[state];
                    return (
                      <motion.g key={node.id}
                        animate={{ scale: state !== "default" ? 1.1 : 1 }}
                        style={{ transformOrigin: `${pos.x}px ${pos.y}px` }}>
                        <motion.circle
                          cx={pos.x} cy={pos.y} r={22}
                          fill={col.fill} stroke={col.stroke} strokeWidth={2.5}
                          animate={{ fill: col.fill, stroke: col.stroke }}
                          transition={{ duration: 0.3 }}
                        />
                        <text x={pos.x} y={pos.y} textAnchor="middle" dominantBaseline="central"
                          fill={col.text} fontSize={13} fontWeight="bold" fontFamily="monospace">
                          {node.val}
                        </text>
                      </motion.g>
                    );
                  })}
                </svg>
              ) : (
                <div className="flex items-center justify-center h-64 text-slate-500">
                  <p>Tree is empty. Insert some values!</p>
                </div>
              )}
            </motion.div>

            {/* Tabs: code / tips */}
            <div className="glass-card p-4">
              <div className="flex gap-2 mb-4">
                {[
                  { id: "visual" as const, label: "Info", icon: <Info size={14} /> },
                  { id: "code" as const, label: "C Code", icon: <Code2 size={14} /> },
                  { id: "tips" as const, label: "Exam Tips", icon: <Lightbulb size={14} /> },
                ].map(tab => (
                  <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                    className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm transition-all ${
                      activeTab === tab.id
                        ? "bg-indigo-600/50 text-indigo-200 border border-indigo-500/50"
                        : "text-slate-400 hover:text-slate-200"
                    }`}>
                    {tab.icon} {tab.label}
                  </button>
                ))}
              </div>

              <AnimatePresence mode="wait">
                {activeTab === "visual" && (
                  <motion.div key="info" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="flex gap-2 mb-3">
                      <button onClick={() => setInfoTab("stats")}
                        className={`text-xs px-3 py-1 rounded-lg transition-all ${infoTab === "stats" ? "bg-purple-600/40 text-purple-200" : "text-slate-400"}`}>
                        Tree Stats
                      </button>
                      <button onClick={() => setInfoTab("traversals")}
                        className={`text-xs px-3 py-1 rounded-lg transition-all ${infoTab === "traversals" ? "bg-purple-600/40 text-purple-200" : "text-slate-400"}`}>
                        Traversals
                      </button>
                    </div>

                    {infoTab === "stats" && (
                      <div className="space-y-3">
                        <div className="grid grid-cols-3 gap-2">
                          {[
                            { label: "Height", value: height },
                            { label: "Min", value: minVal ?? "—" },
                            { label: "Max", value: maxVal ?? "—" },
                          ].map(s => (
                            <div key={s.label} className="bg-slate-800/60 rounded-lg p-3 text-center">
                              <div className="text-xl font-bold text-indigo-300">{s.value}</div>
                              <div className="text-xs text-slate-400">{s.label}</div>
                            </div>
                          ))}
                        </div>
                        <div className="bg-slate-800/40 rounded-lg p-3">
                          <label className="text-xs text-slate-400 block mb-2">Find predecessor/successor of:</label>
                          <div className="flex gap-2">
                            <input type="number" value={infoVal} onChange={e => setInfoVal(e.target.value)}
                              placeholder="Value..." className="flex-1 bg-slate-700/60 border border-slate-600 rounded px-2 py-1 text-white text-sm outline-none focus:border-purple-500" />
                          </div>
                          {!isNaN(infoNum) && infoVal && (
                            <div className="mt-2 grid grid-cols-2 gap-2">
                              <div className="bg-slate-700/50 rounded p-2 text-center">
                                <div className="text-sm font-bold text-cyan-300">{predecessor ?? "None"}</div>
                                <div className="text-xs text-slate-400">Predecessor</div>
                              </div>
                              <div className="bg-slate-700/50 rounded p-2 text-center">
                                <div className="text-sm font-bold text-cyan-300">{successor ?? "None"}</div>
                                <div className="text-xs text-slate-400">Successor</div>
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {infoTab === "traversals" && (
                      <div className="space-y-3">
                        {[
                          { label: "Inorder (L-Root-R)", arr: inorderArr, color: "text-green-300" },
                          { label: "Preorder (Root-L-R)", arr: preorderArr, color: "text-yellow-300" },
                          { label: "Postorder (L-R-Root)", arr: postorderArr, color: "text-purple-300" },
                        ].map(t => (
                          <div key={t.label} className="bg-slate-800/40 rounded-lg p-3">
                            <div className={`text-xs font-semibold mb-2 ${t.color}`}>{t.label}</div>
                            <div className="flex flex-wrap gap-1">
                              {t.arr.map((v, i) => (
                                <span key={i} className="bg-slate-700 text-slate-200 text-xs px-2 py-0.5 rounded font-mono">{v}</span>
                              ))}
                            </div>
                          </div>
                        ))}
                        <p className="text-xs text-indigo-300 bg-indigo-900/20 rounded p-2">
                          💡 Inorder traversal of BST always gives sorted order!
                        </p>
                      </div>
                    )}
                  </motion.div>
                )}

                {activeTab === "code" && (
                  <motion.div key="code" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <pre className="text-xs text-green-300 bg-slate-900/80 rounded-lg p-4 overflow-x-auto font-mono leading-relaxed">
{`// BST Insert (C)
struct Node* insert(struct Node* root, int val) {
    // Base case: empty tree or leaf position
    if (root == NULL) {
        struct Node* node = malloc(sizeof(struct Node));
        node->data = val;
        node->left = node->right = NULL;
        return node;
    }
    // Traverse: left if smaller, right if larger
    if (val < root->data)
        root->left = insert(root->left, val);
    else if (val > root->data)
        root->right = insert(root->right, val);
    // val == root->data: duplicate, ignore
    return root;
}

// BST Delete (C) - handles all 3 cases
struct Node* delete(struct Node* root, int val) {
    if (root == NULL) return NULL;
    
    if (val < root->data)
        root->left = delete(root->left, val);
    else if (val > root->data)
        root->right = delete(root->right, val);
    else {
        // Case 1: Leaf node
        if (!root->left && !root->right) {
            free(root); return NULL;
        }
        // Case 2: One child
        if (!root->left) {
            struct Node* tmp = root->right;
            free(root); return tmp;
        }
        if (!root->right) {
            struct Node* tmp = root->left;
            free(root); return tmp;
        }
        // Case 3: Two children → inorder successor
        struct Node* succ = root->right;
        while (succ->left) succ = succ->left;
        root->data = succ->data;
        root->right = delete(root->right, succ->data);
    }
    return root;
}`}
                    </pre>
                  </motion.div>
                )}

                {activeTab === "tips" && (
                  <motion.div key="tips" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <div className="space-y-3">
                      {[
                        {
                          title: "BST Delete — 3 Cases (Most Tested!)",
                          icon: "🗑️",
                          color: "border-red-500/40",
                          items: [
                            "Case 1 — Leaf: Simply remove the node (set parent pointer to NULL)",
                            "Case 2 — One child: Replace node with its only child",
                            "Case 3 — Two children: Find inorder successor (smallest in right subtree), copy its value, then delete the successor",
                          ],
                        },
                        {
                          title: "BST Time Complexities",
                          icon: "⏱️",
                          color: "border-indigo-500/40",
                          items: [
                            "Average case: O(log n) for insert/search/delete",
                            "Worst case: O(n) for skewed tree (all inserts ascending/descending)",
                            "Inorder traversal: O(n) always",
                          ],
                        },
                        {
                          title: "Key Properties",
                          icon: "🔑",
                          color: "border-cyan-500/40",
                          items: [
                            "Left subtree: ALL values < root",
                            "Right subtree: ALL values > root",
                            "Inorder traversal gives SORTED array",
                            "Height of balanced BST: ⌊log₂n⌋",
                          ],
                        },
                        {
                          title: "Common Exam Traps",
                          icon: "⚠️",
                          color: "border-yellow-500/40",
                          items: [
                            "Inorder successor ≠ right child (it's the leftmost node of right subtree)",
                            "Skewed BST has the SAME operations as a linked list",
                            "BST does not allow duplicate values (by convention)",
                          ],
                        },
                      ].map(section => (
                        <div key={section.title} className={`border rounded-lg p-3 ${section.color} bg-slate-800/30`}>
                          <h4 className="text-sm font-semibold text-slate-200 mb-2">{section.icon} {section.title}</h4>
                          <ul className="space-y-1">
                            {section.items.map((item, i) => (
                              <li key={i} className="text-xs text-slate-400 flex gap-2">
                                <ChevronRight size={10} className="mt-0.5 shrink-0 text-indigo-400" />
                                {item}
                              </li>
                            ))}
                          </ul>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Right: Quick reference */}
          <div className="xl:col-span-1 space-y-4">
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-4">
              <h3 className="text-indigo-300 font-semibold mb-3 flex items-center gap-2">
                <BookOpen size={16} /> BST Properties
              </h3>
              <div className="space-y-3 text-xs text-slate-300">
                <div className="bg-slate-800/60 rounded-lg p-3">
                  <div className="text-indigo-400 font-semibold mb-1">Structure</div>
                  <div className="font-mono space-y-0.5">
                    <div>left &lt; root &lt; right</div>
                    <div>No duplicate keys</div>
                    <div>Each subtree is a BST</div>
                  </div>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3">
                  <div className="text-green-400 font-semibold mb-1">Complexities</div>
                  <table className="w-full">
                    <tbody>
                      {[["Insert", "O(h)"], ["Search", "O(h)"], ["Delete", "O(h)"], ["Traversal", "O(n)"]].map(([op, c]) => (
                        <tr key={op}>
                          <td className="text-slate-400 py-0.5">{op}</td>
                          <td className="text-cyan-300 font-mono text-right">{c}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  <div className="text-xs text-slate-500 mt-1">h = height (log n avg, n worst)</div>
                </div>
                <div className="bg-slate-800/60 rounded-lg p-3">
                  <div className="text-yellow-400 font-semibold mb-1">Delete Cases</div>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="bg-red-600/40 text-red-300 px-1.5 rounded">1</span>
                      <span>Leaf → remove</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-yellow-600/40 text-yellow-300 px-1.5 rounded">2</span>
                      <span>1 child → bypass</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="bg-green-600/40 text-green-300 px-1.5 rounded">3</span>
                      <span>2 children → successor</span>
                    </div>
                  </div>
                </div>
                <div className="bg-indigo-900/30 border border-indigo-500/30 rounded-lg p-3">
                  <div className="text-indigo-300 font-semibold mb-1">💡 Mnemonic</div>
                  <div className="text-slate-300">
                    BST inorder = <span className="text-green-300 font-bold">Sorted</span> array
                  </div>
                  <div className="text-slate-400 mt-1">
                    "BST Sorts Things"
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Node count / tree info */}
            <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.1 } }} className="glass-card p-4">
              <h3 className="text-indigo-300 font-semibold mb-3">Tree Stats</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "Nodes", value: allNodes.length },
                  { label: "Height", value: height },
                  { label: "Min", value: minVal ?? "—" },
                  { label: "Max", value: maxVal ?? "—" },
                ].map(s => (
                  <div key={s.label} className="bg-slate-800/60 rounded-lg p-2 text-center">
                    <div className="text-lg font-bold text-indigo-300">{s.value}</div>
                    <div className="text-xs text-slate-500">{s.label}</div>
                  </div>
                ))}
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
}
