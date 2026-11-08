export const DSA_TOPICS = {
  unit3: [
    { id: "stack-adt", name: "Stack ADT", slug: "stack-adt", subtopics: ["Push", "Pop", "Peek", "IsEmpty", "IsFull"] },
    { id: "expressions", name: "Expressions", slug: "expressions", subtopics: ["Infix", "Prefix", "Postfix", "Infix to Postfix", "Postfix Evaluation"] },
    { id: "balancing-symbols", name: "Balancing Symbols", slug: "balancing-symbols", subtopics: [] },
    { id: "recursion", name: "Recursion", slug: "recursion", subtopics: ["Function Call Mechanism", "Tower of Hanoi"] },
    { id: "queue-adt", name: "Queue ADT", slug: "queue-adt", subtopics: ["Linear Queue", "Circular Queue", "Priority Queue", "Deque"] },
    { id: "scheduling", name: "Queue Scheduling", slug: "scheduling", subtopics: ["Round Robin Scheduling"] },
  ],
  unit4: [
    { id: "tree-terminology", name: "Tree Terminology", slug: "tree-terminology", subtopics: ["Root", "Parent", "Child", "Sibling", "Degree", "Level", "Height", "Depth", "Subtree"] },
    { id: "bst", name: "Binary Search Tree", slug: "bst", subtopics: ["BST Insertion", "BST Searching", "BST Deletion"] },
    { id: "tree-traversals", name: "Tree Traversals", slug: "tree-traversals", subtopics: ["Inorder", "Preorder", "Postorder"] },
    { id: "avl-tree", name: "AVL Tree", slug: "avl-tree", subtopics: ["Balance Factor", "AVL Insertion", "AVL Deletion", "LL Rotation", "RR Rotation", "LR Rotation", "RL Rotation"] },
    { id: "hashing", name: "Hashing", slug: "hashing", subtopics: ["Division Method", "Multiplication Method", "Mid Square Method", "Folding Method", "Digit Extraction Method"] },
    { id: "collision", name: "Collision Resolution", slug: "collision", subtopics: ["Chaining", "Linear Probing", "Quadratic Probing", "Double Hashing"] },
  ],
};

export const ALL_TOPICS = [...DSA_TOPICS.unit3, ...DSA_TOPICS.unit4];

export const QUESTION_TYPES = [
  { value: "mcq", label: "MCQ (1 Mark)", marks: 1 },
  { value: "short_2", label: "Short Answer (2 Marks)", marks: 2 },
  { value: "short_3", label: "Short Answer (3 Marks)", marks: 3 },
  { value: "short_5", label: "Short Answer (5 Marks)", marks: 5 },
  { value: "long_7", label: "Long Answer (7 Marks)", marks: 7 },
  { value: "long_8", label: "Long Answer (8 Marks)", marks: 8 },
  { value: "long_9", label: "Long Answer (9 Marks)", marks: 9 },
  { value: "long_10", label: "Long Answer (10 Marks)", marks: 10 },
  { value: "long_13", label: "Long Answer (13 Marks)", marks: 13 },
  { value: "long_15", label: "Long Answer (15 Marks)", marks: 15 },
  { value: "hots", label: "HOTS Question", marks: 0 },
  { value: "viva", label: "Viva Question", marks: 0 },
  { value: "coding", label: "Coding Question", marks: 0 },
];

export const DIFFICULTY_LEVELS = [
  { value: "easy", label: "Easy", color: "text-green-400", bg: "bg-green-500/10" },
  { value: "medium", label: "Medium", color: "text-yellow-400", bg: "bg-yellow-500/10" },
  { value: "hard", label: "Hard", color: "text-orange-400", bg: "bg-orange-500/10" },
  { value: "expert", label: "Expert", color: "text-red-400", bg: "bg-red-500/10" },
  { value: "ct_killer", label: "CT Killer", color: "text-pink-400", bg: "bg-pink-500/10" },
];

export const TUTOR_MODES = [
  { value: "beginner", label: "Beginner Mode", icon: "🌱", desc: "Simple explanations with analogies" },
  { value: "intermediate", label: "Intermediate Mode", icon: "📚", desc: "Technical depth with examples" },
  { value: "ct_exam", label: "CT Exam Mode", icon: "🎯", desc: "Exam-focused preparation" },
  { value: "viva", label: "Viva Mode", icon: "🎤", desc: "Rapid-fire viva questions" },
  { value: "last_minute", label: "Last-Minute Revision", icon: "⚡", desc: "Quick revision before exam" },
  { value: "professor", label: "Professor Mode", icon: "🏛️", desc: "Strict university professor" },
];

export const EXAM_PATTERNS = [
  { value: "A", label: "Pattern A", desc: "20 MCQs × 1 Mark = 20 Marks", details: "20 MCQs" },
  { value: "B", label: "Pattern B", desc: "10×2M + 5×5M = 45 Marks", details: "Short answers" },
  { value: "C", label: "Pattern C", desc: "3×8M + 2×13M = 50 Marks", details: "Long answers" },
  { value: "D", label: "Pattern D", desc: "2×10M + 2×15M = 50 Marks", details: "Very long answers" },
  { value: "E", label: "Custom Pattern", desc: "Design your own exam", details: "Custom" },
];

export const RANK_INFO = {
  bronze: { label: "Bronze", minXP: 0, color: "#cd7f32", emoji: "🥉" },
  silver: { label: "Silver", minXP: 500, color: "#c0c0c0", emoji: "🥈" },
  gold: { label: "Gold", minXP: 1500, color: "#ffd700", emoji: "🥇" },
  platinum: { label: "Platinum", minXP: 3000, color: "#e5e4e2", emoji: "💎" },
  diamond: { label: "Diamond", minXP: 6000, color: "#b9f2ff", emoji: "💠" },
  legend: { label: "Legend", minXP: 12000, color: "#ff0080", emoji: "👑" },
};
