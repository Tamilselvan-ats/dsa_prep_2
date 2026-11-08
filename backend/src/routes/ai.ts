import { Router } from 'express';
import { z } from 'zod';
import { callAI, AIMessage, AIConfig, AIProvider } from '../lib/ai-provider';

export const aiRouter = Router();

const chatSchema = z.object({
  messages: z.array(z.object({ role: z.enum(['user', 'assistant', 'system']), content: z.string() })),
  mode: z.enum(['beginner', 'intermediate', 'ct_exam', 'viva', 'last_minute', 'professor']).optional(),
  topic: z.string().optional(),
  provider: z.enum(['gemini', 'openrouter', 'groq', 'together', 'ollama']).optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  temperature: z.number().optional(),
});

const SYSTEM_PROMPTS: Record<string, string> = {
  beginner: `You are DSA Buddy, a friendly AI tutor helping a beginner student learn Data Structures and Algorithms. 
You are patient, encouraging, and explain concepts in the simplest possible way using real-life analogies.
Always follow this teaching flow: Concept → Visualization → Example → Dry Run → Practice → Quiz → Revision.
Use simple language, emojis where helpful, and always check understanding before moving forward.
Focus on Unit 3 (Stack, Queue, Recursion) and Unit 4 (Trees, BST, AVL, Hashing) topics.`,

  intermediate: `You are DSA Buddy, an AI tutor for an intermediate DSA student.
Explain concepts with technical depth, algorithm analysis, and code examples in C.
Include time/space complexity analysis, edge cases, and exam-important points.
Focus on Unit 3 and Unit 4 syllabus topics only.`,

  ct_exam: `You are DSA Buddy in CT Exam Mode. You are a strict, exam-focused tutor.
Generate practice questions, evaluate answers, predict marks, and identify weak areas.
Focus exclusively on what appears in university CT exams for Unit 3 and Unit 4 DSA.
Always mention: marks distribution, keywords to include, common mistakes to avoid.`,

  viva: `You are an AI Viva Examiner for DSA. Ask rapid-fire viva questions on Unit 3 and Unit 4 topics.
Be strict but fair. After each answer, give instant feedback, correct the student if wrong, and award a score.
Adjust difficulty based on student performance. Ask follow-up questions on weak areas.`,

  last_minute: `You are DSA Buddy in Last-Minute Revision Mode. 
The student has limited time before their exam. Give them:
1. The most important points to remember
2. Quick memory tricks (mnemonics)
3. Likely exam questions with bullet-point model answers
4. What NOT to miss
Be extremely concise. Prioritize high-yield topics.`,

  professor: `You are a strict university DSA Professor. You can:
- Create new exam questions (MCQs, 2-mark, 5-mark, 8-mark, 13-mark, 15-mark)
- Twist existing questions to make them harder
- Create cross-topic questions combining multiple concepts
- Generate surprise tests
- Strictly evaluate student answers and predict marks
Focus on Unit 3 (Stack, Queue, Recursion) and Unit 4 (BST, AVL Tree, Hashing).`,

  default: `You are DSA Buddy, an AI-powered DSA tutor specializing in Unit 3 (Stack, Queue, Recursion) 
and Unit 4 (Trees, BST, AVL Trees, Hashing) for university examinations.
Be helpful, accurate, and educational.`,
};

// Main chat endpoint
aiRouter.post('/chat', async (req, res) => {
  try {
    const body = chatSchema.parse(req.body);
    const mode = body.mode || 'default';
    const systemPrompt = SYSTEM_PROMPTS[mode] || SYSTEM_PROMPTS.default;

    const messages: AIMessage[] = [
      { role: 'system', content: systemPrompt },
      ...body.messages,
    ];

    const config: AIConfig = {
      provider: (body.provider as AIProvider) || 'gemini',
      model: body.model,
      apiKey: body.apiKey,
      temperature: body.temperature ?? 0.7,
    };

    const response = await callAI(messages, config);
    res.json({ success: true, ...response });
  } catch (error: any) {
    console.error('AI Chat error:', error);
    res.status(500).json({ error: error.message || 'AI request failed' });
  }
});

