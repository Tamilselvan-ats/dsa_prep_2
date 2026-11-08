import { Router, Request, Response } from 'express';
export const usersRouter = Router();

// In-memory user store (MVP — no DB needed)
interface User {
  id: string;
  name: string;
  email?: string;
  avatar?: string;
  preferences: {
    aiProvider: string;
    theme: string;
    dailyGoalMinutes: number;
    notificationsEnabled: boolean;
  };
  createdAt: string;
  lastSeen: string;
}

const users = new Map<string, User>();

function createDefaultUser(id: string): User {
  return {
    id,
    name: 'DSA Student',
    preferences: {
      aiProvider: 'gemini',
      theme: 'dark',
      dailyGoalMinutes: 60,
      notificationsEnabled: true,
    },
    createdAt: new Date().toISOString(),
    lastSeen: new Date().toISOString(),
  };
}

// GET /api/users/:id
usersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const user = users.get(req.params.id) || createDefaultUser(req.params.id);
    if (!users.has(req.params.id)) users.set(req.params.id, user);

    // Update last seen
    user.lastSeen = new Date().toISOString();
    users.set(req.params.id, user);

    return res.json({ success: true, user });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to fetch user', message: err.message });
  }
});

// POST /api/users/sync — create or update user profile
usersRouter.post('/sync', async (req: Request, res: Response) => {
  try {
    const { id, name, email, avatar, preferences } = req.body;

    if (!id) return res.status(400).json({ error: 'User id is required' });

    const existing = users.get(id) || createDefaultUser(id);

    const updated: User = {
      ...existing,
      name: name || existing.name,
      email: email || existing.email,
      avatar: avatar || existing.avatar,
      preferences: { ...existing.preferences, ...(preferences || {}) },
      lastSeen: new Date().toISOString(),
    };

    users.set(id, updated);

    return res.json({ success: true, user: updated });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to sync user', message: err.message });
  }
});

// PATCH /api/users/:id/preferences — update preferences only
usersRouter.patch('/:id/preferences', async (req: Request, res: Response) => {
  try {
    const user = users.get(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    user.preferences = { ...user.preferences, ...req.body };
    user.lastSeen = new Date().toISOString();
    users.set(req.params.id, user);

    return res.json({ success: true, preferences: user.preferences });
  } catch (err: any) {
    return res.status(500).json({ error: 'Failed to update preferences', message: err.message });
  }
});

// GET /api/users — health check / count
usersRouter.get('/', async (_req: Request, res: Response) => {
  return res.json({ success: true, totalUsers: users.size });
});
