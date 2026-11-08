import { Router } from 'express';
export const usersRouter = Router();
usersRouter.get('/:id', async (req, res) => {
  res.json({ success: true, message: 'User endpoint' });
});
usersRouter.post('/sync', async (req, res) => {
  res.json({ success: true, message: 'User sync endpoint' });
});
