import { Router } from 'express';
import db from './db.js';
import { hashPin, verifyPin, newId, safeEqual } from './auth.js';
import { isLocked, recordFailure, recordSuccess, throttleKey, throttleRemainingMs } from './throttle.js';
import {
  rosterCount,
  activeMembers,
  dailyGain,
  floorValue,
  applyStep,
  weightedPick,
  odds,
} from './algorithm.js';

const router = Router();

const today = () => new Date().toISOString().slice(0, 10);

// ── helpers ────────────────────────────────────────────────────────────────
function getTeam(id) {
  return db.prepare('SELECT * FROM teams WHERE id = ?').get(id);
}
function getMembers(teamId) {
  return db
    .prepare('SELECT id, name, weight, absent FROM members WHERE team_id = ? ORDER BY name')
    .all(teamId);
}
function teamState(team) {
  const members = getMembers(team.id);
  return {
    team: {
      id: team.id,
      name: team.name,
      base_weight: team.base_weight,
      gain_mult: team.gain_mult,
      floor_k: team.floor_k,
      theme: team.theme,
    },
    members: odds(members),
    meta: {
      roster_count: rosterCount(members),
      active_count: activeMembers(members).length,
      g: dailyGain(members, team.base_weight, team.gain_mult),
      floor: floorValue(team.base_weight, team.floor_k),
    },
  };
}

// PIN gate for write endpoints. Attach team to req.
function requirePin(req, res, next) {
  const team = req.team;
  const key = throttleKey(req.ip, team.id);
  if (!isLocked(key)) {
    const pin = req.get('x-pin');
    if (verifyPin(pin, team.pin_salt, team.pin_hash)) {
      recordSuccess(key);
      return next();
    }
    recordFailure(key);
  }
  const lockMs = throttleRemainingMs(key);
  return res
    .status(401)
    .json({ error: 'invalid or missing PIN', retryInMs: lockMs });
}

function loadTeamParam(req, res, next) {
  const team = getTeam(req.params.id);
  if (!team) return res.status(404).json({ error: 'team not found' });
  req.team = team;
  next();
}

const normalizeNumber = (v, dflt, min, max) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
};

// ── shared admin secret (REGISTRATION_SECRET) ──────────────────────────────
// Gates team creation and forgotten-PIN recovery. The secret is global, so
// the brute-force throttle is keyed on the client IP alone (never per team,
// or an attacker would get a fresh attempt budget for every team id).
// `whenUnset` decides what happens with no secret configured: creation stays
// open ('allow'), PIN reset is disabled ('deny') since nothing would gate it.
function requireSecret(whenUnset) {
  return (req, res, next) => {
    const requiredSecret = process.env.REGISTRATION_SECRET;
    if (!requiredSecret) {
      if (whenUnset === 'allow') return next();
      return res.status(403).json({ error: 'PIN reset is not enabled on this server' });
    }
    const key = throttleKey(req.ip, 'secret');
    if (isLocked(key)) {
      return res.status(401).json({ error: 'invalid secret', retryInMs: throttleRemainingMs(key) });
    }
    if (!safeEqual(String(req.body.secret || ''), requiredSecret)) {
      recordFailure(key);
      return res.status(401).json({ error: 'invalid secret', retryInMs: throttleRemainingMs(key) });
    }
    recordSuccess(key);
    next();
  };
}

const validPin = (pin) => pin.length >= 4 && pin.length <= 8 && /^\d+$/.test(pin);

// ── teams: create ───────────────────────────────────────────────────────────
router.post('/teams', requireSecret('allow'), (req, res) => {
  const name = String(req.body.name || 'Team').slice(0, 80);
  const pin = String(req.body.pin || '');
  if (!validPin(pin)) {
    return res.status(400).json({ error: 'PIN must be 4-8 digits' });
  }
  const id = newId();
  const { salt, hash } = hashPin(pin);
  db.prepare(
    'INSERT INTO teams (id, name, base_weight, gain_mult, floor_k, theme, pin_hash, pin_salt) VALUES (?,?,?,?,?,?,?,?)'
  ).run(id, name, 10, 1, 0.1, 'wheel', hash, salt);
  res.status(201).json({ id, url: `/team/${id}` });
});

router.get('/teams/:id', loadTeamParam, (req, res) => {
  res.json(teamState(req.team));
});

