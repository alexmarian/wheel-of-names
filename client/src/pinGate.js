// Global PIN gate: any write that 401s raises the prompt modal, retries with
// the entered PIN, and stores it (sessionStorage) so subsequent writes pass.
import { reactive } from 'vue';
import { api, pinStore } from './api.js';

export const gate = reactive({
  open: false,
  teamId: null,
  title: 'PIN required',
  message: '',
  error: '',
  busy: false,
});

let pending = null;

export function requireAuth(teamId, action, title, message) {
  return new Promise((resolve, reject) => {
    gate.teamId = teamId;
    gate.title = title || 'PIN required';
    gate.message = message || '';
    gate.error = '';
    gate.open = true;
    pending = { action, resolve, reject };
  });
}

// Ask the server to run `action(pin)`. On 401 the prompt opens; on success the
// pin is remembered for subsequent calls.
export async function runWithPin(teamId, action, { title, message } = {}) {
  try {
    return await action(pinStore.get(teamId));
  } catch (e) {
    if (e.status === 401 && e.retryInMs > 0) {
      throw new Error('Too many wrong PIN attempts. Try again in a few minutes.');
    }
    if (e.status !== 401) throw e;
    return requireAuth(teamId, action, title, message);
  }
}

export function submitPin(pin) {
  if (!pending || gate.busy) return;
  gate.busy = true;
  gate.error = '';
  pending
    .action(pin)
    .then((res) => {
      // request() already cached the pin (with a fresh 10-min window) on success.
      gate.open = false;
      pending.resolve(res);
      pending = null;
    })
    .catch((e) => {
      if (e.status === 401) gate.error = e.retryInMs ? 'Too many attempts — try later.' : 'Wrong PIN';
      else {
        gate.open = false;
        pending.reject(e);
        pending = null;
      }
    })
    .finally(() => {
      gate.busy = false;
    });
}

export function cancelPin() {
  gate.open = false;
  if (pending) pending.reject(new Error('cancelled'));
  pending = null;
}

// convenience for views
export async function write(teamId, fn, opts) {
  return runWithPin(teamId, fn, opts);
}

api; // (kept for tree-shaking safety)
