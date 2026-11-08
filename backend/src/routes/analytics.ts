import { Router } from 'express';
export const analyticsRouter = Router();
analyticsRouter.get('/:userId', async (req, res) => {
  res.json({ success: true, message: 'Analytics endpoint' });
});
