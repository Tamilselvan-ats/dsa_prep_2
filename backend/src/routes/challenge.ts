import { Router } from 'express';
import { callAI } from '../lib/ai-provider';

export const challengeRouter = Router();

challengeRouter.get('/daily', async (req, res) => {
  const today = new Date().toISOString().split('T')[0];
  res.json({ success: true, date: today, message: 'Daily challenge endpoint' });
});

challengeRouter.post('/generate', async (req, res) => {
  try {
    const { type, topic, difficulty, provider, model, apiKey } = req.body;

    const prompt = `Generate a daily DSA challenge of type "${type}" about "${topic}" at "${difficulty}" difficulty.

Return JSON:
{
  "title": "Challenge title",
  "type": "${type}",
  "topic": "${topic}",
  "difficulty": "${difficulty}",
  "description": "challenge description",
  "challenge": "the actual question/problem",
  "hints": ["hint 1", "hint 2"],
  "solution": "complete solution",
  "xpReward": number (50-500 based on difficulty),
  "timeEstimate": "X minutes"
}

Return ONLY valid JSON.`;

    const response = await callAI([
      { role: 'system', content: 'You are a DSA challenge generator. Return valid JSON only.' },
      { role: 'user', content: prompt },
    ], { provider: provider || 'gemini', model, apiKey, temperature: 0.7 });

    let challenge;
    try {
      const cleaned = response.content.replace(/```json\n?|\n?```/g, '').trim();
      challenge = JSON.parse(cleaned);
    } catch {
      challenge = { raw: response.content };
    }

    res.json({ success: true, challenge });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
