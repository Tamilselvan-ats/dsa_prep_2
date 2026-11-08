import { AISettings } from "@/lib/stores/ai-store";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";

export interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

export type TutorMode = "beginner" | "intermediate" | "ct_exam" | "viva" | "last_minute" | "professor";

export async function sendChatMessage(
  messages: ChatMessage[],
  mode: TutorMode,
  settings: AISettings
): Promise<string> {
  const response = await fetch(`${API_BASE}/api/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      mode,
      provider: settings.provider,
      model: settings.model,
      apiKey: settings.apiKey || undefined,
      temperature: settings.temperature,
    }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).error || `AI request failed: ${response.statusText}`);
  }

  const data = await response.json();
  return data.content;
}

export async function generateQuestions(params: {
  topicName: string;
  unit?: "unit3" | "unit4";
  type: string;
  difficulty: string;
  count?: number;
  settings: AISettings;
}) {
  const response = await fetch(`${API_BASE}/api/questions/generate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      topicName: params.topicName,
      unit: params.unit,
      type: params.type,
      difficulty: params.difficulty,
      count: params.count || 5,
      provider: params.settings.provider,
      model: params.settings.model,
      apiKey: params.settings.apiKey || undefined,
    }),
  });

  if (!response.ok) throw new Error("Question generation failed");
  const data = await response.json();
  return data.questions;
}

export async function analyzeCode(code: string, language: string, settings: AISettings) {
  const response = await fetch(`${API_BASE}/api/ai/analyze-code`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code, language,
      provider: settings.provider,
      model: settings.model,
      apiKey: settings.apiKey || undefined,
    }),
  });

  if (!response.ok) throw new Error("Code analysis failed");
  const data = await response.json();
  return data.analysis;
}

export async function evaluateAnswer(params: {
  question: string;
  studentAnswer: string;
  maxMarks: number;
  settings: AISettings;
}) {
  const response = await fetch(`${API_BASE}/api/ai/evaluate-answer`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      question: params.question,
      studentAnswer: params.studentAnswer,
      maxMarks: params.maxMarks,
      provider: params.settings.provider,
      model: params.settings.model,
      apiKey: params.settings.apiKey || undefined,
    }),
  });

  if (!response.ok) throw new Error("Answer evaluation failed");
  const data = await response.json();
  return data.evaluation;
}

export async function generateAlgorithm(params: {
  input: string;
  inputType: string;
  outputType: string;
  settings: AISettings;
}) {
  const response = await fetch(`${API_BASE}/api/ai/algorithm`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      input: params.input,
      inputType: params.inputType,
      outputType: params.outputType,
      provider: params.settings.provider,
      model: params.settings.model,
      apiKey: params.settings.apiKey || undefined,
    }),
  });

  if (!response.ok) throw new Error("Algorithm generation failed");
  const data = await response.json();
  return data.result;
}

export async function generateExamPaper(params: {
  pattern: string;
  unit?: string;
  settings: AISettings;
}) {
  const response = await fetch(`${API_BASE}/api/questions/generate-paper`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      pattern: params.pattern,
      unit: params.unit,
      provider: params.settings.provider,
      model: params.settings.model,
      apiKey: params.settings.apiKey || undefined,
    }),
  });

  if (!response.ok) throw new Error("Paper generation failed");
  const data = await response.json();
  return data.paper;
}

// Direct Gemini API call for client-side use (when backend is not available)
export async function callGeminiDirect(
  prompt: string,
  systemPrompt: string,
  apiKey: string,
  model = "gemini-1.5-flash"
): Promise<string> {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.7, maxOutputTokens: 8192 },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error((err as any).error?.message || "Gemini API error");
  }

  const data = await response.json();
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
}
