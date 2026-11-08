"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Plus, Trash2, RotateCcw, Play, ChevronRight, Info,
  BookOpen, Code2, Zap, GitBranch, AlertTriangle, CheckCircle2,
  ArrowRight, Layers, Hash
} from "lucide-react";
import { toast } from "sonner";
import { useProgressStore } from "@/lib/stores/progress-store";

// ─── AVL Tree Core ─────────────────────────────────────────────────────────────

interface AVLNode {
  val: number;
  left: number | null;
  right: number | null;
  height: number;
  id: number; // unique stable id for animation keys
}

type NodeMap = Map<number, AVLNode>; // key = val (or id if duplicates)

interface TreeState {
  nodes: Record<number, AVLNode>; // keyed by val
  root: number | null;
  nodeCount: number;
  treeHeight: number;
}

interface StepLog {
  id: number;
  message: string;
  type: "insert" | "delete" | "rotate" | "balance" | "compare" | "info";
  timestamp: number;
}

type RotationType = "LL" | "RR" | "LR" | "RL" | null;

// Pure functional AVL helpers operating on a mutable node store
function getHeight(nodes: Record<number, AVLNode>, key: number | null): number {
  if (key === null) return 0;
  return nodes[key]?.height ?? 0;
}

function getBalance(nodes: Record<number, AVLNode>, key: number | null): number {
  if (key === null) return 0;
  const node = nodes[key];
  if (!node) return 0;
  return getHeight(nodes, node.left) - getHeight(nodes, node.right);
}

function updateHeight(nodes: Record<number, AVLNode>, key: number): void {
  const node = nodes[key];
  if (!node) return;
  node.height = 1 + Math.max(getHeight(nodes, node.left), getHeight(nodes, node.right));
}

// Returns new root key after right rotation
function rotateRight(nodes: Record<number, AVLNode>, yKey: number): number {
  const y = nodes[yKey];
  const xKey = y.left!;
  const x = nodes[xKey];
  const T2 = x.right;

  x.right = yKey;
  y.left = T2;

  updateHeight(nodes, yKey);
  updateHeight(nodes, xKey);

  return xKey;
}

// Returns new root key after left rotation
function rotateLeft(nodes: Record<number, AVLNode>, xKey: number): number {
  const x = nodes[xKey];
  const yKey = x.right!;
  const y = nodes[yKey];
  const T2 = y.left;

  y.left = xKey;
  x.right = T2;

  updateHeight(nodes, xKey);
  updateHeight(nodes, yKey);

  return yKey;
}

// Returns { newRoot, rotation }
function balance(
  nodes: Record<number, AVLNode>,
  key: number,
  logs: string[]
): { newRoot: number; rotation: RotationType } {
  updateHeight(nodes, key);
  const bf = getBalance(nodes, key);
  let rotation: RotationType = null;

  // LL
  if (bf > 1 && getBalance(nodes, nodes[key].left) >= 0) {
    logs.push(`⟳ LL Rotation at node ${key} (BF=${bf})`);
    rotation = "LL";
    return { newRoot: rotateRight(nodes, key), rotation };
  }
  // LR
  if (bf > 1 && getBalance(nodes, nodes[key].left) < 0) {
    logs.push(`⟳ LR Rotation at node ${key} (BF=${bf})`);
    rotation = "LR";
    nodes[key].left = rotateLeft(nodes, nodes[key].left!);
    return { newRoot: rotateRight(nodes, key), rotation };
  }
  // RR
  if (bf < -1 && getBalance(nodes, nodes[key].right) <= 0) {
    logs.push(`⟳ RR Rotation at node ${key} (BF=${bf})`);
    rotation = "RR";
    return { newRoot: rotateLeft(nodes, key), rotation };
  }
  // RL
  if (bf < -1 && getBalance(nodes, nodes[key].right) > 0) {
    logs.push(`⟳ RL Rotation at node ${key} (BF=${bf})`);
    rotation = "RL";
    nodes[key].right = rotateRight(nodes, nodes[key].right!);
    return { newRoot: rotateLeft(nodes, key), rotation };
  }

  return { newRoot: key, rotation };
}

let globalNodeId = 1;

