"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain, Send, Loader2, Settings, ChevronDown, Sparkles,
  User, Bot, Copy, RefreshCw, BookOpen, Zap, GraduationCap,
  Flame, Shield, ThumbsUp, ThumbsDown
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useAIStore } from "@/lib/stores/ai-store";
import { useProgressStore } from "@/lib/stores/progress-store";
import { sendChatMessage, type ChatMessage, type TutorMode } from "@/lib/api";
import { TUTOR_MODES } from "@/lib/constants";
import { toast } from "sonner";

const SUGGESTED_PROMPTS: Record<TutorMode, string[]> = {
  beginner: [
    "Explain what a Stack is using a real-life example",
    "What is the difference between Push and Pop?",
    "How does recursion work? Make it simple",
    "Explain AVL tree in the simplest way possible",
  ],
  intermediate: [
    "Explain AVL tree rotations with time complexity",
    "How does double hashing resolve collisions?",
    "Write C code for circular queue implementation",
    "Compare linear probing vs quadratic probing",
  ],
  ct_exam: [
    "Generate 5 MCQs on AVL Tree rotations",
    "What are the most important topics for Unit 4 CT?",
    "Give me a 13-mark question on BST operations",
    "What mistakes do students make in Stack questions?",
  ],
  viva: [
    "Start my DSA viva on Stack and Queue",
    "Ask me viva questions on AVL Tree",
    "Test my knowledge of Hashing methods",
    "Quiz me on tree traversals",
  ],
  last_minute: [
    "Quick revision of AVL tree rotations",
    "Most important points for Stack in CT",
    "Quick notes on all hashing methods",
    "What must I study in last 1 hour?",
  ],
  professor: [
    "Create a 15-mark question on AVL tree",
    "Design a combined question on BST + Hashing",
    "Give me a surprise test on Unit 3",
    "Create HOTS questions on recursion",
  ],
};

