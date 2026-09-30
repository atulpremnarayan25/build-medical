# Software Requirements Specification (SRS)

**Product:** MedERP | **Version:** 1.0 (Draft) | **Date:** 24 Aug 2026
**Style:** Loosely follows IEEE 830 structure, adapted for an AI-agent-assisted build.

---

## 1. Introduction

### 1.1 Purpose

Defines exactly what MedERP must do, functionally and non-functionally, so the backend/database/sync/UI work (currently only a mock-data frontend exists) can be built without requiring the builder to invent behavior.

### 1.2 Scope

Covers Inventory, Purchases, Sales/Billing, Customers, Suppliers, Returns, Reports, Settings, Auth, and the Sync engine. See PRD §5 for in/out of scope.

### 1.3 Definitions & Acronyms

| Term         | Meaning                                                                                                      |
| ------------ | ------------------------------------------------------------------------------------------------------------ |
| FEFO         | First-Expiry-First-Out — stock dispensing rule; nearest-expiry batch is sold first                           |
| Batch        | A specific lot of a product received on one purchase, with its own expiry date, MRP, and purchase price      |
| Khata        | Running credit ledger between the store and a customer (Hindi/Hindi-business term for a credit account book) |
| GRN          | Goods Receipt Note — record of stock received against a purchase                                             |
| Store Server | The always-on local device/machine hosting the authoritative local Postgres DB + API for the store (TRD §3)  |
| Node         | Any device running the app — Store Server, a LAN biller device, or a remote/cloud-connected device           |
| MRP          | Maximum Retail Price (statutory ceiling price printed on medicine packaging in India)                        |
| Scheme       | A promotional offer on a product, e.g. "10+1 free" or a slab discount                                        |

### 1.4 References

`01-PRD.md`, `03-TRD.md`, `06-Backend-Schema.md`, `07-API-Spec.md`.

---

## 2. Overall Description

### 2.1 Product Perspective

Standalone system, no dependency on existing ERP (Marg/PKS). Desktop-first (Tauri-wrapped SvelteKit), mobile client sharing the same API, browser client deferred. Backend is a Node.js/TypeScript API in front of PostgreSQL, running locally on a Store Server with a synced cloud replica.

### 2.2 Product Functions (summary — detailed in §3)

Inventory & batch tracking, purchasing/GRN, wholesale + retail billing, customer khata, supplier ledger, returns, GST + compliance reporting, multi-device sync, role-based auth.

### 2.3 User Classes

| Class       | Access                                                                                                                                                                               |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Owner/Admin | Full access: all modules, Settings, user management, reports, void/large-discount approval                                                                                           |
| Biller      | Sales/Billing, Inventory (view + stock check), Customers (view + add payment), Purchases (view only) — **[ASSUMPTION]** default v1 role; Store Manager role deferred to v1.1 per PRD |

### 2.4 Operating Environment

- Desktop: Windows/Linux via Tauri, targeting old low-end hardware.
- Mobile: Android first (Tauri mobile or a thin client — confirmed direction in TRD §2).
- Backend/DB: runs on a store-local machine (Store Server) and mirrored to a cloud Postgres instance.

### 2.5 Design & Implementation Constraints

- Must run acceptably on old, low-end hardware (hard constraint, drives NFR-1 through NFR-4).
- PostgreSQL required both locally and in the cloud (already decided).
- No e-invoicing/IRN dependency for v1 — invoice must still be legally valid as a non-e-invoice GST bill.

### 2.6 Assumptions & Dependencies

- Reliable-enough LAN at the store for the Store Server model to work; internet may be intermittent (handled by sync design, TRD §4).
- Barcode scanner and receipt/invoice printer are standard USB/Bluetooth peripherals — **[ASSUMPTION]** ESC/POS-compatible thermal printer, generic HID barcode scanner (emulates keyboard input).

---

## 3. System Features (Functional Requirements)

Each requirement: **ID — Priority (M=Must/S=Should/C=Could) — Description.**

### 3.1 Auth & Users (`AUTH`)

| ID          | Pri | Requirement                                                                                                                                               |
| ----------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-AUTH-001 | M   | System supports login with username/PIN or password per user, scoped to one store account.                                                                |
| FR-AUTH-002 | M   | A single store account supports multiple simultaneous logged-in devices/users (4–10 concurrent target).                                                   |
| FR-AUTH-003 | M   | Two roles minimum in v1: Owner/Admin and Biller, each with the access defined in §2.3.                                                                    |
| FR-AUTH-004 | M   | Session remains valid on a LAN-connected device even if internet is unavailable (auth is validated against the Store Server, not the cloud, when on LAN). |
| FR-AUTH-005 | S   | Owner/Admin can create, disable, and reset credentials for other users.                                                                                   |
| FR-AUTH-006 | M   | All write actions are attributed to the authenticated user (for audit trail, FR-RPT-006).                                                                 |

