"use client";

import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Settings, CheckCircle, XCircle, Loader2, Eye, EyeOff,
  ExternalLink, Save, RefreshCw, Zap, Server, Cpu, Globe, Home,
  Thermometer, ChevronDown
} from "lucide-react";
import {
  useAIStore,
  AIProvider,
  DEFAULT_MODELS,
} from "@/lib/stores/ai-store";
import { sendChatMessage } from "@/lib/api";

// ─── Types ───────────────────────────────────────────────────────────────────

type ConnectionStatus = "idle" | "testing" | "ok" | "fail";

interface ProviderConfig {
  id: AIProvider;
  name: string;
  tagline: string;
  badge: string;
  badgeColor: string;
  icon: React.ReactNode;
  apiKeyLabel: string;
  apiKeyLink?: string;
  apiKeyLinkLabel?: string;
  needsKey: boolean;
  baseUrlEditable?: boolean;
  defaultBaseUrl?: string;
}

// ─── Provider Config ──────────────────────────────────────────────────────────

const PROVIDERS: ProviderConfig[] = [
  {
    id: "gemini",
    name: "Google Gemini",
    tagline: "Best quality, free tier available",
    badge: "Free + Best Quality",
    badgeColor: "bg-blue-500/20 text-blue-300 border-blue-500/40",
    icon: <span className="text-2xl">🤖</span>,
    apiKeyLabel: "Gemini API Key",
    apiKeyLink: "https://aistudio.google.com/app/apikey",
    apiKeyLinkLabel: "Get Gemini API Key free →",
    needsKey: true,
  },
  {
    id: "openrouter",
    name: "OpenRouter",
    tagline: "Access 100+ models, free tier available",
    badge: "Free Models Available",
    badgeColor: "bg-purple-500/20 text-purple-300 border-purple-500/40",
    icon: <Globe size={22} className="text-purple-400" />,
    apiKeyLabel: "OpenRouter API Key",
    apiKeyLink: "https://openrouter.ai/keys",
    apiKeyLinkLabel: "Get OpenRouter API Key →",
    needsKey: true,
  },
  {
    id: "groq",
    name: "Groq",
    tagline: "Ultra-fast inference, free tier",
    badge: "Ultra-Fast ⚡",
    badgeColor: "bg-orange-500/20 text-orange-300 border-orange-500/40",
    icon: <Zap size={22} className="text-orange-400" />,
    apiKeyLabel: "Groq API Key",
    apiKeyLink: "https://console.groq.com/keys",
    apiKeyLinkLabel: "Get Groq API Key free →",
    needsKey: true,
  },
  {
    id: "together",
    name: "Together AI",
    tagline: "Open source models, good free tier",
    badge: "Good Free Tier",
    badgeColor: "bg-green-500/20 text-green-300 border-green-500/40",
    icon: <Server size={22} className="text-green-400" />,
    apiKeyLabel: "Together AI API Key",
    apiKeyLink: "https://api.together.xyz/settings/api-keys",
    apiKeyLinkLabel: "Get Together AI API Key →",
    needsKey: true,
  },
  {
    id: "ollama",
    name: "Ollama (Local)",
    tagline: "Run models locally, completely free & private",
    badge: "100% Free & Private",
    badgeColor: "bg-cyan-500/20 text-cyan-300 border-cyan-500/40",
    icon: <Home size={22} className="text-cyan-400" />,
    apiKeyLabel: "",
    needsKey: false,
    baseUrlEditable: true,
    defaultBaseUrl: "http://localhost:11434",
  },
];

// ─── Temperature labels ───────────────────────────────────────────────────────

function getTempLabel(temp: number): string {
  if (temp <= 0.2) return "Deterministic (Best for code)";
  if (temp <= 0.5) return "Focused & Precise";
  if (temp <= 0.7) return "Balanced (Recommended)";
  if (temp <= 0.9) return "Creative & Varied";
  return "Highly Random";
}

