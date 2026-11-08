"use client";
// Pseudocode Tutor — teach step-by-step algorithm design through pseudocode
// Problem Description → Pseudocode → C Code → Complexity → Exam Writing Tips

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Code2, FileText, Zap, RotateCcw, ChevronRight, Copy,
  CheckCircle, Brain, Lightbulb, BookOpen, Target,
  ArrowRight, Play, Layers, Star
} from "lucide-react";
import { toast } from "sonner";
import { useAIStore } from "@/lib/stores/ai-store";
import { useProgressStore } from "@/lib/stores/progress-store";
import { generateAlgorithm } from "@/lib/api";
import { ALL_TOPICS, DSA_TOPICS } from "@/lib/constants";
import ReactMarkdown from "react-markdown";

// ── Types ──────────────────────────────────────────────────────────────────

type ConversionMode = "problem_to_pseudo" | "pseudo_to_code" | "code_to_pseudo" | "pseudo_to_flowchart";
type TeachStep = "concept" | "pseudocode" | "code" | "analysis" | "tips";

interface AlgorithmResult {
  output: string;
  explanation: string;
  timeComplexity: string;
  spaceComplexity: string;
  keySteps: string[];
  examTips: string[];
}

interface PrebuiltExample {
  title: string;
  topic: string;
  pseudocode: string;
  cCode: string;
  complexity: string;
  examTips: string[];
}

// ── Prebuilt DSA Examples ──────────────────────────────────────────────────

