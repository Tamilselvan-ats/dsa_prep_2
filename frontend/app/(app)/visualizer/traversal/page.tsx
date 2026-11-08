"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, Pause, StepForward, RotateCcw, HelpCircle, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useProgressStore } from "@/lib/stores/progress-store";

// ─── Types ───────────────────────────────────────────────────────────────────
interface TreeNode { val: number; left: number | null; right: number | null; }
type TraversalType = "inorder" | "preorder" | "postorder";

// ─── Tree Helpers ─────────────────────────────────────────────────────────────
function buildTreeFromLevel(arr: (number | null)[]): Record<number, TreeNode> {
  const nodes: Record<number, TreeNode> = {};
  arr.forEach((val, i) => {
    if (val !== null) {
      const li = 2 * i + 1;
      const ri = 2 * i + 2;
      nodes[i] = { val, left: (li < arr.length && arr[li] !== null) ? li : null, right: (ri < arr.length && arr[ri] !== null) ? ri : null };
    }
  });
  return nodes;
}

function inorder(nodes: Record<number, TreeNode>, idx: number | null, out: number[]) {
  if (idx === null || !(idx in nodes)) return;
  inorder(nodes, nodes[idx].left, out);
  out.push(nodes[idx].val);
  inorder(nodes, nodes[idx].right, out);
}
function preorder(nodes: Record<number, TreeNode>, idx: number | null, out: number[]) {
  if (idx === null || !(idx in nodes)) return;
  out.push(nodes[idx].val);
  preorder(nodes, nodes[idx].left, out);
  preorder(nodes, nodes[idx].right, out);
}
function postorder(nodes: Record<number, TreeNode>, idx: number | null, out: number[]) {
  if (idx === null || !(idx in nodes)) return;
  postorder(nodes, nodes[idx].left, out);
  postorder(nodes, nodes[idx].right, out);
  out.push(nodes[idx].val);
}

// Generate step-by-step traversal with indices
interface TraversalStep { visitIdx: number; order: number[]; }

function traversalSteps(nodes: Record<number, TreeNode>, idx: number | null, type: TraversalType, out: TraversalStep[], acc: number[] = []) {
  if (idx === null || !(idx in nodes)) return;
  if (type === "preorder") {
    acc = [...acc, nodes[idx].val];
    out.push({ visitIdx: idx, order: [...acc] });
    traversalSteps(nodes, nodes[idx].left, type, out, acc);
    traversalSteps(nodes, nodes[idx].right, type, out, acc);
  } else if (type === "inorder") {
    traversalSteps(nodes, nodes[idx].left, type, out, acc);
    acc = [...acc, nodes[idx].val];
    out.push({ visitIdx: idx, order: [...acc] });
    traversalSteps(nodes, nodes[idx].right, type, out, acc);
  } else {
    traversalSteps(nodes, nodes[idx].left, type, out, acc);
    traversalSteps(nodes, nodes[idx].right, type, out, acc);
    acc = [...acc, nodes[idx].val];
    out.push({ visitIdx: idx, order: [...acc] });
  }
}

// SVG layout
interface NodePos { x: number; y: number; idx: number; val: number; }
function computeLayout(nodes: Record<number, TreeNode>, idx: number | null, depth: number, minX: number, maxX: number, positions: NodePos[]) {
  if (idx === null || !(idx in nodes)) return;
  const x = (minX + maxX) / 2;
  const y = 60 + depth * 70;
  positions.push({ x, y, idx, val: nodes[idx].val });
  computeLayout(nodes, nodes[idx].left, depth + 1, minX, (minX + maxX) / 2, positions);
  computeLayout(nodes, nodes[idx].right, depth + 1, (minX + maxX) / 2, maxX, positions);
}

const PRESETS = [
  { label: "Balanced (1-7)", arr: [1, 2, 3, 4, 5, 6, 7] },
  { label: "Skewed", arr: [1, 2, null, 3, null, null, null, 4] },
  { label: "BST sample", arr: [5, 3, 7, 2, 4, 6, 8] },
];

