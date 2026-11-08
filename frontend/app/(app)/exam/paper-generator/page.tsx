"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Download, Printer, Eye, EyeOff, Sparkles,
  RefreshCw, ChevronDown, CheckCircle, Clock, BookOpen,
  Target, Award, Settings2, Layers
} from "lucide-react";
import { toast } from "sonner";
import { useAIStore } from "@/lib/stores/ai-store";
import { useProgressStore } from "@/lib/stores/progress-store";
import { generateExamPaper } from "@/lib/api";
import { EXAM_PATTERNS, DSA_TOPICS } from "@/lib/constants";
import ReactMarkdown from "react-markdown";

// ── Types ──────────────────────────────────────────────────────────────────

interface PaperQuestion {
  number: string;
  question: string;
  marks: number;
  topic?: string;
  answer?: string;
  subQuestions?: { part: string; question: string; marks: number; answer?: string }[];
}

interface PaperSection {
  sectionId: string;
  title: string;
  instructions: string;
  questions: PaperQuestion[];
  totalMarks: number;
}

interface GeneratedPaper {
  title: string;
  examCode: string;
  duration: string;
  totalMarks: number;
  unit: string;
  pattern: string;
  instructions: string[];
  sections: PaperSection[];
}

// ── Custom Pattern Config ──────────────────────────────────────────────────

interface CustomSection {
  type: string;
  count: number;
  marks: number;
}

