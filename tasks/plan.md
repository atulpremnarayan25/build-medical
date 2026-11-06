# Implementation Plan: Deploying MedStock ERP to Oracle Cloud Free Tier

## Overview
This plan details the end-to-end engineering and infrastructure workflow required to deploy MedStock ERP (SvelteKit 2, Svelte 5, PostgreSQL 15, Drizzle ORM) onto an Oracle Cloud Infrastructure (OCI) Always Free Tier compute instance (Ampere A1 ARM64, up to 4 OCPUs / 24 GB RAM). It transitions the codebase from local dev mode (`adapter-auto`) to a production standalone Node.js container behind a Caddy reverse proxy with automated Let's Encrypt SSL, persistent storage, and automated nightly database backups.

## Architecture Decisions
1. **Compute Shape: OCI Ampere A1 (ARM64) with Ubuntu 24.04/22.04 LTS**:
   - Offers up to 4 OCPUs, 24 GB RAM, and 200 GB block storage at $0/mo.
   - Provides zero cold starts and eliminates the limitations of serverless platforms (Render/Vercel/Supabase).
2. **Adapter: `@sveltejs/adapter-node`**:
   - Replaces `@sveltejs/adapter-auto` to compile a standalone, high-performance Node.js production server (`build/index.js`).
3. **Containerized Stack (`docker-compose.prod.yml`)**:
   - **Caddy**: Handles automated TLS/HTTPS certificate provisioning, HTTP-to-HTTPS redirects, and reverse proxying to SvelteKit.
   - **App Container**: Runs the compiled SvelteKit Node.js server with `postgresql-client` installed (enabling `pg_dump` for `scripts/backup.ts`).
   - **PostgreSQL 15**: Runs on internal Docker network, data mounted to a persistent Docker named volume backed by OCI block storage.
4. **Strict HTTPS & Cookie Policy**:
   - Session cookies require `secure: !dev`. Caddy provides public TLS termination, satisfying the browser secure context requirement for cookies and camera/barcode scanning.
5. **OCI Network & Host Firewall Strategy**:
   - Explicitly update both OCI VCN Ingress Rules (Ports 80 & 443) AND the OS-level `iptables` rules to avoid dropped external connections.

---

## Task List

### Phase 1: Codebase Preparation for Node/Linux Production Build
- [ ] **Task 1: Replace `@sveltejs/adapter-auto` with `@sveltejs/adapter-node`**
  - Install `@sveltejs/adapter-node` in `package.json`.
  - Update `vite.config.ts` adapter definition.
- [ ] **Task 2: Validate production build output and runtime entrypoint**
  - Execute `npm run build`.
  - Verify `build/index.js` outputs cleanly and starts with `PORT=3000 node build/index.js`.

### Checkpoint: Codebase Build Ready
- [ ] Clean production build generated.
- [ ] Unit tests pass (`npm run test`).

---

### Phase 2: Production Containerization & Orchestration Assets
- [ ] **Task 3: Create multi-stage production `Dockerfile`**
  - Base on Node 22 Alpine or Debian slim with `postgresql-client` installed.
  - Multi-stage build: builder stage compiles assets, runner stage holds production dependencies and output.
- [ ] **Task 4: Create `docker-compose.prod.yml` and `Caddyfile`**
  - Orchestrate Caddy (ports 80 & 443), App (internal 3000), and Postgres 15 (internal 5432).
  - Configure persistent named volumes for postgres data and backup archives.
- [ ] **Task 5: Create `.env.production.example` and deployment configuration docs**
  - Document `DATABASE_URL`, `ORIGIN`, `PORT`, `NODE_ENV`, and `DB_POOL_MAX`.

### Checkpoint: Container Orchestration Ready
- [ ] `docker compose -f docker-compose.prod.yml config` passes validation without syntax errors.

---

### Phase 3: Oracle Cloud Infrastructure (OCI) Cloud Console Setup
- [ ] **Task 6: Configure OCI Virtual Cloud Network (VCN) Ingress Rules**
  - Add Ingress Rules for Port 80 (HTTP) and Port 443 (HTTPS) from CIDR `0.0.0.0/0`.
