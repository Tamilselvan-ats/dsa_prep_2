"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Play, StepForward, RotateCcw, ChevronRight, AlertTriangle, CheckCircle } from "lucide-react";
import { toast } from "sonner";
import { useProgressStore } from "@/lib/stores/progress-store";

// ─── Shunting-Yard Algorithm ──────────────────────────────────────────────────
const PRECEDENCE: Record<string, number> = { "+": 1, "-": 1, "*": 2, "/": 2, "^": 3 };
const isOperator = (t: string) => t in PRECEDENCE;
const isOperand = (t: string) => /^[A-Za-z0-9]+$/.test(t) && !(t in PRECEDENCE) && t !== "(" && t !== ")";

interface ConvStep { token: string; stack: string[]; output: string[]; action: string; }

function infixToPostfixSteps(expr: string): ConvStep[] {
  const tokens = expr.replace(/\s+/g, "").split(/(?=[+\-*/^()])|(?<=[+\-*/^()])/g).filter(Boolean);
  const steps: ConvStep[] = [];
  const stack: string[] = [];
  const output: string[] = [];

  for (const token of tokens) {
    if (isOperand(token)) {
      output.push(token);
      steps.push({ token, stack: [...stack], output: [...output], action: `Operand → Output` });
    } else if (token === "(") {
      stack.push(token);
      steps.push({ token, stack: [...stack], output: [...output], action: `Push '(' to stack` });
    } else if (token === ")") {
      while (stack.length && stack[stack.length - 1] !== "(") {
        output.push(stack.pop()!);
      }
      stack.pop(); // remove "("
      steps.push({ token, stack: [...stack], output: [...output], action: `Pop until '(' found` });
    } else if (isOperator(token)) {
      while (stack.length && stack[stack.length - 1] !== "(" &&
        PRECEDENCE[stack[stack.length - 1]] >= PRECEDENCE[token]) {
        output.push(stack.pop()!);
      }
      stack.push(token);
      steps.push({ token, stack: [...stack], output: [...output], action: `Operator (prec ${PRECEDENCE[token]}) → stack` });
    }
  }
  while (stack.length) {
    output.push(stack.pop()!);
    steps.push({ token: "EOF", stack: [...stack], output: [...output], action: `Drain remaining stack` });
  }
  return steps;
}

// ─── Postfix Evaluator ────────────────────────────────────────────────────────
interface EvalStep { token: string; stack: (number | string)[]; action: string; result?: number; }

function evaluatePostfixSteps(expr: string): { steps: EvalStep[]; result: number | null; error?: string } {
  const tokens = expr.trim().split(/\s+/);
  const steps: EvalStep[] = [];
  const stack: number[] = [];

  for (const token of tokens) {
    if (!isNaN(Number(token))) {
      stack.push(Number(token));
      steps.push({ token, stack: [...stack], action: `Push ${token}` });
    } else if (["+", "-", "*", "/"].includes(token)) {
      if (stack.length < 2) return { steps, result: null, error: "Not enough operands" };
      const b = stack.pop()!;
      const a = stack.pop()!;
      let res = 0;
      if (token === "+") res = a + b;
      else if (token === "-") res = a - b;
      else if (token === "*") res = a * b;
      else if (token === "/") res = b === 0 ? NaN : a / b;
      stack.push(res);
      steps.push({ token, stack: [...stack], action: `${a} ${token} ${b} = ${res}`, result: res });
    }
  }
  return { steps, result: stack[0] ?? null };
}

const EXAMPLES = [
  { label: "A+B*C", expr: "A+B*C" },
  { label: "A*(B+C)", expr: "A*(B+C)" },
  { label: "A+B-C*D", expr: "A+B-C*D" },
  { label: "(A+B)*(C-D)", expr: "(A+B)*(C-D)" },
];

const EVAL_EXAMPLES = [
  { label: "3 4 + 2 *", expr: "3 4 + 2 *" },
  { label: "5 1 2 + 4 * + 3 -", expr: "5 1 2 + 4 * + 3 -" },
  { label: "2 3 1 * + 9 -", expr: "2 3 1 * + 9 -" },
];