function getTempColor(temp: number): string {
  if (temp <= 0.3) return "text-blue-400";
  if (temp <= 0.6) return "text-green-400";
  if (temp <= 0.8) return "text-yellow-400";
  return "text-red-400";
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useAIStore();

  const [localSettings, setLocalSettings] = useState({ ...settings });
  const [showKey, setShowKey] = useState(false);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [testResponse, setTestResponse] = useState("");
  const [hasChanges, setHasChanges] = useState(false);

  const selectedProvider = PROVIDERS.find((p) => p.id === localSettings.provider)!;
  const models = DEFAULT_MODELS[localSettings.provider];

  // ── Update helpers ────────────────────────────────────────────────────────

  const update = useCallback(<K extends keyof typeof localSettings>(key: K, value: typeof localSettings[K]) => {
    setLocalSettings((prev) => ({ ...prev, [key]: value }));
    setHasChanges(true);
  }, []);

  const selectProvider = useCallback((id: AIProvider) => {
    const newModel = DEFAULT_MODELS[id][0];
    const pConfig = PROVIDERS.find((p) => p.id === id)!;
    setLocalSettings((prev) => ({
      ...prev,
      provider: id,
      model: newModel,
      baseUrl: pConfig.defaultBaseUrl || prev.baseUrl,
    }));
    setHasChanges(true);
    setStatus("idle");
    setTestResponse("");
  }, []);

  // ── Save ──────────────────────────────────────────────────────────────────

  const handleSave = () => {
    updateSettings(localSettings);
    setHasChanges(false);
    toast.success("AI settings saved!");
  };

  // ── Reset ─────────────────────────────────────────────────────────────────

  const handleReset = () => {
    resetSettings();
    setLocalSettings({
      provider: "gemini",
      model: "gemini-1.5-flash",
      apiKey: "",
      temperature: 0.7,
    });
    setHasChanges(false);
    setStatus("idle");
    setTestResponse("");
    toast.info("Settings reset to defaults");
  };

  // ── Test Connection ───────────────────────────────────────────────────────

  const handleTest = useCallback(async () => {
    setStatus("testing");
    setTestResponse("");
    try {
      const response = await sendChatMessage(
        [{ role: "user", content: "Reply with exactly: 'DSA CT Master connection successful! 🎓'" }],
        "beginner",
        { ...settings, ...localSettings }
      );
      setTestResponse(response);
      setStatus("ok");
      toast.success("Connection successful!");
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Connection failed";
      setTestResponse(msg);
      setStatus("fail");
      toast.error("Connection failed – check your API key & settings");
    }
  }, [settings, localSettings]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 p-4 md:p-6">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-700/60 border border-slate-600/40">
              <Settings className="text-slate-300" size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold gradient-text">AI Settings</h1>
              <p className="text-slate-400 text-sm">Configure your AI provider, model, and preferences</p>
            </div>
          </div>
          {hasChanges && (
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="text-xs text-yellow-400 bg-yellow-500/10 border border-yellow-500/30 rounded-lg px-3 py-1.5"
            >
              ⚠️ Unsaved changes
            </motion.div>
          )}
        </div>
      </motion.div>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* ── Provider Selection ─────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="glass-card p-5"
        >
          <h2 className="text-base font-bold text-slate-200 mb-1">AI Provider</h2>
          <p className="text-slate-500 text-xs mb-4">Choose your preferred AI backend</p>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {PROVIDERS.map((provider, i) => (
              <motion.button
                key={provider.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => selectProvider(provider.id)}
                className={`relative text-left p-4 rounded-xl border transition-all ${
                  localSettings.provider === provider.id
                    ? "border-indigo-500/60 bg-indigo-500/15 shadow-lg shadow-indigo-500/20"
                    : "border-slate-700/50 bg-slate-800/40 hover:border-slate-600 hover:bg-slate-800/60"
                }`}
              >
                {localSettings.provider === provider.id && (
                  <div className="absolute top-2.5 right-2.5">
                    <CheckCircle size={14} className="text-indigo-400" />
                  </div>
                )}
                <div className="flex items-center gap-3 mb-2">
                  <div className="p-1.5 rounded-lg bg-slate-700/60">{provider.icon}</div>
                  <div>
                    <p className="font-semibold text-slate-200 text-sm">{provider.name}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-500 mb-2">{provider.tagline}</p>
                <span className={`inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full border ${provider.badgeColor}`}>
                  {provider.badge}
                </span>
              </motion.button>
            ))}
          </div>
        </motion.div>

        {/* ── Model + API Key ────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-card p-5"
        >
          <h2 className="text-base font-bold text-slate-200 mb-4">Model Configuration</h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Model Selector */}
            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                Model
              </label>
              <div className="relative">
                <select
                  value={localSettings.model}
                  onChange={(e) => update("model", e.target.value)}
                  className="w-full appearance-none bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-200 focus:outline-none focus:border-indigo-500/60 pr-10 cursor-pointer"
                >
                  {models.map((m) => (
                    <option key={m} value={m} className="bg-slate-800">
                      {m}
                    </option>
                  ))}
                </select>
                <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" />
              </div>
            </div>

            {/* API Key / Base URL */}
            {selectedProvider.needsKey ? (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  {selectedProvider.apiKeyLabel}
                </label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    value={localSettings.apiKey}
                    onChange={(e) => update("apiKey", e.target.value)}
                    placeholder="Enter your API key…"
                    className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60 pr-10"
                  />
                  <button
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    {showKey ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {selectedProvider.apiKeyLink && (
                  <a
                    href={selectedProvider.apiKeyLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 mt-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors"
                  >
                    <ExternalLink size={11} />
                    {selectedProvider.apiKeyLinkLabel}
                  </a>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-400 mb-2 uppercase tracking-wider">
                  Base URL
                </label>
                <input
                  type="text"
                  value={localSettings.baseUrl ?? selectedProvider.defaultBaseUrl ?? ""}
                  onChange={(e) => update("baseUrl", e.target.value)}
                  placeholder={selectedProvider.defaultBaseUrl}
                  className="w-full bg-slate-800/80 border border-slate-700/60 rounded-xl px-4 py-3 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500/60"
                />
                <p className="mt-1.5 text-xs text-slate-500">
                  Make sure Ollama is running: <code className="text-cyan-400">ollama serve</code>
                </p>
              </div>
            )}
          </div>
        </motion.div>

        {/* ── Temperature ───────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="glass-card p-5"
        >
          <div className="flex items-center gap-2 mb-1">
            <Thermometer className="text-orange-400" size={18} />
            <h2 className="text-base font-bold text-slate-200">Temperature</h2>
          </div>
          <p className="text-slate-500 text-xs mb-4">Controls randomness — lower = more focused, higher = more creative</p>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-mono font-bold text-slate-200">{localSettings.temperature.toFixed(2)}</span>
              <span className={`text-xs font-semibold ${getTempColor(localSettings.temperature)}`}>
                {getTempLabel(localSettings.temperature)}
              </span>
            </div>

            <div className="relative">
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={localSettings.temperature}
                onChange={(e) => update("temperature", parseFloat(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer bg-slate-700"
                style={{
                  background: `linear-gradient(to right, #6366f1 0%, #06b6d4 ${localSettings.temperature * 100}%, #334155 ${localSettings.temperature * 100}%)`,
                }}
              />
            </div>

            <div className="flex justify-between text-[10px] text-slate-500">
              <span>0.0 — Deterministic</span>
              <span>0.5 — Balanced</span>
              <span>1.0 — Creative</span>
            </div>

            {/* Quick presets */}
            <div className="flex gap-2 flex-wrap">
              {[
                { label: "Code (0.1)", val: 0.1 },
                { label: "Exam (0.3)", val: 0.3 },
                { label: "Balanced (0.7)", val: 0.7 },
                { label: "Creative (0.9)", val: 0.9 },
              ].map((preset) => (
                <button
                  key={preset.label}
                  onClick={() => update("temperature", preset.val)}
                  className={`text-xs px-3 py-1.5 rounded-lg border transition-all ${
                    Math.abs(localSettings.temperature - preset.val) < 0.01
                      ? "border-indigo-500/60 bg-indigo-500/20 text-indigo-300"
                      : "border-slate-700/60 bg-slate-800/60 text-slate-400 hover:border-slate-600 hover:text-slate-300"
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>
        </motion.div>

        {/* ── Test Connection ───────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass-card p-5"
        >
          <h2 className="text-base font-bold text-slate-200 mb-1">Test Connection</h2>
          <p className="text-slate-500 text-xs mb-4">Verify your settings work before saving</p>

          <div className="flex flex-wrap items-center gap-3 mb-4">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleTest}
              disabled={status === "testing"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-semibold text-sm text-white transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: "linear-gradient(135deg, #6366f1, #8b5cf6)",
                boxShadow: status === "testing" ? "none" : "0 0 15px rgba(99,102,241,0.3)",
              }}
            >
              {status === "testing" ? (
                <><Loader2 className="animate-spin" size={16} /> Testing…</>
              ) : (
                <>🔌 Test Connection</>
              )}
            </motion.button>

            {/* Status badge */}
            <AnimatePresence mode="wait">
              {status === "ok" && (
                <motion.div
                  key="ok"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/15 border border-green-500/40"
                >
                  <CheckCircle size={15} className="text-green-400" />
                  <span className="text-green-300 text-sm font-medium">Connected ✓</span>
                </motion.div>
              )}
              {status === "fail" && (
                <motion.div
                  key="fail"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0 }}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/15 border border-red-500/40"
                >
                  <XCircle size={15} className="text-red-400" />
                  <span className="text-red-300 text-sm font-medium">Failed ✗</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Test response */}
          <AnimatePresence>
            {testResponse && (
              <motion.div
                initial={{ opacity: 0, y: 5 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-3 rounded-xl border text-sm ${
                  status === "ok"
                    ? "bg-green-500/10 border-green-500/30 text-green-200"
                    : "bg-red-500/10 border-red-500/30 text-red-200"
                }`}
              >
                <span className="font-mono text-xs">{testResponse}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Provider-specific tips */}
          <div className="mt-4 p-3 rounded-xl bg-slate-800/60 border border-slate-700/40">
            <p className="text-xs text-slate-500 font-semibold mb-1">
              💡 Tips for {selectedProvider.name}:
            </p>
            <ul className="space-y-1">
              {localSettings.provider === "gemini" && [
                "Free tier: 15 requests/min, 1M tokens/day",
                "Best model: gemini-1.5-flash for DSA questions",
                "gemini-2.0-flash-exp is experimental but powerful",
              ].map((t, i) => <li key={i} className="text-xs text-slate-400">• {t}</li>)}
              {localSettings.provider === "groq" && [
                "Groq is 10x faster than most providers",
                "Free tier: 14,400 requests/day",
                "Best for real-time tutoring and quick answers",
              ].map((t, i) => <li key={i} className="text-xs text-slate-400">• {t}</li>)}
              {localSettings.provider === "openrouter" && [
                "Many free models available (marked with :free)",
                "Sign up for $1 free credits",
                "Best free model: llama-3.2-3b-instruct:free",
              ].map((t, i) => <li key={i} className="text-xs text-slate-400">• {t}</li>)}
              {localSettings.provider === "together" && [
                "$1 free credits on signup",
                "Good for open-source model experimentation",
                "Llama 3.1 8B is fast and accurate",
              ].map((t, i) => <li key={i} className="text-xs text-slate-400">• {t}</li>)}
              {localSettings.provider === "ollama" && [
                "Install Ollama: https://ollama.ai",
                "Run: ollama pull llama3.2 (or any model)",
                "Then start: ollama serve",
                "Completely private — data never leaves your machine",
              ].map((t, i) => <li key={i} className="text-xs text-slate-400">• {t}</li>)}
            </ul>
          </div>
        </motion.div>

        {/* ── Save / Reset ──────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
          className="flex gap-3"
        >
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleSave}
            className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold text-white text-sm transition-all"
            style={{
              background: hasChanges
                ? "linear-gradient(135deg, #6366f1, #8b5cf6, #06b6d4)"
                : "rgba(99,102,241,0.3)",
              boxShadow: hasChanges ? "0 0 20px rgba(99,102,241,0.4)" : "none",
            }}
          >
            <Save size={18} />
            Save Settings
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleReset}
            className="flex items-center gap-2 px-5 py-3 rounded-xl font-semibold text-slate-300 text-sm bg-slate-800/60 border border-slate-700/60 hover:bg-slate-700/60 hover:text-white transition-all"
          >
            <RefreshCw size={16} />
            Reset
          </motion.button>
        </motion.div>

        {/* Current config summary */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="glass-card p-4"
        >
          <p className="text-xs text-slate-500 font-semibold mb-2 uppercase tracking-wider">Current Configuration</p>
          <div className="flex flex-wrap gap-3">
            {[
              { label: "Provider", value: settings.provider },
              { label: "Model", value: settings.model },
              { label: "Temperature", value: settings.temperature.toFixed(2) },
              { label: "API Key", value: settings.apiKey ? `${settings.apiKey.slice(0, 8)}…` : "Not set" },
            ].map((item) => (
              <div key={item.label} className="px-3 py-1.5 rounded-lg bg-slate-800/60 border border-slate-700/40">
                <span className="text-[10px] text-slate-500 block">{item.label}</span>
                <span className="text-xs text-slate-300 font-mono">{item.value}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
}
