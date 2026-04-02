import { supabase } from '../lib/supabase.js';
import { createActivityLog } from './history.service.js';
import { throwIfSupabaseError } from '../utils/database.js';
import { todayDateOnly } from '../utils/date.js';
import { HttpError } from '../utils/httpError.js';
import { normalizeTrackingNumber } from '../utils/validation.js';

const PARCEL_COLUMNS = 'id,tracking_number,platform,status,date_added,outbound_date,created_at,updated_at';

const SCAN_STATUS_FLOW = ['Pending', 'Outbound', 'Cancelled', 'Returned', 'Double Waybill'];

function getNextScannedStatus(currentStatus) {
  const currentIndex = SCAN_STATUS_FLOW.indexOf(currentStatus);

  if (currentIndex === -1) {
    throw new HttpError(400, `Parcel status "${currentStatus}" is not part of the scan cycle.`);
  }

  const nextIndex = (currentIndex + 1) % SCAN_STATUS_FLOW.length;
  return SCAN_STATUS_FLOW[nextIndex];
}

function mapParcel(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    trackingNumber: row.tracking_number,
    platform: row.platform,
    status: row.status,
    dateAdded: row.date_added,
    outboundDate: row.outbound_date,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function applyParcelFilters(query, filters) {
  if (filters.search) {
    query = query.ilike('tracking_number', `%${filters.search}%`);
  }

  if (filters.statuses?.length) {
    query = query.in('status', filters.statuses);
  }

  if (filters.platforms?.length) {
    query = query.in('platform', filters.platforms);
  }

  if (filters.dateFrom) {
    query = query.gte('date_added', filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte('date_added', filters.dateTo);
  }

  return query;
}

function buildParcelUpdateMessage(before, after) {
  const changes = [];

  if (before.platform !== after.platform) {
    changes.push(`platform changed from ${before.platform} to ${after.platform}`);
  }

  if (before.status !== after.status) {
    changes.push(`status changed from ${before.status} to ${after.status}`);
  }

  if (before.outboundDate !== after.outboundDate) {
    changes.push(`outbound date changed from ${before.outboundDate ?? '-'} to ${after.outboundDate ?? '-'}`);
  }

  return `Parcel updated: ${changes.join('; ')}.`;
}

export async function listParcels({ search, statuses, platforms, dateFrom, dateTo, page, pageSize }) {
  let query = supabase.from('parcels').select(PARCEL_COLUMNS, { count: 'exact' }).order('date_added', { ascending: false });
  query = query.order('created_at', { ascending: false });
  query = applyParcelFilters(query, { search, statuses, platforms, dateFrom, dateTo });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);
  throwIfSupabaseError(error);

  return {
    data: (data ?? []).map(mapParcel),
    meta: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  };
}

export async function getParcelsForExport({ search, statuses, platforms, dateFrom, dateTo }) {
  let query = supabase.from('parcels').select(PARCEL_COLUMNS).order('date_added', { ascending: false });
  query = query.order('created_at', { ascending: false });
  query = applyParcelFilters(query, { search, statuses, platforms, dateFrom, dateTo });

  const { data, error } = await query.limit(10000);
  throwIfSupabaseError(error);
  return (data ?? []).map(mapParcel);
}

export async function getParcelById(id) {
  const { data, error } = await supabase.from('parcels').select(PARCEL_COLUMNS).eq('id', id).maybeSingle();
  throwIfSupabaseError(error);
  return mapParcel(data);
}

export async function getParcelByTrackingNumber(trackingNumber) {
  const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);
  const { data, error } = await supabase
    .from('parcels')
    .select(PARCEL_COLUMNS)
    .eq('tracking_number', normalizedTrackingNumber)
    .maybeSingle();

  throwIfSupabaseError(error);
  return mapParcel(data);
}

export async function createParcel({ trackingNumber, platform, status, actor }) {
  const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);
  const existingParcel = await getParcelByTrackingNumber(normalizedTrackingNumber);

  if (existingParcel) {
    throw new HttpError(409, 'Tracking number already exists.');
  }

  const dateAdded = todayDateOnly();
  const outboundDate = status === 'Outbound' ? dateAdded : null;
  const payload = {
    tracking_number: normalizedTrackingNumber,
    platform,
    status,
    date_added: dateAdded,
    outbound_date: outboundDate,
    created_by: actor.id,
    updated_by: actor.id,
  };

  const { data, error } = await supabase.from('parcels').insert(payload).select(PARCEL_COLUMNS).single();
  throwIfSupabaseError(error, 'Tracking number already exists.');

  const parcel = mapParcel(data);

  await createActivityLog({
    parcelId: parcel.id,
    trackingNumber: parcel.trackingNumber,
    action: `Parcel created with status ${parcel.status} on ${parcel.platform}.`,
    category: 'parcel',
    actor,
  });

  return parcel;
}

export async function updateParcel({ id, platform, status, outboundDate, outboundDateProvided, actor }) {
  const before = await getParcelById(id);

  if (!before) {
    throw new HttpError(404, 'Parcel not found.');
  }

  const nextPlatform = platform ?? before.platform;
  const nextStatus = status ?? before.status;

  let nextOutboundDate = before.outboundDate;

  if (outboundDateProvided) {
    nextOutboundDate = outboundDate;
  } else if (nextStatus === 'Outbound' && !before.outboundDate) {
    nextOutboundDate = todayDateOnly();
  }

  const updatePayload = {};

  if (nextPlatform !== before.platform) {
    updatePayload.platform = nextPlatform;
  }

  if (nextStatus !== before.status) {
    updatePayload.status = nextStatus;
  }

  if (nextOutboundDate !== before.outboundDate) {
    updatePayload.outbound_date = nextOutboundDate;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new HttpError(400, 'No parcel changes were submitted.');
  }

  updatePayload.updated_by = actor.id;

  const { data, error } = await supabase
    .from('parcels')
    .update(updatePayload)
    .eq('id', id)
    .select(PARCEL_COLUMNS)
    .single();

  throwIfSupabaseError(error);

  const after = mapParcel(data);

  await createActivityLog({
    parcelId: after.id,
    trackingNumber: after.trackingNumber,
    action: buildParcelUpdateMessage(before, after),
    category: 'parcel',
    actor,
  });

  return after;
}

export async function scanParcelByTrackingNumber({ trackingNumber, actor }) {
  const normalizedTrackingNumber = normalizeTrackingNumber(trackingNumber);
  const before = await getParcelByTrackingNumber(normalizedTrackingNumber);

  if (!before) {
    throw new HttpError(404, 'Parcel not found for this tracking number.');
  }

  const nextStatus = getNextScannedStatus(before.status);
  const updatePayload = {
    status: nextStatus,
    updated_by: actor.id,
  };

  if (nextStatus === 'Outbound' && !before.outboundDate) {
    updatePayload.outbound_date = todayDateOnly();
  }

  const { data, error } = await supabase
    .from('parcels')
    .update(updatePayload)
    .eq('id', before.id)
    .select(PARCEL_COLUMNS)
    .single();

  throwIfSupabaseError(error);

  const after = mapParcel(data);

  await createActivityLog({
    parcelId: after.id,
    trackingNumber: after.trackingNumber,
    action: `Parcel scanned: status changed from ${before.status} to ${after.status}.`,
    category: 'parcel',
    actor,
  });

  return after;
}
