# Deploy

Target: Hetzner CPX22 (3 vCPU, 4 GB RAM, Ubuntu), IP 62.238.97.127, SSH alias `veriskor`
(root, key `~/.ssh/id_ed25519`). The server already runs other projects. **Nothing in this guide
touches them**: Signalyze is its own Docker Compose stack, and the only shared file it edits is the
edge proxy's Caddyfile, between explicit markers, with a backup and automatic rollback.

## How the server is laid out (inspected 2026-09-12)

| Component    | Reality on the server                                                                            | Signalyze's use                                               |
| ------------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------------------- |
| Ports 80/443 | Owned by the `koradar-caddy` container (Caddy 2.11, automatic Let's Encrypt)                     | Two site blocks appended to `/opt/kopiyasa/docker/Caddyfile`  |
| Routing      | Containers join the external Docker network `web-proxy`; Caddy reverse-proxies by container name | `signalyze-web:80`, `signalyze-api:8090`                      |
| Databases    | One `postgres:16-alpine` container per project on that project's private network                 | Own container `signalyze-db`, volume `signalyze_pgdata`       |
| Host tools   | Python 3.14, rsync, docker compose v5. No nginx, certbot, uv or node on the host                 | Everything runs in containers; images are built on the server |
| Project dirs | `/opt/<project>`                                                                                 | `/opt/signalyze`                                              |

The brief's host-nginx + certbot + systemd layout is kept as a documented alternative at the end of
this page (`deploy/nginx/signalyze.conf`, `deploy/systemd/signalyze-api.service`).

## What `deploy/deploy.sh` does

Run from your machine:

```sh
deploy/deploy.sh --push veriskor
```

1. **rsync** the checkout to `/opt/signalyze` (excludes `.git`, `node_modules`, `.venv`, build
   output, `.env`, private keys and the adapter HTML fixtures).
2. Runs itself on the server over SSH, where it:
   1. checks it is root, that Docker and the compose plugin exist, that `koradar-caddy` is running,
      that the `web-proxy` network exists and that the shared Caddyfile is where expected. If any of
      these fail it stops before changing anything.
   2. creates `/opt/signalyze/.env` from `deploy/.env.example` on the first run with a random
      `POSTGRES_PASSWORD` (mode 600) and warns you to review `EXTENSION_IDS`.
   3. checks that host port 8090 is free for the loopback smoke-test binding; if another process
      owns it, switches to 8091 and records `API_HOST_PORT` in `.env`.
   4. `docker compose -f deploy/docker-compose.yml --env-file .env up -d --build`: builds the API
      image (`apps/api/Dockerfile`) and the landing image (`deploy/web.Dockerfile`, multi-stage:
      pnpm build → nginx), starts `signalyze-db`, `signalyze-api`, `signalyze-web`.
   5. backs up the Caddyfile to `Caddyfile.backup.signalyze.<timestamp>`, replaces or appends the
      block from `deploy/caddy/signalyze.caddy` between `# >>> signalyze >>>` and
      `# <<< signalyze <<<`, runs `caddy validate` inside the container, and only then
      `caddy reload` (graceful, no downtime for the other sites). If validation fails the backup
      is restored and the script exits non-zero without reloading.
   6. waits for `http://127.0.0.1:8090/v1/health`, then `https://api.signalyze.veriskor.com/v1/health`
      (first run: Caddy obtains the certificates, usually within 30 s), then the landing page.

The script is idempotent: re-running rebuilds images (Docker layer cache makes unchanged steps
fast), recreates containers only when something changed, and rewrites the Caddy block in place.

## First deployment, step by step

```sh
# 0. DNS: A records for signalyze.veriskor.com and api.signalyze.veriskor.com -> 62.238.97.127 (already set)
# 1. From the repo root on your machine:
pnpm install && pnpm lint && pnpm test          # make sure the tree is green
deploy/deploy.sh --push veriskor                # rsync + remote deploy

# 2. On the server, after the first run, review the generated environment:
ssh veriskor 'cat /opt/signalyze/.env'
#    EXTENSION_IDS must contain the dev id (apps/extension/extension-key.json) and, after
#    publishing, the Chrome Web Store id. Edit, then restart only the API container:
ssh veriskor 'cd /opt/signalyze && docker compose -f deploy/docker-compose.yml --env-file .env up -d api'

# 3. Verify
curl -fsS https://api.signalyze.veriskor.com/v1/health
curl -fsSI https://signalyze.veriskor.com/ | head -1
```

## Updating

```sh
deploy/deploy.sh --push veriskor
```

That is the whole update procedure. The API image is rebuilt and the container replaced; the
database volume is untouched; the cache is keyed by engine version so a new engine simply
recomputes.

## Where things are

| What                                      | Where                                                                       |
| ----------------------------------------- | --------------------------------------------------------------------------- |
| Checkout on the server                    | `/opt/signalyze`                                                            |
| Environment                               | `/opt/signalyze/.env`                                                       |
| Compose file                              | `/opt/signalyze/deploy/docker-compose.yml`                                  |
| Containers                                | `signalyze-db`, `signalyze-api`, `signalyze-web`                            |
| API logs (anonymised access log + errors) | `docker logs -f signalyze-api`                                              |
| Edge logs for our domains                 | `docker logs koradar-caddy 2>&1 \| grep signalyze`                          |
| Landing container logs                    | `docker logs signalyze-web`                                                 |
| Database                                  | `docker exec -it signalyze-db psql -U signalyze -d signalyze`               |
| Caddy block                               | `/opt/kopiyasa/docker/Caddyfile` between the signalyze markers              |
| Caddyfile backups                         | `/opt/kopiyasa/docker/Caddyfile.backup.signalyze.*`                         |
| Image build cache                         | Docker; `docker system prune` if disk gets tight (14 GB free at inspection) |

## Rollback

- **Bad API release:** on your machine check out the previous commit and run
  `deploy/deploy.sh --push veriskor` again; or on the server
  `docker compose -f deploy/docker-compose.yml --env-file .env up -d --no-build api` after
  re-tagging a previous image (`docker images signalyze-api`).
- **Caddy misconfiguration:** `deploy.sh` already restores the backup when validation fails. To
  remove Signalyze from the edge manually, delete everything between the two markers in the
  Caddyfile and run `docker exec koradar-caddy caddy reload --config /etc/caddy/Caddyfile`.
- **Stop everything (other projects unaffected):**
  `cd /opt/signalyze && docker compose -f deploy/docker-compose.yml --env-file .env down`.
  Add `-v` to delete the cache database as well; nothing irreplaceable lives there.

## Troubleshooting: certificate not issued for one domain

Caddy asks Let's Encrypt (then ZeroSSL) for a certificate the first time a domain is served.
Let's Encrypt validates from several vantage points, so **every** authoritative nameserver of
`veriskor.com` must answer with the A record. Check them directly:

```sh
for ns in $(dig +short NS veriskor.com); do echo "$ns: $(dig +short A signalyze.veriskor.com @$ns)"; done
```

If one nameserver answers empty or times out, the DNS provider's zone replication is lagging or
broken; fix or wait on the provider side. Caddy keeps retrying with backoff on its own (see
`docker logs koradar-caddy 2>&1 | grep signalyze.veriskor.com`), nothing needs redeploying. Until
the certificate exists, HTTPS for that domain fails with a TLS alert while the other domain works.

On the first deployment (2026-09-12) exactly this happened: two of the four nameservers returned
the record, one returned nothing and one timed out; `api.signalyze.veriskor.com` was issued at once,
`signalyze.veriskor.com` had to wait for the zone to converge.

**If the log shows "trying to solve challenge" for the domain and then nothing for hours**, the
issuance job is stuck (seen once with the ZeroSSL fallback: the validation never returned and the
job kept the per-domain lock, so `caddy reload` could not start a new attempt). The remedy is a
restart of the edge container, `docker restart -t 10 koradar-caddy`; it takes about one second,
other sites' certificates are on disk and come back immediately, and the missing certificate is
obtained on startup. Check every site afterwards.

## Known caveat: the shared Caddyfile belongs to another repository

`/opt/kopiyasa/docker/Caddyfile` is mounted from the kopiyasa project, whose deploy runs
`git reset --hard`. That would delete the Signalyze block (the PinForge project documents the same
issue). Re-running `deploy/deploy.sh` restores it in seconds. The durable fix is to add the block
from `deploy/caddy/signalyze.caddy` to the kopiyasa repository's Caddyfile; that is a change to
another project and is left to its owner.

## Resource budget

| Container     | Memory limit | Notes                                                                        |
| ------------- | ------------ | ---------------------------------------------------------------------------- |
| signalyze-api | 512 MB       | uvicorn, 2 workers; a 500-review analysis peaks well under 100 MB per worker |
| signalyze-db  | 192 MB       | `shared_buffers=32MB`, `max_connections=40`                                  |
| signalyze-web | 64 MB        | nginx serving static files                                                   |

Total under 800 MB against roughly 2.4 GB available at inspection. Rate limit: 60 analyses per IP
per hour, enforced in the API; body size capped at 2 MB both in Caddy and in the API.

## Bare-metal alternative (host nginx + certbot + systemd)

Not used on this server. For a host that has nginx and a host PostgreSQL:

```sh
rsync -az --exclude node_modules --exclude .git ./ root@HOST:/opt/signalyze/
ssh root@HOST
cd /opt/signalyze/apps/api && uv sync && cp .env.example .env   # fill DATABASE_URL, EXTENSION_IDS
sudo -u postgres psql -c "CREATE DATABASE signalyze;" -c "CREATE USER signalyze WITH PASSWORD '...';" -c "GRANT ALL PRIVILEGES ON DATABASE signalyze TO signalyze;"
psql postgresql://signalyze:...@127.0.0.1/signalyze -f /opt/signalyze/deploy/db/init.sql
ss -tlnp | grep 8090 || true                                     # must be free (else change PORT everywhere)
cp deploy/nginx/signalyze.conf /etc/nginx/sites-available/signalyze
ln -sf /etc/nginx/sites-available/signalyze /etc/nginx/sites-enabled/signalyze
nginx -t && systemctl reload nginx
certbot --nginx -d signalyze.veriskor.com -d api.signalyze.veriskor.com --non-interactive --agree-tos -m "$CERTBOT_EMAIL"
cp deploy/systemd/signalyze-api.service /etc/systemd/system/ && systemctl daemon-reload && systemctl enable --now signalyze-api
mkdir -p /var/www/signalyze && cp -r apps/landing/dist/* /var/www/signalyze/   # build the landing locally first
curl -f https://api.signalyze.veriskor.com/v1/health
```

Logs in that layout: `journalctl -u signalyze-api -f` and `/var/log/nginx/`.
