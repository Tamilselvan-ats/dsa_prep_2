// AI Provider Abstraction Layer
// Supports: Gemini, OpenRouter, Groq, Together AI, Ollama

export type AIProvider = 'gemini' | 'openrouter' | 'groq' | 'together' | 'ollama';

export interface AIMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface AIConfig {
  provider: AIProvider;
  model?: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface AIResponse {
  content: string;
  provider: AIProvider;
  model: string;
  tokens?: number;
}

export async function callAI(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
  switch (config.provider) {
    case 'gemini':
      return callGemini(messages, config);
    case 'openrouter':
      return callOpenRouter(messages, config);
    case 'groq':
      return callGroq(messages, config);
    case 'together':
      return callTogether(messages, config);
    case 'ollama':
      return callOllama(messages, config);
    default:
      throw new Error(`Unknown AI provider: ${config.provider}`);
  }
}

async function callGemini(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
  const { GoogleGenerativeAI } = await import('@google/generative-ai');
  const apiKey = config.apiKey || process.env.GEMINI_API_KEY || '';
  const genAI = new GoogleGenerativeAI(apiKey);
  const modelName = config.model || 'gemini-1.5-flash';
  const model = genAI.getGenerativeModel({ model: modelName });

  const systemMsg = messages.find(m => m.role === 'system')?.content || '';
  const userMessages = messages.filter(m => m.role !== 'system');

  const history = userMessages.slice(0, -1).map(m => ({
    role: m.role === 'user' ? 'user' : 'model',
    parts: [{ text: m.content }],
  }));

  const chat = model.startChat({
    history,
    generationConfig: {
      temperature: config.temperature ?? 0.7,
      maxOutputTokens: config.maxTokens ?? 8192,
    },
    systemInstruction: systemMsg || undefined,
  });

  const lastMessage = userMessages[userMessages.length - 1];
  const result = await chat.sendMessage(lastMessage.content);
  const text = result.response.text();

  return { content: text, provider: 'gemini', model: modelName };
}

async function callOpenRouter(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
  const apiKey = config.apiKey || process.env.OPENROUTER_API_KEY || '';
  const model = config.model || 'meta-llama/llama-3.2-3b-instruct:free';

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': 'https://dsa-ct-master.app',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4096,
    }),
  });

  const data = await response.json() as any;
  if (!response.ok) throw new Error(data.error?.message || 'OpenRouter error');

  return {
    content: data.choices[0].message.content,
    provider: 'openrouter',
    model,
    tokens: data.usage?.total_tokens,
  };
}

async function callGroq(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
  const { default: Groq } = await import('groq-sdk');
  const apiKey = config.apiKey || process.env.GROQ_API_KEY || '';
  const groq = new Groq({ apiKey });
  const model = config.model || 'llama-3.3-70b-versatile';

  const completion = await groq.chat.completions.create({
    messages: messages as any,
    model,
    temperature: config.temperature ?? 0.7,
    max_tokens: config.maxTokens ?? 4096,
  });

  return {
    content: completion.choices[0].message.content || '',
    provider: 'groq',
    model,
    tokens: completion.usage?.total_tokens,
  };
}

async function callTogether(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
  const apiKey = config.apiKey || process.env.TOGETHER_API_KEY || '';
  const model = config.model || 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo';

  const response = await fetch('https://api.together.xyz/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: config.temperature ?? 0.7,
      max_tokens: config.maxTokens ?? 4096,
    }),
  });

  const data = await response.json() as any;
  if (!response.ok) throw new Error(data.error?.message || 'Together AI error');

  return {
    content: data.choices[0].message.content,
    provider: 'together',
    model,
    tokens: data.usage?.total_tokens,
  };
}

async function callOllama(messages: AIMessage[], config: AIConfig): Promise<AIResponse> {
  const baseUrl = config.baseUrl || process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
  const model = config.model || 'llama3.2';

  const response = await fetch(`${baseUrl}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      messages,
      stream: false,
      options: { temperature: config.temperature ?? 0.7 },
    }),
  });

  const data = await response.json() as any;
  if (!response.ok) throw new Error(data.error || 'Ollama error');

  return {
    content: data.message.content,
    provider: 'ollama',
    model,
  };
}
