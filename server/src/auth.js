import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';

// scrypt hash + constant-time compare for each team's PIN.
export function hashPin(pin) {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(String(pin), salt, 64).toString('hex');
  return { salt, hash };
}

export function verifyPin(pin, salt, expectedHash) {
  if (!pin || !salt || !expectedHash) return false;
  const actual = Buffer.from(scryptSync(String(pin), salt, 64).toString('hex'), 'hex');
  const expected = Buffer.from(expectedHash, 'hex');
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}

export function newId(bytes = 8) {
  return randomBytes(bytes).toString('base64url');
}