### 3.2 Inventory (`INV`)

| ID         | Pri | Requirement                                                                                                                                                     |
| ---------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-INV-001 | M   | Each product has a base unit and optional conversion units (e.g. Tablet → Strip → Box) with defined conversion ratios and independent pricing per unit.         |
| FR-INV-002 | M   | Stock is tracked at the **batch** level: batch number, expiry date, MRP, purchase price, quantity received, quantity remaining.                                 |
| FR-INV-003 | M   | Product's total stock = sum of quantity-remaining across its non-expired, non-fully-consumed batches.                                                           |
| FR-INV-004 | M   | At billing, batch allocation defaults to FEFO — the batch with the nearest expiry date (that still has stock) is selected first automatically.                  |
| FR-INV-005 | M   | Batches past their expiry date are excluded from FEFO auto-allocation and flagged; selling from an expired batch requires explicit Owner/Admin override.        |
| FR-INV-006 | S   | Dashboard/Inventory view surfaces near-expiry stock (configurable threshold, default 90 days) and low-stock items (configurable per-product reorder threshold). |
| FR-INV-007 | M   | Stock quantity updates are transactional — concurrent sales on different devices against the same batch cannot oversell it (see NFR-9, TRD §5).                 |
| FR-INV-008 | M   | Manual stock adjustment (damage, loss, correction) is supported with a mandatory reason and is attributed to a user.                                            |
| FR-INV-009 | S   | Products can be searched/filtered by name, category, manufacturer, or barcode.                                                                                  |
| FR-INV-010 | S   | Barcode scan at the Inventory or Billing screen resolves directly to a product/batch where a barcode is registered.                                             |

### 3.3 Purchases (`PUR`)

| ID         | Pri | Requirement                                                                                                                                                                |
| ---------- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-PUR-001 | M   | A purchase entry (GRN) is recorded against a supplier, with one or more line items, each creating or adding to a batch (batch no., expiry, MRP, purchase price, quantity). |
| FR-PUR-002 | M   | Purchase entry increases the relevant batch's quantity-remaining and, if the batch is new, creates it.                                                                     |
| FR-PUR-003 | S   | Purchase entries support an "as per invoice" reference number and date from the supplier's own bill, distinct from the internal record ID.                                 |
| FR-PUR-004 | S   | Purchase return (see FR-RET) reverses the relevant batch quantity and records a debit against the supplier.                                                                |
| FR-PUR-005 | M   | Purchases update the supplier ledger (amount payable) per FR-SUP-002.                                                                                                      |

### 3.4 Sales / Billing (`SAL`)

| ID         | Pri | Requirement                                                                                                                                                                                 |
| ---------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-SAL-001 | M   | Billing supports two customer types in the same flow: **Wholesale** (registered retailer customer, khata-eligible) and **Retail** (walk-in consumer, cash/immediate payment by default).    |
| FR-SAL-002 | M   | Adding a product line to a bill auto-allocates stock via FEFO (FR-INV-004), splitting across multiple batches if one batch's remaining quantity is insufficient for the requested quantity. |
| FR-SAL-003 | M   | Line-item pricing respects the product's per-unit pricing (FR-INV-001) and the customer type (wholesale vs. retail rate, if configured differently).                                        |
| FR-SAL-004 | S   | Schemes/discounts (e.g. "10+1 free", percentage or flat discount) apply at line level; scheme rules are configured per product/period in Settings/Inventory.                                |
| FR-SAL-005 | M   | Bill totals calculate GST correctly per line item's applicable GST rate/HSN, with a GST breakdown (CGST/SGST or IGST as applicable) shown before finalizing.                                |
| FR-SAL-006 | M   | On finalizing a bill: stock is deducted from the allocated batches, an invoice number is generated (FR-SAL-008), and the invoice is available to print.                                     |
| FR-SAL-007 | M   | For Wholesale/khata customers, payment can be recorded as full, partial, or fully-on-credit at billing time; any unpaid amount posts to the customer's khata (FR-CUS-002).                  |
| FR-SAL-008 | M   | Invoice numbers are unique, sequential, and never collide even when generated on different devices/nodes simultaneously (TRD §4 — per-node numbering block strategy).                       |
| FR-SAL-009 | M   | A finalized bill can be printed as a GST-compliant invoice (statutory fields per SRS §5, compliance NFRs).                                                                                  |
| FR-SAL-010 | C   | A bill in progress can be held/parked and resumed later without losing line items.                                                                                                          |

### 3.5 Customers (`CUS`)

