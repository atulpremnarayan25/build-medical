# Security Penetration Test Report

**Generated:** 2026-11-01 13:07:26 UTC

# Executive Summary

# Executive Summary

A comprehensive white-box source-aware security assessment and dynamic penetration test of **MedStock ERP** was conducted against the target application (`http://host.docker.internal:5173`) and underlying codebase. MedStock ERP is a specialized wholesale pharmaceutical management system handling drug distribution, batch expiry, billing, double-entry accounting ledgers, and statutory Drug Inspector regulatory compliance (Schedule H/H1 registers).

**Overall Risk Posture:** **Elevated (High)**

While core infrastructure controls—such as parameterized database queries, strict admin-only user administration, secure backup argument handling, and registration gating—are properly designed, the assessment uncovered significant authorization weaknesses at the application service and synchronization layers.

### Key Findings
1. **Broken Function Level Authorization in Synchronization Push (`POST /api/sync/push`) — High (CVSS 7.1)**: Low-privilege counter billers can bypass all application-level business constraints and directly insert, modify, or delete database records across critical tables (products, batches, stock events, sales, purchases, and ledgers).
2. **Broken Function Level Authorization & IDOR in Sales Cancellation (`POST /api/sales/[id]/cancel`) — Medium (CVSS 6.5)**: Low-privilege staff can cancel confirmed sales invoices without administrative authorization or tenant checks, reversing batch inventory quantities and altering audit logs.
3. **Broken Function Level Authorization in Synchronization Pull (`GET /api/sync/pull`) — Medium (CVSS 6.5)**: Low-privilege staff can query replication outboxes to harvest historical and queued database transaction payloads across the entire store.
4. **Supply Chain Vulnerability in Transitive Dependency `devalue@5.9.1` (CVE-2026-92708) — Informational (CVSS 0.0 Contextual / 7.5 Advisory)**: Transitive dependency pulled by the framework has a known process memory disclosure advisory; direct exploitability was ruled out due to absence of direct imports and absence of raw Node Buffer serialization in application load handlers.

### Attack Chaining
A critical end-to-end exploit chain was demonstrated where a low-privilege counter biller combines `GET /api/sync/pull` to discover internal database row IDs, batch numbers, and store metadata, and then leverages `POST /api/sync/push` to push forged database updates. This allows an untrusted staff member to manipulate inventory stock levels, alter purchase prices, adjust customer receivables, or void financial liabilities without triggering standard validation logic or administrative review.

### Business Impact
- **Financial Integrity**: Unauthorized tampering with sales, batches, and prices undermines financial reporting and inventory accounting.
- **Regulatory Non-Compliance**: Modifying sales records and stock events compromises statutory Schedule H1 registers and tax reporting required by Drug Control authorities.
- **Operational Disruption**: Unauthorized cancellation of confirmed transactions leads to inventory discrepancies and stock misallocations.

### Overarching Remediation Theme
Implement strict, centralized, deny-by-default role-based access control (RBAC) across all API endpoints, ensuring non-administrative roles (e.g., `biller`) cannot access database replication primitives or transaction cancellation workflows.

# Methodology

# Methodology

The assessment followed the **OWASP Web Security Testing Guide (WSTG v4.2)**, the **Penetration Testing Execution Standard (PTES)**, and **NIST SP 800-115** standards for combined white-box code audit and dynamic application penetration testing.

### Engagement Scope
- **Web Application Target**: `http://host.docker.internal:5173`
- **Application Repository**: Full source code, configuration files, and database schemas
- **Evaluated Roles**:
  - Unauthenticated External User
  - Counter Biller (`role: biller`)
  - Store Owner / Administrator (`role: owner_admin`)

### Testing Activities Performed
1. **Static Application Security Testing (SAST) & AST Mapping**:
   - Automated rule-based static analysis using Semgrep (`p/default`, `p/golang`, `p/secrets`) across all 348 application source files.
   - AST-grep structural pattern matching to analyze query builders, route guards, and execution sinks.
2. **Secrets & Credential Auditing**:
   - Repository-wide secret detection via Gitleaks across git history and Trufflehog filesystem sweeps.
3. **Software Composition Analysis (SCA)**:
   - Dependency vulnerability mapping via Trivy across `package-lock.json` and verification of reachability for published CVEs.
4. **Authentication & Session Analysis**:
   - Session lifecycle review (`hooks.server.ts`, cookie flags, expiration, and multi-session invalidation).
   - Rate-limiting verification on authentication routes and registration bootstrapping gating.
5. **Role Boundary & Broken Function Level Authorization (BFLA) Testing**:
   - Systematic role differential testing comparing permissions between `biller` and `owner_admin` across all `/api/*` endpoints.
   - Testing for privilege escalation via user modification, backup download, and store setting mutation.
6. **Object-Level Authorization & IDOR Testing**:
   - Transaction cancellation, ledger access, customer records, and supplier management across identifiers.
