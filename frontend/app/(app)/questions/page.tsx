"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen, Zap, FileText, Brain, Mic, Code2, Filter,
  ChevronDown, ChevronUp, Bookmark, Download, CheckCircle,
  XCircle, Loader2, Sparkles, Star, Eye, EyeOff, RefreshCw,
  Tag, Award
} from "lucide-react";
import { toast } from "sonner";
import { generateQuestions } from "@/lib/api";
import { useProgressStore } from "@/lib/stores/progress-store";
import { useAIStore } from "@/lib/stores/ai-store";
import { DSA_TOPICS, DIFFICULTY_LEVELS, ALL_TOPICS } from "@/lib/constants";

// ─── Types ───────────────────────────────────────────────────────────────────

type TabType = "mcq" | "short" | "long" | "hots" | "viva" | "coding";

interface MCQQuestion {
  question: string;
  options: string[];
  correct: number;
  explanation: string;
  topic?: string;
}

interface ShortQuestion {
  question: string;
  marks: number;
  modelAnswer: string;
  keyPoints?: string[];
  topic?: string;
}

interface LongQuestion {
  question: string;
  marks: number;
  modelAnswer: string;
  sections?: { title: string; content: string }[];
  topic?: string;
}

interface HOTSQuestion {
  question: string;
  hints: string[];
  approach: string;
  topic?: string;
}

interface VivaQuestion {
  question: string;
  answer: string;
  followUp?: string[];
  topic?: string;
}

interface CodingQuestion {
  question: string;
  constraints?: string;
  sampleInput?: string;
  sampleOutput?: string;
  solution?: string;
  complexity?: { time: string; space: string };
  topic?: string;
}

type AnyQuestion = MCQQuestion | ShortQuestion | LongQuestion | HOTSQuestion | VivaQuestion | CodingQuestion;

// ─── Tab Config ───────────────────────────────────────────────────────────────

const TABS: { id: TabType; label: string; icon: React.ReactNode; color: string; apiType: string; desc: string }[] = [
  { id: "mcq",    label: "MCQ",    icon: <CheckCircle className="w-4 h-4" />, color: "indigo",  apiType: "mcq",    desc: "1 Mark each" },
  { id: "short",  label: "Short",  icon: <FileText    className="w-4 h-4" />, color: "cyan",    apiType: "short",  desc: "2M / 3M / 5M" },
  { id: "long",   label: "Long",   icon: <BookOpen    className="w-4 h-4" />, color: "purple",  apiType: "long",   desc: "7M – 15M" },
  { id: "hots",   label: "HOTS",   icon: <Brain       className="w-4 h-4" />, color: "pink",    apiType: "hots",   desc: "Higher Order" },
  { id: "viva",   label: "Viva",   icon: <Mic         className="w-4 h-4" />, color: "amber",   apiType: "viva",   desc: "Oral Questions" },
  { id: "coding", label: "Coding", icon: <Code2       className="w-4 h-4" />, color: "green",   apiType: "coding", desc: "Programming" },
];

const COLOR_MAP: Record<string, string> = {
  indigo: "from-indigo-500 to-indigo-700 border-indigo-500/30 text-indigo-400",
  cyan:   "from-cyan-500 to-cyan-700 border-cyan-500/30 text-cyan-400",
  purple: "from-purple-500 to-purple-700 border-purple-500/30 text-purple-400",
  pink:   "from-pink-500 to-pink-700 border-pink-500/30 text-pink-400",
  amber:  "from-amber-500 to-amber-700 border-amber-500/30 text-amber-400",
  green:  "from-green-500 to-green-700 border-green-500/30 text-green-400",
};

const SHORT_MARKS = [
  { value: "short_2", label: "2 Marks" },
  { value: "short_3", label: "3 Marks" },
  { value: "short_5", label: "5 Marks" },
];

const LONG_MARKS = [
  { value: "long_7",  label: "7 Marks" },
  { value: "long_8",  label: "8 Marks" },
  { value: "long_10", label: "10 Marks" },
  { value: "long_13", label: "13 Marks" },
  { value: "long_15", label: "15 Marks" },
];

