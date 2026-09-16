// Global PIN gate: any write that 401s raises the prompt modal, retries with
// the entered PIN, and stores it (sessionStorage) so subsequent writes pass.
import { reactive } from 'vue';
import { pinStore } from './api.js';

export const gate = reactive({
  open: false,
  teamId: null,
  title: 'PIN required',
  message: '',
  error: '',
  busy: false,
  attempt: 0, // bumped on every wrong PIN so the prompt can clear its input
});

let pending = null;

// Dismissing the prompt is not a failure; views check this and stay quiet.
export const isCancelled = (e) => !!e?.cancelled;

export function authErrorMessage(e, credential = 'PIN') {
  if (e.status !== 401) return e.message;
  if (e.retryInMs > 0) {
    const min = Math.max(1, Math.ceil(e.retryInMs / 60000));
    return `Too many attempts. Try again in ${min} min.`;
  }
  return `Wrong ${credential}`;
}

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
// pin is remembered for subsequent calls. A lockout is rethrown as-is so the
// caller can show the remaining wait.
export async function runWithPin(teamId, action, { title, message } = {}) {
  try {
    return await action(pinStore.get(teamId));
  } catch (e) {
    if (e.status !== 401 || e.retryInMs > 0) throw e;
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
      gate.open = false;
      pending.resolve(res);
      pending = null;
    })
    .catch((e) => {
      if (e.status === 401) {
        gate.error = authErrorMessage(e);
        gate.attempt++;
      } else {
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
  if (pending) pending.reject(Object.assign(new Error('cancelled'), { cancelled: true }));
  pending = null;
}

export const write = runWithPin;
