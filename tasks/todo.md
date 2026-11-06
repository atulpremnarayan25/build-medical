# Task List: Oracle Cloud Free Tier Deployment for MedStock ERP

## Phase 1: Codebase Preparation for Node/Linux Production Build

### Task 1: Replace `@sveltejs/adapter-auto` with `@sveltejs/adapter-node`
**Description:** Install `@sveltejs/adapter-node` as a dev dependency, update `vite.config.ts` to use it instead of `@sveltejs/adapter-auto`, and ensure the build script targets a standalone Node server.

**Acceptance criteria:**
- [x] `@sveltejs/adapter-node` is listed in `package.json` devDependencies.
- [x] `vite.config.ts` imports and invokes `@sveltejs/adapter-node`.
- [x] `npm run build` generates a standalone Node build in the `build/` directory containing `build/index.js`.

**Verification:**
- [x] Build succeeds: `npm run build`
- [x] Manual check: verify `build/index.js` exists.

**Dependencies:** None
**Files likely touched:**
- `package.json`
- `vite.config.ts`
**Estimated scope:** Small (2 files)

---

### Task 2: Validate production build output and runtime entrypoint
**Description:** Verify that the generated `build/index.js` boots cleanly in a production environment with valid database environment variables.

**Acceptance criteria:**
- [x] App launches with `node build/index.js` when provided `PORT` and `DATABASE_URL`.
- [x] Unit tests continue to pass with vitest.

**Verification:**
- [x] Tests pass: `npm run test`
- [x] Manual check: Boot server briefly with `PORT=3050 node build/index.js` and verify endpoint response.

**Dependencies:** Task 1
**Files likely touched:**
- `vite.config.ts`
- `package.json`
**Estimated scope:** Small (1-2 files)

---

### Checkpoint: Codebase Build Ready
- [x] `npm run build` succeeds cleanly.
- [x] All unit tests pass (`npm run test`).
- [x] Review with human before proceeding to containerization.

---

## Phase 2: Production Containerization & Orchestration Assets

### Task 3: Create multi-stage production `Dockerfile`
**Description:** Create a production Dockerfile using Node 22 (Debian slim / Alpine) that builds the SvelteKit app, installs `postgresql-client` (required for `pg_dump` backups), and runs the server non-root.

**Acceptance criteria:**
- [x] Dockerfile contains a builder stage and a slim production runner stage.
- [x] `postgresql-client` is installed in the runner image so `pg_dump` is available.
- [x] Default port `3000` is exposed.

**Verification:**
- [x] Build succeeds: Dockerfile created with multi-stage build and healthcheck.
- [x] Runner stage configures `postgresql-client` and SvelteKit standalone runtime.

**Dependencies:** Task 1, Task 2
**Files likely touched:**
- `Dockerfile`
- `.dockerignore`
**Estimated scope:** Small (2 files)

---

