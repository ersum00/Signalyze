#!/usr/bin/env bash
# =============================================================================
# Signalyze deploy. Idempotent. Two modes:
#
#   Local machine:  deploy/deploy.sh --push [ssh-host]     (default host: veriskor)
#       rsyncs this checkout to /opt/signalyze on the server, then runs the
#       server mode there over ssh.
#
#   Server (root):  bash /opt/signalyze/deploy/deploy.sh
#       1. sanity checks (docker, shared Caddy edge, web-proxy network)
#       2. .env from deploy/.env.example on first run (random POSTGRES_PASSWORD)
#       3. verify host port 8090 is free (else 8091) for the loopback smoke port
#       4. docker compose up -d --build  (db + api + web; own network + web-proxy)
#       5. append/replace the marker block in the shared Caddyfile, validate,
#          reload gracefully (automatic rollback if validation fails)
#       6. health checks: loopback API, public API over TLS, landing
#
# Other projects on this server are never touched: no container outside the
# `signalyze` compose project is created, stopped or restarted, and the only
# shared file edited is the Caddyfile (between explicit markers, with backup).
# =============================================================================
set -euo pipefail

REMOTE_DIR=/opt/signalyze
CADDYFILE=/opt/kopiyasa/docker/Caddyfile
CADDY_CONTAINER=koradar-caddy
API_DOMAIN=api.signalyze.veriskor.com
WEB_DOMAIN=signalyze.veriskor.com

log() { printf '\033[1;34m[deploy]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[deploy] WARNING:\033[0m %s\n' "$*" >&2; }
die() { printf '\033[1;31m[deploy] ERROR:\033[0m %s\n' "$*" >&2; exit 1; }

# ----------------------------------------------------------------------------
# Local mode: rsync + remote execution
# ----------------------------------------------------------------------------
if [[ "${1:-}" == "--push" ]]; then
  HOST="${2:-veriskor}"
  REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
  EXCLUDES=(
    --exclude=.git --exclude=node_modules --exclude=.venv --exclude=dist
    --exclude=.output --exclude=.wxt --exclude=.astro --exclude=__pycache__
    --exclude=.env --exclude='*.pem' --exclude=apps/extension/keys
    --exclude=apps/extension/src/adapters/google-maps/fixtures
  )
  if command -v rsync >/dev/null 2>&1; then
    log "rsync $REPO_ROOT -> $HOST:$REMOTE_DIR"
    rsync -az --delete "${EXCLUDES[@]}" "$REPO_ROOT/" "$HOST:$REMOTE_DIR/"
  else
    # Windows / Git Bash has no rsync: stream a tar archive and let the server's
    # rsync mirror it into place (keeps the server-side .env).
    log "no local rsync; streaming tar to $HOST:$REMOTE_DIR"
    tar -C "$REPO_ROOT" "${EXCLUDES[@]}" -czf - . | ssh "$HOST" "set -e; rm -rf $REMOTE_DIR.incoming; mkdir -p $REMOTE_DIR.incoming $REMOTE_DIR; tar -xzf - -C $REMOTE_DIR.incoming; rsync -a --delete --exclude .env $REMOTE_DIR.incoming/ $REMOTE_DIR/; rm -rf $REMOTE_DIR.incoming"
  fi
  log "running server-side deploy on $HOST"
  ssh "$HOST" "bash $REMOTE_DIR/deploy/deploy.sh"
  exit $?
fi

# ----------------------------------------------------------------------------
# Server mode
# ----------------------------------------------------------------------------
[[ "$(id -u)" == "0" ]] || die "run as root on the server (or use --push from your machine)"
command -v docker >/dev/null || die "docker is not installed"
docker compose version >/dev/null 2>&1 || die "docker compose plugin missing"
[[ -d "$REMOTE_DIR/deploy" ]] || die "$REMOTE_DIR not found; run with --push from your machine"
cd "$REMOTE_DIR"

if ! docker ps --format '{{.Names}}' | grep -qx "$CADDY_CONTAINER"; then
  die "shared edge container '$CADDY_CONTAINER' is not running. This script targets the Caddy-based server layout; for a host-nginx server follow the bare-metal section of docs/DEPLOY.md (deploy/nginx, deploy/systemd)."
fi
docker network inspect web-proxy >/dev/null 2>&1 || die "shared docker network 'web-proxy' missing"
[[ -f "$CADDYFILE" ]] || die "shared Caddyfile not found at $CADDYFILE"

# 2. .env ---------------------------------------------------------------------
# No `... | head -c N` pipelines here: under `pipefail` head closing the pipe
# early turns into SIGPIPE (exit 141) and aborts the whole script.
random_secret() {
  if command -v openssl >/dev/null 2>&1; then openssl rand -hex 24; else python3 -c 'import secrets; print(secrets.token_hex(24))'; fi
}
if [[ ! -f .env ]]; then
  cp deploy/.env.example .env
  chmod 600 .env
  warn ".env created from deploy/.env.example."
  warn "Review EXTENSION_IDS in $REMOTE_DIR/.env (add the Web Store id after publishing)."
