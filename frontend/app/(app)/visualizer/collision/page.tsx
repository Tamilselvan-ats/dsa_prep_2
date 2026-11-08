"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, RotateCcw, Hash, Layers, Link, ChevronRight, AlertTriangle, Info } from "lucide-react";
import { toast } from "sonner";
import { useProgressStore } from "@/lib/stores/progress-store";

// ─── Types ───────────────────────────────────────────────────────────────────
type CollisionMethod = "chaining" | "linear" | "quadratic" | "double";

interface ProbeStep { probe: number; cell: number; occupied: boolean; }
interface InsertResult { key: number; h1: number; steps: ProbeStep[]; finalSlot: number; collision: boolean; }

// ─── Hash Functions ───────────────────────────────────────────────────────────
function h1(key: number, m: number) { return key % m; }
function h2(key: number, m: number) { return 1 + (key % (m - 1)); }

function linearProbe(key: number, m: number, table: (number | null)[]): InsertResult {
  const start = h1(key, m);
  const steps: ProbeStep[] = [];
  for (let i = 0; i < m; i++) {
    const cell = (start + i) % m;
    const occupied = table[cell] !== null && table[cell] !== key;
    steps.push({ probe: i, cell, occupied });
    if (!occupied) {
      return { key, h1: start, steps, finalSlot: cell, collision: i > 0 };
    }
  }
  return { key, h1: start, steps, finalSlot: -1, collision: true };
}

function quadraticProbe(key: number, m: number, table: (number | null)[]): InsertResult {
  const start = h1(key, m);
  const steps: ProbeStep[] = [];
  for (let i = 0; i < m; i++) {
    const cell = (start + i * i) % m;
    const occupied = table[cell] !== null && table[cell] !== key;
    steps.push({ probe: i, cell, occupied });
    if (!occupied) {
      return { key, h1: start, steps, finalSlot: cell, collision: i > 0 };
    }
  }
  return { key, h1: start, steps, finalSlot: -1, collision: true };
}

function doubleHashProbe(key: number, m: number, table: (number | null)[]): InsertResult {
  const start = h1(key, m);
  const step = h2(key, m);
  const steps: ProbeStep[] = [];
  for (let i = 0; i < m; i++) {
    const cell = (start + i * step) % m;
    const occupied = table[cell] !== null && table[cell] !== key;
    steps.push({ probe: i, cell, occupied });
    if (!occupied) {
      return { key, h1: start, steps, finalSlot: cell, collision: i > 0 };
    }
  }
  return { key, h1: start, steps, finalSlot: -1, collision: true };
}

