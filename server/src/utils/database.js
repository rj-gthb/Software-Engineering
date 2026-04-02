import { HttpError } from './httpError.js';

export function throwIfSupabaseError(error, fallbackMessage = 'Database request failed.') {
  if (!error) {
    return;
  }

  if (error.code === '23505') {
    throw new HttpError(409, fallbackMessage);
  }

  throw new HttpError(500, error.message || fallbackMessage);
}