| ID         | Pri | Requirement                                                                                                                              |
| ---------- | --- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| FR-CUS-001 | M   | Customer master stores name, contact, address, GSTIN (for wholesale/B2B customers), and customer type (wholesale/retail).                |
| FR-CUS-002 | M   | Each wholesale customer has a running khata balance = sum of unpaid/partially-paid invoice amounts minus payments recorded.              |
| FR-CUS-003 | M   | Payments against khata can be recorded independently of a new sale (e.g., customer pays down an old due), with date, amount, and method. |
| FR-CUS-004 | S   | Customer detail view shows full ledger: invoices, payments, running balance, in chronological order.                                     |
| FR-CUS-005 | C   | Optional per-customer credit limit with a warning (not hard block, unless configured) when a new sale would exceed it.                   |

### 3.6 Suppliers (`SUP`)

| ID         | Pri | Requirement                                                                                                               |
| ---------- | --- | ------------------------------------------------------------------------------------------------------------------------- |
| FR-SUP-001 | M   | Supplier master stores name, contact, address, GSTIN.                                                                     |
| FR-SUP-002 | M   | Each supplier has a running payable balance = sum of purchase amounts minus payments made, minus purchase-return credits. |
| FR-SUP-003 | S   | Payments made to a supplier can be recorded independently of a new purchase.                                              |
| FR-SUP-004 | C   | Supplier detail view shows purchase history and payment history.                                                          |

### 3.7 Returns (`RET`)

| ID         | Pri | Requirement                                                                                                                                                                                                                                         |
| ---------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-RET-001 | M   | Sales return: selecting a past invoice and returning one or more line items (full or partial quantity) reverses the stock deduction (adds back to the originating batch where possible) and adjusts the customer's khata or issues a refund record. |
| FR-RET-002 | M   | Purchase return: selecting a past purchase and returning line items reduces the batch quantity and adjusts the supplier payable.                                                                                                                    |
| FR-RET-003 | S   | Returns require a reason and are attributed to a user; large-value returns **[ASSUMPTION]** require Owner/Admin approval (threshold configurable in Settings).                                                                                      |

### 3.8 Reports (`RPT`)

| ID         | Pri | Requirement                                                                                                           |
| ---------- | --- | --------------------------------------------------------------------------------------------------------------------- |
| FR-RPT-001 | M   | GST summary report (sales GST collected, purchase GST paid) for a selectable date range, broken down by GST rate.     |
| FR-RPT-002 | M   | Drug-license-relevant stock & sales register: what was sold/purchased, batch/expiry detail, for statutory inspection. |
| FR-RPT-003 | S   | Stock report: current stock by product/batch, valuation at purchase price and at MRP.                                 |
| FR-RPT-004 | S   | Expiry report: batches expiring within a configurable window.                                                         |
| FR-RPT-005 | S   | Sales/purchase summary reports by date range, customer, or supplier.                                                  |
| FR-RPT-006 | M   | Audit log: who did what (create/edit/delete/adjust/void) and when, queryable by Owner/Admin.                          |
| FR-RPT-007 | C   | Reports exportable to CSV/Excel.                                                                                      |

### 3.9 Settings (`SET`)

| ID         | Pri | Requirement                                                                                                                                               |
| ---------- | --- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-SET-001 | M   | Store profile: name, address, GSTIN, drug license number(s) — printed on invoices/reports.                                                                |
| FR-SET-002 | M   | GST rate/HSN configuration per product category, editable without a code change.                                                                          |
| FR-SET-003 | S   | Invoice print template configuration (at minimum: paper size, logo, footer text).                                                                         |
| FR-SET-004 | M   | User management (create/disable users, assign roles) — Owner/Admin only.                                                                                  |
| FR-SET-005 | S   | Sync/backup status visibility: last successful sync time, pending changes count.                                                                          |
| FR-SET-006 | S   | Configurable thresholds: near-expiry window (FR-INV-006), low-stock reorder point, return-approval value (FR-RET-003), credit limit warning (FR-CUS-005). |

### 3.10 Sync Engine (`SYNC`)

| ID          | Pri | Requirement                                                                                                                                                                                                    |
| ----------- | --- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| FR-SYNC-001 | M   | All local writes are queued for propagation to the cloud Postgres replica; the Store Server functions fully (all modules) with zero internet connectivity.                                                     |
| FR-SYNC-002 | M   | When a remote/mobile device is off-LAN, it reads/writes through the cloud node; those changes propagate back to the Store Server when connectivity allows.                                                     |
| FR-SYNC-003 | M   | Conflicting concurrent edits resolve deterministically (TRD §4) — no silent data loss; conflicts affecting stock quantity or invoice numbering can never produce a negative stock or duplicate invoice number. |
| FR-SYNC-004 | S   | Users can see sync health (FR-SET-005) and are warned, not blocked, when operating in a degraded (offline) state.                                                                                              |

