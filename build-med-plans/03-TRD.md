# Technical Requirements Document (TRD)

**Product:** MedERP | **Version:** 1.0 (Draft) | **Date:** 24 Aug 2026

This is the architecture and engineering-decisions document. Where a decision wasn't explicitly locked in beforehand, it's marked **[ASSUMPTION]** with rationale — treat those as the proposed design, open to revision, not settled history.

---

## 1. Architecture Overview

```
                         ┌─────────────────────────┐
                         │        CLOUD             │
                         │  ┌───────────────────┐   │
                         │  │  Cloud API (Node)  │  │
                         │  └─────────┬─────────┘   │
                         │  ┌─────────▼─────────┐   │
                         │  │  Cloud PostgreSQL  │  │
                         │  │   (replica + WORM  │  │
                         │  │      backup)       │  │
                         │  └─────────▲─────────┘   │
                         └────────────┼─────────────┘
                                      │ HTTPS, bidirectional
                                      │ outbox sync
                    Internet ─────────┼───────── Internet
                                      │
                         ┌────────────▼─────────────┐
                         │      STORE SERVER          │
                         │   (always-on local device)  │
                         │  ┌──────────────────────┐   │
                         │  │  Local API (Node/TS)  │   │
                         │  └──────────┬───────────┘   │
                         │  ┌──────────▼───────────┐   │
                         │  │  Local PostgreSQL      │   │
                         │  │  (source of truth for   │   │
                         │  │   day-to-day ops)       │   │
                         │  └──────────────────────┘   │
                         └────────────┬─────────────┘
                                      │ LAN, HTTP(S)
                     ┌────────────────┼────────────────┐
                     │                │                │
              ┌──────▼─────┐   ┌──────▼─────┐   ┌──────▼─────┐
              │ Biller PC 1 │   │ Biller PC 2 │   │ Mobile/Tablet│
              │ (Tauri app) │   │ (Tauri app) │   │  (LAN or 4G) │
              └────────────┘   └────────────┘   └────────────┘
```

**Reading this diagram:** the **Store Server** is the real backbone — every LAN device talks directly to it and billing works with zero internet dependency (NFR-005). The **cloud node** exists for (a) backup/durability and (b) letting a device that's off the store's LAN (e.g. owner checking from home, or a device on mobile data) still read/write, with changes flowing back to the Store Server once reachable.

## 2. Tech Stack & Rationale (confirmed decisions)

| Layer           | Choice                                                                                                                                                                                                                                      | Why                                                                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| UI framework    | SvelteKit                                                                                                                                                                                                                                   | Compiles to small, fast bundles — no virtual-DOM runtime overhead, well suited to low-end hardware; already the frontend built to date                                                          |
| Desktop shell   | Tauri                                                                                                                                                                                                                                       | Rust-based, uses the OS's native webview instead of bundling Chromium (unlike Electron) — dramatically lower RAM/disk footprint, directly serves NFR-002                                        |
| Backend runtime | Node.js + TypeScript                                                                                                                                                                                                                        | One language across frontend/backend reduces context-switching for an AI-assisted, learning-as-you-go build; large ecosystem for Postgres, auth, PDF/print generation                           |
| Database        | PostgreSQL (local **and** cloud)                                                                                                                                                                                                            | Strong consistency and transactional guarantees needed for stock/invoice correctness (NFR-006, NFR-008, NFR-009); same engine locally and in the cloud simplifies replication logic and tooling |
| Mobile          | Tauri mobile (Android first) or a thin client hitting the same API — **[ASSUMPTION]** decide at Phase 6 (Implementation Plan) based on Tauri mobile's maturity at build time; API contract (`07-API-Spec.md`) is client-agnostic either way |

## 3. Deployment Topology — the Store Server model

**[ASSUMPTION — core architectural decision]** One designated, always-on local machine (could be a low-end PC, mini-PC, or even the main billing counter machine) runs:

- The Node.js API
- The local PostgreSQL instance (authoritative source of truth for the store)

