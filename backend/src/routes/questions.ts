import { Router } from 'express';
import { callAI, AIConfig } from '../lib/ai-provider';
import { z } from 'zod';

export const questionsRouter = Router();

const DSA_TOPICS = {
  unit3: ['Stack ADT', 'Push/Pop/Peek', 'Infix Postfix Conversion', 'Postfix Evaluation', 'Balancing Symbols', 'Recursion', 'Tower of Hanoi', 'Queue ADT', 'Linear Queue', 'Circular Queue', 'Priority Queue', 'Deque', 'Round Robin Scheduling'],
  unit4: ['Tree Terminology', 'Binary Search Tree', 'BST Insertion Deletion Search', 'Tree Traversals (Inorder Preorder Postorder)', 'AVL Tree', 'AVL Rotations (LL RR LR RL)', 'Hashing Methods', 'Collision Resolution'],
};

const generateSchema = z.object({
  topicId: z.number().optional(),
  topicName: z.string().optional(),
  unit: z.enum(['unit3', 'unit4']).optional(),
  type: z.enum(['mcq', 'short_2', 'short_3', 'short_5', 'long_7', 'long_8', 'long_9', 'long_10', 'long_13', 'long_15', 'hots', 'viva', 'coding']),
  difficulty: z.enum(['easy', 'medium', 'hard', 'expert', 'ct_killer']),
  count: z.number().min(1).max(20).default(5),
  provider: z.enum(['gemini', 'openrouter', 'groq', 'together', 'ollama']).optional(),
  model: z.string().optional(),
  apiKey: z.string().optional(),
  pattern: z.string().optional(),
});

function getQuestionPrompt(type: string, difficulty: string, topic: string, count: number): string {
  const difficultyDesc = {
    easy: 'basic recall and definition level',
    medium: 'understanding and application level',
    hard: 'analysis and evaluation level',
    expert: 'synthesis and design level',
    ct_killer: 'tricky, multi-step, highest difficulty for CT exam toppers',
  }[difficulty] || 'medium';

  if (type === 'mcq') {
    return `Generate ${count} MCQ questions about "${topic}" at ${difficultyDesc} difficulty for a university DSA exam.

Return JSON array:
[{
  "question": "question text",
  "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
  "correctAnswer": "A",
  "explanation": "why this is correct with detailed reasoning",
  "wrongOptionsExplanation": {"B": "why B is wrong", "C": "why C is wrong", "D": "why D is wrong"},
  "difficulty": "${difficulty}",
  "keywords": ["key terms"],
  "memoryTrick": "mnemonic or trick"
}]

Rules:
- All 4 options must be plausible
- No trick questions that depend on wording
- Must test actual DSA knowledge
- Include diagram/trace scenarios where relevant
- Return ONLY valid JSON array`;
  }

  if (type.startsWith('short')) {
    const marks = type.split('_')[1];
    return `Generate ${count} ${marks}-mark short answer questions about "${topic}" at ${difficultyDesc} difficulty.

Return JSON array:
[{
  "question": "question text",
  "modelAnswer": "ideal ${marks}-mark answer",
  "keywords": ["must-include keywords"],
  "keyPoints": ["list of points examiner expects"],
  "commonMistakes": ["mistakes students make"],
  "memoryTricks": "how to remember this",
  "scoringStrategy": "how to score maximum marks",
  "difficulty": "${difficulty}"
}]

Return ONLY valid JSON array`;
  }

  if (type.startsWith('long')) {
    const marks = type.split('_')[1];
    return `Generate ${count} ${marks}-mark long answer questions about "${topic}" at ${difficultyDesc} difficulty.

Return JSON array:
[{
  "question": "question text",
  "modelAnswer": {
    "definition": "clear definition",
    "explanation": "detailed explanation",
    "algorithm": "step by step algorithm if applicable",
    "example": "worked example with values",
    "diagram": "describe diagram that should be drawn",
    "complexityAnalysis": "time and space complexity",
    "conclusion": "concluding statement"
  },
  "marksDistribution": {"definition": 2, "explanation": 3, "example": 4, "other": 2},
  "examinerExpectedPoints": ["list of must-have points"],
  "keywords": ["important terms"],
  "vivaQuestions": ["follow-up viva questions"],
  "difficulty": "${difficulty}"
}]

Return ONLY valid JSON array`;
  }

  if (type === 'hots') {
    return `Generate ${count} Higher Order Thinking (HOTS) questions about "${topic}" requiring analysis, evaluation, design, and optimization.

Return JSON array:
[{
  "question": "challenging HOTS question",
  "questionType": "Compare/Design/Analyze/Evaluate/Optimize",
  "modelAnswer": "detailed analytical answer",
  "reasoning": "the analytical process",
  "keyInsights": ["important insights"],
  "relatedConcepts": ["other topics this connects to"],
  "difficulty": "${difficulty}"
}]

Return ONLY valid JSON array`;
  }

  if (type === 'viva') {
    return `Generate ${count} viva voce questions about "${topic}" that an examiner would ask.

Return JSON array:
[{
  "question": "viva question",
  "expectedAnswer": "concise ideal answer",
  "followUp": ["follow-up questions if student answers correctly"],
  "trapQuestions": ["common misconceptions this tests"],
  "difficulty": "${difficulty}",
  "importance": "why this is asked in viva"
}]

Return ONLY valid JSON array`;
  }

  return `Generate ${count} practice questions about "${topic}". Return JSON array.`;
}