const QUESTION_TYPES_FOR_CUSTOM = [
  { value: "MCQ", label: "MCQ (Objective)" },
  { value: "Short", label: "Short Answer" },
  { value: "Long", label: "Long Answer" },
  { value: "HOTS", label: "HOTS" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

const UNIT_OPTIONS = [
  { value: "unit3", label: "Unit 3 — Stacks, Queues, Recursion" },
  { value: "unit4", label: "Unit 4 — Trees, Hashing" },
  { value: "both", label: "Both Units (3 & 4)" },
];

function downloadPaper(paper: GeneratedPaper, showAnswers: boolean) {
  const lines: string[] = [];
  lines.push(paper.title);
  lines.push(`Exam Code: ${paper.examCode} | Duration: ${paper.duration} | Total Marks: ${paper.totalMarks}`);
  lines.push(`Unit: ${paper.unit} | Pattern: ${paper.pattern}`);
  lines.push("");
  lines.push("GENERAL INSTRUCTIONS:");
  paper.instructions.forEach((inst, i) => lines.push(`${i + 1}. ${inst}`));
  lines.push("");

  paper.sections.forEach(section => {
    lines.push(`${"=".repeat(60)}`);
    lines.push(section.title);
    lines.push(`Instructions: ${section.instructions}`);
    lines.push(`Total Marks: ${section.totalMarks}`);
    lines.push("");

    section.questions.forEach(q => {
      if (q.subQuestions?.length) {
        lines.push(`${q.number}. [${q.marks} Marks]`);
        q.subQuestions.forEach(sq => {
          lines.push(`   ${sq.part}) ${sq.question} [${sq.marks} M]`);
          if (showAnswers && sq.answer) {
            lines.push(`   ANSWER: ${sq.answer}`);
          }
        });
      } else {
        lines.push(`${q.number}. ${q.question} [${q.marks} M]`);
        if (showAnswers && q.answer) {
          lines.push(`   ANSWER: ${q.answer}`);
        }
      }
      lines.push("");
    });
  });

  const content = lines.join("\n");
  const blob = new Blob([content], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${paper.examCode}-${showAnswers ? "with-answers" : "question-paper"}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ── Main Component ──────────────────────────────────────────────────────────

export default function PaperGeneratorPage() {
  const { settings } = useAIStore();
  const { addXP } = useProgressStore();

  const [selectedPattern, setSelectedPattern] = useState("C");
  const [selectedUnit, setSelectedUnit] = useState("both");
  const [showAnswers, setShowAnswers] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [paper, setPaper] = useState<GeneratedPaper | null>(null);
  const [customSections, setCustomSections] = useState<CustomSection[]>([
    { type: "MCQ", count: 10, marks: 1 },
    { type: "Short", count: 5, marks: 5 },
  ]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  const toggleSection = (id: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Generate Paper ─────────────────────────────────────────────────────────

  const handleGenerate = async () => {
    setIsGenerating(true);
    setPaper(null);

    const unitLabel = UNIT_OPTIONS.find(u => u.value === selectedUnit)?.label || selectedUnit;
    const patternData = EXAM_PATTERNS.find(p => p.value === selectedPattern);

    // Build custom pattern details for prompt
    let patternDetails = patternData?.desc || "";
    if (selectedPattern === "E") {
      patternDetails = customSections.map(s => `${s.count} × ${s.type} × ${s.marks}M`).join(" + ");
    }

    const systemPrompt = `You are a DSA professor creating a university exam paper.

Create a complete exam paper with REAL, SPECIFIC questions about DSA concepts.

Configuration:
- Unit/Syllabus: ${unitLabel}
- Pattern: ${selectedPattern === "E" ? "Custom: " + patternDetails : patternData?.label + " — " + patternDetails}
- Subject: Data Structures and Algorithms (DSA)

IMPORTANT: Generate REAL exam questions, not placeholders. Each question must be specific, testable, and appropriate for university level.

Return ONLY valid JSON in this exact format:
{
  "title": "DATA STRUCTURES AND ALGORITHMS — UNIVERSITY EXAMINATION",
  "examCode": "DSA-${selectedPattern}-${selectedUnit.toUpperCase()}",
  "duration": "3 Hours",
  "totalMarks": <total>,
  "unit": "${unitLabel}",
  "pattern": "${selectedPattern === "E" ? "Custom" : patternData?.label}",
  "instructions": [
    "All questions are compulsory unless stated otherwise",
    "Write answers in neat and legible handwriting",
    "Draw neat diagrams wherever necessary",
    "Mobile phones and electronic devices are not permitted"
  ],
  "sections": [
    {
      "sectionId": "A",
      "title": "SECTION A",
      "instructions": "Answer all questions. Each question carries 1 mark.",
      "totalMarks": 20,
      "questions": [
        {
          "number": "1",
          "question": "Which data structure uses LIFO principle? (a) Queue (b) Stack (c) Tree (d) Graph",
          "marks": 1,
          "topic": "Stack",
          "answer": "(b) Stack"
        }
      ]
    }
  ]
}

For Pattern A: 20 MCQ questions with options (a)(b)(c)(d)
For Pattern B: Section A with 10 × 2-mark questions, Section B with 5 × 5-mark questions  
For Pattern C: Section A with 3 × 8-mark questions, Section B with 2 × 13-mark questions (with OR options)
For Pattern D: Section A with 2 × 10-mark questions, Section B with 2 × 15-mark questions (with OR options)
For Custom: Use provided section configuration

Include answer key for all questions.
Generate REAL DSA questions from: ${unitLabel}`;

    try {
      const rawPaper = await generateExamPaper({
        pattern: selectedPattern,
        unit: selectedUnit,
        settings,
      });

      // Try to parse as JSON first
      let parsed: GeneratedPaper;
      if (typeof rawPaper === "object") {
        parsed = rawPaper as GeneratedPaper;
      } else {
        const jsonMatch = rawPaper.match(/\{[\s\S]*\}/);
        if (!jsonMatch) throw new Error("Invalid paper format");
        parsed = JSON.parse(jsonMatch[0]);
      }

      setPaper(parsed);
      setExpandedSections(new Set(parsed.sections.map(s => s.sectionId)));
      addXP(15, "Paper Generated");
      toast.success("Exam paper generated! 📄");
    } catch (err: any) {
      // If backend fails, generate a fallback paper
      const fallback = generateFallbackPaper(selectedPattern, selectedUnit, unitLabel);
      setPaper(fallback);
      setExpandedSections(new Set(fallback.sections.map(s => s.sectionId)));
      toast.warning("Generated offline paper (AI unavailable)");
    } finally {
      setIsGenerating(false);
    }
  };

  // ── Fallback Paper ─────────────────────────────────────────────────────────

  const generateFallbackPaper = (pattern: string, unit: string, unitLabel: string): GeneratedPaper => {
    const mcqQuestions: PaperQuestion[] = [
      { number: "1", question: "Which data structure follows LIFO principle?\n(a) Queue  (b) Stack  (c) Array  (d) Linked List", marks: 1, topic: "Stack", answer: "(b) Stack" },
      { number: "2", question: "What is the time complexity of Push and Pop operations in a stack?\n(a) O(n)  (b) O(log n)  (c) O(1)  (d) O(n²)", marks: 1, topic: "Stack", answer: "(c) O(1)" },
      { number: "3", question: "In Infix to Postfix conversion, which data structure is used?\n(a) Queue  (b) Stack  (c) Tree  (d) Graph", marks: 1, topic: "Expressions", answer: "(b) Stack" },
      { number: "4", question: "What is the postfix form of A+B*C?\n(a) ABC*+  (b) AB+C*  (c) A+BC*  (d) ABC+*", marks: 1, topic: "Expressions", answer: "(a) ABC*+" },
      { number: "5", question: "Tower of Hanoi with n disks requires minimum _____ moves.\n(a) n²  (b) 2n  (c) 2ⁿ-1  (d) n!", marks: 1, topic: "Recursion", answer: "(c) 2ⁿ-1" },
      { number: "6", question: "Circular queue avoids:\n(a) Overflow  (b) Underflow  (c) False overflow  (d) Collision", marks: 1, topic: "Queue", answer: "(c) False overflow" },
      { number: "7", question: "In Round Robin scheduling, what determines how long each process runs?\n(a) Priority  (b) Time Quantum  (c) Arrival Time  (d) Burst Time", marks: 1, topic: "Scheduling", answer: "(b) Time Quantum" },
      { number: "8", question: "The balance factor of an AVL tree node must be in range:\n(a) {-2,-1,0,1,2}  (b) {-1,0,1}  (c) {0,1}  (d) {-1,1}", marks: 1, topic: "AVL Tree", answer: "(b) {-1,0,1}" },
      { number: "9", question: "In BST deletion, what replaces a node with two children?\n(a) Left child  (b) Right child  (c) Inorder successor  (d) Parent", marks: 1, topic: "BST", answer: "(c) Inorder successor" },
      { number: "10", question: "Inorder traversal of BST gives:\n(a) Random order  (b) Sorted ascending  (c) Sorted descending  (d) Level order", marks: 1, topic: "Tree Traversal", answer: "(b) Sorted ascending" },
    ];

    if (pattern === "A") {
      const extra: PaperQuestion[] = [
        { number: "11", question: "Which collision resolution uses linked lists?\n(a) Linear Probing  (b) Quadratic Probing  (c) Chaining  (d) Double Hashing", marks: 1, answer: "(c) Chaining" },
        { number: "12", question: "Division method hash function is h(k) =\n(a) k/m  (b) k mod m  (c) k*m  (d) k²/m", marks: 1, answer: "(b) k mod m" },
        { number: "13", question: "Height of a complete binary tree with n nodes is:\n(a) n  (b) log₂n  (c) ⌊log₂n⌋  (d) n/2", marks: 1, answer: "(c) ⌊log₂n⌋" },
        { number: "14", question: "AVL LL case requires:\n(a) Left rotation  (b) Right rotation  (c) Left-Right rotation  (d) Right-Left rotation", marks: 1, answer: "(b) Right rotation" },
        { number: "15", question: "Deque stands for:\n(a) Double-ended queue  (b) Directed queue  (c) Dynamic queue  (d) Distributed queue", marks: 1, answer: "(a) Double-ended queue" },
        { number: "16", question: "Which tree traversal visits root first?\n(a) Inorder  (b) Postorder  (c) Preorder  (d) Level order", marks: 1, answer: "(c) Preorder" },
        { number: "17", question: "Primary clustering is a problem in:\n(a) Chaining  (b) Linear Probing  (c) Double Hashing  (d) Quadratic Probing", marks: 1, answer: "(b) Linear Probing" },
        { number: "18", question: "Sibling nodes have the same:\n(a) Value  (b) Height  (c) Parent  (d) Depth", marks: 1, answer: "(c) Parent" },
        { number: "19", question: "Stack overflow occurs when:\n(a) Stack is empty and we pop  (b) Stack is full and we push  (c) Stack has one element  (d) Stack is initialized", marks: 1, answer: "(b) Stack is full and we push" },
        { number: "20", question: "In mid-square hashing, the hash is obtained by:\n(a) Squaring and dividing  (b) Squaring the key and extracting middle digits  (c) Adding digits  (d) Multiplying by constant", marks: 1, answer: "(b) Squaring the key and extracting middle digits" },
      ];
      return {
        title: "DATA STRUCTURES AND ALGORITHMS — MODEL EXAMINATION",
        examCode: `DSA-A-${unit.toUpperCase()}`,
        duration: "1 Hour",
        totalMarks: 20,
        unit: unitLabel,
        pattern: "Pattern A",
        instructions: ["All questions are compulsory", "Each question carries 1 mark", "No negative marking", "Choose the most appropriate answer"],
        sections: [{
          sectionId: "A",
          title: "SECTION A — MULTIPLE CHOICE QUESTIONS",
          instructions: "Choose the correct option for each question. Each question carries 1 mark.",
          totalMarks: 20,
          questions: [...mcqQuestions, ...extra],
        }],
      };
    }

    if (pattern === "C") {
      return {
        title: "DATA STRUCTURES AND ALGORITHMS — MODEL EXAMINATION",
        examCode: `DSA-C-${unit.toUpperCase()}`,
        duration: "3 Hours",
        totalMarks: 50,
        unit: unitLabel,
        pattern: "Pattern C",
        instructions: ["Attempt all sections", "Draw neat diagrams wherever necessary", "Each question in Section A carries 8 marks, Section B carries 13 marks"],
        sections: [
          {
            sectionId: "A",
            title: "SECTION A",
            instructions: "Answer all 3 questions. Each question carries 8 marks.",
            totalMarks: 24,
            questions: [
              { number: "1", question: "Explain the operations of a Stack with algorithm and C code for Push and Pop. Show stack state for the sequence: Push(10), Push(20), Push(30), Pop, Push(40), Pop.", marks: 8, topic: "Stack", answer: "Stack uses LIFO principle. Array implementation with top pointer. Push: check full, increment top, insert. Pop: check empty, return top, decrement. Time: O(1) for both." },
              { number: "2", question: "(a) Convert A+B*(C-D)/(E+F) to Postfix using the stack method. Show each step clearly.\n(b) Evaluate the postfix expression: 5 3 2 * + 4 - using stack.", marks: 8, topic: "Expressions", answer: "(a) Postfix: ABCD-*EF+/+ (b) Step through evaluation: push operands, pop and compute for operators." },
              { number: "3", question: "Explain AVL Tree with all 4 rotation cases (LL, RR, LR, RL). Construct an AVL tree by inserting: 30, 20, 40, 10, 25, 35, 50.", marks: 8, topic: "AVL Tree", answer: "AVL maintains balance factor in {-1,0,1}. LL: right rotate. RR: left rotate. LR: left rotate then right rotate. RL: right rotate then left rotate." },
            ],
          },
          {
            sectionId: "B",
            title: "SECTION B",
            instructions: "Answer all 2 questions. Each question carries 13 marks.",
            totalMarks: 26,
            questions: [
              { number: "4", question: "(a) Explain Circular Queue and its operations with implementation. Compare with Linear Queue. [7 marks]\n(b) Explain Priority Queue with an example application. Implement enqueue and dequeue. [6 marks]", marks: 13, topic: "Queue", answer: "Circular queue uses modulo arithmetic. rear = (rear+1)%size. Avoids false overflow. Priority queue: element with highest priority dequeued first." },
              { number: "5", question: "(a) Explain all hashing methods: Division, Multiplication, Mid-Square, Folding, Digit Extraction with examples. [7 marks]\n(b) Compare collision resolution techniques: Chaining, Linear Probing, Quadratic Probing, Double Hashing with time complexities. [6 marks]", marks: 13, topic: "Hashing", answer: "Division: h(k)=k mod m. Multiplication: h(k)=⌊m(kA mod 1)⌋. Mid-Square: square key, extract middle digits. Chaining: linked lists, O(1+α). Linear: sequential probe, clustering issue." },
            ],
          },
        ],
      };
    }

    // Pattern B default
    return {
      title: "DATA STRUCTURES AND ALGORITHMS — MODEL EXAMINATION",
      examCode: `DSA-B-${unit.toUpperCase()}`,
      duration: "2 Hours",
      totalMarks: 45,
      unit: unitLabel,
      pattern: "Pattern B",
      instructions: ["Attempt all sections", "Section A: 2 marks each, Section B: 5 marks each"],
      sections: [
        {
          sectionId: "A",
          title: "SECTION A — SHORT ANSWER QUESTIONS",
          instructions: "Answer all 10 questions. Each carries 2 marks.",
          totalMarks: 20,
          questions: [
            { number: "1", question: "Define Stack. List its four primitive operations.", marks: 2, answer: "Stack: LIFO data structure. Operations: Push, Pop, Peek, IsEmpty." },
            { number: "2", question: "What is Infix expression? Give an example.", marks: 2, answer: "Infix: operator between operands. E.g., A + B * C" },
            { number: "3", question: "Differentiate between Stack overflow and underflow.", marks: 2, answer: "Overflow: push on full stack. Underflow: pop on empty stack." },
            { number: "4", question: "What is recursion? Give its two components.", marks: 2, answer: "Function calling itself. Components: Base case, Recursive case." },
            { number: "5", question: "Define Queue. What is its principle?", marks: 2, answer: "Queue: FIFO (First In First Out) data structure." },
            { number: "6", question: "What is a BST? State its property.", marks: 2, answer: "Binary Search Tree: left child < root < right child for all nodes." },
            { number: "7", question: "What is Balance Factor in AVL Tree?", marks: 2, answer: "BF = Height(Left) - Height(Right). Must be in {-1, 0, 1} for AVL." },
            { number: "8", question: "Define Hashing and Hash Function.", marks: 2, answer: "Hashing maps keys to indices. h(k) gives array position for key k." },
            { number: "9", question: "What is a collision in hashing?", marks: 2, answer: "When two keys map to the same hash table index." },
            { number: "10", question: "What are tree traversal methods?", marks: 2, answer: "Inorder (LNR), Preorder (NLR), Postorder (LRN)." },
          ],
        },
        {
          sectionId: "B",
          title: "SECTION B — DESCRIPTIVE QUESTIONS",
          instructions: "Answer all 5 questions. Each carries 5 marks.",
          totalMarks: 25,
          questions: [
            { number: "11", question: "Explain Infix to Postfix conversion algorithm with a complete example for: (A+B)*(C-D).", marks: 5, answer: "Use operator stack. Scan L-R: operands → output, operators → stack based on precedence. Output: AB+CD-*" },
            { number: "12", question: "Explain Circular Queue operations with algorithm. How does it overcome limitations of linear queue?", marks: 5, answer: "Uses modulo. rear=(rear+1)%size. front=(front+1)%size. Reuses space. Eliminates false overflow." },
            { number: "13", question: "Construct a BST from: 50, 30, 70, 20, 40, 60, 80. Perform Inorder traversal.", marks: 5, answer: "Root=50, left subtree {30,20,40}, right {70,60,80}. Inorder: 20,30,40,50,60,70,80." },
            { number: "14", question: "Explain LR rotation in AVL Tree with an example.", marks: 5, answer: "LR case: BF < -1 and right child has BF > 0. Steps: Right rotate on right child, then Left rotate on node." },
            { number: "15", question: "Compare Linear Probing and Chaining for collision resolution with advantages and disadvantages.", marks: 5, answer: "Linear: sequential, simple, clustering. Chaining: lists, flexible, pointer overhead, better at high load." },
          ],
        },
      ],
    };
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-5xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
              <FileText className="w-6 h-6 text-indigo-400" /> Paper Generator
            </h1>
            <p className="text-slate-400 text-sm mt-1">Generate complete exam papers with answer keys</p>
          </div>
          {paper && (
            <div className="flex gap-2">
              <button
                onClick={() => setShowAnswers(!showAnswers)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-medium border transition-all ${
                  showAnswers ? "bg-green-500/10 border-green-500/30 text-green-400" : "bg-slate-800/50 border-slate-700/50 text-slate-400"
                }`}
              >
                {showAnswers ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                {showAnswers ? "Hide Answers" : "Show Answers"}
              </button>
              <button
                onClick={() => downloadPaper(paper, showAnswers)}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-sm font-medium hover:bg-indigo-500/30 transition-all"
              >
                <Download className="w-4 h-4" /> Download
              </button>
            </div>
          )}
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Config Panel */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="lg:col-span-1 space-y-4">
            {/* Pattern */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" /> Exam Pattern
              </h3>
              <div className="space-y-2">
                {EXAM_PATTERNS.map(p => (
                  <button
                    key={p.value}
                    onClick={() => setSelectedPattern(p.value)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedPattern === p.value
                        ? "bg-indigo-500/15 border-indigo-500/40"
                        : "bg-slate-800/40 border-slate-700/40 hover:border-slate-600/40"
                    }`}
                  >
                    <div className={`text-sm font-semibold ${selectedPattern === p.value ? "text-indigo-300" : "text-slate-300"}`}>
                      {p.label}
                    </div>
                    <div className="text-xs text-slate-500 mt-0.5">{p.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Pattern Config */}
            {selectedPattern === "E" && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="glass-card p-5">
                <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                  <Settings2 className="w-4 h-4 text-purple-400" /> Custom Sections
                </h3>
                <div className="space-y-3">
                  {customSections.map((section, i) => (
                    <div key={i} className="bg-slate-800/40 rounded-lg p-3 space-y-2">
                      <select
                        value={section.type}
                        onChange={e => {
                          const updated = [...customSections];
                          updated[i].type = e.target.value;
                          setCustomSections(updated);
                        }}
                        className="w-full bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-200"
                      >
                        {QUESTION_TYPES_FOR_CUSTOM.map(t => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                      <div className="flex gap-2">
                        <input
                          type="number"
                          min={1} max={30}
                          value={section.count}
                          onChange={e => {
                            const updated = [...customSections];
                            updated[i].count = parseInt(e.target.value) || 1;
                            setCustomSections(updated);
                          }}
                          className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-200"
                          placeholder="Count"
                        />
                        <input
                          type="number"
                          min={1} max={20}
                          value={section.marks}
                          onChange={e => {
                            const updated = [...customSections];
                            updated[i].marks = parseInt(e.target.value) || 1;
                            setCustomSections(updated);
                          }}
                          className="flex-1 bg-slate-900/60 border border-slate-700/50 rounded-lg px-3 py-1.5 text-sm text-slate-200"
                          placeholder="Marks"
                        />
                        <button onClick={() => setCustomSections(prev => prev.filter((_, j) => j !== i))} className="text-red-400 hover:text-red-300 px-2">✕</button>
                      </div>
                      <div className="text-xs text-slate-500">= {section.count * section.marks} marks total</div>
                    </div>
                  ))}
                  <button
                    onClick={() => setCustomSections(prev => [...prev, { type: "Short", count: 5, marks: 3 }])}
                    className="w-full text-xs text-indigo-400 hover:text-indigo-300 py-1 border border-dashed border-indigo-500/30 rounded-lg"
                  >
                    + Add Section
                  </button>
                  <div className="text-xs text-slate-400 text-right font-semibold">
                    Total: {customSections.reduce((s, c) => s + c.count * c.marks, 0)} marks
                  </div>
                </div>
              </motion.div>
            )}

            {/* Unit */}
            <div className="glass-card p-5">
              <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-cyan-400" /> Syllabus Unit
              </h3>
              <div className="space-y-2">
                {UNIT_OPTIONS.map(u => (
                  <button
                    key={u.value}
                    onClick={() => setSelectedUnit(u.value)}
                    className={`w-full text-left p-3 rounded-lg border transition-all ${
                      selectedUnit === u.value
                        ? "bg-cyan-500/10 border-cyan-500/30"
                        : "bg-slate-800/40 border-slate-700/40 hover:border-slate-600/40"
                    }`}
                  >
                    <div className={`text-sm ${selectedUnit === u.value ? "text-cyan-300 font-medium" : "text-slate-400"}`}>
                      {u.label}
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-semibold hover:from-indigo-500 hover:to-purple-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Generating Paper...</>
              ) : (
                <><Sparkles className="w-4 h-4" /> Generate Paper</>
              )}
            </button>
          </motion.div>

          {/* Paper Display */}
          <div className="lg:col-span-2">
            {!paper && !isGenerating && (
              <div className="glass-card p-12 text-center">
                <FileText className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <h3 className="text-slate-400 font-medium mb-2">No paper generated yet</h3>
                <p className="text-slate-600 text-sm">Configure the pattern and unit, then click Generate Paper</p>
              </div>
            )}

            {isGenerating && (
              <div className="glass-card p-12 text-center">
                <div className="w-12 h-12 border-4 border-indigo-500/30 border-t-indigo-500 rounded-full animate-spin mx-auto mb-4" />
                <p className="text-slate-400 font-medium">AI is crafting your exam paper...</p>
                <p className="text-slate-600 text-sm mt-1">Generating real DSA questions</p>
              </div>
            )}

            {paper && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                ref={printRef}
                className="glass-card overflow-hidden"
              >
                {/* Paper Header */}
                <div className="bg-gradient-to-r from-indigo-900/40 to-purple-900/40 border-b border-indigo-500/20 p-6 text-center">
                  <div className="text-xs text-indigo-400 font-semibold uppercase tracking-widest mb-1">University Examination</div>
                  <h2 className="text-lg font-bold text-slate-100">{paper.title}</h2>
                  <div className="flex items-center justify-center gap-6 mt-3 text-sm text-slate-400">
                    <span className="flex items-center gap-1.5"><Target className="w-3.5 h-3.5 text-indigo-400" /> {paper.pattern}</span>
                    <span className="flex items-center gap-1.5"><Clock className="w-3.5 h-3.5 text-cyan-400" /> {paper.duration}</span>
                    <span className="flex items-center gap-1.5"><Award className="w-3.5 h-3.5 text-yellow-400" /> {paper.totalMarks} Marks</span>
                  </div>
                  <div className="text-xs text-slate-500 mt-1">{paper.unit} | {paper.examCode}</div>
                </div>

                {/* Instructions */}
                <div className="p-4 bg-slate-800/30 border-b border-slate-700/30">
                  <div className="text-xs font-semibold text-slate-400 mb-2">GENERAL INSTRUCTIONS:</div>
                  <ol className="list-decimal list-inside space-y-0.5">
                    {paper.instructions.map((inst, i) => (
                      <li key={i} className="text-xs text-slate-400">{inst}</li>
                    ))}
                  </ol>
                </div>

                {/* Sections */}
                <div className="divide-y divide-slate-700/30">
                  {paper.sections.map(section => (
                    <div key={section.sectionId}>
                      {/* Section Header */}
                      <button
                        onClick={() => toggleSection(section.sectionId)}
                        className="w-full flex items-center justify-between p-4 hover:bg-slate-800/20 transition-colors"
                      >
                        <div className="text-left">
                          <div className="font-semibold text-slate-200 text-sm">{section.title}</div>
                          <div className="text-xs text-slate-500 mt-0.5">{section.instructions}</div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-indigo-400 font-semibold">{section.totalMarks} Marks</span>
                          <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${expandedSections.has(section.sectionId) ? "rotate-180" : ""}`} />
                        </div>
                      </button>

                      {/* Questions */}
                      <AnimatePresence>
                        {expandedSections.has(section.sectionId) && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-3">
                              {section.questions.map((q, qi) => (
                                <div key={qi} className="bg-slate-800/20 rounded-xl p-4 border border-slate-700/20">
                                  <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1">
                                      <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-line">
                                        <span className="font-semibold text-indigo-400">Q{q.number}. </span>
                                        {q.question}
                                      </div>
                                      {q.topic && <div className="text-xs text-slate-600 mt-1">Topic: {q.topic}</div>}

                                      {/* Answer Key */}
                                      {showAnswers && q.answer && (
                                        <motion.div
                                          initial={{ opacity: 0 }}
                                          animate={{ opacity: 1 }}
                                          className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg"
                                        >
                                          <div className="text-xs font-semibold text-green-400 mb-1 flex items-center gap-1">
                                            <CheckCircle className="w-3 h-3" /> Answer Key
                                          </div>
                                          <div className="text-xs text-green-200 leading-relaxed">
                                            <ReactMarkdown>{q.answer}</ReactMarkdown>
                                          </div>
                                        </motion.div>
                                      )}
                                    </div>
                                    <span className="text-xs font-bold text-slate-500 whitespace-nowrap shrink-0">[{q.marks}M]</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ))}
                </div>

                {/* Paper Footer */}
                <div className="p-4 bg-slate-800/20 border-t border-slate-700/30 text-center">
                  <div className="text-xs text-slate-600">— End of Paper — {paper.examCode}</div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
