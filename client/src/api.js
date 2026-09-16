// Tiny API client + shared PIN store (sessionStorage, never in the URL).

const base = '/api';
const PIN_TTL_MS = 10 * 60 * 1000; // once entered, a PIN authenticates further writes for 10 min

export const pinStore = {
  get(teamId) {
    const raw = sessionStorage.getItem(`pin:${teamId}`);
    if (!raw) return '';
    const { pin, expiresAt } = JSON.parse(raw);
    if (Date.now() > expiresAt) {
      sessionStorage.removeItem(`pin:${teamId}`);
      return '';
    }
    return pin;
  },
  set(teamId, pin) {
    sessionStorage.setItem(`pin:${teamId}`, JSON.stringify({ pin, expiresAt: Date.now() + PIN_TTL_MS }));
  },
  clear(teamId) {
    sessionStorage.removeItem(`pin:${teamId}`);
  },
};

async function request(teamId, path, { method = 'GET', body, pin } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const sendPin = pin !== undefined ? pin : pinStore.get(teamId);
  if (sendPin) headers['x-pin'] = sendPin;
  const res = await fetch(base + path, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    let e = { error: res.statusText };
    try {
      e = await res.json();
    } catch {}
    const err = new Error(e.error || 'request failed');
    err.status = res.status;
    err.retryInMs = e.retryInMs;
    err.teamId = teamId;
    throw err;
  }
  // Authenticated write succeeded — (re)start the 10-minute window.
  if (sendPin && teamId) pinStore.set(teamId, sendPin);
  return res.json();
}

export const api = {
  createTeam: (name, pin, secret) =>
    request(null, '/teams', { method: 'POST', body: { name, pin, secret } }),
  getTeam: (tid) => request(tid, `/teams/${tid}`),
  spin: (tid, pin) => request(tid, `/teams/${tid}/spin`, { method: 'POST', body: {}, pin }),
  preview: (tid) => request(tid, `/teams/${tid}/preview`, { method: 'POST', body: {} }),
  addMember: (tid, name, pin) =>
    request(tid, `/teams/${tid}/members`, { method: 'POST', body: { name }, pin }),
  updateMember: (tid, mid, patch, pin) =>
    request(tid, `/teams/${tid}/members/${mid}`, { method: 'PATCH', body: patch, pin }),
  deleteMember: (tid, mid, pin) =>
    request(tid, `/teams/${tid}/members/${mid}`, { method: 'DELETE', pin }),
  updateSettings: (tid, patch, pin) =>
    request(tid, `/teams/${tid}/settings`, { method: 'PATCH', body: patch, pin }),
  // currentPin authenticates the request (x-pin header); newPin is the value being set (body).
  changePin: (tid, newPin, currentPin) =>
    request(tid, `/teams/${tid}/pin`, { method: 'POST', body: { pin: newPin }, pin: currentPin }),
  // Forgotten-PIN recovery: the server's REGISTRATION_SECRET stands in for the old PIN.
  resetPin: (tid, newPin, secret) =>
    request(tid, `/teams/${tid}/pin/reset`, { method: 'POST', body: { pin: newPin, secret } }),
  resetDay: (tid, pin) => request(tid, `/teams/${tid}/reset/day`, { method: 'POST', body: {}, pin }),
  resetAll: (tid, pin) => request(tid, `/teams/${tid}/reset/all`, { method: 'POST', body: {}, pin }),
  stats: (tid) => request(tid, `/teams/${tid}/stats`),
};
