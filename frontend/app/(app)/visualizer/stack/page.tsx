"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, RotateCcw, StepForward, Pause, Plus, Minus, Eye,
  History, Settings2, ChevronRight, AlertCircle, CheckCircle
} from "lucide-react";
import { toast } from "sonner";
import { useProgressStore } from "@/lib/stores/progress-store";

interface StackItem {
  value: number | string;
  id: number;
}

interface HistoryEntry {
  operation: string;
  value?: number | string;
  result: string;
  timestamp: Date;
}

const MAX_SIZE = 8;

export default function StackVisualizerPage() {
  const [stack, setStack] = useState<StackItem[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [operation, setOperation] = useState<"push" | "pop" | "peek" | null>(null);
  const [animatingId, setAnimatingId] = useState<number | null>(null);
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [speed, setSpeed] = useState(600);
  const [isAnimating, setIsAnimating] = useState(false);
  const [highlightTop, setHighlightTop] = useState(false);
  const [idCounter, setIdCounter] = useState(0);
  const { addXP, updateTopicMastery, recordStudySession } = useProgressStore();
  const masteryUpdated = useRef(false);

  // Track study time
  useEffect(() => {
    const start = Date.now();
    return () => {
      const mins = Math.round((Date.now() - start) / 60000);
      if (mins >= 1) recordStudySession(mins);
    };
  }, []);

  const addHistory = (op: string, val: any, result: string) => {
    setHistory(prev => [{ operation: op, value: val, result, timestamp: new Date() }, ...prev.slice(0, 19)]);
  };

  const push = async () => {
    const val = inputValue.trim() || Math.floor(Math.random() * 99) + 1;
    if (stack.length >= MAX_SIZE) {
      toast.error("Stack Overflow! Stack is full (MAX = " + MAX_SIZE + ")", { icon: "💥" });
      addHistory("PUSH", val, "OVERFLOW - Stack is full");
      return;
    }
    setIsAnimating(true);
    setOperation("push");
    const newItem: StackItem = { value: val, id: idCounter };
    setIdCounter(c => c + 1);
    setAnimatingId(newItem.id);
    await new Promise(r => setTimeout(r, speed));
    setStack(prev => [...prev, newItem]);
    setAnimatingId(null);
    setOperation(null);
    setIsAnimating(false);
    setInputValue("");
    addHistory("PUSH", val, `${val} pushed onto stack`);
    addXP(2);
    // Update mastery once per session on first successful push
    if (!masteryUpdated.current) {
      masteryUpdated.current = true;
      updateTopicMastery("stack-adt", {
        masteryScore: 15,
        practiceScore: 10,
        lastStudiedAt: new Date().toISOString(),
        nextRevisionAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      });
    }
    toast.success(`Pushed ${val} → stack`, { icon: "📥" });
  };

  const pop = async () => {
    if (stack.length === 0) {
      toast.error("Stack Underflow! Stack is empty", { icon: "⚠️" });
      addHistory("POP", null, "UNDERFLOW - Stack is empty");
      return;
    }
    setIsAnimating(true);
    setOperation("pop");
    const topItem = stack[stack.length - 1];
    setAnimatingId(topItem.id);
    await new Promise(r => setTimeout(r, speed));
    setStack(prev => prev.slice(0, -1));
    setAnimatingId(null);
    setOperation(null);
    setIsAnimating(false);
    addHistory("POP", topItem.value, `${topItem.value} popped from stack`);
    addXP(2);
    toast.success(`Popped ${topItem.value} ← stack`, { icon: "📤" });
  };

  const peek = async () => {
    if (stack.length === 0) {
      toast.error("Stack is empty! Nothing to peek", { icon: "⚠️" });
      addHistory("PEEK", null, "Stack is empty");
      return;
    }
    setOperation("peek");
    setHighlightTop(true);
    await new Promise(r => setTimeout(r, speed * 1.5));
    setHighlightTop(false);
    setOperation(null);
    const topVal = stack[stack.length - 1].value;
    addHistory("PEEK", topVal, `Top element is ${topVal}`);
    addXP(1);
    toast.success(`Top element: ${topVal}`, { icon: "👁️" });
  };

  const reset = () => {
    setStack([]);
    setHistory([]);
    setOperation(null);
    setAnimatingId(null);
    toast.info("Stack reset", { icon: "🔄" });
  };

  const fillRandom = () => {
    const count = Math.floor(Math.random() * 4) + 2;
    const items: StackItem[] = [];
    let counter = idCounter;
    for (let i = 0; i < Math.min(count, MAX_SIZE); i++) {
      items.push({ value: Math.floor(Math.random() * 99) + 1, id: counter++ });
    }
    setIdCounter(counter);
    setStack(items);
    toast.success("Random stack created!", { icon: "🎲" });
  };

  const isTop = (index: number) => index === stack.length - 1;

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black gradient-text">Stack Visualizer</h1>
        <p className="text-slate-400 mt-1">Interactive visualization of Stack ADT operations — Push, Pop, Peek</p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Stack Visual */}
        <div className="lg:col-span-2 space-y-4">
          {/* Controls */}
          <div className="glass-card p-4">
            <div className="flex flex-wrap gap-3 items-center">
              <input
                type="text"
                value={inputValue}
                onChange={e => setInputValue(e.target.value)}
                onKeyDown={e => e.key === "Enter" && push()}
                placeholder="Enter value (or leave empty for random)"
                className="flex-1 min-w-32 bg-white/5 border border-white/10 rounded-xl px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
              />
              <div className="flex gap-2 flex-wrap">
                <motion.button
                  onClick={push}
                  disabled={isAnimating}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" /> Push
                </motion.button>
                <motion.button
                  onClick={pop}
                  disabled={isAnimating}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-red-500 to-rose-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Minus className="w-4 h-4" /> Pop
                </motion.button>
                <motion.button
                  onClick={peek}
                  disabled={isAnimating}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold disabled:opacity-50 flex items-center gap-1.5"
                >
                  <Eye className="w-4 h-4" /> Peek
                </motion.button>
                <motion.button
                  onClick={fillRandom}
                  disabled={isAnimating}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-sm font-semibold disabled:opacity-50"
                >
                  Random
                </motion.button>
                <motion.button
                  onClick={reset}
                  whileTap={{ scale: 0.95 }}
                  className="px-4 py-2 rounded-xl bg-white/10 text-slate-300 text-sm font-semibold flex items-center gap-1.5 hover:bg-white/15"
                >
                  <RotateCcw className="w-4 h-4" /> Reset
                </motion.button>
              </div>
            </div>

            {/* Speed Control */}
            <div className="flex items-center gap-3 mt-3">
              <span className="text-xs text-slate-400 w-16">Speed:</span>
              <input
                type="range"
                min="100"
                max="1500"
                step="100"
                value={1600 - speed}
                onChange={e => setSpeed(1600 - Number(e.target.value))}
                className="flex-1 accent-indigo-500"
              />
              <span className="text-xs text-slate-400 w-10 text-right">{speed < 400 ? "Fast" : speed > 1000 ? "Slow" : "Med"}</span>
            </div>
          </div>

          {/* Status */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Size", value: `${stack.length} / ${MAX_SIZE}`, color: "text-indigo-400" },
              { label: "Status", value: stack.length === 0 ? "Empty" : stack.length >= MAX_SIZE ? "Full" : "Active", color: stack.length === 0 ? "text-yellow-400" : stack.length >= MAX_SIZE ? "text-red-400" : "text-green-400" },
              { label: "Top", value: stack.length > 0 ? String(stack[stack.length - 1].value) : "—", color: "text-cyan-400" },
            ].map((s, i) => (
              <div key={i} className="glass-card p-3 text-center">
                <div className={`text-xl font-black ${s.color}`}>{s.value}</div>
                <div className="text-xs text-slate-400 mt-1">{s.label}</div>
              </div>
            ))}
          </div>

          {/* Stack Visual */}
          <div className="glass-card p-6">
            <div className="flex justify-center">
              <div className="relative w-48">
                {/* Stack container */}
                <div className="border-2 border-indigo-500/40 rounded-b-2xl min-h-96 relative overflow-hidden bg-black/20">
                  {/* Empty slots */}
                  {Array.from({ length: MAX_SIZE }).map((_, i) => (
                    <div
                      key={i}
                      className="h-11 border-b border-dashed border-white/5 flex items-center justify-center"
                    >
                      <span className="text-xs text-white/10">{MAX_SIZE - 1 - i}</span>
                    </div>
                  ))}

                  {/* Filled items */}
                  <div className="absolute bottom-0 left-0 right-0">
                    <AnimatePresence>
                      {stack.map((item, index) => {
                        const isTopItem = isTop(index);
                        const isAnimItem = item.id === animatingId;
                        return (
                          <motion.div
                            key={item.id}
                            className={`h-11 flex items-center justify-between px-3 border-b border-indigo-500/20 ${
                              isAnimItem && operation === "pop"
                                ? "bg-red-500/30 border-red-500/50"
                                : isTopItem && (highlightTop || (isAnimItem && operation === "peek"))
                                ? "bg-cyan-500/30 border-cyan-500/50"
                                : isTopItem
                                ? "bg-green-500/20 border-green-500/40"
                                : "bg-indigo-500/15"
                            }`}
                            initial={operation === "push" ? { x: -100, opacity: 0 } : { opacity: 1 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 100, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 400, damping: 30 }}
                          >
                            <span className="text-xs text-slate-400">[{index}]</span>
                            <span className="font-bold text-white text-sm">{item.value}</span>
                            {isTopItem && (
                              <span className="text-xs font-bold text-green-400">TOP</span>
                            )}
                          </motion.div>
                        );
                      })}
                    </AnimatePresence>
                  </div>
                </div>

                {/* Labels */}
                <div className="flex justify-between mt-2 px-1">
                  <span className="text-xs text-slate-500">↑ TOP</span>
                  <span className="text-xs text-slate-500">BOTTOM ↓</span>
                </div>
              </div>
            </div>

            {/* Operation indicator */}
            {operation && (
              <motion.div
                className={`mt-4 p-3 rounded-xl text-center text-sm font-bold ${
                  operation === "push" ? "bg-green-500/20 text-green-400" :
                  operation === "pop" ? "bg-red-500/20 text-red-400" :
                  "bg-cyan-500/20 text-cyan-400"
                }`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {operation === "push" && "⬇ PUSH: Inserting element onto top of stack..."}
                {operation === "pop" && "⬆ POP: Removing top element from stack..."}
                {operation === "peek" && "👁 PEEK: Reading top element (no removal)..."}
              </motion.div>
            )}
          </div>

          {/* Concepts Panel */}
          <div className="glass-card p-4">
            <h3 className="font-bold text-white mb-3">Stack Operations — Exam Notes</h3>
            <div className="grid grid-cols-2 gap-3">
              {[
                { op: "PUSH(x)", tc: "O(1)", desc: "Add element to TOP", color: "text-green-400" },
                { op: "POP()", tc: "O(1)", desc: "Remove element from TOP", color: "text-red-400" },
                { op: "PEEK()", tc: "O(1)", desc: "Read TOP without removing", color: "text-cyan-400" },
                { op: "isEmpty()", tc: "O(1)", desc: "Check if top == -1", color: "text-yellow-400" },
              ].map((c, i) => (
                <div key={i} className="bg-white/5 rounded-xl p-3">
                  <div className={`font-mono font-bold text-sm ${c.color}`}>{c.op}</div>
                  <div className="text-xs text-slate-400 mt-1">{c.desc}</div>
                  <div className="text-xs text-slate-500 mt-0.5">Time: {c.tc}</div>
                </div>
              ))}
            </div>
            <div className="mt-3 p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20">
              <p className="text-xs text-indigo-300">
                <span className="font-bold">🎯 Exam Tip:</span> Stack follows LIFO (Last In, First Out) principle.
                OVERFLOW occurs when stack is full (top == MAX-1). UNDERFLOW occurs when stack is empty (top == -1).
              </p>
            </div>
          </div>
        </div>

        {/* History Panel */}
        <div className="space-y-4">
          <div className="glass-card p-4">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <History className="w-4 h-4 text-indigo-400" />
              Operation History
            </h3>
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {history.length === 0 && (
                <p className="text-slate-500 text-sm text-center py-4">No operations yet</p>
              )}
              {history.map((h, i) => (
                <motion.div
                  key={i}
                  className={`p-2.5 rounded-xl text-xs border ${
                    h.operation === "PUSH" ? "bg-green-500/10 border-green-500/20" :
                    h.operation === "POP" ? "bg-red-500/10 border-red-500/20" :
                    "bg-cyan-500/10 border-cyan-500/20"
                  }`}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                >
                  <div className={`font-bold ${
                    h.operation === "PUSH" ? "text-green-400" :
                    h.operation === "POP" ? "text-red-400" : "text-cyan-400"
                  }`}>{h.operation}</div>
                  <div className="text-slate-300 mt-0.5">{h.result}</div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Pseudocode */}
          <div className="glass-card p-4">
            <h3 className="font-bold text-white mb-3">C Implementation</h3>
            <pre className="text-xs text-slate-300 bg-black/30 p-3 rounded-xl overflow-x-auto leading-5">
{`#define MAX 8
int stack[MAX];
int top = -1;

void push(int x) {
  if (top == MAX-1)
    printf("Overflow!");
  else
    stack[++top] = x;
}

int pop() {
  if (top == -1)
    printf("Underflow!");
  else
    return stack[top--];
}

int peek() {
  return stack[top];
}`}
            </pre>
          </div>

          {/* Quick Quiz */}
          <div className="glass-card p-4">
            <h3 className="font-bold text-white mb-3 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              Quick Check
            </h3>
            <div className="space-y-2 text-sm">
              {[
                { q: "What is LIFO?", a: "Last In, First Out — the last element pushed is the first to be popped" },
                { q: "When does Overflow occur?", a: "When top == MAX-1 and you try to push" },
                { q: "When does Underflow occur?", a: "When top == -1 and you try to pop" },
              ].map((qa, i) => (
                <details key={i} className="cursor-pointer">
                  <summary className="text-indigo-300 hover:text-indigo-200">{qa.q}</summary>
                  <p className="text-slate-400 text-xs mt-1 pl-2 border-l border-indigo-500/30">{qa.a}</p>
                </details>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
