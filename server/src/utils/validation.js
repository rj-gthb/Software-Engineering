import { HttpError } from './httpError.js';

export function requireString(value, field, options = {}) {
  const { min = 1, max = 255 } = options;

  if (typeof value !== 'string') {
    throw new HttpError(400, `${field} must be a string.`);
  }

  const trimmed = value.trim();

  if (trimmed.length < min) {
    throw new HttpError(400, `${field} must be at least ${min} characters long.`);
  }

  if (trimmed.length > max) {
    throw new HttpError(400, `${field} must be at most ${max} characters long.`);
  }

  return trimmed;
}

export function optionalString(value, field, options = {}) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return requireString(value, field, options);
}

export function requireEnum(value, field, allowedValues) {
  if (!allowedValues.includes(value)) {
    throw new HttpError(400, `${field} must be one of: ${allowedValues.join(', ')}.`);
  }

  return value;
}

export function optionalEnum(value, field, allowedValues) {
  if (value === undefined || value === null || value === '') {
    return undefined;
  }

  return requireEnum(value, field, allowedValues);
}

export function requirePassword(value, field = 'password') {
  const password = requireString(value, field, { min: 8, max: 72 });

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    throw new HttpError(400, `${field} must contain at least one letter and one number.`);
  }

  return password;
}

export function requireDateOnly(value, field) {
  const dateValue = requireString(value, field, { min: 10, max: 10 });

  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateValue)) {
    throw new HttpError(400, `${field} must use YYYY-MM-DD format.`);
  }

  return dateValue;
}

export function optionalDateOnly(value, field) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null || value === '') {
    return null;
  }

  return requireDateOnly(value, field);
}

export function parsePagination(query) {
  const page = Number.parseInt(query.page ?? '1', 10);
  const pageSize = Number.parseInt(query.pageSize ?? '15', 10);

  return {
    page: Number.isFinite(page) && page > 0 ? page : 1,
    pageSize: Number.isFinite(pageSize) && pageSize > 0 ? Math.min(pageSize, 100) : 15,
  };
}

export function parseCsvFilter(value, allowedValues, field) {
  if (!value) {
    return [];
  }

  const values = String(value)
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);

  const invalidValues = values.filter((item) => !allowedValues.includes(item));

  if (invalidValues.length > 0) {
    throw new HttpError(400, `${field} contains unsupported values: ${invalidValues.join(', ')}.`);
  }

  return values;
}

export function parseMonth(value) {
  if (!value) {
    return undefined;
  }

  if (!/^\d{4}-\d{2}$/.test(value)) {
    throw new HttpError(400, 'month must use YYYY-MM format.');
  }

  return value;
}

export function normalizeTrackingNumber(value) {
  return requireString(value, 'trackingNumber', { max: 64 }).toUpperCase();
}

export function normalizeUserId(value) {
  return requireString(value, 'userId', { max: 32 }).toUpperCase();
}
