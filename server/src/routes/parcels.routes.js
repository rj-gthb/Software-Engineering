import { Router } from 'express';
import { requireAuth } from '../middleware/auth.js';
import { createParcel, getParcelsForExport, updateParcel, listParcels, scanParcelByTrackingNumber } from '../services/parcels.service.js';
import { PARCEL_PLATFORMS, PARCEL_STATUSES } from '../utils/constants.js';
import { asyncHandler } from '../utils/asyncHandler.js';
import { buildCsv } from '../utils/csv.js';
import { optionalDateOnly, optionalEnum, parseCsvFilter, parsePagination, requireEnum, requireString } from '../utils/validation.js';

const router = Router();

router.use(requireAuth);

router.get(
  '/',
  asyncHandler(async (req, res) => {
    const search = req.query.search ? requireString(req.query.search, 'search', { max: 64 }) : undefined;
    const statuses = parseCsvFilter(req.query.status, PARCEL_STATUSES, 'status');
    const platforms = parseCsvFilter(req.query.platform, PARCEL_PLATFORMS, 'platform');
    const dateFrom = req.query.dateFrom ? optionalDateOnly(req.query.dateFrom, 'dateFrom') : undefined;
    const dateTo = req.query.dateTo ? optionalDateOnly(req.query.dateTo, 'dateTo') : undefined;
    const { page, pageSize } = parsePagination(req.query);
    const result = await listParcels({ search, statuses, platforms, dateFrom, dateTo, page, pageSize });
    res.json(result);
  }),
);

router.get(
  '/export.csv',
  asyncHandler(async (req, res) => {
    const search = req.query.search ? requireString(req.query.search, 'search', { max: 64 }) : undefined;
    const statuses = parseCsvFilter(req.query.status, PARCEL_STATUSES, 'status');
    const platforms = parseCsvFilter(req.query.platform, PARCEL_PLATFORMS, 'platform');
    const dateFrom = req.query.dateFrom ? optionalDateOnly(req.query.dateFrom, 'dateFrom') : undefined;
    const dateTo = req.query.dateTo ? optionalDateOnly(req.query.dateTo, 'dateTo') : undefined;
    const rows = await getParcelsForExport({ search, statuses, platforms, dateFrom, dateTo });
    const csv = buildCsv(
      [
        { header: 'Tracking Number', value: 'trackingNumber' },
        { header: 'Platform', value: 'platform' },
        { header: 'Date Added', value: 'dateAdded' },
        { header: 'Outbound Date', value: 'outboundDate' },
        { header: 'Status', value: 'status' },
        { header: 'Created At', value: 'createdAt' },
      ],
      rows,
    );

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="order-records.csv"');
    res.send(csv);
  }),
);

router.post(
  '/scan',
  asyncHandler(async (req, res) => {
    const trackingNumber = requireString(req.body.trackingNumber, 'trackingNumber', { max: 64 });
    const parcel = await scanParcelByTrackingNumber({ trackingNumber, actor: req.user });
    res.json({ data: parcel });
  }),
);

router.post(
  '/',
  asyncHandler(async (req, res) => {
    const trackingNumber = requireString(req.body.trackingNumber, 'trackingNumber', { max: 64 });
    const platform = requireEnum(req.body.platform, 'platform', PARCEL_PLATFORMS);
    const status = requireEnum(req.body.status, 'status', PARCEL_STATUSES);
    const parcel = await createParcel({ trackingNumber, platform, status, actor: req.user });
    res.status(201).json({ data: parcel });
  }),
);

router.patch(
  '/:id',
  asyncHandler(async (req, res) => {
    const platform = optionalEnum(req.body.platform, 'platform', PARCEL_PLATFORMS);
    const status = optionalEnum(req.body.status, 'status', PARCEL_STATUSES);
    const outboundDateProvided = Object.prototype.hasOwnProperty.call(req.body, 'outboundDate');
    const outboundDate = outboundDateProvided ? optionalDateOnly(req.body.outboundDate, 'outboundDate') : undefined;
    const parcel = await updateParcel({
      id: req.params.id,
      platform,
      status,
      outboundDate,
      outboundDateProvided,
      actor: req.user,
    });

    res.json({ data: parcel });
  }),
);

export default router;
