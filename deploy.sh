#!/bin/bash
# Deploy wheel-of-names to the VPS — mirrors doxbit-site's deploy model:
# build locally, docker-save | gzip | ssh | docker-load, sync compose+env, up.
# Optionally (CADDY_SYNC=1) also push the Caddy site file and reload Caddy.
set -euo pipefail

# ── VPS connection ───────────────────────────────────────────────────────────
# Config lives in .env.deploy (gitignored — never commit it). Seed it from
# .env.deploy.example: VPS_USER, VPS_HOST, SSH_KEY, REMOTE_DIR, DATA_DIR_HOST.
if [ ! -f .env.deploy ]; then
  echo "✗ .env.deploy missing locally. Seed it from .env.deploy.example." >&2
  exit 1
fi
# shellcheck disable=SC1091
source .env.deploy

: "${VPS_USER:?VPS_USER not set in .env.deploy}"
: "${VPS_HOST:?VPS_HOST not set in .env.deploy}"
: "${SSH_KEY:?SSH_KEY not set in .env.deploy}"
: "${REMOTE_DIR:?REMOTE_DIR not set in .env.deploy}"
: "${DATA_DIR_HOST:?DATA_DIR_HOST not set in .env.deploy}"
export DATA_DIR_HOST

# .env.deploy is sourced by the LOCAL shell, so an unquoted ~ in REMOTE_DIR
# expands to the local home (e.g. /home/alex) — a path the VPS user can't
# create. Use a path relative to the remote home instead (containers/wheel).
case "$REMOTE_DIR" in
  "$HOME"|"$HOME"/*)
    echo "✗ REMOTE_DIR expanded to your LOCAL home ($REMOTE_DIR)." >&2
    echo "  In .env.deploy set it relative to the VPS home, e.g. REMOTE_DIR=containers/wheel-of-names" >&2
    exit 1 ;;
esac
REMOTE_DIR="${REMOTE_DIR#\~/}" # a quoted '~/x' is fine too; ssh/scp resolve it against the remote home

SSH_OPTS="-i $SSH_KEY -o IdentitiesOnly=yes -o StrictHostKeyChecking=no"
SSH="ssh $SSH_OPTS"
SCP="scp $SSH_OPTS"

IMG="wheel-of-names"

# ── Optional Caddy site sync (see CADDY_SYNC below) ─────────────────────────
# Override these if the VPS Caddy layout differs from the defaults.
CADDY_SITE="${CADDY_SITE:-caddy/sites/won.doxbit.com.caddy}"
CADDY_REMOTE_SITES="${CADDY_REMOTE_SITES:-containers/caddy/sites}" # relative to the remote home
CADDY_CONTAINER="${CADDY_CONTAINER:-caddy}"
CADDY_CONFIG="${CADDY_CONFIG:-/etc/caddy/Caddyfile}"

# Set to 1 to actually push the site file and reload Caddy.
CADDY_SYNC="${CADDY_SYNC:-0}"

cleanup() {
  [ -n "${SSH_AGENT_PID:-}" ] && ssh-agent -k >/dev/null 2>&1 || true
}
trap cleanup EXIT

# ── preflight ───────────────────────────────────────────────────────────────
if [ ! -f .env.prod ]; then
  echo "✗ .env.prod missing locally. Seed it from .env.prod.example + the values on the VPS." >&2
  exit 1
fi

IMAGE_TAG="$(git rev-parse --short HEAD 2>/dev/null || echo snapshot)"
export IMAGE_TAG
echo "→ Deploying tag: $IMAGE_TAG"

# ── ssh-agent (key is passphrase-protected) ─────────────────────────────────
eval "$(ssh-agent -s)" >/dev/null
ssh-add "$SSH_KEY"

# ── ensure context exists ───────────────────────────────────────────────────
docker context inspect vps >/dev/null 2>&1 || \
  docker context create vps --docker "host=ssh://$VPS_USER@$VPS_HOST"

# ── build locally ───────────────────────────────────────────────────────────
echo "→ Building image locally..."
docker compose -f docker-compose.prod.yml build
docker tag "$IMG:$IMAGE_TAG" "$IMG:latest"

# ── transfer image to VPS via SSH pipe (WSL2-compatible) ────────────────────
echo "→ Transferring image to VPS..."
docker save "$IMG:$IMAGE_TAG" \
  | gzip \
  | $SSH "$VPS_USER@$VPS_HOST" "gunzip | docker load"

echo "→ Tagging :latest on VPS..."
docker --context vps tag "$IMG:$IMAGE_TAG" "$IMG:latest"

# ── sync compose + env, then start ──────────────────────────────────────────
echo "→ Syncing compose + env to VPS..."
$SSH "$VPS_USER@$VPS_HOST" "mkdir -p $REMOTE_DIR"
$SCP docker-compose.prod.yml "$VPS_USER@$VPS_HOST:$REMOTE_DIR/docker-compose.yml"
$SCP .env.prod               "$VPS_USER@$VPS_HOST:$REMOTE_DIR/.env.prod"

echo "→ Starting on VPS..."
docker --context vps compose -f docker-compose.prod.yml up -d

# ── optional Caddy site sync ────────────────────────────────────────────────
if [ -f "$CADDY_SITE" ]; then
  if [ "$CADDY_SYNC" = "1" ]; then
    echo "→ Syncing Caddy site + reloading..."
    $SSH "$VPS_USER@$VPS_HOST" "mkdir -p $CADDY_REMOTE_SITES"
    $SCP "$CADDY_SITE" "$VPS_USER@$VPS_HOST:$CADDY_REMOTE_SITES/"
    if $SSH "$VPS_USER@$VPS_HOST" "docker exec $CADDY_CONTAINER caddy validate --config $CADDY_CONFIG"; then
      $SSH "$VPS_USER@$VPS_HOST" "docker exec $CADDY_CONTAINER caddy reload --config $CADDY_CONFIG" \
        && echo "✓ Caddy reloaded" \
        || echo "⚠ Caddy reload failed — validate/reload manually"
    else
      echo "⚠ Caddy config did not validate — NOT reloading (site file still uploaded)." >&2
    fi
  else
    echo "⏭ Caddy site found but CADDY_SYNC!=1 — re-run with CADDY_SYNC=1 to push it."
  fi
else
  echo "⏭ No local Caddy site at $CADDY_SITE — skipping."
fi

echo "✓ Done ($IMAGE_TAG)"
