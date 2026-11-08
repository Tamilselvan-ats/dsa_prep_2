"use client";

import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Play, RotateCcw, Plus, Minus, ArrowLeft, ArrowRight,
  Info, Lightbulb, Code2, ChevronRight, ArrowRightLeft
} from "lucide-react";
import { toast } from "sonner";
import { useProgressStore } from "@/lib/stores/progress-store";

const MAX_SIZE = 8;

// ─── Types ───────────────────────────────────────────────────────────────────
interface QueueItem { id: number; value: number | string; priority?: number; }
interface LogEntry { op: string; msg: string; time: Date; ok: boolean; }

// ─── Helpers ─────────────────────────────────────────────────────────────────
let _id = 0;
const uid = () => ++_id;

type Tab = "linear" | "circular" | "priority" | "deque";

// ─── C Code snippets ─────────────────────────────────────────────────────────
const C_CODE: Record<Tab, string> = {
  linear: `#define MAX 8
int queue[MAX], front = -1, rear = -1;

void enqueue(int x) {
  if (rear == MAX - 1) { printf("Queue Full\\n"); return; }
  if (front == -1) front = 0;
  queue[++rear] = x;
}

int dequeue() {
  if (front == -1 || front > rear) {
    printf("Queue Empty\\n"); return -1;
  }
  return queue[front++];
}`,
  circular: `#define MAX 8
int cq[MAX], front = -1, rear = -1;

int isFull()  { return (rear + 1) % MAX == front; }
int isEmpty() { return front == -1; }

void enqueue(int x) {
  if (isFull()) { printf("Queue Full\\n"); return; }
  if (isEmpty()) front = 0;
  rear = (rear + 1) % MAX;
  cq[rear] = x;
}

int dequeue() {
  if (isEmpty()) { printf("Queue Empty\\n"); return -1; }
  int val = cq[front];
  if (front == rear) front = rear = -1;
  else front = (front + 1) % MAX;
  return val;
}`,
  priority: `#define MAX 8
struct Node { int data, priority; };
struct Node pq[MAX];
int size = 0;

void insert(int data, int prio) {
  if (size == MAX) { printf("Full\\n"); return; }
  int i = size++;
  pq[i].data = data; pq[i].priority = prio;
  /* bubble up (min-heap by priority) */
  while (i && pq[(i-1)/2].priority > pq[i].priority) {
    struct Node t = pq[i]; pq[i] = pq[(i-1)/2];
    pq[(i-1)/2] = t; i = (i-1)/2;
  }
}

int extractMin() {
  if (!size) { printf("Empty\\n"); return -1; }
  int val = pq[0].data;
  pq[0] = pq[--size];
  /* sift down */
  int i = 0;
  while (1) {
    int s = i, l = 2*i+1, r = 2*i+2;
    if (l < size && pq[l].priority < pq[s].priority) s = l;
    if (r < size && pq[r].priority < pq[s].priority) s = r;
    if (s == i) break;
    struct Node t = pq[i]; pq[i] = pq[s]; pq[s] = t; i = s;
  }
  return val;
}`,
  deque: `#define MAX 8
int dq[MAX], front = -1, rear = -1;

int isFull()  { return (rear + 1) % MAX == front; }
int isEmpty() { return front == -1; }

void insertFront(int x) {
  if (isFull()) { printf("Full\\n"); return; }
  if (isEmpty()) { front = rear = 0; }
  else front = (front - 1 + MAX) % MAX;
  dq[front] = x;
}

void insertRear(int x) {
  if (isFull()) { printf("Full\\n"); return; }
  if (isEmpty()) { front = rear = 0; }
  else rear = (rear + 1) % MAX;
  dq[rear] = x;
}

int deleteFront() {
  if (isEmpty()) { printf("Empty\\n"); return -1; }
  int val = dq[front];
  if (front == rear) front = rear = -1;
  else front = (front + 1) % MAX;
  return val;
}

int deleteRear() {
  if (isEmpty()) { printf("Empty\\n"); return -1; }
  int val = dq[rear];
  if (front == rear) front = rear = -1;
  else rear = (rear - 1 + MAX) % MAX;
  return val;
}`,
};

const EXAM_TIPS: Record<Tab, string[]> = {
  linear: [
    "Linear queue suffers from 'false overflow': rear reaches MAX-1 even if front has advanced.",
    "Condition: front == -1 means empty; rear == MAX-1 means full (even if slots freed).",
    "Time complexity: Enqueue O(1), Dequeue O(1) but wasted space problem.",
    "FIFO: First In, First Out — opposite of stack (LIFO).",
  ],
  circular: [
    "Formula for next slot: (rear + 1) % MAX — key exam formula!",
    "Full condition: (rear + 1) % MAX == front",
    "Empty condition: front == -1 (or front == rear == -1)",
    "Solves false overflow of linear queue by reusing freed slots.",
    "One slot is always wasted to distinguish full vs empty.",
  ],
  priority: [
    "Priority Queue serves highest priority (lowest number) first — min-heap.",
    "Implementation: sorted array O(n) insert or heap O(log n) insert.",
    "Used in CPU scheduling, Dijkstra's algorithm, Huffman encoding.",
    "Exam: draw heap array representation after each insertion.",
  ],
  deque: [
    "Deque = Double-Ended Queue — insertion/deletion at both ends.",
    "Input-restricted deque: insert at rear only, delete from both ends.",
    "Output-restricted deque: delete from front only, insert at both ends.",
    "Can implement both Stack (push/pop rear) and Queue (push rear, pop front).",
  ],
};

