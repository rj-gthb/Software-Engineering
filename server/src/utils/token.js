import { createHmac, timingSafeEqual } from 'node:crypto';
import { env } from '../config/env.js';
import { HttpError } from './httpError.js';

function encodeSegment(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function sign(data) {
  return createHmac('sha256', env.jwtSecret).update(data).digest('base64url');
}

export function signAuthToken(user) {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: user.id,
    userId: user.userId,
    role: user.role,
    exp: Math.floor(Date.now() / 1000) + env.tokenTtlHours * 60 * 60,
  };

  const encodedHeader = encodeSegment(header);
  const encodedPayload = encodeSegment(payload);
  const signature = sign(`${encodedHeader}.${encodedPayload}`);

  return `${encodedHeader}.${encodedPayload}.${signature}`;
}

export function verifyAuthToken(token) {
  const [encodedHeader, encodedPayload, signature] = token.split('.');

  if (!encodedHeader || !encodedPayload || !signature) {
    throw new HttpError(401, 'Invalid authentication token.');
  }

  const expectedSignature = sign(`${encodedHeader}.${encodedPayload}`);
  const actualBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);

  if (actualBuffer.length !== expectedBuffer.length || !timingSafeEqual(actualBuffer, expectedBuffer)) {
    throw new HttpError(401, 'Invalid authentication token.');
  }

  let payload;

  try {
    payload = JSON.parse(Buffer.from(encodedPayload, 'base64url').toString('utf8'));
  } catch {
    throw new HttpError(401, 'Invalid authentication token.');
  }

  if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) {
    throw new HttpError(401, 'Authentication token has expired.');
  }

  return payload;
}
