"use client";

import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Code2, Play, Copy, MessageSquare, AlertTriangle, Bug,
  CheckCircle, Zap, TrendingUp, Award, ChevronDown, ChevronRight,
  Loader2, RefreshCw, FileCode, Terminal, BarChart3
} from "lucide-react";
import { useAIStore } from "@/lib/stores/ai-store";
import { analyzeCode } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type Language = "c" | "cpp" | "python";

interface SyntaxError {
  line: number;
  col?: number;
  message: string;
  fix: string;
}

interface LogicalError {
  description: string;
  location: string;
  suggestion: string;
}

interface DryRunStep {
  step: number;
  line: number;
  description: string;
  variables: Record<string, string>;
}

interface ComplexityInfo {
  time: string;
  space: string;
  timeExplanation: string;
  spaceExplanation: string;
  bestCase?: string;
  worstCase?: string;
  averageCase?: string;
}

interface ExamScore {
  score: number;
  maxScore: number;
  feedback: string;
  deductions: Array<{ reason: string; marks: number }>;
  positives: string[];
}

interface AnalysisResult {
  syntaxErrors: SyntaxError[];
  logicalErrors: LogicalError[];
  fixedCode: string;
  dryRun: DryRunStep[];
  complexity: ComplexityInfo;
  examScore: ExamScore;
  summary: string;
}

type ResultTab = "syntax" | "logical" | "fixed" | "dryrun" | "complexity" | "exam";

// ─── Sample Code Snippets ──────────────────────────────────────────────────