All other billing devices (desktop or mobile, on the LAN) talk to the Store Server's API directly over the local network — **not** to the cloud — for every normal billing operation. This is why NFR-005 (zero internet dependency for Must-have features) is achievable: the LAN doesn't care if the WAN is up.

**Why not "every device has its own local DB and they all sync to each other" (full multi-master)?**
Rejected because: (a) it needs N-way conflict resolution instead of 2-way (Store Server ↔ Cloud), which is a much harder correctness problem — especially for stock quantities and invoice numbers where a bug means real financial/inventory errors; (b) it doesn't match the stated constraint of a "local primary device" — the Store Server model _is_ that primary device; (c) it's simpler to build correctly with limited team experience, per PRD §7.

**Why not "cloud-only, local devices are thin clients with light caching"?**
Rejected because NFR-005 explicitly requires full offline operation at the store, and store connectivity in this context (small-town Uttar Pradesh) can't be assumed reliable.

**Remote/mobile-off-LAN case:** when a device can't reach the Store Server (e.g., owner checking from home, or a rare fully-remote biller), it talks to the **Cloud API** instead, which reads/writes the Cloud Postgres replica. Those changes sync back to the Store Server via the same outbox mechanism described in §4, so the Store Server always converges to the full picture once it's back online.

## 4. Sync & Offline Strategy

### 4.1 Outbox pattern

Every write on the Store Server (or Cloud node, for remote writes) is recorded as an entry in a `sync_outbox` table in the same transaction as the business write (see `06-Backend-Schema.md`). A background sync worker reads unsent outbox entries and pushes them to the other node (Store Server → Cloud, or Cloud → Store Server) over HTTPS, retrying with backoff until acknowledged. This guarantees no write is silently lost even through a connectivity gap — it's queued, not discarded.

### 4.2 Conflict resolution rules

Only two nodes ever hold a full copy of the data (Store Server, Cloud) — this is what keeps conflict resolution tractable:

| Data type                                                    | Rule                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Most tables (products, customers, suppliers, settings edits) | Last-writer-wins by `updated_at` timestamp, with the losing write's prior version retained in `audit_log` — no data is truly discarded, just superseded.                                                                                                                                                                                                                                                        |
| Batch/stock quantity changes                                 | **Never** last-writer-wins. Applied as **deltas** (e.g. "-5 units"), not absolute values, and replayed against the current quantity on each node. A batch's quantity is always `sum of all delta events`, so two concurrent sales against the same batch on different nodes both apply correctly instead of one overwriting the other. This directly satisfies NFR-008 (stock never goes negative from a race). |
| Invoice numbers                                              | Never generated by "increment the max existing number" (races under concurrency). See §4.3.                                                                                                                                                                                                                                                                                                                     |

### 4.3 Invoice numbering across nodes

**[ASSUMPTION — recommended design]** The Store Server owns invoice numbering by default (it's the primary node). Each node that might generate an invoice while disconnected from the Store Server (i.e., the Cloud node, for a remote biller) is pre-allocated a **reserved block** of invoice numbers (e.g., Cloud gets numbers in a distinct range or a `node_prefix + sequence` scheme — **[ASSUMPTION]** format `INV-{store_code}-{node_id}-{sequence}` unless the GST-format requirement demands a single unbroken sequence, in which case a range-reservation of e.g. 1000 numbers at a time is pulled by the Cloud node whenever it's online, so it can still issue valid, non-colliding numbers offline-from-Store-Server). This detail should be confirmed against current GST invoice-numbering rules during Phase 2 of the Implementation Plan, since the legal requirement (unbroken sequence vs. distinguishable series per "place of business") affects which of these two sub-approaches is used.

### 4.4 What happens on reconnect

