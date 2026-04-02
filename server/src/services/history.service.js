import { supabase } from '../lib/supabase.js';
import { throwIfSupabaseError } from '../utils/database.js';
import { getDateTimeRange } from '../utils/date.js';

const ACTIVITY_COLUMNS = 'id,tracking_number,action,category,actor_name,created_at';

function mapActivityLog(row) {
  return {
    id: row.id,
    trackingNumber: row.tracking_number,
    action: row.action,
    category: row.category,
    actorName: row.actor_name,
    date: row.created_at,
    createdAt: row.created_at,
  };
}

function applyActivityFilters(query, filters) {
  if (filters.search) {
    query = query.ilike('tracking_number', `%${filters.search}%`);
  }

  const range = getDateTimeRange(filters.dateFrom, filters.dateTo);

  if (range.start) {
    query = query.gte('created_at', range.start);
  }

  if (range.end) {
    query = query.lte('created_at', range.end);
  }

  return query;
}

export async function createActivityLog({ parcelId = null, trackingNumber = null, action, category = 'parcel', actor = null }) {
  const payload = {
    parcel_id: parcelId,
    tracking_number: trackingNumber,
    actor_id: actor?.id ?? null,
    actor_name: actor?.fullName ?? null,
    action,
    category,
  };

  const { error } = await supabase.from('activity_logs').insert(payload);
  throwIfSupabaseError(error);
}

export async function listActivityLogs({ search, dateFrom, dateTo, page, pageSize }) {
  let query = supabase.from('activity_logs').select(ACTIVITY_COLUMNS, { count: 'exact' }).order('created_at', { ascending: false });
  query = applyActivityFilters(query, { search, dateFrom, dateTo });

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);
  throwIfSupabaseError(error);

  return {
    data: (data ?? []).map(mapActivityLog),
    meta: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  };
}

export async function getActivityLogsForExport({ search, dateFrom, dateTo }) {
  let query = supabase.from('activity_logs').select(ACTIVITY_COLUMNS).order('created_at', { ascending: false });
  query = applyActivityFilters(query, { search, dateFrom, dateTo });

  const { data, error } = await query.limit(10000);
  throwIfSupabaseError(error);
  return (data ?? []).map(mapActivityLog);
}
