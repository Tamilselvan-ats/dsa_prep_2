"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, StepForward, RotateCcw, CheckCircle, XCircle, AlertTriangle } from "lucide-react";
import { useProgressStore } from "@/lib/stores/progress-store";
import { toast } from "sonner";

// ─── Types ───────────────────────────────────────────────────────────────────
interface BalancingStep {
  char: string;
  index: number;
  action: "push" | "pop" | "match" | "mismatch" | "skip";
  stack: string[];
  matched?: string;
  error?: string;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
const OPEN = new Set(["(", "[", "{"]);
const CLOSE_MATCH: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
const CHAR_COLORS: Record<string, { text: string; bg: string; border: string }> = {
  "(": { text: "text-cyan-300", bg: "bg-cyan-500/20", border: "border-cyan-500/40" },
  ")": { text: "text-cyan-300", bg: "bg-cyan-500/10", border: "border-cyan-500/30" },
  "[": { text: "text-green-300", bg: "bg-green-500/20", border: "border-green-500/40" },
  "]": { text: "text-green-300", bg: "bg-green-500/10", border: "border-green-500/30" },
  "{": { text: "text-orange-300", bg: "bg-orange-500/20", border: "border-orange-500/40" },
  "}": { text: "text-orange-300", bg: "bg-orange-500/10", border: "border-orange-500/30" },
};

function checkBalancing(input: string): { steps: BalancingStep[]; balanced: boolean; errorIndex: number } {
  const steps: BalancingStep[] = [];
  const stack: string[] = [];
  let errorIndex = -1;

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (OPEN.has(ch)) {
      stack.push(ch);
      steps.push({ char: ch, index: i, action: "push", stack: [...stack] });
    } else if (ch in CLOSE_MATCH) {
      if (stack.length === 0 || stack[stack.length - 1] !== CLOSE_MATCH[ch]) {
        errorIndex = i;
        steps.push({ char: ch, index: i, action: "mismatch", stack: [...stack], error: stack.length === 0 ? "Stack empty — no matching opener" : `Expected ${stack[stack.length - 1]} but got ${ch}` });
        return { steps, balanced: false, errorIndex };
      }
      const matched = stack.pop()!;
      steps.push({ char: ch, index: i, action: "match", stack: [...stack], matched });
    } else {
      steps.push({ char: ch, index: i, action: "skip", stack: [...stack] });
    }
  }

  if (stack.length > 0) {
    errorIndex = input.length;
    steps.push({ char: "EOF", index: input.length, action: "mismatch", stack: [...stack], error: `Stack not empty — ${stack.length} unmatched opener(s): ${stack.join(", ")}` });
    return { steps, balanced: false, errorIndex };
  }

  return { steps, balanced: true, errorIndex: -1 };
}

const EXAMPLES = [
  { label: "✅ {[()]}", expr: "{[()]}" },
  { label: "✅ ((a+b))", expr: "((a+b))" },
  { label: "❌ {[(]}", expr: "{[(]}" },
  { label: "❌ ({)", expr: "({)" },
  { label: "❌ )[", expr: ")[" },
  { label: "✅ {()}[]", expr: "{()}[]" },
];

