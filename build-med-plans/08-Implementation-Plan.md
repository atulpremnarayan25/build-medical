# Implementation Plan

**Product:** MedERP | **Version:** 1.0 (Draft) | **Date:** 24 Aug 2026

Phased so each phase is independently verifiable — important since this is being built with AI-agent assistance rather than a team that can hold the whole system in their heads. Each phase lists goals, deliverables, and **exit criteria** (how you know it's actually done, not just "looks done").

---

## Phase 0 — Frontend Foundation _(complete)_

**Status:** Done, per existing build log. SvelteKit frontend with Dashboard, Inventory, Sales, Customers, Suppliers, Purchases modules against mock data; clean `svelte-check`; successful `npm run build`.
**Carry-forward risk:** mock-data assumptions baked into the UI (field names, shapes) need to be reconciled against `06-Backend-Schema.md` and `07-API-Spec.md` in Phase 1 — expect some UI rework, not a pure "plug in the API" swap.

## Phase 1 — Backend Foundation

**Goals:** stand up the real database and API, replace mock data with real persistence for the modules already built in the UI.
**Deliverables:**

- PostgreSQL schema from `06-Backend-Schema.md` (migrations, not hand-run SQL — needed for repeatable setup on the Store Server later).
- Node.js/TypeScript API implementing Auth, Products/Inventory (basic CRUD, no FEFO logic yet), Customers, Suppliers per `07-API-Spec.md` §1–3, 5–6.
- Frontend wired to real endpoints for those modules, mock data removed.
  **Exit criteria:** a user can log in, create a product with units and a batch, create a customer/supplier, and see it all persist across an app restart — running against a single local Postgres instance (multi-node sync not needed yet).

## Phase 2 — Billing Engine (FEFO + GST)

**Goals:** the core value of the product — correct, safe billing.
**Deliverables:**

- FEFO batch allocation logic (`06-Backend-Schema.md` §18 query, exposed via `/sales/quote`).
- GST calculation (rate/HSN per product, CGST/SGST/IGST split per NFR-013).
- `/sales` finalize endpoint: transactional stock deduction, invoice number generation (single-node version for now — full multi-node numbering strategy in Phase 5).
- Multi-unit pricing (strip/box/etc.) applied correctly at billing.
- Confirm the exact GST invoice-numbering legal requirement (unbroken sequence vs. distinguishable series) mentioned as open in TRD §4.3, before finalizing the numbering approach.
- Invoice print output meeting NFR-013's statutory field list.
  **Exit criteria:** a full retail sale and a full wholesale sale (with partial payment/khata) can be completed end-to-end and printed, with correct FEFO selection verified against seeded batches of varying expiry, and correct GST math verified against a hand-checked example bill.

## Phase 3 — Customers/Suppliers Ledgers & Schemes

**Goals:** the money-tracking half of the app.
**Deliverables:**

- Khata/payable balance derivation (schema §18) and ledger views (`/customers/:id/ledger`, `/suppliers/:id/ledger`).
- Payment recording (`/payments`) for both directions.
- Schemes/discounts at line-item level (FR-SAL-004).
  **Exit criteria:** recording a partial payment against a wholesale sale correctly updates the customer's balance, visible immediately in their ledger; a scheme applied at billing correctly reduces the line total and is reflected on the printed invoice.

## Phase 4 — Returns, Reports, Compliance

**Goals:** the parts needed for real-world operation and statutory readiness, not just happy-path selling.
**Deliverables:**

- Sales/purchase returns (`/returns`) with stock and ledger reversal.
- Reports: GST summary, drug-license register, stock, near-expiry, sales summary, audit log (`07-API-Spec.md` §8).
- Approval-threshold logic for large returns/adjustments (FR-RET-003).
  **Exit criteria:** a return correctly reverses stock into the originating batch and adjusts the relevant ledger; the GST summary report ties out against manually summed sales for a test date range; the drug-license register shows batch-level detail an inspector could actually use.

## Phase 5 — Sync Engine (Local ↔ Cloud)

**Goals:** the architecturally riskiest phase — get this wrong and stock/money figures silently drift. Build it in isolation with heavy testing before wiring it into daily use.
**Deliverables:**

- `sync_outbox` writer (every business write also logs an outbox entry, same transaction).
- Sync worker: push/pull against `/sync/push` and `/sync/pull` (TRD §4.1).
- Delta-based stock reconciliation (`batch_stock_events` replay, TRD §4.2).
- Full invoice-number range reservation across nodes (TRD §4.3), replacing the single-node version from Phase 2.
- Cloud Postgres instance stood up, identical schema.
  **Exit criteria:** simulate an offline period (disconnect the Store Server from the internet), make sales on the Store Server AND (in the same simulated window) on a Cloud-connected client, reconnect, and verify both sides converge to the same stock levels, same khata balances, and zero duplicate invoice numbers. This test should be automated and re-run on every future change to this subsystem — it's the highest-value regression test in the whole project.

## Phase 6 — Multi-Device / Multi-User Hardening

**Goals:** validate the actual target usage pattern — 4–10 devices billing simultaneously on the Store Server's LAN.
**Deliverables:**

- Concurrency test harness simulating simultaneous bills against the same low-stock batch, confirming NFR-008 (never oversold) and correct FEFO fallback to the next batch when one is exhausted mid-run.
- Decide and implement the mobile client approach (Tauri mobile vs. thin client, per TRD §2) if not already settled.
- LAN discovery/configuration UX for pointing a new billing device at the Store Server (how does device #5 know where the Store Server is on the network?) — **[gap to resolve during this phase, not previously specified]**.
  **Exit criteria:** 4+ physical or emulated devices billing concurrently against a shared low-stock scenario produce correct, non-negative final stock and no duplicate invoices.

## Phase 7 — Hardware Integration

**Goals:** printer and scanner, the last mile of an actually usable counter tool.
**Deliverables:**

- ESC/POS thermal printer output from the desktop client (TRD §8).
- Barcode scanner input handling on Billing and Inventory search (keyboard-wedge, no driver work expected).
  **Exit criteria:** a real invoice prints correctly on the store's actual printer hardware; a real barcode scan resolves to the correct product during billing.

## Phase 8 — Testing & QA on Target Hardware

**Goals:** validate the non-negotiable low-end-hardware constraint against real machines, not developer laptops.
**Deliverables:**

- Performance testing against NFR-001–004 on the actual old hardware the store will use, not a dev machine.
- Full regression pass across all Must-have FRs.
- A short UAT session with actual store staff on the Billing flow specifically (App Flow §2–3) — this is the flow where a confusing UI costs real time every single day.
  **Exit criteria:** bill creation meets the < 2s target on target hardware; staff can complete a basic sale unaided (NFR-015).

## Phase 9 — Pilot Rollout

**Goals:** go live at the Ballia store with a safety net.
**Deliverables:**

- Data migration/seeding: initial product catalog and opening stock entered (likely from the existing digitized stock register, per prior work).
- Run in parallel with the old process for a short window if feasible, before fully cutting over.
- Backup verification: confirm the nightly local dump (TRD §6) and cloud sync are both actually producing recoverable backups before relying on the system for real billing.
  **Exit criteria:** a full day's real billing completes on the new system with correct end-of-day stock and khata figures cross-checked manually once.

---

## Cross-phase notes

- **Don't defer testing to Phase 8.** Each phase above should ship with its own automated tests for its riskiest logic (FEFO in Phase 2, ledger math in Phase 3, sync convergence in Phase 5, concurrency in Phase 6) — Phase 8 is a hardware/UAT pass, not where testing starts.
- **Schema changes get harder after Phase 5.** Once the sync engine is live, changing table shapes means migrating two live databases (Store Server + Cloud) in a coordinated way. Nail down the schema in `06-Backend-Schema.md` as early as possible; treat post-Phase-5 schema changes as a deliberate, tested migration process, not a quick edit.
- **This plan assumes solo/small-team, AI-agent-assisted execution** (per PRD §7) — phases are ordered so each one is independently shippable and testable, rather than requiring the whole system to be understood at once before anything works.
