"use client";
// Short Answer Questions (2M, 3M, 5M) with AI evaluation
import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Send, CheckCircle, Brain, RotateCcw, Zap, ChevronRight } from "lucide-react";
import { toast } from "sonner";
import { useAIStore } from "@/lib/stores/ai-store";
import { useProgressStore } from "@/lib/stores/progress-store";
import { generateQuestions, evaluateAnswer } from "@/lib/api";
import { ALL_TOPICS, DIFFICULTY_LEVELS } from "@/lib/constants";

type MarksType = "2" | "3" | "5";

interface ShortQuestion {
  question: string;
  sampleAnswer: string;
  keyPoints: string[];
  marks: number;
  topic: string;
}

interface EvaluationResult {
  score: number;
  maxScore: number;
  feedback: string;
  missed: string[];
  percentage: number;
}

export default function ShortAnswerPage() {
  const { settings } = useAIStore();
  const { addXP } = useProgressStore();

  const [selectedTopic, setSelectedTopic] = useState(ALL_TOPICS[0].id);
  const [difficulty, setDifficulty] = useState("medium");
  const [marks, setMarks] = useState<MarksType>("3");
  const [count, setCount] = useState(5);

  const [phase, setPhase] = useState<"setup" | "practice" | "done">("setup");
  const [questions, setQuestions] = useState<ShortQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswer, setUserAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [evaluating, setEvaluating] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<{ score: number; max: number }[]>([]);

  const topicName = ALL_TOPICS.find(t => t.id === selectedTopic)?.name || selectedTopic;
  const current = questions[currentIdx];

  const FALLBACK_QUESTIONS: ShortQuestion[] = [
    { question: "Define Stack. List its four primitive operations.", sampleAnswer: "Stack is a linear data structure that follows LIFO (Last In, First Out) principle. Operations: (1) Push – insert element at top. (2) Pop – remove element from top. (3) Peek – view top element without removal. (4) IsEmpty – check if stack is empty.", keyPoints: ["LIFO", "Push", "Pop", "Peek", "IsEmpty"], marks: parseInt(marks), topic: topicName },
    { question: "What is Infix to Postfix conversion? Give the algorithm.", sampleAnswer: "Infix: operators between operands (A+B). Postfix: operators after operands (AB+). Algorithm: Scan L to R. Operands → output. '(' → push. ')' → pop till '('. Operator → pop higher/equal precedence then push.", keyPoints: ["operator placement", "stack usage", "precedence", "parentheses handling"], marks: parseInt(marks), topic: topicName },
    { question: "Explain the difference between Linear Queue and Circular Queue.", sampleAnswer: "Linear Queue: simple array, front/rear move forward, false overflow when rear reaches end. Circular Queue: wraps around using rear=(rear+1)%size, eliminates false overflow, efficiently reuses space.", keyPoints: ["false overflow", "circular wrap-around", "modulo", "space efficiency"], marks: parseInt(marks), topic: topicName },
    { question: "What is Balance Factor in AVL Tree?", sampleAnswer: "Balance Factor (BF) = Height(Left subtree) - Height(Right subtree). For a valid AVL tree, BF must be in {-1, 0, 1} for every node. If |BF| > 1, the tree is unbalanced and rotation(s) are required.", keyPoints: ["formula", "range -1 to 1", "rotation needed when unbalanced"], marks: parseInt(marks), topic: topicName },
    { question: "What is a collision in hashing? Name two resolution techniques.", sampleAnswer: "Collision occurs when two different keys produce the same hash value, mapping to the same array index. Resolution: (1) Chaining – linked list at each bucket. (2) Linear Probing – check next slot sequentially.", keyPoints: ["same hash value", "two keys", "chaining", "linear probing"], marks: parseInt(marks), topic: topicName },
  ];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const raw = await generateQuestions({
        topicName, difficulty, type: `short_${marks}`, count, settings,
      });

      let parsed: ShortQuestion[] = [];
      if (Array.isArray(raw)) {
        parsed = raw.map((q: any) => ({
          question: q.question || q.text || "",
          sampleAnswer: q.sampleAnswer || q.answer || q.modelAnswer || "",
          keyPoints: q.keyPoints || q.points || [],
          marks: parseInt(marks),
          topic: topicName,
        })).filter(q => q.question);
      }

      if (parsed.length === 0) parsed = FALLBACK_QUESTIONS;

      setQuestions(parsed);
      setCurrentIdx(0);
      setUserAnswer("");
      setEvaluation(null);
      setResults([]);
      setPhase("practice");
    } catch {
      setQuestions(FALLBACK_QUESTIONS);
      setCurrentIdx(0);
      setPhase("practice");
      toast.warning("Using practice questions");
    } finally {
      setLoading(false);
    }
  };

  const handleEvaluate = async () => {
    if (!userAnswer.trim()) { toast.error("Write your answer first"); return; }
    setEvaluating(true);
    try {
      const result = await evaluateAnswer({
        question: current.question,
        studentAnswer: userAnswer,
        maxMarks: current.marks,
        settings,
      });

      const eval_: EvaluationResult = {
        score: result.score || 0,
        maxScore: current.marks,
        feedback: result.feedback || "Answer evaluated.",
        missed: result.missed || result.keyPointsMissed || [],
        percentage: Math.round(((result.score || 0) / current.marks) * 100),
      };
      setEvaluation(eval_);
      addXP(eval_.score * 5, "Short Answer");
    } catch {
      // Simple keyword evaluation fallback
      const kw = current.keyPoints || [];
      const matched = kw.filter(k => userAnswer.toLowerCase().includes(k.toLowerCase())).length;
      const score = Math.round((matched / Math.max(kw.length, 1)) * current.marks);
      setEvaluation({ score, maxScore: current.marks, feedback: `Covered ${matched}/${kw.length} key points.`, missed: kw.filter(k => !userAnswer.toLowerCase().includes(k.toLowerCase())), percentage: Math.round((score / current.marks) * 100) });
      addXP(score * 3, "Short Answer");
    } finally {
      setEvaluating(false);
    }
  };

  const handleNext = () => {
    if (evaluation) setResults(prev => [...prev, { score: evaluation.score, max: evaluation.maxScore }]);
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(c => c + 1);
      setUserAnswer("");
      setEvaluation(null);
    } else {
      setPhase("done");
    }
  };

  if (phase === "setup") return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-8">
          <div className="text-5xl mb-3">📝</div>
          <h1 className="text-2xl font-bold gradient-text">Short Answer Practice</h1>
          <p className="text-slate-400 text-sm mt-1">2M, 3M, 5M questions with AI evaluation</p>
        </motion.div>
        <div className="glass-card p-6 space-y-5">
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Topic</label>
            <select value={selectedTopic} onChange={e => setSelectedTopic(e.target.value)} className="w-full bg-slate-800/60 border border-slate-700/50 rounded-xl px-4 py-2.5 text-slate-200 text-sm">
              {ALL_TOPICS.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Question Type</label>
            <div className="flex gap-2">
              {(["2","3","5"] as MarksType[]).map(m => (
                <button key={m} onClick={() => setMarks(m)} className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition-all ${marks === m ? "bg-indigo-500/20 text-indigo-300 border-indigo-500/40" : "bg-slate-800/40 text-slate-500 border-slate-700/40"}`}>
                  {m} Marks
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Difficulty</label>
            <div className="flex gap-2 flex-wrap">
              {DIFFICULTY_LEVELS.map(d => (
                <button key={d.value} onClick={() => setDifficulty(d.value)} className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${difficulty === d.value ? `${d.bg} ${d.color}` : "bg-slate-800/40 text-slate-500 border-slate-700/40"}`}>
                  {d.label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-sm font-medium text-slate-300 mb-2 block">Count</label>
            <div className="flex gap-2">
              {[3,5,8,10].map(n => (
                <button key={n} onClick={() => setCount(n)} className={`px-4 py-2 rounded-lg text-sm border transition-all ${count === n ? "bg-purple-500/20 text-purple-300 border-purple-500/40" : "bg-slate-800/40 text-slate-500 border-slate-700/40"}`}>{n}</button>
              ))}
            </div>
          </div>
          <button onClick={handleGenerate} disabled={loading} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold disabled:opacity-50">
            {loading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating...</> : <><Zap className="w-4 h-4" /> Generate Questions</>}
          </button>
        </div>
      </div>
    </div>
  );

  if (phase === "practice" && current) return (
    <div className="min-h-screen p-6">
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-sm text-slate-400">Q {currentIdx+1}/{questions.length} — {current.marks} Marks</span>
          <span className="text-sm font-semibold text-indigo-400">{topicName}</span>
        </div>
        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
          <motion.div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500" animate={{ width: `${(currentIdx/questions.length)*100}%` }} />
        </div>
        <motion.div key={currentIdx} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-card p-6 space-y-4">
          <div className="flex items-start gap-3">
            <span className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 text-xs font-bold flex items-center justify-center shrink-0">Q{currentIdx+1}</span>
            <p className="text-slate-100 font-medium leading-relaxed">{current.question}</p>
          </div>
          <textarea
            value={userAnswer}
            onChange={e => setUserAnswer(e.target.value)}
            placeholder={`Write your ${current.marks}-mark answer here...`}
            rows={5}
            disabled={!!evaluation}
            className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 text-slate-200 text-sm placeholder-slate-600 focus:outline-none focus:border-indigo-500/50 resize-none disabled:opacity-60"
          />
          {!evaluation ? (
            <button onClick={handleEvaluate} disabled={evaluating || !userAnswer.trim()} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm disabled:opacity-50">
              {evaluating ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Evaluating...</> : <><Send className="w-4 h-4" /> Submit & Evaluate</>}
            </button>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-3">
              <div className={`p-3 rounded-xl border ${evaluation.percentage >= 70 ? "bg-green-500/10 border-green-500/30" : evaluation.percentage >= 40 ? "bg-yellow-500/10 border-yellow-500/30" : "bg-red-500/10 border-red-500/30"}`}>
                <div className={`font-semibold text-sm ${evaluation.percentage >= 70 ? "text-green-400" : evaluation.percentage >= 40 ? "text-yellow-400" : "text-red-400"}`}>
                  {evaluation.score}/{evaluation.maxScore} marks ({evaluation.percentage}%)
                </div>
                <p className="text-sm text-slate-300 mt-1">{evaluation.feedback}</p>
              </div>
              {evaluation.missed.length > 0 && (
                <div className="p-3 bg-slate-800/40 rounded-xl">
                  <div className="text-xs font-semibold text-slate-400 mb-1">Key points missed:</div>
                  <div className="flex flex-wrap gap-1.5">
                    {evaluation.missed.map((p, i) => <span key={i} className="px-2 py-0.5 bg-red-500/10 text-red-300 text-xs rounded-full">{p}</span>)}
                  </div>
                </div>
              )}
              <details className="bg-slate-800/30 rounded-xl overflow-hidden">
                <summary className="px-4 py-2.5 text-xs font-semibold text-indigo-400 cursor-pointer">📖 Sample Answer</summary>
                <div className="px-4 pb-3 text-sm text-slate-300 leading-relaxed">{current.sampleAnswer}</div>
              </details>
              <button onClick={handleNext} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm">
                {currentIdx < questions.length - 1 ? <><ChevronRight className="w-4 h-4" /> Next</> : <>✅ Finish</>}
              </button>
            </motion.div>
          )}
        </motion.div>
      </div>
    </div>
  );

  if (phase === "done") {
    const total = results.reduce((s, r) => s + r.score, 0);
    const max = results.reduce((s, r) => s + r.max, 0);
    const pct = Math.round((total/max)*100);
    return (
      <div className="min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="glass-card p-8 text-center">
            <div className="text-5xl mb-3">{pct >= 75 ? "🏆" : pct >= 50 ? "👍" : "💪"}</div>
            <h2 className="text-xl font-bold text-slate-100">Session Complete!</h2>
            <div className={`text-4xl font-black mt-3 ${pct >= 75 ? "text-green-400" : pct >= 50 ? "text-yellow-400" : "text-red-400"}`}>{total}/{max}</div>
            <div className="text-slate-400 text-sm mt-1">{pct}% score</div>
            <button onClick={() => setPhase("setup")} className="mt-6 flex items-center gap-2 mx-auto px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold text-sm">
              <RotateCcw className="w-4 h-4" /> New Session
            </button>
          </motion.div>
        </div>
      </div>
    );
  }

  return null;
}
