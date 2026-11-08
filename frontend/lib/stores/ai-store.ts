import { create } from "zustand";
import { persist } from "zustand/middleware";

export type AIProvider = "gemini" | "openrouter" | "groq" | "together" | "ollama";

export interface AISettings {
  provider: AIProvider;
  model: string;
  apiKey: string;
  temperature: number;
  baseUrl?: string;
}

export const DEFAULT_MODELS: Record<AIProvider, string[]> = {
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash-exp"],
  openrouter: [
    "meta-llama/llama-3.2-3b-instruct:free",
    "microsoft/phi-3-mini-128k-instruct:free",
    "google/gemma-2-9b-it:free",
  ],
  groq: ["llama-3.3-70b-versatile", "llama3-8b-8192", "mixtral-8x7b-32768"],
  together: ["meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo", "mistralai/Mixtral-8x7B-Instruct-v0.1"],
  ollama: ["llama3.2", "mistral", "codellama", "phi3"],
};

interface AIStore {
  settings: AISettings;
  updateSettings: (settings: Partial<AISettings>) => void;
  resetSettings: () => void;
}

const DEFAULT_SETTINGS: AISettings = {
  provider: "gemini",
  model: "gemini-1.5-flash",
  apiKey: "",
  temperature: 0.7,
};

export const useAIStore = create<AIStore>()(
  persist(
    (set) => ({
      settings: DEFAULT_SETTINGS,
      updateSettings: (newSettings) =>
        set((state) => ({
          settings: { ...state.settings, ...newSettings },
        })),
      resetSettings: () => set({ settings: DEFAULT_SETTINGS }),
    }),
    { name: "dsa-ai-settings" }
  )
);
