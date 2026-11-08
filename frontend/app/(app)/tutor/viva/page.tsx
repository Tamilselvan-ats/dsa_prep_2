"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Mic, MicOff, Send, Trophy, Target, Brain, ChevronRight,
  RotateCcw, CheckCircle, XCircle, Clock, TrendingUp, Zap,
  MessageSquare, Award, AlertCircle, BookOpen
} from "lucide-react";
import { toast } from "sonner";
import { useAIStore } from "@/lib/stores/ai-store";
import { useProgressStore } from "@/lib/stores/progress-store";
import { sendChatMessage } from "@/lib/api";
import { ALL_TOPICS } from "@/lib/constants";
import ReactMarkdown from "react-markdown";

// ── Types ──────────────────────────────────────────────────────────────────

type VivaPhase = "setup" | "active" | "results";
type Difficulty = "easy" | "medium" | "hard" | "mixed";
type QuestionStatus = "unanswered" | "correct" | "partial" | "wrong";

interface VivaQuestion {
  id: string;
  question: string;
  expectedAnswer: string;
  hints: string[];
  marks: number;
  topic: string;
}

interface VivaAnswer {
  questionId: string;
  question: string;
  studentAnswer: string;
  feedback: string;
  score: number;
  maxScore: number;
  status: QuestionStatus;
  followUp?: string;
}

interface SessionStats {
  totalScore: number;
  maxScore: number;
  percentage: number;
  correct: number;
  partial: number;
  wrong: number;
  timeSpent: number;
  topicBreakdown: Record<string, { score: number; max: number }>;
  grade: string;
  badge: string;
}

// ── Helpers ─────────────────────────────────────────────────────────────────