router.patch('/teams/:id/settings', loadTeamParam, requirePin, (req, res) => {
  const { name, base_weight, gain_mult, floor_k, theme } = req.body;
  const t = req.team;
  const patch = {};
  if (name !== undefined) patch.name = String(name).slice(0, 80);
  if (base_weight !== undefined)
    patch.base_weight = normalizeNumber(base_weight, t.base_weight, 1, 1000);
  if (gain_mult !== undefined) patch.gain_mult = normalizeNumber(gain_mult, t.gain_mult, 0, 100);
  if (floor_k !== undefined) patch.floor_k = normalizeNumber(floor_k, t.floor_k, 0, 0.99);
  if (theme !== undefined && ['wheel', 'horse', 'derby', 'balloon', 'mountain', 'alien'].includes(theme))
    patch.theme = theme;

  const cols = Object.entries(patch).map(([k]) => k);
  if (cols.length) {
    db.prepare(
      `UPDATE teams SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`
    ).run(...cols.map((c) => patch[c]), req.team.id);
  }
  res.json(teamState(getTeam(req.team.id)));
});

function setPin(req, res) {
  const pin = String(req.body.pin || '');
  if (!validPin(pin)) {
    res.status(400).json({ error: 'PIN must be 4-8 digits' });
    return false;
  }
  const { salt, hash } = hashPin(pin);
  db.prepare('UPDATE teams SET pin_hash = ?, pin_salt = ? WHERE id = ?').run(hash, salt, req.team.id);
  res.json({ ok: true });
  return true;
}

router.post('/teams/:id/pin', loadTeamParam, requirePin, setPin);

// Forgotten-PIN recovery: the server operator's secret stands in for the old PIN.
router.post('/teams/:id/pin/reset', loadTeamParam, requireSecret('deny'), (req, res) => {
  if (setPin(req, res)) {
    console.log(`[auth] PIN reset via admin secret for team ${req.team.id} from ${req.ip}`);
  }
});

// ── members (write = PIN-gated) ────────────────────────────────────────────
router.post('/teams/:id/members', loadTeamParam, requirePin, (req, res) => {
  const name = String(req.body.name || '').trim().slice(0, 60);
  if (!name) return res.status(400).json({ error: 'name required' });
  const id = newId();
  db.prepare('INSERT INTO members (id, team_id, name, weight) VALUES (?,?,?,?)').run(
    id,
    req.team.id,
    name,
    req.team.base_weight
  );
  res.status(201).json(teamState(getTeam(req.team.id)));
});

router.patch('/teams/:id/members/:mid', loadTeamParam, requirePin, (req, res) => {
  const m = db
    .prepare('SELECT * FROM members WHERE id = ? AND team_id = ?')
    .get(req.params.mid, req.team.id);
  if (!m) return res.status(404).json({ error: 'member not found' });
  const { name, absent } = req.body;
  if (name !== undefined) {
    db.prepare('UPDATE members SET name = ? WHERE id = ?').run(
      String(name).trim().slice(0, 60),
      m.id
    );
  }
  if (absent !== undefined) {
    // Marking absent pins the weight to base_weight and freezes it; un-marking
    // leaves that baseline value so they re-enter the pool "fresh".
    const newAbsent = absent ? 1 : 0;
    db.prepare('UPDATE members SET absent = ?, weight = ? WHERE id = ?').run(
      newAbsent,
      req.team.base_weight,
      m.id
    );
  }
  res.json(teamState(getTeam(req.team.id)));
});

router.delete('/teams/:id/members/:mid', loadTeamParam, requirePin, (req, res) => {
  db.prepare('DELETE FROM members WHERE id = ? AND team_id = ?').run(
    req.params.mid,
    req.team.id
  );
  res.json(teamState(getTeam(req.team.id)));
});

// ── odds (read) ─────────────────────────────────────────────────────────────
router.get('/teams/:id/odds', loadTeamParam, (req, res) => {
  res.json({ odds: odds(getMembers(req.team.id)), meta: teamState(req.team).meta });
});

