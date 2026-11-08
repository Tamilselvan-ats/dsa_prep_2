"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Shuffle, Copy, CheckCircle, Loader2, Lightbulb,
  ArrowRight, BookOpen, Code2, FileText, GitBranch, BarChart3
} from "lucide-react";
import { useAIStore } from "@/lib/stores/ai-store";
import { generateAlgorithm } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type InputType = "problem" | "algorithm" | "pseudocode" | "code";
type OutputType = "algorithm" | "pseudocode" | "ccode" | "flowchart";

interface ConversionResult {
  output: string;
  timeComplexity: string;
  spaceComplexity: string;
  timeExplanation: string;
  spaceExplanation: string;
  examTips: string[];
  keyPoints: string[];
}

// ─── Constants ───────────────────────────────────────────────────────────────

const INPUT_TYPES: Array<{ id: InputType; label: string; icon: React.ReactNode; placeholder: string }> = [
  {
    id: "problem",
    label: "Problem Description",
    icon: <FileText size={15} />,
    placeholder: `Describe the problem in plain English.

Example: "Given an unsorted array of n integers, find whether a pair with a given sum exists. Return true/false."`,
  },
  {
    id: "algorithm",
    label: "Algorithm (Steps)",
    icon: <BookOpen size={15} />,
    placeholder: `Write numbered algorithm steps.

Example:
1. Start
2. Read array A of n elements
3. Set min = A[0]
4. For i = 1 to n-1
   a. If A[i] < min, set min = A[i]
5. Print min
6. Stop`,
  },
  {
    id: "pseudocode",
    label: "Pseudocode",
    icon: <GitBranch size={15} />,
    placeholder: `Write pseudocode.

Example:
FUNCTION BubbleSort(A, n):
  FOR i = 0 TO n-2 DO
    FOR j = 0 TO n-i-2 DO
      IF A[j] > A[j+1] THEN
        SWAP(A[j], A[j+1])
      END IF
    END FOR
  END FOR
END FUNCTION`,
  },
  {
    id: "code",
    label: "C Code",
    icon: <Code2 size={15} />,
    placeholder: `Paste C/C++ code.

Example:
int factorial(int n) {
    if (n == 0) return 1;
    return n * factorial(n - 1);
}`,
  },
];

const OUTPUT_TYPES: Array<{ id: OutputType; label: string; icon: React.ReactNode; color: string }> = [
  { id: "algorithm", label: "Algorithm", icon: <BookOpen size={14} />, color: "text-blue-400" },
  { id: "pseudocode", label: "Pseudocode", icon: <GitBranch size={14} />, color: "text-cyan-400" },
  { id: "ccode", label: "C Code", icon: <Code2 size={14} />, color: "text-green-400" },
  { id: "flowchart", label: "Flowchart Description", icon: <GitBranch size={14} />, color: "text-purple-400" },
];

const EXAM_TIPS_DEFAULT = [
  "Always state algorithm steps starting with START and ending with STOP",
  "Use numbered steps (1, 2, 3...) for algorithms in exams",
  "Show time complexity using Big-O notation",
  "Draw flowchart with proper symbols: rectangle=process, diamond=decision, oval=start/stop",
  "For pseudocode, use indentation to show loops and conditionals",
  "Always mention both time AND space complexity for full marks",
];

// ─── Main Component ───────────────────────────────────────────────────────────

