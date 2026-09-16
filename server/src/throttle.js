// Cheap per-IP brute-force throttle for PIN-gated writes.
const buckets = new Map(); // key -> { attempts, lockUntil }

const MAX_ATTEMPTS = 5;
const LOCK_MS = 5 * 60 * 1000;

export function throttleKey(ip, teamId) {
  return `${ip}|${teamId}`;
}

export function isLocked(key) {
  const b = buckets.get(key);
  return !!b && b.lockUntil > Date.now();
}

export function recordFailure(key) {
  const b = buckets.get(key) || { attempts: 0, lockUntil: 0 };
  b.attempts += 1;
  if (b.attempts >= MAX_ATTEMPTS) {
    b.lockUntil = Date.now() + LOCK_MS;
    b.attempts = 0;
  }
  buckets.set(key, b);
}

export function recordSuccess(key) {
  buckets.delete(key);
}

export function throttleRemainingMs(key) {
  const b = buckets.get(key);
  return b && b.lockUntil > Date.now() ? b.lockUntil - Date.now() : 0;
}
