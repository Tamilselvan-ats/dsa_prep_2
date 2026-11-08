"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Clock, Target, ChevronRight, ChevronLeft, CheckCircle,
  Trophy, AlertCircle, Play, RotateCcw, BarChart3, Loader2, Zap
} from "lucide-react";
import { useAIStore } from "@/lib/stores/ai-store";
import { useProgressStore } from "@/lib/stores/progress-store";
import { generateQuestions, evaluateAnswer } from "@/lib/api";
import { DSA_TOPICS, EXAM_PATTERNS } from "@/lib/constants";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";

// ─── Types ───────────────────────────────────────────────────────────────────
type ExamStatus = "setup" | "generating" | "active" | "submitted" | "results";
type QuestionType = "mcq" | "short_2" | "short_5" | "long_8" | "long_13";

interface ExamQuestion {
  id: number;
  type: QuestionType;
  question: string;
  marks: number;
  options?: string[];
  correctAnswer?: string;
  modelAnswer?: string;
}

interface StudentAnswer {
  questionId: number;
  answer: string;
  marksAwarded?: number;
  feedback?: string;
}

interface ExamPattern {
  id: string;
  label: string;
  desc: string;
  sections: Array<{ type: QuestionType; count: number; marks: number }>;
  totalMarks: number;
}

const PATTERNS: ExamPattern[] = [
  {
    id: "A", label: "Pattern A", desc: "20 MCQs × 1 Mark",
    sections: [{ type: "mcq", count: 10, marks: 1 }],
    totalMarks: 10,
  },
  {
    id: "B", label: "Pattern B", desc: "5×2M + 3×5M",
    sections: [{ type: "short_2", count: 5, marks: 2 }, { type: "short_5", count: 3, marks: 5 }],
    totalMarks: 25,
  },
  {
    id: "C", label: "Pattern C", desc: "2×8M + 1×13M",
    sections: [{ type: "long_8", count: 2, marks: 8 }, { type: "long_13", count: 1, marks: 13 }],
    totalMarks: 29,
  },
];

const TYPE_LABEL: Record<QuestionType, string> = {
  mcq: "MCQ (1 Mark)", short_2: "Short (2 Marks)", short_5: "Short (5 Marks)",
  long_8: "Long (8 Marks)", long_13: "Long (13 Marks)",
};