---

## 4. External Interface Requirements

### 4.1 User Interfaces

Desktop (Tauri) and mobile client UIs — fully specified in `05-UIUX-Spec.md`.

### 4.2 Hardware Interfaces

- **[ASSUMPTION]** ESC/POS thermal receipt/invoice printer over USB or Bluetooth.
- **[ASSUMPTION]** Barcode scanner as HID keyboard-wedge device (no special driver needed).

### 4.3 Software Interfaces

- PostgreSQL (local instance on Store Server; cloud-hosted Postgres instance).
- REST API between SvelteKit frontend and Node.js backend — see `07-API-Spec.md`.

### 4.4 Communication Interfaces

- LAN (HTTP over local network) between billing devices and Store Server — primary, low-latency path.
- Internet (HTTPS) between remote devices and the cloud node, and between Store Server and cloud for sync.

---

## 5. Non-Functional Requirements

| ID      | Category        | Requirement                                                                                                                                                                                             |
| ------- | --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| NFR-001 | Performance     | Bill creation flow (search product → add line → finalize → print) completes in **< 2s** end-to-end on target low-end hardware **[ASSUMPTION target spec: dual-core CPU, 4GB RAM, HDD or low-end SSD]**. |
| NFR-002 | Performance     | App idle memory footprint **[ASSUMPTION target: < 300MB]** for the desktop client — a primary reason Tauri was chosen over Electron.                                                                    |
| NFR-003 | Performance     | Local Postgres tuned for low-resource operation (connection limits, shared_buffers sized down) — documented in TRD §7.                                                                                  |
| NFR-004 | Performance     | UI stays responsive (no blocking freezes > 200ms) during a background sync operation.                                                                                                                   |
| NFR-005 | Reliability     | Store Server operation must not depend on internet connectivity for any Must-have feature in §3.                                                                                                        |
| NFR-006 | Reliability     | No data loss on ungraceful shutdown (e.g., power cut) mid-transaction — DB transactions are atomic; in-flight bill either fully commits or fully rolls back.                                            |
| NFR-007 | Availability    | Target uptime for Store Server during business hours: effectively 100% (it's a local machine the store controls) — cloud node is best-effort backup/remote-access, not required for daily operation.    |
| NFR-008 | Consistency     | Stock quantity must never go negative as a result of concurrent billing (see TRD §5 concurrency design).                                                                                                |
| NFR-009 | Consistency     | Invoice numbers must never duplicate across devices/nodes (TRD §4).                                                                                                                                     |
| NFR-010 | Security        | Passwords/PINs hashed at rest (never stored plain); API requires authenticated session for all non-login endpoints.                                                                                     |
| NFR-011 | Security        | Data in transit between devices and Store Server/cloud is encrypted (HTTPS/TLS), including on LAN.                                                                                                      |
| NFR-012 | Security        | Role-based access enforced server-side, not just hidden in the UI (a Biller-role token cannot call Owner/Admin-only endpoints).                                                                         |
| NFR-013 | Compliance      | Every printed invoice includes statutory GST fields: seller GSTIN, invoice number, date, buyer details (where applicable), HSN, taxable value, GST rate/amount split (CGST+SGST or IGST), total.        |
| NFR-014 | Compliance      | Drug-license-relevant data (batch, expiry, quantities) is retained and reportable per FR-RPT-002, matching what a drug inspector would expect to see.                                                   |
| NFR-015 | Usability       | A new Biller-role staff member can complete a basic retail sale correctly within a few minutes of first use, with no training document beyond on-screen cues.                                           |
| NFR-016 | Maintainability | Business rules that change often in the real world (GST rates, thresholds, invoice numbering format) live in configuration/Settings data, not hardcoded — per FR-SET-002/006.                           |
| NFR-017 | Portability     | Desktop client runs on both Windows and Linux via Tauri; mobile client runs on Android. Browser support deferred but not architecturally precluded.                                                     |

## 6. Data Requirements

Full schema in `06-Backend-Schema.md`. Summary of core entities: `users`, `products`, `product_units`, `batches`, `suppliers`, `customers`, `purchases`/`purchase_items`, `sales`/`sale_items`, `payments` (customer & supplier), `returns`/`return_items`, `invoice_sequences`, `audit_log`, `settings`, `sync_outbox`.

## Appendix: Glossary

See §1.3 for core terms. Additional:

- **RBAC** — Role-Based Access Control.
- **Outbox pattern** — a sync technique where local writes are appended to a change log table, which a background worker reliably replays to the remote system.
- **Optimistic concurrency** — a concurrency-control approach that checks for conflicts at commit time (via a version/timestamp column) instead of locking rows up front.
