import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { getActivityLogsForExport, listActivityLogs } from '../services/history.service.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildCsv } from '../utils/csv.js';
import { optionalDateOnly, parsePagination, requireString } from '../utils/validation.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = req.query.search ? requireString(req.query.search, 'search', { max: 64 }) : undefined;
    const dateFrom = req.query.dateFrom ? optionalDateOnly(req.query.dateFrom, 'dateFrom') : undefined;
    const dateTo = req.query.dateTo ? optionalDateOnly(req.query.dateTo, 'dateTo') : undefined;
    const { page, pageSize } = parsePagination(req.query);
    const result = await listActivityLogs({ search, dateFrom, dateTo, page, pageSize });
    res.json(result);
  }),
);

router.get(
  '/export.csv',
  asyncHandler(async (req, res) => {
    const search = req.query.search ? requireString(req.query.search, 'search', { max: 64 }) : undefined;
    const dateFrom = req.query.dateFrom ? optionalDateOnly(req.query.dateFrom, 'dateFrom') : undefined;
    const dateTo = req.query.dateTo ? optionalDateOnly(req.query.dateTo, 'dateTo') : undefined;
    const rows = await getActivityLogsForExport({ search, dateFrom, dateTo });
    const csv = buildCsv(
      [
        { header: 'Tracking Number', value: 'trackingNumber' },
        { header: 'Date', value: 'date' },
        { header: 'Actor', value: 'actorName' },
        { header: 'Category', value: 'category' },
        { header: 'Action', value: 'action' },
      ],
      rows,
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="history-records.csv"');
    res.send(csv);
  }),
);

export default router;
