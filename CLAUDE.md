# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

Appandor is a multi-tenant inventory / warehouse-tracking SaaS engine. A single Node.js/Express backend serves both a JSON API and a static vanilla-JS frontend, backed by PostgreSQL. Everything runs in Docker on an Ubuntu server behind HTTPS. Source comments and log messages are predominantly in German.

## Running & operating

The app runs exclusively via Docker Compose (two containers: `appandor_backend` on Node 20, `appandor_postgres` on Postgres 16). The repo root is bind-mounted into the backend container at `/usr/src/app`, so code edits are live on disk but require a restart to take effect. Local `npm start` / `npm run dev` are not the real run path — the container command is `sleep 5 && npm install && node server.js`.

```bash
docker compose up -d --build          # build + start everything
docker compose ps                     # health check
docker compose logs -f node-app       # tail backend logs
docker compose restart node-app       # apply code changes
docker kill -s HUP appandor_backend   # soft reload

# Rebuild DB schema / seed test data (run against the running postgres container):
docker compose exec -T postgres-db psql -U appandor_admin -d appandor_universal_inventory -f /docker-entrypoint-initdb.d/01_init_tables.sql
docker compose exec -T postgres-db psql -U appandor_admin -d appandor_universal_inventory -f /docker-entrypoint-initdb.d/02_test_data.sql

# Full DB wipe + fresh start (DESTROYS all data):
docker compose down -v && docker compose up -d --build
```

`init_sql/*.sql` runs automatically on first boot **only when `postgres_data/` is empty**. After that the volume persists; re-running schema changes requires executing the SQL manually (above) or wiping the volume.

There is no test suite, linter, or build step. The `01_init_tables.sql` script `DROP`s every table at the top, so it is destructive by design.

### In-app restart mechanism

The admin UI can restart the backend without shell access: `POST /api/admin/system/execute {action:"restart_node"}` runs `touch web/public/.restart_trigger`. A host-side loop, `restart_watcher.sh`, polls for that file and runs `docker compose restart node-app`. This watcher must be running on the host for in-app restarts to work.

## Architecture

### Backend request flow

`server.js` is the single entry point and does two unrelated jobs:

1. **File logger (top of file):** monkey-patches `console.log`/`console.error` to also append timestamped lines to `combined.log`, with 3-file rotation at 100 MB (`.log` → `.log.1` → `.log.2`). The request-latency middleware and every route rely on this — plain `console.log` calls are the logging system. `GET /api/admin/logs` reads the tail of these files back for the admin UI.
2. **Express app:** HTTPS on port 443 using Let's Encrypt certs mounted from `/etc/letsencrypt`. The `pg` connection pool is created once and shared via `app.set('db_pool', pool)`; every router retrieves it with `req.app.get('db_pool')` rather than importing a module. Global middleware adds request-latency tracking (kept in a capped in-RAM array `global.appandor_latency_pool` for the metrics endpoints) and a `noindex` robots header.

Routers live in `routes/` and are mounted under `/api/*` (`auth`, `inventory`, `products`, `inbound`, `outbound`, `admin`, plus `metrics_system` and `metrics_db` under `/api/admin/metrics*`). Each router is self-contained: it pulls the pool from the app, and protected routes wrap handlers with `authenticateToken` from `routes/authMiddleware.js`.

### Auth & multi-tenancy (critical)

- Login (`POST /api/auth/login`) verifies a bcrypt hash and issues a JWT signed with `process.env.JWT_SECRET` containing `user_id`, `tenant_id`, `tenant_name`, `email`, `role`.
- `authMiddleware.js` verifies the `Authorization: Bearer <token>` header and attaches the decoded payload to `req.user`.
- **Tenant isolation is enforced only in application code, not the database.** Every table carries a `tenant_id` column, and every query must filter by `req.user.tenant_id` (see `routes/inventory.js` for the canonical pattern). There is no Postgres row-level security — forgetting the `WHERE tenant_id = $1` clause leaks data across tenants.
- Sessions use sliding refresh: `GET /api/auth/verify-session` re-issues a fresh token and returns it in the `X-Refresh-Token` response header; the frontend (`web/public/js/session.js`) reads that header on every response and swaps the stored token.

### Data model

Defined in `init_sql/01_init_tables.sql`. Core chain: `product_categories` → `product_master` (catalog, with a `JSONB attributes` column for flexible per-product fields) → `tracked_products` (physical purchased instances with price/status lifecycle `ORDERED`→`RECEIVED`) → placed into `boxes` (located in `locations`) via `box_contents`. `stock_transactions` is the append-only ledger. Inventory queries join box → box_contents → tracked_products → product_master and filter on `tracked_products.status`.

### Frontend

Plain HTML/CSS/JS served statically from `web/public` (no framework, no bundler). Each page HTML loads `js/config.js`, which fetches `manifest.json`, then serially loads the core chain in strict order — `lang.js` (i18n) → `session.js` (JWT/tenant guard) → `core.js` (page logic) → `layout.js` (header/menu injection) — and finally dispatches the `appandor_platform_ready` event that page-specific render scripts wait for. i18n strings live in `web/public/lang/{de,en,es}.json`. The token is kept in `localStorage` under `appandor_jwt_token`; theme under `appandor_theme`.

## Rules

- **Strictly ignore any files containing 'OLD' or 'copy' in their filename during any file scans or code modifications.**

## Conventions & gotchas

- **Duplicate/backup files are committed throughout the repo** with suffixes like ` copy`, `_OLD`, `x`, and `_` prefixes (e.g. `routes/inbound copy.js`, `web/public/js/inbound_OLD.js`, the `/x` and `/OLDverify-session` routes). These are inactive snapshots — only the plain-named file/route is wired up. Confirm which file a route actually `require`s in `server.js` before editing.
- **Secrets are currently hardcoded** in `server.js`, `docker-compose.yml`, and `init_sql` (JWT secret, DB password). Treat these as environment-provided (`process.env.JWT_SECRET`, `JWT_EXPIRES_IN`) where the code already reads them; the routes use `process.env.JWT_SECRET`, while `server.js` still has a literal fallback.
- **`admin.js` exposes raw SQL and OS command execution** (`POST /api/admin/execute-sql` runs arbitrary SQL on the shared pool; `system/execute` runs whitelisted shell commands). These are authenticated but not tenant-scoped — be deliberate when touching them.
- `combined.log` is tracked in git and grows during runtime; expect it to show as modified.
- The DB host inside containers is `appandor_postgres` (the compose service/container name), not `localhost`.