- [ ] **Task 7: Provision OCI Ampere A1 VM Instance & Reserve Public IP**
  - Create Ampere A1 VM (2–4 OCPUs, 12–24 GB RAM, 50–100 GB Boot Volume, Ubuntu).
  - Allocate and attach a Reserved Public IPv4 address.
- [ ] **Task 8: Configure DNS A-Record**
  - Point domain/subdomain (e.g. `erp.yourdomain.com`) to the OCI Reserved Public IPv4.

### Checkpoint: Cloud Infrastructure & Connectivity Ready
- [ ] SSH connection established to OCI VM via private key.
- [ ] Domain resolves to OCI Public IP.

---

### Phase 4: Server OS Hardening & Host Configuration
- [ ] **Task 9: Unblock OS-level firewall (`iptables` / `netfilter-persistent`)**
  - Open ports 80 & 443 in Ubuntu `iptables` and save via `iptables-persistent`.
- [ ] **Task 10: Install Docker Engine and Docker Compose Plugin on VM**
  - Set up official Docker apt repository and install `docker-ce` + `docker-compose-plugin`.
- [ ] **Task 11: Deploy application files to `/opt/medstock`**
  - Clone git repo or transfer `docker-compose.prod.yml`, `Dockerfile`, `Caddyfile`, and configure `.env`.

### Checkpoint: Host Environment Ready
- [ ] Docker engine active and non-root user or sudo functional.
- [ ] Ports 80 and 443 accepting incoming connections.

---

### Phase 5: Production Launch, Schema Migration & First Run
- [ ] **Task 12: Boot production containers**
  - Run `docker compose -f docker-compose.prod.yml up -d --build`.
- [ ] **Task 13: Apply database schema migrations**
  - Execute `docker compose -f docker-compose.prod.yml exec app npx drizzle-kit push`.
  - Run `docker compose -f docker-compose.prod.yml exec app npx tsx scripts/db-check-and-seed.ts`.
- [ ] **Task 14: Register initial Store Owner (`owner_admin`) and verify HTTPS flow**
  - Navigate to `https://erp.yourdomain.com/register`.
  - Complete first-time setup and verify secure session cookie creation and login.

### Checkpoint: System Live & Functioning
- [ ] HTTPS lock icon active and Caddy certificate valid.
- [ ] Owner account created and dashboard accessible.

---

### Phase 6: Automated Backups, Monitoring & Operational Maintenance
- [ ] **Task 15: Configure automated daily database backup cron job**
  - Schedule `docker compose exec -T app npm run backup` daily at 02:00 UTC via host crontab.
- [ ] **Task 16: Configure off-site backup storage (OCI Object Storage)**
  - Set up OCI CLI or `rclone` to mirror `./backups` to an Always Free OCI Object Storage bucket.
- [ ] **Task 17: Configure Docker log rotation**
  - Set up `max-size: "20m"` and `max-file: "5"` in `/etc/docker/daemon.json` to prevent disk exhaustion.

### Checkpoint: Production Complete & Resilient
- [ ] Test backup created successfully in `./backups/`.
- [ ] System automatically recovers on VM restart.

---

## Risks and Mitigations

| Risk | Impact | Mitigation |
| :--- | :--- | :--- |
| **OCI ARM64 Capacity Scarcity** | Medium | Some OCI regions occasionally show "Out of host capacity" for A1 instances. *Mitigation:* Create the instance in an availability domain with capacity, use an OCI CLI auto-retry script, or fall back to an AMD instance / $4 Hetzner VPS. |
| **Silent Firewall Dropping (OS `iptables`)** | High | Connections to ports 80/443 time out despite VCN rules. *Mitigation:* Explicitly add ACCEPT rules to `iptables` and save with `netfilter-persistent`. |
| **SvelteKit CSRF Rejection on Forms** | High | POST requests fail with `403 Cross-site POST form submissions are forbidden`. *Mitigation:* Explicitly configure `ORIGIN=https://<your-domain>` in `.env`. |
| **Session Cookie Dropped on Plain HTTP** | High | User cannot log in if accessed without TLS. *Mitigation:* Caddy automatically redirects all HTTP traffic to HTTPS. |
| **OCI Idle Instance Reclamation** | Low | OCI sometimes flags compute instances using <20% CPU/RAM for 7 days. *Mitigation:* MedStock ERP daily use keeps it active; a simple lightweight heartbeat cron or metric keeps utilization recorded. |
