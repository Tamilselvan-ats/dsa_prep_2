"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, Pause, RotateCcw, StepForward, ChevronRight,
  Layers, Info, Code2, Zap
} from "lucide-react";
import { toast } from "sonner";
import { useProgressStore } from "@/lib/stores/progress-store";

// ─── Types ───────────────────────────────────────────────────────────────────
interface CallFrame { id: number; label: string; n: number; from: string; to: string; via: string; depth: number; }
interface Move { from: string; to: string; disk: number; }
interface Disk { id: number; size: number; }
type Pole = "A" | "B" | "C";

// ─── Tower of Hanoi Solver ────────────────────────────────────────────────────
function generateMoves(n: number, from: Pole, to: Pole, via: Pole): Move[] {
  if (n === 0) return [];
  return [
    ...generateMoves(n - 1, from, via, to),
    { from, to, disk: n },
    ...generateMoves(n - 1, via, to, from),
  ];
}

function generateCallTree(n: number, from: Pole, to: Pole, via: Pole, depth = 0, counter = { v: 0 }): CallFrame[] {
  if (n === 0) return [];
  const id = counter.v++;
  return [
    { id, label: `hanoi(${n}, ${from}→${to})`, n, from, to, via, depth },
    ...generateCallTree(n - 1, from, via, to, depth + 1, counter),
    ...generateCallTree(n - 1, via, to, from, depth + 1, counter),
  ];
}

const DISK_COLORS = ["bg-indigo-500","bg-purple-500","bg-cyan-500","bg-green-500","bg-yellow-500","bg-orange-500","bg-red-500"];

