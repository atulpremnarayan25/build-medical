# Medical Store ERP — Documentation Set

**Project:** Wholesale + Retail Medical Store Management System (working name: _MedERP_)
**Prepared for:** Engineering / build team (human or AI-assisted)
**Status:** v1.0 — Draft for build kickoff
**Date:** 24 August 2026

## What this is

This is the complete specification package for building the medical store ERP from its current state (a mock-data SvelteKit frontend covering Dashboard, Inventory, Sales, Customers, Suppliers, Purchases) through to a production system with real backend, database, auth, multi-device sync, GST billing, and statutory compliance reporting.

Read in this order:

| #   | Document                    | Answers                                                                     |
| --- | --------------------------- | --------------------------------------------------------------------------- |
| 1   | `01-PRD.md`                 | Why are we building this, for whom, what's in v1 vs later?                  |
| 2   | `02-SRS.md`                 | What exactly must the system do (functional + non-functional requirements)? |
| 3   | `03-TRD.md`                 | How is it architected — stack, sync, security, performance?                 |
| 4   | `04-App-Flows.md`           | What are the step-by-step user journeys through the app?                    |
| 5   | `05-UIUX-Spec.md`           | What does every screen contain and how does it behave?                      |
| 6   | `06-Backend-Schema.md`      | What's the database schema, table by table?                                 |
| 7   | `07-API-Spec.md`            | What are the API contracts between frontend and backend?                    |
| 8   | `08-Implementation-Plan.md` | What order do we build things in, and how do we know each phase is done?    |

## Project snapshot (as of this document set)

- **Domain:** Family-owned wholesale + retail medical/Ayurvedic store, Ballia, Uttar Pradesh. Sells to both retailers (wholesale) and end consumers (retail) from the same stock.
- **Stack:** SvelteKit (UI) + Tauri (desktop shell) + Node.js/TypeScript (API) + PostgreSQL (local **and** cloud).
- **Current state:** Frontend UI complete against mock data (11 build phases done — foundation, shell, dashboard, inventory, purchases, customers, billing, sales/reports/settings, polish). `svelte-check` clean, `npm run build` passing. **No real backend, database, auth, or persistence yet** — this doc set defines exactly that.
- **Non-negotiable constraint:** must run well on old, low-end hardware (this drove the entire architecture choice in the TRD — no heavy multi-master DB sync, no bloated frameworks).
- **Concurrency target:** 4–10 billing devices/staff working simultaneously on one account, both over LAN and over the internet.
- **Must-have from v1:** FEFO batch/expiry tracking, GST-compliant invoicing, drug-license compliance reporting, customer credit/khata ledger, wholesale + retail billing in one app.
- **Deferred:** GST e-invoicing/IRN generation, e-commerce storefront (planned but not v1), browser-based billing (desktop/mobile first).

## Conventions used across these documents

- Requirement IDs: `FR-<MODULE>-<NNN>` (functional), `NFR-<NNN>` (non-functional). Referenced consistently across the SRS, TRD, and API spec so any requirement is traceable end-to-end.
- Modules: `AUTH`, `INV` (inventory), `PUR` (purchases), `SAL` (sales/billing), `CUS` (customers), `SUP` (suppliers), `RET` (returns), `RPT` (reports), `SET` (settings), `SYNC` (sync engine).
- Anything marked **[ASSUMPTION]** is a decision made to keep the spec unambiguous, not something you told me directly — flag it if it's wrong and the downstream docs get updated.