const DIFFICULTY_CONFIGS: Record<Difficulty, { label: string; color: string; bg: string; icon: string; marksPerQ: number }> = {
  easy:   { label: "Easy",   color: "text-green-400",  bg: "bg-green-500/10 border-green-500/30",   icon: "🌱", marksPerQ: 2 },
  medium: { label: "Medium", color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/30", icon: "🎯", marksPerQ: 3 },
  hard:   { label: "Hard",   color: "text-orange-400", bg: "bg-orange-500/10 border-orange-500/30", icon: "🔥", marksPerQ: 5 },
  mixed:  { label: "Mixed",  color: "text-purple-400", bg: "bg-purple-500/10 border-purple-500/30", icon: "⚡", marksPerQ: 3 },
};

function getGrade(pct: number): { grade: string; badge: string; color: string } {
  if (pct >= 90) return { grade: "O",  badge: "Outstanding",  color: "text-yellow-400" };
  if (pct >= 75) return { grade: "A+", badge: "Excellent",    color: "text-green-400"  };
  if (pct >= 60) return { grade: "A",  badge: "Good",         color: "text-blue-400"   };
  if (pct >= 50) return { grade: "B",  badge: "Average",      color: "text-cyan-400"   };
  if (pct >= 35) return { grade: "C",  badge: "Pass",         color: "text-orange-400" };
  return                { grade: "F",  badge: "Needs Work",   color: "text-red-400"    };
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function VivaPage() {
  const { settings } = useAIStore();
  const { addXP } = useProgressStore();

  // Phase
  const [phase, setPhase] = useState<VivaPhase>("setup");

  // Setup
  const [selectedTopics, setSelectedTopics] = useState<string[]>(["stack-adt"]);
  const [difficulty, setDifficulty] = useState<Difficulty>("medium");
  const [questionCount, setQuestionCount] = useState(5);

  // Session
  const [questions, setQuestions] = useState<VivaQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<VivaAnswer[]>([]);
  const [userAnswer, setUserAnswer] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [hintIdx, setHintIdx] = useState(0);
  const [timer, setTimer] = useState(0);
  const [sessionTimer, setSessionTimer] = useState(0);
  const [evaluatingAnswer, setEvaluatingAnswer] = useState(false);
  const [currentFeedback, setCurrentFeedback] = useState<VivaAnswer | null>(null);
  const [showFollowUp, setShowFollowUp] = useState(false);

  // Stats
  const [stats, setStats] = useState<SessionStats | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const sessionTimerRef = useRef<NodeJS.Timeout | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const currentQuestion = questions[currentIdx];
  const diffConfig = DIFFICULTY_CONFIGS[difficulty];

  // ── Timer ──────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (phase === "active" && currentQuestion) {
      setTimer(0);
      timerRef.current = setInterval(() => setTimer(t => t + 1), 1000);
      return () => { if (timerRef.current) clearInterval(timerRef.current); };
    }
  }, [phase, currentIdx]);

  useEffect(() => {
    if (phase === "active") {
      sessionTimerRef.current = setInterval(() => setSessionTimer(t => t + 1), 1000);
      return () => { if (sessionTimerRef.current) clearInterval(sessionTimerRef.current); };
    }
  }, [phase]);

  // ── Generate Questions ─────────────────────────────────────────────────────

  const generateVivaQuestions = async () => {
    if (selectedTopics.length === 0) { toast.error("Select at least one topic"); return; }
    setIsLoading(true);

    const topicNames = selectedTopics.map(id => ALL_TOPICS.find(t => t.id === id)?.name || id).join(", ");
    const diffLabel = diffConfig.label;

    const systemPrompt = `You are a strict university professor conducting a viva voce examination for DSA (Data Structures and Algorithms).
Generate exactly ${questionCount} viva questions about: ${topicNames}.
Difficulty: ${diffLabel}.

Return ONLY valid JSON (no markdown, no explanation):
{
  "questions": [
    {
      "id": "q1",
      "question": "Question text here",
      "expectedAnswer": "Detailed expected answer",
      "hints": ["hint1", "hint2"],
      "marks": ${diffConfig.marksPerQ},
      "topic": "Topic name"
    }
  ]
}

Rules:
- For easy: concept definitions, basic operations
- For medium: working mechanism, trace through examples, comparisons  
- For hard: complexity analysis, edge cases, design decisions, optimization
- For mixed: variety of all above
- Each question should be unique and test different aspects
- Expected answers must be comprehensive`;

    try {
      const response = await sendChatMessage(
        [{ role: "user", content: `Generate ${questionCount} viva questions. Return JSON only.` }],
        "viva",
        { ...settings, temperature: 0.7 }
      );

      // Extract JSON
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid response format");
      const parsed = JSON.parse(jsonMatch[0]);

      if (!parsed.questions || !Array.isArray(parsed.questions)) throw new Error("No questions in response");

      setQuestions(parsed.questions);
      setCurrentIdx(0);
      setAnswers([]);
      setTimer(0);
      setSessionTimer(0);
      setCurrentFeedback(null);
      setShowFollowUp(false);
      setPhase("active");
      toast.success(`${parsed.questions.length} viva questions ready! 🎤`);
    } catch (err: any) {
      // Fallback: generate questions locally
      const fallbackQuestions = generateFallbackQuestions(topicNames, questionCount, diffConfig.marksPerQ);
      setQuestions(fallbackQuestions);
      setCurrentIdx(0);
      setAnswers([]);
      setPhase("active");
      toast.warning("Using practice questions (AI unavailable)");
    } finally {
      setIsLoading(false);
    }
  };

  // ── Fallback Questions ─────────────────────────────────────────────────────

  const generateFallbackQuestions = (topics: string, count: number, marks: number): VivaQuestion[] => {
    const pool: VivaQuestion[] = [
      { id: "f1", question: "What is a Stack? List its key operations.", expectedAnswer: "A stack is a linear data structure that follows LIFO (Last In, First Out) principle. Key operations: Push (insert), Pop (remove top), Peek (view top without removing), IsEmpty (check if empty), IsFull (check if full for array implementation).", hints: ["Think LIFO", "What can you do with a stack?"], marks, topic: "Stack ADT" },
      { id: "f2", question: "Explain Infix to Postfix conversion with an example.", expectedAnswer: "Uses a stack to convert expressions. Rules: (1) Print operands directly. (2) Push operators based on precedence. (3) Pop operators with higher/equal precedence before pushing new one. (4) Handle parentheses by popping till '('. Example: A+B*C → ABC*+", hints: ["Use a stack", "Consider operator precedence"], marks, topic: "Expressions" },
      { id: "f3", question: "What is the difference between Linear Queue and Circular Queue?", expectedAnswer: "Linear Queue: simple array, front and rear pointers move forward, wastes space after dequeue (false overflow). Circular Queue: wraps around, uses modulo arithmetic rear = (rear+1)%size, eliminates false overflow, efficiently uses all array positions.", hints: ["Think about memory utilization", "What happens when rear reaches end?"], marks, topic: "Queue ADT" },
      { id: "f4", question: "Explain AVL Tree balance factor and when rotations are needed.", expectedAnswer: "Balance Factor = Height(left subtree) - Height(right subtree). An AVL tree maintains BF ∈ {-1, 0, 1} for every node. If |BF| > 1, tree is unbalanced → rotation needed. LL case: single right rotation. RR case: single left rotation. LR case: left then right rotation. RL case: right then left rotation.", hints: ["Balance factor range is -1 to +1", "Four types of rotations"], marks, topic: "AVL Tree" },
      { id: "f5", question: "Compare chaining and linear probing for collision resolution.", expectedAnswer: "Chaining: uses linked lists at each bucket, never overflows, wastes space for pointers, good for high load factor, O(1+α) average. Linear Probing: open addressing, probes next slot sequentially, clustering problem (primary clustering), memory efficient, performance degrades at high load factor, requires resizing.", hints: ["Think about load factor", "What happens when too many collisions?"], marks, topic: "Collision Resolution" },
      { id: "f6", question: "What is BST deletion? Explain all three cases.", expectedAnswer: "Case 1 (Leaf node): Simply remove the node. Case 2 (One child): Replace node with its child. Case 3 (Two children): Find inorder successor (smallest in right subtree) or inorder predecessor (largest in left subtree), copy its value to current node, then delete the successor/predecessor.", hints: ["Three cases: 0, 1, or 2 children", "Inorder successor for 2-child case"], marks, topic: "BST" },
      { id: "f7", question: "Explain Tower of Hanoi and its time complexity.", expectedAnswer: "Tower of Hanoi: Move n disks from source to destination using auxiliary peg. Rule: Can only move one disk at a time, larger disk cannot be on smaller. Recursive solution: Move n-1 disks to aux, move nth disk to dest, move n-1 from aux to dest. Time complexity: O(2^n), minimum moves = 2^n - 1.", hints: ["Uses recursion", "Think about minimum number of moves"], marks, topic: "Recursion" },
      { id: "f8", question: "What is hashing? Explain division method.", expectedAnswer: "Hashing: technique to map keys to array indices using a hash function for O(1) average access. Division Method: h(k) = k mod m, where m is table size (preferably a prime number far from powers of 2). Simple and fast, but performance depends on key distribution and choice of m.", hints: ["Hash function maps key to index", "Mod operation"], marks, topic: "Hashing" },
    ];

    return pool.slice(0, Math.min(count, pool.length));
  };

  // ── Evaluate Answer ────────────────────────────────────────────────────────

  const handleSubmitAnswer = async () => {
    if (!userAnswer.trim()) { toast.error("Please type your answer"); return; }
    if (!currentQuestion) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setEvaluatingAnswer(true);

    const systemPrompt = `You are a strict but fair DSA professor evaluating a student's viva answer.
Question: ${currentQuestion.question}
Expected Answer: ${currentQuestion.expectedAnswer}
Max Marks: ${currentQuestion.marks}
Student's Answer: ${userAnswer}

Evaluate strictly and return JSON only:
{
  "score": <number 0 to ${currentQuestion.marks}>,
  "feedback": "<2-3 sentence detailed feedback explaining what was correct/missing>",
  "status": "<correct|partial|wrong>",
  "followUp": "<optional follow-up question if answer was partial/wrong>"
}

Scoring: Full marks only if answer is complete and accurate. Partial for partially correct. 0 for wrong/off-topic.`;

    try {
      const response = await sendChatMessage(
        [{ role: "user", content: `Evaluate this viva answer. Return JSON only.` }],
        "viva",
        { ...settings, temperature: 0.3 }
      );

      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) throw new Error("Invalid evaluation response");
      const evaluation = JSON.parse(jsonMatch[0]);

      const answer: VivaAnswer = {
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        studentAnswer: userAnswer,
        feedback: evaluation.feedback || "Answer evaluated.",
        score: Math.min(evaluation.score || 0, currentQuestion.marks),
        maxScore: currentQuestion.marks,
        status: evaluation.status || "wrong",
        followUp: evaluation.followUp,
      };

      setAnswers(prev => [...prev, answer]);
      setCurrentFeedback(answer);
      setShowFollowUp(!!answer.followUp);

      // Award XP
      if (answer.status === "correct") {
        addXP(answer.score * 10, "Viva Correct");
        toast.success(`+${answer.score * 10} XP! 🎯`);
      } else if (answer.status === "partial") {
        addXP(answer.score * 5, "Viva Partial");
      }
    } catch {
      // Fallback evaluation
      const keywords = currentQuestion.expectedAnswer.toLowerCase().split(" ").slice(0, 10);
      const answerLower = userAnswer.toLowerCase();
      const matched = keywords.filter(k => k.length > 4 && answerLower.includes(k)).length;
      const score = Math.round((matched / keywords.length) * currentQuestion.marks);
      const status: QuestionStatus = score >= currentQuestion.marks * 0.7 ? "correct" : score > 0 ? "partial" : "wrong";

      const answer: VivaAnswer = {
        questionId: currentQuestion.id,
        question: currentQuestion.question,
        studentAnswer: userAnswer,
        feedback: `Your answer covered ${matched} out of ${keywords.length} key concepts. Review the expected answer below.`,
        score,
        maxScore: currentQuestion.marks,
        status,
      };

      setAnswers(prev => [...prev, answer]);
      setCurrentFeedback(answer);
      addXP(score * 5, "Viva");
    } finally {
      setEvaluatingAnswer(false);
    }
  };

  // ── Next Question / Finish ─────────────────────────────────────────────────

  const handleNext = () => {
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setUserAnswer("");
      setShowHint(false);
      setHintIdx(0);
      setCurrentFeedback(null);
      setShowFollowUp(false);
      textareaRef.current?.focus();
    } else {
      finishSession();
    }
  };

  const finishSession = useCallback(() => {
    if (sessionTimerRef.current) clearInterval(sessionTimerRef.current);
    if (timerRef.current) clearInterval(timerRef.current);

    const allAnswers = [...answers];
    const totalScore = allAnswers.reduce((sum, a) => sum + a.score, 0);
    const maxScore = allAnswers.reduce((sum, a) => sum + a.maxScore, 0);
    const percentage = maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0;

    const { grade, badge, color } = getGrade(percentage);

    const topicBreakdown: Record<string, { score: number; max: number }> = {};
    allAnswers.forEach((a, i) => {
      const topic = questions[i]?.topic || "General";
      if (!topicBreakdown[topic]) topicBreakdown[topic] = { score: 0, max: 0 };
      topicBreakdown[topic].score += a.score;
      topicBreakdown[topic].max += a.maxScore;
    });

    setStats({
      totalScore,
      maxScore,
      percentage,
      correct: allAnswers.filter(a => a.status === "correct").length,
      partial: allAnswers.filter(a => a.status === "partial").length,
      wrong: allAnswers.filter(a => a.status === "wrong").length,
      timeSpent: sessionTimer,
      topicBreakdown,
      grade,
      badge,
    });

    setPhase("results");
    addXP(percentage >= 75 ? 50 : percentage >= 50 ? 25 : 10, "Viva Session");
  }, [answers, questions, sessionTimer]);

  // ── Reset ──────────────────────────────────────────────────────────────────

  const handleReset = () => {
    setPhase("setup");
    setQuestions([]);
    setCurrentIdx(0);
    setAnswers([]);
    setUserAnswer("");
    setTimer(0);
    setSessionTimer(0);
    setStats(null);
    setCurrentFeedback(null);
    setShowHint(false);
    setHintIdx(0);
  };

  // ── Render: Setup ──────────────────────────────────────────────────────────

  if (phase === "setup") {
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-3xl mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
            <div className="text-6xl mb-4">🎤</div>
            <h1 className="text-3xl font-bold gradient-text mb-2">Viva Trainer</h1>
            <p className="text-slate-400">AI-powered viva voce exam simulation with instant evaluation</p>
          </motion.div>

          {/* Setup Card */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass-card p-6 space-y-6">
            {/* Topics */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" /> Select Topics
              </h3>
              <div className="grid grid-cols-2 gap-2">
                {ALL_TOPICS.map(topic => (
                  <button
                    key={topic.id}
                    onClick={() => {
                      setSelectedTopics(prev =>
                        prev.includes(topic.id) ? prev.filter(id => id !== topic.id) : [...prev, topic.id]
                      );
                    }}
                    className={`text-left px-3 py-2 rounded-lg text-sm transition-all border ${
                      selectedTopics.includes(topic.id)
                        ? "bg-indigo-500/20 border-indigo-500/50 text-indigo-300"
                        : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-500/50"
                    }`}
                  >
                    {topic.name}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mt-2">
                <button onClick={() => setSelectedTopics(ALL_TOPICS.map(t => t.id))} className="text-xs text-indigo-400 hover:text-indigo-300">Select All</button>
                <span className="text-slate-600">|</span>
                <button onClick={() => setSelectedTopics([])} className="text-xs text-slate-400 hover:text-slate-300">Clear</button>
              </div>
            </div>

            {/* Difficulty */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Target className="w-4 h-4 text-orange-400" /> Difficulty Level
              </h3>
              <div className="grid grid-cols-4 gap-2">
                {(Object.keys(DIFFICULTY_CONFIGS) as Difficulty[]).map(diff => {
                  const cfg = DIFFICULTY_CONFIGS[diff];
                  return (
                    <button
                      key={diff}
                      onClick={() => setDifficulty(diff)}
                      className={`p-3 rounded-lg border text-center transition-all ${
                        difficulty === diff ? cfg.bg : "bg-slate-800/50 border-slate-700/50"
                      }`}
                    >
                      <div className="text-xl mb-1">{cfg.icon}</div>
                      <div className={`text-xs font-semibold ${difficulty === diff ? cfg.color : "text-slate-400"}`}>{cfg.label}</div>
                      <div className="text-xs text-slate-500">{cfg.marksPerQ}M/Q</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Question Count */}
            <div>
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Brain className="w-4 h-4 text-purple-400" /> Number of Questions
              </h3>
              <div className="flex gap-2">
                {[3, 5, 8, 10, 15].map(n => (
                  <button
                    key={n}
                    onClick={() => setQuestionCount(n)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all border ${
                      questionCount === n
                        ? "bg-purple-500/20 border-purple-500/50 text-purple-300"
                        : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-500/50"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            {/* Summary */}
            <div className="bg-slate-800/40 rounded-xl p-4 flex items-center justify-between">
              <div className="text-sm text-slate-400">
                <span className="text-slate-200 font-semibold">{selectedTopics.length}</span> topics selected •{" "}
                <span className="text-slate-200 font-semibold">{questionCount}</span> questions •{" "}
                <span className="text-slate-200 font-semibold">{questionCount * diffConfig.marksPerQ}</span> total marks
              </div>
              <button
                onClick={generateVivaQuestions}
                disabled={isLoading || selectedTopics.length === 0}
                className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</>
                ) : (
                  <><Mic className="w-4 h-4" /> Start Viva</>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      </div>
    );
  }

  // ── Render: Active Viva ────────────────────────────────────────────────────

  if (phase === "active" && currentQuestion) {
    const progress = ((currentIdx) / questions.length) * 100;
    const answeredCount = answers.length;

    return (
      <div className="min-h-screen p-6">
        <div className="max-w-3xl mx-auto space-y-4">
          {/* Top Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🎤</div>
              <div>
                <div className="text-sm font-semibold text-slate-200">Viva Trainer</div>
                <div className="text-xs text-slate-500">{diffConfig.icon} {diffConfig.label} • {currentQuestion.topic}</div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="text-center">
                <div className="text-xs text-slate-500">Session</div>
                <div className="text-sm font-mono text-purple-400">{formatTime(sessionTimer)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-slate-500">This Q</div>
                <div className={`text-sm font-mono ${timer > 60 ? "text-orange-400" : "text-cyan-400"}`}>{formatTime(timer)}</div>
              </div>
              <button onClick={finishSession} className="text-xs text-slate-500 hover:text-slate-300 px-3 py-1 rounded-lg border border-slate-700/50 hover:border-slate-500/50">
                End Session
              </button>
            </div>
          </div>

          {/* Progress */}
          <div className="glass-card p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-slate-500">Question {currentIdx + 1} of {questions.length}</span>
              <span className="text-xs text-slate-400">{answeredCount} answered</span>
            </div>
            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          {/* Question Card */}
          <AnimatePresence mode="wait">
            <motion.div
              key={currentIdx}
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -30 }}
              className="glass-card p-6"
            >
              <div className="flex items-start gap-3 mb-4">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-sm font-bold text-indigo-400 shrink-0">
                  Q{currentIdx + 1}
                </div>
                <div>
                  <p className="text-slate-100 font-medium leading-relaxed">{currentQuestion.question}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${diffConfig.bg} ${diffConfig.color}`}>
                      {diffConfig.icon} {diffConfig.label}
                    </span>
                    <span className="text-xs text-slate-500">{currentQuestion.marks} marks</span>
                  </div>
                </div>
              </div>

              {/* Hint */}
              {!currentFeedback && (
                <div className="mb-4">
                  {showHint ? (
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                      <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold mb-1">
                        <AlertCircle className="w-3.5 h-3.5" /> Hint {hintIdx + 1}/{currentQuestion.hints.length}
                      </div>
                      <p className="text-sm text-amber-200">{currentQuestion.hints[hintIdx]}</p>
                      <div className="flex gap-2 mt-2">
                        {hintIdx < currentQuestion.hints.length - 1 && (
                          <button onClick={() => setHintIdx(h => h + 1)} className="text-xs text-amber-400 hover:text-amber-300">
                            Next hint →
                          </button>
                        )}
                        <button onClick={() => setShowHint(false)} className="text-xs text-slate-500 hover:text-slate-400 ml-auto">
                          Hide
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setShowHint(true)}
                      className="text-xs text-amber-400/70 hover:text-amber-400 flex items-center gap-1"
                    >
                      <AlertCircle className="w-3 h-3" /> Show hint (costs 1 mark)
                    </button>
                  )}
                </div>
              )}

              {/* Answer Input */}
              {!currentFeedback ? (
                <>
                  <textarea
                    ref={textareaRef}
                    value={userAnswer}
                    onChange={e => setUserAnswer(e.target.value)}
                    placeholder="Type your answer here... Be thorough and specific."
                    rows={5}
                    className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none leading-relaxed"
                    onKeyDown={e => {
                      if (e.key === "Enter" && e.ctrlKey) handleSubmitAnswer();
                    }}
                  />
                  <div className="flex items-center justify-between mt-3">
                    <span className="text-xs text-slate-600">Ctrl+Enter to submit • {userAnswer.length} chars</span>
                    <button
                      onClick={handleSubmitAnswer}
                      disabled={evaluatingAnswer || !userAnswer.trim()}
                      className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50"
                    >
                      {evaluatingAnswer ? (
                        <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Evaluating...</>
                      ) : (
                        <><Send className="w-4 h-4" /> Submit Answer</>
                      )}
                    </button>
                  </div>
                </>
              ) : (
                /* Feedback */
                <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
                  {/* Score */}
                  <div className={`flex items-center gap-3 p-3 rounded-xl border ${
                    currentFeedback.status === "correct" ? "bg-green-500/10 border-green-500/30" :
                    currentFeedback.status === "partial" ? "bg-yellow-500/10 border-yellow-500/30" :
                    "bg-red-500/10 border-red-500/30"
                  }`}>
                    {currentFeedback.status === "correct" ? <CheckCircle className="w-5 h-5 text-green-400" /> :
                     currentFeedback.status === "partial" ? <AlertCircle className="w-5 h-5 text-yellow-400" /> :
                     <XCircle className="w-5 h-5 text-red-400" />}
                    <div>
                      <div className={`text-sm font-semibold ${
                        currentFeedback.status === "correct" ? "text-green-400" :
                        currentFeedback.status === "partial" ? "text-yellow-400" : "text-red-400"
                      }`}>
                        {currentFeedback.status === "correct" ? "Correct!" :
                         currentFeedback.status === "partial" ? "Partially Correct" : "Incorrect"}
                        {" "} — {currentFeedback.score}/{currentFeedback.maxScore} marks
                      </div>
                    </div>
                  </div>

                  {/* AI Feedback */}
                  <div className="bg-slate-800/50 rounded-xl p-4">
                    <div className="text-xs text-slate-400 font-semibold mb-2 flex items-center gap-1.5">
                      <Brain className="w-3.5 h-3.5 text-purple-400" /> Professor Feedback
                    </div>
                    <p className="text-sm text-slate-300 leading-relaxed">{currentFeedback.feedback}</p>
                  </div>

                  {/* Expected Answer */}
                  <details className="bg-slate-800/30 rounded-xl overflow-hidden">
                    <summary className="px-4 py-3 text-xs font-semibold text-indigo-400 cursor-pointer hover:bg-slate-700/30 flex items-center gap-1.5">
                      <BookOpen className="w-3.5 h-3.5" /> View Expected Answer
                    </summary>
                    <div className="px-4 pb-4">
                      <div className="text-sm text-slate-300 leading-relaxed mt-2 prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{currentQuestion.expectedAnswer}</ReactMarkdown>
                      </div>
                    </div>
                  </details>

                  {/* Follow-up */}
                  {showFollowUp && currentFeedback.followUp && (
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                      <div className="text-xs font-semibold text-purple-400 mb-1 flex items-center gap-1.5">
                        <MessageSquare className="w-3.5 h-3.5" /> Professor Follow-up
                      </div>
                      <p className="text-sm text-purple-200">{currentFeedback.followUp}</p>
                    </div>
                  )}

                  {/* Next */}
                  <button
                    onClick={handleNext}
                    className="w-full flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all"
                  >
                    {currentIdx < questions.length - 1 ? (
                      <><ChevronRight className="w-4 h-4" /> Next Question</>
                    ) : (
                      <><Trophy className="w-4 h-4" /> View Results</>
                    )}
                  </button>
                </motion.div>
              )}
            </motion.div>
          </AnimatePresence>

          {/* Question Dots */}
          <div className="flex gap-1.5 justify-center flex-wrap">
            {questions.map((_, i) => {
              const ans = answers[i];
              return (
                <div
                  key={i}
                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center transition-all ${
                    i === currentIdx ? "bg-indigo-500 text-white scale-110" :
                    ans?.status === "correct" ? "bg-green-500/40 text-green-400" :
                    ans?.status === "partial" ? "bg-yellow-500/40 text-yellow-400" :
                    ans?.status === "wrong" ? "bg-red-500/40 text-red-400" :
                    "bg-slate-700/50 text-slate-500"
                  }`}
                >
                  {i + 1}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Results ────────────────────────────────────────────────────────

  if (phase === "results" && stats) {
    const { grade, badge, color } = getGrade(stats.percentage);
    const scoreColor = stats.percentage >= 75 ? "text-green-400" : stats.percentage >= 50 ? "text-yellow-400" : "text-red-400";

    return (
      <div className="min-h-screen p-6">
        <div className="max-w-3xl mx-auto space-y-5">
          {/* Result Header */}
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 text-center">
            <div className="text-6xl mb-4">
              {stats.percentage >= 90 ? "🏆" : stats.percentage >= 75 ? "🌟" : stats.percentage >= 50 ? "👍" : "💪"}
            </div>
            <h2 className="text-2xl font-bold text-slate-100 mb-1">Viva Complete!</h2>
            <div className={`text-5xl font-black mt-3 mb-1 ${scoreColor}`}>{stats.percentage}%</div>
            <div className={`text-lg font-bold ${color}`}>Grade {stats.grade} — {stats.badge}</div>
            <div className="text-slate-500 text-sm mt-2">
              {stats.totalScore}/{stats.maxScore} marks • {formatTime(stats.timeSpent)} spent
            </div>
          </motion.div>

          {/* Score Breakdown */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-3 gap-3">
            {[
              { label: "Correct", value: stats.correct, color: "text-green-400", bg: "bg-green-500/10 border-green-500/20", icon: <CheckCircle className="w-5 h-5" /> },
              { label: "Partial", value: stats.partial, color: "text-yellow-400", bg: "bg-yellow-500/10 border-yellow-500/20", icon: <AlertCircle className="w-5 h-5" /> },
              { label: "Wrong",   value: stats.wrong,   color: "text-red-400",   bg: "bg-red-500/10 border-red-500/20",     icon: <XCircle className="w-5 h-5" /> },
            ].map(item => (
              <div key={item.label} className={`glass-card p-4 text-center border ${item.bg}`}>
                <div className={`${item.color} flex justify-center mb-2`}>{item.icon}</div>
                <div className={`text-2xl font-bold ${item.color}`}>{item.value}</div>
                <div className="text-xs text-slate-500">{item.label}</div>
              </div>
            ))}
          </motion.div>

          {/* Per-Question Review */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass-card p-5">
            <h3 className="font-semibold text-slate-200 mb-4 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" /> Question Review
            </h3>
            <div className="space-y-3">
              {answers.map((ans, i) => (
                <div key={i} className={`p-4 rounded-xl border ${
                  ans.status === "correct" ? "bg-green-500/5 border-green-500/20" :
                  ans.status === "partial" ? "bg-yellow-500/5 border-yellow-500/20" :
                  "bg-red-500/5 border-red-500/20"
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-400">Q{i + 1} — {questions[i]?.topic}</span>
                    <span className={`text-sm font-bold ${
                      ans.status === "correct" ? "text-green-400" :
                      ans.status === "partial" ? "text-yellow-400" : "text-red-400"
                    }`}>{ans.score}/{ans.maxScore}</span>
                  </div>
                  <p className="text-sm text-slate-300 mb-1">{ans.question}</p>
                  <p className="text-xs text-slate-500">{ans.feedback}</p>
                </div>
              ))}
            </div>
          </motion.div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={handleReset}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-slate-800/60 border border-slate-700/50 text-slate-300 font-semibold hover:bg-slate-700/60 transition-all"
            >
              <RotateCcw className="w-4 h-4" /> New Session
            </button>
            <button
              onClick={() => {
                const topicIds = selectedTopics;
                handleReset();
                setTimeout(() => {
                  setSelectedTopics(topicIds);
                  generateVivaQuestions();
                }, 100);
              }}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all"
            >
              <Zap className="w-4 h-4" /> Retry Same Topics
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
