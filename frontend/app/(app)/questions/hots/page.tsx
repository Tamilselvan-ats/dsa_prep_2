"use client";
// HOTS — Higher Order Thinking Skills Questions
// Tests: Analysis, Evaluation, Design, Synthesis, Optimization

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Lightbulb, Brain, ChevronRight, RotateCcw, Zap, Send,
  Eye, EyeOff, TrendingUp, Target, Award, Flame, Star,
  Layers, ArrowRight, CheckCircle, AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { useAIStore } from "@/lib/stores/ai-store";
import { useProgressStore } from "@/lib/stores/progress-store";
import { generateQuestions, evaluateAnswer } from "@/lib/api";
import { ALL_TOPICS } from "@/lib/constants";
import ReactMarkdown from "react-markdown";

// ── Types ──────────────────────────────────────────────────────────────────

type Phase = "setup" | "loading" | "practice" | "done";
type HOTSType = "compare" | "analyze" | "design" | "evaluate" | "optimize" | "mixed";

interface HOTSQuestion {
  question: string;
  questionType: string;
  modelAnswer: string;
  reasoning: string;
  keyInsights: string[];
  relatedConcepts: string[];
  difficulty: string;
  topic: string;
  bloomsLevel: string;
}

interface EvalResult {
  score: number;
  maxScore: number;
  pct: number;
  feedback: string;
  grade: string;
  analyticalDepth: string;
}

// ── Config ─────────────────────────────────────────────────────────────────