export default function InfixPostfixPage() {
  const [infixExpr, setInfixExpr] = useState("A+B*C-D");
  const [convSteps, setConvSteps] = useState<ConvStep[]>([]);
  const [currentConvStep, setCurrentConvStep] = useState(-1);
  const [postfixExpr, setPostfixExpr] = useState("3 4 2 * + 5 -");
  const [evalSteps, setEvalSteps] = useState<EvalStep[]>([]);
  const [currentEvalStep, setCurrentEvalStep] = useState(-1);
  const [evalResult, setEvalResult] = useState<number | null>(null);
  const [evalError, setEvalError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"convert" | "evaluate">("convert");
  const { addXP } = useProgressStore();

  const startConversion = () => {
    try {
      const steps = infixToPostfixSteps(infixExpr);
      setConvSteps(steps);
      setCurrentConvStep(-1);
      addXP(5);
    } catch { toast.error("Invalid expression"); }
  };

  const stepConversion = () => {
    if (currentConvStep < convSteps.length - 1) setCurrentConvStep(p => p + 1);
  };

  const runAllConversion = () => {
    setCurrentConvStep(convSteps.length - 1);
  };

  const startEvaluation = () => {
    const { steps, result, error } = evaluatePostfixSteps(postfixExpr);
    setEvalSteps(steps);
    setCurrentEvalStep(-1);
    setEvalResult(result);
    setEvalError(error || null);
    addXP(5);
  };

  const stepEval = () => {
    if (currentEvalStep < evalSteps.length - 1) setCurrentEvalStep(p => p + 1);
  };

  const visConvStep = currentConvStep >= 0 ? convSteps[currentConvStep] : null;
  const visEvalStep = currentEvalStep >= 0 ? evalSteps[currentEvalStep] : null;

  const finalPostfix = convSteps.length > 0 ? convSteps[convSteps.length - 1].output.join(" ") : "";

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black gradient-text">Infix / Postfix Lab</h1>
        <p className="text-slate-400 mt-1">Step-by-step Shunting-Yard conversion and Postfix evaluation with stack animation</p>
      </div>

      <div className="flex gap-2 mb-6">
        {[{ id: "convert", label: "🔄 Infix → Postfix" }, { id: "evaluate", label: "🧮 Postfix Evaluation" }].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === tab.id ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === "convert" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            {/* Input */}
            <div className="glass-card p-4">
              <label className="text-sm text-slate-400 mb-2 block">Infix Expression</label>
              <input value={infixExpr} onChange={e => setInfixExpr(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/50"
                placeholder="e.g. A+B*C" />
              <div className="flex flex-wrap gap-2 mt-3">
                {EXAMPLES.map(ex => (
                  <button key={ex.label} onClick={() => setInfixExpr(ex.expr)}
                    className="px-2 py-1 bg-white/5 rounded-lg text-xs text-slate-400 hover:bg-white/10 font-mono">{ex.label}</button>
                ))}
              </div>
              <div className="flex gap-2 mt-3">
                <motion.button onClick={startConversion} whileTap={{ scale: 0.95 }}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-sm font-semibold flex items-center justify-center gap-2">
                  <Play className="w-4 h-4" /> Generate Steps
                </motion.button>
              </div>
            </div>

            {/* Step Controls */}
            {convSteps.length > 0 && (
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-bold text-white">Step {Math.max(0, currentConvStep + 1)} / {convSteps.length}</h3>
                  <div className="flex gap-2">
                    <button onClick={stepConversion} disabled={currentConvStep >= convSteps.length - 1}
                      className="px-3 py-1.5 bg-indigo-500/30 text-indigo-300 rounded-lg text-xs font-semibold disabled:opacity-40 flex items-center gap-1">
                      <StepForward className="w-3.5 h-3.5" /> Next
                    </button>
                    <button onClick={runAllConversion}
                      className="px-3 py-1.5 bg-green-500/30 text-green-300 rounded-lg text-xs font-semibold flex items-center gap-1">
                      <Play className="w-3.5 h-3.5" /> All
                    </button>
                    <button onClick={() => { setCurrentConvStep(-1); }}
                      className="px-3 py-1.5 bg-white/10 text-slate-300 rounded-lg text-xs">
                      <RotateCcw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden mb-4">
                  <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                    animate={{ width: `${convSteps.length > 0 ? ((currentConvStep + 1) / convSteps.length) * 100 : 0}%` }} />
                </div>

                {/* Current Step Display */}
                {visConvStep && (
                  <motion.div key={currentConvStep} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-indigo-500/15 border border-indigo-500/30 rounded-xl">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xs text-slate-400">Token:</span>
                      <span className="font-mono font-bold text-indigo-300 text-lg">{visConvStep.token}</span>
                      <span className="text-xs text-slate-500 ml-auto">{visConvStep.action}</span>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mt-2">
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Stack</div>
                        <div className="flex gap-1 flex-wrap">
                          {visConvStep.stack.length === 0 && <span className="text-xs text-slate-600 italic">empty</span>}
                          {visConvStep.stack.map((s, i) => (
                            <span key={i} className="px-2 py-1 bg-purple-500/20 text-purple-300 rounded font-mono text-xs border border-purple-500/30">{s}</span>
                          ))}
                        </div>
                      </div>
                      <div>
                        <div className="text-xs text-slate-500 mb-1">Output</div>
                        <div className="flex gap-1 flex-wrap">
                          {visConvStep.output.map((o, i) => (
                            <span key={i} className="px-2 py-1 bg-green-500/20 text-green-300 rounded font-mono text-xs border border-green-500/30">{o}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentConvStep === convSteps.length - 1 && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="mt-3 p-3 bg-green-500/15 border border-green-500/30 rounded-xl text-center">
                    <CheckCircle className="w-5 h-5 text-green-400 mx-auto mb-1" />
                    <div className="text-sm font-bold text-green-300">Postfix: <span className="font-mono">{finalPostfix}</span></div>
                  </motion.div>
                )}
              </div>
            )}

            {/* Step Log */}
            {convSteps.length > 0 && (
              <div className="glass-card p-4">
                <h3 className="font-bold text-white mb-3 text-sm">All Steps</h3>
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {convSteps.map((step, i) => (
                    <div key={i} onClick={() => setCurrentConvStep(i)}
                      className={`flex items-center gap-3 p-2 rounded-lg cursor-pointer text-xs transition-all ${i === currentConvStep ? "bg-indigo-500/20 border border-indigo-500/30" : "hover:bg-white/5"}`}>
                      <span className="text-slate-500 w-4">{i + 1}</span>
                      <span className="font-mono text-indigo-300 w-6">{step.token}</span>
                      <span className="text-slate-400 flex-1">{step.action}</span>
                      <span className="font-mono text-green-400">{step.output.join(" ")}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Operator Precedence + Info */}
          <div className="space-y-4">
            <div className="glass-card p-4">
              <h3 className="font-bold text-white mb-3">Operator Precedence Table</h3>
              <table className="w-full text-sm">
                <thead><tr className="border-b border-white/10">
                  <th className="text-left py-2 text-slate-400">Operator</th>
                  <th className="text-left py-2 text-slate-400">Precedence</th>
                  <th className="text-left py-2 text-slate-400">Associativity</th>
                </tr></thead>
                <tbody className="space-y-1">
                  {[
                    { op: "^", prec: "3 (Highest)", assoc: "Right" },
                    { op: "*, /", prec: "2", assoc: "Left" },
                    { op: "+, -", prec: "1 (Lowest)", assoc: "Left" },
                    { op: "()", prec: "Highest (overrides all)", assoc: "—" },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-2 font-mono text-indigo-300">{row.op}</td>
                      <td className="py-2 text-slate-300">{row.prec}</td>
                      <td className="py-2 text-slate-300">{row.assoc}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="glass-card p-4">
              <h3 className="font-bold text-white mb-3">Shunting-Yard Algorithm Rules</h3>
              <div className="space-y-2 text-xs text-slate-300">
                {[
                  { cond: "If token is OPERAND", action: "→ add to output directly" },
                  { cond: "If token is '('", action: "→ push to stack" },
                  { cond: "If token is ')'", action: "→ pop stack to output until '(' found" },
                  { cond: "If token is OPERATOR", action: "→ pop higher/equal precedence ops first, then push" },
                  { cond: "At END", action: "→ pop all remaining stack to output" },
                ].map((r, i) => (
                  <div key={i} className="p-2 bg-white/5 rounded-lg">
                    <span className="text-indigo-400 font-semibold">{r.cond}</span>
                    <br /><span className="text-slate-400">{r.action}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="glass-card p-4">
              <h3 className="font-bold text-white mb-2">🎯 Exam Tip</h3>
              <p className="text-xs text-slate-300 leading-relaxed">
                For <span className="text-indigo-400 font-bold">A+B*C</span>: <br />
                * has higher precedence than +, so it goes to output first → <br />
                Postfix: <span className="font-mono text-green-400">A B C * +</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {activeTab === "evaluate" && (
        <div className="grid lg:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div className="glass-card p-4">
              <label className="text-sm text-slate-400 mb-2 block">Postfix Expression (space-separated)</label>
              <input value={postfixExpr} onChange={e => setPostfixExpr(e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 font-mono text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="e.g. 3 4 2 * + 5 -" />
              <div className="flex flex-wrap gap-2 mt-3">
                {EVAL_EXAMPLES.map(ex => (
                  <button key={ex.label} onClick={() => setPostfixExpr(ex.expr)}
                    className="px-2 py-1 bg-white/5 rounded-lg text-xs text-slate-400 hover:bg-white/10 font-mono">{ex.label}</button>
                ))}
              </div>
              <motion.button onClick={startEvaluation} whileTap={{ scale: 0.95 }}
                className="mt-3 w-full py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-sm font-semibold flex items-center justify-center gap-2">
                <Play className="w-4 h-4" /> Start Evaluation
              </motion.button>
            </div>

            {evalSteps.length > 0 && (
              <div className="glass-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-bold text-white text-sm">Step {Math.max(0, currentEvalStep + 1)} / {evalSteps.length}</span>
                  <div className="flex gap-2">
                    <button onClick={stepEval} disabled={currentEvalStep >= evalSteps.length - 1}
                      className="px-3 py-1 bg-cyan-500/30 text-cyan-300 rounded-lg text-xs font-semibold disabled:opacity-40 flex items-center gap-1">
                      <StepForward className="w-3.5 h-3.5" /> Step
                    </button>
                    <button onClick={() => setCurrentEvalStep(evalSteps.length - 1)}
                      className="px-3 py-1 bg-green-500/30 text-green-300 rounded-lg text-xs">All</button>
                  </div>
                </div>

                {visEvalStep && (
                  <motion.div key={currentEvalStep} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl">
                    <div className="flex gap-2 items-center mb-2">
                      <span className="text-xs text-slate-400">Token:</span>
                      <span className="font-mono font-bold text-cyan-300 text-lg">{visEvalStep.token}</span>
                      {visEvalStep.result !== undefined && <span className="text-green-400 text-sm ml-auto font-bold">= {visEvalStep.result}</span>}
                    </div>
                    <div className="text-xs text-slate-400 mb-2">{visEvalStep.action}</div>
                    <div>
                      <div className="text-xs text-slate-500 mb-1">Operand Stack</div>
                      <div className="flex gap-1">
                        {visEvalStep.stack.length === 0 && <span className="text-slate-600 text-xs italic">empty</span>}
                        {(visEvalStep.stack as number[]).map((v, i) => (
                          <span key={i} className="px-2 py-1 bg-cyan-500/20 text-cyan-300 rounded font-mono text-sm border border-cyan-500/30">{v}</span>
                        ))}
                      </div>
                    </div>
                  </motion.div>
                )}

                {currentEvalStep === evalSteps.length - 1 && evalResult !== null && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                    className="mt-3 p-3 bg-green-500/15 border border-green-500/30 rounded-xl text-center">
                    <div className="text-lg font-black text-green-300">Result: {evalResult}</div>
                  </motion.div>
                )}
                {evalError && (
                  <div className="mt-3 p-3 bg-red-500/15 border border-red-500/30 rounded-xl flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="text-red-300 text-sm">{evalError}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-4">
            <div className="glass-card p-4">
              <h3 className="font-bold text-white mb-3">Postfix Evaluation Rules</h3>
              <div className="space-y-2 text-xs">
                {[
                  { step: "1", text: "Scan expression left to right" },
                  { step: "2", text: "If OPERAND → push onto stack" },
                  { step: "3", text: "If OPERATOR → pop 2 operands, apply operator, push result" },
                  { step: "4", text: "At END → stack top = final result" },
                ].map((r, i) => (
                  <div key={i} className="flex gap-3 p-2 bg-white/5 rounded-lg">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/30 text-cyan-400 flex items-center justify-center text-xs font-bold flex-shrink-0">{r.step}</span>
                    <span className="text-slate-300">{r.text}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card p-4">
              <h3 className="font-bold text-white mb-2">🎯 Important Note</h3>
              <p className="text-xs text-slate-300">When applying operator op on operands a, b (popped in order b then a):<br />
                Result = <span className="text-indigo-400 font-mono">a op b</span> (NOT b op a)<br />
                e.g., pop 4, pop 3 → 3 - 4 = -1 (not 4 - 3)</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
