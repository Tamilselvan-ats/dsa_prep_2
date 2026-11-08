"use client";
// MCQ Questions page — focused view using the shared question bank pattern
import { useState } from "react";
import { motion } from "framer-motion";
import { Target, Shuffle, CheckCircle, XCircle, Brain, RotateCcw, Zap, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAIStore } from "@/lib/stores/ai-store";
import { useProgressStore } from "@/lib/stores/progress-store";
import { generateQuestions } from "@/lib/api";
import { ALL_TOPICS, DIFFICULTY_LEVELS } from "@/lib/constants";

interface MCQ {
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  topic: string;
  difficulty: string;
}

type QuizState = "idle" | "loading" | "quiz" | "results";

export default function MCQPage() {
  const { settings } = useAIStore();
  const { progress, addXP, updateTopicMastery, recordQuestionAttempt, recordStudySession } = useProgressStore();

  const [selectedTopic, setSelectedTopic] = useState(ALL_TOPICS[0].id);
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(10);
  const [state, setState] = useState<QuizState>("idle");
  const [mcqs, setMCQs] = useState<MCQ[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [answered, setAnswered] = useState<{ idx: number; correct: boolean }[]>([]);
  const [showExplanation, setShowExplanation] = useState(false);

  const topicName = ALL_TOPICS.find(t => t.id === selectedTopic)?.name || selectedTopic;
  const current = mcqs[currentIdx];
  const score = answered.filter(a => a.correct).length;

  const handleGenerate = async () => {
    setState("loading");
    try {
      const raw = await generateQuestions({
        topicName, difficulty, type: "mcq", count, settings,
      });

      // Parse MCQs from AI response
      let parsed: MCQ[] = [];
      if (Array.isArray(raw)) {
        parsed = raw.map((q: any) => ({
          question: q.question || q.text || "",
          options: q.options || q.choices || ["A", "B", "C", "D"],
          correctIndex: typeof q.correctIndex === "number" ? q.correctIndex : (q.correct || 0),
          explanation: q.explanation || q.rationale || "See textbook for explanation.",
          topic: topicName,
          difficulty,
        })).filter(q => q.question);
      }

      if (parsed.length === 0) {
        // Fallback: generate basic MCQs
        parsed = generateFallbackMCQs(topicName, count, difficulty);
      }

      setMCQs(parsed);
      setCurrentIdx(0);
      setAnswered([]);
      setSelected(null);
      setShowExplanation(false);
      setState("quiz");
    } catch {
      const fallback = generateFallbackMCQs(topicName, count, difficulty);
      setMCQs(fallback);
      setCurrentIdx(0);
      setAnswered([]);
      setSelected(null);
      setState("quiz");
      toast.warning("Using practice MCQs (AI unavailable)");
    }
  };

  const generateFallbackMCQs = (topic: string, n: number, diff: string): MCQ[] => {
    const pool: MCQ[] = [
      {
        question: "What data structure uses LIFO principle?",
        options: ["Queue", "Stack", "Array", "Linked List"],
        correctIndex: 1,
        explanation: "Stack follows Last In, First Out (LIFO) — the last element pushed is the first to be popped.",
        topic, difficulty: diff,
      },
      {
        question: "What is the time complexity of Push and Pop operations in a Stack?",
        options: ["O(n)", "O(log n)", "O(1)", "O(n²)"],
        correctIndex: 2,
        explanation: "Both Push and Pop are O(1) since they only operate on the top of the stack.",
        topic, difficulty: diff,
      },
      {
        question: "Which traversal of BST gives elements in sorted ascending order?",
        options: ["Preorder", "Postorder", "Inorder", "Level order"],
        correctIndex: 2,
        explanation: "Inorder traversal (Left → Node → Right) of a BST gives elements in sorted ascending order.",
        topic, difficulty: diff,
      },
      {
        question: "AVL tree balance factor must be in range:",
        options: ["-2 to 2", "-1 to 1", "0 to 1", "0 to 2"],
        correctIndex: 1,
        explanation: "AVL tree maintains Balance Factor = Height(Left) - Height(Right) in {-1, 0, 1} for every node.",
        topic, difficulty: diff,
      },
      {
        question: "Tower of Hanoi with n disks requires minimum how many moves?",
        options: ["n²", "2n", "2ⁿ - 1", "n!"],
        correctIndex: 2,
        explanation: "The minimum number of moves for Tower of Hanoi with n disks is 2ⁿ - 1.",
        topic, difficulty: diff,
      },
      {
        question: "Circular queue avoids:",
        options: ["Stack overflow", "Underflow", "False overflow", "Collision"],
        correctIndex: 2,
        explanation: "Circular Queue uses modular arithmetic to reuse freed positions, avoiding false overflow in linear queue.",
        topic, difficulty: diff,
      },
      {
        question: "Division method hash function is h(k) =",
        options: ["k / m", "k mod m", "k × m", "k² / m"],
        correctIndex: 1,
        explanation: "Division method: h(k) = k mod m, where m is the table size (preferably prime).",
        topic, difficulty: diff,
      },
      {
        question: "In BST deletion, a node with two children is replaced by:",
        options: ["Left child", "Right child", "Inorder successor", "Parent node"],
        correctIndex: 2,
        explanation: "For a node with two children, we find the inorder successor (smallest in right subtree), copy its value, then delete it.",
        topic, difficulty: diff,
      },
      {
        question: "Which collision resolution technique uses linked lists?",
        options: ["Linear Probing", "Quadratic Probing", "Double Hashing", "Chaining"],
        correctIndex: 3,
        explanation: "Chaining stores all colliding elements in a linked list at each hash table bucket.",
        topic, difficulty: diff,
      },
      {
        question: "AVL LL imbalance case is fixed by:",
        options: ["Single left rotation", "Single right rotation", "Double rotation (LR)", "Double rotation (RL)"],
        correctIndex: 1,
        explanation: "LL case (left-left imbalance) is fixed by a single right rotation on the unbalanced node.",
        topic, difficulty: diff,
      },
    ];
    return pool.slice(0, Math.min(n, pool.length));
  };

  const handleSelect = (idx: number) => {
    if (selected !== null) return; // already answered
    setSelected(idx);
    setShowExplanation(true);
    const correct = idx === current.correctIndex;
    const newAnswered = [...answered, { idx: currentIdx, correct }];
    setAnswered(newAnswered);
    recordQuestionAttempt(correct);
    if (correct) {
      addXP(5, "MCQ Correct");
      toast.success("+5 XP! 🎯");
    }
    updateTopicMastery(selectedTopic, {
      practiceCount: 1,
      correctCount: correct ? 1 : 0,
    });
  };

  const handleNext = () => {
    if (currentIdx < mcqs.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelected(null);
      setShowExplanation(false);
    } else {
      const pct = Math.round((score / mcqs.length) * 100);
      const prevMastery = progress.topicMastery[selectedTopic]?.masteryScore || 0;
      updateTopicMastery(selectedTopic, {
        practiceScore: pct,
        masteryScore: Math.min(100, Math.max(prevMastery, pct)),
        lastStudiedAt: new Date().toISOString(),
        nextRevisionAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
      });
      recordStudySession(Math.max(1, Math.round(mcqs.length * 0.75)));
      setState("results");
    }
  };

  const handleReset = () => {
    setState("idle");
    setMCQs([]);
    setCurrentIdx(0);
    setAnswered([]);
    setSelected(null);
  };

  // ── Render: Setup ──────────────────────────────────────────────────────────
  if (state === "idle") {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="text-5xl mb-3">🎯</div>
            <h1 className="text-2xl font-bold gradient-text">MCQ Practice</h1>
            <p className="text-slate-400 text-sm mt-1">AI-generated multiple choice questions for exam prep</p>
          </motion.div>

          <div className="glass-card p-6 space-y-5">
            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Topic</label>
              <select
                value={selectedTopic}
                onChange={e => setSelectedTopic(e.target.value)}
                className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-200 text-sm"
              >
                {ALL_TOPICS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-sm font-medium text-slate-300">Difficulty</label>
                {(() => {
                  const m = progress.topicMastery[selectedTopic]?.masteryScore || 0;
                  const rec = m >= 75 ? "hard" : m >= 40 ? "medium" : "easy";
                  return (
                    <button
                      type="button"
                      onClick={() => setDifficulty(rec)}
                      className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20"
                    >
                      <span>⚡ AI Auto-Adapted: {rec.toUpperCase()}</span>
                    </button>
                  );
                })()}
              </div>
              <div className="flex gap-2 flex-wrap">
                {DIFFICULTY_LEVELS.map(d => (
                  <button key={d.value} onClick={() => setDifficulty(d.value)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      difficulty === d.value ? `${d.bg} ${d.color} border-current` : "bg-slate-800/40 text-slate-500 border-slate-700/40"
                    }`}
                  >{d.label}</button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm font-medium text-slate-300 mb-2 block">Number of Questions</label>
              <div className="flex gap-2">
                {[5, 10, 15, 20].map(n => (
                  <button key={n} onClick={() => setCount(n)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium border transition-all ${
                      count === n ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" : "bg-slate-800/40 text-slate-500 border-slate-700/40"
                    }`}
                  >{n}</button>
                ))}
              </div>
            </div>

            <button onClick={handleGenerate} disabled={false}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
            >
              <Zap className="w-4 h-4" /> Generate MCQs
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Loading
  if (state === "loading") {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400">Generating MCQs with AI...</p>
        </div>
      </div>
    );
  }

  // ── Render: Quiz ───────────────────────────────────────────────────────────
  if (state === "quiz" && current) {
    const isAnswered = selected !== null;
    const pct = ((currentIdx) / mcqs.length) * 100;

    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          {/* Header */}
          <div className="flex justify-between items-center">
            <span className="text-sm text-slate-400">Question {currentIdx + 1} / {mcqs.length}</span>
            <span className="text-sm font-semibold text-indigo-400">Score: {score}/{answered.length}</span>
          </div>

          {/* Progress */}
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
              animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} />
          </div>

          {/* Question */}
          <motion.div key={currentIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6">
            <div className="mb-5">
              <div className="flex items-start gap-3">
                <span className="w-7 h-7 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">
                  {currentIdx + 1}
                </span>
                <p className="text-slate-100 font-medium leading-relaxed">{current.question}</p>
              </div>
            </div>

            <div className="space-y-2">
              {current.options.map((opt, i) => {
                const isCorrect = i === current.correctIndex;
                const isSelected = i === selected;
                let cls = "w-full text-left p-3 rounded-xl border text-sm transition-all ";
                if (!isAnswered) {
                  cls += "bg-slate-800/40 border-slate-700/40 text-slate-300 hover:border-indigo-500/40 hover:bg-indigo-500/5";
                } else if (isCorrect) {
                  cls += "bg-green-500/15 border-green-500/40 text-green-300";
                } else if (isSelected && !isCorrect) {
                  cls += "bg-red-500/15 border-red-500/40 text-red-300";
                } else {
                  cls += "bg-slate-800/20 border-slate-700/20 text-slate-500";
                }

                return (
                  <button key={i} onClick={() => handleSelect(i)} className={cls} disabled={isAnswered}>
                    <div className="flex items-center gap-3">
                      <span className={`w-5 h-5 rounded-full border text-xs font-bold flex items-center justify-center shrink-0 ${
                        isAnswered && isCorrect ? "border-green-400 text-green-400" :
                        isAnswered && isSelected ? "border-red-400 text-red-400" :
                        "border-slate-600 text-slate-500"
                      }`}>
                        {["A","B","C","D"][i]}
                      </span>
                      <span>{opt}</span>
                      {isAnswered && isCorrect && <CheckCircle className="w-4 h-4 text-green-400 ml-auto" />}
                      {isAnswered && isSelected && !isCorrect && <XCircle className="w-4 h-4 text-red-400 ml-auto" />}
                    </div>
                  </button>
                );
              })}
            </div>

            {showExplanation && (
              <motion.div initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
                className="mt-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-xl"
              >
                <div className="text-xs font-semibold text-indigo-400 mb-1 flex items-center gap-1.5">
                  <Brain className="w-3.5 h-3.5" /> Explanation
                </div>
                <p className="text-sm text-slate-300">{current.explanation}</p>
              </motion.div>
            )}

            {isAnswered && (
              <button onClick={handleNext}
                className="mt-4 w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm"
              >
                {currentIdx < mcqs.length - 1 ? <><ChevronRight className="w-4 h-4" /> Next Question</> : <><Trophy className="w-4 h-4" /> See Results</>}
              </button>
            )}
          </motion.div>

          {/* Dot indicators */}
          <div className="flex gap-1.5 justify-center flex-wrap">
            {mcqs.map((_, i) => {
              const ans = answered.find(a => a.idx === i);
              return (
                <div key={i} className={`w-5 h-5 rounded-full text-xs flex items-center justify-center ${
                  i === currentIdx ? "bg-indigo-500 text-white" :
                  ans?.correct ? "bg-green-500/40 text-green-400" :
                  ans ? "bg-red-500/40 text-red-400" :
                  "bg-slate-700/50 text-slate-600"
                }`}>{i + 1}</div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Results ────────────────────────────────────────────────────────
  if (state === "results") {
    const pct = Math.round((score / mcqs.length) * 100);
    const scoreColor = pct >= 75 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400";

    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto space-y-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 text-center">
            <div className="text-5xl mb-3">{pct >= 75 ? "🏆" : pct >= 50 ? "👍" : "💪"}</div>
            <h2 className="text-xl font-bold text-slate-100 mb-2">MCQ Session Complete!</h2>
            <div className={`text-5xl font-black mt-3 mb-1 ${scoreColor}`}>{score}/{mcqs.length}</div>
            <div className={`text-lg font-semibold ${scoreColor}`}>{pct}% Accuracy</div>
          </motion.div>

          <div className="flex gap-3">
            <button onClick={handleReset} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 font-semibold">
              <RotateCcw className="w-4 h-4" /> New Session
            </button>
            <button onClick={handleGenerate} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold">
              <Shuffle className="w-4 h-4" /> New Questions
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

// Add Trophy import that was missing in JSX
function Trophy({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path d="M6 9H4.5a2.5 2.5 0 010-5H6" /><path d="M18 9h1.5a2.5 2.5 0 000-5H18" />
      <path d="M4 22h16" /><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0012 0V2z" />
    </svg>
  );
}