// ═══════════════════════════════════════════════════════════════════════════
// SUB-VISUALIZERS
// ═══════════════════════════════════════════════════════════════════════════

// ─── Linear Queue ────────────────────────────────────────────────────────────
function LinearQueue({ addXP }: { addXP: (n: number) => void }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [animId, setAnimId] = useState<number | null>(null);
  const [animType, setAnimType] = useState<"enq" | "deq" | null>(null);
  const [busy, setBusy] = useState(false);
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const log = (op: string, msg: string, ok: boolean) =>
    setLogs(p => [{ op, msg, time: new Date(), ok }, ...p.slice(0, 14)]);

  const enqueue = async () => {
    const val = input.trim() || String(Math.floor(Math.random() * 99) + 1);
    if (queue.length >= MAX_SIZE) {
      toast.error("Queue Overflow! (MAX = " + MAX_SIZE + ")");
      log("ENQ", `Overflow — cannot insert ${val}`, false);
      return;
    }
    setBusy(true);
    const item: QueueItem = { id: uid(), value: val };
    setAnimId(item.id); setAnimType("enq");
    await delay(400);
    setQueue(p => [...p, item]);
    setAnimId(null); setAnimType(null); setBusy(false);
    setInput("");
    log("ENQ", `Enqueued ${val} at rear`, true);
    addXP(2);
    toast.success(`Enqueued: ${val}`);
  };

  const dequeue = async () => {
    if (!queue.length) {
      toast.error("Queue Underflow! Queue is empty");
      log("DEQ", "Underflow — queue is empty", false);
      return;
    }
    setBusy(true);
    const front = queue[0];
    setAnimId(front.id); setAnimType("deq");
    await delay(500);
    setQueue(p => p.slice(1));
    setAnimId(null); setAnimType(null); setBusy(false);
    log("DEQ", `Dequeued ${front.value} from front`, true);
    addXP(2);
    toast.success(`Dequeued: ${front.value}`);
  };

  const reset = () => { setQueue([]); setLogs([]); setInput(""); };

  const isFull = queue.length >= MAX_SIZE;
  const isEmpty = queue.length === 0;

  return (
    <div className="space-y-6">
      {/* Status bar */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Size", val: `${queue.length}/${MAX_SIZE}` },
          { label: "Front", val: isEmpty ? "—" : String(queue[0].value) },
          { label: "Rear", val: isEmpty ? "—" : String(queue[queue.length - 1].value) },
          { label: "Status", val: isFull ? "FULL" : isEmpty ? "EMPTY" : "OK", color: isFull ? "text-red-400" : isEmpty ? "text-yellow-400" : "text-green-400" },
        ].map(s => (
          <div key={s.label} className="glass-card px-4 py-2 flex gap-2 items-center">
            <span className="text-xs text-slate-400">{s.label}</span>
            <span className={`font-mono font-bold text-sm ${s.color ?? "text-indigo-300"}`}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* Queue visualization */}
      <div className="glass-card p-6">
        <div className="relative">
          {/* Labels */}
          <div className="flex gap-1 mb-2">
            {Array.from({ length: MAX_SIZE }).map((_, i) => (
              <div key={i} className="flex-1 text-center text-[10px] text-slate-500">idx {i}</div>
            ))}
          </div>
          {/* Cells */}
          <div className="flex gap-1">
            {Array.from({ length: MAX_SIZE }).map((_, i) => {
              const item = queue[i];
              const isFront = i === 0 && !isEmpty;
              const isRear = i === queue.length - 1 && !isEmpty;
              return (
                <div key={i} className="flex-1 relative">
                  <motion.div
                    className={`h-14 rounded-lg border-2 flex items-center justify-center font-mono text-sm font-bold transition-colors duration-300
                      ${item
                        ? isFront && isRear
                          ? "border-purple-400 bg-purple-500/20 text-purple-200"
                          : isFront
                          ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                          : isRear
                          ? "border-orange-400 bg-orange-500/20 text-orange-200"
                          : "border-indigo-500 bg-indigo-500/15 text-indigo-200"
                        : "border-slate-700 bg-slate-800/40 text-slate-600"
                      }
                      ${animId === item?.id && animType === "deq" ? "opacity-30 scale-90" : ""}
                    `}
                    animate={animId === item?.id && animType === "enq" ? { scale: [0.5, 1.1, 1], opacity: [0, 1, 1] } : {}}
                    transition={{ duration: 0.4 }}
                  >
                    {item ? String(item.value) : ""}
                  </motion.div>
                  {/* Pointer labels */}
                  {(isFront || isRear) && (
                    <div className={`absolute -bottom-6 left-0 right-0 text-center text-[10px] font-bold
                      ${isFront && isRear ? "text-purple-400" : isFront ? "text-cyan-400" : "text-orange-400"}`}>
                      {isFront && isRear ? "F/R" : isFront ? "FRONT" : "REAR"}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          <div className="h-8" />
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !busy && enqueue()}
          placeholder="Value (or leave blank)"
          className="flex-1 min-w-32 glass-card px-4 py-2 text-sm text-white outline-none focus:border-indigo-400 border border-transparent"
        />
        <motion.button whileTap={{ scale: 0.95 }} onClick={enqueue} disabled={busy}
          className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
          <Plus className="w-4 h-4" /> Enqueue
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={dequeue} disabled={busy}
          className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
          <Minus className="w-4 h-4" /> Dequeue
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={reset}
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm flex items-center gap-2">
          <RotateCcw className="w-4 h-4" /> Reset
        </motion.button>
      </div>

      {/* Operation log */}
      <div className="glass-card p-4">
        <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Operation Log</p>
        <div className="space-y-1 max-h-36 overflow-y-auto">
          <AnimatePresence>
            {logs.length === 0 && <p className="text-xs text-slate-500 italic">No operations yet</p>}
            {logs.map((l, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className={`flex gap-3 text-xs font-mono ${l.ok ? "text-green-300" : "text-red-300"}`}>
                <span className={`font-bold ${l.ok ? "text-cyan-400" : "text-red-400"}`}>[{l.op}]</span>
                <span>{l.msg}</span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Circular Queue ───────────────────────────────────────────────────────────
function CircularQueue({ addXP }: { addXP: (n: number) => void }) {
  const N = 8;
  const [cells, setCells] = useState<(QueueItem | null)[]>(Array(N).fill(null));
  const [front, setFront] = useState(-1);
  const [rear, setRear] = useState(-1);
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [highlight, setHighlight] = useState<number | null>(null);
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));

  const log = (op: string, msg: string, ok: boolean) =>
    setLogs(p => [{ op, msg, time: new Date(), ok }, ...p.slice(0, 14)]);

  const isFull  = () => front !== -1 && (rear + 1) % N === front;
  const isEmpty = () => front === -1;

  const enqueue = async () => {
    const val = input.trim() || String(Math.floor(Math.random() * 99) + 1);
    if (isFull()) { toast.error("Circular Queue Full!"); log("ENQ", "Full!", false); return; }
    setBusy(true);
    const newRear = isEmpty() ? 0 : (rear + 1) % N;
    const newFront = isEmpty() ? 0 : front;
    setHighlight(newRear);
    await delay(400);
    setCells(p => { const a = [...p]; a[newRear] = { id: uid(), value: val }; return a; });
    setRear(newRear);
    if (front === -1) setFront(0);
    setHighlight(null); setBusy(false); setInput("");
    log("ENQ", `${val} at index ${newRear} | rear=(${rear}+1)%${N}=${newRear}`, true);
    addXP(3);
    toast.success(`Enqueued: ${val}`);
  };

  const dequeue = async () => {
    if (isEmpty()) { toast.error("Circular Queue Empty!"); log("DEQ", "Empty!", false); return; }
    setBusy(true);
    const val = cells[front]?.value;
    setHighlight(front);
    await delay(400);
    setCells(p => { const a = [...p]; a[front] = null; return a; });
    if (front === rear) { setFront(-1); setRear(-1); }
    else setFront((front + 1) % N);
    setHighlight(null); setBusy(false);
    log("DEQ", `${val} from index ${front} | front=(${front}+1)%${N}=${(front+1)%N}`, true);
    addXP(3);
    toast.success(`Dequeued: ${val}`);
  };

  const reset = () => { setCells(Array(N).fill(null)); setFront(-1); setRear(-1); setLogs([]); setInput(""); };

  // SVG circular layout
  const cx = 160, cy = 160, r = 110;
  const getPos = (i: number) => {
    const angle = (2 * Math.PI * i) / N - Math.PI / 2;
    return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
  };

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Front", val: front === -1 ? "—" : String(front) },
          { label: "Rear", val: rear === -1 ? "—" : String(rear) },
          { label: "Size", val: front === -1 ? "0" : front <= rear ? String(rear - front + 1) : String(N - front + rear + 1) },
          { label: "Formula", val: `(rear+1)%${N}`, color: "text-purple-300" },
          { label: "Full?", val: isFull() ? "YES" : "NO", color: isFull() ? "text-red-400" : "text-green-400" },
        ].map(s => (
          <div key={s.label} className="glass-card px-3 py-2 flex gap-2 items-center">
            <span className="text-xs text-slate-400">{s.label}</span>
            <span className={`font-mono font-bold text-sm ${s.color ?? "text-indigo-300"}`}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* SVG circle */}
      <div className="glass-card p-4 flex justify-center">
        <svg width="320" height="320" viewBox="0 0 320 320">
          {/* Circular track */}
          <circle cx={cx} cy={cy} r={r} fill="none" stroke="#334155" strokeWidth="2" strokeDasharray="6,4" />
          {Array.from({ length: N }).map((_, i) => {
            const { x, y } = getPos(i);
            const cell = cells[i];
            const isFr = i === front && !isEmpty();
            const isRe = i === rear && !isEmpty();
            const isHL = i === highlight;
            return (
              <g key={i}>
                <motion.circle
                  cx={x} cy={y} r={22}
                  fill={cell ? (isHL ? "#7c3aed" : isFr && isRe ? "#6d28d9" : isFr ? "#0e7490" : isRe ? "#c2410c" : "#1e1b4b") : "#1e293b"}
                  stroke={cell ? (isFr && isRe ? "#a855f7" : isFr ? "#22d3ee" : isRe ? "#f97316" : "#6366f1") : "#334155"}
                  strokeWidth={cell ? 2.5 : 1}
                  animate={isHL ? { scale: [1, 1.2, 1] } : {}}
                  transition={{ duration: 0.4 }}
                />
                <text x={x} y={y + 1} textAnchor="middle" dominantBaseline="middle"
                  fill={cell ? "#e2e8f0" : "#475569"} fontSize="11" fontWeight="bold" fontFamily="monospace">
                  {cell ? String(cell.value) : i}
                </text>
                {/* Front/Rear labels */}
                {(isFr || isRe) && (() => {
                  const lx = cx + (r + 36) * Math.cos((2 * Math.PI * i) / N - Math.PI / 2);
                  const ly = cy + (r + 36) * Math.sin((2 * Math.PI * i) / N - Math.PI / 2);
                  return (
                    <text x={lx} y={ly} textAnchor="middle" dominantBaseline="middle"
                      fill={isFr && isRe ? "#a855f7" : isFr ? "#22d3ee" : "#f97316"} fontSize="9" fontWeight="bold">
                      {isFr && isRe ? "F/R" : isFr ? "F" : "R"}
                    </text>
                  );
                })()}
              </g>
            );
          })}
          {/* Center label */}
          <text x={cx} y={cy - 10} textAnchor="middle" fill="#6366f1" fontSize="12" fontWeight="bold">Circular</text>
          <text x={cx} y={cy + 8} textAnchor="middle" fill="#6366f1" fontSize="12" fontWeight="bold">Queue</text>
          <text x={cx} y={cy + 24} textAnchor="middle" fill="#475569" fontSize="9">MAX = {N}</text>
        </svg>
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === "Enter" && !busy && enqueue()}
          placeholder="Value" className="flex-1 min-w-32 glass-card px-4 py-2 text-sm text-white outline-none" />
        <motion.button whileTap={{ scale: 0.95 }} onClick={enqueue} disabled={busy}
          className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
          <Plus className="w-4 h-4" /> Enqueue
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={dequeue} disabled={busy}
          className="px-5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
          <Minus className="w-4 h-4" /> Dequeue
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={reset}
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm flex items-center gap-2">
          <RotateCcw className="w-4 h-4" /> Reset
        </motion.button>
      </div>

      {/* Log */}
      <div className="glass-card p-4">
        <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Operation Log</p>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          <AnimatePresence>
            {logs.length === 0 && <p className="text-xs text-slate-500 italic">No operations yet — try enqueuing items to see wrap-around!</p>}
            {logs.map((l, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                className={`text-xs font-mono ${l.ok ? "text-green-300" : "text-red-300"}`}>
                <span className={`font-bold mr-2 ${l.ok ? "text-cyan-400" : "text-red-400"}`}>[{l.op}]</span>{l.msg}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}

// ─── Priority Queue ───────────────────────────────────────────────────────────
function PriorityQueue({ addXP }: { addXP: (n: number) => void }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [valInput, setValInput] = useState("");
  const [prioInput, setPrioInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [animId, setAnimId] = useState<number | null>(null);
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
  const log = (op: string, msg: string, ok: boolean) =>
    setLogs(p => [{ op, msg, time: new Date(), ok }, ...p.slice(0, 14)]);

  const insert = async () => {
    const val = valInput.trim() || String(Math.floor(Math.random() * 99) + 1);
    const prio = parseInt(prioInput) || Math.floor(Math.random() * 10) + 1;
    if (queue.length >= MAX_SIZE) { toast.error("Priority Queue Full!"); return; }
    setBusy(true);
    const item: QueueItem = { id: uid(), value: val, priority: prio };
    setAnimId(item.id);
    await delay(300);
    setQueue(p => [...p, item].sort((a, b) => (a.priority ?? 9) - (b.priority ?? 9)));
    setAnimId(null); setBusy(false);
    setValInput(""); setPrioInput("");
    log("INS", `${val} (priority=${prio})`, true);
    addXP(3);
    toast.success(`Inserted: ${val} [P=${prio}]`);
  };

  const extractMin = async () => {
    if (!queue.length) { toast.error("Priority Queue Empty!"); return; }
    setBusy(true);
    const top = queue[0];
    setAnimId(top.id);
    await delay(500);
    setQueue(p => p.slice(1));
    setAnimId(null); setBusy(false);
    log("EXT", `${top.value} (priority=${top.priority}) served`, true);
    addXP(3);
    toast.success(`Served: ${top.value} [highest priority]`);
  };

  const reset = () => { setQueue([]); setLogs([]); setValInput(""); setPrioInput(""); };
  const prioBg = (p: number) => p <= 2 ? "border-red-400 bg-red-500/20 text-red-200" : p <= 5 ? "border-yellow-400 bg-yellow-500/20 text-yellow-200" : "border-green-400 bg-green-500/20 text-green-200";

  return (
    <div className="space-y-6">
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Size", val: `${queue.length}/${MAX_SIZE}` },
          { label: "Top Priority", val: queue.length ? String(queue[0].priority) : "—", color: "text-red-400" },
          { label: "Top Value", val: queue.length ? String(queue[0].value) : "—", color: "text-cyan-300" },
        ].map(s => (
          <div key={s.label} className="glass-card px-4 py-2 flex gap-2 items-center">
            <span className="text-xs text-slate-400">{s.label}</span>
            <span className={`font-mono font-bold text-sm ${s.color ?? "text-indigo-300"}`}>{s.val}</span>
          </div>
        ))}
        <div className="glass-card px-3 py-2 flex gap-2 items-center text-xs text-slate-400">
          <span className="w-2 h-2 rounded-full bg-red-400 inline-block" /> P≤2: Critical &nbsp;
          <span className="w-2 h-2 rounded-full bg-yellow-400 inline-block" /> P3-5 &nbsp;
          <span className="w-2 h-2 rounded-full bg-green-400 inline-block" /> P≥6: Low
        </div>
      </div>

      {/* Queue display — sorted by priority */}
      <div className="glass-card p-6">
        <p className="text-xs text-slate-400 mb-3">Sorted by priority (lowest number = highest priority, served first)</p>
        <div className="flex flex-col gap-2">
          <AnimatePresence>
            {queue.length === 0 && (
              <p className="text-sm text-slate-500 italic text-center py-4">Queue empty — insert items with priority values</p>
            )}
            {queue.map((item, i) => (
              <motion.div
                key={item.id}
                layout
                initial={{ opacity: 0, x: 40 }}
                animate={{
                  opacity: animId === item.id ? 0.3 : 1,
                  x: 0,
                  scale: animId === item.id ? 0.9 : 1,
                }}
                exit={{ opacity: 0, x: -60 }}
                transition={{ duration: 0.4 }}
                className={`flex items-center gap-4 px-4 py-3 rounded-lg border-2 ${prioBg(item.priority ?? 5)}`}
              >
                <span className="text-xs text-slate-400 w-5">{i + 1}.</span>
                {i === 0 && (
                  <span className="text-[10px] font-bold bg-red-500/30 text-red-300 px-2 py-0.5 rounded">FRONT</span>
                )}
                <span className="font-mono font-bold text-lg flex-1">{item.value}</span>
                <div className="flex items-center gap-1">
                  <span className="text-xs text-slate-400">Priority:</span>
                  <span className="font-mono font-bold text-base">{item.priority}</span>
                </div>
                <div className="w-24 h-2 rounded-full bg-slate-700 overflow-hidden">
                  <div className={`h-full rounded-full ${(item.priority ?? 5) <= 2 ? "bg-red-400" : (item.priority ?? 5) <= 5 ? "bg-yellow-400" : "bg-green-400"}`}
                    style={{ width: `${100 - ((item.priority ?? 1) - 1) * 10}%` }} />
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>

      {/* Controls */}
      <div className="flex gap-3 flex-wrap">
        <input value={valInput} onChange={e => setValInput(e.target.value)}
          placeholder="Value" className="flex-1 min-w-24 glass-card px-4 py-2 text-sm text-white outline-none" />
        <input value={prioInput} onChange={e => setPrioInput(e.target.value)} type="number" min={1} max={10}
          placeholder="Priority (1=high)" className="w-36 glass-card px-4 py-2 text-sm text-white outline-none" />
        <motion.button whileTap={{ scale: 0.95 }} onClick={insert} disabled={busy}
          className="px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
          <Plus className="w-4 h-4" /> Insert
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={extractMin} disabled={busy}
          className="px-5 py-2 rounded-lg bg-red-700 hover:bg-red-600 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50">
          <Minus className="w-4 h-4" /> Serve (Extract Min)
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={reset}
          className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm flex items-center gap-2">
          <RotateCcw className="w-4 h-4" /> Reset
        </motion.button>
      </div>

      {/* Log */}
      <div className="glass-card p-4">
        <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Operation Log</p>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {logs.length === 0 && <p className="text-xs text-slate-500 italic">No operations yet</p>}
          {logs.map((l, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className={`text-xs font-mono ${l.ok ? "text-green-300" : "text-red-300"}`}>
              <span className={`font-bold mr-2 ${l.ok ? "text-cyan-400" : "text-red-400"}`}>[{l.op}]</span>{l.msg}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Deque ────────────────────────────────────────────────────────────────────
function Deque({ addXP }: { addXP: (n: number) => void }) {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [input, setInput] = useState("");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [busy, setBusy] = useState(false);
  const [animId, setAnimId] = useState<number | null>(null);
  const [animEnd, setAnimEnd] = useState<"front" | "rear" | null>(null);
  const delay = (ms: number) => new Promise(r => setTimeout(r, ms));
  const log = (op: string, msg: string, ok: boolean) =>
    setLogs(p => [{ op, msg, time: new Date(), ok }, ...p.slice(0, 14)]);

  const insertFront = async () => {
    const val = input.trim() || String(Math.floor(Math.random() * 99) + 1);
    if (queue.length >= MAX_SIZE) { toast.error("Deque Full!"); return; }
    setBusy(true);
    const item: QueueItem = { id: uid(), value: val };
    setAnimId(item.id); setAnimEnd("front");
    await delay(400);
    setQueue(p => [item, ...p]);
    setAnimId(null); setAnimEnd(null); setBusy(false); setInput("");
    log("INS-F", `${val} inserted at front`, true);
    addXP(2); toast.success(`Insert Front: ${val}`);
  };

  const insertRear = async () => {
    const val = input.trim() || String(Math.floor(Math.random() * 99) + 1);
    if (queue.length >= MAX_SIZE) { toast.error("Deque Full!"); return; }
    setBusy(true);
    const item: QueueItem = { id: uid(), value: val };
    setAnimId(item.id); setAnimEnd("rear");
    await delay(400);
    setQueue(p => [...p, item]);
    setAnimId(null); setAnimEnd(null); setBusy(false); setInput("");
    log("INS-R", `${val} inserted at rear`, true);
    addXP(2); toast.success(`Insert Rear: ${val}`);
  };

  const deleteFront = async () => {
    if (!queue.length) { toast.error("Deque Empty!"); return; }
    setBusy(true);
    const item = queue[0];
    setAnimId(item.id); setAnimEnd("front");
    await delay(500);
    setQueue(p => p.slice(1));
    setAnimId(null); setAnimEnd(null); setBusy(false);
    log("DEL-F", `${item.value} deleted from front`, true);
    addXP(2); toast.success(`Delete Front: ${item.value}`);
  };

  const deleteRear = async () => {
    if (!queue.length) { toast.error("Deque Empty!"); return; }
    setBusy(true);
    const item = queue[queue.length - 1];
    setAnimId(item.id); setAnimEnd("rear");
    await delay(500);
    setQueue(p => p.slice(0, -1));
    setAnimId(null); setAnimEnd(null); setBusy(false);
    log("DEL-R", `${item.value} deleted from rear`, true);
    addXP(2); toast.success(`Delete Rear: ${item.value}`);
  };

  const reset = () => { setQueue([]); setLogs([]); setInput(""); };
  const isEmpty = queue.length === 0;
  const isFull = queue.length >= MAX_SIZE;

  return (
    <div className="space-y-6">
      {/* Status */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Size", val: `${queue.length}/${MAX_SIZE}` },
          { label: "Front", val: isEmpty ? "—" : String(queue[0].value), color: "text-cyan-300" },
          { label: "Rear", val: isEmpty ? "—" : String(queue[queue.length - 1].value), color: "text-orange-300" },
          { label: "Status", val: isFull ? "FULL" : isEmpty ? "EMPTY" : "OK", color: isFull ? "text-red-400" : isEmpty ? "text-yellow-400" : "text-green-400" },
        ].map(s => (
          <div key={s.label} className="glass-card px-4 py-2 flex gap-2 items-center">
            <span className="text-xs text-slate-400">{s.label}</span>
            <span className={`font-mono font-bold text-sm ${s.color ?? "text-indigo-300"}`}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* Deque visualization */}
      <div className="glass-card p-6">
        {/* Arrows */}
        <div className="flex justify-between mb-2 px-2">
          <div className="flex items-center gap-1 text-cyan-400 text-xs font-bold">
            <ArrowLeft className="w-3 h-3" /> FRONT
          </div>
          <div className="flex items-center gap-1 text-orange-400 text-xs font-bold">
            REAR <ArrowRight className="w-3 h-3" />
          </div>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: MAX_SIZE }).map((_, i) => {
            const item = queue[i];
            const isFr = i === 0 && !isEmpty;
            const isRe = i === queue.length - 1 && !isEmpty;
            const isAnimFront = animId === item?.id && animEnd === "front";
            const isAnimRear = animId === item?.id && animEnd === "rear";
            return (
              <div key={i} className="flex-1 relative">
                <motion.div
                  layout
                  className={`h-14 rounded-lg border-2 flex items-center justify-center font-mono text-sm font-bold
                    ${item
                      ? isFr && isRe ? "border-purple-400 bg-purple-500/20 text-purple-200"
                        : isFr ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                        : isRe ? "border-orange-400 bg-orange-500/20 text-orange-200"
                        : "border-indigo-500 bg-indigo-500/15 text-indigo-200"
                      : "border-slate-700 bg-slate-800/40 text-slate-600"
                    }`}
                  animate={
                    isAnimFront ? { x: [-30, 0], opacity: [0, 1] }
                    : isAnimRear ? { x: [30, 0], opacity: [0, 1] }
                    : animId === item?.id ? { opacity: [1, 0], scale: [1, 0.8] }
                    : {}
                  }
                  transition={{ duration: 0.4 }}
                >
                  {item ? String(item.value) : ""}
                </motion.div>
                {(isFr || isRe) && (
                  <div className={`absolute -bottom-5 left-0 right-0 text-center text-[10px] font-bold
                    ${isFr && isRe ? "text-purple-400" : isFr ? "text-cyan-400" : "text-orange-400"}`}>
                    {isFr && isRe ? "F/R" : isFr ? "F" : "R"}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="h-6" />
        {/* Direction arrows */}
        <div className="flex justify-between mt-2">
          <div className="text-[10px] text-slate-500 text-center">
            <ArrowRightLeft className="w-3 h-3 inline text-cyan-500" /> Insert/Delete here
          </div>
          <div className="text-[10px] text-slate-500 text-center">
            Insert/Delete here <ArrowRightLeft className="w-3 h-3 inline text-orange-500" />
          </div>
        </div>
      </div>

      {/* Input */}
      <div className="glass-card p-3">
        <input value={input} onChange={e => setInput(e.target.value)}
          placeholder="Value (or leave blank for random)"
          className="w-full glass-card px-4 py-2 text-sm text-white outline-none" />
      </div>

      {/* 4 operation buttons */}
      <div className="grid grid-cols-2 gap-3">
        <motion.button whileTap={{ scale: 0.95 }} onClick={insertFront} disabled={busy}
          className="py-3 rounded-lg bg-cyan-700/70 hover:bg-cyan-600/70 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          <ArrowLeft className="w-4 h-4" /> Insert Front
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={insertRear} disabled={busy}
          className="py-3 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          Insert Rear <ArrowRight className="w-4 h-4" />
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={deleteFront} disabled={busy}
          className="py-3 rounded-lg bg-orange-700/70 hover:bg-orange-600/70 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          <ArrowLeft className="w-4 h-4" /> Delete Front
        </motion.button>
        <motion.button whileTap={{ scale: 0.95 }} onClick={deleteRear} disabled={busy}
          className="py-3 rounded-lg bg-red-700/70 hover:bg-red-600/70 text-white text-sm font-semibold flex items-center justify-center gap-2 disabled:opacity-50">
          Delete Rear <ArrowRight className="w-4 h-4" />
        </motion.button>
      </div>
      <motion.button whileTap={{ scale: 0.95 }} onClick={reset}
        className="px-4 py-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-sm flex items-center gap-2">
        <RotateCcw className="w-4 h-4" /> Reset
      </motion.button>

      {/* Log */}
      <div className="glass-card p-4">
        <p className="text-xs text-slate-400 mb-2 font-semibold uppercase tracking-wider">Operation Log</p>
        <div className="space-y-1 max-h-32 overflow-y-auto">
          {logs.length === 0 && <p className="text-xs text-slate-500 italic">No operations yet</p>}
          {logs.map((l, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
              className={`text-xs font-mono ${l.ok ? "text-green-300" : "text-red-300"}`}>
              <span className={`font-bold mr-2 ${l.ok ? "text-cyan-400" : "text-red-400"}`}>[{l.op}]</span>{l.msg}
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function QueueVisualizerPage() {
  const [activeTab, setActiveTab] = useState<Tab>("linear");
  const [showCode, setShowCode] = useState(false);
  const [showTips, setShowTips] = useState(false);
  const { addXP } = useProgressStore();

  const tabs: { id: Tab; label: string; desc: string; color: string }[] = [
    { id: "linear",   label: "Linear Queue",   desc: "FIFO with front/rear", color: "indigo" },
    { id: "circular", label: "Circular Queue",  desc: "(rear+1)%MAX",         color: "purple" },
    { id: "priority", label: "Priority Queue",  desc: "Min-heap ordering",    color: "red"    },
    { id: "deque",    label: "Deque",           desc: "Double-ended",         color: "cyan"   },
  ];

  const colorMap: Record<string, string> = {
    indigo: "border-indigo-500 bg-indigo-500/15 text-indigo-300",
    purple: "border-purple-500 bg-purple-500/15 text-purple-300",
    red:    "border-red-500 bg-red-500/15 text-red-300",
    cyan:   "border-cyan-500 bg-cyan-500/15 text-cyan-300",
  };
  const activeColorMap: Record<string, string> = {
    indigo: "border-indigo-400 bg-indigo-500/30 text-indigo-200",
    purple: "border-purple-400 bg-purple-500/30 text-purple-200",
    red:    "border-red-400 bg-red-500/30 text-red-200",
    cyan:   "border-cyan-400 bg-cyan-500/30 text-cyan-200",
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 md:p-8">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="w-10 h-10 rounded-xl bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-xl">
            🗂️
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold gradient-text">Queue Visualization Suite</h1>
            <p className="text-slate-400 text-sm">Interactive queue simulations — Linear, Circular, Priority & Deque</p>
          </div>
        </div>
      </motion.div>

      {/* Tab bar */}
      <div className="flex gap-2 flex-wrap mb-6">
        {tabs.map(t => (
          <motion.button key={t.id} whileTap={{ scale: 0.96 }}
            onClick={() => setActiveTab(t.id)}
            className={`px-4 py-2 rounded-xl border text-sm font-semibold transition-all duration-200
              ${activeTab === t.id ? activeColorMap[t.color] : colorMap[t.color] + " opacity-60 hover:opacity-90"}`}>
            {t.label}
            <span className="hidden sm:inline text-xs ml-1 opacity-70">— {t.desc}</span>
          </motion.button>
        ))}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Main visualizer */}
        <div className="xl:col-span-2 glass-card p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25 }}
            >
              {activeTab === "linear"   && <LinearQueue   addXP={addXP} />}
              {activeTab === "circular" && <CircularQueue addXP={addXP} />}
              {activeTab === "priority" && <PriorityQueue addXP={addXP} />}
              {activeTab === "deque"    && <Deque         addXP={addXP} />}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Right panel */}
        <div className="space-y-4">
          {/* Exam tips */}
          <div className="glass-card p-4">
            <button
              onClick={() => setShowTips(p => !p)}
              className="flex items-center justify-between w-full text-left mb-2"
            >
              <span className="flex items-center gap-2 text-yellow-300 font-semibold text-sm">
                <Lightbulb className="w-4 h-4" /> Exam Tips
              </span>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showTips ? "rotate-90" : ""}`} />
            </button>
            <AnimatePresence>
              {showTips && (
                <motion.ul initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} className="space-y-2 overflow-hidden">
                  {EXAM_TIPS[activeTab].map((tip, i) => (
                    <li key={i} className="flex gap-2 text-xs text-slate-300">
                      <ChevronRight className="w-3 h-3 text-yellow-400 mt-0.5 shrink-0" />
                      <span>{tip}</span>
                    </li>
                  ))}
                </motion.ul>
              )}
            </AnimatePresence>
          </div>

          {/* C Code */}
          <div className="glass-card p-4">
            <button
              onClick={() => setShowCode(p => !p)}
              className="flex items-center justify-between w-full text-left mb-2"
            >
              <span className="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
                <Code2 className="w-4 h-4" /> C Implementation
              </span>
              <ChevronRight className={`w-4 h-4 text-slate-400 transition-transform ${showCode ? "rotate-90" : ""}`} />
            </button>
            <AnimatePresence>
              {showCode && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
                  <pre className="text-xs text-slate-300 bg-slate-900/60 rounded-lg p-3 overflow-x-auto whitespace-pre font-mono leading-relaxed">
                    {C_CODE[activeTab]}
                  </pre>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Complexity reference */}
          <div className="glass-card p-4">
            <p className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-400" /> Complexity Reference
            </p>
            <table className="w-full text-xs">
              <thead>
                <tr className="text-slate-400 border-b border-slate-700">
                  <th className="text-left pb-1">Queue Type</th>
                  <th className="text-left pb-1">Enq</th>
                  <th className="text-left pb-1">Deq</th>
                  <th className="text-left pb-1">Space</th>
                </tr>
              </thead>
              <tbody className="text-slate-300 space-y-1">
                {[
                  ["Linear",   "O(1)", "O(1)", "O(n)"],
                  ["Circular", "O(1)", "O(1)", "O(n)"],
                  ["Priority (sorted array)", "O(n)", "O(1)", "O(n)"],
                  ["Priority (heap)", "O(log n)", "O(log n)", "O(n)"],
                  ["Deque",    "O(1)", "O(1)", "O(n)"],
                ].map(([t, e, d, s]) => (
                  <tr key={t} className={`border-b border-slate-800 ${t.startsWith(activeTab.split(" ")[0]) ? "text-indigo-200 font-semibold" : ""}`}>
                    <td className="py-1 pr-2">{t}</td>
                    <td className="py-1 text-green-400 font-mono">{e}</td>
                    <td className="py-1 text-cyan-400 font-mono">{d}</td>
                    <td className="py-1 text-purple-400 font-mono">{s}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Quick reference */}
          <div className="glass-card p-4">
            <p className="text-sm font-semibold text-slate-300 mb-2">📌 Key Formulas</p>
            <div className="space-y-2 text-xs font-mono">
              <div className="bg-slate-900/60 p-2 rounded">
                <span className="text-slate-400">Circular next:</span>
                <span className="text-purple-300 ml-2">(rear + 1) % MAX</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded">
                <span className="text-slate-400">Circular full:</span>
                <span className="text-red-300 ml-2">(rear+1)%MAX == front</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded">
                <span className="text-slate-400">Linear full:</span>
                <span className="text-orange-300 ml-2">rear == MAX - 1</span>
              </div>
              <div className="bg-slate-900/60 p-2 rounded">
                <span className="text-slate-400">Empty:</span>
                <span className="text-cyan-300 ml-2">front == -1</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
