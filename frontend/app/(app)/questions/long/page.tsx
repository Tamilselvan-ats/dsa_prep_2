"use client";
// Long Answer Generator — 7M / 8M / 9M / 10M / 13M / 15M questions with structured model answers and AI evaluation

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Send, ChevronRight, RotateCcw, Zap, Brain,
  CheckCircle, AlertCircle, XCircle, BookOpen, Star,
  Lightbulb, TrendingUp, Award, Eye, EyeOff, Target
} from "lucide-react";
import { toast } from "sonner";
import { useAIStore } from "@/lib/stores/ai-store";
import { useProgressStore } from "@/lib/stores/progress-store";
import { generateQuestions, evaluateAnswer } from "@/lib/api";
import { ALL_TOPICS, DIFFICULTY_LEVELS } from "@/lib/constants";
import ReactMarkdown from "react-markdown";

// ── Types ──────────────────────────────────────────────────────────────────

type MarksType = "7" | "8" | "9" | "10" | "13" | "15";
type Phase = "setup" | "loading" | "practice" | "review" | "done";

interface LongModelAnswer {
  definition?: string;
  explanation?: string;
  algorithm?: string;
  example?: string;
  diagram?: string;
  complexityAnalysis?: string;
  conclusion?: string;
  raw?: string;
}

interface LongQuestion {
  question: string;
  modelAnswer: LongModelAnswer | string;
  marksDistribution?: Record<string, number>;
  examinerExpectedPoints: string[];
  keywords: string[];
  vivaQuestions?: string[];
  difficulty: string;
  marks: number;
  topic: string;
}