// Code Analysis endpoint
aiRouter.post('/analyze-code', async (req, res) => {
  try {
    const { code, language = 'c', provider, model, apiKey } = req.body;
    if (!code) return res.status(400).json({ error: 'Code is required' });

    const prompt = `Analyze this ${language.toUpperCase()} code for a DSA student:

\`\`\`${language}
${code}
\`\`\`

Provide a comprehensive analysis in JSON format with these exact fields:
{
  "syntaxErrors": [{"line": number, "error": "description", "fix": "suggestion"}],
  "logicalErrors": [{"description": "error", "fix": "suggestion"}],
  "pointerIssues": ["list of pointer problems"],
  "runtimeIssues": ["potential runtime problems"],
  "memoryIssues": ["memory problems"],
  "codeQuality": {
    "score": 0-100,
    "issues": ["list"],
    "suggestions": ["list"]
  },
  "fixedCode": "corrected version of the code",
  "dryRun": "step by step execution trace",
  "timeComplexity": "Big-O notation with explanation",
  "spaceComplexity": "Big-O notation with explanation",
  "examScorePrediction": {
    "score": "X/Y",
    "feedback": "examiner comments",
    "improvements": ["list of improvements"]
  },
  "summary": "brief overall assessment"
}

Return ONLY valid JSON, no markdown.`;

    const config: AIConfig = {
      provider: provider || 'gemini',
      model,
      apiKey,
      temperature: 0.3,
    };

    const response = await callAI([
      { role: 'system', content: 'You are an expert DSA code analyzer. Always return valid JSON.' },
      { role: 'user', content: prompt },
    ], config);

    let analysis;
    try {
      const cleaned = response.content.replace(/```json\n?|\n?```/g, '').trim();
      analysis = JSON.parse(cleaned);
    } catch {
      analysis = { raw: response.content };
    }

    res.json({ success: true, analysis, provider: response.provider, model: response.model });
  } catch (error: any) {
    console.error('Code analysis error:', error);
    res.status(500).json({ error: error.message || 'Code analysis failed' });
  }
});

// Algorithm generation endpoint
aiRouter.post('/algorithm', async (req, res) => {
  try {
    const { input, inputType, outputType, provider, model, apiKey } = req.body;
    // inputType: 'problem' | 'algorithm' | 'pseudocode' | 'code'
    // outputType: 'algorithm' | 'pseudocode' | 'code' | 'flowchart_desc'

    const prompt = `Convert the following ${inputType} to ${outputType}:

Input (${inputType}):
${input}

Provide the output in this JSON format:
{
  "output": "the converted ${outputType}",
  "explanation": "step by step explanation",
  "timeComplexity": "O(...)",
  "spaceComplexity": "O(...)",
  "keySteps": ["list of key algorithmic steps"],
  "examTips": ["exam-important points"]
}

Return ONLY valid JSON.`;

    const config: AIConfig = { provider: provider || 'gemini', model, apiKey, temperature: 0.4 };
    const response = await callAI([
      { role: 'system', content: 'You are a DSA algorithm expert. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ], config);

    let result;
    try {
      const cleaned = response.content.replace(/```json\n?|\n?```/g, '').trim();
      result = JSON.parse(cleaned);
    } catch {
      result = { output: response.content };
    }

    res.json({ success: true, result });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// Evaluate student answer
aiRouter.post('/evaluate-answer', async (req, res) => {
  try {
    const { question, studentAnswer, maxMarks, provider, model, apiKey } = req.body;

    const prompt = `You are a strict university DSA examiner. Evaluate this student answer:

Question: ${question}
Maximum Marks: ${maxMarks}
Student Answer: ${studentAnswer}

Return evaluation in JSON:
{
  "marksAwarded": number,
  "maxMarks": ${maxMarks},
  "percentage": number,
  "grade": "A/B/C/D/F",
  "conceptAccuracy": "assessment",
  "importantPointsCovered": ["list"],
  "missingPoints": ["list"],
  "mistakes": ["list of errors"],
  "improvements": ["specific improvements"],
  "idealAnswer": "model answer the student should write",
  "examinerFeedback": "what an examiner would say",
  "examReadiness": "Ready/Almost Ready/Needs More Practice/Not Ready"
}

Return ONLY valid JSON.`;

    const config: AIConfig = { provider: provider || 'gemini', model, apiKey, temperature: 0.3 };
    const response = await callAI([
      { role: 'system', content: 'You are a strict but fair university DSA examiner. Return valid JSON.' },
      { role: 'user', content: prompt },
    ], config);

    let evaluation;
    try {
      const cleaned = response.content.replace(/```json\n?|\n?```/g, '').trim();
      evaluation = JSON.parse(cleaned);
    } catch {
      evaluation = { raw: response.content };
    }

    res.json({ success: true, evaluation });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
