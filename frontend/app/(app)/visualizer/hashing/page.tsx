"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Hash, Calculator, Grid3x3, Layers, Scissors,
  Plus, RotateCcw, ChevronRight, Info, Zap, AlertTriangle
} from "lucide-react";
import { toast } from "sonner";
import { useProgressStore } from "@/lib/stores/progress-store";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HashEntry {
  key: number;
  hashValue: number;
  isCollision: boolean;
}

interface TableCell {
  keys: number[];
}

type MethodTab = "division" | "multiplication" | "midsquare" | "folding" | "digit";

// ─── Constants ────────────────────────────────────────────────────────────────

const A = 0.6180339887; // Golden ratio constant for multiplication method
const TABS: { id: MethodTab; label: string; icon: React.ReactNode }[] = [
  { id: "division",       label: "Division",       icon: <Hash size={15} /> },
  { id: "multiplication", label: "Multiplication",  icon: <Calculator size={15} /> },
  { id: "midsquare",      label: "Mid-Square",      icon: <Grid3x3 size={15} /> },
  { id: "folding",        label: "Folding",         icon: <Layers size={15} /> },
  { id: "digit",          label: "Digit Extraction",icon: <Scissors size={15} /> },
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function buildTable(entries: HashEntry[], m: number): TableCell[] {
  const cells: TableCell[] = Array.from({ length: m }, () => ({ keys: [] }));
  for (const e of entries) {
    if (e.hashValue >= 0 && e.hashValue < m) cells[e.hashValue].keys.push(e.key);
  }
  return cells;
}

function collisionCount(entries: HashEntry[]): number {
  return entries.filter(e => e.isCollision).length;
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function HashTableGrid({ cells, m }: { cells: TableCell[]; m: number }) {
  const maxCols = Math.min(m, 16);
  return (
    <div className="mt-4">
      <p className="text-xs text-slate-400 mb-2">Hash Table (size {m})</p>
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${maxCols}, minmax(0, 1fr))` }}
      >
        {cells.slice(0, m).map((cell, i) => {
          const filled  = cell.keys.length > 0;
          const collide = cell.keys.length > 1;
          return (
            <motion.div
              key={i}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: i * 0.01 }}
              className={`relative flex flex-col items-center justify-center rounded p-1 min-h-[48px] border text-xs font-mono
                ${collide  ? "bg-red-900/60 border-red-500 text-red-300" :
                  filled   ? "bg-indigo-900/60 border-indigo-500 text-indigo-200" :
                             "bg-slate-800/40 border-slate-700 text-slate-500"}`}
            >
              <span className="absolute top-0.5 left-1 text-[9px] text-slate-500">{i}</span>
              {cell.keys.map((k, ki) => (
                <span key={ki} className="leading-tight">{k}</span>
              ))}
              {!filled && <span className="text-slate-600">—</span>}
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

function MetricsBar({ n, m, collisions }: { n: number; m: number; collisions: number }) {
  const lf = m > 0 ? (n / m).toFixed(2) : "0.00";
  return (
    <div className="flex gap-4 flex-wrap mt-3">
      {[
        { label: "Keys Inserted", value: n, color: "text-indigo-400" },
        { label: "Table Size",    value: m, color: "text-cyan-400"   },
        { label: "Load Factor",   value: lf, color: "text-purple-400"},
        { label: "Collisions",    value: collisions, color: "text-red-400" },
      ].map(({ label, value, color }) => (
        <div key={label} className="glass-card px-3 py-2 text-center min-w-[90px]">
          <div className={`text-lg font-bold font-mono ${color}`}>{value}</div>
          <div className="text-[10px] text-slate-400">{label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Division Method ──────────────────────────────────────────────────────────

function DivisionMethod() {
  const [m, setM] = useState(7);
  const [inputKey, setInputKey] = useState("");
  const [entries, setEntries] = useState<HashEntry[]>([]);
  const { addXP } = useProgressStore();

  const insert = () => {
    const k = parseInt(inputKey);
    if (isNaN(k)) { toast.error("Enter a valid integer key"); return; }
    const hv = ((k % m) + m) % m;
    const existing = entries.map(e => e.hashValue);
    const isCol = existing.includes(hv);
    setEntries(prev => [...prev, { key: k, hashValue: hv, isCollision: isCol }]);
    setInputKey("");
    addXP(5);
    toast.success(`h(${k}) = ${k} mod ${m} = ${hv}${isCol ? " ⚠ Collision!" : ""}`, { icon: "🔢" });
  };

  const reset = () => setEntries([]);
  const cells = buildTable(entries, m);
  const cols = collisionCount(entries);

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 border-indigo-500/30">
        <h3 className="gradient-text font-bold mb-1">Division Method</h3>
        <p className="text-slate-400 text-sm mb-3">
          <span className="font-mono text-cyan-300">h(k) = k mod m</span>
          {"  "}— Simple and fast. Choose m as a prime for best distribution.
        </p>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs text-slate-400">Table Size (m)</label>
            <input
              type="number" min={2} max={32} value={m}
              onChange={e => { setM(Number(e.target.value)); reset(); }}
              className="mt-1 block w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400">Key (k)</label>
            <input
              type="number" value={inputKey} placeholder="e.g. 42"
              onChange={e => setInputKey(e.target.value)}
              onKeyDown={e => e.key === "Enter" && insert()}
              className="mt-1 block w-32 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white"
            />
          </div>
          <button onClick={insert}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-500 text-white text-sm px-4 py-1.5 rounded transition-colors">
            <Plus size={14} /> Insert
          </button>
          <button onClick={reset}
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm px-3 py-1.5 rounded transition-colors">
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Entries table */}
      {entries.length > 0 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
          className="glass-card p-4 overflow-x-auto">
          <p className="text-xs text-slate-400 mb-2">Insertion Log</p>
          <table className="w-full text-sm text-left">
            <thead>
              <tr className="text-slate-400 text-xs border-b border-slate-700">
                <th className="pb-1 pr-4">Key (k)</th>
                <th className="pb-1 pr-4">k mod {m}</th>
                <th className="pb-1 pr-4">h(k)</th>
                <th className="pb-1">Status</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((e, i) => (
                <motion.tr key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.05 }}
                  className={`border-b border-slate-800 ${e.isCollision ? "text-red-300" : "text-slate-200"}`}>
                  <td className="py-1 pr-4 font-mono">{e.key}</td>
                  <td className="pr-4 font-mono">{e.key} mod {m}</td>
                  <td className="pr-4 font-mono font-bold">{e.hashValue}</td>
                  <td>{e.isCollision
                    ? <span className="text-red-400 text-xs flex items-center gap-1"><AlertTriangle size={11} />Collision</span>
                    : <span className="text-green-400 text-xs">✓ OK</span>}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      <MetricsBar n={entries.length} m={m} collisions={cols} />
      <HashTableGrid cells={cells} m={m} />
    </div>
  );
}

// ─── Multiplication Method ────────────────────────────────────────────────────

function MultiplicationMethod() {
  const [m, setM] = useState(8);
  const [inputKey, setInputKey] = useState("");
  const [entries, setEntries] = useState<HashEntry[]>([]);
  const [steps, setSteps] = useState<{ k: number; kA: number; frac: number; mFrac: number; hk: number } | null>(null);
  const { addXP } = useProgressStore();

  const insert = () => {
    const k = parseInt(inputKey);
    if (isNaN(k)) { toast.error("Enter a valid integer key"); return; }
    const kA    = k * A;
    const frac  = kA - Math.floor(kA);
    const mFrac = m * frac;
    const hk    = Math.floor(mFrac);
    setSteps({ k, kA, frac, mFrac, hk });
    const existing = entries.map(e => e.hashValue);
    const isCol = existing.includes(hk);
    setEntries(prev => [...prev, { key: k, hashValue: hk, isCollision: isCol }]);
    setInputKey("");
    addXP(5);
    toast.success(`h(${k}) = ${hk}`, { icon: "✖" });
  };

  const reset = () => { setEntries([]); setSteps(null); };
  const cells = buildTable(entries, m);
  const cols = collisionCount(entries);

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 border-purple-500/30">
        <h3 className="gradient-text font-bold mb-1">Multiplication Method</h3>
        <p className="text-slate-400 text-sm mb-1">
          <span className="font-mono text-cyan-300">h(k) = ⌊m × (k·A mod 1)⌋</span>
        </p>
        <p className="text-xs text-slate-500 mb-3">A = 0.6180339887 (Knuth's constant, golden ratio conjugate)</p>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs text-slate-400">Table Size (m)</label>
            <input type="number" min={2} max={32} value={m}
              onChange={e => { setM(Number(e.target.value)); reset(); }}
              className="mt-1 block w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Key (k)</label>
            <input type="number" value={inputKey} placeholder="e.g. 123"
              onChange={e => setInputKey(e.target.value)}
              onKeyDown={e => e.key === "Enter" && insert()}
              className="mt-1 block w-32 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
          </div>
          <button onClick={insert}
            className="flex items-center gap-1 bg-purple-600 hover:bg-purple-500 text-white text-sm px-4 py-1.5 rounded transition-colors">
            <Plus size={14} /> Insert
          </button>
          <button onClick={reset}
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm px-3 py-1.5 rounded transition-colors">
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      {/* Step-by-step */}
      <AnimatePresence mode="wait">
        {steps && (
          <motion.div key={steps.k} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} className="glass-card p-4 border-purple-500/20">
            <p className="text-xs text-slate-400 mb-3 font-semibold">Step-by-Step for k = {steps.k}</p>
            <div className="space-y-2">
              {[
                { step: "1", label: `k × A`, expr: `${steps.k} × ${A}`, result: steps.kA.toFixed(8) },
                { step: "2", label: "k·A mod 1 (fractional part)", expr: `${steps.kA.toFixed(6)} − ⌊${steps.kA.toFixed(6)}⌋`, result: steps.frac.toFixed(8) },
                { step: "3", label: `m × (k·A mod 1)`, expr: `${m} × ${steps.frac.toFixed(6)}`, result: steps.mFrac.toFixed(6) },
                { step: "4", label: "h(k) = ⌊result⌋", expr: `⌊${steps.mFrac.toFixed(4)}⌋`, result: String(steps.hk) },
              ].map(({ step, label, expr, result }) => (
                <motion.div key={step} initial={{ opacity: 0, x: -15 }} animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: Number(step) * 0.1 }}
                  className="flex items-center gap-3 text-sm">
                  <span className="w-5 h-5 rounded-full bg-purple-700 text-white text-[10px] flex items-center justify-center shrink-0">{step}</span>
                  <span className="text-slate-400 text-xs w-48 shrink-0">{label}</span>
                  <span className="font-mono text-slate-300 text-xs">{expr}</span>
                  <ChevronRight size={12} className="text-slate-500 shrink-0" />
                  <span className={`font-mono font-bold text-xs ${step === "4" ? "text-cyan-300 text-sm" : "text-slate-200"}`}>{result}</span>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MetricsBar n={entries.length} m={m} collisions={cols} />
      <HashTableGrid cells={cells} m={m} />
    </div>
  );
}

// ─── Mid-Square Method ────────────────────────────────────────────────────────

function MidSquareMethod() {
  const [m, setM] = useState(10);
  const [digits, setDigits] = useState(1); // digits to extract from middle
  const [inputKey, setInputKey] = useState("");
  const [entries, setEntries] = useState<HashEntry[]>([]);
  const [animKey, setAnimKey] = useState<{ k: number; sq: number; sqStr: string; mid: string; hk: number } | null>(null);
  const { addXP } = useProgressStore();

  const insert = () => {
    const k = parseInt(inputKey);
    if (isNaN(k) || k < 0) { toast.error("Enter a non-negative integer key"); return; }
    const sq    = k * k;
    const sqStr = String(sq);
    const mid   = Math.floor((sqStr.length - digits) / 2);
    const extracted = sqStr.substring(mid, mid + digits) || "0";
    const hk = parseInt(extracted) % m;
    setAnimKey({ k, sq, sqStr, mid: extracted, hk });
    const existing = entries.map(e => e.hashValue);
    const isCol = existing.includes(hk);
    setEntries(prev => [...prev, { key: k, hashValue: hk, isCollision: isCol }]);
    setInputKey("");
    addXP(5);
    toast.success(`h(${k}) = ${hk}`, { icon: "🟦" });
  };

  const reset = () => { setEntries([]); setAnimKey(null); };
  const cells = buildTable(entries, m);

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 border-cyan-500/30">
        <h3 className="gradient-text font-bold mb-1">Mid-Square Method</h3>
        <p className="text-slate-400 text-sm mb-3">
          Square the key → extract middle digits → take mod m
        </p>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs text-slate-400">Table Size (m)</label>
            <input type="number" min={2} max={100} value={m}
              onChange={e => { setM(Number(e.target.value)); reset(); }}
              className="mt-1 block w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Digits to Extract</label>
            <input type="number" min={1} max={3} value={digits}
              onChange={e => setDigits(Number(e.target.value))}
              className="mt-1 block w-20 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Key (k)</label>
            <input type="number" value={inputKey} placeholder="e.g. 25"
              onChange={e => setInputKey(e.target.value)}
              onKeyDown={e => e.key === "Enter" && insert()}
              className="mt-1 block w-28 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
          </div>
          <button onClick={insert}
            className="flex items-center gap-1 bg-cyan-700 hover:bg-cyan-600 text-white text-sm px-4 py-1.5 rounded transition-colors">
            <Plus size={14} /> Insert
          </button>
          <button onClick={reset}
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm px-3 py-1.5 rounded transition-colors">
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {animKey && (
          <motion.div key={animKey.k} initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }} className="glass-card p-5 border-cyan-500/20">
            <p className="text-xs text-slate-400 mb-4">Mid-Square Steps for k = {animKey.k}</p>
            <div className="flex items-center gap-4 flex-wrap">
              {/* k */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
                className="text-center">
                <div className="text-2xl font-bold font-mono text-white">{animKey.k}</div>
                <div className="text-xs text-slate-400">k</div>
              </motion.div>
              <ChevronRight className="text-slate-500" />
              {/* k² */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                className="text-center">
                <div className="text-2xl font-bold font-mono text-purple-300">{animKey.sq}</div>
                <div className="text-xs text-slate-400">k² = {animKey.k}²</div>
              </motion.div>
              <ChevronRight className="text-slate-500" />
              {/* k² with middle highlighted */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                className="text-center">
                <div className="font-mono text-xl font-bold flex">
                  {animKey.sqStr.split("").map((ch, i) => {
                    const midStart = Math.floor((animKey.sqStr.length - digits) / 2);
                    const inMid = i >= midStart && i < midStart + digits;
                    return (
                      <span key={i} className={inMid ? "text-cyan-300 underline" : "text-slate-500"}>{ch}</span>
                    );
                  })}
                </div>
                <div className="text-xs text-slate-400">middle digit(s)</div>
              </motion.div>
              <ChevronRight className="text-slate-500" />
              {/* extracted */}
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.7 }}
                className="text-center">
                <div className="text-2xl font-bold font-mono text-cyan-300">{animKey.mid}</div>
                <div className="text-xs text-slate-400">extracted</div>
              </motion.div>
              <ChevronRight className="text-slate-500" />
              {/* h(k) */}
              <motion.div initial={{ opacity: 0, scale: 1.3 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.9 }}
                className="text-center">
                <div className="text-3xl font-bold font-mono text-green-400">{animKey.hk}</div>
                <div className="text-xs text-slate-400">h(k) = {animKey.mid} mod {m}</div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MetricsBar n={entries.length} m={m} collisions={collisionCount(entries)} />
      <HashTableGrid cells={cells} m={m} />
    </div>
  );
}

// ─── Folding Method ───────────────────────────────────────────────────────────

function FoldingMethod() {
  const [m, setM] = useState(100);
  const [partSize, setPartSize] = useState(2);
  const [inputKey, setInputKey] = useState("");
  const [entries, setEntries] = useState<HashEntry[]>([]);
  const [foldAnim, setFoldAnim] = useState<{ key: string; parts: string[]; sum: number; hk: number } | null>(null);
  const { addXP } = useProgressStore();

  const insert = () => {
    const kStr = inputKey.trim();
    if (!kStr || isNaN(Number(kStr))) { toast.error("Enter a valid numeric key"); return; }
    // Split into parts of `partSize` digits
    const parts: string[] = [];
    for (let i = 0; i < kStr.length; i += partSize) {
      parts.push(kStr.substring(i, i + partSize));
    }
    const sum = parts.reduce((acc, p) => acc + parseInt(p || "0"), 0);
    const hk  = sum % m;
    setFoldAnim({ key: kStr, parts, sum, hk });
    const existing = entries.map(e => e.hashValue);
    const isCol = existing.includes(hk);
    setEntries(prev => [...prev, { key: parseInt(kStr), hashValue: hk, isCollision: isCol }]);
    setInputKey("");
    addXP(5);
    toast.success(`h(${kStr}) = ${hk}`, { icon: "🗂" });
  };

  const reset = () => { setEntries([]); setFoldAnim(null); };
  const cells = buildTable(entries, m);

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 border-green-500/30">
        <h3 className="gradient-text font-bold mb-1">Folding Method</h3>
        <p className="text-slate-400 text-sm mb-3">
          Split key into equal parts → add parts → take mod m
        </p>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs text-slate-400">Table Size (m)</label>
            <input type="number" min={2} max={1000} value={m}
              onChange={e => { setM(Number(e.target.value)); reset(); }}
              className="mt-1 block w-28 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Part Size (digits)</label>
            <input type="number" min={1} max={5} value={partSize}
              onChange={e => setPartSize(Number(e.target.value))}
              className="mt-1 block w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Key (numeric)</label>
            <input type="text" value={inputKey} placeholder="e.g. 123456"
              onChange={e => setInputKey(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && insert()}
              className="mt-1 block w-36 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
          </div>
          <button onClick={insert}
            className="flex items-center gap-1 bg-green-700 hover:bg-green-600 text-white text-sm px-4 py-1.5 rounded transition-colors">
            <Plus size={14} /> Insert
          </button>
          <button onClick={reset}
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm px-3 py-1.5 rounded transition-colors">
            <RotateCcw size={14} /> Reset
          </button>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {foldAnim && (
          <motion.div key={foldAnim.key + foldAnim.sum} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} className="glass-card p-5 border-green-500/20">
            <p className="text-xs text-slate-400 mb-3">Folding Steps for key = {foldAnim.key}</p>
            {/* Splitting animation */}
            <div className="flex items-center gap-2 flex-wrap mb-4">
              <span className="font-mono text-white text-lg font-bold">{foldAnim.key}</span>
              <ChevronRight className="text-slate-500" />
              <div className="flex gap-1">
                {foldAnim.parts.map((p, i) => (
                  <motion.div key={i} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="bg-green-900/50 border border-green-500 rounded px-2 py-1 font-mono text-green-300 text-sm">
                    {p}
                  </motion.div>
                ))}
              </div>
            </div>
            {/* Addition */}
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: foldAnim.parts.length * 0.15 + 0.1 }}
              className="text-sm text-slate-300 font-mono mb-2">
              Sum = {foldAnim.parts.join(" + ")} = <span className="text-yellow-300 font-bold">{foldAnim.sum}</span>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: foldAnim.parts.length * 0.15 + 0.3 }}
              className="text-sm font-mono">
              h(k) = {foldAnim.sum} mod {m} = <span className="text-green-400 font-bold text-lg">{foldAnim.hk}</span>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <MetricsBar n={entries.length} m={m} collisions={collisionCount(entries)} />
      <HashTableGrid cells={cells} m={Math.min(m, 32)} />
    </div>
  );
}

// ─── Digit Extraction Method ──────────────────────────────────────────────────

function DigitExtractionMethod() {
  const [m, setM] = useState(10);
  const [inputKey, setInputKey] = useState("");
  const [selectedPositions, setSelectedPositions] = useState<number[]>([0, 2]); // 0-indexed positions to extract
  const [entries, setEntries] = useState<HashEntry[]>([]);
  const [lastAnim, setLastAnim] = useState<{ key: string; extracted: string; hk: number } | null>(null);
  const { addXP } = useProgressStore();

  const keyLen = Math.max(inputKey.length, 6);

  const togglePos = (pos: number) => {
    setSelectedPositions(prev =>
      prev.includes(pos) ? prev.filter(p => p !== pos) : [...prev, pos].sort((a, b) => a - b)
    );
  };

  const insert = () => {
    const kStr = inputKey.trim();
    if (!kStr) { toast.error("Enter a key"); return; }
    const extracted = selectedPositions
      .filter(p => p < kStr.length)
      .map(p => kStr[p])
      .join("") || "0";
    const hk = parseInt(extracted) % m;
    setLastAnim({ key: kStr, extracted, hk });
    const existing = entries.map(e => e.hashValue);
    const isCol = existing.includes(hk);
    setEntries(prev => [...prev, { key: parseInt(kStr) || 0, hashValue: hk, isCollision: isCol }]);
    setInputKey("");
    addXP(5);
    toast.success(`h(${kStr}) = ${hk}`, { icon: "✂️" });
  };

  const reset = () => { setEntries([]); setLastAnim(null); };
  const cells = buildTable(entries, m);

  return (
    <div className="space-y-4">
      <div className="glass-card p-4 border-orange-500/30">
        <h3 className="gradient-text font-bold mb-1">Digit Extraction Method</h3>
        <p className="text-slate-400 text-sm mb-3">
          Select digit positions to extract → concatenate → mod m
        </p>
        <div className="flex gap-3 flex-wrap items-end">
          <div>
            <label className="text-xs text-slate-400">Table Size (m)</label>
            <input type="number" min={2} max={100} value={m}
              onChange={e => { setM(Number(e.target.value)); reset(); }}
              className="mt-1 block w-24 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
          </div>
          <div>
            <label className="text-xs text-slate-400">Key (numeric)</label>
            <input type="text" value={inputKey} placeholder="e.g. 123456"
              onChange={e => setInputKey(e.target.value.replace(/\D/g, ""))}
              onKeyDown={e => e.key === "Enter" && insert()}
              className="mt-1 block w-36 bg-slate-800 border border-slate-600 rounded px-2 py-1.5 text-sm text-white" />
          </div>
          <button onClick={insert}
            className="flex items-center gap-1 bg-orange-700 hover:bg-orange-600 text-white text-sm px-4 py-1.5 rounded transition-colors">
            <Plus size={14} /> Insert
          </button>
          <button onClick={reset}
            className="flex items-center gap-1 bg-slate-700 hover:bg-slate-600 text-slate-300 text-sm px-3 py-1.5 rounded transition-colors">
            <RotateCcw size={14} /> Reset
          </button>
        </div>

        {/* Position selector */}
        <div className="mt-4">
          <p className="text-xs text-slate-400 mb-2">Select digit positions to extract (0-indexed):</p>
          <div className="flex gap-1 flex-wrap">
            {Array.from({ length: keyLen }).map((_, i) => (
              <button key={i} onClick={() => togglePos(i)}
                className={`w-8 h-8 rounded text-sm font-mono font-bold border transition-colors
                  ${selectedPositions.includes(i)
                    ? "bg-orange-600 border-orange-400 text-white"
                    : "bg-slate-800 border-slate-600 text-slate-400 hover:border-orange-500"}`}>
                {i}
              </button>
            ))}
          </div>
          <p className="text-xs text-slate-500 mt-1">Selected: [{selectedPositions.join(", ")}]</p>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {lastAnim && (
          <motion.div key={lastAnim.key + lastAnim.extracted} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }} className="glass-card p-5 border-orange-500/20">
            <p className="text-xs text-slate-400 mb-3">Extraction for key = {lastAnim.key}</p>
            <div className="flex items-center gap-2 flex-wrap mb-3">
              <div className="flex">
                {lastAnim.key.split("").map((ch, i) => (
                  <motion.span key={i} initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08 }}
                    className={`w-7 h-9 flex flex-col items-center justify-center border font-mono font-bold text-sm rounded mx-0.5
                      ${selectedPositions.includes(i)
                        ? "bg-orange-700/50 border-orange-400 text-orange-200"
                        : "bg-slate-800/50 border-slate-700 text-slate-500"}`}>
                    {ch}
                    <span className="text-[8px] text-slate-500">{i}</span>
                  </motion.span>
                ))}
              </div>
              <ChevronRight className="text-slate-500" />
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 }}
                className="text-center">
                <div className="text-2xl font-bold font-mono text-orange-300">{lastAnim.extracted}</div>
                <div className="text-xs text-slate-400">extracted digits</div>
              </motion.div>
              <ChevronRight className="text-slate-500" />
              <motion.div initial={{ opacity: 0, scale: 1.2 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }} className="text-center">
                <div className="text-3xl font-bold font-mono text-green-400">{lastAnim.hk}</div>
                <div className="text-xs text-slate-400">h(k) = {lastAnim.extracted} mod {m}</div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MetricsBar n={entries.length} m={m} collisions={collisionCount(entries)} />
      <HashTableGrid cells={cells} m={m} />
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function HashingLabPage() {
  const [activeTab, setActiveTab] = useState<MethodTab>("division");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-indigo-950 p-4 md:p-6">
      <div className="max-w-5xl mx-auto">

        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }}
          className="mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 rounded-lg bg-indigo-600/20 border border-indigo-500/30">
              <Hash className="text-indigo-400" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">Hashing Lab</h1>
              <p className="text-slate-400 text-sm">Explore all 5 hashing methods interactively</p>
            </div>
          </div>

          {/* Info banner */}
          <div className="glass-card p-3 border-indigo-500/20 flex items-start gap-2 text-xs text-slate-400">
            <Info size={14} className="text-indigo-400 mt-0.5 shrink-0" />
            <span>
              <strong className="text-indigo-300">Exam Tip:</strong> Division Method is most common in CT exams.
              Always check if m is prime for Division Method — it gives better distribution.
              Load factor α = n/m; when α &gt; 0.75, performance degrades significantly.
            </span>
          </div>
        </motion.div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 glass-card p-1 overflow-x-auto">
          {TABS.map(tab => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded text-sm font-medium whitespace-nowrap transition-all
                ${activeTab === tab.id
                  ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20"
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"}`}>
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <AnimatePresence mode="wait">
          <motion.div key={activeTab} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }} transition={{ duration: 0.2 }}>
            {activeTab === "division"       && <DivisionMethod />}
            {activeTab === "multiplication" && <MultiplicationMethod />}
            {activeTab === "midsquare"      && <MidSquareMethod />}
            {activeTab === "folding"        && <FoldingMethod />}
            {activeTab === "digit"          && <DigitExtractionMethod />}
          </motion.div>
        </AnimatePresence>

        {/* Complexity reference */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }}
          className="mt-6 glass-card p-4 border-slate-700/50">
          <div className="flex items-center gap-2 mb-3">
            <Zap size={14} className="text-yellow-400" />
            <span className="text-sm font-semibold text-slate-300">Complexity Reference</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            {[
              { op: "Insert (no collision)",  time: "O(1)",      space: "O(n)" },
              { op: "Search (no collision)",  time: "O(1)",      space: "—"    },
              { op: "Insert (with chaining)", time: "O(1+α)",    space: "O(n)" },
              { op: "Search (worst case)",    time: "O(n)",      space: "—"    },
            ].map(r => (
              <div key={r.op} className="bg-slate-800/50 rounded p-2">
                <div className="text-slate-400 mb-1">{r.op}</div>
                <div className="font-mono text-cyan-300">{r.time}</div>
                {r.space !== "—" && <div className="font-mono text-purple-300 text-[10px]">Space: {r.space}</div>}
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