const PREBUILT_EXAMPLES: PrebuiltExample[] = [
  {
    title: "Stack Push Operation",
    topic: "Stack ADT",
    pseudocode: `PROCEDURE Push(stack, item)
  IF stack.top == MAXSIZE - 1 THEN
    PRINT "Stack Overflow"
    RETURN
  END IF
  stack.top ← stack.top + 1
  stack.data[stack.top] ← item
  PRINT "Pushed:", item
END PROCEDURE`,
    cCode: `void push(int stack[], int *top, int item) {
    if (*top == MAXSIZE - 1) {
        printf("Stack Overflow\\n");
        return;
    }
    (*top)++;
    stack[*top] = item;
    printf("Pushed: %d\\n", item);
}`,
    complexity: "Time: O(1) | Space: O(1)",
    examTips: ["Always check overflow before push", "top starts at -1 (empty stack)", "MAXSIZE is array bound"],
  },
  {
    title: "Infix to Postfix Conversion",
    topic: "Expressions",
    pseudocode: `PROCEDURE InfixToPostfix(infix)
  Initialize empty stack S and empty string postfix
  FOR each character ch in infix DO
    IF ch is an OPERAND THEN
      Append ch to postfix
    ELSE IF ch == '(' THEN
      Push '(' onto S
    ELSE IF ch == ')' THEN
      WHILE S is not empty AND S.top != '(' DO
        Pop from S, Append to postfix
      END WHILE
      Pop '(' from S (discard)
    ELSE (ch is an OPERATOR)
      WHILE S is not empty AND priority(S.top) >= priority(ch) DO
        Pop from S, Append to postfix
      END WHILE
      Push ch onto S
    END IF
  END FOR
  WHILE S is not empty DO
    Pop from S, Append to postfix
  END WHILE
  RETURN postfix
END PROCEDURE`,
    cCode: `char* infixToPostfix(char* infix) {
    char stack[100]; int top = -1;
    char* postfix = malloc(100);
    int pi = 0;
    for (int i = 0; infix[i]; i++) {
        char ch = infix[i];
        if (isalpha(ch) || isdigit(ch)) {
            postfix[pi++] = ch;
        } else if (ch == '(') {
            stack[++top] = ch;
        } else if (ch == ')') {
            while (top >= 0 && stack[top] != '(')
                postfix[pi++] = stack[top--];
            if (top >= 0) top--; // pop '('
        } else {
            while (top >= 0 && precedence(stack[top]) >= precedence(ch))
                postfix[pi++] = stack[top--];
            stack[++top] = ch;
        }
    }
    while (top >= 0) postfix[pi++] = stack[top--];
    postfix[pi] = '\\0';
    return postfix;
}`,
    complexity: "Time: O(n) | Space: O(n)",
    examTips: ["Scan left to right", "Operand → output immediately", "Operator → check precedence before push", "'(' → push, ')' → pop till '('", "Pop all remaining at end"],
  },
  {
    title: "BST Insertion",
    topic: "Binary Search Tree",
    pseudocode: `FUNCTION Insert(root, key) RETURNS node
  IF root == NULL THEN
    CREATE new node with key
    RETURN new node
  END IF
  
  IF key < root.data THEN
    root.left ← Insert(root.left, key)
  ELSE IF key > root.data THEN
    root.right ← Insert(root.right, key)
  ELSE
    PRINT "Duplicate! Not inserted."
  END IF
  
  RETURN root
END FUNCTION`,
    cCode: `struct Node* insert(struct Node* root, int key) {
    if (root == NULL) {
        struct Node* node = malloc(sizeof(struct Node));
        node->data = key;
        node->left = node->right = NULL;
        return node;
    }
    if (key < root->data)
        root->left = insert(root->left, key);
    else if (key > root->data)
        root->right = insert(root->right, key);
    // Duplicate: do nothing
    return root;
}`,
    complexity: "Time: O(h) avg O(log n), worst O(n) | Space: O(h) recursive stack",
    examTips: ["Recursive approach is cleaner", "Return root to maintain tree structure", "Handle NULL (base case) first", "Duplicates typically ignored in BST"],
  },
  {
    title: "AVL Tree Left Rotation (LL Case)",
    topic: "AVL Tree",
    pseudocode: `FUNCTION LeftRotate(x) RETURNS node
  y ← x.right        // y becomes new root
  T2 ← y.left        // T2 is y's left subtree
  
  // Perform rotation
  y.left ← x         // x becomes y's left child
  x.right ← T2       // T2 becomes x's right child
  
  // Update heights
  x.height ← 1 + MAX(height(x.left), height(x.right))
  y.height ← 1 + MAX(height(y.left), height(y.right))
  
  RETURN y            // y is new root
END FUNCTION`,
    cCode: `struct Node* leftRotate(struct Node* x) {
    struct Node* y = x->right;
    struct Node* T2 = y->left;
    
    // Perform rotation
    y->left = x;
    x->right = T2;
    
    // Update heights
    x->height = 1 + max(height(x->left), height(x->right));
    y->height = 1 + max(height(y->left), height(y->right));
    
    return y; // new root
}`,
    complexity: "Time: O(1) | Space: O(1)",
    examTips: ["RR case → Left rotation on unbalanced node", "Save x.right as y before rotation", "y.left goes to x.right (T2 reassignment)", "Update heights bottom-up after rotation"],
  },
  {
    title: "Linear Probing",
    topic: "Hashing / Collision",
    pseudocode: `PROCEDURE Insert_LinearProbing(table, key)
  index ← h(key) = key MOD tableSize
  
  WHILE table[index] is not EMPTY DO
    IF table[index] == key THEN
      PRINT "Already exists"
      RETURN
    END IF
    index ← (index + 1) MOD tableSize  // probe next
  END WHILE
  
  table[index] ← key
  PRINT "Inserted at", index
END PROCEDURE

FUNCTION Search_LinearProbing(table, key) RETURNS index
  startIndex ← h(key)
  index ← startIndex
  WHILE table[index] != EMPTY DO
    IF table[index] == key THEN
      RETURN index
    END IF
    index ← (index + 1) MOD tableSize
    IF index == startIndex THEN  // full circle
      RETURN -1
    END IF
  END WHILE
  RETURN -1
END FUNCTION`,
    cCode: `void insert(int table[], int key, int size) {
    int index = key % size;
    while (table[index] != -1) { // -1 = empty
        if (table[index] == key) { 
            printf("Already exists\\n"); 
            return; 
        }
        index = (index + 1) % size;
    }
    table[index] = key;
    printf("Inserted at %d\\n", index);
}

int search(int table[], int key, int size) {
    int start = key % size;
    int index = start;
    while (table[index] != -1) {
        if (table[index] == key) return index;
        index = (index + 1) % size;
        if (index == start) return -1; // full circle
    }
    return -1;
}`,
    complexity: "Time: O(1) avg, O(n) worst | Space: O(n)",
    examTips: ["Use -1 or sentinel for empty slots", "Modulo ensures circular probing", "Stop when empty OR full circle", "Primary clustering: consecutive runs slow search"],
  },
  {
    title: "Tower of Hanoi",
    topic: "Recursion",
    pseudocode: `PROCEDURE Hanoi(n, source, destination, auxiliary)
  IF n == 1 THEN
    PRINT "Move disk 1 from", source, "to", destination
    RETURN
  END IF
  
  // Move n-1 disks from source to auxiliary using destination
  Hanoi(n-1, source, auxiliary, destination)
  
  // Move the nth (largest) disk from source to destination
  PRINT "Move disk", n, "from", source, "to", destination
  
  // Move n-1 disks from auxiliary to destination using source
  Hanoi(n-1, auxiliary, destination, source)
END PROCEDURE`,
    cCode: `void hanoi(int n, char source, char dest, char aux) {
    if (n == 1) {
        printf("Move disk 1 from %c to %c\\n", source, dest);
        return;
    }
    hanoi(n-1, source, aux, dest);
    printf("Move disk %d from %c to %c\\n", n, source, dest);
    hanoi(n-1, aux, dest, source);
}`,
    complexity: "Time: O(2ⁿ) | Space: O(n) for recursion stack | Min moves: 2ⁿ-1",
    examTips: ["Base case: n=1, move directly", "Recursive structure: n-1, then 1, then n-1", "Total moves always 2ⁿ-1", "Cannot be optimized — it's the minimum"],
  },
];

