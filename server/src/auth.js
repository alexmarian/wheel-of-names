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

// Constant-time string compare (for the shared REGISTRATION_SECRET, used as
// the PIN-reset credential too — unlike a PIN there's no per-user hash to
// verify against, so this is the only guard).
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}