7. **Injection & Subprocess Analysis**:
   - Audited PostgreSQL query construction and Drizzle ORM parameterization across reporting and search filters.
   - Inspected database backup creation and restore routines (`pg_dump` and `psql` execution via `child_process.spawn`).
8. **Synchronization Engine Auditing**:
   - Analyzed delta replication protocols and outbox ingestion handlers (`/api/sync/*`).

# Technical Analysis

# Technical Analysis

## Consolidated Findings Overview

| Finding ID | Vulnerability Title | Severity | CVSS v3.1 | CWE | Target Endpoint |
|---|---|---|---|---|---|
| **vuln-0002** | Broken Function Level Authorization in Database Synchronization Push | **High** | 7.1 | CWE-862 | `POST /api/sync/push` |
| **vuln-0001** | Broken Function Level Authorization & IDOR in Sales Invoice Cancellation | **Medium** | 6.5 | CWE-862 | `POST /api/sales/[id]/cancel` |
| **vuln-0003** | Broken Function Level Authorization in Database Synchronization Pull | **Medium** | 6.5 | CWE-862 | `GET /api/sync/pull` |
| **vuln-0004** | Process Memory Disclosure in Transitive Dependency devalue (CVE-2026-92708) | **Info** | 0.0 (Adj) / 7.5 (Adv) | CWE-200 | `package-lock.json` |

---

## Detailed Vulnerability Analysis

### 1. Broken Function Level Authorization in `/api/sync/push` (vuln-0002)
- **Mechanism**: The synchronization push endpoint (`src/routes/api/sync/push/+server.ts`) was implemented to support store-server-to-cloud replication. While `hooks.server.ts` ensures that callers hold an active user session, the route handler performs no role-based authorization:
  ```typescript
  export const POST: RequestHandler = async ({ request, locals }) => {
      if (!locals.user) {
          return json({ error: 'Unauthorized' }, { status: 401 });
      }
      const body = await request.json();
      const items: schema.SyncOutboxEntry[] = body.items || [];
  ```
- **Exploitation**: An authenticated counter biller can craft custom `SyncOutboxEntry` objects targeting any table in the `tableMap` (`products`, `batches`, `batch_stock_events`, `suppliers`, `customers`, `purchases`, `sales`, `payments`, etc.) with arbitrary operations (`insert`, `update`, `delete`).
- **Validation**: A dynamic PoC authenticated as `biller` successfully injected a new product record directly into the database via `POST /api/sync/push`. The injected record was subsequently confirmed via `GET /api/products/[id]`.

### 2. Broken Function Level Authorization & IDOR in `/api/sales/[id]/cancel` (vuln-0001)
- **Mechanism**: In `src/routes/api/sales/[id]/cancel/+server.ts`, the cancellation route only validates that `locals.user` is present:
  ```typescript
  export async function POST({ params, locals }) {
      if (!locals.user) {
          return new Response('Unauthorized', { status: 401 });
      }
      const sale = await salesService.cancelSale(params.id);
      return json(sale);
  }
  ```
  In contrast, purchase cancellation (`src/routes/api/purchases/[id]/cancel/+server.ts`) enforces `if (locals.user.role !== 'owner_admin') return 403;`. Furthermore, neither the route handler nor `salesService.cancelSale` validates that `sale.storeId === locals.user.storeId`.
- **Exploitation**: Any biller can submit a `POST` request to cancel any confirmed sales invoice by ID. The cancellation updates the invoice status to `'cancelled'`, restores batch inventory quantities in `batchesTable`, logs adjustment stock events in `batchStockEventsTable`, and modifies the statutory audit log.
- **Validation**: A dynamic PoC authenticated as `biller` submitted a cancellation request for a confirmed invoice and received HTTP 200 OK with `status: "cancelled"`, verifying immediate stock restoration without administrator approval.

### 3. Broken Function Level Authorization in `/api/sync/pull` (vuln-0003)
- **Mechanism**: The synchronization pull endpoint (`src/routes/api/sync/pull/+server.ts`) queries `syncOutboxTable` based on caller-supplied query parameters:
  ```typescript
  export const GET: RequestHandler = async ({ url }) => {
      const since = url.searchParams.get('since');
      const callerNode = url.searchParams.get('clientId') || 'store_server';
      let conditions = eq(syncOutboxTable.targetNode, callerNode);
  ```
- **Exploitation**: Any authenticated user can pass `?clientId=cloud` to pull all replication outbox entries queued for synchronization. These records contain raw serialized JSON payloads representing customer details, supplier invoices, sales transactions, and internal batch events.
- **Validation**: A dynamic PoC authenticated as `biller` queried `GET /api/sync/pull?clientId=cloud` and successfully dumped all queued outbox records.

### 4. Transitive Dependency CVE in `devalue@5.9.1` (vuln-0004)
- **Mechanism**: `devalue` versions 5.1.0 through 5.9.2 serialize typed arrays by emitting their entire backing `ArrayBuffer`. When serializing pooled Node `Buffer` objects during SSR, up to 64 KB of adjacent process memory can be disclosed in HTML responses.
- **Contextual Analysis**: Application code in `src/` does not directly import `devalue` (`reachability: not_imported`). Furthermore, application page `load()` functions do not construct or return pooled Node `Buffer` instances. The contextual severity is therefore rated Informational.

