import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

export function hashSecret(value) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(value, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifySecret(value, storedHash) {
  if (!value || !storedHash) {
    return false;
  }

  const [salt, hash] = storedHash.split(':');

  if (!salt || !hash) {
    return false;
  }

  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(value, salt, 64);

  if (expected.length !== actual.length) {
    return false;
  }

  return timingSafeEqual(expected, actual);
}