const SAMPLE_CODE: Record<Language, string> = {
  c: `#include <stdio.h>

int main() {
    int arr[] = {64, 25, 12, 22, 11};
    int n = 5;
    int i, j, min_idx;
    
    for (i = 0; i < n-1; i++) {
        min_idx = i;
        for (j = i+1; j <= n; j++) {  // Bug: should be j < n
            if (arr[j] < arr[min_idx])
                min_idx = j;
        }
        int temp = arr[min_idx];
        arr[min_idx] = arr[i];
        arr[i] = temp
    }
    
    for (i = 0; i < n; i++)
        printf("%d ", arr[i]);
    
    return 0
}`,
  cpp: `#include <iostream>
#include <vector>
using namespace std;

int binarySearch(vector<int>& arr, int target) {
    int left = 0, right = arr.size();  // Bug: should be arr.size() - 1
    while (left <= right) {
        int mid = (left + right) / 2;
        if (arr[mid] == target) return mid;
        else if (arr[mid] < target) left = mid + 1;
        else right = mid - 1;
    }
    return -1;
}

int main() {
    vector<int> arr = {1, 3, 5, 7, 9, 11};
    cout << binarySearch(arr, 7) << endl
    return 0;
}`,
  python: `def bubble_sort(arr):
    n = len(arr)
    for i in range(n):
        for j in range(0, n-i-1):
            if arr[j] > arr[j+1]:
                arr[j], arr[j+1] = arr[j+1], arr[j]
    return arr  # Missing: return statement was fine, but let's add a bug
    
arr = [64, 34, 25, 12, 22, 11, 90]
result = bubble_sort(arr)
print("Sorted:", result)
print("Length:", len(result)
`
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CodeAnalyzerPage() {
  const { settings } = useAIStore();

  const [code, setCode] = useState("");
  const [language, setLanguage] = useState<Language>("c");
  const [analyzing, setAnalyzing] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState<ResultTab>("syntax");
  const [copiedFixed, setCopiedFixed] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // ── Analyze ──────────────────────────────────────────────────────────────

  const handleAnalyze = useCallback(async () => {
    if (!code.trim()) {
      toast.error("Please paste some code first!");
      return;
    }
    setAnalyzing(true);
    setResult(null);
    try {
      const analysis = await analyzeCode(code, language, settings);
      setResult(analysis as AnalysisResult);
      setActiveTab("syntax");
      toast.success("Analysis complete!");
    } catch (err) {
      toast.error("Analysis failed – check your AI settings.");
    } finally {
      setAnalyzing(false);
    }
  }, [code, language, settings]);

  const copyFixed = useCallback(async () => {
    if (!result?.fixedCode) return;
    await navigator.clipboard.writeText(result.fixedCode);
    setCopiedFixed(true);
    toast.success("Fixed code copied!");
    setTimeout(() => setCopiedFixed(false), 2000);
  }, [result]);

  const loadSample = () => {
    setCode(SAMPLE_CODE[language]);
    setResult(null);
  };

  // ── Tabs config ───────────────────────────────────────────────────────────

  const TABS: Array<{ id: ResultTab; label: string; icon: React.ReactNode; color: string }> = [
    { id: "syntax", label: "Syntax Errors", icon: <AlertTriangle size={14} />, color: "text-red-400" },
    { id: "logical", label: "Logical Errors", icon: <Bug size={14} />, color: "text-orange-400" },
    { id: "fixed", label: "Fixed Code", icon: <CheckCircle size={14} />, color: "text-green-400" },
    { id: "dryrun", label: "Dry Run", icon: <Terminal size={14} />, color: "text-cyan-400" },
    { id: "complexity", label: "Complexity", icon: <BarChart3 size={14} />, color: "text-purple-400" },
    { id: "exam", label: "Exam Score", icon: <Award size={14} />, color: "text-yellow-400" },
  ];

  const LANG_OPTIONS: Array<{ id: Language; label: string; ext: string }> = [
    { id: "c", label: "C", ext: ".c" },
    { id: "cpp", label: "C++", ext: ".cpp" },
    { id: "python", label: "Python", ext: ".py" },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-indigo-500/20 border border-indigo-500/30">
            <Code2 className="text-indigo-400" size={22} />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">AI Code Analyzer</h1>
            <p className="text-slate-400 text-sm">Paste your C/C++/Python code — get instant analysis, fixes & exam feedback</p>
          </div>
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* ── LEFT: Input Panel ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.1 }}
          className="flex flex-col gap-4"
        >
          {/* Language + controls */}
          <div className="glass-card p-4">
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <span className="text-slate-400 text-sm font-medium">Language:</span>
              <div className="flex gap-2">
                {LANG_OPTIONS.map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => { setLanguage(id); setResult(null); }}
                    className={`px-3 py-1.5 rounded-lg text-sm font-semibold transition-all ${
                      language === id
                        ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/30"
                        : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <div className="ml-auto">
                <button
                  onClick={loadSample}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/60 text-slate-300 text-sm hover:bg-slate-600/60 transition-all"
                >
                  <FileCode size={13} /> Load Sample
                </button>
              </div>
            </div>

            {/* Code Textarea */}
            <div className="relative">
              <div className="flex items-center gap-2 px-3 py-2 bg-slate-900 rounded-t-lg border border-slate-700/60 border-b-0">
                <div className="flex gap-1.5">
                  <div className="w-3 h-3 rounded-full bg-red-500/70" />
                  <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
                  <div className="w-3 h-3 rounded-full bg-green-500/70" />
                </div>
                <span className="text-slate-500 text-xs font-mono ml-2">
                  {language === "c" ? "main.c" : language === "cpp" ? "main.cpp" : "main.py"}
                </span>
              </div>
              <textarea
                ref={textareaRef}
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder={`// Paste your ${language.toUpperCase()} code here...\n// Or click "Load Sample" to try with a buggy example`}
                rows={22}
                spellCheck={false}
                className="w-full bg-slate-900/80 border border-slate-700/60 rounded-b-lg p-4 font-mono text-sm text-slate-200 placeholder-slate-600 resize-none focus:outline-none focus:border-indigo-500/50 leading-relaxed"
                style={{ tabSize: 4 }}
              />
              {code && (
                <button
                  onClick={() => { setCode(""); setResult(null); }}
                  className="absolute top-10 right-3 text-slate-600 hover:text-slate-400 transition-colors"
                >
                  <RefreshCw size={14} />
                </button>
              )}
            </div>

            {/* Stats row */}
            {code && (
              <div className="flex gap-4 mt-2 text-xs text-slate-500">
                <span>{code.split("\n").length} lines</span>
                <span>{code.length} chars</span>
                <span>{code.split(/\s+/).filter(Boolean).length} tokens</span>
              </div>
            )}

            {/* Analyze Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleAnalyze}
              disabled={analyzing || !code.trim()}
              className="w-full mt-4 py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              style={{
                background: analyzing
                  ? "rgba(99,102,241,0.4)"
                  : "linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)",
                boxShadow: analyzing ? "none" : "0 0 20px rgba(99,102,241,0.4)",
              }}
            >
              {analyzing ? (
                <>
                  <Loader2 className="animate-spin" size={18} />
                  🤖 AI is analyzing your code...
                </>
              ) : (
                <>
                  <Play size={18} />
                  Analyze Code
                </>
              )}
            </motion.button>
          </div>
        </motion.div>

        {/* ── RIGHT: Results Panel ──────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col gap-4"
        >
          <AnimatePresence mode="wait">
            {!result && !analyzing && (
              <motion.div
                key="empty"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card p-8 flex flex-col items-center justify-center text-center min-h-[400px]"
              >
                <div className="text-6xl mb-4">🤖</div>
                <h3 className="text-lg font-semibold text-slate-300 mb-2">Ready to Analyze</h3>
                <p className="text-slate-500 text-sm max-w-sm">
                  Paste your code on the left, select the language, then click <strong className="text-indigo-400">Analyze Code</strong>.
                  The AI will check for syntax errors, logical bugs, complexity, and give you an exam score.
                </p>
                <div className="mt-6 grid grid-cols-3 gap-3 w-full max-w-xs">
                  {["Syntax Errors", "Logic Bugs", "Complexity", "Dry Run", "Fixed Code", "Exam Score"].map((f) => (
                    <div key={f} className="text-xs text-slate-500 bg-slate-800/60 rounded-lg py-1.5 px-2 text-center">
                      {f}
                    </div>
                  ))}
                </div>
              </motion.div>
            )}

            {analyzing && (
              <motion.div
                key="loading"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="glass-card p-8 flex flex-col items-center justify-center min-h-[400px]"
              >
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                  className="text-5xl mb-6"
                >
                  ⚙️
                </motion.div>
                <div className="text-indigo-400 font-semibold text-lg mb-2">🤖 AI is analyzing your code...</div>
                <p className="text-slate-500 text-sm">Checking syntax, logic, complexity & more</p>
                <div className="mt-6 flex gap-2">
                  {["Parsing", "Checking", "Tracing", "Scoring"].map((s, i) => (
                    <motion.div
                      key={s}
                      initial={{ opacity: 0.3 }}
                      animate={{ opacity: [0.3, 1, 0.3] }}
                      transition={{ repeat: Infinity, duration: 1.5, delay: i * 0.3 }}
                      className="text-xs text-slate-400 bg-slate-800 rounded-full px-3 py-1"
                    >
                      {s}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}

            {result && !analyzing && (
              <motion.div
                key="result"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-card overflow-hidden"
              >
                {/* Summary */}
                {result.summary && (
                  <div className="px-4 py-3 bg-indigo-500/10 border-b border-indigo-500/20">
                    <p className="text-sm text-indigo-300 font-medium">📋 {result.summary}</p>
                  </div>
                )}

                {/* Tabs */}
                <div className="flex overflow-x-auto gap-0 border-b border-slate-700/60">
                  {TABS.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap transition-all border-b-2 ${
                        activeTab === tab.id
                          ? `border-indigo-500 text-white bg-indigo-500/10`
                          : `border-transparent text-slate-500 hover:text-slate-300 hover:bg-slate-800/60`
                      }`}
                    >
                      <span className={activeTab === tab.id ? tab.color : ""}>{tab.icon}</span>
                      {tab.label}
                      {tab.id === "syntax" && result.syntaxErrors.length > 0 && (
                        <span className="ml-1 bg-red-500/80 text-white text-[10px] rounded-full px-1.5 py-0.5">
                          {result.syntaxErrors.length}
                        </span>
                      )}
                      {tab.id === "logical" && result.logicalErrors.length > 0 && (
                        <span className="ml-1 bg-orange-500/80 text-white text-[10px] rounded-full px-1.5 py-0.5">
                          {result.logicalErrors.length}
                        </span>
                      )}
                    </button>
                  ))}
                </div>

                {/* Tab Content */}
                <div className="p-4 max-h-[520px] overflow-y-auto">
                  <AnimatePresence mode="wait">
                    {/* SYNTAX ERRORS */}
                    {activeTab === "syntax" && (
                      <motion.div key="syntax" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {result.syntaxErrors.length === 0 ? (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                            <CheckCircle className="text-green-400" size={20} />
                            <span className="text-green-300 font-medium">No syntax errors found! 🎉</span>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {result.syntaxErrors.map((err, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="p-3 rounded-xl bg-red-500/10 border border-red-500/30"
                              >
                                <div className="flex items-start gap-2 mb-2">
                                  <span className="text-xs bg-red-600/80 text-white px-2 py-0.5 rounded font-mono shrink-0">
                                    Line {err.line}{err.col ? `:${err.col}` : ""}
                                  </span>
                                  <span className="text-red-300 text-sm font-medium">{err.message}</span>
                                </div>
                                <div className="mt-2 p-2 rounded-lg bg-green-500/10 border border-green-500/20">
                                  <span className="text-xs text-green-400 font-semibold">✅ Fix: </span>
                                  <span className="text-green-300 text-xs">{err.fix}</span>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* LOGICAL ERRORS */}
                    {activeTab === "logical" && (
                      <motion.div key="logical" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {result.logicalErrors.length === 0 ? (
                          <div className="flex items-center gap-3 p-4 rounded-xl bg-green-500/10 border border-green-500/30">
                            <CheckCircle className="text-green-400" size={20} />
                            <span className="text-green-300 font-medium">No logical errors detected! Great code logic 🧠</span>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {result.logicalErrors.map((err, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.08 }}
                                className="p-3 rounded-xl bg-orange-500/10 border border-orange-500/30"
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <Bug size={14} className="text-orange-400 shrink-0" />
                                  <span className="text-orange-300 font-semibold text-sm">{err.description}</span>
                                </div>
                                <p className="text-slate-400 text-xs mb-2 pl-5">📍 {err.location}</p>
                                <div className="pl-5 p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                                  <span className="text-xs text-blue-400 font-semibold">💡 Suggestion: </span>
                                  <span className="text-blue-300 text-xs">{err.suggestion}</span>
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* FIXED CODE */}
                    {activeTab === "fixed" && (
                      <motion.div key="fixed" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-green-400 font-semibold text-sm flex items-center gap-2">
                            <CheckCircle size={16} /> Corrected Code
                          </span>
                          <button
                            onClick={copyFixed}
                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs hover:bg-green-500/30 transition-all"
                          >
                            {copiedFixed ? <CheckCircle size={12} /> : <Copy size={12} />}
                            {copiedFixed ? "Copied!" : "Copy Fixed Code"}
                          </button>
                        </div>
                        <pre className="bg-slate-900 rounded-xl p-4 overflow-x-auto text-xs font-mono text-slate-200 leading-relaxed border border-slate-700/60 whitespace-pre-wrap">
                          {result.fixedCode || "// No changes needed – code is correct!"}
                        </pre>
                      </motion.div>
                    )}

                    {/* DRY RUN */}
                    {activeTab === "dryrun" && (
                      <motion.div key="dryrun" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        <p className="text-slate-400 text-xs mb-3">Step-by-step execution trace of your code:</p>
                        {(!result.dryRun || result.dryRun.length === 0) ? (
                          <div className="text-slate-500 text-sm text-center py-6">No dry run trace available.</div>
                        ) : (
                          <div className="space-y-2">
                            {result.dryRun.map((step, i) => (
                              <motion.div
                                key={i}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="flex gap-3 p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20"
                              >
                                <div className="flex flex-col items-center gap-1 shrink-0">
                                  <span className="text-[10px] font-mono text-cyan-500 bg-cyan-500/10 rounded px-1.5 py-0.5">
                                    Step {step.step}
                                  </span>
                                  <span className="text-[10px] text-slate-600">L{step.line}</span>
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-cyan-200 text-xs font-medium mb-1">{step.description}</p>
                                  {step.variables && Object.keys(step.variables).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {Object.entries(step.variables).map(([k, v]) => (
                                        <span key={k} className="text-[10px] font-mono bg-slate-800 text-slate-300 rounded px-2 py-0.5 border border-slate-700/60">
                                          {k} = {v}
                                        </span>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </motion.div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* COMPLEXITY */}
                    {activeTab === "complexity" && (
                      <motion.div key="complexity" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {!result.complexity ? (
                          <div className="text-slate-500 text-sm text-center py-6">No complexity info available.</div>
                        ) : (
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-3">
                              <div className="p-3 rounded-xl bg-purple-500/10 border border-purple-500/30 text-center">
                                <p className="text-xs text-slate-500 mb-1">Time Complexity</p>
                                <p className="text-2xl font-bold text-purple-300 font-mono">{result.complexity.time}</p>
                              </div>
                              <div className="p-3 rounded-xl bg-blue-500/10 border border-blue-500/30 text-center">
                                <p className="text-xs text-slate-500 mb-1">Space Complexity</p>
                                <p className="text-2xl font-bold text-blue-300 font-mono">{result.complexity.space}</p>
                              </div>
                            </div>
                            {result.complexity.bestCase && (
                              <div className="grid grid-cols-3 gap-2">
                                {[
                                  { label: "Best Case", val: result.complexity.bestCase, color: "text-green-400" },
                                  { label: "Average", val: result.complexity.averageCase, color: "text-yellow-400" },
                                  { label: "Worst Case", val: result.complexity.worstCase, color: "text-red-400" },
                                ].map((c) => c.val ? (
                                  <div key={c.label} className="p-2 rounded-lg bg-slate-800/60 text-center">
                                    <p className="text-[10px] text-slate-500">{c.label}</p>
                                    <p className={`text-sm font-mono font-bold ${c.color}`}>{c.val}</p>
                                  </div>
                                ) : null)}
                              </div>
                            )}
                            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
                              <p className="text-xs text-slate-400 font-semibold mb-1">⏱ Time Explanation:</p>
                              <p className="text-sm text-slate-300">{result.complexity.timeExplanation}</p>
                            </div>
                            <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
                              <p className="text-xs text-slate-400 font-semibold mb-1">💾 Space Explanation:</p>
                              <p className="text-sm text-slate-300">{result.complexity.spaceExplanation}</p>
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}

                    {/* EXAM SCORE */}
                    {activeTab === "exam" && (
                      <motion.div key="exam" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                        {!result.examScore ? (
                          <div className="text-slate-500 text-sm text-center py-6">No exam score available.</div>
                        ) : (
                          <div className="space-y-4">
                            <div className="flex items-center justify-center">
                              <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ type: "spring", delay: 0.1 }}
                                className="relative w-32 h-32"
                              >
                                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                                  <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(99,102,241,0.2)" strokeWidth="8" />
                                  <motion.circle
                                    cx="50" cy="50" r="40" fill="none"
                                    stroke="url(#grad)" strokeWidth="8"
                                    strokeLinecap="round"
                                    strokeDasharray={`${2 * Math.PI * 40}`}
                                    initial={{ strokeDashoffset: 2 * Math.PI * 40 }}
                                    animate={{
                                      strokeDashoffset: 2 * Math.PI * 40 * (1 - result.examScore.score / result.examScore.maxScore)
                                    }}
                                    transition={{ duration: 1, ease: "easeOut", delay: 0.3 }}
                                  />
                                  <defs>
                                    <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
                                      <stop offset="0%" stopColor="#6366f1" />
                                      <stop offset="100%" stopColor="#06b6d4" />
                                    </linearGradient>
                                  </defs>
                                </svg>
                                <div className="absolute inset-0 flex flex-col items-center justify-center">
                                  <span className="text-2xl font-bold text-white">{result.examScore.score}</span>
                                  <span className="text-xs text-slate-400">/ {result.examScore.maxScore}</span>
                                </div>
                              </motion.div>
                            </div>
                            <p className="text-center text-slate-400 text-xs">If submitted in exam</p>

                            <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                              <p className="text-sm text-indigo-300">{result.examScore.feedback}</p>
                            </div>

                            {result.examScore.deductions?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-red-400 mb-2">❌ Deductions:</p>
                                <div className="space-y-1">
                                  {result.examScore.deductions.map((d, i) => (
                                    <div key={i} className="flex items-center justify-between text-xs p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                                      <span className="text-slate-300">{d.reason}</span>
                                      <span className="text-red-400 font-mono">-{d.marks}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {result.examScore.positives?.length > 0 && (
                              <div>
                                <p className="text-xs font-semibold text-green-400 mb-2">✅ Positives:</p>
                                <div className="space-y-1">
                                  {result.examScore.positives.map((p, i) => (
                                    <div key={i} className="text-xs p-2 rounded-lg bg-green-500/10 border border-green-500/20 text-green-300">
                                      {p}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Action buttons */}
                {result && (
                  <div className="p-4 border-t border-slate-700/60 flex gap-3">
                    <button
                      onClick={copyFixed}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-green-500/20 text-green-400 text-sm hover:bg-green-500/30 transition-all"
                    >
                      <Copy size={14} />
                      Copy Fixed Code
                    </button>
                    <button
                      onClick={() => {
                        const ctx = `I analyzed this ${language.toUpperCase()} code and found: ${result.syntaxErrors.length} syntax error(s), ${result.logicalErrors.length} logical error(s). Complexity: ${result.complexity?.time || "N/A"}`;
                        toast.info("Opening DSA Buddy with analysis context…");
                      }}
                      className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-500/20 text-indigo-400 text-sm hover:bg-indigo-500/30 transition-all"
                    >
                      <MessageSquare size={14} />
                      Ask DSA Buddy
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}