export default function BalancingCheckerPage() {
  const [input, setInput] = useState("{[()]}");
  const [steps, setSteps] = useState<BalancingStep[]>([]);
  const [currentStep, setCurrentStep] = useState(-1);
  const [isBalanced, setIsBalanced] = useState<boolean | null>(null);
  const [errorIndex, setErrorIndex] = useState(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [speed, setSpeed] = useState(600);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { addXP } = useProgressStore();

  const runCheck = useCallback(() => {
    const result = checkBalancing(input);
    setSteps(result.steps);
    setIsBalanced(null);
    setErrorIndex(-1);
    setCurrentStep(-1);
    addXP(3);
  }, [input, addXP]);

  const stepForward = useCallback(() => {
    setCurrentStep(prev => {
      const next = prev + 1;
      if (next >= steps.length) {
        setIsPlaying(false);
        setIsBalanced(steps[steps.length - 1]?.action !== "mismatch");
        return prev;
      }
      if (steps[next]?.action === "mismatch") {
        setErrorIndex(steps[next].index);
        setIsBalanced(false);
        setIsPlaying(false);
      }
      if (next === steps.length - 1 && steps[next].action !== "mismatch") setIsBalanced(true);
      return next;
    });
  }, [steps]);

  const runAll = () => {
    setCurrentStep(steps.length - 1);
    const lastStep = steps[steps.length - 1];
    setIsBalanced(lastStep?.action !== "mismatch");
    setErrorIndex(lastStep?.action === "mismatch" ? lastStep.index : -1);
  };

  useEffect(() => {
    if (isPlaying) {
      intervalRef.current = setInterval(stepForward, speed);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [isPlaying, speed, stepForward]);

  const visStep = currentStep >= 0 ? steps[currentStep] : null;

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black gradient-text">Symbol Balancing Checker</h1>
        <p className="text-slate-400 mt-1">Visualize the stack-based algorithm for checking balanced (), [], {"{}"} symbols</p>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {/* Left Panel */}
        <div className="space-y-4">
          {/* Input */}
          <div className="glass-card p-4">
            <label className="text-sm text-slate-400 mb-2 block">Input Expression</label>
            <input value={input} onChange={e => { setInput(e.target.value); setSteps([]); setCurrentStep(-1); setIsBalanced(null); setErrorIndex(-1); }}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-white text-lg tracking-wider focus:outline-none focus:border-indigo-500/50"
              placeholder="e.g. {[()]}" />
            <div className="flex flex-wrap gap-2 mt-3">
              {EXAMPLES.map(ex => (
                <button key={ex.label} onClick={() => { setInput(ex.expr); setSteps([]); setCurrentStep(-1); setIsBalanced(null); setErrorIndex(-1); }}
                  className="px-2 py-1 bg-white/5 rounded-lg text-xs text-slate-400 hover:bg-white/10 font-mono">{ex.label}</button>
              ))}
            </div>
            <div className="flex gap-2 mt-3">
              <motion.button onClick={runCheck} whileTap={{ scale: 0.95 }}
                className="flex-1 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> Generate Steps
              </motion.button>
            </div>
          </div>

          {/* Character display */}
          {input && (
            <div className="glass-card p-4">
              <div className="text-xs text-slate-500 mb-3 uppercase tracking-wide">Expression Characters</div>
              <div className="flex flex-wrap gap-1.5">
                {input.split("").map((ch, i) => {
                  const colors = CHAR_COLORS[ch];
                  const isCurrent = visStep?.index === i;
                  const isError = errorIndex === i;
                  return (
                    <motion.div key={i}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center font-mono font-bold text-sm border transition-all ${
                        isError ? "bg-red-500/40 border-red-500 text-red-300 shadow-[0_0_10px_rgba(239,68,68,0.5)]" :
                        isCurrent ? "bg-yellow-500/30 border-yellow-500 text-yellow-300 shadow-[0_0_10px_rgba(245,158,11,0.5)]" :
                        colors ? `${colors.bg} ${colors.border} ${colors.text}` :
                        "bg-white/5 border-white/10 text-slate-400"
                      }`}
                      animate={isCurrent ? { scale: [1, 1.2, 1] } : {}}
                      transition={{ duration: 0.3 }}>
                      {ch === " " ? "·" : ch}
                    </motion.div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Step controls */}
          {steps.length > 0 && (
            <div className="glass-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="font-bold text-white text-sm">Step {Math.max(0, currentStep + 1)} / {steps.length}</span>
                <div className="flex items-center gap-2">
                  <input type="range" min="100" max="1200" step="100" value={1300 - speed}
                    onChange={e => setSpeed(1300 - Number(e.target.value))}
                    className="w-20 accent-indigo-500" />
                  <button onClick={stepForward} disabled={currentStep >= steps.length - 1 || isPlaying}
                    className="px-2 py-1 bg-indigo-500/30 text-indigo-300 rounded-lg text-xs disabled:opacity-40 flex items-center gap-1">
                    <StepForward className="w-3.5 h-3.5" /> Step
                  </button>
                  <button onClick={() => setIsPlaying(p => !p)} disabled={currentStep >= steps.length - 1}
                    className={`px-2 py-1 rounded-lg text-xs flex items-center gap-1 ${isPlaying ? "bg-red-500/30 text-red-300" : "bg-green-500/30 text-green-300"} disabled:opacity-40`}>
                    {isPlaying ? "⏸ Pause" : "▶ Play"}
                  </button>
                  <button onClick={runAll} className="px-2 py-1 bg-white/10 text-slate-300 rounded-lg text-xs">All</button>
                </div>
              </div>

              <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                  animate={{ width: `${steps.length > 0 ? ((currentStep + 1) / steps.length) * 100 : 0}%` }} />
              </div>

              {/* Stack visual */}
              <div className="text-xs text-slate-500 mb-2 uppercase tracking-wide">Stack State</div>
              <div className="flex items-end gap-1 min-h-14">
                {visStep?.stack.length === 0 && <span className="text-slate-600 text-sm italic">stack empty</span>}
                <AnimatePresence>
                  {visStep?.stack.map((s, i) => {
                    const colors = CHAR_COLORS[s];
                    return (
                      <motion.div key={i + s}
                        initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 20, opacity: 0 }}
                        className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm border ${colors ? `${colors.bg} ${colors.border} ${colors.text}` : "bg-white/10 border-white/20 text-white"}`}>
                        {s}
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              </div>

              {visStep && (
                <motion.div key={currentStep} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                  className={`mt-3 p-3 rounded-xl border text-sm ${
                    visStep.action === "match" ? "bg-green-500/10 border-green-500/30 text-green-300" :
                    visStep.action === "mismatch" ? "bg-red-500/10 border-red-500/30 text-red-300" :
                    visStep.action === "push" ? "bg-indigo-500/10 border-indigo-500/30 text-indigo-300" :
                    "bg-white/5 border-white/10 text-slate-400"
                  }`}>
                  <strong className="font-mono">{visStep.char}</strong>
                  {" — "}
                  {visStep.action === "push" && `Push '${visStep.char}' onto stack`}
                  {visStep.action === "match" && `✅ Matches '${visStep.matched}' — pop and continue`}
                  {visStep.action === "mismatch" && `❌ ${visStep.error}`}
                  {visStep.action === "skip" && `Not a bracket — skip`}
                </motion.div>
              )}
            </div>
          )}

          {/* Final Result */}
          {isBalanced !== null && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className={`glass-card p-5 text-center border ${isBalanced ? "border-green-500/40" : "border-red-500/40"}`}>
              {isBalanced ? (
                <>
                  <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
                  <div className="text-xl font-black text-green-300">✅ Balanced!</div>
                  <div className="text-slate-400 text-sm mt-1">All symbols are properly matched</div>
                </>
              ) : (
                <>
                  <XCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
                  <div className="text-xl font-black text-red-300">❌ Not Balanced</div>
                  <div className="text-slate-400 text-sm mt-1">{steps.find(s => s.action === "mismatch")?.error}</div>
                </>
              )}
            </motion.div>
          )}
        </div>

        {/* Right Panel */}
        <div className="space-y-4">
          {/* Step log */}
          {steps.length > 0 && (
            <div className="glass-card p-4">
              <h3 className="font-bold text-white mb-3 text-sm">All Steps Log</h3>
              <div className="max-h-64 overflow-y-auto space-y-1">
                {steps.map((step, i) => (
                  <div key={i} onClick={() => setCurrentStep(i)}
                    className={`flex items-center gap-2 p-2 rounded-lg cursor-pointer text-xs transition-all ${i === currentStep ? "bg-indigo-500/20 border border-indigo-500/30" : "hover:bg-white/5"}`}>
                    <span className="w-4 text-slate-500">{i + 1}</span>
                    <span className={`w-7 h-6 rounded flex items-center justify-center font-mono font-bold ${
                      CHAR_COLORS[step.char]?.text || "text-slate-400"}`}>{step.char === "EOF" ? "∅" : step.char}</span>
                    <span className={`flex-1 ${step.action === "mismatch" ? "text-red-400" : step.action === "match" ? "text-green-400" : "text-slate-400"}`}>
                      {step.action === "push" ? "Push" : step.action === "match" ? "✅ Match" : step.action === "mismatch" ? "❌ Error" : step.action === "skip" ? "Skip" : "Pop drain"}
                    </span>
                    <span className="text-slate-500 font-mono">[{step.stack.join("")}]</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Algorithm */}
          <div className="glass-card p-4">
            <h3 className="font-bold text-white mb-3">Algorithm</h3>
            <div className="space-y-2 text-xs text-slate-300">
              {[
                "Scan string left → right",
                "If OPEN bracket: push onto stack",
                "If CLOSE bracket: check if stack top matches",
                "   - If matches: pop and continue",
                "   - If no match: UNBALANCED",
                "At end: if stack is EMPTY → BALANCED",
                "         else: UNBALANCED (unclosed openers)",
              ].map((line, i) => (
                <div key={i} className={`font-mono ${line.startsWith("   ") ? "ml-4 text-slate-400" : ""}`}>{line}</div>
              ))}
            </div>
          </div>

          <div className="glass-card p-4">
            <h3 className="font-bold text-white mb-3">C Implementation</h3>
            <pre className="text-xs text-slate-300 bg-black/30 p-3 rounded-xl overflow-x-auto leading-5">
{`int isBalanced(char *s) {
  char stk[100]; int top = -1;
  for (int i = 0; s[i]; i++) {
    char c = s[i];
    if (c=='(' || c=='[' || c=='{')
      stk[++top] = c;
    else if (c==')' || c==']' || c=='}') {
      if (top<0) return 0;
      char t = stk[top--];
      if (!((c==')' && t=='(') ||
            (c==']' && t=='[') ||
            (c=='}' && t=='{')))
        return 0;
    }
  }
  return top == -1;
}`}
            </pre>
          </div>

          <div className="glass-card p-4">
            <h3 className="font-bold text-white mb-2">🎯 Exam Tips</h3>
            <ul className="space-y-1.5 text-xs text-slate-300">
              <li className="flex gap-2"><span className="text-indigo-400">•</span> Time Complexity: O(n), Space: O(n)</li>
              <li className="flex gap-2"><span className="text-indigo-400">•</span> Stack is perfect because brackets must nest</li>
              <li className="flex gap-2"><span className="text-indigo-400">•</span> Two failure cases: mismatch mid-scan, non-empty stack at end</li>
              <li className="flex gap-2"><span className="text-indigo-400">•</span> Real usage: compilers, IDEs, JSON parsers</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
