import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

// db.js opens the SQLite file at import time, so point it at a scratch dir
// before anything pulls it in.
const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'wheel-test-'));
process.env.DATA_DIR = dataDir;
process.env.STATIC_DIR = path.join(dataDir, 'no-static');
process.env.REGISTRATION_SECRET = 'top-secret';

const { createApp } = await import('../src/app.js');

let server;
let base;
let ipCounter = 0;
const freshIp = () => `10.0.0.${++ipCounter}`;

before(async () => {
  server = createApp().listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}/api`;
});

after(() => {
  server.close();
  fs.rmSync(dataDir, { recursive: true, force: true });
});

async function post(p, body, ip) {
  const res = await fetch(base + p, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Forwarded-For': ip },
    body: JSON.stringify(body),
  });
  return { status: res.status, body: await res.json() };
}

async function createTeam(ip, name = 'T') {
  const r = await post('/teams', { name, pin: '1234', secret: 'top-secret' }, ip);
  assert.equal(r.status, 201);
  return r.body.id;
}

test('team creation rejects a wrong secret and accepts the right one', async () => {
  const ip = freshIp();
  const bad = await post('/teams', { name: 'T', pin: '1234', secret: 'nope' }, ip);
  assert.equal(bad.status, 401);
  const good = await post('/teams', { name: 'T', pin: '1234', secret: 'top-secret' }, ip);
  assert.equal(good.status, 201);
});

test('secret throttle is per client, not per team', async () => {
  const ip = freshIp();
  const a = await createTeam(ip, 'A');
  const b = await createTeam(ip, 'B');
  for (let i = 0; i < 5; i++) {
    const r = await post(`/teams/${a}/pin/reset`, { pin: '9999', secret: 'nope' }, ip);
    assert.equal(r.status, 401);
  }
  // Locked out now: the correct secret against a different team still fails.
  const locked = await post(`/teams/${b}/pin/reset`, { pin: '9999', secret: 'top-secret' }, ip);
  assert.equal(locked.status, 401);
  assert.ok(locked.body.retryInMs > 0);
  // ...and creation, which shares the same key, is locked too.
  const create = await post('/teams', { name: 'C', pin: '1234', secret: 'top-secret' }, ip);
  assert.equal(create.status, 401);
});

test('trust proxy: a lockout for one forwarded IP does not affect another', async () => {
  const locked = freshIp();
  const other = freshIp();
  const team = await createTeam(other);
  for (let i = 0; i < 5; i++) await post('/teams', { pin: '1234', secret: 'nope' }, locked);
  const stillLocked = await post('/teams', { pin: '1234', secret: 'top-secret' }, locked);
  assert.equal(stillLocked.status, 401);
  const ok = await post(`/teams/${team}/pin/reset`, { pin: '4321', secret: 'top-secret' }, other);
  assert.equal(ok.status, 200);
});

test('PIN reset actually changes the PIN and validates the new one', async () => {
  const ip = freshIp();
  const team = await createTeam(ip);
  const short = await post(`/teams/${team}/pin/reset`, { pin: '12', secret: 'top-secret' }, ip);
  assert.equal(short.status, 400);
  const reset = await post(`/teams/${team}/pin/reset`, { pin: '5678', secret: 'top-secret' }, ip);
  assert.equal(reset.status, 200);
  const withOld = await fetch(`${base}/teams/${team}/reset/all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-pin': '1234', 'X-Forwarded-For': ip },
    body: '{}',
  });
  assert.equal(withOld.status, 401);
  const withNew = await fetch(`${base}/teams/${team}/reset/all`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-pin': '5678', 'X-Forwarded-For': ip },
    body: '{}',
  });
  assert.equal(withNew.status, 200);
});

test('PIN reset is disabled when no secret is configured, creation stays open', async () => {
  const ip = freshIp();
  const team = await createTeam(ip);
  const saved = process.env.REGISTRATION_SECRET;
  process.env.REGISTRATION_SECRET = '';
  try {
    const reset = await post(`/teams/${team}/pin/reset`, { pin: '9999', secret: '' }, ip);
    assert.equal(reset.status, 403);
    const create = await post('/teams', { name: 'Open', pin: '1234' }, ip);
    assert.equal(create.status, 201);
  } finally {
    process.env.REGISTRATION_SECRET = saved;
  }
});
