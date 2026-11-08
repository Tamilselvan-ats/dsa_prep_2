"use client";

import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Trophy, Flame, ChevronDown, ChevronUp, Zap, CheckCircle,
  XCircle, ArrowRight, Calendar, Target, Clock, Star, Lock
} from "lucide-react";
import { useProgressStore } from "@/lib/stores/progress-store";
import { useAIStore } from "@/lib/stores/ai-store";
import { generateQuestions } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type ChallengeType = "mcq" | "avl" | "hashing" | "recursion" | "queue" | "coding";
type Difficulty = "easy" | "medium" | "hard";

interface Challenge {
  id: string;
  type: ChallengeType;
  title: string;
  description: string;
  question: string;
  hints: string[];
  answer: string;
  explanation: string;
  xpReward: number;
  options?: string[]; // for MCQ
  difficulty: Difficulty;
  topic: string;
}

interface DayResult {
  date: string;
  completed: boolean;
  xpEarned: number;
  challengeType: ChallengeType;
}

// ─── Static Challenges ───────────────────────────────────────────────────────

const STATIC_CHALLENGES: Record<ChallengeType, Challenge> = {
  mcq: {
    id: "mcq-1",
    type: "mcq",
    title: "AVL Tree Rotation",
    description: "Test your understanding of AVL tree rotations",
    question: "In an AVL tree, after inserting 30, 20, 40, 10, 25, what type of rotation is needed if we insert 5?",
    options: ["Left-Left (LL) Rotation", "Right-Right (RR) Rotation", "Left-Right (LR) Rotation", "Right-Left (RL) Rotation"],
    hints: [
      "Trace the insertion path: 30 → 20 → 10 → 5",
      "The imbalance occurs at node 30. What side is it heavier on?",
      "Both the node causing imbalance and the unbalanced node are on the left side.",
    ],
    answer: "Left-Left (LL) Rotation",
    explanation: "Inserting 5 creates a Left-Left (LL) imbalance at node 30. The path goes 30→20→10→5, all going left. LL rotation (single right rotation at the unbalanced node 30) restores balance.",
    xpReward: 100,
    difficulty: "medium",
    topic: "avl",
  },
  avl: {
    id: "avl-1",
    type: "avl",
    title: "Build AVL Tree",
    description: "Insert elements into an AVL tree step by step",
    question: "Insert the sequence: 10, 20, 30, 40, 50, 25 into an empty AVL tree. What is the root after all insertions? Show the rotation steps.",
    hints: [
      "Inserting 10, 20, 30 → RR imbalance at 10. Rotate left → 20 becomes root.",
      "Now insert 40, 50 → RR imbalance again at 30. Rotate left at 30.",
      "Insert 25 → it goes between 20 and 30. What rotation is needed?",
    ],
    answer: "30",
    explanation: "After inserting all elements with rotations:\n- Insert 10,20,30 → LL rotation makes 20 root\n- Insert 40,50 → RR rotation at 30 makes 40 root\n- Final tree root is 30\n\nFinal structure: Root=30, Left subtree root=20(10,25), Right subtree root=40(null,50)",
    xpReward: 200,
    difficulty: "hard",
    topic: "avl",
  },
  hashing: {
    id: "hash-1",
    type: "hashing",
    title: "Hash Table with Chaining",
    description: "Apply hash function and resolve collisions",
    question: "Given hash table of size 7, hash function h(k) = k mod 7. Insert keys: 50, 700, 76, 85, 92, 73, 101. What is stored at index 1?",
    hints: [
      "Compute: 50 mod 7 = 1, 700 mod 7 = 0, 76 mod 7 = 6",
      "85 mod 7 = 1 → collision at index 1! Use chaining.",
      "92 mod 7 = 1 → another collision at index 1!",
    ],
    answer: "50 → 85 → 92",
    explanation: "h(50)=1, h(85)=1, h(92)=1. All three hash to index 1. Using chaining, the linked list at index 1 is: 50 → 85 → 92 (insertion order). Load factor = 7/7 = 1.0",
    xpReward: 150,
    difficulty: "medium",
    topic: "hashing",
  },
  recursion: {
    id: "rec-1",
    type: "recursion",
    title: "Recursion Trace",
    description: "Trace through recursive function execution",
    question: "What is the output of this C function when called as mystery(5)?\n\nvoid mystery(int n) {\n  if (n == 0) return;\n  mystery(n - 1);\n  printf(\"%d \", n);\n}",
    hints: [
      "The recursive call happens BEFORE printf",
      "Trace the call stack: mystery(5) calls mystery(4) first, all the way to mystery(0)",
      "mystery(0) returns, then mystery(1) prints 1, then mystery(2) prints 2...",
    ],
    answer: "1 2 3 4 5",
    explanation: "mystery(5) first recurses down to mystery(0), then as the stack unwinds, prints 1, 2, 3, 4, 5. This is because printf executes AFTER the recursive call returns. The call stack unwinds in reverse order.",
    xpReward: 100,
    difficulty: "easy",
    topic: "recursion",
  },
  queue: {
    id: "queue-1",
    type: "queue",
    title: "Circular Queue Operations",
    description: "Perform operations on a circular queue",
    question: "A circular queue of size 5 starts empty (front=rear=-1). Perform: Enqueue(10), Enqueue(20), Enqueue(30), Dequeue(), Enqueue(40), Enqueue(50), Enqueue(60). What is the state of the queue and what happens on the last Enqueue?",
    hints: [
      "After Enqueue(10,20,30): front=0, rear=2, queue=[10,20,30,_,_]",
      "After Dequeue(): front=1, rear=2, queue=[_,20,30,_,_]",
      "After Enqueue(40,50): rear=4, queue=[_,20,30,40,50]",
      "Now Enqueue(60): rear wraps to (4+1)%5=0. Is that position free?",
    ],
    answer: "Queue is FULL. Enqueue(60) causes overflow. Final state: [60,20,30,40,50] with front=1, rear=0",
    explanation: "In circular queue of size 5, after the operations, all 5 slots are occupied (20,30,40,50 from dequeue+enqueues). Position 0 (freed by dequeue of 10) gets filled by 60. Queue: [60,20,30,40,50], front=1, rear=0. Queue is now FULL.",
    xpReward: 200,
    difficulty: "hard",
    topic: "queue",
  },
  coding: {
    id: "code-1",
    type: "coding",
    title: "Write Selection Sort",
    description: "Implement selection sort in C",
    question: "Write a complete C function to implement Selection Sort. The function signature is:\nvoid selectionSort(int arr[], int n);\n\nAlso state its Time Complexity.",
    hints: [
      "Selection sort finds the minimum element in remaining unsorted array",
      "It places the minimum at the beginning of unsorted portion",
      "Outer loop runs n-1 times, inner loop finds minimum",
    ],
    answer: `void selectionSort(int arr[], int n) {
    int i, j, min_idx, temp;
    for (i = 0; i < n-1; i++) {
        min_idx = i;
        for (j = i+1; j < n; j++) {
            if (arr[j] < arr[min_idx])
                min_idx = j;
        }
        temp = arr[min_idx];
        arr[min_idx] = arr[i];
        arr[i] = temp;
    }
}
// Time Complexity: O(n²)`,
    explanation: "Selection Sort: Find minimum in unsorted portion (inner loop), swap with first unsorted element. Repeat n-1 times. Time: O(n²) in all cases. Space: O(1).",
    xpReward: 300,
    difficulty: "medium",
    topic: "sorting",
  },
};

