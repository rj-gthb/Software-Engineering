import { getUserById } from '../services/users.service.js';
import { HttpError } from '../utils/httpError.js';
import { verifyAuthToken } from '../utils/token.js';

export async function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization ?? '';

    if (!authHeader.startsWith('Bearer ')) {
      throw new HttpError(401, 'Authorization header is missing or invalid.');
    }

    const token = authHeader.slice('Bearer '.length).trim();
    const payload = verifyAuthToken(token);
    const user = await getUserById(payload.sub);

    if (!user) {
      throw new HttpError(401, 'Authenticated user was not found.');
    }

    if (user.status !== 'active') {
      throw new HttpError(403, 'This account is inactive.');
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

export function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    next(new HttpError(403, 'Administrator access is required for this action.'));
    return;
  }

  next();
}