// ── Main Component ──────────────────────────────────────────────────────────

export default function PseudocodeTutorPage() {
  const { settings } = useAIStore();
  const { addXP } = useProgressStore();

  const [mode, setMode] = useState<ConversionMode>("problem_to_pseudo");
  const [inputText, setInputText] = useState("");
  const [result, setResult] = useState<AlgorithmResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [selectedExample, setSelectedExample] = useState<PrebuiltExample | null>(null);
  const [activeTab, setActiveTab] = useState<TeachStep>("pseudocode");

  const MODE_CONFIG: Record<ConversionMode, { label: string; inputLabel: string; icon: string; placeholder: string; desc: string }> = {
    problem_to_pseudo: {
      label: "Problem → Pseudocode",
      icon: "📝",
      desc: "Describe a problem, get structured pseudocode",
      inputLabel: "Problem Description",
      placeholder: "Example: Design an algorithm to insert a node into a Binary Search Tree. The tree uses a struct with left, right, and data fields.",
    },
    pseudo_to_code: {
      label: "Pseudocode → C Code",
      icon: "💻",
      desc: "Convert pseudocode to actual C implementation",
      inputLabel: "Pseudocode",
      placeholder: "Paste your pseudocode here...\n\nExample:\nPROCEDURE Push(stack, top, item)\n  IF top == MAXSIZE-1 THEN\n    PRINT Overflow\n  ELSE\n    top = top + 1\n    stack[top] = item\n  END IF\nEND PROCEDURE",
    },
    code_to_pseudo: {
      label: "C Code → Pseudocode",
      icon: "📋",
      desc: "Convert C code to clean exam-style pseudocode",
      inputLabel: "C Code",
      placeholder: "Paste your C code here...\n\nvoid push(int stack[], int *top, int item) {\n    if (*top == MAXSIZE - 1) {\n        printf(\"Overflow\\n\");\n    } else {\n        (*top)++;\n        stack[*top] = item;\n    }\n}",
    },
    pseudo_to_flowchart: {
      label: "Pseudocode → Flowchart",
      icon: "🔷",
      desc: "Get a text-based flowchart description from pseudocode",
      inputLabel: "Pseudocode",
      placeholder: "Paste pseudocode to get a flowchart description suitable for drawing in exams...",
    },
  };

  const currentMode = MODE_CONFIG[mode];

  const handleConvert = async () => {
    if (!inputText.trim()) { toast.error("Enter input text first"); return; }
    setLoading(true);
    setResult(null);
    try {
      const res = await generateAlgorithm({
        input: inputText,
        inputType: mode.split("_to_")[0].replace(/_/g, " "),
        outputType: mode.split("_to_")[1].replace(/_/g, " "),
        settings,
      });

      if (res && typeof res === "object") {
        setResult(res as AlgorithmResult);
      } else {
        setResult({ output: res as string, explanation: "", timeComplexity: "", spaceComplexity: "", keySteps: [], examTips: [] });
      }
      addXP(10, "Pseudocode");
    } catch {
      // Simple fallback
      setResult({
        output: `/* AI unavailable — here's a template */\n\nPROCEDURE Algorithm(input)\n  // Step 1: Validate input\n  IF input is invalid THEN RETURN error\n  \n  // Step 2: Initialize\n  Initialize data structures\n  \n  // Step 3: Process\n  FOR each element in input DO\n    Process element\n  END FOR\n  \n  // Step 4: Return result\n  RETURN result\nEND PROCEDURE`,
        explanation: "AI is unavailable. Configure your API key in Settings to get AI-generated pseudocode.",
        timeComplexity: "O(n)",
        spaceComplexity: "O(n)",
        keySteps: ["Validate input", "Initialize structures", "Process elements", "Return result"],
        examTips: ["Always start with base case / input validation", "Use clear variable names", "Show complexity at the end"],
      });
      toast.warning("AI unavailable — showing template");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
      toast.success("Copied!");
    } catch {
      toast.error("Copy failed");
    }
  };

  const handleExampleSelect = (ex: PrebuiltExample) => {
    setSelectedExample(ex);
    setActiveTab("pseudocode");
    setResult(null);
  };

  return (
    <div className="min-h-screen p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold gradient-text flex items-center gap-2">
              <Code2 className="w-6 h-6 text-cyan-400" /> Pseudocode Tutor
            </h1>
            <p className="text-slate-400 text-sm mt-1">
              Master algorithm design through pseudocode • Problem → Pseudocode → C Code → Exam Writing
            </p>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Converter */}
          <div className="lg:col-span-2 space-y-4">
            {/* Mode Selector */}
            <div className="glass-card p-4">
              <div className="grid grid-cols-2 gap-2">
                {(Object.entries(MODE_CONFIG) as [ConversionMode, typeof MODE_CONFIG[ConversionMode]][]).map(([m, cfg]) => (
                  <button
                    key={m}
                    onClick={() => { setMode(m); setResult(null); setInputText(""); }}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      mode === m
                        ? "bg-cyan-500/10 border-cyan-500/40"
                        : "bg-slate-800/40 border-slate-700/40 hover:border-slate-600/40"
                    }`}
                  >
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-base">{cfg.icon}</span>
                      <span className={`text-sm font-semibold ${mode === m ? "text-cyan-300" : "text-slate-400"}`}>{cfg.label}</span>
                    </div>
                    <div className="text-xs text-slate-600">{cfg.desc}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Input */}
            <div className="glass-card p-5">
              <label className="text-sm font-semibold text-slate-300 mb-2 block flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" /> {currentMode.inputLabel}
              </label>
              <textarea
                value={inputText}
                onChange={e => setInputText(e.target.value)}
                placeholder={currentMode.placeholder}
                rows={8}
                className="w-full bg-slate-900/60 border border-slate-700/50 rounded-xl p-4 text-slate-200 text-sm font-mono placeholder-slate-700 focus:outline-none focus:border-cyan-500/50 resize-none leading-relaxed"
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs text-slate-600">{inputText.length} chars</span>
                <button
                  onClick={handleConvert}
                  disabled={loading || !inputText.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-600 to-indigo-600 text-white font-semibold text-sm hover:from-cyan-500 hover:to-indigo-500 transition-all disabled:opacity-50"
                >
                  {loading ? (
                    <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Converting...</>
                  ) : (
                    <><Play className="w-4 h-4" /> Convert</>
                  )}
                </button>
              </div>
            </div>

            {/* Output */}
            <AnimatePresence>
              {result && (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-card p-5 space-y-4">
                  {/* Output */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-cyan-400 flex items-center gap-1.5">
                        <Code2 className="w-4 h-4" /> Output
                      </span>
                      <button onClick={() => handleCopy(result.output, "output")}
                        className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1 px-2 py-1 border border-slate-700/50 rounded-lg"
                      >
                        {copied === "output" ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
                        {copied === "output" ? "Copied!" : "Copy"}
                      </button>
                    </div>
                    <pre className="bg-slate-900/80 border border-slate-700/40 rounded-xl p-4 text-sm text-cyan-200 font-mono whitespace-pre-wrap overflow-x-auto leading-relaxed">
                      {result.output}
                    </pre>
                  </div>

                  {/* Explanation */}
                  {result.explanation && (
                    <div className="bg-slate-800/40 rounded-xl p-4">
                      <div className="text-xs font-semibold text-purple-400 mb-2 flex items-center gap-1.5">
                        <Brain className="w-3.5 h-3.5" /> Explanation
                      </div>
                      <div className="text-sm text-slate-300 leading-relaxed prose prose-invert prose-sm max-w-none">
                        <ReactMarkdown>{result.explanation}</ReactMarkdown>
                      </div>
                    </div>
                  )}

                  {/* Complexity */}
                  {(result.timeComplexity || result.spaceComplexity) && (
                    <div className="grid grid-cols-2 gap-3">
                      {result.timeComplexity && (
                        <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-3 text-center">
                          <div className="text-xs text-green-400 font-semibold mb-1">Time Complexity</div>
                          <div className="text-sm font-mono text-green-300 font-bold">{result.timeComplexity}</div>
                        </div>
                      )}
                      {result.spaceComplexity && (
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-3 text-center">
                          <div className="text-xs text-blue-400 font-semibold mb-1">Space Complexity</div>
                          <div className="text-sm font-mono text-blue-300 font-bold">{result.spaceComplexity}</div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Key Steps */}
                  {result.keySteps && result.keySteps.length > 0 && (
                    <div className="bg-slate-800/30 rounded-xl p-4">
                      <div className="text-xs font-semibold text-slate-400 mb-2 flex items-center gap-1.5">
                        <Layers className="w-3.5 h-3.5" /> Key Algorithmic Steps
                      </div>
                      <div className="space-y-1.5">
                        {result.keySteps.map((step, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-slate-300">
                            <span className="text-cyan-500 font-bold shrink-0">{i + 1}.</span> {step}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Exam Tips */}
                  {result.examTips && result.examTips.length > 0 && (
                    <div className="bg-yellow-500/10 border border-yellow-500/20 rounded-xl p-4">
                      <div className="text-xs font-semibold text-yellow-400 mb-2 flex items-center gap-1.5">
                        <Star className="w-3.5 h-3.5" /> Exam Writing Tips
                      </div>
                      <div className="space-y-1.5">
                        {result.examTips.map((tip, i) => (
                          <div key={i} className="flex items-start gap-2 text-xs text-yellow-200">
                            <ArrowRight className="w-3 h-3 mt-0.5 shrink-0" /> {tip}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </motion.div>
              )}
            </AnimatePresence>

            {/* Selected Example Detail */}
            {selectedExample && !result && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass-card overflow-hidden">
                <div className="flex items-center justify-between p-4 border-b border-slate-700/30">
                  <div>
                    <h3 className="font-semibold text-slate-200">{selectedExample.title}</h3>
                    <div className="text-xs text-slate-500">{selectedExample.topic}</div>
                  </div>
                  <button onClick={() => setSelectedExample(null)} className="text-slate-500 hover:text-slate-300 text-xs">✕ Close</button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-700/30">
                  {(["pseudocode", "code", "analysis", "tips"] as TeachStep[]).map(tab => (
                    <button key={tab} onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2.5 text-xs font-semibold capitalize transition-colors ${
                        activeTab === tab ? "text-cyan-400 border-b-2 border-cyan-500" : "text-slate-500 hover:text-slate-400"
                      }`}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="p-4">
                  {activeTab === "pseudocode" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-cyan-400">Pseudocode</span>
                        <button onClick={() => handleCopy(selectedExample.pseudocode, "pseudo")}
                          className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1"
                        >
                          {copied === "pseudo" ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />} Copy
                        </button>
                      </div>
                      <pre className="bg-slate-900/80 rounded-xl p-4 text-sm font-mono text-cyan-200 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                        {selectedExample.pseudocode}
                      </pre>
                      <button onClick={() => { setInputText(selectedExample.pseudocode); setMode("pseudo_to_code"); setSelectedExample(null); }}
                        className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 mt-2"
                      >
                        <ChevronRight className="w-3 h-3" /> Convert to C Code →
                      </button>
                    </div>
                  )}
                  {activeTab === "code" && (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-semibold text-green-400">C Implementation</span>
                        <button onClick={() => handleCopy(selectedExample.cCode, "code")} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-1">
                          {copied === "code" ? <CheckCircle className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />} Copy
                        </button>
                      </div>
                      <pre className="bg-slate-900/80 rounded-xl p-4 text-sm font-mono text-green-200 whitespace-pre-wrap overflow-x-auto leading-relaxed">
                        {selectedExample.cCode}
                      </pre>
                    </div>
                  )}
                  {activeTab === "analysis" && (
                    <div className="space-y-3">
                      <div className="text-sm font-mono text-blue-300 bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 text-center">
                        {selectedExample.complexity}
                      </div>
                    </div>
                  )}
                  {activeTab === "tips" && (
                    <div className="space-y-2">
                      {selectedExample.examTips.map((tip, i) => (
                        <div key={i} className="flex items-start gap-2 text-sm text-yellow-200 bg-yellow-500/10 rounded-lg px-3 py-2">
                          <ArrowRight className="w-3.5 h-3.5 text-yellow-500 mt-0.5 shrink-0" /> {tip}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </div>

          {/* Right Sidebar: Examples */}
          <div className="space-y-4">
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-4">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-semibold text-slate-300">Pre-built DSA Examples</h3>
              </div>
              <div className="space-y-2">
                {PREBUILT_EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => handleExampleSelect(ex)}
                    className={`w-full text-left p-3 rounded-xl border transition-all ${
                      selectedExample?.title === ex.title
                        ? "bg-indigo-500/15 border-indigo-500/40"
                        : "bg-slate-800/40 border-slate-700/40 hover:border-slate-600/40"
                    }`}
                  >
                    <div className={`text-sm font-medium ${selectedExample?.title === ex.title ? "text-indigo-300" : "text-slate-300"}`}>
                      {ex.title}
                    </div>
                    <div className="text-xs text-slate-600 mt-0.5">{ex.topic}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Writing Guide */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Target className="w-4 h-4 text-orange-400" />
                <h3 className="text-sm font-semibold text-slate-300">Exam Pseudocode Rules</h3>
              </div>
              <div className="space-y-2 text-xs text-slate-400">
                {[
                  "Use CAPITALS for keywords (IF, WHILE, FOR)",
                  "Indent properly to show structure",
                  "Use ← for assignment, not =",
                  "Start with PROCEDURE or FUNCTION",
                  "End with END PROCEDURE",
                  "Comment each major step",
                  "Show time complexity at end",
                ].map((rule, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-orange-500 shrink-0">•</span> {rule}
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="glass-card p-4">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-4 h-4 text-yellow-400" />
                <h3 className="text-sm font-semibold text-slate-300">Quick Templates</h3>
              </div>
              <div className="space-y-2">
                {[
                  { label: "Array Sort", input: "Design a selection sort algorithm for an array of n integers" },
                  { label: "Linked List Insert", input: "Insert a node at the beginning of a singly linked list" },
                  { label: "Queue Operations", input: "Design circular queue enqueue and dequeue operations" },
                ].map((tpl, i) => (
                  <button key={i} onClick={() => { setInputText(tpl.input); setMode("problem_to_pseudo"); setSelectedExample(null); }}
                    className="w-full text-left px-3 py-2 rounded-lg bg-slate-800/40 border border-slate-700/40 hover:border-yellow-500/30 transition-colors"
                  >
                    <span className="text-xs text-yellow-300">{tpl.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
