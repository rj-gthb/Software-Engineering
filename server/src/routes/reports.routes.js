import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createReport, listReports, updateReport } from '../services/reports.service.js';
import { REPORT_STATUSES } from '../utils/constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { optionalEnum, optionalString, parseCsvFilter, parsePagination, requireEnum, requireString } from '../utils/validation.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = req.query.search ? requireString(req.query.search, 'search', { max: 64 }) : undefined;
    const statuses = parseCsvFilter(req.query.status, REPORT_STATUSES, 'status');
    const { page, pageSize } = parsePagination(req.query);
    const result = await listReports({ search, statuses, page, pageSize });
    res.json(result);
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const trackingNumber = requireString(req.body.trackingNumber, 'trackingNumber', { max: 64 });
    const remarks = requireString(req.body.remarks, 'remarks', { min: 5, max: 2000 });
    const status = req.body.status ? requireEnum(req.body.status, 'status', REPORT_STATUSES) : 'Unresolved';
    const report = await createReport({ trackingNumber, remarks, status, actor: req.user });
    res.status(201).json({ data: report });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const remarks = optionalString(req.body.remarks, 'remarks', { min: 5, max: 2000 });
    const status = optionalEnum(req.body.status, 'status', REPORT_STATUSES);
    const report = await updateReport({ id: req.params.id, remarks, status, actor: req.user });
    res.json({ data: report });
  }),
);

export default router;
