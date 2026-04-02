import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { parseMonth } from '../utils/validation.js';
import { getDashboardSummary } from '../services/dashboard.service.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/summary',
  asyncHandler(async (req, res) => {
    const month = parseMonth(req.query.month);
    const summary = await getDashboardSummary(month);
    res.json({ data: summary });
  }),
);

export default router;