When the Store Server regains connectivity to the Cloud (or a LAN device reconnects to the Store Server after being briefly offline — **[ASSUMPTION]** LAN devices themselves don't hold their own full DB copy in v1; they're thin clients of the Store Server over LAN and simply retry failed requests, they don't need their own outbox/sync logic. Only the Store Server ↔ Cloud link needs the full sync engine described above), the outbox worker drains in order, deltas replay, and both sides converge.

## 5. Multi-User Concurrency (billing correctness)

- Stock deduction at bill finalization runs inside a database transaction using **row-level locking / optimistic concurrency** (a `sync_version` or `updated_at` check-and-set on the batch row) so two simultaneous bills against the same batch can't both deduct from stock that's no longer there — the second writer detects the conflict and either re-allocates from the next FEFO batch or, if truly out of stock, surfaces that to the biller before finalizing.
- All of this concurrency logic runs against the **Store Server's** local Postgres — since LAN devices are thin clients of it (§4.4), this is a single-node concurrency problem (well-trodden Postgres territory), not a distributed one, for the common case of 4–10 devices on one LAN.

## 6. Security Architecture

- Auth: username/PIN or password → session token (JWT or server session — **[ASSUMPTION]** short-lived JWT + refresh, validated locally by the Store Server so LAN auth works offline, per FR-AUTH-004).
- Passwords/PINs: hashed (bcrypt/argon2), never logged or stored plain (NFR-010).
- Transport: HTTPS/TLS for all traffic, including LAN traffic between billing devices and the Store Server (self-signed cert acceptable for LAN since it's a closed network — **[ASSUMPTION]**).
- Authorization: role checks enforced in the API layer (NFR-012), not just hidden UI elements.
- Backups: Cloud Postgres replica doubles as backup; **[ASSUMPTION]** add a nightly logical dump (`pg_dump`) of the Store Server retained locally (e.g. 14 days rolling) as a second line of defense independent of the sync path.

## 7. Performance Targets for Low-End Hardware

- Local Postgres config tuned down from defaults: reduced `shared_buffers`, `max_connections` sized to realistic concurrent devices (10–15, not the Postgres default of 100), `work_mem` conservative.
- Avoid N+1 query patterns in the API layer — batch/stock lookups for billing (the most latency-sensitive flow, NFR-001) should be single indexed queries, not per-line-item round trips.
- Frontend: SvelteKit's small runtime + Tauri's native webview keep idle and active memory low (NFR-002); avoid heavy client-side state libraries beyond what SvelteKit's built-in stores provide.
- Indexing plan for the hot paths (product search, FEFO batch lookup, customer khata lookup) is specified per-table in `06-Backend-Schema.md`.

## 8. Printing & Hardware Integration

- Invoice/receipt printing: ESC/POS thermal printer, driven from the desktop client (Tauri has native OS access for this) — **[ASSUMPTION]** a print-formatting layer generates ESC/POS commands or a PDF fallback for non-thermal printers.
- Barcode scanning: HID keyboard-wedge scanners need no special driver; the billing/inventory search input simply captures the scanned string like fast keyboard input.

## 9. External/Future Integrations

- GST e-invoicing/IRN API: not integrated in v1 (PRD §5.2) but invoice data model (`06-Backend-Schema.md`) is structured so the fields an e-invoicing API would need (HSN, GSTIN, taxable value, etc.) already exist, minimizing rework later.
- Future e-commerce app: will read from the same `products`/`batches` inventory data, most likely via a read-focused API against the Cloud node rather than the Store Server directly — **[ASSUMPTION]**, to be scoped when that project starts.

## 10. Environments & CI/CD

- **[ASSUMPTION]** Dev: local Postgres + local API, seeded with fixture data mirroring the schema. Staging: a second Cloud Postgres instance for pre-release testing of sync logic specifically (this is the highest-risk area to regress silently). Prod: the real Store Server + Cloud pairing described above.
- CI: type-check (`svelte-check`, `tsc`), lint, and an automated test suite (unit tests for FEFO allocation, stock-delta replay, invoice numbering, and khata balance calculation are the highest-value tests given where correctness bugs would hurt most) run on every change before it reaches the Store Server build.