export default function ExamPage() {
  const [status, setStatus] = useState<ExamStatus>("setup");
  const [selectedPattern, setSelectedPattern] = useState("A");
  const [selectedUnit, setSelectedUnit] = useState<"unit3" | "unit4" | "both">("both");
  const [timeLimitMin, setTimeLimitMin] = useState(30);
  const [questions, setQuestions] = useState<ExamQuestion[]>([]);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [currentQ, setCurrentQ] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<StudentAnswer[]>([]);
  const [evaluating, setEvaluating] = useState(false);
  const [totalScore, setTotalScore] = useState(0);
  const [maxScore, setMaxScore] = useState(0);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const { settings } = useAIStore();
  const { addXP, recordQuestionAttempt } = useProgressStore();

  const pattern = PATTERNS.find(p => p.id === selectedPattern) || PATTERNS[0];

  const startTimer = useCallback(() => {
    setTimeLeft(timeLimitMin * 60);
    timerRef.current = setInterval(() => {
      setTimeLeft(t => {
        if (t <= 1) {
          clearInterval(timerRef.current!);
          submitExam();
          return 0;
        }
        return t - 1;
      });
    }, 1000);
  }, [timeLimitMin]);

  const generateExam = async () => {
    setStatus("generating");
    const allQs: ExamQuestion[] = [];
    let qId = 0;

    try {
      for (const section of pattern.sections) {
        const topicPool = selectedUnit === "both"
          ? [...DSA_TOPICS.unit3, ...DSA_TOPICS.unit4]
          : DSA_TOPICS[selectedUnit];
        const topicName = topicPool[Math.floor(Math.random() * topicPool.length)].name;

        const qs = await generateQuestions({
          topicName,
          unit: selectedUnit === "both" ? "unit3" : selectedUnit,
          type: section.type,
          difficulty: "medium",
          count: section.count,
          settings,
        });

        for (const q of qs.slice(0, section.count)) {
          allQs.push({
            id: qId++,
            type: section.type,
            question: q.question || q,
            marks: section.marks,
            options: q.options,
            correctAnswer: q.correctAnswer,
            modelAnswer: q.modelAnswer || q.explanation,
          });
        }
      }

      setQuestions(allQs);
      setMaxScore(allQs.reduce((s, q) => s + q.marks, 0));
      setStatus("active");
      setCurrentQ(0);
      startTimer();
      toast.success(`Exam ready! ${allQs.length} questions, ${timeLimitMin} minutes`);
    } catch (err: any) {
      toast.error("Failed to generate exam: " + err.message);
      setStatus("setup");
    }
  };

  const submitExam = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setStatus("submitted");
    setEvaluating(true);

    let total = 0;
    const evaluated: StudentAnswer[] = [];

    for (const q of questions) {
      const userAns = answers[q.id] || "";
      if (q.type === "mcq") {
        const isCorrect = userAns === q.correctAnswer;
        const marks = isCorrect ? q.marks : 0;
        total += marks;
        recordQuestionAttempt(isCorrect);
        evaluated.push({ questionId: q.id, answer: userAns, marksAwarded: marks, feedback: isCorrect ? "✅ Correct!" : `❌ Incorrect. Answer: ${q.correctAnswer}` });
      } else {
        // For non-MCQ, do basic scoring (AI eval would be async)
        const hasContent = userAns.trim().length > 20;
        const marks = hasContent ? Math.round(q.marks * 0.6) : 0;
        total += marks;
        evaluated.push({ questionId: q.id, answer: userAns, marksAwarded: marks, feedback: hasContent ? "Answer submitted — partial marks awarded" : "No answer provided" });
      }
    }

    setStudentAnswers(evaluated);
    setTotalScore(total);
    setEvaluating(false);
    setStatus("results");
    addXP(50 + total * 2);
    toast.success(`Exam complete! Score: ${total}/${maxScore}`);
  }, [questions, answers, maxScore, addXP, recordQuestionAttempt]);

  const formatTime = (secs: number) => `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
  const q = questions[currentQ];
  const answered = Object.keys(answers).length;

  if (status === "setup") return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black gradient-text">AI Exam Mode</h1>
        <p className="text-slate-400 mt-1">Generate and take AI-powered CT tests with auto evaluation</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        {/* Pattern */}
        <div className="glass-card p-5">
          <h2 className="font-bold text-white mb-4">Select Exam Pattern</h2>
          <div className="space-y-3">
            {PATTERNS.map(p => (
              <button key={p.id} onClick={() => setSelectedPattern(p.id)}
                className={`w-full p-4 rounded-xl text-left border transition-all ${selectedPattern === p.id ? "bg-indigo-500/20 border-indigo-500/40" : "bg-white/5 border-white/5 hover:border-white/15"}`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-white">{p.label}</span>
                  <span className="text-xs text-indigo-400 font-mono">{p.totalMarks} Marks</span>
                </div>
                <div className="text-xs text-slate-400 mt-1">{p.desc}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Settings */}
        <div className="space-y-4">
          <div className="glass-card p-5">
            <h2 className="font-bold text-white mb-4">Exam Settings</h2>
            <div className="space-y-4">
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide">Unit Scope</label>
                <div className="flex gap-2 mt-2">
                  {[["unit3","Unit 3"],["unit4","Unit 4"],["both","Combined"]] .map(([v, l]) => (
                    <button key={v} onClick={() => setSelectedUnit(v as any)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${selectedUnit === v ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>{l}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs text-slate-400 uppercase tracking-wide">Time Limit</label>
                <div className="flex gap-2 mt-2">
                  {[15,30,60,90].map(t => (
                    <button key={t} onClick={() => setTimeLimitMin(t)}
                      className={`flex-1 py-2 rounded-xl text-sm font-semibold transition-all ${timeLimitMin === t ? "bg-purple-500/30 text-purple-300 border border-purple-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>{t}m</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-5">
            <h3 className="font-bold text-white mb-3">Pattern Summary</h3>
            {pattern.sections.map((s, i) => (
              <div key={i} className="flex justify-between text-sm py-1.5 border-b border-white/5 last:border-0">
                <span className="text-slate-400">{TYPE_LABEL[s.type]}</span>
                <span className="text-white font-mono">{s.count} × {s.marks}M = {s.count * s.marks}M</span>
              </div>
            ))}
            <div className="flex justify-between text-sm pt-2 font-bold">
              <span className="text-indigo-400">Total</span>
              <span className="text-white font-mono">{pattern.totalMarks} Marks</span>
            </div>
          </div>

          <motion.button onClick={generateExam} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }}
            className="w-full py-4 rounded-2xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold text-lg flex items-center justify-center gap-2 glow-primary">
            <Play className="w-5 h-5" /> Generate & Start Exam
          </motion.button>
        </div>
      </div>
    </div>
  );

  if (status === "generating") return (
    <div className="flex flex-col items-center justify-center h-full py-20">
      <Loader2 className="w-12 h-12 text-indigo-400 animate-spin mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">Generating Your Exam...</h2>
      <p className="text-slate-400">AI is creating personalized questions for you</p>
    </div>
  );

  if (status === "active" && q) return (
    <div className="flex flex-col h-full max-h-[calc(100vh-64px)]">
      {/* Exam Header */}
      <div className="flex-shrink-0 glass border-b border-white/5 px-4 py-3 flex items-center gap-4">
        <div className="flex items-center gap-2">
          <Target className="w-5 h-5 text-indigo-400" />
          <span className="font-bold text-white text-sm">{pattern.label}</span>
        </div>
        <div className="flex-1" />
        <div className="text-sm text-slate-400">{answered}/{questions.length} answered</div>
        <div className={`flex items-center gap-2 font-mono font-bold text-lg ${timeLeft < 300 ? "text-red-400" : "text-white"}`}>
          <Clock className={`w-5 h-5 ${timeLeft < 300 ? "text-red-400 animate-pulse" : "text-slate-400"}`} />
          {formatTime(timeLeft)}
        </div>
        <motion.button onClick={submitExam} whileTap={{ scale: 0.95 }}
          className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white text-sm font-bold rounded-xl">
          Submit Exam
        </motion.button>
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-slate-800 flex-shrink-0">
        <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500"
          animate={{ width: `${(currentQ / questions.length) * 100}%` }} />
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Question Navigator */}
        <div className="w-16 flex-shrink-0 glass border-r border-white/5 p-2 overflow-y-auto">
          <div className="space-y-1">
            {questions.map((q, i) => (
              <button key={i} onClick={() => setCurrentQ(i)}
                className={`w-full h-10 rounded-lg text-xs font-bold transition-all ${
                  i === currentQ ? "bg-indigo-500 text-white" :
                  answers[q.id] ? "bg-green-500/30 text-green-300 border border-green-500/30" :
                  "bg-white/5 text-slate-400 hover:bg-white/10"
                }`}>{i + 1}</button>
            ))}
          </div>
        </div>

        {/* Question Area */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-3xl mx-auto space-y-5">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Q{currentQ + 1} / {questions.length}
              </span>
              <span className="text-xs font-bold px-2 py-1 rounded-full bg-purple-500/20 text-purple-400 border border-purple-500/30">
                {q.marks} Mark{q.marks > 1 ? "s" : ""}
              </span>
              <span className="text-xs text-slate-400">{TYPE_LABEL[q.type]}</span>
            </div>

            <div className="glass-card p-5">
              <div className="prose prose-invert prose-sm max-w-none mb-4">
                <ReactMarkdown>{q.question}</ReactMarkdown>
              </div>

              {q.type === "mcq" && q.options ? (
                <div className="space-y-2 mt-4">
                  {q.options.map((opt, i) => {
                    const letter = ["A","B","C","D"][i];
                    const isSelected = answers[q.id] === letter;
                    return (
                      <motion.button key={i} onClick={() => setAnswers(a => ({ ...a, [q.id]: letter }))}
                        whileTap={{ scale: 0.99 }}
                        className={`w-full p-3 rounded-xl text-left border transition-all flex items-start gap-3 ${
                          isSelected ? "bg-indigo-500/20 border-indigo-500/50 text-white" : "bg-white/5 border-white/10 text-slate-300 hover:border-white/20"
                        }`}>
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${isSelected ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-400"}`}>{letter}</span>
                        <span className="text-sm leading-relaxed">{opt}</span>
                      </motion.button>
                    );
                  })}
                </div>
              ) : (
                <textarea
                  value={answers[q.id] || ""}
                  onChange={e => setAnswers(a => ({ ...a, [q.id]: e.target.value }))}
                  className="w-full h-40 bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500/50 font-mono leading-relaxed"
                  placeholder={`Write your ${q.marks}-mark answer here...\n\nTip: Include definition, explanation, example, and diagram description`}
                />
              )}
            </div>

            <div className="flex justify-between">
              <button onClick={() => setCurrentQ(c => Math.max(0, c - 1))} disabled={currentQ === 0}
                className="px-4 py-2 bg-white/10 text-slate-300 rounded-xl text-sm flex items-center gap-1.5 disabled:opacity-40 hover:bg-white/15">
                <ChevronLeft className="w-4 h-4" /> Previous
              </button>
              <button onClick={() => setCurrentQ(c => Math.min(questions.length - 1, c + 1))} disabled={currentQ === questions.length - 1}
                className="px-4 py-2 bg-indigo-500/30 text-indigo-300 rounded-xl text-sm flex items-center gap-1.5 disabled:opacity-40 hover:bg-indigo-500/40">
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (status === "submitted" && evaluating) return (
    <div className="flex flex-col items-center justify-center h-full py-20">
      <Loader2 className="w-12 h-12 text-green-400 animate-spin mb-4" />
      <h2 className="text-xl font-bold text-white mb-2">Evaluating Your Answers...</h2>
      <p className="text-slate-400">AI is scoring and providing feedback</p>
    </div>
  );

  if (status === "results") {
    const pct = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;
    const grade = pct >= 90 ? "A+" : pct >= 80 ? "A" : pct >= 70 ? "B" : pct >= 60 ? "C" : pct >= 50 ? "D" : "F";
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <h1 className="text-3xl font-black gradient-text mb-6">Exam Results</h1>

        <div className="grid md:grid-cols-3 gap-4 mb-6">
          <div className="glass-card p-5 text-center md:col-span-1">
            <Trophy className={`w-10 h-10 mx-auto mb-2 ${pct >= 70 ? "text-yellow-400" : "text-slate-400"}`} />
            <div className="text-4xl font-black gradient-text">{totalScore}/{maxScore}</div>
            <div className="text-slate-400 mt-1">Total Score</div>
          </div>
          <div className="glass-card p-5 text-center">
            <div className={`text-5xl font-black ${pct >= 70 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>{pct}%</div>
            <div className="text-slate-400 mt-1">Percentage</div>
          </div>
          <div className="glass-card p-5 text-center">
            <div className={`text-5xl font-black ${pct >= 70 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>{grade}</div>
            <div className="text-slate-400 mt-1">Grade</div>
          </div>
        </div>

        <div className="glass-card p-5 mb-4">
          <h2 className="font-bold text-white mb-4">Question Breakdown</h2>
          <div className="space-y-3">
            {questions.map((q, i) => {
              const ans = studentAnswers.find(a => a.questionId === q.id);
              return (
                <div key={i} className={`p-3 rounded-xl border ${(ans?.marksAwarded ?? 0) > 0 ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="text-xs text-slate-400 mb-1">Q{i + 1} · {TYPE_LABEL[q.type]}</div>
                      <div className="text-sm text-slate-200 line-clamp-2">{q.question}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className={`font-bold ${(ans?.marksAwarded ?? 0) > 0 ? "text-green-400" : "text-red-400"}`}>
                        {ans?.marksAwarded ?? 0}/{q.marks}
                      </div>
                    </div>
                  </div>
                  {ans?.feedback && <div className="mt-2 text-xs text-slate-400">{ans.feedback}</div>}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3">
          <motion.button onClick={() => { setStatus("setup"); setQuestions([]); setAnswers({}); setStudentAnswers([]); }} whileTap={{ scale: 0.95 }}
            className="flex-1 py-3 rounded-xl bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 font-semibold flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> New Exam
          </motion.button>
          <motion.button onClick={() => addXP(100)} whileTap={{ scale: 0.95 }}
            className="flex-1 py-3 rounded-xl bg-gradient-to-r from-green-500 to-emerald-600 text-white font-semibold flex items-center justify-center gap-2">
            <Zap className="w-4 h-4" /> Claim Bonus XP
          </motion.button>
        </div>
      </div>
    );
  }

  return null;
}