const TRAVERSAL_INFO: Record<TraversalType, { label: string; mnemonic: string; order: string; color: string }> = {
  inorder:   { label: "Inorder",   mnemonic: "Left → Root → Right",    order: "LNR", color: "text-green-400" },
  preorder:  { label: "Preorder",  mnemonic: "Root → Left → Right",    order: "NLR", color: "text-indigo-400" },
  postorder: { label: "Postorder", mnemonic: "Left → Right → Root",    order: "LRN", color: "text-orange-400" },
};

export default function TreeTraversalPage() {
  const [inputStr, setInputStr] = useState("1,2,3,4,5,6,7");
  const [nodes, setNodes] = useState<Record<number, TreeNode>>({});
  const [traversal, setTraversal] = useState<TraversalType>("inorder");
  const [steps, setSteps] = useState<TraversalStep[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(700);
  const [quizMode, setQuizMode] = useState(false);
  const [quizAnswer, setQuizAnswer] = useState("");
  const [quizResult, setQuizResult] = useState<null | "correct" | "wrong">(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { addXP, updateTopicMastery, recordStudySession } = useProgressStore();
  const masteryUpdated = useRef(false);
  const [positions, setPositions] = useState<NodePos[]>([]);

  // Track study time
  useEffect(() => {
    const start = Date.now();
    return () => {
      const mins = Math.round((Date.now() - start) / 60000);
      if (mins >= 1) recordStudySession(mins);
    };
  }, [recordStudySession]);

  const buildTree = useCallback(() => {
    const vals = inputStr.split(",").map(v => v.trim() === "null" || v.trim() === "" ? null : Number(v.trim()));
    const built = buildTreeFromLevel(vals);
    setNodes(built);
    const pos: NodePos[] = [];
    computeLayout(built, 0, 0, 0, 600, pos);
    setPositions(pos);
    setCurrentStep(-1);
    setSteps([]);
    setIsPlaying(false);
  }, [inputStr]);

  useEffect(() => { buildTree(); }, [buildTree]);

  const startTraversal = () => {
    const st: TraversalStep[] = [];
    traversalSteps(nodes, 0, traversal, st);
    setSteps(st);
    setCurrentStep(-1);
    addXP(5);
    if (!masteryUpdated.current) {
      masteryUpdated.current = true;
      updateTopicMastery("tree-traversals", {
        masteryScore: 15,
        practiceScore: 10,
        lastStudiedAt: new Date().toISOString(),
        nextRevisionAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
  };

  const stepFwd = useCallback(() => {
    setCurrentStep(prev => {
      if (prev >= steps.length - 1) { setIsPlaying(false); return prev; }
      return prev + 1;
    });
  }, [steps.length]);

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(stepFwd, speed);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speed, stepFwd]);

  const visStep = currentStep >= 0 ? steps[currentStep] : null;
  const highlightedIdx = visStep?.visitIdx ?? -1;

  const getFullTraversal = () => {
    const out: number[] = [];
    if (traversal === "inorder") inorder(nodes, 0, out);
    else if (traversal === "preorder") preorder(nodes, 0, out);
    else postorder(nodes, 0, out);
    return out;
  };

  const checkQuizAnswer = () => {
    const correct = getFullTraversal().join(",");
    const userAns = quizAnswer.trim().replace(/\s+/g, ",");
    if (userAns === correct) {
      setQuizResult("correct");
      addXP(20);
      updateTopicMastery("tree-traversals", {
        masteryScore: 30,
        practiceScore: 25,
        lastStudiedAt: new Date().toISOString(),
        nextRevisionAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      });
      toast.success("🎉 Correct! +20 XP");
    } else {
      setQuizResult("wrong");
      toast.error(`Incorrect. Expected: ${correct}`);
    }
  };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black gradient-text">Tree Traversal Simulator</h1>
        <p className="text-slate-400 mt-1">Visualize Inorder, Preorder, Postorder with animated step-by-step node highlighting</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div className="glass-card p-4">
            <label className="text-xs text-slate-400 uppercase tracking-wide mb-2 block">Level-Order Input (comma separated)</label>
            <input value={inputStr} onChange={e => setInputStr(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-indigo-500/50"
              placeholder="1,2,3,4,5,6,7" />
            <div className="flex flex-wrap gap-1 mt-2">
              {PRESETS.map(p => (
                <button key={p.label} onClick={() => setInputStr(p.arr.map(v => v === null ? "null" : v).join(","))}
                  className="px-2 py-0.5 bg-white/5 rounded text-xs text-slate-400 hover:bg-white/10">{p.label}</button>
              ))}
            </div>
            <button onClick={buildTree} className="mt-3 w-full py-1.5 rounded-xl bg-white/10 text-slate-300 text-xs hover:bg-white/15">↺ Rebuild Tree</button>
          </div>

          {/* Traversal selector */}
          <div className="glass-card p-4">
            <div className="text-xs text-slate-400 uppercase tracking-wide mb-3">Traversal Type</div>
            <div className="space-y-2">
              {(["inorder","preorder","postorder"] as TraversalType[]).map(t => {
                const info = TRAVERSAL_INFO[t];
                return (
                  <button key={t} onClick={() => { setTraversal(t); setSteps([]); setCurrentStep(-1); }}
                    className={`w-full p-3 rounded-xl text-left transition-all ${traversal === t ? "bg-indigo-500/20 border border-indigo-500/40" : "bg-white/5 border border-white/5 hover:border-white/10"}`}>
                    <div className={`font-semibold text-sm ${info.color}`}>{info.label}</div>
                    <div className="text-xs text-slate-400 mt-0.5">{info.mnemonic} ({info.order})</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Play controls */}
          <div className="glass-card p-4 space-y-3">
            <motion.button onClick={startTraversal} whileTap={{ scale: 0.95 }}
              className="w-full py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold flex items-center justify-center gap-2">
              <Play className="w-4 h-4" /> Start Traversal
            </motion.button>
            <div className="flex gap-2">
              <button onClick={stepFwd} disabled={currentStep >= steps.length - 1 || isPlaying || steps.length === 0}
                className="flex-1 py-1.5 bg-purple-500/20 text-purple-300 rounded-xl text-xs font-semibold disabled:opacity-40 flex items-center justify-center gap-1">
                <StepForward className="w-3.5 h-3.5" /> Step
              </button>
              <button onClick={() => setIsPlaying(p => !p)} disabled={steps.length === 0 || currentStep >= steps.length - 1}
                className={`flex-1 py-1.5 rounded-xl text-xs font-semibold disabled:opacity-40 flex items-center justify-center gap-1 ${isPlaying ? "bg-red-500/20 text-red-300" : "bg-green-500/20 text-green-300"}`}>
                {isPlaying ? <><Pause className="w-3.5 h-3.5" /> Pause</> : <><Play className="w-3.5 h-3.5" /> Play</>}
              </button>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Speed:</span>
              <input type="range" min="100" max="1500" step="100" value={1600 - speed}
                onChange={e => setSpeed(1600 - Number(e.target.value))} className="flex-1 accent-indigo-500" />
            </div>
          </div>

          {/* Quiz mode */}
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-white text-sm flex items-center gap-2"><HelpCircle className="w-4 h-4 text-yellow-400" /> Quiz Mode</h3>
              <button onClick={() => { setQuizMode(p => !p); setQuizAnswer(""); setQuizResult(null); }}
                className={`px-2 py-1 rounded text-xs ${quizMode ? "bg-yellow-500/20 text-yellow-400" : "bg-white/10 text-slate-400"}`}>
                {quizMode ? "ON" : "OFF"}
              </button>
            </div>
            {quizMode && (
              <div className="space-y-2">
                <p className="text-xs text-slate-400">What is the {traversal} traversal of this tree?<br />(comma-separated values)</p>
                <input value={quizAnswer} onChange={e => { setQuizAnswer(e.target.value); setQuizResult(null); }}
                  className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm font-mono text-white focus:outline-none focus:border-indigo-500/50"
                  placeholder="e.g. 4,2,5,1,6,3,7" />
                <button onClick={checkQuizAnswer}
                  className="w-full py-1.5 bg-yellow-500/20 text-yellow-400 rounded-lg text-xs font-semibold hover:bg-yellow-500/30">
                  Check Answer
                </button>
                {quizResult === "correct" && <div className="flex items-center gap-1 text-green-400 text-xs"><CheckCircle className="w-3.5 h-3.5" /> Correct! +20 XP</div>}
                {quizResult === "wrong" && <div className="text-red-400 text-xs"><XCircle className="w-3.5 h-3.5 inline mr-1" />Answer: {getFullTraversal().join(",")}</div>}
              </div>
            )}
          </div>
        </div>

        {/* SVG Tree + Output */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-white">Tree Visualization</h3>
              {steps.length > 0 && (
                <div className="text-xs text-slate-400">Step {Math.max(0, currentStep + 1)} / {steps.length}</div>
              )}
            </div>
            <svg viewBox="0 0 600 320" className="w-full border border-white/5 rounded-xl bg-black/20">
              {/* Edges */}
              {positions.map(pos => {
                const node = nodes[pos.idx];
                if (!node) return null;
                return [node.left, node.right].map(childIdx => {
                  if (childIdx === null) return null;
                  const childPos = positions.find(p => p.idx === childIdx);
                  if (!childPos) return null;
                  return (
                    <line key={`${pos.idx}-${childIdx}`}
                      x1={pos.x} y1={pos.y} x2={childPos.x} y2={childPos.y}
                      stroke="rgba(99,102,241,0.3)" strokeWidth="2" />
                  );
                });
              })}
              {/* Nodes */}
              {positions.map(pos => {
                const isHighlighted = pos.idx === highlightedIdx;
                const wasVisited = visStep ? visStep.order.includes(pos.val) : false;
                return (
                  <g key={pos.idx}>
                    <motion.circle cx={pos.x} cy={pos.y} r={22}
                      fill={isHighlighted ? "rgba(16,185,129,0.4)" : wasVisited ? "rgba(99,102,241,0.25)" : "rgba(15,23,42,0.8)"}
                      stroke={isHighlighted ? "#10b981" : wasVisited ? "#6366f1" : "rgba(99,102,241,0.4)"}
                      strokeWidth={isHighlighted ? 3 : 2}
                      style={{ filter: isHighlighted ? "drop-shadow(0 0 8px rgba(16,185,129,0.6))" : "none" }} />
                    <text x={pos.x} y={pos.y + 5} textAnchor="middle"
                      fill={isHighlighted ? "#10b981" : "#e2e8f0"} fontSize="13" fontWeight="bold">
                      {pos.val}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Legend */}
            <div className="flex gap-4 mt-3 text-xs">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-green-500" /> Currently visiting</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-indigo-500/50 border border-indigo-500" /> Already visited</div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-full bg-slate-800 border border-slate-600" /> Not yet visited</div>
            </div>
          </div>

          {/* Output sequence */}
          {steps.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="font-bold text-white mb-3 text-sm">
                {TRAVERSAL_INFO[traversal].label} Output Sequence
                <span className="ml-2 text-xs text-slate-400">({TRAVERSAL_INFO[traversal].mnemonic})</span>
              </h3>
              <div className="flex flex-wrap gap-2">
                {getFullTraversal().map((val, i) => {
                  const isVisited = visStep ? visStep.order.includes(val) && visStep.order.indexOf(val) <= i : false;
                  const isCurrent = visStep?.order.length === i + 1;
                  return (
                    <motion.div key={i}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm border transition-all ${
                        isCurrent ? "bg-green-500/40 border-green-500 text-green-300 shadow-[0_0_10px_rgba(16,185,129,0.4)]" :
                        isVisited ? "bg-indigo-500/30 border-indigo-500/60 text-indigo-200" :
                        "bg-white/5 border-white/10 text-slate-500"
                      }`}
                      animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.3 }}>
                      {val}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Traversal Info Cards */}
          <div className="grid grid-cols-3 gap-3">
            {(["inorder","preorder","postorder"] as TraversalType[]).map(t => {
              const info = TRAVERSAL_INFO[t];
              const out: number[] = [];
              if (t === "inorder") inorder(nodes, 0, out);
              else if (t === "preorder") preorder(nodes, 0, out);
              else postorder(nodes, 0, out);
              return (
                <div key={t} className={`glass-card p-3 border ${t === traversal ? "border-indigo-500/40" : "border-white/5"}`}>
                  <div className={`font-bold text-xs mb-1 ${info.color}`}>{info.label}</div>
                  <div className="text-xs text-slate-400 mb-2">{info.order}</div>
                  <div className="font-mono text-xs text-slate-300 break-all">{out.join(", ")}</div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
