# Product Requirements Document (PRD)

**Product:** MedERP — Wholesale & Retail Medical Store Management System
**Version:** 1.0 (Draft) | **Date:** 24 Aug 2026

---

## 1. Executive Summary

MedERP replaces manual/register-based stock and billing (and general-purpose tools like Marg ERP or PKS Stockist) with a purpose-built system for a family-run wholesale + retail medical/Ayurvedic store. It must handle both wholesale billing to retailer customers and direct retail billing to consumers, from a single shared stock, with expiry-aware (FEFO) batch tracking, GST-compliant invoicing, and drug-license statutory reporting — while running acceptably on old, low-spec desktop hardware and syncing across several billing devices at once.

## 2. Problem Statement

The store currently tracks stock and dues by hand or in general-purpose billing software not built for pharma-specific needs (batch/expiry tracking, FEFO dispensing, dual wholesale+retail pricing, drug-license reporting). This causes:

- Risk of selling expired or near-expiry stock because expiry isn't systematically enforced at billing time.
- No single source of truth for stock when multiple staff bill simultaneously.
- Manual khata (credit ledger) tracking for wholesale customers, error-prone and hard to reconcile.
- No easy way to produce GST or drug-license compliance reports.
- Vendor lock-in / licensing cost with existing ERP software, without the specific workflow fit the store needs.

## 3. Goals & Success Metrics

| Goal                                                 | Metric                                                                                                            |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Eliminate expired-stock dispensing                   | 0 sales of expired batches once FEFO enforcement is live                                                          |
| Real-time, correct stock across devices              | Stock discrepancy between billing devices < 1 unit at any time during concurrent billing                          |
| Fast billing on old hardware                         | Bill creation (search → add items → save → print) completes in < 2s on target low-end hardware (see NFRs in SRS)  |
| Reduce khata reconciliation time                     | Outstanding balance per customer available instantly, no manual ledger cross-check                                |
| Statutory readiness                                  | GST invoice + monthly GST summary report + drug-license stock/sales register generated without manual compilation |
| Continuity of billing during internet/device outages | Store Server (LAN) keeps billing fully operational with zero internet dependency                                  |

## 4. Target Users / Personas

| Persona                                    | Role                                    | Primary needs                                                                                                                                                     |
| ------------------------------------------ | --------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Owner/Admin**                            | Store owner (family)                    | Full visibility — stock, dues, dashboards, reports; manages users, pricing, settings; approves large discounts/returns                                            |
| **Biller/Counter Staff**                   | Front-counter staff, wholesale + retail | Fast search-and-bill workflow, minimal training, works even if internet is down                                                                                   |
| **Store Manager** _(optional role, v1.1+)_ | Senior staff                            | Purchases/GRN entry, supplier management, stock adjustments, doesn't need full admin/settings access                                                              |
| **(Future) Retail/Wholesale Customer**     | External                                | Views item availability via a future e-commerce layer reading the same inventory — **out of scope for this doc set**, noted for schema forward-compatibility only |

## 5. Scope

### 5.1 In scope — v1

- Inventory management with batch/expiry tracking and FEFO
- Multi-unit stock (e.g., strip/box/carton conversions)
- Purchases / GRN from suppliers, supplier ledger
- Wholesale billing (to retailer customers) and retail billing (to consumers) in one billing flow
- Customer master + credit/khata ledger with partial payments
- Sales & purchase returns
- GST-compliant invoice generation and printing (no e-invoicing/IRN)
- Drug-license and GST-relevant compliance reports
- Multi-device, multi-user concurrent billing (4–10 devices), LAN + internet
- Local-primary + cloud-backup data storage with sync
- Desktop app (Tauri) and mobile; browser/web billing deferred
- Role-based access (Owner/Admin, Biller minimum for v1)

### 5.2 Explicitly out of scope — v1

- GST e-invoicing / IRN generation (flagged as future)
- E-commerce customer-facing storefront (planned next project, shares inventory schema conceptually but is a separate app)
- Browser-based billing (desktop/mobile only for now)
- Multi-store/multi-branch operation (schema is forward-compatible, but v1 workflows assume one store)
- Payment gateway integration / online payment collection
- Automated reordering / demand forecasting

## 6. Feature List (MoSCoW)

**Must have**

- FEFO batch/expiry-aware stock and billing
- Wholesale + retail billing in one flow
- GST invoice generation & print
- Customer khata (credit ledger, partial payments, due tracking)
- Multi-device concurrent billing (LAN-first, cloud-backed)
- Purchases/GRN with batch entry (expiry, MRP, purchase price)
- Sales & purchase returns
- Drug-license & GST compliance reports
- Role-based access control (Owner/Admin, Biller)

**Should have**

- Multi-unit conversion (e.g. 1 box = 10 strips = 100 tablets) with per-unit pricing
- Schemes/discounts (e.g. "10+1 free", slab discounts)
- Low-stock and near-expiry alerts on dashboard
- Supplier ledger (payables, purchase history)
- Barcode scanning support at billing

**Could have**

- Store Manager role with scoped permissions
- Printer template customization
- Data export (CSV/Excel) for reports
- Offline queue visibility ("3 bills waiting to sync")

**Won't have (v1)**

- E-invoicing/IRN, e-commerce storefront, browser billing, multi-store, payment gateway, forecasting (see 5.2)

## 7. Assumptions & Constraints

- **[ASSUMPTION]** Single store/single "account" for v1; schema will carry a `store_id` for future multi-branch but all v1 UX assumes one store.
- **[ASSUMPTION]** One designated always-on device (or small machine) at the store acts as the **Store Server** — the local source of truth other billing devices talk to on LAN. See TRD §3.
- Low-end hardware target: must remain usable on aging desktop/laptop hardware already in use at the store (see SRS NFRs for concrete specs).
- Team is building with AI coding-agent assistance, without prior deep framework experience — documents are written to be unambiguous enough for an AI agent or a junior engineer to execute without needing to make architectural judgment calls.
- GST rules, drug-license reporting formats, and invoice numbering rules follow current Indian regulations as of 2026; **[ASSUMPTION]** these are configurable in Settings rather than hardcoded, since rules change.

## 8. Risks

| Risk                                                                   | Mitigation                                                                                                                  |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| Sync conflicts between local and cloud when internet drops mid-billing | Outbox/changelog sync pattern with deterministic conflict rules (TRD §4)                                                    |
| Old hardware can't handle Postgres + Node comfortably                  | Resource budgets defined in SRS NFRs; lightweight local Postgres config; Tauri over Electron specifically to save RAM       |
| Invoice number collisions across devices/nodes                         | Per-node invoice number block reservation (TRD §4, Schema §invoice_sequences)                                               |
| Team's limited framework experience slows delivery                     | Implementation plan is phased with explicit exit criteria per phase so an AI agent can execute incrementally and verifiably |
| GST/compliance rules change                                            | Rates, formats, and thresholds stored as configurable Settings data, not hardcoded logic                                    |

## 9. Release Plan Overview

See `08-Implementation-Plan.md` for the full phased plan. High level: Backend foundation → Billing engine (FEFO + GST) → Customers/Suppliers ledgers → Returns/Reports → Sync engine → Multi-device hardening → Hardware integration (printer/scanner) → Testing on real low-end hardware → Pilot rollout at the Ballia store.
