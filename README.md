# 🎡 Wheel of Names — a weighted name picker

A self-hosted name picker with a **weighted-decay distribution**: a name picked today gets less
probability tomorrow, and — crucially — people who *haven't* been picked for a long time
automatically accumulate weight and become more likely. Fairness is **emergent**, not
hard-coded.

- **Stack:** Node + Express + SQLite (better-sqlite3) backend, Vue 3 + Vite SPA, single Docker
  image (server serves the compiled SPA), deployed to a VPS.
- **Multi-team:** each team lives at `/team/:id`; `team_id` in the schema from day one.
- **Access:** read is open; every mutation is gated by a shared per-team PIN (scrypt-hashed,
  constant-time compare, per-IP brute-force throttle). Changing the PIN requires the old one;
  a forgotten PIN can be reset with the server's `REGISTRATION_SECRET` instead.

## The distribution algorithm

```
N = full roster count (absent members still count toward N)
g = gain_mult × base_weight / N        # gain_mult is a config knob, default 1.0
Each pick:
  every ACTIVE member gains +g
  the picked member loses g × N  (= base_weight)
Weights floor at floor_k × base_weight (default 0.10); never hard-zero.
```

- Over a **full rotation** everyone returns to baseline —— conservation by construction.
- Not-picked people climb linearly → the neglected get favored automatically.
- Consecutive picks sting hard (`−g(N−1)`) → the just-picked get disfavored.
- `gain_mult = 0` = pure uniform random (weights never move).
- **Absent** members are pinned at baseline and excluded from picks; they don't move N or g.
- **No manual favor knob** — favor is purely the emergent accumulation.

## Reset & history

- Two reset buttons (PIN-gated): **undo to previous day** (restores the most recent
  pre-today nightly snapshot) and **reset all to baseline**.
- A nightly UTC cron job snapshots each team's end-of-day weights for the previous-day reset.
- The **pick log is append-only** and survives all resets — it backs the Stats tab
  (lifetime & monthly leaders, longest drought, currently-due pick).

## Animation

Multiple selectable reveal themes (Wheel, Horse race, Balloon, Mountaineer). The winner is chosen by a
**single authoritative weighted draw**; the animation is a **choreographed reveal** that always
ends with that pre-chosen winner — so the visuals never change the actual odds. A **Preview**
button runs the animation without recording anything.

## Development

```bash
# terminal 1
npm run dev:server     # server on :3000, vite proxies /api -> :3000
# terminal 2
npm run dev:client     # SPA on :5173
```

## Production / deployment

1. `npm --prefix client run build` locally (or let the Dockerfile build it).
2. Seed `.env.prod` from `.env.prod.example`.
3. Seed `.env.deploy` from `.env.deploy.example` (VPS user/host, SSH key, remote dir, and the
   host-side data path). This file is gitignored — the actual VPS host/user never live in git.
4. Run `./deploy.sh` — builds the image locally, pipes it to the VPS
   (`docker save | gzip | ssh | docker load`), syncs compose + env, and `up -d` via the `vps`
   docker context. Mirrors the doxbit-site deploy model.

SQLite data is bind-mounted from `DATA_DIR_HOST` (set in `.env.deploy`) on the VPS to `/data` in
the container, so it lives alongside the compose/env files instead of in a Docker-managed volume.
The cron snapshot job runs inside the Node process (node-cron), so there's no host cron to
manage.

## API sketch

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/api/teams` | open | create a team (+ its PIN) |
| GET | `/api/teams/:id` | read | team + members + odds |
| GET | `/api/teams/:id/odds` | read | current probabilities |
| POST | `/api/teams/:id/spin` | PIN | record a pick (mutates weights) |
| POST | `/api/teams/:id/preview` | read | draw winner without recording |
| POST | `/api/teams/:id/members` | PIN | add member |
| PATCH | `/api/teams/:id/members/:mid` | PIN | rename / toggle absent |
| DELETE | `/api/teams/:id/members/:mid` | PIN | remove member |
| PATCH | `/api/teams/:id/settings` | PIN | base_weight / gain_mult / floor_k / theme / name |
| POST | `/api/teams/:id/pin` | PIN | change PIN (needs the current one) |
| POST | `/api/teams/:id/pin/reset` | admin secret | forgotten-PIN recovery (needs `REGISTRATION_SECRET`) |
| POST | `/api/teams/:id/reset/day` | PIN | restore previous-day snapshot |
| POST | `/api/teams/:id/reset/all` | PIN | reset all weights to baseline |
| GET | `/api/teams/:id/stats` | read | leaders / droughts / due pick |
