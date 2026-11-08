import { Router, Request, Response } from 'express';
export const examRouter = Router();

// In-memory store for exams (MVP — no DB needed)
interface ExamQuestion {
  id: string;
  text: string;
  options?: string[];
  correctAnswer?: string | number;
  marks: number;
  topic: string;
  type: 'mcq' | 'short' | 'long';
}

interface Exam {
  id: string;
  title: string;
  topic: string;
  duration: number; // minutes
  totalMarks: number;
  questions: ExamQuestion[];
  createdAt: string;
  status: 'active' | 'submitted';
  submittedAt?: string;
  score?: number;
  answers?: Record<string, string | number>;
  userId?: string;
}

const exams = new Map<string, Exam>();

function generateId(): string {
  return `exam_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

// POST /api/exam/create
examRouter.post('/create', async (req: Request, res: Response) => {
  try {
    const { title, topic, duration, questions, userId } = req.body;

    if (!questions || !Array.isArray(questions) || questions.length === 0) {
      return res.status(400).json({ error: 'Questions array is required' });
    }

    const id = generateId();
    const totalMarks = questions.reduce((sum: number, q: ExamQuestion) => sum + (q.marks || 1), 0);

    const exam: Exam = {
      id,
      title: title || `Exam — ${topic || 'DSA'}`,
      topic: topic || 'DSA',
      duration: duration || 60,
      totalMarks,
      questions: questions.map((q: any, i: number) => ({
        id: q.id || `q${i + 1}`,
        text: q.text || q.question || '',
        options: q.options,
        correctAnswer: q.correctAnswer ?? q.correctIndex,
        marks: q.marks || 1,
        topic: q.topic || topic || 'DSA',
        type: q.type || 'mcq',
      })),
      createdAt: new Date().toISOString(),
      status: 'active',
      userId,
    };

    exams.set(id, exam);

    return res.status(201).json({
      success: true,
      examId: id,
      exam: {
        id: exam.id,
        title: exam.title,
        topic: exam.topic,
        duration: exam.duration,
        totalMarks: exam.totalMarks,
        questionCount: exam.questions.length,
        createdAt: exam.createdAt,
      },
    });
  } catch (err: any) {
    console.error('Create exam error:', err);
    return res.status(500).json({ error: 'Failed to create exam', message: err.message });
  }
});

// GET /api/exam/:id
examRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const exam = exams.get(req.params.id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }

    // Strip correct answers when serving active exam
    const sanitized = {
      ...exam,
      questions: exam.questions.map(q => ({
        id: q.id,
        text: q.text,
        options: q.options,
        marks: q.marks,
        topic: q.topic,
        type: q.type,
        // Don't expose correctAnswer during active exam
      })),
    };

    return res.json({ success: true, exam: sanitized });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch exam', message: err.message });
  }
});

// POST /api/exam/:id/submit
examRouter.post('/:id/submit', async (req: Request, res: Response) => {
  try {
    const exam = exams.get(req.params.id);
    if (!exam) {
      return res.status(404).json({ error: 'Exam not found' });
    }
    if (exam.status === 'submitted') {
      return res.status(400).json({ error: 'Exam already submitted' });
    }

    const { answers } = req.body; // { [questionId]: answer }

    if (!answers || typeof answers !== 'object') {
      return res.status(400).json({ error: 'Answers object is required' });
    }

    // Auto-grade MCQ questions
    let score = 0;
    const breakdown: { questionId: string; correct: boolean; marks: number; earned: number; correctAnswer: any }[] = [];

    for (const q of exam.questions) {
      const userAnswer = answers[q.id];
      let correct = false;
      let earned = 0;

      if (q.type === 'mcq' && q.correctAnswer !== undefined) {
        correct = String(userAnswer) === String(q.correctAnswer);
        earned = correct ? q.marks : 0;
        score += earned;
      } else {
        // For short/long — award partial marks (AI grading could be added)
        earned = userAnswer && String(userAnswer).trim().length > 20 ? Math.floor(q.marks * 0.7) : 0;
        score += earned;
      }

      breakdown.push({ questionId: q.id, correct, marks: q.marks, earned, correctAnswer: q.correctAnswer });
    }

    const percentage = exam.totalMarks > 0 ? Math.round((score / exam.totalMarks) * 100) : 0;
    const grade = percentage >= 90 ? 'A+' : percentage >= 80 ? 'A' : percentage >= 70 ? 'B' :
      percentage >= 60 ? 'C' : percentage >= 50 ? 'D' : 'F';

    // Update exam
    exam.status = 'submitted';
    exam.submittedAt = new Date().toISOString();
    exam.score = score;
    exam.answers = answers;
    exams.set(exam.id, exam);

    return res.json({
      success: true,
      result: {
        examId: exam.id,
        title: exam.title,
        score,
        totalMarks: exam.totalMarks,
        percentage,
        grade,
        breakdown,
        submittedAt: exam.submittedAt,
        timeSpent: req.body.timeSpent,
      },
    });
  } catch (err: any) {
    console.error('Submit exam error:', err);
    return res.status(500).json({ error: 'Failed to submit exam', message: err.message });
  }
});

// GET /api/exam/results/:id — full results with correct answers
examRouter.get('/results/:id', async (req: Request, res: Response) => {
  try {
    const exam = exams.get(req.params.id);
    if (!exam) return res.status(404).json({ error: 'Exam not found' });
    if (exam.status !== 'submitted') return res.status(400).json({ error: 'Exam not yet submitted' });

    return res.json({ success: true, exam });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch results', message: err.message });
  }
});

// GET /api/exam/list/:userId — list all exams for user
examRouter.get('/list/:userId', async (req: Request, res: Response) => {
  try {
    const userExams = Array.from(exams.values())
      .filter(e => e.userId === req.params.userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    return res.json({
      success: true,
      exams: userExams.map(e => ({
        id: e.id,
        title: e.title,
        topic: e.topic,
        totalMarks: e.totalMarks,
        score: e.score,
        status: e.status,
        createdAt: e.createdAt,
        submittedAt: e.submittedAt,
      })),
    });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to list exams', message: err.message });
  }
});