// ─── Helper: parse AI response ────────────────────────────────────────────────

function parseQuestions(raw: AnyQuestion[], tab: TabType): AnyQuestion[] {
  if (!Array.isArray(raw)) return [];
  return raw;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MCQCard({ q, idx }: { q: MCQQuestion; idx: number }) {
  const [revealed, setRevealed] = useState(false);
  const [selected, setSelected] = useState<number | null>(null);
  const [bookmarked, setBookmarked] = useState(false);
  const { addXP, recordQuestionAttempt } = useProgressStore();

  const handleSelect = (i: number) => {
    if (revealed) return;
    setSelected(i);
    setRevealed(true);
    const correct = i === q.correct;
    recordQuestionAttempt(correct);
    if (correct) {
      addXP(20);
      toast.success("+20 XP! Correct answer 🎉");
    } else {
      addXP(5);
      toast("Answer revealed. +5 XP", { icon: "📖" });
    }
  };

  const optionLabels = ["A", "B", "C", "D"];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08 }}
      className="glass-card p-5 relative group"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-bold text-indigo-400 bg-indigo-500/10 px-2 py-0.5 rounded-full">
          Q{idx + 1} · 1 Mark
        </span>
        <button
          onClick={() => { setBookmarked(b => !b); if (!bookmarked) toast("Bookmarked!", { icon: "🔖" }); }}
          className={`p-1.5 rounded-lg transition-colors ${bookmarked ? "text-yellow-400" : "text-slate-500 hover:text-yellow-400"}`}
        >
          <Bookmark className="w-4 h-4" fill={bookmarked ? "currentColor" : "none"} />
        </button>
      </div>

      <p className="text-white font-medium mb-4 leading-relaxed">{q.question}</p>

      <div className="space-y-2">
        {(q.options || []).map((opt, i) => {
          let cls = "border-slate-700/50 bg-slate-800/50 hover:border-indigo-500/50 hover:bg-indigo-500/5 cursor-pointer";
          if (revealed && i === q.correct) cls = "border-green-500 bg-green-500/10 text-green-300";
          else if (revealed && i === selected && i !== q.correct) cls = "border-red-500 bg-red-500/10 text-red-300";
          else if (revealed) cls = "border-slate-700/30 bg-slate-800/30 opacity-60 cursor-default";
          return (
            <button
              key={i}
              onClick={() => handleSelect(i)}
              disabled={revealed}
              className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 ${cls}`}
            >
              <span className="w-7 h-7 rounded-lg bg-slate-700/50 flex items-center justify-center text-xs font-bold flex-shrink-0">
                {optionLabels[i]}
              </span>
              <span className="text-sm">{opt}</span>
              {revealed && i === q.correct && <CheckCircle className="w-4 h-4 text-green-400 ml-auto flex-shrink-0" />}
              {revealed && i === selected && i !== q.correct && <XCircle className="w-4 h-4 text-red-400 ml-auto flex-shrink-0" />}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {revealed && q.explanation && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-4 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20"
          >
            <p className="text-xs font-semibold text-indigo-400 mb-1 flex items-center gap-1">
              <Sparkles className="w-3 h-3" /> Explanation
            </p>
            <p className="text-sm text-slate-300">{q.explanation}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {!revealed && (
        <button
          onClick={() => { setRevealed(true); addXP(5); toast("Answer revealed. +5 XP", { icon: "📖" }); }}
          className="mt-4 text-xs text-slate-500 hover:text-indigo-400 flex items-center gap-1 transition-colors"
        >
          <Eye className="w-3 h-3" /> Reveal Answer
        </button>
      )}
    </motion.div>
  );
}

function ShortCard({ q, idx }: { q: ShortQuestion; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const { addXP } = useProgressStore();

  const handleExpand = () => {
    if (!expanded) { addXP(5); toast("Model answer revealed. +5 XP", { icon: "📖" }); }
    setExpanded(e => !e);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08 }}
      className="glass-card p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full">
          Q{idx + 1} · {q.marks} Marks
        </span>
        <div className="flex gap-2">
          <button
            onClick={() => { setBookmarked(b => !b); if (!bookmarked) toast("Bookmarked!", { icon: "🔖" }); }}
            className={`p-1.5 rounded-lg transition-colors ${bookmarked ? "text-yellow-400" : "text-slate-500 hover:text-yellow-400"}`}
          >
            <Bookmark className="w-4 h-4" fill={bookmarked ? "currentColor" : "none"} />
          </button>
        </div>
      </div>
      <p className="text-white font-medium mb-4 leading-relaxed">{q.question}</p>
      <button
        onClick={handleExpand}
        className="flex items-center gap-2 text-sm text-cyan-400 hover:text-cyan-300 transition-colors font-medium"
      >
        {expanded ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
        {expanded ? "Hide Model Answer" : "Show Model Answer"}
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-cyan-500/5 border border-cyan-500/20">
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{q.modelAnswer}</p>
              {q.keyPoints && q.keyPoints.length > 0 && (
                <div className="mt-3 pt-3 border-t border-cyan-500/10">
                  <p className="text-xs font-semibold text-cyan-400 mb-2">Key Points:</p>
                  <ul className="space-y-1">
                    {q.keyPoints.map((pt, i) => (
                      <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                        <Star className="w-3 h-3 text-cyan-400 mt-0.5 flex-shrink-0" />
                        {pt}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function LongCard({ q, idx }: { q: LongQuestion; idx: number }) {
  const [expanded, setExpanded] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const { addXP } = useProgressStore();

  const handleExpand = () => {
    if (!expanded) { addXP(5); toast("Model answer revealed. +5 XP", { icon: "📖" }); }
    setExpanded(e => !e);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08 }}
      className="glass-card p-5"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full">
          Q{idx + 1} · {q.marks} Marks
        </span>
        <button
          onClick={() => { setBookmarked(b => !b); if (!bookmarked) toast("Bookmarked!", { icon: "🔖" }); }}
          className={`p-1.5 rounded-lg transition-colors ${bookmarked ? "text-yellow-400" : "text-slate-500 hover:text-yellow-400"}`}
        >
          <Bookmark className="w-4 h-4" fill={bookmarked ? "currentColor" : "none"} />
        </button>
      </div>
      <p className="text-white font-medium mb-4 leading-relaxed">{q.question}</p>
      <button
        onClick={handleExpand}
        className="flex items-center gap-2 text-sm text-purple-400 hover:text-purple-300 transition-colors font-medium"
      >
        {expanded ? <EyeOff className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
        {expanded ? "Collapse Answer" : "Show Detailed Answer"}
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mt-3 overflow-hidden"
          >
            <div className="p-4 rounded-xl bg-purple-500/5 border border-purple-500/20 space-y-4">
              {q.sections && q.sections.length > 0 ? (
                q.sections.map((sec, i) => (
                  <div key={i}>
                    <h4 className="text-sm font-bold text-purple-300 mb-2">{sec.title}</h4>
                    <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{sec.content}</p>
                  </div>
                ))
              ) : (
                <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{q.modelAnswer}</p>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function HOTSCard({ q, idx }: { q: HOTSQuestion; idx: number }) {
  const [showHints, setShowHints] = useState(false);
  const [showApproach, setShowApproach] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const { addXP } = useProgressStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08 }}
      className="glass-card p-5 border-pink-500/20"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-bold text-pink-400 bg-pink-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Brain className="w-3 h-3" /> HOTS Q{idx + 1}
        </span>
        <button
          onClick={() => { setBookmarked(b => !b); if (!bookmarked) toast("Bookmarked!", { icon: "🔖" }); }}
          className={`p-1.5 rounded-lg transition-colors ${bookmarked ? "text-yellow-400" : "text-slate-500 hover:text-yellow-400"}`}
        >
          <Bookmark className="w-4 h-4" fill={bookmarked ? "currentColor" : "none"} />
        </button>
      </div>
      <p className="text-white font-medium mb-4 leading-relaxed">{q.question}</p>
      <div className="flex gap-2 flex-wrap">
        <button
          onClick={() => { setShowHints(h => !h); if (!showHints) { addXP(5); toast("+5 XP hint revealed", { icon: "💡" }); } }}
          className="text-xs px-3 py-1.5 rounded-lg bg-pink-500/10 text-pink-400 hover:bg-pink-500/20 transition-colors flex items-center gap-1"
        >
          <Sparkles className="w-3 h-3" /> {showHints ? "Hide Hints" : "Show Hints"}
        </button>
        <button
          onClick={() => { setShowApproach(a => !a); if (!showApproach) { addXP(5); toast("+5 XP approach revealed", { icon: "🧠" }); } }}
          className="text-xs px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors flex items-center gap-1"
        >
          <Brain className="w-3 h-3" /> {showApproach ? "Hide Approach" : "Analytical Approach"}
        </button>
      </div>
      <AnimatePresence>
        {showHints && q.hints && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
            <div className="p-3 rounded-xl bg-pink-500/5 border border-pink-500/20">
              <p className="text-xs font-semibold text-pink-400 mb-2">Hints:</p>
              <ul className="space-y-1">
                {q.hints.map((h, i) => (
                  <li key={i} className="flex items-start gap-2 text-xs text-slate-400">
                    <span className="text-pink-400 font-bold">{i + 1}.</span> {h}
                  </li>
                ))}
              </ul>
            </div>
          </motion.div>
        )}
        {showApproach && q.approach && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
            <div className="p-3 rounded-xl bg-purple-500/5 border border-purple-500/20">
              <p className="text-xs font-semibold text-purple-400 mb-2">Analytical Approach:</p>
              <p className="text-sm text-slate-300 leading-relaxed">{q.approach}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function VivaCard({ q, idx }: { q: VivaQuestion; idx: number }) {
  const [revealed, setRevealed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const { addXP } = useProgressStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08 }}
      className="glass-card p-5 border-amber-500/20"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Mic className="w-3 h-3" /> Viva Q{idx + 1}
        </span>
        <button
          onClick={() => { setBookmarked(b => !b); if (!bookmarked) toast("Bookmarked!", { icon: "🔖" }); }}
          className={`p-1.5 rounded-lg transition-colors ${bookmarked ? "text-yellow-400" : "text-slate-500 hover:text-yellow-400"}`}
        >
          <Bookmark className="w-4 h-4" fill={bookmarked ? "currentColor" : "none"} />
        </button>
      </div>
      <p className="text-white font-medium mb-4 leading-relaxed">{q.question}</p>
      <button
        onClick={() => { setRevealed(r => !r); if (!revealed) { addXP(5); toast("Answer revealed. +5 XP", { icon: "📖" }); } }}
        className="flex items-center gap-2 text-sm text-amber-400 hover:text-amber-300 transition-colors font-medium"
      >
        {revealed ? <EyeOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
        {revealed ? "Hide Answer" : "Reveal Answer"}
      </button>
      <AnimatePresence>
        {revealed && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
            <div className="p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <p className="text-sm text-slate-300 leading-relaxed">{q.answer}</p>
              {q.followUp && q.followUp.length > 0 && (
                <div className="mt-3 pt-3 border-t border-amber-500/10">
                  <p className="text-xs font-semibold text-amber-400 mb-2">Follow-up Questions:</p>
                  <ul className="space-y-1">
                    {q.followUp.map((f, i) => (
                      <li key={i} className="text-xs text-slate-400 flex items-start gap-2">
                        <span className="text-amber-400">→</span> {f}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CodingCard({ q, idx }: { q: CodingQuestion; idx: number }) {
  const [revealed, setRevealed] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const { addXP } = useProgressStore();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: idx * 0.08 }}
      className="glass-card p-5 border-green-500/20"
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-xs font-bold text-green-400 bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
          <Code2 className="w-3 h-3" /> Coding Q{idx + 1}
        </span>
        <button
          onClick={() => { setBookmarked(b => !b); if (!bookmarked) toast("Bookmarked!", { icon: "🔖" }); }}
          className={`p-1.5 rounded-lg transition-colors ${bookmarked ? "text-yellow-400" : "text-slate-500 hover:text-yellow-400"}`}
        >
          <Bookmark className="w-4 h-4" fill={bookmarked ? "currentColor" : "none"} />
        </button>
      </div>
      <p className="text-white font-medium mb-3 leading-relaxed">{q.question}</p>
      {q.constraints && (
        <div className="mb-3 p-2 rounded-lg bg-slate-800/50 border border-slate-700/50 text-xs text-slate-400">
          <span className="text-green-400 font-semibold">Constraints: </span>{q.constraints}
        </div>
      )}
      {q.sampleInput && (
        <div className="grid grid-cols-2 gap-2 mb-3">
          <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-700/50">
            <p className="text-xs text-slate-500 mb-1">Sample Input</p>
            <p className="text-xs font-mono text-green-400">{q.sampleInput}</p>
          </div>
          <div className="p-2 rounded-lg bg-slate-900/70 border border-slate-700/50">
            <p className="text-xs text-slate-500 mb-1">Sample Output</p>
            <p className="text-xs font-mono text-cyan-400">{q.sampleOutput}</p>
          </div>
        </div>
      )}
      {q.complexity && (
        <div className="flex gap-2 mb-3">
          <span className="text-xs px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400">⏱ Time: {q.complexity.time}</span>
          <span className="text-xs px-2 py-0.5 rounded bg-purple-500/10 text-purple-400">🧠 Space: {q.complexity.space}</span>
        </div>
      )}
      <button
        onClick={() => { setRevealed(r => !r); if (!revealed) { addXP(10); toast("Solution revealed. +10 XP", { icon: "💻" }); } }}
        className="flex items-center gap-2 text-sm text-green-400 hover:text-green-300 transition-colors font-medium"
      >
        <Code2 className="w-4 h-4" /> {revealed ? "Hide Solution" : "Show Solution"}
      </button>
      <AnimatePresence>
        {revealed && q.solution && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="mt-3 overflow-hidden">
            <pre className="p-4 rounded-xl bg-slate-900/90 border border-green-500/20 text-xs text-green-300 font-mono overflow-x-auto whitespace-pre-wrap">
              {q.solution}
            </pre>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// ─── Filters Panel ────────────────────────────────────────────────────────────

function FiltersPanel({
  tab, topic, setTopic, difficulty, setDifficulty,
  count, setCount, markType, setMarkType,
  onGenerate, loading
}: {
  tab: TabType;
  topic: string; setTopic: (v: string) => void;
  difficulty: string; setDifficulty: (v: string) => void;
  count: number; setCount: (v: number) => void;
  markType: string; setMarkType: (v: string) => void;
  onGenerate: () => void;
  loading: boolean;
}) {
  const selectCls = "w-full bg-slate-800/80 border border-slate-700/50 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/30 transition-all";

  return (
    <div className="glass-card p-5 mb-6">
      <div className="flex items-center gap-2 mb-4">
        <Filter className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-white">Filters</h3>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div>
          <label className="text-xs text-slate-400 mb-1 block">Topic</label>
          <select className={selectCls} value={topic} onChange={e => setTopic(e.target.value)}>
            <option value="all">All Topics</option>
            <optgroup label="Unit 3">
              {DSA_TOPICS.unit3.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </optgroup>
            <optgroup label="Unit 4">
              {DSA_TOPICS.unit4.map(t => <option key={t.id} value={t.name}>{t.name}</option>)}
            </optgroup>
          </select>
        </div>

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Difficulty</label>
          <select className={selectCls} value={difficulty} onChange={e => setDifficulty(e.target.value)}>
            <option value="all">All Levels</option>
            {DIFFICULTY_LEVELS.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
          </select>
        </div>

        {(tab === "short") && (
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Marks</label>
            <select className={selectCls} value={markType} onChange={e => setMarkType(e.target.value)}>
              {SHORT_MARKS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        )}

        {(tab === "long") && (
          <div>
            <label className="text-xs text-slate-400 mb-1 block">Marks</label>
            <select className={selectCls} value={markType} onChange={e => setMarkType(e.target.value)}>
              {LONG_MARKS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </div>
        )}

        <div>
          <label className="text-xs text-slate-400 mb-1 block">Count (1-20)</label>
          <input
            type="number" min={1} max={20}
            className={selectCls}
            value={count}
            onChange={e => setCount(Math.min(20, Math.max(1, Number(e.target.value))))}
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={onGenerate}
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-sm font-semibold hover:from-indigo-500 hover:to-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all glow-primary"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Loading State ────────────────────────────────────────────────────────────

function LoadingState() {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="flex flex-col items-center justify-center py-20 gap-6"
    >
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20" />
        <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-indigo-500 animate-spin" />
        <div className="absolute inset-3 rounded-full border-4 border-transparent border-t-purple-500 animate-spin" style={{ animationDirection: "reverse", animationDuration: "0.8s" }} />
        <Sparkles className="absolute inset-0 m-auto w-6 h-6 text-indigo-400" />
      </div>
      <div className="text-center">
        <p className="text-white font-semibold text-lg">AI is generating your questions...</p>
        <p className="text-slate-400 text-sm mt-1">Crafting exam-quality questions just for you ✨</p>
      </div>
      <div className="flex gap-1">
        {[0, 1, 2].map(i => (
          <motion.div
            key={i}
            animate={{ scale: [1, 1.4, 1] }}
            transition={{ repeat: Infinity, delay: i * 0.2, duration: 0.6 }}
            className="w-2 h-2 rounded-full bg-indigo-500"
          />
        ))}
      </div>
    </motion.div>
  );
}

// ─── Export Helper ─────────────────────────────────────────────────────────────

function downloadAsText(questions: AnyQuestion[], tab: TabType) {
  const lines = questions.map((q, i) => {
    const base = `Q${i + 1}: ${"question" in q ? q.question : ""}\n`;
    if (tab === "mcq") {
      const mq = q as MCQQuestion;
      return base + (mq.options || []).map((o, j) => `  ${["A","B","C","D"][j]}) ${o}`).join("\n") +
        `\nAnswer: ${["A","B","C","D"][mq.correct]}\nExplanation: ${mq.explanation}\n`;
    }
    if (tab === "short" || tab === "long") {
      const sq = q as ShortQuestion;
      return base + `Model Answer: ${sq.modelAnswer}\n`;
    }
    return base;
  });
  const blob = new Blob([lines.join("\n---\n\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = `dsa-${tab}-questions.txt`; a.click();
  URL.revokeObjectURL(url);
  toast.success("Questions downloaded!");
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function QuestionsPage() {
  const [activeTab, setActiveTab] = useState<TabType>("mcq");
  const [questions, setQuestions] = useState<AnyQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [topic, setTopic] = useState("all");
  const [difficulty, setDifficulty] = useState("medium");
  const [count, setCount] = useState(5);
  const [markType, setMarkType] = useState("short_2");

  const { settings } = useAIStore();
  const { addXP } = useProgressStore();

  const getApiType = (tab: TabType, markType: string) => {
    if (tab === "short") return markType;
    if (tab === "long") return markType;
    return tab;
  };

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setQuestions([]);
    try {
      const topicName = topic === "all" ? "DSA Unit 3 and Unit 4" : topic;
      const type = getApiType(activeTab, markType);
      const result = await generateQuestions({
        topicName,
        type,
        difficulty: difficulty === "all" ? "medium" : difficulty,
        count,
        settings,
      });
      const parsed = parseQuestions(result, activeTab);
      setQuestions(parsed);
      addXP(10);
      toast.success(`${parsed.length} questions generated! +10 XP 🎉`);
    } catch (err) {
      toast.error("Failed to generate questions. Check AI settings.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, topic, difficulty, count, markType, settings, addXP]);

  const renderCard = (q: AnyQuestion, i: number) => {
    switch (activeTab) {
      case "mcq":    return <MCQCard    key={i} q={q as MCQQuestion}    idx={i} />;
      case "short":  return <ShortCard  key={i} q={q as ShortQuestion}  idx={i} />;
      case "long":   return <LongCard   key={i} q={q as LongQuestion}   idx={i} />;
      case "hots":   return <HOTSCard   key={i} q={q as HOTSQuestion}   idx={i} />;
      case "viva":   return <VivaCard   key={i} q={q as VivaQuestion}   idx={i} />;
      case "coding": return <CodingCard key={i} q={q as CodingQuestion} idx={i} />;
    }
  };

  const currentTab = TABS.find(t => t.id === activeTab)!;

  return (
    <div className="min-h-screen p-6 md:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 border border-indigo-500/20">
            <BookOpen className="w-6 h-6 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-2xl font-bold gradient-text">Question Bank</h1>
            <p className="text-slate-400 text-sm">AI-powered exam questions for DSA CT preparation</p>
          </div>
        </div>
      </motion.div>

      {/* Tabs */}
      <div className="flex gap-1.5 mb-6 overflow-x-auto pb-2">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => { setActiveTab(tab.id); setQuestions([]); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium transition-all whitespace-nowrap border ${
              activeTab === tab.id
                ? `bg-gradient-to-r ${COLOR_MAP[tab.color].split(" ").slice(0, 2).join(" ")} text-white border-transparent shadow-lg`
                : "bg-slate-800/50 text-slate-400 border-slate-700/50 hover:text-white hover:border-slate-600"
            }`}
          >
            {tab.icon}
            {tab.label}
            <span className={`text-xs opacity-70 ${activeTab === tab.id ? "text-white/70" : ""}`}>
              {tab.desc}
            </span>
          </button>
        ))}
      </div>

      {/* Filters */}
      <FiltersPanel
        tab={activeTab}
        topic={topic} setTopic={setTopic}
        difficulty={difficulty} setDifficulty={setDifficulty}
        count={count} setCount={setCount}
        markType={markType} setMarkType={setMarkType}
        onGenerate={handleGenerate}
        loading={loading}
      />

      {/* Questions or States */}
      <AnimatePresence mode="wait">
        {loading ? (
          <LoadingState />
        ) : questions.length > 0 ? (
          <motion.div key="questions" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            {/* Top bar */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-indigo-400" />
                <span className="text-sm text-slate-300 font-medium">{questions.length} Questions Generated</span>
                <span className="text-xs text-slate-500">· {currentTab.label} · {topic === "all" ? "All Topics" : topic}</span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => downloadAsText(questions, activeTab)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800/80 border border-slate-700/50 text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-all"
                >
                  <Download className="w-3.5 h-3.5" /> Export
                </button>
                <button
                  onClick={handleGenerate}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-xs text-indigo-400 hover:bg-indigo-500/20 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" /> Regenerate
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {questions.map((q, i) => renderCard(q, i))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-20 gap-4"
          >
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
              {currentTab.icon}
            </div>
            <div className="text-center">
              <p className="text-white font-semibold text-lg">{currentTab.label} Questions</p>
              <p className="text-slate-400 text-sm mt-1">
                Set your filters and click <span className="text-indigo-400 font-medium">Generate</span> to get AI-crafted questions
              </p>
              <p className="text-slate-500 text-xs mt-1">Earn +5 XP per question viewed · +20 XP for correct answers</p>
            </div>
            <div className="flex items-center gap-4 mt-2">
              {[{ icon: "🎯", text: "Exam-focused" }, { icon: "🧠", text: "AI-powered" }, { icon: "⚡", text: "Instant" }].map((item, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-slate-500">
                  <span>{item.icon}</span> {item.text}
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