export default function TutorPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedMode, setSelectedMode] = useState<TutorMode>("beginner");
  const [showModeSelect, setShowModeSelect] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const { settings } = useAIStore();
  const { addXP, updateStreak } = useProgressStore();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const selectedModeInfo = TUTOR_MODES.find(m => m.value === selectedMode)!;

  const sendMessage = async (content?: string) => {
    const text = content || input.trim();
    if (!text || isLoading) return;

    setInput("");
    const userMessage: ChatMessage = { role: "user", content: text };
    setMessages(prev => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendChatMessage([...messages, userMessage], selectedMode, settings);
      setMessages(prev => [...prev, { role: "assistant", content: response }]);
      addXP(5);
    } catch (error: any) {
      toast.error(error.message || "Failed to get AI response. Check your API settings.");
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    toast.success("Chat cleared");
  };

  const copyMessage = (content: string) => {
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-64px)]">
      {/* Header */}
      <div className="flex-shrink-0 p-4 border-b border-indigo-500/10 flex items-center justify-between gap-3 glass">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center glow-primary">
            <Brain className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-black text-white">DSA Buddy</h1>
            <p className="text-xs text-slate-400">Your personal AI DSA tutor</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Mode Selector */}
          <div className="relative">
            <button
              onClick={() => setShowModeSelect(!showModeSelect)}
              className="glass-card px-3 py-2 flex items-center gap-2 text-sm hover:border-indigo-500/40 transition-all"
            >
              <span>{selectedModeInfo.icon}</span>
              <span className="hidden sm:block text-slate-300">{selectedModeInfo.label}</span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform ${showModeSelect ? "rotate-180" : ""}`} />
            </button>

            <AnimatePresence>
              {showModeSelect && (
                <motion.div
                  className="absolute right-0 top-full mt-2 w-64 glass-card border border-indigo-500/20 overflow-hidden z-50"
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                >
                  {TUTOR_MODES.map((mode) => (
                    <button
                      key={mode.value}
                      onClick={() => { setSelectedMode(mode.value as TutorMode); setShowModeSelect(false); }}
                      className={`w-full px-4 py-3 text-left hover:bg-white/5 transition-colors border-b border-white/5 last:border-0 ${
                        selectedMode === mode.value ? "bg-indigo-500/15" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span>{mode.icon}</span>
                        <div>
                          <div className="text-sm font-medium text-white">{mode.label}</div>
                          <div className="text-xs text-slate-400">{mode.desc}</div>
                        </div>
                      </div>
                    </button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <button
            onClick={clearChat}
            className="p-2 rounded-xl hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
            title="Clear chat"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center py-10">
            <motion.div
              className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center mb-4 glow-primary"
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity }}
            >
              <Brain className="w-10 h-10 text-white" />
            </motion.div>
            <h2 className="text-2xl font-black gradient-text mb-2">Hello! I'm DSA Buddy 👋</h2>
            <p className="text-slate-400 mb-6 max-w-md">
              I'm your AI tutor for Unit 3 & Unit 4 DSA. Currently in <span className="text-indigo-400">{selectedModeInfo.label}</span>.
              Ask me anything!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-2xl w-full">
              {SUGGESTED_PROMPTS[selectedMode].map((prompt, i) => (
                <motion.button
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  onClick={() => sendMessage(prompt)}
                  className="glass-card p-3 text-left text-sm text-slate-300 hover:border-indigo-500/40 hover:text-white transition-all"
                >
                  {prompt}
                </motion.button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg, i) => (
          <motion.div
            key={i}
            className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            {msg.role === "assistant" && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0 mt-1">
                <Brain className="w-4 h-4 text-white" />
              </div>
            )}
            <div className={`max-w-[80%] ${msg.role === "user" ? "order-first" : ""}`}>
              <div
                className={`rounded-2xl px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-indigo-500/30 to-purple-500/20 border border-indigo-500/30 ml-auto"
                    : "glass-card"
                }`}
              >
                {msg.role === "assistant" ? (
                  <div className="prose prose-invert prose-sm max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {msg.content}
                    </ReactMarkdown>
                  </div>
                ) : (
                  <p className="text-sm text-slate-200">{msg.content}</p>
                )}
              </div>
              {msg.role === "assistant" && (
                <div className="flex items-center gap-2 mt-1 ml-1">
                  <button
                    onClick={() => copyMessage(msg.content)}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                  <button className="text-slate-500 hover:text-green-400 transition-colors">
                    <ThumbsUp className="w-3 h-3" />
                  </button>
                  <button className="text-slate-500 hover:text-red-400 transition-colors">
                    <ThumbsDown className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>
            {msg.role === "user" && (
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-slate-600 to-slate-700 flex items-center justify-center flex-shrink-0 mt-1">
                <User className="w-4 h-4 text-slate-300" />
              </div>
            )}
          </motion.div>
        ))}

        {isLoading && (
          <motion.div
            className="flex gap-3 justify-start"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center flex-shrink-0">
              <Brain className="w-4 h-4 text-white" />
            </div>
            <div className="glass-card px-4 py-3 flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-400" />
              <span className="text-slate-400 text-sm">DSA Buddy is thinking...</span>
            </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="flex-shrink-0 p-4 border-t border-indigo-500/10 glass">
        <div className="flex gap-3 items-end">
          <div className="flex-1 relative">
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Ask DSA Buddy anything... (${selectedModeInfo.icon} ${selectedModeInfo.label})`}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 resize-none focus:outline-none focus:border-indigo-500/50 transition-colors"
              rows={1}
              style={{ minHeight: "48px", maxHeight: "120px" }}
            />
          </div>
          <motion.button
            onClick={() => sendMessage()}
            disabled={!input.trim() || isLoading}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white disabled:opacity-50 disabled:cursor-not-allowed glow-primary flex-shrink-0"
          >
            {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </motion.button>
        </div>
        <div className="flex items-center justify-between mt-2 px-1">
          <span className="text-xs text-slate-500">Press Enter to send, Shift+Enter for newline</span>
          <span className="text-xs text-slate-500">+5 XP per message</span>
        </div>
      </div>
    </div>
  );
}