function insertNode(
  nodes: Record<number, AVLNode>,
  key: number | null,
  val: number,
  path: number[],
  logs: string[]
): { newRoot: number; rotation: RotationType } {
  if (key === null) {
    const id = globalNodeId++;
    nodes[val] = { val, left: null, right: null, height: 1, id };
    logs.push(`✦ Inserted node ${val}`);
    return { newRoot: val, rotation: null };
  }

  path.push(key);

  if (val < key) {
    logs.push(`↙ ${val} < ${key}, go left`);
    const { newRoot, rotation } = insertNode(nodes, nodes[key].left, val, path, logs);
    nodes[key].left = newRoot;
    if (rotation) return { newRoot: balance(nodes, key, logs).newRoot, rotation };
  } else if (val > key) {
    logs.push(`↗ ${val} > ${key}, go right`);
    const { newRoot, rotation } = insertNode(nodes, nodes[key].right, val, path, logs);
    nodes[key].right = newRoot;
    if (rotation) return { newRoot: balance(nodes, key, logs).newRoot, rotation };
  } else {
    logs.push(`⚠ Duplicate value ${val} ignored`);
    return { newRoot: key, rotation: null };
  }

  const bf = getBalance(nodes, key);
  logs.push(`  BF of ${key} = ${bf}`);
  return balance(nodes, key, logs);
}

function minValueNode(nodes: Record<number, AVLNode>, key: number): number {
  let cur = key;
  while (nodes[cur].left !== null) cur = nodes[cur].left!;
  return cur;
}

function deleteNode(
  nodes: Record<number, AVLNode>,
  key: number | null,
  val: number,
  logs: string[]
): { newRoot: number | null; rotation: RotationType } {
  if (key === null) {
    logs.push(`⚠ Node ${val} not found`);
    return { newRoot: null, rotation: null };
  }

  if (val < key) {
    const { newRoot, rotation } = deleteNode(nodes, nodes[key].left, val, logs);
    nodes[key].left = newRoot;
    if (rotation) return { newRoot: balance(nodes, key, logs).newRoot, rotation };
  } else if (val > key) {
    const { newRoot, rotation } = deleteNode(nodes, nodes[key].right, val, logs);
    nodes[key].right = newRoot;
    if (rotation) return { newRoot: balance(nodes, key, logs).newRoot, rotation };
  } else {
    logs.push(`✦ Deleted node ${val}`);
    if (nodes[key].left === null || nodes[key].right === null) {
      const child = nodes[key].left ?? nodes[key].right;
      delete nodes[key];
      return { newRoot: child, rotation: null };
    }
    const successor = minValueNode(nodes, nodes[key].right!);
    logs.push(`  Successor of ${val} is ${successor}`);
    nodes[key].val = successor;
    nodes[successor] = { ...nodes[key], val: nodes[key].val };
    // re-key: delete old entry
    const { newRoot: newRight, rotation } = deleteNode(nodes, nodes[key].right, successor, logs);
    nodes[key].right = newRight;
    if (rotation) return { newRoot: balance(nodes, key, logs).newRoot, rotation };
  }

  const bf = getBalance(nodes, key);
  logs.push(`  BF of ${key} = ${bf}`);
  return balance(nodes, key, logs);
}

function computeTreeHeight(nodes: Record<number, AVLNode>, key: number | null): number {
  if (key === null || !nodes[key]) return 0;
  return nodes[key].height;
}

// ─── SVG Tree Layout ────────────────────────────────────────────────────────────

interface NodePosition {
  key: number;
  x: number;
  y: number;
  bf: number;
}

function assignPositions(
  nodes: Record<number, AVLNode>,
  key: number | null,
  x: number,
  y: number,
  spread: number,
  positions: NodePosition[],
  edges: [NodePosition, NodePosition][]
): NodePosition | null {
  if (key === null || !nodes[key]) return null;

  const bf = getBalance(nodes, key);
  const pos: NodePosition = { key, x, y, bf };
  positions.push(pos);

  const leftPos = assignPositions(nodes, nodes[key].left, x - spread, y + 80, spread / 1.6, positions, edges);
  if (leftPos) edges.push([pos, leftPos]);

  const rightPos = assignPositions(nodes, nodes[key].right, x + spread, y + 80, spread / 1.6, positions, edges);
  if (rightPos) edges.push([pos, rightPos]);

  return pos;
}

// ─── Component ──────────────────────────────────────────────────────────────────

const PRESETS = [
  { label: "Classic AVL", values: [63, 9, 19, 27, 18, 108] },
  { label: "Right-heavy", values: [10, 20, 30, 40, 50] },
  { label: "Left-heavy", values: [50, 40, 30, 20, 10] },
  { label: "Balanced", values: [4, 2, 6, 1, 3, 5, 7] },
  { label: "LR Test", values: [30, 10, 20] },
  { label: "RL Test", values: [10, 30, 20] },
];