// ── spin (write = PIN-gated) ────────────────────────────────────────────────
router.post('/teams/:id/spin', loadTeamParam, requirePin, (req, res) => {
  const team = req.team;
  const members = getMembers(team.id);
  if (activeMembers(members).length === 0) {
    return res.status(409).json({ error: 'no active members to pick from' });
  }
  const g = dailyGain(members, team.base_weight, team.gain_mult);
  const pick = weightedPick(members);
  const pickedAt = today();

  const process = db.transaction(() => {
    applyStep(members, g, pick.id, team.base_weight, team.floor_k);
    const upd = db.prepare('UPDATE members SET weight = ? WHERE id = ?');
    for (const m of members) upd.run(Math.round(m.weight * 1000) / 1000, m.id);
    db.prepare('INSERT INTO spin_log (team_id, member_id, picked_on) VALUES (?,?,?)').run(
      team.id,
      pick.id,
      pickedAt
    );
  });
  process();

  res.json({
    winner: pick,
    picked_on: pickedAt,
    ...teamState(getTeam(team.id)),
  });
});

// ── preview spin (read-only — no PIN, never mutates) ───────────────────────
router.post('/teams/:id/preview', loadTeamParam, (req, res) => {
  const team = req.team;
  const members = getMembers(team.id);
  const pick = weightedPick(members);
  res.json({
    winner: pick ? { id: pick.id, name: pick.name, weight: pick.weight } : null,
    ...teamState(team),
  });
});

// ── resets (write = PIN-gated) ──────────────────────────────────────────────
router.post('/teams/:id/reset/day', loadTeamParam, requirePin, (req, res) => {
  const team = req.team;
  const snap = db
    .prepare(
      'SELECT data, snap_date FROM snapshots WHERE team_id = ? AND snap_date < ? ORDER BY snap_date DESC LIMIT 1'
    )
    .get(team.id, today());
  if (!snap) return res.status(409).json({ error: 'no previous-day snapshot to restore' });
  const data = JSON.parse(snap.data);
  const upd = db.prepare('UPDATE members SET weight = ? WHERE id = ?');
  const members = getMembers(team.id);
  const tx = db.transaction(() => {
    for (const m of members) {
      const w = data[m.id] ?? team.base_weight;
      upd.run(w, m.id);
    }
  });
  tx();
  res.json({ restored_from: snap.snap_date, ...teamState(getTeam(team.id)) });
});

router.post('/teams/:id/reset/all', loadTeamParam, requirePin, (req, res) => {
  const team = req.team;
  db.prepare('UPDATE members SET weight = ? WHERE team_id = ?').run(team.base_weight, team.id);
  res.json(teamState(getTeam(team.id)));
});

// ── stats (read) ────────────────────────────────────────────────────────────
router.get('/teams/:id/stats', loadTeamParam, (req, res) => {
  const teamId = req.team.id;
  const log = db
    .prepare('SELECT member_id, name, picked_on FROM spin_log JOIN members ON members.id = spin_log.member_id WHERE spin_log.team_id = ? ORDER BY spin_log.picked_on')
    .all(teamId);

  // lifetime
  const lifetime = {};
  for (const r of log) lifetime[r.member_id] = lifetime[r.member_id] || { name: r.name, count: 0 };
  for (const r of log) lifetime[r.member_id].count++;

  // monthly (current UTC month)
  const month = today().slice(0, 7);
  const monthly = {};
  for (const r of log.filter((r) => r.picked_on.startsWith(month)))
    (monthly[r.member_id] = monthly[r.member_id] || { name: r.name, count: 0 }).count++;

  // longest drought (days since last pick) & currently-due pick
  const members = getMembers(teamId);
  const lastPick = {};
  log.forEach((r) => (lastPick[r.member_id] = r.picked_on));
  const day = 86400000;
  const now = Date.now();
  const droughts = members
    .filter((m) => !m.absent)
    .map((m) => {
      const last = lastPick[m.id];
      const days = last ? Math.floor((now - new Date(last + 'T00:00:00Z').getTime()) / day) : null;
      return { id: m.id, name: m.name, last_pick: last || null, days: days };
    })
    .sort((a, b) => (a.days ?? 1e9) - (b.days ?? 1e9));
  const due = droughts[0] || null;

  const leaderboard = Object.entries(lifetime)
    .map(([id, v]) => ({ id, name: v.name, count: v.count }))
    .sort((a, b) => b.count - a.count);

  res.json({ lifetime: leaderboard, monthly: Object.entries(monthly).map(([id, v]) => ({ id, name: v.name, count: v.count })).sort((a, b) => b.count - a.count), droughts, due });
});

export default router;