fi
if ! grep -qE '^POSTGRES_PASSWORD=.+$' .env; then
  if docker volume inspect signalyze_pgdata >/dev/null 2>&1; then
    die "POSTGRES_PASSWORD is empty in .env but the database volume already exists; set the original password."
  fi
  PW="$(random_secret)"
  if grep -q '^POSTGRES_PASSWORD=' .env; then
    sed -i "s|^POSTGRES_PASSWORD=.*|POSTGRES_PASSWORD=$PW|" .env
  else
    echo "POSTGRES_PASSWORD=$PW" >> .env
  fi
  warn "generated POSTGRES_PASSWORD in $REMOTE_DIR/.env"
fi
set -a; source .env; set +a
[[ -n "${POSTGRES_PASSWORD:-}" ]] || die "POSTGRES_PASSWORD empty in .env"
[[ -n "${EXTENSION_IDS:-}" ]] || die "EXTENSION_IDS empty in .env"

# 3. loopback port ------------------------------------------------------------
API_HOST_PORT="${API_HOST_PORT:-8090}"
port_owner() { ss -tlnp 2>/dev/null | awk -v p=":$1" '$4 ~ p"$" {print $0}'; }
OWNER="$(port_owner "$API_HOST_PORT")"
if [[ -n "$OWNER" && "$OWNER" != *docker-proxy* ]]; then
  warn "port $API_HOST_PORT is in use by another process; switching smoke port to 8091"
  API_HOST_PORT=8091
  OWNER="$(port_owner "$API_HOST_PORT")"
  [[ -z "$OWNER" || "$OWNER" == *docker-proxy* ]] || die "port 8091 is also taken; set API_HOST_PORT in .env"
fi
if grep -q '^API_HOST_PORT=' .env; then
  sed -i "s|^API_HOST_PORT=.*|API_HOST_PORT=$API_HOST_PORT|" .env
else
  echo "API_HOST_PORT=$API_HOST_PORT" >> .env
fi
export API_HOST_PORT

# 4. containers ---------------------------------------------------------------
log "building and starting the signalyze stack (db, api, web)"
docker compose -f deploy/docker-compose.yml --env-file .env up -d --build --remove-orphans
docker compose -f deploy/docker-compose.yml --env-file .env ps

# 5. Caddy block --------------------------------------------------------------
BLOCK_SRC="deploy/caddy/signalyze.caddy"
BACKUP="${CADDYFILE}.backup.signalyze.$(date +%Y%m%d%H%M%S)"
cp "$CADDYFILE" "$BACKUP"
log "backup of shared Caddyfile: $BACKUP"

python3 - "$CADDYFILE" "$BLOCK_SRC" <<'PY'
import re, sys
caddyfile, block_src = sys.argv[1], sys.argv[2]
block = open(block_src, encoding="utf-8").read().rstrip("\n") + "\n"
text = open(caddyfile, encoding="utf-8").read()
pattern = re.compile(r"# >>> signalyze >>>.*?# <<< signalyze <<<\n?", re.S)
if pattern.search(text):
    new = pattern.sub(lambda _m: block, text, count=1)
    action = "replaced"
else:
    new = text.rstrip("\n") + "\n\n" + block
    action = "appended"
if new != text:
    open(caddyfile, "w", encoding="utf-8").write(new)
print(f"[deploy] signalyze block {action} in Caddyfile" + ("" if new != text else " (no change)"))
PY

if docker exec "$CADDY_CONTAINER" caddy validate --config /etc/caddy/Caddyfile >/tmp/signalyze-caddy-validate.log 2>&1; then
  docker exec "$CADDY_CONTAINER" caddy reload --config /etc/caddy/Caddyfile
  log "Caddy reloaded"
else
  cp "$BACKUP" "$CADDYFILE"
  cat /tmp/signalyze-caddy-validate.log >&2
  die "Caddyfile validation failed; original restored from $BACKUP. Caddy was NOT reloaded."
fi

# 6. health -------------------------------------------------------------------
log "waiting for API on 127.0.0.1:$API_HOST_PORT"
for _ in $(seq 1 30); do
  if curl -fsS "http://127.0.0.1:$API_HOST_PORT/v1/health" >/dev/null 2>&1; then break; fi
  sleep 2
done
curl -fsS "http://127.0.0.1:$API_HOST_PORT/v1/health" || die "API did not become healthy; see: docker logs signalyze-api"
echo

log "waiting for TLS on https://$API_DOMAIN (first run: certificate issuance can take ~30 s)"
for _ in $(seq 1 45); do
  if curl -fsS "https://$API_DOMAIN/v1/health" >/dev/null 2>&1; then break; fi
  sleep 2
done
curl -fsS "https://$API_DOMAIN/v1/health" || die "public API health check failed; see: docker logs $CADDY_CONTAINER"
echo
log "waiting for TLS on https://$WEB_DOMAIN"
for _ in $(seq 1 45); do
  if curl -fsS -o /dev/null "https://$WEB_DOMAIN/" >/dev/null 2>&1; then break; fi
  sleep 2
done
curl -fsS -o /dev/null -w "landing https://$WEB_DOMAIN -> HTTP %{http_code}\n" "https://$WEB_DOMAIN/" || die "landing health check failed; see: docker logs $CADDY_CONTAINER"

log "done."