const C_CODE = `// AVL Node
typedef struct Node {
    int val, height;
    struct Node *left, *right;
} Node;

int height(Node *n) {
    return n ? n->height : 0;
}
int getBalance(Node *n) {
    return n ? height(n->left)
             - height(n->right) : 0;
}

Node* rotateRight(Node *y) {
    Node *x = y->left, *T2 = x->right;
    x->right = y; y->left = T2;
    y->height = 1 + max(height(y->left),
                        height(y->right));
    x->height = 1 + max(height(x->left),
                        height(x->right));
    return x; // new root
}

Node* rotateLeft(Node *x) {
    Node *y = x->right, *T2 = y->left;
    y->left = x; x->right = T2;
    x->height = 1 + max(height(x->left),
                        height(x->right));
    y->height = 1 + max(height(y->left),
                        height(y->right));
    return y; // new root
}

Node* insert(Node *node, int val) {
    if (!node) return newNode(val);
    if (val < node->val)
        node->left = insert(node->left, val);
    else if (val > node->val)
        node->right = insert(node->right,val);
    else return node; // duplicate

    node->height = 1 + max(
        height(node->left),
        height(node->right));
    int bf = getBalance(node);

    // LL
    if (bf>1 && val<node->left->val)
        return rotateRight(node);
    // RR
    if (bf<-1 && val>node->right->val)
        return rotateLeft(node);
    // LR
    if (bf>1 && val>node->left->val) {
        node->left=rotateLeft(node->left);
        return rotateRight(node);
    }
    // RL
    if (bf<-1 && val<node->right->val){
        node->right=rotateRight(node->right);
        return rotateLeft(node);
    }
    return node;
}`;

const ROTATION_DETAILS: Record<string, { title: string; condition: string; steps: string[]; color: string }> = {
  LL: {
    title: "LL Rotation (Right Rotation)",
    condition: "BF > 1 and new node in LEFT-LEFT position",
    steps: ["Identify unbalanced node Z", "Make Z's left child (Y) the new root", "Y's right subtree becomes Z's left subtree", "Z becomes Y's right child"],
    color: "text-emerald-400",
  },
  RR: {
    title: "RR Rotation (Left Rotation)",
    condition: "BF < -1 and new node in RIGHT-RIGHT position",
    steps: ["Identify unbalanced node Z", "Make Z's right child (Y) the new root", "Y's left subtree becomes Z's right subtree", "Z becomes Y's left child"],
    color: "text-blue-400",
  },
  LR: {
    title: "LR Rotation (Left-Right Double)",
    condition: "BF > 1 and new node in LEFT-RIGHT position",
    steps: ["First: Left Rotation on left child", "Then: Right Rotation on unbalanced node", "Two steps = double rotation"],
    color: "text-amber-400",
  },
  RL: {
    title: "RL Rotation (Right-Left Double)",
    condition: "BF < -1 and new node in RIGHT-LEFT position",
    steps: ["First: Right Rotation on right child", "Then: Left Rotation on unbalanced node", "Two steps = double rotation"],
    color: "text-purple-400",
  },
};