interface EvalResult {
  score: number;
  maxScore: number;
  pct: number;
  feedback: string;
  missed: string[];
  covered: string[];
  grade: string;
  examReadiness: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const MARKS_CONFIG: Record<MarksType, { label: string; color: string; bg: string; time: string; sections: number }> = {
  "7":  { label: "7 Marks",  color: "text-cyan-400",    bg: "bg-cyan-500/10 border-cyan-500/30",    time: "10-12 min", sections: 3 },
  "8":  { label: "8 Marks",  color: "text-blue-400",    bg: "bg-blue-500/10 border-blue-500/30",    time: "12-15 min", sections: 4 },
  "9":  { label: "9 Marks",  color: "text-indigo-400",  bg: "bg-indigo-500/10 border-indigo-500/30",time: "14-16 min", sections: 4 },
  "10": { label: "10 Marks", color: "text-purple-400",  bg: "bg-purple-500/10 border-purple-500/30",time: "15-18 min", sections: 5 },
  "13": { label: "13 Marks", color: "text-pink-400",    bg: "bg-pink-500/10 border-pink-500/30",    time: "18-22 min", sections: 6 },
  "15": { label: "15 Marks", color: "text-rose-400",    bg: "bg-rose-500/10 border-rose-500/30",    time: "22-25 min", sections: 7 },
};

function getGradeFromPct(pct: number): { grade: string; color: string; msg: string } {
  if (pct >= 90) return { grade: "O",  color: "text-yellow-400", msg: "Outstanding! Exam topper level." };
  if (pct >= 75) return { grade: "A+", color: "text-green-400",  msg: "Excellent! Secure this topic." };
  if (pct >= 60) return { grade: "A",  color: "text-blue-400",   msg: "Good. Minor improvements needed." };
  if (pct >= 50) return { grade: "B",  color: "text-cyan-400",   msg: "Average. Practice more." };
  if (pct >= 35) return { grade: "C",  color: "text-orange-400", msg: "Below average. Revise thoroughly." };
  return                { grade: "F",  color: "text-red-400",    msg: "Needs complete revision." };
}

function formatModelAnswer(ma: LongModelAnswer | string): React.ReactNode {
  if (typeof ma === "string") {
    return <ReactMarkdown className="text-sm text-slate-300 leading-relaxed">{ma}</ReactMarkdown>;
  }

  const sections: { key: string; label: string; icon: string; content: string }[] = [
    { key: "definition",        label: "Definition",         icon: "📖", content: ma.definition || "" },
    { key: "explanation",       label: "Explanation",        icon: "💡", content: ma.explanation || "" },
    { key: "algorithm",         label: "Algorithm",          icon: "⚙️", content: ma.algorithm || "" },
    { key: "example",           label: "Worked Example",     icon: "🔢", content: ma.example || "" },
    { key: "diagram",           label: "Diagram Description",icon: "📊", content: ma.diagram || "" },
    { key: "complexityAnalysis",label: "Complexity Analysis",icon: "📈", content: ma.complexityAnalysis || "" },
    { key: "conclusion",        label: "Conclusion",         icon: "✅", content: ma.conclusion || "" },
  ].filter(s => s.content.trim());

  if (sections.length === 0 && ma.raw) {
    return <ReactMarkdown className="text-sm text-slate-300 leading-relaxed">{ma.raw}</ReactMarkdown>;
  }

  return (
    <div className="space-y-4">
      {sections.map(s => (
        <div key={s.key} className="bg-slate-800/40 rounded-xl p-4">
          <div className="text-xs font-semibold text-indigo-400 mb-2 flex items-center gap-1.5">
            <span>{s.icon}</span> {s.label}
          </div>
          <div className="text-sm text-slate-300 leading-relaxed prose prose-invert prose-sm max-w-none">
            <ReactMarkdown>{s.content}</ReactMarkdown>
          </div>
        </div>
      ))}
    </div>
  );
}

// Fallback long questions for each topic
function getFallbackLong(topic: string, marks: number): LongQuestion[] {
  return [
    {
      question: `Explain ${topic} in detail with algorithm, working mechanism, an example trace, and time/space complexity analysis.`,
      modelAnswer: {
        definition: `${topic} is a fundamental data structure concept in DSA. It is used for organizing and processing data efficiently.`,
        explanation: `The working principle involves organized data management. The key operations include insertion, deletion, and searching, each with specific algorithms.`,
        algorithm: `Step 1: Initialize the data structure.\nStep 2: Perform the required operation (insert/delete/search).\nStep 3: Update pointers or indices as needed.\nStep 4: Return the result.\nStep 5: Handle edge cases (empty, full, not found).`,
        example: `Consider an example with values: 10, 20, 30, 40, 50.\nTrace through each step showing state changes.`,
        diagram: `Draw a diagram showing the structure before and after the operation with arrows indicating data flow.`,
        complexityAnalysis: `Time Complexity: O(1) for basic operations, O(n) for search in worst case.\nSpace Complexity: O(n) where n is the number of elements.`,
        conclusion: `${topic} is essential for efficient algorithm design. Understanding its operations and complexity is crucial for university examinations.`,
      },
      marksDistribution: { definition: 2, explanation: 3, example: marks - 7, complexity: 2 },
      examinerExpectedPoints: [
        "Clear definition with correct terminology",
        "Step-by-step algorithm",
        "Working example with trace",
        "Time and space complexity",
        "Diagram (if applicable)",
      ],
      keywords: [topic.toLowerCase(), "algorithm", "complexity", "operations"],
      vivaQuestions: [`What is the time complexity of ${topic} operations?`, `When would you use ${topic}?`],
      difficulty: "medium",
      marks,
      topic,
    },
    {
      question: `Compare and contrast two variants of ${topic}. Discuss advantages, disadvantages, and when to use each. Support with examples.`,
      modelAnswer: {
        explanation: `Both variants of ${topic} serve similar purposes but differ in implementation and performance characteristics.`,
        example: `Scenario 1: Use variant A when memory is limited and sequential access is acceptable.\nScenario 2: Use variant B when random access is needed frequently.`,
        complexityAnalysis: `Variant A: Time O(n), Space O(1) extra.\nVariant B: Time O(1) amortized, Space O(n).`,
        conclusion: `Choose based on the specific use case: memory constraints, access patterns, and frequency of operations.`,
      },
      examinerExpectedPoints: ["Clear comparison table", "Advantages/disadvantages", "Use cases", "Examples", "Performance analysis"],
      keywords: ["comparison", "trade-off", "advantages", "disadvantages"],
      difficulty: "medium",
      marks,
      topic,
    },
  ];
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function LongAnswerPage() {
  const { settings } = useAIStore();
  const { addXP, updateTopicMastery } = useProgressStore();

  // Config
  const [selectedTopic, setSelectedTopic] = useState(ALL_TOPICS[0].id);
  const [marks, setMarks] = useState<MarksType>("8");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(3);

  // Session state
  const [phase, setPhase] = useState<Phase>("setup");
  const [questions, setQuestions] = useState<LongQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<EvalResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [showModel, setShowModel] = useState(false);
  const [results, setResults] = useState<EvalResult[]>([]);
  const [wordCount, setWordCount] = useState(0);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const topicName = ALL_TOPICS.find(t => t.id === selectedTopic)?.name || selectedTopic;
  const current = questions[currentIdx];
  const marksConfig = MARKS_CONFIG[marks];

  const handleAnswerChange = (val: string) => {
    setUserAnswer(val);
    setWordCount(val.trim() ? val.trim().split(/\s+/).length : 0);
  };

  // ── Generate ───────────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setPhase("loading");
    try {
      const raw = await generateQuestions({
        topicName, difficulty, type: `long_${marks}`, count, settings,
      });

      let parsed: LongQuestion[] = [];
      if (Array.isArray(raw)) {
        parsed = raw.map((q: any) => ({
          question: q.question || q.text || "",
          modelAnswer: q.modelAnswer || q.answer || q.model_answer || "",
          marksDistribution: q.marksDistribution || q.marks_distribution || {},
          examinerExpectedPoints: q.examinerExpectedPoints || q.keyPoints || q.key_points || [],
          keywords: q.keywords || [],
          vivaQuestions: q.vivaQuestions || [],
          difficulty,
          marks: parseInt(marks),
          topic: topicName,
        })).filter((q: LongQuestion) => q.question.length > 10);
      }

      if (parsed.length === 0) {
        parsed = getFallbackLong(topicName, parseInt(marks));
        toast.warning("Using practice questions (AI unavailable)");
      }

      setQuestions(parsed);
      setCurrentIdx(0);
      setUserAnswer("");
      setEvaluation(null);
      setResults([]);
      setShowModel(false);
      setPhase("practice");
    } catch {
      const fallback = getFallbackLong(topicName, parseInt(marks));
      setQuestions(fallback);
      setCurrentIdx(0);
      setPhase("practice");
      toast.warning("Using practice questions");
    }
  };

  // ── Evaluate ───────────────────────────────────────────────────────────────

  const handleEvaluate = async () => {
    if (userAnswer.trim().length < 20) {
      toast.error("Write a more complete answer (at least 20 words)");
      return;
    }
    setEvaluating(true);
    try {
      const result = await evaluateAnswer({
        question: current.question,
        studentAnswer: userAnswer,
        maxMarks: current.marks,
        settings,
      });

      const score = result.marksAwarded ?? result.score ?? 0;
      const pct = Math.round((score / current.marks) * 100);
      const { grade, color: _, msg } = getGradeFromPct(pct);

      const eval_: EvalResult = {
        score: Math.min(score, current.marks),
        maxScore: current.marks,
        pct,
        feedback: result.examinerFeedback || result.feedback || "Answer evaluated.",
        missed: result.missingPoints || result.missed || [],
        covered: result.importantPointsCovered || result.covered || [],
        grade,
        examReadiness: result.examReadiness || "Needs More Practice",
      };

      setEvaluation(eval_);
      addXP(Math.round(eval_.score * 8), "Long Answer");
      updateTopicMastery(selectedTopic, {
        practiceCount: 1,
        correctCount: pct >= 60 ? 1 : 0,
        mockTestScore: pct,
      });

      if (pct >= 75) toast.success(`+${Math.round(eval_.score * 8)} XP! Grade ${grade} 🎯`);
    } catch {
      // Keyword-based fallback
      const kw = current.examinerExpectedPoints || [];
      const matched = kw.filter(k => userAnswer.toLowerCase().includes(k.toLowerCase().split(" ")[0]));
      const score = Math.round((matched.length / Math.max(kw.length, 1)) * current.marks);
      const pct = Math.round((score / current.marks) * 100);
      const { grade } = getGradeFromPct(pct);

      const eval_: EvalResult = {
        score, maxScore: current.marks, pct,
        feedback: `Your answer covered ${matched.length} of ${kw.length} expected points.`,
        missed: kw.filter(k => !matched.includes(k)),
        covered: matched,
        grade,
        examReadiness: pct >= 60 ? "Almost Ready" : "Needs More Practice",
      };
      setEvaluation(eval_);
      addXP(score * 5, "Long Answer");
    } finally {
      setEvaluating(false);
    }
  };

  // ── Next / Finish ──────────────────────────────────────────────────────────

  const handleNext = () => {
    if (evaluation) setResults(prev => [...prev, evaluation]);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(c => c + 1);
      setUserAnswer("");
      setEvaluation(null);
      setShowModel(false);
      setWordCount(0);
      textareaRef.current?.focus();
    } else {
      if (evaluation) setResults(prev => [...prev, evaluation]);
      setPhase("done");
    }
  };