export default function RecursionVisualizerPage() {
  const [diskCount, setDiskCount] = useState(3);
  const [poles, setPoles] = useState<Record<Pole, Disk[]>>({ A: [], B: [], C: [] });
  const [moves, setMoves] = useState<Move[]>([]);
  const [currentMoveIdx, setCurrentMoveIdx] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(700);
  const [callStack, setCallStack] = useState<CallFrame[]>([]);
  const [activeTab, setActiveTab] = useState<"hanoi" | "callstack" | "fibonacci">("hanoi");
  const [fibN, setFibN] = useState(5);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { addXP } = useProgressStore();

  const initHanoi = useCallback((n: number) => {
    const disks: Disk[] = Array.from({ length: n }, (_, i) => ({ id: i + 1, size: n - i }));
    setPoles({ A: disks, B: [], C: [] });
    const allMoves = generateMoves(n, "A", "C", "B");
    setMoves(allMoves);
    setCurrentMoveIdx(-1);
    setIsPlaying(false);
    setCallStack([]);
    if (intervalRef.current) clearInterval(intervalRef.current);
  }, []);

  useEffect(() => { initHanoi(diskCount); }, [diskCount, initHanoi]);

  const applyMove = useCallback((idx: number, currentPoles: Record<Pole, Disk[]>, allMoves: Move[]) => {
    if (idx < 0 || idx >= allMoves.length) return currentPoles;
    const move = allMoves[idx];
    const updated = { ...currentPoles, [move.from]: [...currentPoles[move.from as Pole]], [move.to]: [...currentPoles[move.to as Pole]] };
    const disk = updated[move.from as Pole].pop();
    if (disk) updated[move.to as Pole].push(disk);
    return updated;
  }, []);

  const stepForward = useCallback(() => {
    setCurrentMoveIdx(prev => {
      const next = prev + 1;
      if (next >= moves.length) { setIsPlaying(false); return prev; }
      setPoles(p => applyMove(next, p, moves));
      return next;
    });
  }, [moves, applyMove]);

  const togglePlay = () => {
    if (currentMoveIdx >= moves.length - 1) { initHanoi(diskCount); return; }
    setIsPlaying(p => !p);
    addXP(5);
  };

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(() => {
        setCurrentMoveIdx(prev => {
          const next = prev + 1;
          if (next >= moves.length) { setIsPlaying(false); clearInterval(intervalRef.current!); return prev; }
          setPoles(p => applyMove(next, p, moves));
          return next;
        });
      }, speed);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speed, moves, applyMove]);

  const currentMove = moves[currentMoveIdx];
  const totalMoves = Math.pow(2, diskCount) - 1;

  // Fibonacci call tree (simplified iterative approach)
  const fibCalls = useCallback((n: number): Array<{ label: string; depth: number; result: number }> => {
    const calls: Array<{ label: string; depth: number; result: number }> = [];
    const fib = (k: number, d: number): number => {
      calls.push({ label: `fib(${k})`, depth: d, result: 0 });
      if (k <= 1) { calls[calls.length - 1].result = k; return k; }
      const r = fib(k - 1, d + 1) + fib(k - 2, d + 1);
      calls[calls.length - 1].result = r;
      return r;
    };
    if (n <= 8) fib(n, 0);
    return calls;
  }, []);

  const fibTree = fibCalls(fibN);

  const poleColors: Record<Pole, string> = { A: "border-indigo-500", B: "border-purple-500", C: "border-cyan-500" };

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black gradient-text">Recursion Visualizer</h1>
        <p className="text-slate-400 mt-1">Tower of Hanoi, Call Stack, and Fibonacci Tree — visualized step-by-step</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        {[
          { id: "hanoi", label: "🗼 Tower of Hanoi" },
          { id: "callstack", label: "📋 Call Stack" },
          { id: "fibonacci", label: "🌳 Fibonacci Tree" },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "hanoi" && (
        <div className="space-y-5">
          {/* Controls */}
          <div className="glass-card p-4 flex flex-wrap gap-4 items-center">
            <div className="flex items-center gap-2">
              <span className="text-sm text-slate-400">Disks:</span>
              {[2, 3, 4, 5, 6].map(n => (
                <button key={n} onClick={() => setDiskCount(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${diskCount === n ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-300 hover:bg-white/20"}`}>
                  {n}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Speed:</span>
              <input type="range" min="100" max="1500" step="100" value={1600 - speed}
                onChange={e => setSpeed(1600 - Number(e.target.value))}
                className="w-24 accent-indigo-500" />
            </div>
            <div className="flex gap-2 ml-auto">
              <motion.button onClick={() => initHanoi(diskCount)} whileTap={{ scale: 0.95 }}
                className="px-3 py-2 rounded-xl bg-white/10 text-slate-300 text-sm flex items-center gap-1.5 hover:bg-white/15">
                <RotateCcw className="w-4 h-4" /> Reset
              </motion.button>
              <motion.button onClick={stepForward} disabled={currentMoveIdx >= moves.length - 1 || isPlaying}
                whileTap={{ scale: 0.95 }}
                className="px-3 py-2 rounded-xl bg-purple-500/30 text-purple-300 text-sm flex items-center gap-1.5 hover:bg-purple-500/40 disabled:opacity-40">
                <StepForward className="w-4 h-4" /> Step
              </motion.button>
              <motion.button onClick={togglePlay} whileTap={{ scale: 0.95 }}
                className={`px-4 py-2 rounded-xl text-sm font-semibold flex items-center gap-1.5 ${isPlaying ? "bg-red-500/30 text-red-300" : "bg-green-500/30 text-green-300"}`}>
                {isPlaying ? <><Pause className="w-4 h-4" /> Pause</> : <><Play className="w-4 h-4" /> {currentMoveIdx >= moves.length - 1 ? "Restart" : "Play"}</>}
              </motion.button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Total Moves", value: totalMoves, color: "text-indigo-400" },
              { label: "Completed", value: Math.max(0, currentMoveIdx + 1), color: "text-green-400" },
              { label: "Remaining", value: Math.max(0, totalMoves - currentMoveIdx - 1), color: "text-yellow-400" },
            ].map((s, i) => (
              <div key={i} className="glass-card p-3 text-center">
                <div className={`text-2xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Current move */}
          {currentMove && (
            <motion.div key={currentMoveIdx}
              className="glass-card p-3 border border-indigo-500/30 text-center"
              initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}>
              <span className="text-sm text-slate-400">Move {currentMoveIdx + 1}: </span>
              <span className="font-bold text-white">Move Disk {currentMove.disk} from Pole <span className="text-indigo-400">{currentMove.from}</span> → Pole <span className="text-green-400">{currentMove.to}</span></span>
            </motion.div>
          )}

          {/* Poles */}
          <div className="glass-card p-6">
            <div className="grid grid-cols-3 gap-6">
              {(["A", "B", "C"] as Pole[]).map(pole => (
                <div key={pole} className="flex flex-col items-center">
                  <div className={`text-sm font-bold mb-3 px-3 py-1 rounded-lg border ${poleColors[pole]} bg-white/5 text-white`}>Pole {pole}</div>
                  <div className="relative flex flex-col-reverse items-center w-full" style={{ minHeight: 200 }}>
                    {/* Pole stem */}
                    <div className="absolute bottom-0 top-0 left-1/2 w-1.5 bg-gradient-to-t from-slate-600 to-slate-500 rounded-full -translate-x-1/2" />
                    {/* Base */}
                    <div className="absolute bottom-0 w-full h-3 bg-slate-600 rounded-full" />
                    {/* Disks */}
                    <div className="relative z-10 flex flex-col-reverse items-center w-full pb-3">
                      <AnimatePresence>
                        {poles[pole].map((disk, di) => {
                          const widthPct = 25 + (disk.size / diskCount) * 60;
                          const colorClass = DISK_COLORS[(disk.size - 1) % DISK_COLORS.length];
                          return (
                            <motion.div key={disk.id}
                              className={`${colorClass} rounded-lg flex items-center justify-center text-white text-xs font-bold shadow-lg`}
                              style={{ width: `${widthPct}%`, height: 28 }}
                              initial={{ scale: 0, opacity: 0 }}
                              animate={{ scale: 1, opacity: 1 }}
                              exit={{ scale: 0, opacity: 0 }}
                              layout>
                              {disk.size}
                            </motion.div>
                          );
                        })}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="text-xs text-slate-500 mt-2">{poles[pole].length} disk{poles[pole].length !== 1 ? "s" : ""}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Formula + Exam Notes */}
          <div className="glass-card p-4">
            <h3 className="font-bold text-white mb-3">📐 Tower of Hanoi — Exam Notes</h3>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2 text-sm">
                <div className="p-2 bg-white/5 rounded-lg"><span className="text-indigo-400 font-bold">Minimum Moves:</span> <span className="text-white">2ⁿ - 1</span> (n = number of disks)</div>
                <div className="p-2 bg-white/5 rounded-lg"><span className="text-green-400 font-bold">3 disks:</span> <span className="text-white">2³ - 1 = 7 moves</span></div>
                <div className="p-2 bg-white/5 rounded-lg"><span className="text-yellow-400 font-bold">Time Complexity:</span> <span className="text-white">O(2ⁿ)</span></div>
                <div className="p-2 bg-white/5 rounded-lg"><span className="text-cyan-400 font-bold">Space Complexity:</span> <span className="text-white">O(n) — call stack depth</span></div>
              </div>
              <pre className="text-xs text-slate-300 bg-black/30 p-3 rounded-xl overflow-x-auto leading-5">
{`void hanoi(int n, char from,
           char to, char via) {
  if (n == 0) return;
  hanoi(n-1, from, via, to);
  printf("Move disk %d from"
         " %c to %c\\n", n, from, to);
  hanoi(n-1, via, to, from);
}`}
              </pre>
            </div>
          </div>
        </div>
      )}

      {activeTab === "callstack" && (
        <div className="space-y-4">
          <div className="glass-card p-4">
            <h2 className="font-bold text-white mb-3">Function Call Stack Simulation</h2>
            <p className="text-slate-400 text-sm mb-4">Shows the recursive call stack for hanoi({diskCount}, A, C, B)</p>
            <div className="flex items-center gap-3 mb-4">
              <span className="text-sm text-slate-400">Disks:</span>
              {[2,3,4,5].map(n => (
                <button key={n} onClick={() => setDiskCount(n)}
                  className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${diskCount === n ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-300"}`}>{n}</button>
              ))}
            </div>
            <div className="max-h-96 overflow-y-auto space-y-1">
              {generateCallTree(diskCount, "A", "C", "B").map((frame, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.03 }}
                  className="flex items-center gap-2 p-2 rounded-lg bg-white/5 hover:bg-white/8"
                  style={{ marginLeft: frame.depth * 20 }}>
                  <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                  <code className="text-xs text-slate-300 font-mono">{frame.label}</code>
                  <span className="text-xs text-slate-500 ml-auto">depth {frame.depth}</span>
                </motion.div>
              ))}
            </div>
          </div>
          <div className="glass-card p-4">
            <h3 className="font-bold text-white mb-2">🎯 Key Exam Points</h3>
            <ul className="space-y-1.5 text-sm text-slate-300">
              <li className="flex gap-2"><span className="text-indigo-400">•</span> Every recursive call creates a new stack frame</li>
              <li className="flex gap-2"><span className="text-indigo-400">•</span> Maximum stack depth = n (recursion depth)</li>
              <li className="flex gap-2"><span className="text-indigo-400">•</span> Base case prevents infinite recursion</li>
              <li className="flex gap-2"><span className="text-indigo-400">•</span> Each frame stores: parameters n, from, to, via + return address</li>
            </ul>
          </div>
        </div>
      )}

      {activeTab === "fibonacci" && (
        <div className="space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-4 mb-4">
              <h2 className="font-bold text-white">Fibonacci Recursive Call Tree</h2>
              <div className="flex items-center gap-2 ml-auto">
                <span className="text-sm text-slate-400">n =</span>
                {[3,4,5,6,7].map(n => (
                  <button key={n} onClick={() => setFibN(n)}
                    className={`w-8 h-8 rounded-lg text-sm font-bold transition-all ${fibN === n ? "bg-cyan-500 text-white" : "bg-white/10 text-slate-300"}`}>{n}</button>
                ))}
              </div>
            </div>
            <p className="text-xs text-slate-500 mb-4">Total calls: {fibTree.length} — notice overlapping subproblems (why memoization helps!)</p>
            <div className="max-h-72 overflow-y-auto space-y-0.5">
              {fibTree.map((call, i) => (
                <div key={i} className="flex items-center gap-2 p-1.5 rounded hover:bg-white/5"
                  style={{ marginLeft: call.depth * 16 }}>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${call.depth === 0 ? "bg-cyan-400" : call.depth === 1 ? "bg-indigo-400" : "bg-slate-500"}`} />
                  <code className="text-xs font-mono text-slate-300">{call.label}</code>
                  <span className="text-xs text-green-400 ml-auto">= {call.result}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass-card p-4">
            <h3 className="font-bold text-white mb-3">Why Recursion is Expensive Here</h3>
            <div className="grid md:grid-cols-2 gap-3 text-sm">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <div className="font-bold text-red-400 mb-1">❌ Naive Recursion</div>
                <div className="text-slate-300">O(2ⁿ) time — exponential</div>
                <div className="text-slate-400 text-xs mt-1">fib(5) calls fib(3) twice — wasteful!</div>
              </div>
              <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                <div className="font-bold text-green-400 mb-1">✅ With Memoization (DP)</div>
                <div className="text-slate-300">O(n) time — linear</div>
                <div className="text-slate-400 text-xs mt-1">Cache results, avoid re-computation</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
