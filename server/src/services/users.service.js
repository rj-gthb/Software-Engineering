import { randomBytes } from 'node:crypto';
import { supabase } from '../lib/supabase.js';
import { throwIfSupabaseError } from '../utils/database.js';
import { HttpError } from '../utils/httpError.js';
import { verifySecret } from '../utils/security.js';
import { normalizeUserId } from '../utils/validation.js';

const PUBLIC_USER_COLUMNS = 'id,user_id,first_name,last_name,role,status,status_reason,last_login_at,created_at,updated_at';
const PRIVATE_USER_COLUMNS = `${PUBLIC_USER_COLUMNS},password_hash`;

function getFullName(firstName, lastName) {
  return `${firstName} ${lastName}`.trim();
}

function mapUser(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    userId: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    fullName: getFullName(row.first_name, row.last_name),
    role: row.role,
    status: row.status,
    reason: row.status_reason,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapUserWithSecrets(row) {
  if (!row) {
    return null;
  }

  return {
    ...mapUser(row),
    passwordHash: row.password_hash,
  };
}

async function isUserIdTaken(userId) {
  const { data, error } = await supabase.from('app_users').select('id').eq('user_id', userId).maybeSingle();
  throwIfSupabaseError(error);
  return Boolean(data);
}

async function createUniqueUserId() {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    const candidate = `PP-${randomBytes(3).toString('hex').toUpperCase()}`;

    if (!(await isUserIdTaken(candidate))) {
      return candidate;
    }
  }

  throw new HttpError(500, 'Unable to generate a unique user ID.');
}

export async function countUsers() {
  const { count, error } = await supabase.from('app_users').select('id', { head: true, count: 'exact' });
  throwIfSupabaseError(error);
  return count ?? 0;
}

export async function countAdmins() {
  const { count, error } = await supabase
    .from('app_users')
    .select('id', { head: true, count: 'exact' })
    .eq('role', 'admin')
    .eq('status', 'active');

  throwIfSupabaseError(error);
  return count ?? 0;
}

export async function getUserById(id, options = {}) {
  const columns = options.includePasswordHash ? PRIVATE_USER_COLUMNS : PUBLIC_USER_COLUMNS;
  const { data, error } = await supabase.from('app_users').select(columns).eq('id', id).maybeSingle();
  throwIfSupabaseError(error);
  return options.includePasswordHash ? mapUserWithSecrets(data) : mapUser(data);
}

export async function getUserByUserId(userId, options = {}) {
  const normalizedUserId = normalizeUserId(userId);
  const columns = options.includePasswordHash ? PRIVATE_USER_COLUMNS : PUBLIC_USER_COLUMNS;
  const { data, error } = await supabase.from('app_users').select(columns).eq('user_id', normalizedUserId).maybeSingle();
  throwIfSupabaseError(error);
  return options.includePasswordHash ? mapUserWithSecrets(data) : mapUser(data);
}

export async function createUser({ firstName, lastName, passwordHash, role = 'staff', status = 'active', createdBy = null }) {
  const userId = await createUniqueUserId();
  const payload = {
    user_id: userId,
    first_name: firstName,
    last_name: lastName,
    password_hash: passwordHash,
    role,
    status,
    created_by: createdBy,
  };

  const { data, error } = await supabase.from('app_users').insert(payload).select(PUBLIC_USER_COLUMNS).single();
  throwIfSupabaseError(error, 'A user with these details already exists.');
  return mapUser(data);
}

export async function markLastLogin(id) {
  const { data, error } = await supabase
    .from('app_users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', id)
    .select(PUBLIC_USER_COLUMNS)
    .single();

  throwIfSupabaseError(error);
  return mapUser(data);
}

export async function updatePasswordByUserId(userId, passwordHash) {
  const normalizedUserId = normalizeUserId(userId);
  const { data, error } = await supabase
    .from('app_users')
    .update({ password_hash: passwordHash })
    .eq('user_id', normalizedUserId)
    .select(PUBLIC_USER_COLUMNS)
    .maybeSingle();

  throwIfSupabaseError(error);
  return mapUser(data);
}

export async function getRegistrationSettings() {
  const { data, error } = await supabase
    .from('organization_settings')
    .select('registration_code_hash,registration_code_updated_at')
    .eq('id', true)
    .maybeSingle();

  throwIfSupabaseError(error);
  return data;
}

export async function validateRegistrationCode(securityCode) {
  const settings = await getRegistrationSettings();

  if (!settings?.registration_code_hash || !verifySecret(securityCode, settings.registration_code_hash)) {
    throw new HttpError(401, 'Security code is invalid.');
  }

  return settings;
}

export async function setRegistrationCodeHash(codeHash, actorId = null) {
  const { error } = await supabase.from('organization_settings').upsert({
    id: true,
    registration_code_hash: codeHash,
    registration_code_updated_at: new Date().toISOString(),
    registration_code_updated_by: actorId,
  });

  throwIfSupabaseError(error);
  return getRegistrationSettings();
}

export async function getRegistrationCodeMeta() {
  const settings = await getRegistrationSettings();

  return {
    configured: Boolean(settings?.registration_code_hash),
    updatedAt: settings?.registration_code_updated_at ?? null,
  };
}

export async function listUsers({ search, statuses, page, pageSize }) {
  let query = supabase.from('app_users').select(PUBLIC_USER_COLUMNS, { count: 'exact' }).order('created_at', { ascending: false });

  if (search) {
    const safeSearch = search.replace(/,/g, ' ').trim();
    query = query.or(`user_id.ilike.%${safeSearch}%,first_name.ilike.%${safeSearch}%,last_name.ilike.%${safeSearch}%`);
  }

  if (statuses?.length) {
    query = query.in('status', statuses);
  }

  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const { data, error, count } = await query.range(from, to);
  throwIfSupabaseError(error);

  return {
    data: (data ?? []).map(mapUser),
    meta: {
      page,
      pageSize,
      total: count ?? 0,
      totalPages: Math.max(1, Math.ceil((count ?? 0) / pageSize)),
    },
  };
}

export async function getUserStatusSummary() {
  const [activeUsers, inactiveUsers] = await Promise.all([
    supabase.from('app_users').select('id', { head: true, count: 'exact' }).eq('status', 'active'),
    supabase.from('app_users').select('id', { head: true, count: 'exact' }).eq('status', 'inactive'),
  ]);

  throwIfSupabaseError(activeUsers.error);
  throwIfSupabaseError(inactiveUsers.error);

  return {
    activeUsers: activeUsers.count ?? 0,
    inactiveUsers: inactiveUsers.count ?? 0,
  };
}

export async function updateUserRecord({ id, role, status, reason }) {
  const before = await getUserById(id);

  if (!before) {
    throw new HttpError(404, 'User not found.');
  }

  const updatePayload = {};

  if (role !== undefined && role !== before.role) {
    updatePayload.role = role;
  }

  if (status !== undefined && status !== before.status) {
    updatePayload.status = status;
  }

  if (reason !== undefined) {
    updatePayload.status_reason = reason;
  } else if (status === 'active') {
    updatePayload.status_reason = null;
  }

  if (Object.keys(updatePayload).length === 0) {
    throw new HttpError(400, 'No user changes were submitted.');
  }

  const { data, error } = await supabase
    .from('app_users')
    .update(updatePayload)
    .eq('id', id)
    .select(PUBLIC_USER_COLUMNS)
    .single();

  throwIfSupabaseError(error);

  return {
    before,
    after: mapUser(data),
  };
}