// Generate questions
questionsRouter.post('/generate', async (req, res) => {
  try {
    const body = generateSchema.parse(req.body);
    const topic = body.topicName || (body.unit ? DSA_TOPICS[body.unit]?.[0] : 'DSA') || 'DSA';

    const prompt = getQuestionPrompt(body.type, body.difficulty, topic, body.count);

    const config: AIConfig = {
      provider: body.provider || 'gemini',
      model: body.model,
      apiKey: body.apiKey,
      temperature: 0.6,
      maxTokens: 8192,
    };

    const response = await callAI([
      { role: 'system', content: 'You are a university DSA exam paper setter. Generate accurate, educational questions. Return ONLY valid JSON arrays, no markdown formatting.' },
      { role: 'user', content: prompt },
    ], config);

    let questions;
    try {
      const cleaned = response.content.replace(/```json\n?|\n?```/g, '').trim();
      questions = JSON.parse(cleaned);
    } catch {
      questions = [];
    }

    res.json({ success: true, questions, count: questions.length, topic, type: body.type });
  } catch (error: any) {
    console.error('Question generation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Generate full exam paper
questionsRouter.post('/generate-paper', async (req, res) => {
  try {
    const { pattern, unit, topic, provider, model, apiKey } = req.body;

    const patterns: Record<string, string> = {
      A: '20 MCQs (1 mark each = 20 marks)',
      B: '10 × 2 marks questions + 5 × 5 marks questions = 45 marks',
      C: '3 × 8 marks questions + 2 × 13 marks questions = 50 marks',
      D: '2 × 10 marks questions + 2 × 15 marks questions = 50 marks',
    };

    const patternDesc = patterns[pattern] || pattern;
    const topicScope = unit ? `Unit ${unit === 'unit3' ? '3' : '4'} (${unit === 'unit3' ? 'Stack, Queue, Recursion' : 'Trees, BST, AVL, Hashing'})` : 'Unit 3 and Unit 4 combined';

    const prompt = `Generate a complete university CT exam paper following pattern: ${patternDesc}
Topic scope: ${topicScope}

Return JSON:
{
  "title": "CT Examination - Data Structures and Algorithms",
  "pattern": "${pattern}",
  "totalMarks": number,
  "duration": "X hours",
  "sections": [
    {
      "sectionName": "Section A",
      "description": "section description",
      "marks": number,
      "questions": [
        {
          "questionNumber": 1,
          "question": "question text",
          "marks": number,
          "type": "mcq/short/long",
          "modelAnswer": "answer",
          "explanation": "explanation"
        }
      ]
    }
  ],
  "answerKey": {"Q1": "answer", "Q2": "answer"},
  "difficultyAnalysis": {"easy": "X%", "medium": "Y%", "hard": "Z%"},
  "topicCoverage": ["list of topics covered"]
}

Return ONLY valid JSON.`;

    const config: AIConfig = { provider: provider || 'gemini', model, apiKey, temperature: 0.5, maxTokens: 8192 };
    const response = await callAI([
      { role: 'system', content: 'You are a university exam paper setter. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ], config);

    let paper;
    try {
      const cleaned = response.content.replace(/```json\n?|\n?```/g, '').trim();
      paper = JSON.parse(cleaned);
    } catch {
      paper = { raw: response.content };
    }

    res.json({ success: true, paper });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