### Task 4: Create `docker-compose.prod.yml` and `Caddyfile`
**Description:** Create a production Docker Compose file orchestrating Caddy (reverse proxy + automatic Let's Encrypt TLS), MedStock ERP App, and PostgreSQL 15 with persistent storage volumes.

**Acceptance criteria:**
- [x] Caddy service listens on ports `80` and `443` and proxies to `app:3000`.
- [x] App service connects to `postgres:5432` on an internal Docker network.
- [x] PostgreSQL data is mapped to a persistent named volume `postgres_data`.
- [x] Backup volume `./backups` is mounted into the app service for persistent storage.

**Verification:**
- [x] Syntax check: `docker compose -f docker-compose.prod.yml config` validates without errors.

**Dependencies:** Task 3
**Files likely touched:**
- `docker-compose.prod.yml`
- `Caddyfile`
**Estimated scope:** Small (2 files)

---

### Task 5: Create `.env.production.example` and deployment configuration documentation
**Description:** Create a sanitized production environment template file and quickstart deployment notes for OCI.

**Acceptance criteria:**
- [x] `.env.production.example` documents all required production environment variables: `NODE_ENV`, `PORT`, `ORIGIN`, `DATABASE_URL`, `DB_POOL_MAX`.
- [x] Clear instructions for setting `ORIGIN` to match the public domain to prevent SvelteKit CSRF errors.

**Verification:**
- [x] Manual check: Inspect `.env.production.example` against `src/lib/server/db/index.ts` and `src/hooks.server.ts`.

**Dependencies:** Task 4
**Files likely touched:**
- `.env.production.example`
- `DEPLOYMENT-OCI.md`
**Estimated scope:** Small (2 files)

---

### Checkpoint: Container Orchestration Ready
- [x] Dockerfile and Docker Compose configs pass validation.
- [x] Environment variables and Caddy reverse proxy templates are prepared.
- [ ] Review with human before executing cloud console steps.

---

## Phase 3: Oracle Cloud Infrastructure (OCI) Cloud Console Setup

### Task 6: Configure OCI Virtual Cloud Network (VCN) Ingress Rules
**Description:** In the Oracle Cloud web console, update the VCN Default Security List to allow incoming traffic on ports 80 (HTTP) and 443 (HTTPS).

**Acceptance criteria:**
- [ ] Ingress rule added: Source `0.0.0.0/0`, Protocol `TCP`, Destination Port `80`.
- [ ] Ingress rule added: Source `0.0.0.0/0`, Protocol `TCP`, Destination Port `443`.
- [ ] Database port `5432` remains private (no public ingress rule).

**Verification:**
- [ ] Manual check: View Security List rules in OCI Console.

**Dependencies:** None
**Files likely touched:**
- None (OCI Cloud Console)
**Estimated scope:** Small (Console configuration)

---

### Task 7: Provision OCI Ampere A1 VM Instance & Reserve Public IP
**Description:** Create an Always Free Ampere A1 compute instance in OCI with Ubuntu OS, allocate a Reserved Public IPv4 address, and attach it to the VNIC.

**Acceptance criteria:**
- [ ] VM running on shape `VM.Standard.A1.Flex` (e.g. 2–4 OCPUs, 12–24 GB RAM, 50–100 GB Boot Volume).
- [ ] Static Reserved Public IP attached and active.
- [ ] SSH private key configured for user `ubuntu`.

**Verification:**
- [ ] SSH test: `ssh -i <private_key> ubuntu@<RESERVED_PUBLIC_IP>` connects successfully.

**Dependencies:** Task 6
**Files likely touched:**
- None (OCI Cloud Console)
**Estimated scope:** Small (Console configuration)

---

### Task 8: Configure DNS A-Record
**Description:** Point your domain or subdomain (e.g., `erp.yourclinic.com` or free DDNS hostname) to the OCI Reserved Public IP.

**Acceptance criteria:**
- [ ] DNS A-Record created pointing to OCI Public IP.
- [ ] `dig` or `nslookup` resolves the hostname to the OCI Public IP.

**Verification:**
- [ ] Command check: `nslookup erp.yourdomain.com` returns the OCI IP.

**Dependencies:** Task 7
**Files likely touched:**
- None (DNS Registrar / Cloudflare / DuckDNS)
**Estimated scope:** Small (DNS record)

---

### Checkpoint: Cloud Infrastructure & Connectivity Ready
- [ ] SSH access to OCI VM verified.
- [ ] Domain resolves to OCI Public IP.
- [ ] OCI VCN security list allows ports 80 and 443.

---

## Phase 4: Server OS Hardening & Host Configuration

### Task 9: Unblock OS-level firewall (`iptables` / `netfilter-persistent`)
**Description:** OCI Ubuntu instances drop ports 80 and 443 by default in `iptables`. Configure persistent ACCEPT rules for HTTP and HTTPS.

**Acceptance criteria:**
- [ ] `iptables` rules inserted allowing incoming TCP traffic on ports 80 and 443.
- [ ] `iptables-persistent` saves the rules so they survive machine reboots.

**Verification:**
- [ ] Command check: `sudo iptables -L INPUT -n -v` shows ACCEPT rules for ports 80 and 443.

**Dependencies:** Task 7
**Files likely touched:**
- None (Server shell)
**Estimated scope:** Small (Host CLI commands)

---

### Task 10: Install Docker Engine and Docker Compose Plugin on VM
**Description:** Install the latest official Docker CE engine and Docker Compose plugin on Ubuntu ARM64.

**Acceptance criteria:**
- [ ] Docker engine running (`docker --version`).
- [ ] Docker compose plugin functional (`docker compose version`).
- [ ] User `ubuntu` added to the `docker` group.

**Verification:**
- [ ] Command check: `docker run --rm hello-world` runs successfully.

**Dependencies:** Task 7, Task 9
**Files likely touched:**
- None (Server shell)
**Estimated scope:** Small (Package installation)

---

### Task 11: Deploy application files to `/opt/medstock`
**Description:** Clone the repository or copy project deployment files to `/opt/medstock` on the OCI instance and create the production `.env` file.

**Acceptance criteria:**
- [ ] Codebase deployed to `/opt/medstock`.
- [ ] `.env` created with strong database password and correct `ORIGIN=https://<domain>`.
- [ ] `Caddyfile` updated with your actual domain name.

**Verification:**
- [ ] Manual check: `ls -la /opt/medstock` contains Dockerfile, docker-compose.prod.yml, and .env.

**Dependencies:** Task 4, Task 5, Task 10
**Files likely touched:**
- `/opt/medstock/.env`
- `/opt/medstock/Caddyfile`
**Estimated scope:** Small

---

### Checkpoint: Host Environment Ready
- [ ] Docker daemon active and operational.
- [ ] Port 80 and 443 open in host firewall.
- [ ] Deployment directory and `.env` configured.

---

## Phase 5: Production Launch, Schema Migration & First Run

### Task 12: Boot production containers
**Description:** Start the multi-container stack in detached mode using Docker Compose.

**Acceptance criteria:**
- [ ] Containers `medstock-app`, `medstock-db`, and `medstock-caddy` are running healthy.
- [ ] Caddy automatically acquires Let's Encrypt SSL certificate for the domain.

**Verification:**
- [ ] Command check: `docker compose -f docker-compose.prod.yml ps` shows all services running (`Up`).
- [ ] Log check: `docker compose -f docker-compose.prod.yml logs caddy` shows certificate obtained successfully.

**Dependencies:** Task 11
**Files likely touched:**
- None (Runtime execution)
**Estimated scope:** Small

---

### Task 13: Apply database schema migrations
**Description:** Run Drizzle schema sync inside the running app container to initialize all tables, sequences, and indexes.

**Acceptance criteria:**
- [ ] All PostgreSQL tables created matching `schema.ts`.
- [ ] `npx tsx scripts/db-check-and-seed.ts` confirms database connectivity and reports store status.

**Verification:**
- [ ] Command check: `docker compose -f docker-compose.prod.yml exec app npx tsx scripts/db-check-and-seed.ts` prints success.

**Dependencies:** Task 12
**Files likely touched:**
- None (Database schema execution)
**Estimated scope:** Small

---

### Task 14: Register initial Store Owner (`owner_admin`) and verify HTTPS flow
**Description:** Complete first-run owner registration via the web browser over HTTPS, confirming secure session cookies and dashboard navigation.

**Acceptance criteria:**
- [ ] Visiting `https://<domain>/register` loads with HTTPS lock icon.
- [ ] Registering first user creates `owner_admin` in `usersTable`.
- [ ] Session cookie `sessionId` is set with `Secure`, `HttpOnly`, and `SameSite=lax`.
- [ ] Redirection to `/dashboard` succeeds.

**Verification:**
- [ ] Browser check: Log in and inspect Application → Cookies in browser DevTools.

**Dependencies:** Task 13
**Files likely touched:**
- None (End-to-end browser verification)
**Estimated scope:** Small

---

### Checkpoint: System Live & Functioning
- [ ] App accessible over HTTPS with valid certificate.
- [ ] Owner account created and operational.
- [ ] Cashier billing / POS interface functional.

---

## Phase 6: Automated Backups, Monitoring & Operational Maintenance

### Task 15: Configure automated daily database backup cron job
**Description:** Set up a host crontab task that triggers `npm run backup` inside the app container every night at 02:00 AM.

**Acceptance criteria:**
- [ ] Daily cron job configured in host crontab.
- [ ] Backup creates a valid `.sql.gz` snapshot in `./backups/` with rolling 30-day retention.

**Verification:**
- [ ] Test run: `docker compose -f docker-compose.prod.yml exec -T app npm run backup` succeeds and outputs backup file info.

**Dependencies:** Task 13
**Files likely touched:**
- Host crontab (`crontab -e`)
**Estimated scope:** Small

---

### Task 16: Configure off-site backup storage (OCI Object Storage)
**Description:** Set up OCI Object Storage Always Free bucket (10 GB free) and sync `./backups` off the instance to guarantee disaster recovery.

**Acceptance criteria:**
- [ ] OCI Object Storage bucket created (e.g. `medstock-db-backups`).
- [ ] Script or cron job syncs `./backups/*.sql.gz` to bucket.

**Verification:**
- [ ] Command check: List objects in bucket via OCI CLI or console to verify presence of snapshot.

**Dependencies:** Task 15
**Files likely touched:**
- `scripts/sync-backups-oci.sh`
**Estimated scope:** Small (1 file)

---

### Task 17: Configure Docker log rotation
**Description:** Configure Docker daemon logging driver to limit container log sizes to prevent VM disk exhaustion.

**Acceptance criteria:**
- [ ] `/etc/docker/daemon.json` contains `log-driver: "json-file"` with `max-size: "20m"` and `max-file: "5"`.
- [ ] Docker daemon reloaded.

**Verification:**
- [ ] Command check: `docker info | grep "Logging Driver"` confirms configuration.

**Dependencies:** Task 10
**Files likely touched:**
- `/etc/docker/daemon.json`
**Estimated scope:** Small (1 file)

---

### Checkpoint: Production Complete & Resilient
- [ ] End-to-end backup snapshot runs cleanly.
- [ ] Containers automatically restart on VM reboot (`restart: unless-stopped`).
- [ ] Ready for operational counter billing use.
