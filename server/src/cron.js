import cron from 'node-cron';
import db from './db.js';

// Nightly job (UTC): snapshot each team's current weights under today's date.
// Used as the "previous day" reset target. Pure snapshot — never steps weights.
export function runSnapshots() {
  const teams = db.prepare('SELECT id FROM teams').all();
  const upsert = db.prepare(`
    INSERT INTO snapshots (team_id, snap_date, data)
    VALUES (?, ?, ?)
    ON CONFLICT(team_id, snap_date) DO UPDATE SET data = excluded.data
  `);
  const getMembers = db.prepare('SELECT id, weight FROM members WHERE team_id = ?');
  const today = new Date().toISOString().slice(0, 10);
  const tx = db.transaction(() => {
    for (const team of teams) {
      const members = getMembers.all(team.id);
      if (members.length === 0) continue; // no-op if nothing to snapshot
      const data = JSON.stringify(Object.fromEntries(members.map((m) => [m.id, m.weight])));
      upsert.run(team.id, today, data);
    }
  });
  tx();
  return teams.length;
}

export function startNightlyJob() {
  const schedule = process.env.SNAPSHOT_CRON || '50 23 * * *'; // 23:50 UTC
  cron.schedule(schedule, () => {
    try {
      runSnapshots();
    } catch (err) {
      console.error('nightly snapshot failed:', err);
    }
  });
  console.log(`[cron] nightly snapshot scheduled: "${schedule}" (UTC)`);
}