export default function AVLVisualizerPage() {
  const { addXP } = useProgressStore();

  // Tree state
  const [nodes, setNodes] = useState<Record<number, AVLNode>>({});
  const [root, setRoot] = useState<number | null>(null);
  const [insertVal, setInsertVal] = useState("");
  const [deleteVal, setDeleteVal] = useState("");

  // Visual state
  const [lastInsertedPath, setLastInsertedPath] = useState<number[]>([]);
  const [highlightedNode, setHighlightedNode] = useState<number | null>(null);
  const [lastRotation, setLastRotation] = useState<RotationType>(null);
  const [rotationNode, setRotationNode] = useState<number | null>(null);
  const [showRotationBadge, setShowRotationBadge] = useState(false);

  // Logs
  const [stepLogs, setStepLogs] = useState<StepLog[]>([]);
  const logIdRef = useRef(0);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // UI state
  const [activeTab, setActiveTab] = useState<"exam" | "code">("exam");
  const [showPresets, setShowPresets] = useState(false);

  const addLog = useCallback((message: string, type: StepLog["type"]) => {
    logIdRef.current++;
    setStepLogs(prev => [
      { id: logIdRef.current, message, type, timestamp: Date.now() },
      ...prev.slice(0, 49),
    ]);
  }, []);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollTop = 0;
    }
  }, [stepLogs]);

  const handleInsert = useCallback(() => {
    const raw = insertVal.trim();
    if (!raw) {
      toast.error("Enter a value to insert");
      return;
    }
    const val = parseInt(raw, 10);
    if (isNaN(val) || val < -999 || val > 9999) {
      toast.error("Value must be a number between -999 and 9999");
      return;
    }
    if (nodes[val]) {
      toast.warning(`Node ${val} already exists in tree`);
      return;
    }

    const nodesCopy: Record<number, AVLNode> = JSON.parse(JSON.stringify(nodes));
    const path: number[] = [];
    const logs: string[] = [];

    const { newRoot, rotation } = insertNode(nodesCopy, root, val, path, logs);

    setNodes(nodesCopy);
    setRoot(newRoot);
    setLastInsertedPath([...path, val]);
    setHighlightedNode(val);
    setLastRotation(rotation);
    setRotationNode(rotation ? path[path.length - 1] ?? newRoot : null);

    logs.forEach((msg, i) => {
      const type: StepLog["type"] = msg.includes("⟳") ? "rotate"
        : msg.includes("↙") || msg.includes("↗") ? "compare"
        : msg.includes("BF") ? "balance"
        : "insert";
      setTimeout(() => addLog(msg, type), i * 30);
    });

    if (rotation) {
      setShowRotationBadge(true);
      setTimeout(() => setShowRotationBadge(false), 3500);
      toast.success(`${rotation} Rotation performed!`, {
        description: ROTATION_DETAILS[rotation]?.condition,
        duration: 3000,
      });
    } else {
      toast.success(`Inserted ${val}`, { icon: "✦" });
    }

    setTimeout(() => setHighlightedNode(null), 2000);
    addXP(10);
    setInsertVal("");
  }, [insertVal, nodes, root, addLog, addXP]);

  const handleDelete = useCallback(() => {
    const raw = deleteVal.trim();
    if (!raw) {
      toast.error("Enter a value to delete");
      return;
    }
    const val = parseInt(raw, 10);
    if (isNaN(val)) {
      toast.error("Value must be a number");
      return;
    }
    if (!nodes[val]) {
      toast.error(`Node ${val} not found in tree`);
      return;
    }

    const nodesCopy: Record<number, AVLNode> = JSON.parse(JSON.stringify(nodes));
    const logs: string[] = [];

    const { newRoot, rotation } = deleteNode(nodesCopy, root, val, logs);

    setNodes(nodesCopy);
    setRoot(newRoot);
    setLastInsertedPath([]);
    setHighlightedNode(null);
    setLastRotation(rotation);

    logs.forEach((msg, i) => {
      const type: StepLog["type"] = msg.includes("⟳") ? "rotate"
        : msg.includes("BF") ? "balance"
        : "delete";
      setTimeout(() => addLog(msg, type), i * 30);
    });

    if (rotation) {
      setShowRotationBadge(true);
      setTimeout(() => setShowRotationBadge(false), 3500);
      toast.success(`${rotation} Rotation performed!`, { description: ROTATION_DETAILS[rotation]?.condition });
    } else {
      toast.success(`Deleted ${val}`, { icon: "🗑" });
    }

    addXP(10);
    setDeleteVal("");
  }, [deleteVal, nodes, root, addLog, addXP]);

  const handleReset = useCallback(() => {
    setNodes({});
    setRoot(null);
    setStepLogs([]);
    setLastInsertedPath([]);
    setHighlightedNode(null);
    setLastRotation(null);
    setRotationNode(null);
    globalNodeId = 1;
    toast.info("Tree reset", { icon: "🔄" });
  }, []);

  const handlePreset = useCallback((values: number[]) => {
    setNodes({});
    setRoot(null);
    setStepLogs([]);
    setLastInsertedPath([]);
    setHighlightedNode(null);
    setLastRotation(null);
    globalNodeId = 1;

    let currentNodes: Record<number, AVLNode> = {};
    let currentRoot: number | null = null;
    const allLogs: string[] = [];

    values.forEach(val => {
      const path: number[] = [];
      const logs: string[] = [];
      const { newRoot } = insertNode(currentNodes, currentRoot, val, path, logs);
      currentRoot = newRoot;
      allLogs.push(...logs);
    });

    setNodes(currentNodes);
    setRoot(currentRoot);
    allLogs.forEach((msg, i) => {
      const type: StepLog["type"] = msg.includes("⟳") ? "rotate" : msg.includes("BF") ? "balance" : "insert";
      setTimeout(() => addLog(msg, type), i * 20);
    });

    toast.success(`Loaded preset: ${values.join(", ")}`, { icon: "📊" });
    addXP(10);
    setShowPresets(false);
  }, [addLog, addXP]);

  // Compute SVG positions
  const SVG_W = 820;
  const SVG_H = 440;
  const positions: NodePosition[] = [];
  const edges: [NodePosition, NodePosition][] = [];
  const nodeCount = Object.keys(nodes).length;
  const treeHeight = computeTreeHeight(nodes, root);

  if (root !== null) {
    assignPositions(nodes, root, SVG_W / 2, 50, SVG_W / 4, positions, edges);
  }

  const posMap = new Map(positions.map(p => [p.key, p]));

  const getNodeColor = (bf: number, key: number) => {
    if (highlightedNode === key) return { fill: "#6366f1", stroke: "#a5b4fc" };
    if (Math.abs(bf) > 1) return { fill: "#7f1d1d", stroke: "#ef4444" };
    if (bf === 0) return { fill: "#064e3b", stroke: "#10b981" };
    return { fill: "#1e1b4b", stroke: "#818cf8" };
  };

  const isOnPath = (key: number) => lastInsertedPath.includes(key);

  const logTypeStyle = (type: StepLog["type"]) => {
    switch (type) {
      case "rotate": return "text-amber-400 bg-amber-400/10 border-amber-400/30";
      case "balance": return "text-cyan-400 bg-cyan-400/10 border-cyan-400/30";
      case "compare": return "text-indigo-400 bg-indigo-400/10 border-indigo-400/30";
      case "insert": return "text-emerald-400 bg-emerald-400/10 border-emerald-400/30";
      case "delete": return "text-rose-400 bg-rose-400/10 border-rose-400/30";
      default: return "text-slate-400 bg-slate-400/10 border-slate-400/30";
    }
  };

  return (
    <div className="min-h-screen bg-black text-white p-4 md:p-6">
      {/* ── Header ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40">
            <GitBranch className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">AVL Tree Master</h1>
            <p className="text-slate-400 text-sm">Self-Balancing BST Visualizer · Interactive Learning</p>
          </div>
        </div>
      </motion.div>

      {/* ── Main Grid ── */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-5">

        {/* ── Left Column: Canvas + Controls ── */}
        <div className="space-y-5">

          {/* Controls */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4"
          >
            <div className="flex flex-wrap gap-3 items-end">
              {/* Insert */}
              <div className="flex gap-2 items-end">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Insert Value</label>
                  <input
                    type="number"
                    value={insertVal}
                    onChange={e => setInsertVal(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleInsert()}
                    placeholder="e.g. 42"
                    className="bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white w-28 focus:outline-none focus:border-indigo-500"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleInsert}
                  className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" /> Insert
                </motion.button>
              </div>

              {/* Delete */}
              <div className="flex gap-2 items-end">
                <div>
                  <label className="text-xs text-slate-400 mb-1 block">Delete Value</label>
                  <input
                    type="number"
                    value={deleteVal}
                    onChange={e => setDeleteVal(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleDelete()}
                    placeholder="e.g. 19"
                    className="bg-slate-900/80 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white w-28 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={handleDelete}
                  className="flex items-center gap-1.5 bg-rose-700 hover:bg-rose-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </motion.button>
              </div>

              {/* Preset */}
              <div className="relative">
                <motion.button
                  whileHover={{ scale: 1.04 }}
                  whileTap={{ scale: 0.96 }}
                  onClick={() => setShowPresets(v => !v)}
                  className="flex items-center gap-1.5 bg-purple-700 hover:bg-purple-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors"
                >
                  <Play className="w-4 h-4" /> Presets
                </motion.button>
                <AnimatePresence>
                  {showPresets && (
                    <motion.div
                      initial={{ opacity: 0, y: -6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.95 }}
                      className="absolute top-full mt-2 left-0 glass-card p-2 z-20 w-52 space-y-1"
                    >
                      {PRESETS.map(p => (
                        <button
                          key={p.label}
                          onClick={() => handlePreset(p.values)}
                          className="w-full text-left px-3 py-2 rounded-lg text-sm hover:bg-indigo-500/20 text-slate-300 hover:text-white transition-colors"
                        >
                          <span className="font-medium text-indigo-400">{p.label}</span>
                          <span className="text-slate-500 ml-2 text-xs">[{p.values.join(", ")}]</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Reset */}
              <motion.button
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.96 }}
                onClick={handleReset}
                className="flex items-center gap-1.5 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors ml-auto"
              >
                <RotateCcw className="w-4 h-4" /> Reset
              </motion.button>
            </div>
          </motion.div>

          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Nodes", value: nodeCount, icon: Hash, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/30" },
              { label: "Height", value: treeHeight, icon: Layers, color: "text-cyan-400", bg: "bg-cyan-500/10 border-cyan-500/30" },
              { label: "Last Rotation", value: lastRotation ?? "None", icon: Zap, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/30" },
            ].map(stat => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`glass rounded-xl p-3 border ${stat.bg} flex items-center gap-3`}
              >
                <stat.icon className={`w-5 h-5 ${stat.color} flex-shrink-0`} />
                <div>
                  <div className="text-xs text-slate-500">{stat.label}</div>
                  <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* SVG Canvas */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-3 relative overflow-hidden"
          >
            {/* Rotation badge */}
            <AnimatePresence>
              {showRotationBadge && lastRotation && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.5, y: -20 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.5, y: -20 }}
                  className="absolute top-4 left-1/2 -translate-x-1/2 z-10 bg-amber-500 text-black font-bold px-5 py-2 rounded-full text-sm shadow-lg shadow-amber-500/40 flex items-center gap-2"
                >
                  <Zap className="w-4 h-4" />
                  {lastRotation} Rotation!
                </motion.div>
              )}
            </AnimatePresence>

            {/* Legend */}
            <div className="flex gap-4 mb-2 flex-wrap">
              {[
                { color: "#064e3b", stroke: "#10b981", label: "Balanced (BF=0)" },
                { color: "#1e1b4b", stroke: "#818cf8", label: "Balanced (BF=±1)" },
                { color: "#7f1d1d", stroke: "#ef4444", label: "Unbalanced (|BF|>1)" },
                { color: "#6366f1", stroke: "#a5b4fc", label: "Newly Inserted" },
              ].map(l => (
                <div key={l.label} className="flex items-center gap-1.5">
                  <div className="w-4 h-4 rounded-full border-2" style={{ background: l.color, borderColor: l.stroke }} />
                  <span className="text-xs text-slate-400">{l.label}</span>
                </div>
              ))}
            </div>

            <div className="overflow-x-auto">
              <svg
                width={SVG_W}
                height={positions.length === 0 ? 180 : SVG_H}
                className="mx-auto block"
                style={{ minWidth: "100%", maxWidth: SVG_W }}
                viewBox={`0 0 ${SVG_W} ${positions.length === 0 ? 180 : SVG_H}`}
              >
                {/* Empty state */}
                {positions.length === 0 && (
                  <text x={SVG_W / 2} y={90} textAnchor="middle" fill="#475569" fontSize="18" fontFamily="system-ui">
                    Insert values to build your AVL tree
                  </text>
                )}

                {/* Edges */}
                <g>
                  {edges.map(([from, to], i) => {
                    const pathHighlighted = isOnPath(from.key) && isOnPath(to.key);
                    return (
                      <motion.line
                        key={`edge-${from.key}-${to.key}-${i}`}
                        initial={{ opacity: 0, pathLength: 0 }}
                        animate={{ opacity: 1, pathLength: 1 }}
                        transition={{ duration: 0.4 }}
                        x1={from.x} y1={from.y}
                        x2={to.x} y2={to.y}
                        stroke={pathHighlighted ? "#6366f1" : "#334155"}
                        strokeWidth={pathHighlighted ? 2.5 : 1.5}
                        strokeDasharray={pathHighlighted ? "none" : "none"}
                      />
                    );
                  })}
                </g>

                {/* Nodes */}
                <g>
                  <AnimatePresence>
                    {positions.map(({ key, x, y, bf }) => {
                      const { fill, stroke } = getNodeColor(bf, key);
                      const onPath = isOnPath(key);
                      const r = 24;
                      return (
                        <motion.g
                          key={`node-${key}-${nodes[key]?.id}`}
                          initial={{ opacity: 0, scale: 0, x, y }}
                          animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
                          exit={{ opacity: 0, scale: 0 }}
                          transition={{ type: "spring", stiffness: 300, damping: 25 }}
                        >
                          {/* Glow ring for path */}
                          {onPath && (
                            <circle
                              cx={x} cy={y} r={r + 5}
                              fill="none"
                              stroke="#6366f1"
                              strokeWidth="1.5"
                              opacity={0.5}
                            />
                          )}
                          {/* Main circle */}
                          <circle
                            cx={x} cy={y} r={r}
                            fill={fill}
                            stroke={stroke}
                            strokeWidth="2"
                            filter={Math.abs(bf) > 1 ? "url(#redGlow)" : onPath ? "url(#indigoGlow)" : undefined}
                          />
                          {/* Value text */}
                          <text
                            x={x} y={y + 1}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize={key > 99 || key < -9 ? "10" : "13"}
                            fontWeight="700"
                            fontFamily="monospace"
                          >
                            {key}
                          </text>
                          {/* Balance factor */}
                          <text
                            x={x} y={y + r + 13}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill={Math.abs(bf) > 1 ? "#ef4444" : bf === 0 ? "#10b981" : "#818cf8"}
                            fontSize="10"
                            fontWeight="600"
                            fontFamily="monospace"
                          >
                            BF:{bf}
                          </text>
                          {/* Height badge */}
                          <text
                            x={x + r - 4} y={y - r + 4}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="#94a3b8"
                            fontSize="8"
                            fontFamily="monospace"
                          >
                            h{nodes[key]?.height ?? 0}
                          </text>
                        </motion.g>
                      );
                    })}
                  </AnimatePresence>
                </g>

                {/* SVG Filters */}
                <defs>
                  <filter id="redGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                  <filter id="indigoGlow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="2" result="blur" />
                    <feComposite in="SourceGraphic" in2="blur" operator="over" />
                  </filter>
                </defs>
              </svg>
            </div>
          </motion.div>

          {/* Rotation Info Card */}
          <AnimatePresence>
            {lastRotation && ROTATION_DETAILS[lastRotation] && (
              <motion.div
                key={lastRotation}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                className="glass-card p-4 border border-amber-500/30 bg-amber-500/5"
              >
                <div className="flex items-start gap-3">
                  <Zap className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
                  <div>
                    <h3 className={`font-bold ${ROTATION_DETAILS[lastRotation].color} mb-1`}>
                      {ROTATION_DETAILS[lastRotation].title}
                    </h3>
                    <p className="text-xs text-slate-400 mb-2">
                      <span className="text-amber-400 font-medium">Trigger: </span>
                      {ROTATION_DETAILS[lastRotation].condition}
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {ROTATION_DETAILS[lastRotation].steps.map((step, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                          <span className="bg-amber-500/20 text-amber-400 text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-xs text-slate-300">{step}</span>
                          {i < ROTATION_DETAILS[lastRotation].steps.length - 1 && (
                            <ArrowRight className="w-3 h-3 text-slate-600" />
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Step Log */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <ChevronRight className="w-4 h-4 text-indigo-400" />
              <h2 className="text-sm font-bold text-slate-200">Operation Log</h2>
              <span className="text-xs text-slate-500 ml-auto">{stepLogs.length} entries</span>
            </div>
            <div
              ref={logsEndRef}
              className="space-y-1.5 max-h-44 overflow-y-auto pr-1 scrollbar-thin"
            >
              <AnimatePresence initial={false}>
                {stepLogs.length === 0 ? (
                  <p className="text-slate-600 text-xs text-center py-4">No operations yet</p>
                ) : (
                  stepLogs.map(log => (
                    <motion.div
                      key={log.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className={`text-xs px-2.5 py-1.5 rounded-md border font-mono ${logTypeStyle(log.type)}`}
                    >
                      {log.message}
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* ── Right Column: Info Panels ── */}
        <div className="space-y-5">

          {/* Tab Switcher */}
          <div className="glass-card p-1 flex gap-1">
            {(["exam", "code"] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-semibold transition-all ${
                  activeTab === tab
                    ? "bg-indigo-600 text-white"
                    : "text-slate-400 hover:text-white"
                }`}
              >
                {tab === "exam" ? <BookOpen className="w-4 h-4" /> : <Code2 className="w-4 h-4" />}
                {tab === "exam" ? "Exam Notes" : "C Code"}
              </button>
            ))}
          </div>

          {/* Exam Notes */}
          <AnimatePresence mode="wait">
            {activeTab === "exam" && (
              <motion.div
                key="exam"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                {/* BF Formula */}
                <div className="glass-card p-4 border border-cyan-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Info className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-cyan-400">Balance Factor</h3>
                  </div>
                  <div className="bg-slate-900/60 rounded-lg p-3 font-mono text-center mb-2">
                    <span className="text-indigo-300 text-sm">BF = H(Left) − H(Right)</span>
                  </div>
                  <div className="text-xs text-slate-400 space-y-1">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" />
                      <span>AVL Property: <span className="text-emerald-400 font-bold">-1 ≤ BF ≤ 1</span></span>
                    </div>
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400 flex-shrink-0" />
                      <span>Violation: <span className="text-red-400 font-bold">|BF| &gt; 1</span> → Rotate!</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Zap className="w-3.5 h-3.5 text-amber-400 flex-shrink-0" />
                      <span>Height of null node = 0</span>
                    </div>
                  </div>
                </div>

                {/* Rotation Table */}
                <div className="glass-card p-4 border border-purple-500/30">
                  <h3 className="text-sm font-bold text-purple-400 mb-3 flex items-center gap-2">
                    <Zap className="w-4 h-4" /> Rotation Rules
                  </h3>
                  <div className="space-y-2">
                    {Object.entries(ROTATION_DETAILS).map(([key, r]) => (
                      <div key={key} className="bg-slate-900/40 rounded-lg p-2.5">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-bold px-2 py-0.5 rounded ${r.color} bg-current/10`}
                            style={{ background: "rgba(99,102,241,0.1)" }}>
                            {key}
                          </span>
                          <span className={`text-xs font-semibold ${r.color}`}>{r.title.split("(")[1]?.replace(")", "")}</span>
                        </div>
                        <p className="text-xs text-slate-400">{r.condition}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Complexity */}
                <div className="glass-card p-4 border border-indigo-500/30">
                  <h3 className="text-sm font-bold text-indigo-400 mb-3 flex items-center gap-2">
                    <Layers className="w-4 h-4" /> Time Complexity
                  </h3>
                  <div className="space-y-2">
                    {[
                      { op: "Search", best: "O(log n)", worst: "O(log n)", color: "text-emerald-400" },
                      { op: "Insert", best: "O(log n)", worst: "O(log n)", color: "text-blue-400" },
                      { op: "Delete", best: "O(log n)", worst: "O(log n)", color: "text-purple-400" },
                      { op: "Rotate", best: "O(1)", worst: "O(1)", color: "text-amber-400" },
                    ].map(row => (
                      <div key={row.op} className="flex items-center justify-between text-xs">
                        <span className="text-slate-400">{row.op}</span>
                        <div className="flex gap-3">
                          <span className={`font-mono font-bold ${row.color}`}>{row.best}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 pt-3 border-t border-slate-800 text-xs text-slate-400">
                    <span className="text-indigo-400 font-bold">Key insight:</span> AVL trees guarantee O(log n) for all ops because height is always ≤ 1.44·log₂(n+2)
                  </div>
                </div>

                {/* Exam Tips */}
                <div className="glass-card p-4 border border-amber-500/30 bg-amber-500/5">
                  <h3 className="text-sm font-bold text-amber-400 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4" /> GATE Exam Tips
                  </h3>
                  <ul className="space-y-2 text-xs text-slate-300">
                    {[
                      "Draw the tree step-by-step, recalculate BF after each insertion",
                      "In LR/RL: first rotate the child, then rotate the unbalanced node",
                      "Rotation does NOT change BST property (in-order traversal unchanged)",
                      "After deletion, rebalance bottom-up — multiple rotations may be needed",
                      "Min nodes in AVL of height h: N(h) = N(h-1) + N(h-2) + 1",
                      "Max nodes in AVL of height h: 2^(h+1) - 1 (perfect binary tree)",
                    ].map((tip, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <span className="text-amber-500 font-bold flex-shrink-0">▸</span>
                        {tip}
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            )}

            {/* C Code */}
            {activeTab === "code" && (
              <motion.div
                key="code"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <div className="glass-card p-4 border border-indigo-500/30">
                  <div className="flex items-center gap-2 mb-3">
                    <Code2 className="w-4 h-4 text-indigo-400" />
                    <h3 className="text-sm font-bold text-indigo-400">AVL Implementation in C</h3>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(C_CODE);
                        toast.success("Copied to clipboard!");
                      }}
                      className="ml-auto text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 px-2 py-1 rounded transition-colors"
                    >
                      Copy
                    </button>
                  </div>
                  <pre className="text-xs text-slate-300 overflow-x-auto overflow-y-auto max-h-[560px] leading-relaxed font-mono bg-slate-950/60 rounded-lg p-3 scrollbar-thin">
                    <code>{C_CODE}</code>
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