export default function CollisionLabPage() {
  const [method, setMethod] = useState<CollisionMethod>("chaining");
  const [tableSize, setTableSize] = useState(7);
  const [inputKey, setInputKey] = useState("");
  const [keys, setKeys] = useState<number[]>([]);
  const [results, setResults] = useState<InsertResult[]>([]);
  const [chains, setChains] = useState<Record<number, number[]>>({});
  const [openTable, setOpenTable] = useState<(number | null)[]>(Array(7).fill(null));
  const [lastResult, setLastResult] = useState<InsertResult | null>(null);
  const { addXP } = useProgressStore();

  const reset = useCallback(() => {
    setKeys([]);
    setResults([]);
    setChains({});
    setOpenTable(Array(tableSize).fill(null));
    setLastResult(null);
  }, [tableSize]);

  const insertKey = useCallback(() => {
    const key = parseInt(inputKey);
    if (isNaN(key)) { toast.error("Enter a valid integer key"); return; }
    if (keys.includes(key)) { toast.error("Key already inserted"); return; }

    if (method === "chaining") {
      const slot = h1(key, tableSize);
      const newChains = { ...chains };
      if (!newChains[slot]) newChains[slot] = [];
      newChains[slot] = [...newChains[slot], key];
      const result: InsertResult = { key, h1: slot, steps: [{ probe: 0, cell: slot, occupied: newChains[slot].length > 1 }], finalSlot: slot, collision: newChains[slot].length > 1 };
      setChains(newChains);
      setLastResult(result);
      setResults(r => [...r, result]);
      setKeys(k => [...k, key]);
      addXP(3);
      toast.success(`${key} → slot [${slot}]${newChains[slot].length > 1 ? " (collision → chained)" : ""}`);
    } else {
      const table = [...openTable];
      let result: InsertResult;
      if (method === "linear") result = linearProbe(key, tableSize, table);
      else if (method === "quadratic") result = quadraticProbe(key, tableSize, table);
      else result = doubleHashProbe(key, tableSize, table);

      if (result.finalSlot === -1) { toast.error("Table is full!"); return; }
      table[result.finalSlot] = key;
      setOpenTable(table);
      setLastResult(result);
      setResults(r => [...r, result]);
      setKeys(k => [...k, key]);
      addXP(3);
      toast.success(`${key} → slot [${result.finalSlot}]${result.collision ? " (collision resolved)" : ""}`);
    }
    setInputKey("");
  }, [inputKey, method, tableSize, keys, chains, openTable, addXP]);

  const totalCollisions = results.filter(r => r.collision).length;
  const totalProbes = results.reduce((sum, r) => sum + r.steps.length, 0);
  const loadFactor = method === "chaining" ? keys.length / tableSize : (openTable.filter(c => c !== null).length) / tableSize;

  const METHOD_INFO: Record<CollisionMethod, { label: string; formula: string; probeFormula: string; color: string }> = {
    chaining:   { label: "Chaining",          formula: "h(k) = k mod m",                              probeFormula: "Each slot = linked list",     color: "text-indigo-400" },
    linear:     { label: "Linear Probing",    formula: "h(k,i) = (h'(k) + i) mod m",                 probeFormula: "i = 0, 1, 2, ...",            color: "text-green-400" },
    quadratic:  { label: "Quadratic Probing", formula: "h(k,i) = (h'(k) + i²) mod m",                probeFormula: "i = 0, 1, 4, 9, ...",         color: "text-yellow-400" },
    double:     { label: "Double Hashing",    formula: "h(k,i) = (h1(k) + i·h2(k)) mod m",           probeFormula: "h2(k) = 1 + (k mod (m-1))",  color: "text-pink-400" },
  };
  const info = METHOD_INFO[method];

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-black gradient-text">Collision Resolution Lab</h1>
        <p className="text-slate-400 mt-1">Visualize Chaining, Linear Probing, Quadratic Probing & Double Hashing</p>
      </div>

      {/* Method Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        {(["chaining","linear","quadratic","double"] as CollisionMethod[]).map(m => (
          <button key={m} onClick={() => { setMethod(m); reset(); }}
            className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all ${method === m ? "bg-indigo-500/30 text-indigo-300 border border-indigo-500/40" : "bg-white/5 text-slate-400 hover:bg-white/10"}`}>
            {METHOD_INFO[m].label}
          </button>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Controls */}
        <div className="space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center gap-3 mb-3">
              <div>
                <label className="text-xs text-slate-400">Table Size (m)</label>
                <div className="flex gap-1 mt-1">
                  {[5,7,11,13].map(s => (
                    <button key={s} onClick={() => { setTableSize(s); reset(); }}
                      className={`w-8 h-8 rounded text-xs font-bold ${tableSize === s ? "bg-indigo-500 text-white" : "bg-white/10 text-slate-300"}`}>{s}</button>
                  ))}
                </div>
              </div>
            </div>

            <label className="text-xs text-slate-400 block mb-1">Insert Key</label>
            <div className="flex gap-2">
              <input value={inputKey} onChange={e => setInputKey(e.target.value)}
                onKeyDown={e => e.key === "Enter" && insertKey()}
                className="flex-1 bg-white/5 border border-white/10 rounded-xl px-3 py-2 font-mono text-sm text-white focus:outline-none focus:border-indigo-500/50"
                placeholder="e.g. 25" type="number" />
              <motion.button onClick={insertKey} whileTap={{ scale: 0.95 }}
                className="px-3 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl text-white text-sm font-semibold flex items-center gap-1">
                <Plus className="w-4 h-4" />
              </motion.button>
            </div>
            <div className="flex flex-wrap gap-1 mt-2">
              {[25, 42, 95, 73, 11, 36, 60].map(k => (
                <button key={k} onClick={() => setInputKey(String(k))}
                  className="px-2 py-0.5 bg-white/5 text-xs text-slate-400 rounded hover:bg-white/10 font-mono">{k}</button>
              ))}
            </div>
            <button onClick={reset} className="mt-3 w-full py-1.5 bg-white/5 rounded-xl text-slate-400 text-xs flex items-center justify-center gap-1 hover:bg-white/10">
              <RotateCcw className="w-3.5 h-3.5" /> Reset Table
            </button>
          </div>

          {/* Stats */}
          <div className="glass-card p-4 space-y-2">
            <h3 className="font-bold text-white text-sm mb-3">Performance Metrics</h3>
            {[
              { label: "Keys Inserted", value: keys.length, color: "text-indigo-400" },
              { label: "Collisions", value: totalCollisions, color: totalCollisions > 0 ? "text-red-400" : "text-green-400" },
              { label: "Total Probes", value: totalProbes, color: "text-yellow-400" },
              { label: "Load Factor (α)", value: loadFactor.toFixed(2), color: loadFactor > 0.7 ? "text-red-400" : "text-green-400" },
              { label: "Avg Probes/Key", value: keys.length > 0 ? (totalProbes / keys.length).toFixed(2) : "0", color: "text-cyan-400" },
            ].map((s, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-slate-400">{s.label}</span>
                <span className={`font-bold font-mono ${s.color}`}>{s.value}</span>
              </div>
            ))}
          </div>

          {/* Formula */}
          <div className="glass-card p-4">
            <div className={`font-bold text-sm mb-2 ${info.color}`}>{info.label}</div>
            <div className="text-xs text-slate-300 font-mono mb-1">{info.formula}</div>
            <div className="text-xs text-slate-400 mb-3">{info.probeFormula}</div>
            {lastResult && (
              <div className="p-2 bg-white/5 rounded-lg text-xs space-y-1">
                <div className="text-slate-400">Last insertion: key = <span className="text-white font-mono">{lastResult.key}</span></div>
                <div className="text-slate-400">h(k) = <span className="text-indigo-300 font-mono">{lastResult.h1}</span></div>
                {lastResult.steps.length > 1 && (
                  <div className="text-slate-400">Probes: <span className="text-yellow-300">{lastResult.steps.length}</span></div>
                )}
                <div className={lastResult.collision ? "text-red-400" : "text-green-400"}>
                  {lastResult.collision ? "⚡ Collision occurred!" : "✅ No collision"}
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Table Visual */}
        <div className="lg:col-span-2 space-y-4">
          <div className="glass-card p-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-bold text-white">Hash Table (m = {tableSize})</h3>
              {loadFactor > 0.7 && (
                <div className="flex items-center gap-1 text-xs text-orange-400">
                  <AlertTriangle className="w-3.5 h-3.5" /> High load factor!
                </div>
              )}
            </div>

            {method === "chaining" ? (
              <div className="space-y-2">
                {Array.from({ length: tableSize }, (_, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center font-mono text-sm font-bold border flex-shrink-0 ${
                      chains[i]?.length > 0 ? "bg-indigo-500/20 border-indigo-500/40 text-indigo-300" : "bg-white/5 border-white/10 text-slate-500"
                    }`}>[{i}]</div>
                    <div className="flex items-center gap-1 flex-wrap">
                      {chains[i]?.length ? (
                        chains[i].map((k, j) => (
                          <motion.div key={j} initial={{ scale: 0 }} animate={{ scale: 1 }}
                            className="flex items-center gap-1">
                            <div className="w-10 h-10 bg-indigo-500/30 border border-indigo-500/50 rounded-lg flex items-center justify-center font-mono text-sm text-indigo-200 font-bold">
                              {k}
                            </div>
                            {j < chains[i].length - 1 && <ChevronRight className="w-3 h-3 text-slate-500" />}
                          </motion.div>
                        ))
                      ) : (
                        <span className="text-xs text-slate-600 italic">NULL</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="space-y-2">
                {Array.from({ length: tableSize }, (_, i) => {
                  const val = openTable[i];
                  const isLastInserted = lastResult?.finalSlot === i;
                  const isProbed = lastResult?.steps.some(s => s.cell === i && s.occupied);
                  return (
                    <motion.div key={i} className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${
                      isLastInserted ? "bg-green-500/15 border-green-500/40" :
                      isProbed ? "bg-yellow-500/10 border-yellow-500/30" :
                      val !== null ? "bg-indigo-500/10 border-indigo-500/20" :
                      "bg-white/3 border-white/5"
                    }`}
                      animate={isLastInserted ? { scale: [1, 1.02, 1] } : {}}
                      transition={{ duration: 0.3 }}>
                      <div className="w-8 text-xs font-mono text-slate-500">[{i}]</div>
                      <div className={`flex-1 font-mono font-bold text-sm ${
                        isLastInserted ? "text-green-300" : val !== null ? "text-indigo-300" : "text-slate-600"
                      }`}>
                        {val !== null ? val : "—"}
                      </div>
                      {isLastInserted && <span className="text-xs text-green-400">← inserted</span>}
                      {isProbed && !isLastInserted && <span className="text-xs text-yellow-400">probed</span>}
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Last insertion probe sequence */}
          {lastResult && lastResult.steps.length > 0 && method !== "chaining" && (
            <div className="glass-card p-4">
              <h3 className="font-bold text-white mb-3 text-sm">Probe Sequence for key {lastResult.key}</h3>
              <div className="flex flex-wrap gap-2">
                {lastResult.steps.map((step, i) => (
                  <div key={i} className={`px-3 py-1.5 rounded-lg text-xs font-mono border ${
                    i === lastResult.steps.length - 1 && lastResult.finalSlot !== -1
                      ? "bg-green-500/20 border-green-500/40 text-green-300"
                      : step.occupied
                      ? "bg-red-500/15 border-red-500/30 text-red-300"
                      : "bg-white/5 border-white/10 text-slate-400"
                  }`}>
                    <div>Probe {step.probe}: cell[{step.cell}]</div>
                    <div className="text-xs opacity-70">{step.occupied ? "occupied" : i === lastResult.steps.length - 1 ? "✅ inserted" : "free"}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Comparison */}
          <div className="glass-card p-4">
            <h3 className="font-bold text-white mb-3 text-sm">Method Comparison</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="border-b border-white/10">
                  <th className="text-left py-2 text-slate-400">Method</th>
                  <th className="text-left py-2 text-slate-400">Clustering</th>
                  <th className="text-left py-2 text-slate-400">Load Factor Limit</th>
                  <th className="text-left py-2 text-slate-400">Worst Case</th>
                </tr></thead>
                <tbody>
                  {[
                    { method: "Chaining", cluster: "None", limit: "α > 1 OK", worst: "O(n)" },
                    { method: "Linear Probing", cluster: "Primary", limit: "α < 0.7", worst: "O(n)" },
                    { method: "Quadratic Probing", cluster: "Secondary", limit: "α < 0.5", worst: "O(n)" },
                    { method: "Double Hashing", cluster: "None", limit: "α < 0.7", worst: "O(n)" },
                  ].map((row, i) => (
                    <tr key={i} className="border-b border-white/5">
                      <td className="py-2 text-indigo-300 font-semibold">{row.method}</td>
                      <td className="py-2 text-slate-300">{row.cluster}</td>
                      <td className="py-2 text-slate-300">{row.limit}</td>
                      <td className="py-2 text-slate-300">{row.worst}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
