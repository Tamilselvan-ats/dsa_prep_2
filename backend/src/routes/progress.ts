import { Router } from 'express';
export const progressRouter = Router();
progressRouter.get('/:userId', async (req, res) => {
  res.json({ success: true, message: 'Progress endpoint' });
});
progressRouter.post('/update', async (req, res) => {
  res.json({ success: true, message: 'Update progress endpoint' });
});