const HOTS_TYPES: Record<HOTSType, { label: string; icon: string; color: string; bg: string; desc: string; bloom: string }> = {
  compare:  { label: "Compare",  icon: "⚖️",  color: "text-cyan-400",   bg: "bg-cyan-500/10 border-cyan-500/30",   desc: "Compare and contrast concepts/implementations", bloom: "Analysis" },
  analyze:  { label: "Analyze",  icon: "🔬",  color: "text-blue-400",   bg: "bg-blue-500/10 border-blue-500/30",   desc: "Analyze algorithms, trace edge cases, complexity", bloom: "Analysis" },
  design:   { label: "Design",   icon: "🏗️", color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30",desc: "Design solutions, choose data structures", bloom: "Synthesis" },
  evaluate: { label: "Evaluate", icon: "🎯",  color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30",desc: "Evaluate trade-offs, justify decisions", bloom: "Evaluation" },
  optimize: { label: "Optimize", icon: "⚡",  color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30",desc: "Optimize algorithms, reduce complexity", bloom: "Synthesis" },
  mixed:    { label: "Mixed",    icon: "🌀",  color: "text-pink-400",   bg: "bg-pink-500/10 border-pink-500/30",   desc: "Variety of all HOTS types", bloom: "All Levels" },
};

function getGrade(pct: number) {
  if (pct >= 85) return { grade: "O",  color: "text-yellow-400", label: "Outstanding" };
  if (pct >= 70) return { grade: "A+", color: "text-green-400",  label: "Excellent" };
  if (pct >= 55) return { grade: "A",  color: "text-blue-400",   label: "Good" };
  if (pct >= 40) return { grade: "B",  color: "text-cyan-400",   label: "Average" };
  return               { grade: "F",  color: "text-red-400",    label: "Needs Revision" };
}

// Fallback HOTS questions pool
function getFallbackHOTS(topics: string[], type: HOTSType, count: number): HOTSQuestion[] {
  const topicStr = topics.join(", ");
  const pool: HOTSQuestion[] = [
    {
      question: "Compare Stack and Queue data structures. When would you choose a Stack over a Queue in real-world applications? Justify your answer with examples from operating systems.",
      questionType: "Compare", bloomsLevel: "Analysis",
      modelAnswer: "Stack (LIFO) is used when the last operation must be undone first — e.g., function call stack, undo operations in editors, browser back button, expression evaluation. Queue (FIFO) is used when order must be preserved — e.g., printer queues, OS process scheduling, BFS traversal, network packet handling. Choose Stack when: recursion is involved, backtracking needed, balanced bracket checking. Choose Queue when: order of arrival matters, breadth-first processing needed.",
      reasoning: "Compare principle (LIFO vs FIFO), operations, memory usage, and real-world applicability. Consider time complexity O(1) for both, but different use cases.",
      keyInsights: ["LIFO vs FIFO fundamental difference", "Call stack uses stack structure", "BFS uses queue", "Both O(1) amortized for key operations"],
      relatedConcepts: ["Recursion", "BFS/DFS", "Process Scheduling", "Memory Management"],
      difficulty: "hard", topic: topicStr,
    },
    {
      question: "A company needs to implement an undo-redo feature for their text editor. Which data structure would you use? Design the complete solution with operations and explain the trade-offs.",
      questionType: "Design", bloomsLevel: "Synthesis",
      modelAnswer: "Use TWO stacks: undoStack and redoStack. Write: push to undoStack, clear redoStack. Undo: pop from undoStack → push to redoStack, restore previous state. Redo: pop from redoStack → push to undoStack, apply state. Trade-offs: Memory O(n) for n operations vs. linked list; stack gives O(1) undo/redo vs linear scan. Limitation: branching history not supported (use tree instead). Enhancement: limit stack size to bound memory.",
      reasoning: "Design requires combining data structures creatively. Two stacks solve this elegantly. Consider operations, complexity, and limitations.",
      keyInsights: ["Two-stack approach for undo/redo", "O(1) time for each operation", "Memory grows linearly with operations", "Cannot support branching history"],
      relatedConcepts: ["Stack ADT", "Memory Management", "Command Pattern"],
      difficulty: "hard", topic: "Stack ADT",
    },
    {
      question: "Analyze the time complexity of AVL tree insertion vs BST insertion in worst case. Why is AVL tree preferred despite higher constant factor?",
      questionType: "Analyze", bloomsLevel: "Analysis",
      modelAnswer: "BST Insertion Worst Case: O(n) — when tree is completely skewed (sorted input), becomes a linked list. AVL Insertion Worst Case: O(log n) — always balanced, height ≤ 1.44 log₂(n+2). The constant factor overhead in AVL (checking balance factors, performing rotations) is bounded by O(1) extra per insertion. For n=1000: BST worst case 1000 comparisons vs AVL max ~15. Preferred for: search-intensive applications, database indexing, real-time systems needing guaranteed performance.",
      reasoning: "Compare empirically and theoretically. Consider amortized analysis and practical use cases.",
      keyInsights: ["BST degenerates to O(n) with sorted input", "AVL guarantees O(log n) always", "Rotation cost is O(1)", "Height bound: 1.44 log₂(n+2)"],
      relatedConcepts: ["BST", "AVL Tree", "Time Complexity", "Height-Balanced Trees"],
      difficulty: "expert", topic: "AVL Tree / BST",
    },
    {
      question: "Evaluate when to use Linear Probing vs Chaining for collision resolution. If your hash table has load factor > 0.8, which would you recommend and why?",
      questionType: "Evaluate", bloomsLevel: "Evaluation",
      modelAnswer: "At load factor α > 0.8: Choose Chaining. Reason: Linear Probing performance degrades severely — expected probes = ½(1 + 1/(1-α)²) → at α=0.8, ~13 probes on average (primary clustering). Chaining performance = 1 + α/2 = 1.4 probes average regardless of α. Linear Probing advantages: cache-friendly, no pointer overhead, works well at α < 0.5. Recommendation for α > 0.8: Chaining with separate lists OR rehash to larger table. Better: keep α < 0.7 by resizing proactively.",
      reasoning: "Mathematical analysis using load factor formulas. Consider cache behavior, memory, and clustering problems.",
      keyInsights: ["LP: 1/(2(1-α)²) expected probes", "Chaining: 1 + α/2 probes", "Primary clustering in LP", "Resizing keeps performance stable"],
      relatedConcepts: ["Hashing", "Load Factor", "Collision Resolution", "Memory Layout"],
      difficulty: "expert", topic: "Hashing / Collision",
    },
    {
      question: "Given that Tower of Hanoi with n disks requires 2ⁿ-1 moves, optimize the problem for large n using memoization. Analyze the time-space trade-off.",
      questionType: "Optimize", bloomsLevel: "Synthesis",
      modelAnswer: "Standard recursive TOH: T(n) = 2T(n-1)+1 → O(2ⁿ) time, O(n) space for call stack. Optimization: Since TOH is already optimal (2ⁿ-1 is the minimum), no algorithmic improvement exists. However, iterative implementation avoids stack overflow for large n using an explicit stack (O(n) extra space vs O(n) implicit). For n=64: 2⁶⁴-1 ≈ 1.8×10¹⁹ moves — practically impossible. Memoization doesn't help here — subproblems don't repeat (each state is unique). Real optimization: parallel processing for multiple pegs (Frame-Stewart algorithm for 4 pegs).",
      reasoning: "Critical thinking: not all problems can be optimized further. Understand when memoization helps vs when it doesn't.",
      keyInsights: ["TOH is already optimal at 2ⁿ-1", "Memoization inapplicable (no overlapping subproblems)", "Iterative avoids stack overflow", "Frame-Stewart for 4+ pegs"],
      relatedConcepts: ["Recursion", "Dynamic Programming", "Memoization", "Complexity Theory"],
      difficulty: "expert", topic: "Recursion",
    },
    {
      question: "Design a system to implement a hospital emergency room priority queue. Patients arrive with severity levels 1-5. Design the data structure, explain insertions/deletions, and analyze complexity.",
      questionType: "Design", bloomsLevel: "Synthesis",
      modelAnswer: "Use a Max-Heap Priority Queue. Patient = (severity, arrivalTime). Priority = severity (5 = critical). Ties broken by arrivalTime (earlier = higher priority). Operations: Enqueue(patient): Insert at end of heap, sift-up → O(log n). Dequeue: Extract max (root), replace with last, sift-down → O(log n). Peek: O(1). Space: O(n). Enhancement: If multiple severity levels needed, use 5 separate queues (one per level) for O(1) operations. Real consideration: age and waiting time must factor in (dynamic priority).",
      reasoning: "Real-world design requires balancing theory with practical constraints. Priority queue is natural choice; heap gives O(log n).",
      keyInsights: ["Max-heap for priority queue", "O(log n) enqueue/dequeue", "Tie-breaking on arrival time", "5-queue alternative for O(1)"],
      relatedConcepts: ["Priority Queue", "Heap", "Scheduling", "Real-world Design"],
      difficulty: "hard", topic: "Priority Queue",
    },
  ];

  const filtered = type === "mixed" ? pool : pool.filter(q => q.questionType.toLowerCase() === type);
  const result = filtered.length >= count ? filtered : pool;
  return result.slice(0, count);
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function HOTSPage() {
  const { settings } = useAIStore();
  const { addXP, updateTopicMastery } = useProgressStore();

  const [selectedTopics, setSelectedTopics] = useState<string[]>(["stack-adt", "bst", "avl-tree"]);
  const [hotsType, setHotsType] = useState<HOTSType>("mixed");
  const [count, setCount] = useState(3);

  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<HOTSQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<EvalResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [results, setResults] = useState<EvalResult[]>([]);

  const topicNames = selectedTopics.map(id => ALL_TOPICS.find(t => t.id === id)?.name || id);
  const current = questions[currentIdx];
  const typeConfig = HOTS_TYPES[hotsType];

  // ── Generate ───────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    if (selectedTopics.length === 0) { toast.error("Select at least one topic"); return; }
    setPhase("loading");

    try {
      const topicStr = topicNames.join(", ");
      const raw = await generateQuestions({
        topicName: topicStr,
        difficulty: "hard",
        type: "hots",
        count,
        settings,
      });

      let parsed: HOTSQuestion[] = [];
      if (Array.isArray(raw)) {
        parsed = raw.map((q: any) => ({
          question: q.question || q.text || "",
          questionType: q.questionType || hotsType,
          modelAnswer: q.modelAnswer || q.answer || "",
          reasoning: q.reasoning || "",
          keyInsights: q.keyInsights || q.insights || [],
          relatedConcepts: q.relatedConcepts || q.related || [],
          difficulty: q.difficulty || "hard",
          topic: topicStr,
          bloomsLevel: q.bloomsLevel || typeConfig.bloom,
        })).filter(q => q.question.length > 10);
      }

      if (parsed.length === 0) {
        parsed = getFallbackHOTS(topicNames, hotsType, count);
        toast.warning("Using practice HOTS questions");
      }

      setQuestions(parsed);
      setCurrentIdx(0);
      setUserAnswer("");
      setEvaluation(null);
      setResults([]);
      setShowModel(false);
      setPhase("practice");
    } catch {
      const fallback = getFallbackHOTS(topicNames, hotsType, count);
      setQuestions(fallback);
      setCurrentIdx(0);
      setPhase("practice");
      toast.warning("Using practice HOTS questions");
    }
  };

  // ── Evaluate ───────────────────────────────────────────────────────────────

  const handleEvaluate = async () => {
    if (userAnswer.trim().split(/\s+/).length < 15) {
      toast.error("HOTS questions require detailed analytical answers");
      return;
    }
    setEvaluating(true);
    try {
      const result = await evaluateAnswer({
        question: current.question,
        studentAnswer: userAnswer,
        maxMarks: 10,
        settings,
      });

      const score = result.marksAwarded ?? result.score ?? 0;
      const pct = Math.round((score / 10) * 100);
      const { grade } = getGrade(pct);

      const eval_: EvalResult = {
        score,
        maxScore: 10,
        pct,
        feedback: result.examinerFeedback || result.feedback || "Good attempt at higher-order thinking.",
        grade,
        analyticalDepth: pct >= 70 ? "Deep" : pct >= 50 ? "Moderate" : "Surface",
      };
      setEvaluation(eval_);
      addXP(score * 15, "HOTS");

      selectedTopics.forEach(id => {
        updateTopicMastery(id, { practiceCount: 1, correctCount: pct >= 60 ? 1 : 0 });
      });
    } catch {
      // Keyword fallback
      const kw = current.keyInsights || [];
      const matched = kw.filter(k => userAnswer.toLowerCase().includes(k.split(" ")[0].toLowerCase())).length;
      const score = Math.round((matched / Math.max(kw.length, 1)) * 10);
      const pct = score * 10;
      const { grade } = getGrade(pct);
      const eval_: EvalResult = {
        score, maxScore: 10, pct,
        feedback: `Your analytical response covered ${matched} of ${kw.length} key insights. HOTS questions require deeper analysis and justification.`,
        grade,
        analyticalDepth: pct >= 70 ? "Deep" : pct >= 50 ? "Moderate" : "Surface",
      };
      setEvaluation(eval_);
      addXP(score * 10, "HOTS");
    } finally {
      setEvaluating(false);
    }
  };

  const handleNext = () => {
    if (evaluation) setResults(prev => [...prev, evaluation]);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(c => c + 1);
      setUserAnswer("");
      setEvaluation(null);
      setShowModel(false);
    } else {
      setPhase("done");
    }
  };

  // ── Render: Setup ──────────────────────────────────────────────────────────

  if (phase === "setup") return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="text-5xl mb-3">🧠</div>
          <h1 className="text-2xl font-bold gradient-text">HOTS Practice</h1>
          <p className="text-slate-400 text-sm mt-1">Higher Order Thinking Skills — Analysis, Design, Evaluation, Synthesis</p>
          <div className="flex items-center justify-center gap-2 mt-2 flex-wrap">
            {["Bloom's Taxonomy", "Critical Thinking", "Design Problems", "Trade-off Analysis"].map(tag => (
              <span key={tag} className="text-xs px-2 py-0.5 bg-purple-500/10 text-purple-400 rounded-full border border-purple-500/20">{tag}</span>
            ))}
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-6">
          {/* Topics */}
          <div>
            <label className="text-sm font-semibold text-slate-300 mb-2 block">Topics (select multiple)</label>
            <div className="grid grid-cols-2 gap-2">
              {ALL_TOPICS.map(t => (
                <button key={t.id} onClick={() => setSelectedTopics(prev =>
                  prev.includes(t.id) ? prev.filter(id => id !== t.id) : [...prev, t.id]
                )} className={`text-left px-3 py-2 rounded-lg text-sm transition-all border ${
                  selectedTopics.includes(t.id)
                    ? "bg-purple-500/15 border-purple-500/40 text-purple-300"
                    : "bg-slate-800/40 border-slate-700/40 text-slate-500 hover:border-slate-600/40"
                }`}>
                  {t.name}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-1.5">
              <button onClick={() => setSelectedTopics(ALL_TOPICS.map(t => t.id))} className="text-xs text-purple-400">All</button>
              <span className="text-slate-700">|</span>
              <button onClick={() => setSelectedTopics([])} className="text-xs text-slate-500">Clear</button>
            </div>
          </div>

          {/* HOTS Type */}
          <div>
            <label className="text-sm font-semibold text-slate-300 mb-3 block">Question Type (Bloom&apos;s Taxonomy)</label>
            <div className="grid grid-cols-2 gap-2">
              {(Object.entries(HOTS_TYPES) as [HOTSType, typeof HOTS_TYPES[HOTSType]][]).map(([t, cfg]) => (
                <button key={t} onClick={() => setHotsType(t)}
                  className={`p-3 rounded-xl border text-left transition-all ${hotsType === t ? cfg.bg : "bg-slate-800/40 border-slate-700/40"}`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-lg">{cfg.icon}</span>
                    <span className={`text-sm font-semibold ${hotsType === t ? cfg.color : "text-slate-400"}`}>{cfg.label}</span>
                  </div>
                  <div className="text-xs text-slate-600">{cfg.desc}</div>
                  <div className={`text-xs mt-1 ${hotsType === t ? cfg.color : "text-slate-600"}`}>Bloom: {cfg.bloom}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Count */}
          <div>
            <label className="text-sm font-semibold text-slate-300 mb-2 block">Questions</label>
            <div className="flex gap-2">
              {[2, 3, 5].map(n => (
                <button key={n} onClick={() => setCount(n)} className={`px-5 py-2 rounded-lg text-sm font-medium border transition-all ${
                  count === n ? "bg-purple-500/20 text-purple-300 border-purple-500/40" : "bg-slate-800/40 text-slate-500 border-slate-700/40"
                }`}>{n}</button>
              ))}
            </div>
          </div>

          <button onClick={handleGenerate} disabled={selectedTopics.length === 0}
            className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50"
          >
            <Flame className="w-4 h-4" /> Start HOTS Practice
          </button>
        </motion.div>
      </div>
    </div>
  );

  if (phase === "loading") return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="text-5xl mb-4 animate-pulse">🧠</div>
        <div className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 font-medium">AI is crafting HOTS questions...</p>
        <p className="text-slate-600 text-sm mt-1">Generating analysis and design problems</p>
      </div>
    </div>
  );

  // ── Render: Practice ───────────────────────────────────────────────────────

  if (phase === "practice" && current) {
    const isAnswered = !!evaluation;

    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🧠</span>
              <div>
                <div className="text-sm font-semibold text-slate-200">HOTS Practice</div>
                <div className="text-xs text-purple-400">{current.questionType} — {current.bloomsLevel} Level</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm text-slate-400">Q {currentIdx + 1}/{questions.length}</span>
              <button onClick={() => setPhase("setup")} className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1 border border-slate-700/50 rounded-lg">Exit</button>
            </div>
          </div>

          {/* Progress */}
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
              animate={{ width: `${(currentIdx / questions.length) * 100}%` }} transition={{ duration: 0.5 }} />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Main Panel */}
            <div className="lg:col-span-2 space-y-4">
              <motion.div key={currentIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6">
                {/* Question Type Badge */}
                <div className="flex items-center gap-2 mb-4">
                  <span className={`px-3 py-1 rounded-full text-xs font-bold border ${HOTS_TYPES[hotsType].bg} ${HOTS_TYPES[hotsType].color}`}>
                    {HOTS_TYPES[hotsType].icon} {current.questionType} Question
                  </span>
                  <span className="text-xs text-slate-500">Bloom&apos;s: {current.bloomsLevel}</span>
                </div>

                <p className="text-slate-100 font-medium leading-relaxed mb-5">{current.question}</p>

                {!isAnswered ? (
                  <div className="space-y-3">
                    <textarea
                      value={userAnswer}
                      onChange={e => setUserAnswer(e.target.value)}
                      rows={10}
                      placeholder={`Write a detailed analytical response...\n\nFor ${current.questionType} questions, consider:\n• What are the key factors to compare/analyze/design?\n• What evidence supports your reasoning?\n• What are the trade-offs?\n• What would you recommend and why?`}
                      className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 text-slate-200 text-sm placeholder-slate-700 focus:outline-none focus:border-purple-500/50 resize-none leading-relaxed"
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-600">{userAnswer.trim().split(/\s+/).filter(Boolean).length} words — aim for 100+</span>
                      <button onClick={handleEvaluate} disabled={evaluating}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold text-sm hover:from-purple-500 hover:to-pink-500 transition-all disabled:opacity-50"
                      >
                        {evaluating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Evaluating...</> : <><Send className="w-4 h-4" /> Evaluate</>}
                      </button>
                    </div>
                  </div>
                ) : (
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {/* Score */}
                    <div className={`p-4 rounded-xl border flex items-center gap-4 ${
                      evaluation.pct >= 70 ? "bg-green-500/10 border-green-500/30" :
                      evaluation.pct >= 50 ? "bg-yellow-500/10 border-yellow-500/30" :
                      "bg-red-500/10 border-red-500/30"
                    }`}>
                      <div className="text-center">
                        <div className={`text-3xl font-black ${evaluation.pct >= 70 ? "text-green-400" : evaluation.pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                          {evaluation.score}/10
                        </div>
                        <div className="text-xs text-slate-500">marks</div>
                      </div>
                      <div>
                        <div className={`font-bold text-lg ${getGrade(evaluation.pct).color}`}>
                          Grade {evaluation.grade} — {evaluation.pct}%
                        </div>
                        <div className="text-sm text-slate-400">Analytical Depth: {evaluation.analyticalDepth}</div>
                      </div>
                    </div>

                    <div className="bg-slate-800/50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5" /> AI Evaluation
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{evaluation.feedback}</p>
                    </div>

                    <button onClick={() => setShowModel(!showModel)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-purple-500/30 text-purple-400 text-sm font-medium hover:bg-purple-500/10 transition-all"
                    >
                      {showModel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showModel ? "Hide Expert Answer" : "View Expert Analysis"}
                    </button>

                    <button onClick={handleNext}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold"
                    >
                      {currentIdx < questions.length - 1 ? <><ChevronRight className="w-4 h-4" /> Next HOTS</> : <><Award className="w-4 h-4" /> Results</>}
                    </button>
                  </motion.div>
                )}
              </motion.div>

              {/* Model Answer */}
              <AnimatePresence>
                {showModel && (
                  <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="glass-card p-6 overflow-hidden">
                    <div className="flex items-center gap-2 mb-4">
                      <Star className="w-5 h-5 text-yellow-400" />
                      <h3 className="font-semibold text-slate-200">Expert Analysis</h3>
                    </div>
                    <div className="text-sm text-slate-300 leading-relaxed prose prose-invert prose-sm max-w-none mb-4">
                      <ReactMarkdown>{current.modelAnswer}</ReactMarkdown>
                    </div>
                    {current.reasoning && (
                      <div className="bg-slate-800/40 rounded-xl p-4 mt-4">
                        <div className="text-xs font-semibold text-cyan-400 mb-2">Reasoning Process</div>
                        <div className="text-sm text-slate-400 leading-relaxed">
                          <ReactMarkdown>{current.reasoning}</ReactMarkdown>
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* HOTS Framework */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Layers className="w-4 h-4 text-purple-400" />
                  <h3 className="text-sm font-semibold text-slate-300">HOTS Framework</h3>
                </div>
                <div className="space-y-2 text-xs">
                  {["Define the problem clearly", "List all relevant factors", "Analyze each factor's impact", "Compare alternatives with evidence", "Make justified recommendation", "Acknowledge limitations"].map((tip, i) => (
                    <div key={i} className="flex items-start gap-2 text-slate-400">
                      <span className="text-purple-500 font-bold shrink-0">{i + 1}.</span> {tip}
                    </div>
                  ))}
                </div>
              </div>

              {/* Key Insights */}
              {current.keyInsights.length > 0 && (
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Lightbulb className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-sm font-semibold text-slate-300">Key Insights to Cover</h3>
                  </div>
                  <div className="space-y-2">
                    {current.keyInsights.map((insight, i) => (
                      <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                        <ArrowRight className="w-3 h-3 text-yellow-500 mt-0.5 shrink-0" />
                        {insight}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Related Concepts */}
              {current.relatedConcepts.length > 0 && (
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Target className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-semibold text-slate-300">Related Concepts</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {current.relatedConcepts.map((c, i) => (
                      <span key={i} className="px-2 py-0.5 bg-cyan-500/10 text-cyan-300 text-xs rounded-full border border-cyan-500/20">{c}</span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Done ───────────────────────────────────────────────────────────────────

  if (phase === "done") {
    const allResults = evaluation ? [...results, evaluation] : results;
    const total = allResults.reduce((s, r) => s + r.score, 0);
    const max = allResults.reduce((s, r) => s + r.maxScore, 0);
    const pct = max > 0 ? Math.round((total / max) * 100) : 0;
    const { grade, color, label } = getGrade(pct);

    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto space-y-5">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 text-center">
            <div className="text-6xl mb-4">{pct >= 75 ? "🧠" : pct >= 50 ? "💡" : "📚"}</div>
            <h2 className="text-xl font-bold text-slate-100">HOTS Session Complete!</h2>
            <div className={`text-5xl font-black mt-3 ${pct >= 70 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
              {total}/{max}
            </div>
            <div className={`text-lg font-bold mt-1 ${color}`}>Grade {grade} — {label}</div>
            <div className="text-sm text-slate-500 mt-1">
              {pct >= 70 ? "Excellent critical thinking! You can tackle HOTS exam questions." :
               pct >= 50 ? "Good analytical skills. Practice more complex design problems." :
               "HOTS requires deep understanding. Review concepts and think about trade-offs."}
            </div>
          </motion.div>

          <div className="glass-card p-5">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-400" /> Analytical Performance
            </h3>
            <div className="space-y-3">
              {allResults.map((r, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-slate-800/30 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 text-xs font-bold flex items-center justify-center shrink-0">Q{i+1}</div>
                  <div className="flex-1">
                    <div className="text-xs text-slate-500 mb-1">{questions[i]?.questionType} — {questions[i]?.bloomsLevel}</div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full ${r.pct >= 70 ? "bg-green-500" : r.pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${r.pct}%` }} />
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${r.pct >= 70 ? "text-green-400" : r.pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>{r.score}/{r.maxScore}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={() => { setPhase("setup"); setQuestions([]); setResults([]); }}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 font-semibold"
            >
              <RotateCcw className="w-4 h-4" /> New Session
            </button>
            <button onClick={handleGenerate}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold"
            >
              <Flame className="w-4 h-4" /> More HOTS
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