---

## Attack Chaining Scenario

An authenticated adversary holding only `biller` counter credentials can execute a multi-stage compromise:
1. **Reconnaissance & Metadata Harvesting**: The attacker invokes `GET /api/sync/pull?clientId=cloud` to dump recent transaction outbox records, revealing master UUIDs for products, batches, customer accounts, and store identifiers.
2. **Unauthorized Transaction Cancellation**: The attacker calls `POST /api/sales/[id]/cancel` on high-value sales invoices to void transaction totals and distort financial balances.
3. **Arbitrary Master Data Tampering**: Using `POST /api/sync/push`, the attacker injects forged `batch_stock_events` or updates `products` and `batches` tables directly to artificially inflate inventory quantities or alter wholesale selling rates, bypassing counter controls.

---

## Assessed Surfaces Confirmed Safe
The following surfaces were systematically assessed and verified to contain robust security controls:
- **Backup Download & Execution**: Parameter sanitization with `path.basename` and allowlist verification prevents path traversal. `pg_dump` and `psql` are spawned using argument arrays without shell interpolation.
- **Reporting & Database Queries**: All report endpoints (`/api/reports/*`) utilize Drizzle ORM parameterized query builders (`eq`, `gte`, `lte`, `ilike`), ruling out SQL injection.
- **User Management**: `/api/users` and `/api/users/[id]` strictly enforce `owner_admin` checks on GET, POST, and PATCH operations.
- **Registration**: `/register` restricts account creation to the initial bootstrap administrator via an `existingUsers.length > 0` guard.

# Recommendations

# Recommendations

Remediation efforts should follow a prioritized, defense-in-depth approach to secure role boundaries, transaction integrity, and software dependencies.

## Immediate (Within 24–48 Hours)

1. **Restrict Database Synchronization Push (`POST /api/sync/push`)**
   - Add an explicit role check in `src/routes/api/sync/push/+server.ts`:
     ```typescript
     if (!locals.user || locals.user.role !== 'owner_admin') {
         return json({ error: 'Forbidden: Admin role required for database sync operations' }, { status: 403 });
     }
     ```
   - Alternatively, decouple sync operations from user session cookies by requiring a dedicated, cryptographically strong machine-to-machine synchronization token.

2. **Enforce Role Authorization on Sales Cancellation (`POST /api/sales/[id]/cancel`)**
   - Mirror the authorization check already implemented in `src/routes/api/purchases/[id]/cancel/+server.ts`:
     ```typescript
     if (locals.user.role !== 'owner_admin') {
         return new Response(JSON.stringify({ error: 'Forbidden: Admin role required' }), {
             status: 403,
             headers: { 'Content-Type': 'application/json' }
         });
     }
     ```
   - Ensure `salesService.cancelSale` validates that the invoice belongs to `locals.user.storeId` before updating status or restoring batch stock.

3. **Restrict Replication Outbox Pull (`GET /api/sync/pull`)**
   - Add an authorization check in `src/routes/api/sync/pull/+server.ts` ensuring only `owner_admin` or authenticated replication nodes can read queued database outbox records:
     ```typescript
     if (!locals.user || locals.user.role !== 'owner_admin') {
         return json({ error: 'Forbidden: Admin role required' }, { status: 403 });
     }
     ```

## Short-Term (Within 1–2 Weeks)

4. **Centralize API Authorization Middleware**
   - Introduce a centralized authorization helper or middleware pattern in SvelteKit `hooks.server.ts` that enforces route-level role requirements (e.g. mapping `/api/settings/*`, `/api/sync/*`, `/api/users/*`, and `*/cancel` to `owner_admin` by default).
   - Adopt a deny-by-default posture for all non-read operations.

5. **Multi-Tenant Ownership Assertions**
   - Review all data service methods in `src/lib/services/*` to ensure that every lookup and modification explicitly filters by `storeId` in addition to primary keys, preventing cross-tenant access in multi-store deployments.

6. **Update Transitive Dependency `devalue`**
   - Upgrade `devalue` to version `5.9.3` or later (or update `@sveltejs/kit` to the latest patch release) to remediate CVE-2026-92708.

## Medium-Term (Within 30 Days)

7. **Audit Logging for Critical Business Actions**
   - Ensure all transaction cancellations, manual stock adjustments, and administrative overrides generate tamper-evident audit records in `auditLogTable`.
   - Prevent deletion or modification of audit log records even by administrative users.

## Retest & Validation Guidance
- Re-run the automated proof-of-concept scripts provided in findings `vuln-0001`, `vuln-0002`, and `vuln-0003` using the low-privilege `biller` account to confirm HTTP 403 Forbidden responses.
- Verify that administrative users (`owner_admin`) retain full functionality for legitimate store operations, cancellations, and node synchronization.