  const handleReset = () => {
    setPhase("setup");
    setQuestions([]);
    setCurrentIdx(0);
    setUserAnswer("");
    setEvaluation(null);
    setResults([]);
    setShowModel(false);
    setWordCount(0);
  };

  // ── Render: Setup ──────────────────────────────────────────────────────────

  if (phase === "setup") {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="text-5xl mb-3">📜</div>
            <h1 className="text-2xl font-bold gradient-text">Long Answer Practice</h1>
            <p className="text-slate-400 text-sm mt-1">7M / 8M / 9M / 10M / 13M / 15M questions with structured model answers and AI evaluation</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-6">
            {/* Topic */}
            <div>
              <label className="text-sm font-semibold text-slate-300 mb-2 block">Topic</label>
              <select
                value={selectedTopic}
                onChange={e => setSelectedTopic(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-200 text-sm focus:outline-none focus:border-indigo-500/50"
              >
                {ALL_TOPICS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            {/* Marks Selection */}
            <div>
              <label className="text-sm font-semibold text-slate-300 mb-3 block">Question Type (Marks)</label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.entries(MARKS_CONFIG) as [MarksType, typeof MARKS_CONFIG[MarksType]][]).map(([m, cfg]) => (
                  <button
                    key={m}
                    onClick={() => setMarks(m)}
                    className={`p-3 rounded-xl border text-center transition-all ${marks === m ? cfg.bg : "bg-slate-800/40 border-slate-700/40 hover:border-slate-600/40"}`}
                  >
                    <div className={`text-sm font-bold ${marks === m ? cfg.color : "text-slate-400"}`}>{cfg.label}</div>
                    <div className="text-xs text-slate-600 mt-0.5">{cfg.time}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <label className="text-sm font-semibold text-slate-300 mb-2 block">Difficulty</label>
              <div className="flex gap-2 flex-wrap">
                {DIFFICULTY_LEVELS.map(d => (
                  <button
                    key={d.value}
                    onClick={() => setDifficulty(d.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      difficulty === d.value ? `${d.bg} ${d.color} border-current` : "bg-slate-800/40 text-slate-500 border-slate-700/40"
                    }`}
                  >
                    {d.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Count */}
            <div>
              <label className="text-sm font-semibold text-slate-300 mb-2 block">Number of Questions</label>
              <div className="flex gap-2">
                {[1, 2, 3, 5].map(n => (
                  <button
                    key={n}
                    onClick={() => setCount(n)}
                    className={`px-5 py-2 rounded-lg text-sm font-medium border transition-all ${
                      count === n ? "bg-purple-500/20 text-purple-300 border-purple-500/40" : "bg-slate-800/40 text-slate-500 border-slate-700/40"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary + Generate */}
            <div className="bg-slate-800/40 rounded-xl p-4 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                <span className="text-slate-200 font-semibold">{count}</span> question{count > 1 ? "s" : ""} •{" "}
                <span className="text-slate-200 font-semibold">{marks}</span> marks each •{" "}
                <span className={`font-semibold ${marksConfig.color}`}>{marksConfig.time}</span> per question
              </div>
              <button
                onClick={handleGenerate}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-purple-500 transition-all"
              >
                <Zap className="w-4 h-4" /> Generate
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Loading ────────────────────────────────────────────────────────────────

  if (phase === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 font-medium">Generating {marks}-mark questions...</p>
          <p className="text-slate-600 text-sm mt-1">AI is crafting exam-quality long questions</p>
        </div>
      </div>
    );
  }

  // ── Practice ───────────────────────────────────────────────────────────────

  if (phase === "practice" && current) {
    const isAnswered = !!evaluation;
    const progress = (currentIdx / questions.length) * 100;
    const targetWords = current.marks * 20; // ~20 words per mark as guide

    return (
      <div className="min-h-screen p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">📜</span>
              <div>
                <div className="text-sm font-semibold text-slate-200">Long Answer Practice</div>
                <div className={`text-xs ${marksConfig.color}`}>{marksConfig.label} — {current.topic}</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-center">
                <div className="text-xs text-slate-500">Q {currentIdx + 1}/{questions.length}</div>
                <div className="text-sm font-bold text-slate-300">{marksConfig.time}</div>
              </div>
              <button onClick={handleReset} className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1 border border-slate-700/50 rounded-lg">
                Exit
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Question Panel */}
            <div className="lg:col-span-2 space-y-4">
              {/* Question Card */}
              <motion.div
                key={currentIdx}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-card p-6"
              >
                <div className="flex items-start gap-3 mb-5">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold shrink-0 border ${marksConfig.bg} ${marksConfig.color}`}>
                    Q{currentIdx + 1}
                  </div>
                  <div>
                    <p className="text-slate-100 font-medium leading-relaxed">{current.question}</p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`text-xs px-2 py-0.5 rounded-full border ${marksConfig.bg} ${marksConfig.color}`}>
                        {current.marks} Marks
                      </span>
                      <span className="text-xs text-slate-500">≈ {targetWords} words recommended</span>
                    </div>
                  </div>
                </div>

                {/* Writing Area */}
                {!isAnswered ? (
                  <div className="space-y-3">
                    <textarea
                      ref={textareaRef}
                      value={userAnswer}
                      onChange={e => handleAnswerChange(e.target.value)}
                      placeholder={`Write your ${current.marks}-mark answer here.\n\nTip: Structure your answer:\n• Definition / Introduction\n• Working Mechanism / Algorithm\n• Example with step-by-step trace\n• Complexity Analysis\n• Conclusion`}
                      rows={12}
                      className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 text-slate-200 text-sm placeholder-slate-700 focus:outline-none focus:border-indigo-500/50 resize-none leading-relaxed"
                    />
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3 text-xs">
                        <span className={`${wordCount >= targetWords ? "text-green-400" : wordCount >= targetWords * 0.5 ? "text-yellow-400" : "text-slate-500"}`}>
                          {wordCount} / ~{targetWords} words
                        </span>
                        <div className="h-1.5 w-24 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${wordCount >= targetWords ? "bg-green-500" : wordCount >= targetWords * 0.5 ? "bg-yellow-500" : "bg-indigo-500"}`}
                            style={{ width: `${Math.min((wordCount / targetWords) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                      <button
                        onClick={handleEvaluate}
                        disabled={evaluating || userAnswer.trim().split(/\s+/).length < 10}
                        className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
                      >
                        {evaluating ? (
                          <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Evaluating...</>
                        ) : (
                          <><Send className="w-4 h-4" /> Submit & Evaluate</>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Evaluation Results */
                  <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
                    {/* Score */}
                    <div className={`p-4 rounded-xl border flex items-center gap-4 ${
                      evaluation.pct >= 75 ? "bg-green-500/10 border-green-500/30" :
                      evaluation.pct >= 50 ? "bg-yellow-500/10 border-yellow-500/30" :
                      "bg-red-500/10 border-red-500/30"
                    }`}>
                      <div className="text-center">
                        <div className={`text-3xl font-black ${evaluation.pct >= 75 ? "text-green-400" : evaluation.pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                          {evaluation.score}/{evaluation.maxScore}
                        </div>
                        <div className="text-xs text-slate-500">marks</div>
                      </div>
                      <div>
                        <div className={`font-bold text-lg ${getGradeFromPct(evaluation.pct).color}`}>
                          Grade {evaluation.grade} — {evaluation.pct}%
                        </div>
                        <div className="text-sm text-slate-400">{evaluation.examReadiness}</div>
                      </div>
                    </div>

                    {/* Feedback */}
                    <div className="bg-slate-800/50 rounded-xl p-4">
                      <div className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5" /> Examiner Feedback
                      </div>
                      <p className="text-sm text-slate-300 leading-relaxed">{evaluation.feedback}</p>
                    </div>

                    {/* Points covered / missed */}
                    <div className="grid grid-cols-2 gap-3">
                      {evaluation.covered.length > 0 && (
                        <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                          <div className="text-xs font-semibold text-green-400 mb-2 flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> Covered
                          </div>
                          <ul className="space-y-1">
                            {evaluation.covered.map((p, i) => (
                              <li key={i} className="text-xs text-green-200 flex items-start gap-1.5">
                                <span className="text-green-500 mt-0.5">•</span> {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                      {evaluation.missed.length > 0 && (
                        <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                          <div className="text-xs font-semibold text-red-400 mb-2 flex items-center gap-1">
                            <AlertCircle className="w-3 h-3" /> Missed
                          </div>
                          <ul className="space-y-1">
                            {evaluation.missed.map((p, i) => (
                              <li key={i} className="text-xs text-red-200 flex items-start gap-1.5">
                                <span className="text-red-500 mt-0.5">•</span> {p}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>

                    {/* Model Answer toggle */}
                    <button
                      onClick={() => setShowModel(!showModel)}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-indigo-500/30 text-indigo-400 text-sm font-medium hover:bg-indigo-500/10 transition-all"
                    >
                      {showModel ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      {showModel ? "Hide Model Answer" : "View Model Answer"}
                    </button>

                    {/* Next */}
                    <button onClick={handleNext}
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold"
                    >
                      {currentIdx < questions.length - 1 ? <><ChevronRight className="w-4 h-4" /> Next Question</> : <><Award className="w-4 h-4" /> View Results</>}
                    </button>
                  </motion.div>
                )}
              </motion.div>

              {/* Model Answer (shown after evaluation) */}
              <AnimatePresence>
                {showModel && current && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    className="glass-card p-6"
                  >
                    <div className="flex items-center gap-2 mb-4">
                      <BookOpen className="w-5 h-5 text-indigo-400" />
                      <h3 className="font-semibold text-slate-200">Model Answer — {current.marks} Marks</h3>
                    </div>
                    {formatModelAnswer(current.modelAnswer)}

                    {/* Marks Distribution */}
                    {current.marksDistribution && Object.keys(current.marksDistribution).length > 0 && (
                      <div className="mt-4 p-3 bg-slate-800/40 rounded-xl">
                        <div className="text-xs font-semibold text-slate-400 mb-2">Marks Distribution (Examiner Scheme)</div>
                        <div className="flex flex-wrap gap-2">
                          {Object.entries(current.marksDistribution).map(([key, val]) => (
                            <span key={key} className="px-2 py-1 bg-indigo-500/10 text-indigo-300 text-xs rounded-lg border border-indigo-500/20">
                              {key}: {val}M
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Sidebar */}
            <div className="space-y-4">
              {/* Writing Guide */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Lightbulb className="w-4 h-4 text-yellow-400" />
                  <h3 className="text-sm font-semibold text-slate-300">Writing Guide</h3>
                </div>
                <div className="space-y-2 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold shrink-0">1</span>
                    Definition (1-2 marks)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold shrink-0">2</span>
                    Explanation/Working
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold shrink-0">3</span>
                    Algorithm (step-by-step)
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-green-500/20 text-green-400 flex items-center justify-center font-bold shrink-0">4</span>
                    Example with trace
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold shrink-0">5</span>
                    Diagram description
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center font-bold shrink-0">6</span>
                    Complexity Analysis
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded-full bg-pink-500/20 text-pink-400 flex items-center justify-center font-bold shrink-0">7</span>
                    Conclusion
                  </div>
                </div>
              </div>

              {/* Expected Points */}
              <div className="glass-card p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Target className="w-4 h-4 text-cyan-400" />
                  <h3 className="text-sm font-semibold text-slate-300">Examiner Expects</h3>
                </div>
                <div className="space-y-1.5">
                  {current.examinerExpectedPoints.map((pt, i) => (
                    <div key={i} className="flex items-start gap-2 text-xs text-slate-400">
                      <span className="text-cyan-500 mt-0.5 shrink-0">→</span>
                      {pt}
                    </div>
                  ))}
                </div>
              </div>

              {/* Keywords */}
              {current.keywords.length > 0 && (
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Star className="w-4 h-4 text-yellow-400" />
                    <h3 className="text-sm font-semibold text-slate-300">Key Terms</h3>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {current.keywords.map((kw, i) => (
                      <span key={i} className="px-2 py-0.5 bg-yellow-500/10 text-yellow-300 text-xs rounded-full border border-yellow-500/20">
                        {kw}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Viva Questions */}
              {current.vivaQuestions && current.vivaQuestions.length > 0 && (
                <div className="glass-card p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Brain className="w-4 h-4 text-purple-400" />
                    <h3 className="text-sm font-semibold text-slate-300">Follow-up Viva</h3>
                  </div>
                  <div className="space-y-1.5">
                    {current.vivaQuestions.slice(0, 3).map((q, i) => (
                      <div key={i} className="text-xs text-purple-300 bg-purple-500/5 rounded-lg px-3 py-2">
                        {q}
                      </div>
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

  // ── Done / Results ─────────────────────────────────────────────────────────

  if (phase === "done") {
    const allResults = evaluation ? [...results, evaluation] : results;
    const totalScore = allResults.reduce((s, r) => s + r.score, 0);
    const totalMax = allResults.reduce((s, r) => s + r.maxScore, 0);
    const pct = totalMax > 0 ? Math.round((totalScore / totalMax) * 100) : 0;
    const { grade, color, msg } = getGradeFromPct(pct);

    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto space-y-5">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 text-center">
            <div className="text-6xl mb-4">{pct >= 75 ? "🏆" : pct >= 50 ? "🌟" : "💪"}</div>
            <h2 className="text-xl font-bold text-slate-100 mb-1">Session Complete!</h2>
            <div className={`text-5xl font-black mt-3 ${pct >= 75 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
              {totalScore}/{totalMax}
            </div>
            <div className={`text-lg font-bold mt-1 ${color}`}>Grade {grade} — {pct}%</div>
            <div className="text-sm text-slate-500 mt-1">{msg}</div>
          </motion.div>

          {/* Per-Question Breakdown */}
          <div className="glass-card p-5">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> Question Breakdown
            </h3>
            <div className="space-y-3">
              {allResults.map((r, i) => (
                <div key={i} className="flex items-center gap-4 p-3 bg-slate-800/30 rounded-xl">
                  <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">
                    Q{i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-xs text-slate-400 mb-1">{questions[i]?.topic} — {questions[i]?.marks}M</div>
                    <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${r.pct >= 75 ? "bg-green-500" : r.pct >= 50 ? "bg-yellow-500" : "bg-red-500"}`}
                        style={{ width: `${r.pct}%` }}
                      />
                    </div>
                  </div>
                  <div className={`text-sm font-bold ${r.pct >= 75 ? "text-green-400" : r.pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>
                    {r.score}/{r.maxScore}
                  </div>
                  <div className={`text-sm font-bold ${getGradeFromPct(r.pct).color}`}>
                    {r.grade}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button onClick={handleReset} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 font-semibold">
              <RotateCcw className="w-4 h-4" /> New Session
            </button>
            <button onClick={handleGenerate} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold">
              <Zap className="w-4 h-4" /> More Questions
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