const CHALLENGE_TABS: Array<{ id: ChallengeType; label: string; icon: string; color: string }> = [
  { id: "mcq", label: "MCQ", icon: "🎯", color: "text-blue-400" },
  { id: "avl", label: "AVL Tree", icon: "🌳", color: "text-green-400" },
  { id: "hashing", label: "Hashing", icon: "#️⃣", color: "text-orange-400" },
  { id: "recursion", label: "Recursion", icon: "🔁", color: "text-purple-400" },
  { id: "queue", label: "Queue", icon: "📋", color: "text-cyan-400" },
  { id: "coding", label: "Coding", icon: "💻", color: "text-pink-400" },
];

const DIFFICULTY_COLORS: Record<Difficulty, string> = {
  easy: "text-green-400 bg-green-500/15 border-green-500/30",
  medium: "text-yellow-400 bg-yellow-500/15 border-yellow-500/30",
  hard: "text-red-400 bg-red-500/15 border-red-500/30",
};

function formatDate(d: Date): string {
  return d.toISOString().split("T")[0];
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    return formatDate(d);
  });
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ChallengePage() {
  const { progress, addXP, recordQuestionAttempt, updateStreak, updateTopicMastery, recordStudySession } = useProgressStore();
  const { settings } = useAIStore();

  const [activeType, setActiveType] = useState<ChallengeType>("mcq");
  const [challenge, setChallenge] = useState<Challenge>(STATIC_CHALLENGES.mcq);
  const [answer, setAnswer] = useState("");
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [isCorrect, setIsCorrect] = useState(false);
  const [hintsRevealed, setHintsRevealed] = useState(0);
  const [showHistory, setShowHistory] = useState(false);
  const [loading, setLoading] = useState(false);
  const [history] = useState<DayResult[]>(() => {
    // Simulate last 7 days history
    const types: ChallengeType[] = ["mcq", "avl", "hashing", "recursion", "queue", "coding"];
    return getLast7Days().slice(0, 6).map((date, i) => ({
      date,
      completed: Math.random() > 0.3,
      xpEarned: Math.floor(Math.random() * 300) + 50,
      challengeType: types[i % types.length],
    }));
  });

  // Determine difficulty from progress
  const getMasteryScore = useCallback((topic: string) => {
    return progress.topicMastery[topic]?.masteryScore ?? 0;
  }, [progress]);

  const getDifficulty = useCallback((): Difficulty => {
    const avg = Object.values(progress.topicMastery).reduce((s, t) => s + t.masteryScore, 0) /
      Math.max(1, Object.keys(progress.topicMastery).length);
    if (avg >= 70) return "hard";
    if (avg >= 40) return "medium";
    return "easy";
  }, [progress]);

  const adaptedDifficulty = getDifficulty();

  // ── Load Challenge ─────────────────────────────────────────────────────────

  const loadChallenge = useCallback(async (type: ChallengeType) => {
    setActiveType(type);
    setAnswer("");
    setSelectedOption(null);
    setSubmitted(false);
    setIsCorrect(false);
    setHintsRevealed(0);
    setChallenge(STATIC_CHALLENGES[type]);
  }, []);

  useEffect(() => {
    updateStreak();
  }, [updateStreak]);

  // ── Hint reveal ───────────────────────────────────────────────────────────

  const revealHint = () => {
    if (hintsRevealed >= challenge.hints.length) return;
    if (progress.xp >= 10) {
      addXP(-10);
      setHintsRevealed((h) => h + 1);
      toast.info("Hint revealed! -10 XP");
    } else {
      toast.error("Not enough XP for a hint!");
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────────

  const handleSubmit = () => {
    if (!answer.trim() && !selectedOption) {
      toast.error("Please provide an answer!");
      return;
    }

    const userAnswer = selectedOption ?? answer.trim();
    const correct = userAnswer.toLowerCase().includes(
      challenge.answer.toLowerCase().split("\n")[0].substring(0, 20).toLowerCase()
    ) || challenge.answer.toLowerCase().includes(userAnswer.toLowerCase().substring(0, 15));

    setIsCorrect(correct);
    setSubmitted(true);
    recordQuestionAttempt(correct);
    recordStudySession(5);

    const topicId = challenge.topic || "stack-adt";
    const prevMastery = progress.topicMastery[topicId];
    updateTopicMastery(topicId, {
      practiceScore: Math.min(100, (prevMastery?.practiceScore || 0) + (correct ? 15 : 5)),
      masteryScore: Math.min(100, (prevMastery?.masteryScore || 0) + (correct ? 10 : 2)),
      lastStudiedAt: new Date().toISOString(),
      nextRevisionAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString(),
    });

    if (correct) {
      const xp = challenge.xpReward - hintsRevealed * 10;
      addXP(Math.max(xp, 10));
      toast.success(`🎉 Correct! +${Math.max(xp, 10)} XP`);
    } else {
      toast.error("Not quite right. Check the explanation!");
    }
  };

  const today = new Date();
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/20 border border-orange-500/30">
              <Trophy className="text-orange-400" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Daily Challenge</h1>
              <p className="text-slate-400 text-sm">
                {today.toLocaleDateString("en-US", { weekday: "long", year: "numeric", month: "long", day: "numeric" })}
              </p>
            </div>
          </div>

          {/* Streak + XP */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-4 py-2 glass-card rounded-xl">
              <Flame className="text-orange-400" size={18} />
              <span className="text-orange-300 font-bold">{progress.streak}</span>
              <span className="text-slate-500 text-xs">day streak</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 glass-card rounded-xl">
              <Zap className="text-yellow-400" size={18} />
              <span className="text-yellow-300 font-bold">{progress.xp}</span>
              <span className="text-slate-500 text-xs">XP</span>
            </div>
            <div className={`px-3 py-1.5 rounded-lg border text-xs font-semibold capitalize ${DIFFICULTY_COLORS[adaptedDifficulty]}`}>
              <Target size={12} className="inline mr-1" />
              {adaptedDifficulty} mode
            </div>
          </div>
        </div>
      </motion.div>

      {/* Challenge Type Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="glass-card p-3 mb-5"
      >
        <div className="flex overflow-x-auto gap-2">
          {CHALLENGE_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => loadChallenge(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all ${
                activeType === tab.id
                  ? "bg-gradient-to-r from-indigo-600/80 to-purple-600/80 text-white shadow-lg"
                  : "bg-slate-800/60 text-slate-400 hover:bg-slate-700/60 hover:text-white"
              }`}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
        {/* ── Challenge Card ─────────────────────────────────────────────── */}
        <div className="xl:col-span-2 flex flex-col gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            key={challenge.id}
            className="glass-card overflow-hidden"
          >
            {/* Card header */}
            <div className="p-4 border-b border-slate-700/60 flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg">{CHALLENGE_TABS.find((t) => t.id === activeType)?.icon}</span>
                  <h2 className="font-bold text-white text-lg">{challenge.title}</h2>
                </div>
                <p className="text-slate-400 text-sm">{challenge.description}</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <span className={`px-2.5 py-1 rounded-lg border text-xs font-semibold capitalize ${DIFFICULTY_COLORS[challenge.difficulty]}`}>
                  {challenge.difficulty}
                </span>
                <span className="text-yellow-400 text-xs font-semibold flex items-center gap-1">
                  <Zap size={11} /> {challenge.xpReward} XP
                </span>
              </div>
            </div>

            {/* Question */}
            <div className="p-4">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/40 mb-4">
                <pre className="text-sm text-slate-200 whitespace-pre-wrap font-mono leading-relaxed">
                  {challenge.question}
                </pre>
              </div>

              {/* MCQ Options */}
              {challenge.options && !submitted && (
                <div className="space-y-2 mb-4">
                  <p className="text-xs text-slate-500 font-semibold uppercase tracking-wider mb-2">Choose an answer:</p>
                  {challenge.options.map((opt, i) => (
                    <motion.button
                      key={i}
                      whileHover={{ scale: 1.01 }}
                      whileTap={{ scale: 0.99 }}
                      onClick={() => setSelectedOption(opt)}
                      className={`w-full text-left p-3 rounded-xl border text-sm transition-all ${
                        selectedOption === opt
                          ? "border-indigo-500 bg-indigo-500/20 text-indigo-300"
                          : "border-slate-700/60 bg-slate-800/40 text-slate-300 hover:border-slate-600 hover:bg-slate-800/60"
                      }`}
                    >
                      <span className="text-slate-500 mr-2">{String.fromCharCode(65 + i)}.</span>
                      {opt}
                    </motion.button>
                  ))}
                </div>
              )}

              {/* Text answer (non-MCQ) */}
              {!challenge.options && !submitted && (
                <textarea
                  value={answer}
                  onChange={(e) => setAnswer(e.target.value)}
                  placeholder="Type your answer here…"
                  rows={5}
                  className="w-full mb-4 bg-slate-900/60 border border-slate-700/60 rounded-xl p-3 text-sm text-slate-200 placeholder-slate-600 font-mono resize-none focus:outline-none focus:border-indigo-500/50"
                />
              )}

              {/* Hints */}
              {!submitted && (
                <div className="mb-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
                      Hints ({hintsRevealed}/{challenge.hints.length})
                    </span>
                    {hintsRevealed < challenge.hints.length && (
                      <button
                        onClick={revealHint}
                        className="flex items-center gap-1.5 text-xs text-orange-400 hover:text-orange-300 transition-colors"
                      >
                        <Lock size={11} />
                        Reveal hint (-10 XP)
                      </button>
                    )}
                  </div>
                  {hintsRevealed > 0 && (
                    <div className="space-y-1.5">
                      {challenge.hints.slice(0, hintsRevealed).map((hint, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, y: -5 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="p-2.5 rounded-lg bg-orange-500/10 border border-orange-500/20 text-xs text-orange-200 flex items-start gap-2"
                        >
                          <span className="text-orange-400 shrink-0">💡</span>
                          {hint}
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Submit */}
              {!submitted && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={handleSubmit}
                  disabled={!answer.trim() && !selectedOption}
                  className="w-full py-3 rounded-xl font-bold text-white flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  style={{
                    background: "linear-gradient(135deg, #f97316, #ef4444, #dc2626)",
                    boxShadow: "0 0 20px rgba(249,115,22,0.3)",
                  }}
                >
                  <Trophy size={18} />
                  Submit Challenge
                </motion.button>
              )}

              {/* Result */}
              <AnimatePresence>
                {submitted && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ type: "spring" }}
                  >
                    {/* Correct/Incorrect banner */}
                    <div className={`flex items-center gap-3 p-4 rounded-xl mb-4 ${
                      isCorrect
                        ? "bg-green-500/15 border border-green-500/40"
                        : "bg-red-500/15 border border-red-500/40"
                    }`}>
                      {isCorrect ? (
                        <>
                          <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", delay: 0.1 }}
                          >
                            <CheckCircle className="text-green-400" size={28} />
                          </motion.div>
                          <div>
                            <p className="text-green-300 font-bold text-lg">Correct! 🎉</p>
                            <p className="text-green-400 text-sm">+{challenge.xpReward - hintsRevealed * 10} XP earned</p>
                          </div>
                        </>
                      ) : (
                        <>
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            transition={{ type: "spring", delay: 0.1 }}
                          >
                            <XCircle className="text-red-400" size={28} />
                          </motion.div>
                          <div>
                            <p className="text-red-300 font-bold text-lg">Not quite right 😅</p>
                            <p className="text-slate-400 text-sm">Review the explanation below</p>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Correct answer */}
                    <div className="p-3 rounded-xl bg-slate-800/60 border border-slate-700/40 mb-3">
                      <p className="text-xs text-slate-500 font-semibold mb-1.5">✅ Correct Answer:</p>
                      <pre className="text-sm text-slate-200 font-mono whitespace-pre-wrap">{challenge.answer}</pre>
                    </div>

                    {/* Explanation */}
                    <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/30 mb-4">
                      <p className="text-xs text-indigo-400 font-semibold mb-1.5">📖 Explanation:</p>
                      <p className="text-sm text-slate-300 whitespace-pre-wrap leading-relaxed">{challenge.explanation}</p>
                    </div>

                    {/* Next challenge */}
                    <button
                      onClick={() => {
                        const types = CHALLENGE_TABS.map((t) => t.id);
                        const nextIdx = (types.indexOf(activeType) + 1) % types.length;
                        loadChallenge(types[nextIdx]);
                      }}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold text-white bg-gradient-to-r from-indigo-600/60 to-purple-600/60 hover:from-indigo-600/80 hover:to-purple-600/80 border border-indigo-500/30 transition-all"
                    >
                      Next Challenge <ArrowRight size={16} />
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        </div>

        {/* ── Sidebar ────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4">
          {/* Streak Calendar */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Flame className="text-orange-400" size={16} />
              <h3 className="font-semibold text-slate-200 text-sm">Daily Streak</h3>
            </div>
            <div className="flex items-center gap-2 mb-4">
              <span className="text-3xl font-bold text-orange-400">{progress.streak}</span>
              <div>
                <p className="text-slate-300 text-sm font-medium">Day Streak</p>
                <p className="text-slate-500 text-xs">Best: {progress.longestStreak} days</p>
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1">
              {days.map((d) => (
                <div key={d} className="text-center text-[10px] text-slate-500 font-semibold">{d}</div>
              ))}
              {getLast7Days().map((date, i) => {
                const histEntry = history.find((h) => h.date === date);
                const isToday = date === formatDate(today);
                return (
                  <motion.div
                    key={date}
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ delay: i * 0.05 + 0.3 }}
                    className={`aspect-square rounded-lg flex items-center justify-center ${
                      isToday
                        ? "bg-orange-500/40 border-2 border-orange-500/60"
                        : histEntry?.completed
                        ? "bg-orange-500/70"
                        : "bg-slate-800/60"
                    }`}
                  >
                    {histEntry?.completed && <span className="text-[8px]">🔥</span>}
                  </motion.div>
                );
              })}
            </div>
          </motion.div>

          {/* Progress by topic */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-2 mb-3">
              <Star className="text-yellow-400" size={16} />
              <h3 className="font-semibold text-slate-200 text-sm">Your Mastery</h3>
            </div>
            <div className="space-y-2.5">
              {["avl", "hashing", "queue", "recursion", "sorting"].map((topic) => {
                const mastery = progress.topicMastery[topic];
                const score = mastery?.masteryScore ?? 0;
                return (
                  <div key={topic}>
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs text-slate-400 capitalize">{topic}</span>
                      <span className="text-xs text-slate-500">{score}%</span>
                    </div>
                    <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${score}%` }}
                        transition={{ duration: 0.8, delay: 0.5 }}
                        className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-cyan-500"
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </motion.div>

          {/* Challenge History */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.5 }}
            className="glass-card p-4"
          >
            <button
              onClick={() => setShowHistory((v) => !v)}
              className="w-full flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <Calendar className="text-blue-400" size={16} />
                <h3 className="font-semibold text-slate-200 text-sm">Challenge History</h3>
              </div>
              {showHistory ? <ChevronUp size={16} className="text-slate-500" /> : <ChevronDown size={16} className="text-slate-500" />}
            </button>

            <AnimatePresence>
              {showHistory && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="overflow-hidden"
                >
                  <div className="mt-3 space-y-2">
                    {history.slice().reverse().map((item, i) => (
                      <div key={i} className="flex items-center justify-between py-1.5 border-b border-slate-800/60 last:border-0">
                        <div className="flex items-center gap-2">
                          {item.completed
                            ? <CheckCircle size={12} className="text-green-400" />
                            : <XCircle size={12} className="text-slate-600" />}
                          <span className="text-xs text-slate-400">{item.date}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-slate-500 capitalize">{item.challengeType}</span>
                          {item.completed && (
                            <span className="text-[10px] text-yellow-400 font-semibold">+{item.xpEarned} XP</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