export default function AlgorithmPage() {
  const { settings } = useAIStore();

  const [inputType, setInputType] = useState<InputType>("problem");
  const [outputType, setOutputType] = useState<OutputType>("algorithm");
  const [input, setInput] = useState("");
  const [converting, setConverting] = useState(false);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [copied, setCopied] = useState(false);

  const selectedInputConfig = INPUT_TYPES.find((t) => t.id === inputType)!;

  // ── Convert ───────────────────────────────────────────────────────────────

  const handleConvert = useCallback(async () => {
    if (!input.trim()) {
      toast.error("Please enter some input first!");
      return;
    }
    setConverting(true);
    setResult(null);
    try {
      const res = await generateAlgorithm({
        input,
        inputType,
        outputType,
        settings,
      });
      setResult(res as ConversionResult);
      toast.success("Conversion complete!");
    } catch {
      toast.error("Conversion failed – check your AI settings.");
    } finally {
      setConverting(false);
    }
  }, [input, inputType, outputType, settings]);

  const copyOutput = useCallback(async () => {
    if (!result?.output) return;
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-purple-500/20 border border-purple-500/30">
            <Shuffle className="text-purple-400" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Algorithm & Pseudocode Master</h1>
            <p className="text-slate-400 text-sm">
              Convert between Problem → Algorithm → Pseudocode → C Code → Flowchart
            </p>
          </div>
        </div>
      </motion.div>

      {/* Input / Output Selectors */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-4 mb-4"
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Input selector */}
          <div>
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Input Type</p>
            <div className="grid grid-cols-2 gap-2">
              {INPUT_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setInputType(t.id); setInput(""); setResult(null); }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    inputType === t.id
                      ? "bg-indigo-600/80 text-white border border-indigo-500/60 shadow-lg shadow-indigo-500/20"
                      : "bg-slate-800/60 text-slate-400 border border-slate-700/40 hover:bg-slate-700/60 hover:text-slate-200"
                  }`}
                >
                  {t.icon}
                  <span className="text-xs">{t.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Arrow divider */}
          <div className="flex flex-col">
            <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">Output Type</p>
            <div className="grid grid-cols-2 gap-2">
              {OUTPUT_TYPES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => { setOutputType(t.id); setResult(null); }}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    outputType === t.id
                      ? "bg-purple-600/80 text-white border border-purple-500/60 shadow-lg shadow-purple-500/20"
                      : "bg-slate-800/60 text-slate-400 border border-slate-700/40 hover:bg-slate-700/60 hover:text-slate-200"
                  }`}
                >
                  <span className={outputType === t.id ? "text-white" : t.color}>{t.icon}</span>
                  <span className="text-xs">{t.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Conversion badge */}
        <div className="mt-4 flex items-center justify-center gap-3">
          <span className="text-sm font-semibold text-indigo-300 capitalize">{inputType.replace("code", "C Code")}</span>
          <ArrowRight className="text-slate-500" size={16} />
          <span className="text-sm font-semibold text-purple-300 capitalize">{outputType.replace("ccode", "C Code").replace("flowchart", "Flowchart")}</span>
        </div>
      </motion.div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Input Area */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-4 flex flex-col gap-4"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-indigo-400">{selectedInputConfig.icon}</span>
              <h3 className="font-semibold text-slate-200">{selectedInputConfig.label}</h3>
            </div>
            {input && (
              <button
                onClick={() => { setInput(""); setResult(null); }}
                className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
              >
                Clear
              </button>
            )}
          </div>

          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={selectedInputConfig.placeholder}
            rows={16}
            className="w-full bg-slate-900/60 border border-slate-700/60 rounded-xl p-4 font-mono text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500/50 leading-relaxed"
          />

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConvert}
            disabled={converting || !input.trim()}
            className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              background: converting
                ? "rgba(139,92,246,0.4)"
                : "linear-gradient(135deg, #8b5cf6, #6366f1, #06b6d4)",
              boxShadow: converting ? "none" : "0 0 20px rgba(139,92,246,0.4)",
            }}
          >
            {converting ? (
              <>
                <Loader2 className="animate-spin" size={18} />
                Converting…
              </>
            ) : (
              <>
                <Shuffle size={18} />
                Convert →
              </>
            )}
          </motion.button>
        </motion.div>

        {/* Output + Complexity + Tips */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.3 }}
          className="flex flex-col gap-4"
        >
          {/* Output Panel */}
          <div className="glass-card p-4 flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className={OUTPUT_TYPES.find((t) => t.id === outputType)?.color}>
                  {OUTPUT_TYPES.find((t) => t.id === outputType)?.icon}
                </span>
                <h3 className="font-semibold text-slate-200">
                  {OUTPUT_TYPES.find((t) => t.id === outputType)?.label}
                </h3>
              </div>
              {result?.output && (
                <button
                  onClick={copyOutput}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/60 text-slate-300 text-xs hover:bg-slate-600/60 transition-all"
                >
                  {copied ? <CheckCircle size={12} className="text-green-400" /> : <Copy size={12} />}
                  {copied ? "Copied!" : "Copy"}
                </button>
              )}
            </div>

            <AnimatePresence mode="wait">
              {!result && !converting && (
                <motion.div
                  key="empty"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12 text-center"
                >
                  <div className="text-4xl mb-3">🔄</div>
                  <p className="text-slate-500 text-sm">Output will appear here after conversion</p>
                </motion.div>
              )}
              {converting && (
                <motion.div
                  key="loading"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex flex-col items-center justify-center py-12"
                >
                  <Loader2 className="animate-spin text-purple-400 mb-3" size={32} />
                  <p className="text-slate-400 text-sm">AI is converting…</p>
                </motion.div>
              )}
              {result && !converting && (
                <motion.div
                  key="result"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  <pre className="bg-slate-900/60 rounded-xl p-4 text-xs font-mono text-slate-200 leading-relaxed overflow-x-auto whitespace-pre-wrap border border-slate-700/40 max-h-64">
                    {result.output}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Complexity Panel */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 }}
                className="glass-card p-4"
              >
                <div className="flex items-center gap-2 mb-3">
                  <BarChart3 className="text-purple-400" size={16} />
                  <h3 className="font-semibold text-slate-200 text-sm">Complexity Analysis</h3>
                </div>
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-center">
                    <p className="text-[10px] text-slate-500 mb-1">Time Complexity</p>
                    <p className="text-xl font-bold text-purple-300 font-mono">{result.timeComplexity || "N/A"}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center">
                    <p className="text-[10px] text-slate-500 mb-1">Space Complexity</p>
                    <p className="text-xl font-bold text-blue-300 font-mono">{result.spaceComplexity || "N/A"}</p>
                  </div>
                </div>
                {result.timeExplanation && (
                  <p className="text-xs text-slate-400 leading-relaxed">{result.timeExplanation}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Exam Tips Panel */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Lightbulb className="text-yellow-400" size={16} />
              <h3 className="font-semibold text-slate-200 text-sm">📝 Exam Tips</h3>
            </div>
            <div className="space-y-2">
              {(result?.examTips?.length ? result.examTips : EXAM_TIPS_DEFAULT).map((tip, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 + 0.4 }}
                  className="flex items-start gap-2 text-xs text-slate-300"
                >
                  <span className="text-yellow-400 mt-0.5 shrink-0">★</span>
                  <span>{tip}</span>
                </motion.div>
              ))}
            </div>

            {result?.keyPoints && result.keyPoints.length > 0 && (
              <div className="mt-3 pt-3 border-t border-slate-700/40">
                <p className="text-xs font-semibold text-cyan-400 mb-2">🔑 Key Points for This Algorithm:</p>
                <div className="space-y-1.5">
                  {result.keyPoints.map((pt, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                      <span className="text-cyan-500 mt-0.5 shrink-0">•</span>
                      <span>{pt}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
