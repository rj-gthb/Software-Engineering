import { supabase } from '../lib/supabase.js';
import { createActivityLog } from './history.service.js';
import { getParcelByTrackingNumber } from './parcels.service.js';
import { throwIfSupabaseError } from '../utils/database.js';
import { HttpError } from '../utils/httpError.js';
import { normalizeTrackingNumber } from '../utils/validation.js';

const REPORT_COLUMNS = 'id,parcel_id,tracking_number,remarks,status,reported_at,resolved_at,updated_at';

function mapReport(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    parcelId: row.parcel_id,
    trackingNumber: row.tracking_number,
    remarks: row.remarks,
    status: row.status,
    reportedAt: row.reported_at,
    resolvedAt: row.resolved_at,
    updatedAt: row.updated_at,
  };
}

function summarizeText(text, maxLength = 80) {
  const normalized = text.replace(/\s+/g, ' ').trim();
  return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength - 3)}...`;
}

function applyReportFilters(query, filters) {
  if (filters.search) {
    query = query.ilike('tracking_number', `%${filters.search}%`);
  }

  if (filters.statuses?.length) {
    query = query.in('status', filters.statuses);
  }

  return query;
}

export async function listReports({ search, statuses, page, pageSize }) {
  let query = supabase.from('parcel_reports').select(REPORT_COLUMNS, { count: 'exact' }).order('reported_at', { ascending: false });
  query = applyReportFilters(query, { search, statuses });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);
  throwIfSupabaseError(error);

  return {
    data: (data ?? []).map(mapReport),
    meta: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  };
}

export async function getReportById(id) {
  const { data, error } = await supabase.from('parcel_reports').select(REPORT_COLUMNS).eq('id', id).maybeSingle();
  throwIfSupabaseError(error);
  return mapReport(data);
}

export async function createReport({ trackingNumber, remarks, status = 'Unresolved', actor }) {
  const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);
  const parcel = await getParcelByTrackingNumber(normalizedTrackingNumber);

  if (!parcel) {
    throw new HttpError(404, 'Parcel not found for this tracking number.');
  }

  const payload = {
    parcel_id: parcel.id,
    tracking_number: normalizedTrackingNumber,
    remarks,
    status,
    reported_by: actor.id,
    updated_by: actor.id,
  };

  const { data, error } = await supabase.from('parcel_reports').insert(payload).select(REPORT_COLUMNS).single();
  throwIfSupabaseError(error);

  const report = mapReport(data);

  await createActivityLog({
    parcelId: parcel.id,
    trackingNumber: report.trackingNumber,
    action: `Issue reported: ${summarizeText(report.remarks)}.`,
    category: 'report',
    actor,
  });

  return report;
}

export async function updateReport({ id, remarks, status, actor }) {
  const before = await getReportById(id);

  if (!before) {
    throw new HttpError(404, 'Report not found.');
  }

  const updatePayload = {};
  const changes = [];

  if (remarks !== undefined && remarks !== before.remarks) {
    updatePayload.remarks = remarks;
    changes.push('remarks updated');
  }

  if (status !== undefined && status !== before.status) {
    updatePayload.status = status;
    updatePayload.resolved_at = status === 'Resolved' ? new Date().toISOString() : null;
    changes.push(`status changed from ${before.status} to ${status}`);
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new HttpError(400, 'No report changes were submitted.');
  }

  updatePayload.updated_by = actor.id;

  const { data, error } = await supabase
    .from('parcel_reports')
    .update(updatePayload)
    .eq('id', id)
    .select(REPORT_COLUMNS)
    .single();

  throwIfSupabaseError(error);

  const after = mapReport(data);

  await createActivityLog({
    parcelId: after.parcelId,
    trackingNumber: after.trackingNumber,
    action: `Report updated: ${changes.join('; ')}.`,
    category: 'report',
    actor,
  });

  return after;
}
