# MedStock ERP — Technical & Domain Architecture Guide (`explain.md`)

> **Target Audience / Reader Model:** Local LLMs (such as Qwen 2.5/3.5, Gemma 2/4 7B/14B/27B) running in quantized local environments (e.g., llama.cpp, Ollama, LM Studio, MLX on a 16GB MacBook Air M4) as well as software engineers working on this codebase.
> 
> **Document Purpose:** Complete, authoritative, end-to-end explanation of the **WHAT**, **WHY**, and **HOW** behind every layer of MedStock ERP: domain logic, regulatory statutes, system architecture, database schema, transactional billing engine, and codebase layout.

---

## Table of Contents

1. [Executive Summary & High-Level Purpose](#1-executive-summary--high-level-purpose)
2. [Operating Context & Domain Foundations (The "WHY")](#2-operating-context--domain-foundations-the-why)
   - [2.1 Indian Pharmaceutical Regulatory Framework (Schedule H/H1/X & Rule 65)](#21-indian-pharmaceutical-regulatory-framework-schedule-hh1x--rule-65)
   - [2.2 FEFO vs. FIFO Inventory Management](#22-fefo-vs-fifo-inventory-management)
   - [2.3 Indian GST Tax Architecture (HSN, CGST, SGST, IGST)](#23-indian-gst-tax-architecture-hsn-cgst-sgst-igst)
   - [2.4 Pharmaceutical Multi-Tier Pricing (MRP, PTR, PTS, Unit Packaging)](#24-pharmaceutical-multi-tier-pricing-mrp-ptr-pts-unit-packaging)
   - [2.5 The B2B Khata (Credit Ledger) System](#25-the-b2b-khata-credit-ledger-system)
3. [System Architecture & Deployment Topology (The "HOW")](#3-system-architecture--deployment-topology-the-how)
   - [3.1 The Store Server Model (Local Primary + Cloud Replica)](#31-the-store-server-model-local-primary--cloud-replica)
   - [3.2 Offline-First LAN Operation vs. Internet Disruption](#32-offline-first-lan-operation-vs-internet-disruption)
   - [3.3 Transactional Outbox Sync Engine](#33-transactional-outbox-sync-engine)
   - [3.4 Conflict Resolution & Delta-Based Stock Reconciliation](#34-conflict-resolution--delta-based-stock-reconciliation)
   - [3.5 Non-Colliding Distributed Invoice Numbering](#35-non-colliding-distributed-invoice-numbering)
4. [Technology Stack & Architectural Guardrails](#4-technology-stack--architectural-guardrails)
   - [4.1 Core Technologies](#41-core-technologies)
   - [4.2 Prohibited Technologies & Anti-Patterns](#42-prohibited-technologies--anti-patterns)
5. [Codebase Layering & Strict Separation of Concerns](#5-codebase-layering--strict-separation-of-concerns)
   - [5.1 The 4-Tier Layer Rule](#51-the-4-tier-layer-rule)
   - [5.2 Client Services vs. Server Services Disambiguation](#52-client-services-vs-server-services-disambiguation)
   - [5.3 Svelte 5 Runes State Architecture](#53-svelte-5-runes-state-architecture)
6. [Exhaustive Database Schema (PostgreSQL + Drizzle ORM)](#6-exhaustive-database-schema-postgresql--drizzle-orm)
   - [6.1 Global Schema Conventions & Sync Columns](#61-global-schema-conventions--sync-columns)
   - [6.2 Complete Table-by-Table Reference](#62-complete-table-by-table-reference)
   - [6.3 Relational Entity Diagram](#63-relational-entity-diagram)
7. [Core Workflows & Algorithmic Engines](#7-core-workflows--algorithmic-engines)
   - [7.1 Sub-Second POS Sale Finalization (`finalizeSale`)](#71-sub-second-pos-sale-finalization-finalizesale)
   - [7.2 Pure FEFO Allocation Algorithm (`allocateFefo`)](#72-pure-fefo-allocation-algorithm-allocatefefo)
   - [7.3 Exact Financial Math & Rounding Engine (`money.ts` & `gst.ts`)](#73-exact-financial-math--rounding-engine-moneyts--gstts)
   - [7.4 Append-Only Stock Movements (`batch_stock_events`)](#74-append-only-stock-movements-batch_stock_events)
   - [7.5 Sales & Purchase Returns (`returns.ts`)](#75-sales--purchase-returns-returnsts)
   - [7.6 Dual-Party Khata Ledger Balancing](#76-dual-party-khata-ledger-balancing)
8. [UI/UX Ergonomics & "The Clinical Console" Design System](#8-uiux-ergonomics--the-clinical-console-design-system)
   - [8.1 Keyboard-First Ergonomics & Shortcuts](#81-keyboard-first-ergonomics--shortcuts)
   - [8.2 Visual Palette & Status Semantics](#82-visual-palette--status-semantics)
   - [8.3 65/35 POS Screen Division](#83-6535-pos-screen-division)
9. [Authentication, Sessions & Security Boundary](#9-authentication-sessions--security-boundary)
10. [Directory Structure & File Inventory](#10-directory-structure--file-inventory)
11. [Local LLM Engineering Cheat Sheet & Rules of Thumb](#11-local-llm-engineering-cheat-sheet--rules-of-thumb)

---

## 1. Executive Summary & High-Level Purpose

**MedStock ERP** (internally referenced as `MedERP` / `build-medical`) is a mission-critical pharmaceutical enterprise resource planning (ERP) and retail Point-of-Sale (POS) system. 

It is purpose-built for independent stockists and pharmacy retailers operating in high-rush commercial centers across India (originally modeled for a family-owned medical distribution business in Ballia, Uttar Pradesh).

### What it does:
- Provides **sub-second, 100% keyboard-driven billing** for high-volume retail counters.
- Enforces **automated FEFO (First Expiry First Out)** inventory consumption across drug batches.
- Handles **hybrid operations**: retail consumer billing and B2B wholesale clinic/stockist billing from a single shared stock ledger.
- Enforces **Indian statutory drug compliance**: mandatory capture of prescribing physician name, medical registration number, and patient identity for Schedule H, H1, and X medications.
- Manages an exact **Indian GST tax engine** (CGST, SGST, IGST) with fractional paise precision.
- Maintains customer and supplier **Khata (credit ledgers)** with partial settlements and aging analysis.
- Runs **offline-first** on local store hardware via LAN, with asynchronous transactional synchronization to a cloud Postgres replica.

### Why generic POS / ERP software fails in this domain:
1. **Generic ERPs (QuickBooks, Zoho, Tally, Marg ERP):**
   - Marg and legacy desktop ERPs are cluttered, slow, Windows-only, proprietary, fragile, and lack web/modern API extensibility.
   - Generic cloud POS systems (Square, Shopify) lack batch-level expiry tracking, drug schedules, doctor registration capture, packaging unit hierarchies (box → strip → tablet), and Indian GST split mechanics.
   - Cloud-only systems collapse when broadband internet drops, which happens frequently in tier-2/3 Indian cities.

---

## 2. Operating Context & Domain Foundations (The "WHY")

To write and maintain code in this project, an LLM or developer must understand the non-negotiable legal, commercial, and operational constraints of an Indian pharmacy.

### 2.1 Indian Pharmaceutical Regulatory Framework (Schedule H/H1/X & Rule 65)

Under the **Drugs and Cosmetics Act, 1940** and **Drugs and Cosmetics Rules, 1945 (Rule 65)**, medicines in India are strictly classified into regulatory schedules:

| Schedule | Description | Regulatory & Software Enforcement |
| :--- | :--- | :--- |
| **Normal / OTC** | Over-the-counter drugs (e.g., Paracetamol, vitamins). | Can be dispensed to walk-in anonymous customers with no doctor prescription. |
| **Schedule H** | Prescription drugs (e.g., standard antibiotics, antihypertensives). | Requires prescription; dispensing record must note prescriber details. |
| **Schedule H1** | High-risk antibiotics, 3rd/4th gen cephalosporins, psychotropics (e.g., Alprazolam, Zolpidem, Tramadol). | **Mandatory statutory register**: Bill completion is hard-blocked unless: <br>1. Prescribing Doctor's Name is recorded.<br>2. Doctor's Medical Council Registration Number is recorded.<br>3. Patient Name and Contact Details are recorded.<br>Records must be retained for drug inspector audit for at least 3 years. |
| **Schedule X** | Severe narcotics and habit-forming psychotropics (e.g., Ketamine, Morphine). | Extreme audit requirement; requires duplicate prescription retention and separate stock register. |

**In the codebase:**
- `productsTable.drugSchedule`: Stored as `'none'`, `'H'`, `'H1'`, `'X'`.
- `salesTable`: Has explicit fields `patientName`, `prescriberName`, `prescriberRegNo`.
- `src/routes/api/reports/schedule-h1/+server.ts`: Generates statutory audit reports for Drug Inspectors.
- **Rule:** Never allow a sale containing Schedule H1 or X items to finalize without doctor and patient details.

### 2.2 FEFO vs. FIFO Inventory Management

Standard warehousing uses FIFO (First In, First Out). In pharmaceutical distribution, **FIFO causes catastrophic financial loss and lethal health hazards**.

- A batch manufactured in January 2026 expiring in December 2026 might arrive *after* a batch manufactured in November 2025 expiring in May 2026.
- Using FIFO would sell the December 2026 batch first, leaving the May 2026 batch to expire on the shelf.
- Expired pharmaceutical stock cannot be sold legally, cannot always be returned to suppliers for full credit, and results in total financial write-off.
- **FEFO (First Expiry, First Out)** is legally and financially required: the batch with the **earliest expiry date** must *always* be allocated first, regardless of when it arrived in the warehouse.
- **Near-Expiry (< 90 days):** Warning state surfaced in yellow/amber (`#d97706`).
- **Expired Stock:** Sale is completely rejected unless explicitly overridden by an authenticated `owner_admin` role (`allowExpiredOverride`).

### 2.3 Indian GST Tax Architecture (HSN, CGST, SGST, IGST)

Goods and Services Tax (GST) in India has strict legal calculation rules:

1. **HSN Code (Harmonized System of Nomenclature):**
   - 8-digit codes classifying medicines (e.g., `30049099` for allopathic formulations).
2. **Tax Slabs:**
   - Pharma products are typically taxed at **0%** (essential life-saving), **5%** (vaccines, selected formulations), **12%** (most standard formulations), or **18%** (nutraceuticals, cosmetics).
3. **Intra-State vs. Inter-State Sales:**
   - **Intra-State (Same State, e.g., UP to UP):** GST is split **50/50** into:
     - **CGST** (Central GST): $\frac{\text{GST Rate}}{2}$
     - **SGST** (State GST): $\frac{\text{GST Rate}}{2}$
   - **Inter-State (Cross State, e.g., UP to Bihar):** Full tax goes to **IGST** (Integrated GST): $100\% \times \text{GST Rate}$.
4. **Fractional Paise & Odd-Paise Split:**
   - Currency is Indian Rupee ($\text{INR} = 100 \text{ paise}$).
   - If an intra-state tax total results in an odd number of paise (e.g., 25 paise total tax):
     - `cgstPaise = Math.floor(25 / 2) = 12`
     - `sgstPaise = 25 - 12 = 13`
     - The sum of CGST and SGST *must always exactly equal* total GST.
5. **Post-Discount Tax Computation:**
   - When a bill-level discount is given, Indian tax law dictates that GST applies to the *discounted taxable value*, not the list price. Discretionary discounts must be apportioned across line items proportionally *before* computing tax.
6. **Invoice Round-Off:**
   - Final invoice grand total is rounded half-up to the nearest whole Rupee (`roundToRupee`). The rounding difference is explicitly recorded as `roundOffRupees`.

### 2.4 Pharmaceutical Multi-Tier Pricing (MRP, PTR, PTS, Unit Packaging)

Pharma supply chains use regulated multi-tier pricing:

```
Manufacturer ──(PTS)──> Stockist/Wholesaler ──(PTR)──> Retail Chemist ──(MRP)──> Patient
```

- **MRP (Maximum Retail Price):** Statutory maximum price printed on packaging. A retailer cannot legally charge a consumer more than the MRP.
- **PTR (Price to Retailer):** The rate at which wholesale stockists bill retail chemists.
- **PTS (Price to Stockist):** The rate at which pharma companies bill distributors.
- **Multi-Unit Packaging Conversions:**
  - Medicines are purchased in bulk boxes but sold in strips or loose tablets.
  - *Hierarchy:* 1 Box = 10 Strips = 100 Tablets.
  - The software stores all inventory quantities internally in the **Base Unit** (the smallest indivisible unit, e.g., Tablet).
  - Every product unit defines `conversionToBase` (e.g., Box conversion = 100, Strip conversion = 10).
  - When billing 2 Strips, the billing engine deducts $2 \times 10 = 20$ Base Units from the batch stock.

### 2.5 The B2B Khata (Credit Ledger) System

Indian trade heavily relies on informal and formal revolving credit accounts called **Khata**:
- Local clinics, nursing homes, and retail pharmacies buy stock on credit.
- Bills are rarely settled immediately in cash; they are marked `paymentStatus: 'credit'` or `'partial'`.
- The customer balance is an accumulating ledger. When the customer pays ₹10,000 via UPI or cheque a week later, this payment is applied against outstanding debts (FIFO invoice settlement).
- **Golden Accounting Invariant:** Customer outstanding balance is **never stored as a static field**. It is a derived calculation:
  $$\text{Outstanding Balance} = \sum(\text{Debits / Invoices}) - \sum(\text{Credits / Payments}) + \sum(\text{Sales Returns})$$
  Storing mutable balance numbers leads to sync race conditions and accounting corruption across offline nodes.

---

## 3. System Architecture & Deployment Topology (The "HOW")

### 3.1 The Store Server Model (Local Primary + Cloud Replica)

```
                            ┌───────────────────────────────────┐
                            │               CLOUD               │
                            │  ┌─────────────────────────────┐  │
                            │  │   Cloud API (SvelteKit/Node)│  │
                            │  └──────────────┬──────────────┘  │
                            │  ┌──────────────▼──────────────┐  │
                            │  │      Cloud PostgreSQL       │  │
                            │  │   (Central Replica/Backup)  │  │
                            │  └──────────────▲──────────────┘  │
                            └─────────────────┼─────────────────┘
                                              │
                                              │ HTTPS (Bidirectional Outbox Sync)
                                              │
                      WAN / Internet ─────────┼───────── WAN / Internet
                                              │
                            ┌─────────────────▼─────────────────┐
                            │           STORE SERVER            │
                            │    (Dedicated Local PC in Store)  │
                            │  ┌─────────────────────────────┐  │
                            │  │   Local API (SvelteKit/Node)│  │
                            │  └──────────────┬──────────────┘  │
                            │  ┌──────────────▼──────────────┐  │
                            │  │      Local PostgreSQL       │  │
                            │  │   (Authoritative Master)    │  │
                            │  └──────────────▲──────────────┘  │
                            └─────────────────┼─────────────────┘
                                              │
                                              │ Local Area Network (Wi-Fi / Ethernet)
                                              │
                      ┌───────────────────────┼───────────────────────┐
                      │                       │                       │
               ┌──────▼──────┐         ┌──────▼──────┐         ┌──────▼──────┐
               │ Counter PC 1│         │ Counter PC 2│         │ Warehouse Tab│
               │  (Tauri POS)│         │  (Tauri POS)│         │ (LAN Browser)│
               └─────────────┘         └─────────────┘         └─────────────┘
```

### 3.2 Offline-First LAN Operation vs. Internet Disruption

1. **The Store Server is Master:** One machine inside the store runs PostgreSQL and the Node.js backend.
2. **Zero Internet Dependency:** Counter billing devices (Tauri apps on desktop or tablet browsers) connect over the store's **LAN** to the Store Server. Billing operates at 100% speed even if the city's fiber and cellular networks are completely down.
3. **Why Full Multi-Master was Rejected:** If every POS terminal ran its own database and synced peer-to-peer, resolving stock conflicts when two cashiers sell the last strip of Amoxicillin simultaneously requires complex distributed consensus. In MedStock ERP, all LAN devices hit the **single Store Server**, which serializes stock writes using PostgreSQL row-level locks.

### 3.3 Transactional Outbox Sync Engine

To synchronize data between the Store Server and Cloud without distributed two-phase commits:
- Every business transaction (sale, purchase, customer create, stock adjustment) inserts a record into the `sync_outbox` table **inside the exact same database transaction**.
- If the transaction fails, the business write rolls back *and* the outbox entry rolls back.
- A background worker polls `sync_outbox WHERE sent_at IS NULL`, batches mutations, and pushes them to the remote `/api/sync/push` endpoint over HTTPS.
- Upon successful receipt and replay, the sender marks `sent_at = NOW()`.

### 3.4 Conflict Resolution & Delta-Based Stock Reconciliation

When the Store Server and Cloud sync, two different conflict resolution policies apply:

1. **Static / Reference Entities (Products, Customers, Suppliers, Settings):**
   - Resolved via **Last-Writer-Wins (LWW)** using the `updated_at` timestamp.
   - The overwritten record's state is preserved in `audit_log` so no data is unrecoverably destroyed.
2. **Dynamic Stock Quantities (`batches.quantityRemaining`):**
   - **Never Last-Writer-Wins.** Absolute stock values are never blindly copied across nodes.
   - Stock reconciliation is strictly **delta-based**. The system syncs `batch_stock_events` (e.g., `delta = -10` for sale, `delta = +50` for purchase).
   - On the receiving node, the delta event is replayed against the batch, adjusting `quantityRemaining = quantityRemaining + delta`.
   - This guarantees that concurrent sales across different nodes never produce phantom inventory or overwrite each other.

### 3.5 Non-Colliding Distributed Invoice Numbering

Invoice numbers must be sequential for tax audits (e.g., `INV-2026-0001`), but two nodes creating invoices independently could generate duplicate numbers.

- **Solution:** The `invoice_sequences` table assigns pre-allocated, non-overlapping numeric blocks to each node:
  - Store Server allocates: Range `10001` to `20000`.
  - Cloud / Remote allocates: Range `90001` to `99999`.
- A transaction locks the sequence row (`SELECT ... FOR UPDATE`), increments `nextValue`, and formats the invoice string (`INV-{store_code}-{sequence}`).

---

## 4. Technology Stack & Architectural Guardrails

### 4.1 Core Technologies

| Layer | Technology | Version | Justification |
| :--- | :--- | :--- | :--- |
| **Frontend Framework** | SvelteKit + Svelte 5 | SvelteKit 2.63, Svelte 5.56 | Compiles to minimal JS; zero virtual-DOM overhead; run perfectly on low-spec 4GB RAM POS machines. Uses modern Svelte 5 Runes (`$state`, `$derived`, `$props`). |
| **Desktop Shell** | Tauri (planned/compatible) | Tauri 2.x | Native OS webview wrapper written in Rust. Replaces Electron (which bundles Chromium and consumes 500MB+ RAM idle). |
| **Styling** | Tailwind CSS | v4.3 | High-density utility styling with zero runtime CSS-in-JS overhead. |
| **Database** | PostgreSQL | 15+ | Transactional guarantees, row-level locking (`FOR UPDATE`), trigram indexing (`pg_trgm`), JSONB audit columns. |
| **ORM & Migrations** | Drizzle ORM | 0.45.2 (`drizzle-orm/postgres-js`) | Type-safe SQL dialect, zero bloat, native support for transactions and prepared queries. |
| **Testing** | Vitest | 4.1.8 | Sub-second unit and integration testing suite. |
| **Verification** | Reticle | 2.11.0 | In-app verification harness (`reticle_*` MCP tools) verifying live UI state without brittle end-to-end test flakiness. |

### 4.2 Prohibited Technologies & Anti-Patterns

Any LLM modifying this project **must adhere to these strict restrictions**:
- ❌ **NO React, Vue, Angular, or Solid:** The project is strictly Svelte 5.
- ❌ **NO Electron:** Desktop targeting is strictly Tauri-compatible.
- ❌ **NO Floating-Point Arithmetic for Money:** Never use JavaScript `number` math for authoritative totals (`0.1 + 0.2 = 0.30000000000000004`). All money calculations must use integer paise via `src/lib/server/billing/money.ts`.
- ❌ **NO Component-Level Database Access:** Svelte components never import Drizzle, database instances, or server repositories directly.
- ❌ **NO Bypassing the Transactional Outbox:** Every database write to business tables must include an outbox entry in the same transaction.

---

## 5. Codebase Layering & Strict Separation of Concerns

### 5.1 The 4-Tier Layer Rule

```
[ Tier 1: UI Layer ] 
  Svelte Components (`src/routes/**/*.svelte`, `src/lib/components/**/*.svelte`)
  ↓ (reads reactive state, dispatches user events)
[ Tier 2: State Layer ]
  Svelte 5 Runes (`$state`, `$derived`, `appStore.svelte.ts`, `toastStore.svelte.ts`)
  ↓ (calls client services)
[ Tier 3: Service Layer ]
  Business Orchestration (`src/lib/services/*.ts`)
  ↓ (invokes API clients or repository interfaces)
[ Tier 4: Repository / Data Layer ]
  Client: HTTP Fetch Clients (`src/lib/services/api/*.ts`) -> `/api/*`
  Server: Drizzle Repositories (`src/lib/server/repositories/*.ts`) -> PostgreSQL
```

### 5.2 Client Services vs. Server Services Disambiguation

⚠️ **CRUCIAL DISTINCTION FOR LOCAL LLMs:**

There are **two sets of services** in this codebase, operating on different sides of the network boundary:

1. **Client-Side Services (`src/lib/services/index.ts` / `src/lib/services/api/*.ts`):**
   - Used by Svelte components in the browser.
   - Pure TypeScript HTTP wrappers (`saleClient.ts`, `productClient.ts`).
   - Call `/api/sales`, `/api/products`, etc., using browser `fetch`.
   - Never import Drizzle or PostgreSQL modules.
2. **Server-Side Services & Locators (`src/lib/server/servicesLocator.ts` / `src/lib/server/billing/engine.ts`):**
   - Used by SvelteKit server endpoints (`+server.ts`, `+page.server.ts`).
   - Wired up to `db` (Drizzle PostgreSQL connection) and repository classes (`DbSaleRepository`, `DbProductRepository`).
   - Execute database transactions, row locks, and SQL queries.

### 5.3 Svelte 5 Runes State Architecture

This codebase is built on **Svelte 5**:
- Uses **Runes** (`$state`, `$derived`, `$effect`, `$props`) instead of legacy Svelte 3/4 `export let` and writable stores.
- Example from `src/routes/sales/new/+page.svelte`:
  ```svelte
  <script lang="ts">
    let items = $state<BillItem[]>([]);
    let customer = $state<Customer | null>(null);
    let subtotal = $derived(items.reduce((sum, item) => sum + item.lineTotal, 0));
  </script>
  ```
- Store files use the `.svelte.ts` extension (e.g., `toastStore.svelte.ts`, `appStore.svelte.ts`).

---

## 6. Exhaustive Database Schema (PostgreSQL + Drizzle ORM)

Source file: `src/lib/server/db/schema.ts`

### 6.1 Global Schema Conventions & Sync Columns

Every syncable business table implements these standard columns:
- `id`: `uuid('id').primaryKey().defaultRandom()` — UUIDs allow independent node creation without primary key collisions.
- `createdAt`: `timestamp('created_at', { withTimezone: true }).notNull().defaultNow()`
- `updatedAt`: `timestamp('updated_at', { withTimezone: true }).notNull().defaultNow()`
- `originNode`: `text('origin_node').notNull().default('store_server')` (`'store_server'` or `'cloud'`)
- `syncVersion`: `integer('sync_version').notNull().default(1)` (incremented on every update)
- `isDeleted`: `boolean('is_deleted').notNull().default(false)` (soft-deletes only; records are never hard-deleted)

### 6.2 Complete Table-by-Table Reference

#### 1. `stores`
Forward-compatibility for multi-store topology (v1 runs with 1 default row).
- `id`: UUID (PK)
- `name`: TEXT (Store trading name)
- `address`: TEXT
- `gstin`: TEXT (15-character Indian GST identification number)
- `drugLicenseNo`, `drugLicenseNo2`: TEXT (Form 20/21 wholesale & retail drug license numbers)

#### 2. `users`
System operators with role-based access control.
- `id`: UUID (PK)
- `storeId`: UUID (FK -> `stores.id`)
- `name`: TEXT
- `username`: TEXT (Unique)
- `passwordHash`: TEXT (bcrypt hash)
- `role`: TEXT (`'owner_admin'` | `'biller'` | `'manager'`)
- `isActive`: BOOLEAN (default `true`)

#### 3. `sessions`
Ephemeral node-local authentication tokens (intentionally **never synced** to cloud).
- `id`: TEXT (PK, 32-byte secure random hex)
- `userId`: UUID (FK -> `users.id` ON DELETE CASCADE)
- `expiresAt`: TIMESTAMPTZ

#### 4. `products`
Master medicine and FMCG catalog.
- `id`: UUID (PK)
- `storeId`: UUID (FK -> `stores.id`)
- `name`: TEXT (Brand name, e.g. "Dolo 650mg") — Indexed via GIN trigram (`gin_trgm_ops`) for instant partial searches
- `category`: TEXT (e.g. "Analgesic", "Antibiotic", "Ayurvedic")
- `manufacturer`: TEXT (e.g. "Cipla", "Micro Labs", "Sun Pharma")
- `hsnCode`: TEXT (e.g. "30049099")
- `gstRate`: NUMERIC (e.g. "12.00")
- `baseUnit`: TEXT (Indivisible unit, default "Unit" or "Tablet")
- `barcode`: TEXT (Unique if present)
- `genericName`: TEXT (Chemical salt composition, e.g. "Paracetamol 650mg")
- `mrp`: NUMERIC (Printed maximum retail price)
- `sellingRate`: NUMERIC (Default selling price)
- `purchaseRate`: NUMERIC (Default purchase rate from stockist)
- `packSize`: INTEGER (e.g. 10 or 15)
- `drugSchedule`: TEXT (`'none'` | `'H'` | `'H1'` | `'X'`)
- `reorderThreshold`: NUMERIC (Low stock alert trigger)
- `isActive`: BOOLEAN

#### 5. `product_units`
Packaging unit hierarchy conversions (e.g., Box → Strip → Tablet).
- `id`: UUID (PK)
- `productId`: UUID (FK -> `products.id` ON DELETE CASCADE)
- `unitName`: TEXT (e.g. "Box", "Strip", "Tablet")
- `conversionToBase`: NUMERIC (Multiplier to reach base unit; e.g. Box = 100)
- `wholesalePrice`: NUMERIC (PTR rate)
- `retailPrice`: NUMERIC (Retail consumer rate)
- `isBaseUnit`: BOOLEAN (Exactly one unit per product has `isBaseUnit = true`)

#### 6. `batches`
Inventory holding records partitioned by physical batch numbers and expiry dates.
- `id`: UUID (PK)
- `productId`: UUID (FK -> `products.id`)
- `batchNo`: TEXT (Manufacturer batch identifier stamped on foil/pack)
- `expiryDate`: DATE (Format `'YYYY-MM-DD'`) — Indexed together with `productId` for FEFO queries
- `mrp`: NUMERIC (Batch-specific MRP snapshot)
- `purchasePrice`: NUMERIC (Batch-specific purchase cost)
- `quantityReceived`: NUMERIC (Total inwarded stock in base units)
- `quantityRemaining`: NUMERIC (Cached current stock in base units)
- `supplierId`: UUID (FK -> `suppliers.id`, optional)
- `purchaseId`: UUID (FK -> `purchases.id`, optional)

#### 7. `batch_stock_events`
**Append-only immutable audit trail of all inventory movements.**
- `id`: UUID (PK)
- `batchId`: UUID (FK -> `batches.id`)
- `delta`: NUMERIC (Positive for stock in, negative for stock out)
- `eventType`: TEXT (`'purchase'` | `'sale'` | `'sales_return'` | `'purchase_return'` | `'adjustment'`)
- `referenceId`: UUID (Polymorphic ID pointing to `saleId`, `purchaseId`, or `returnId`)
- `reason`: TEXT (Mandatory for adjustments, e.g. "Broken ampoule", "Stocktaking count fix")
- `createdBy`: UUID (FK -> `users.id`)

#### 8. `suppliers`
Wholesale pharmaceutical distributors.
- `id`: UUID (PK)
- `storeId`: UUID (FK -> `stores.id`)
- `name`: TEXT
- `contactPhone`: TEXT
- `address`: TEXT
- `gstin`: TEXT
- `isActive`: BOOLEAN

#### 9. `customers`
Retail consumers and B2B wholesale accounts (clinics, hospitals, doctors).
- `id`: UUID (PK)
- `storeId`: UUID (FK -> `stores.id`)
- `name`: TEXT
- `contactPhone`: TEXT
- `address`: TEXT
- `gstin`: TEXT (Wholesale B2B accounts)
- `customerType`: TEXT (`'retail'` | `'wholesale'`)
- `creditLimit`: NUMERIC (Maximum permitted outstanding khata balance)
- `isActive`: BOOLEAN

#### 10. `purchases` & `purchase_items`
Inward Goods Received Notes (GRN) from suppliers.
- `purchases`:
  - `id`: UUID (PK)
  - `storeId`: UUID (FK -> `stores.id`)
  - `supplierId`: UUID (FK -> `suppliers.id`)
  - `supplierInvoiceRef`: TEXT (Supplier's physical invoice number)
  - `supplierInvoiceDate`: DATE
  - `totalAmount`: NUMERIC
  - `createdBy`: UUID (FK -> `users.id`)
- `purchase_items`:
  - `id`: UUID (PK)
  - `purchaseId`: UUID (FK -> `purchases.id` ON DELETE CASCADE)
  - `batchId`: UUID (FK -> `batches.id`)
  - `quantity`: NUMERIC (Base units inwarded)
  - `purchasePrice`: NUMERIC

#### 11. `sales` & `sale_items`
Outward retail and wholesale invoices.
- `sales`:
  - `id`: UUID (PK)
  - `storeId`: UUID (FK -> `stores.id`)
  - `invoiceNumber`: TEXT (Unique, formatted from sequence, e.g. `INV-2026-0001`)
  - `customerId`: UUID (FK -> `customers.id`, nullable for walk-in retail)
  - `patientName`: TEXT (Statutory compliance requirement)
  - `prescriberName`: TEXT (Doctor name for Schedule H/H1/X)
  - `prescriberRegNo`: TEXT (Doctor medical registration number)
  - `notes`: TEXT
  - `saleType`: TEXT (`'retail'` | `'wholesale'`)
  - `subtotal`: NUMERIC (Sum before tax and discounts)
  - `gstAmount`: NUMERIC (Total tax)
  - `totalAmount`: NUMERIC (Grand total rounded to nearest Rupee)
  - `amountPaidAtSale`: NUMERIC (Cash/UPI collected at billing counter)
  - `paymentStatus`: TEXT (`'paid'` | `'partial'` | `'credit'`)
  - `createdBy`: UUID (FK -> `users.id`)
- `sale_items`:
  - `id`: UUID (PK)
  - `saleId`: UUID (FK -> `sales.id` ON DELETE CASCADE)
  - `productId`: UUID (FK -> `products.id`)
  - `batchId`: UUID (FK -> `batches.id`)
  - `unitId`: UUID (FK -> `product_units.id`)
  - `quantity`: NUMERIC (Quantity sold in selected packaging unit)
  - `rate`: NUMERIC (Effective rate snapshot per sold unit)
  - `gstRate`: NUMERIC (GST percentage snapshot)
  - `lineTotal`: NUMERIC (Line subtotal + tax in rupees)
  - `schemeApplied`: TEXT (e.g. "10+1 Free")

#### 12. `payments`
Dual-direction cash/bank/UPI settlements.
- `id`: UUID (PK)
- `storeId`: UUID (FK -> `stores.id`)
- `direction`: TEXT (`'customer_payment'` | `'supplier_payment'`)
- `customerId`: UUID (FK -> `customers.id`, nullable)
- `supplierId`: UUID (FK -> `suppliers.id`, nullable)
- `amount`: NUMERIC (Settled amount)
- `method`: TEXT (`'cash'` | `'upi'` | `'bank_transfer'` | `'cheque'`)
- `relatedSaleId`: UUID (FK -> `sales.id`, optional specific bill settlement)
- `notes`: TEXT
- `createdBy`: UUID (FK -> `users.id`)

#### 13. `returns` & `return_items`
Reversals for customer returns and defective supplier returns.
- `returns`:
  - `id`: UUID (PK)
  - `returnType`: TEXT (`'sales_return'` | `'purchase_return'`)
  - `originalSaleId`: UUID (FK -> `sales.id`, nullable)
  - `originalPurchaseId`: UUID (FK -> `purchases.id`, nullable)
  - `reason`: TEXT
  - `approvedBy`: UUID (FK -> `users.id`)
  - `createdBy`: UUID (FK -> `users.id`)
- `return_items`:
  - `id`: UUID (PK)
  - `returnId`: UUID (FK -> `returns.id` ON DELETE CASCADE)
  - `batchId`: UUID (FK -> `batches.id`)
  - `quantity`: NUMERIC
  - `lineAmount`: NUMERIC

#### 14. `invoice_sequences`
Distributed non-colliding invoice sequence generator.
- `id`: UUID (PK)
- `storeId`: UUID (FK -> `stores.id`)
- `nodeId`: TEXT (e.g. `'store_server'`, `'cloud'`)
- `rangeStart`: BIGINT
- `rangeEnd`: BIGINT
- `nextValue`: BIGINT
- `allocatedAt`: TIMESTAMPTZ

#### 15. `audit_log`
Append-only log recording every entity modification.
- `id`: UUID (PK)
- `storeId`: UUID (FK -> `stores.id`)
- `entityType`: TEXT (`'product'`, `'batch'`, `'sale'`, etc.)
- `entityId`: UUID
- `action`: TEXT (`'create'` | `'update'` | `'delete'` | `'adjust'` | `'approve'`)
- `performedBy`: UUID (FK -> `users.id`)
- `beforeValue`: JSONB
- `afterValue`: JSONB

#### 16. `sync_outbox`
Transactional buffer for node-to-node replication.
- `id`: UUID (PK)
- `tableName`: TEXT
- `rowId`: UUID
- `operation`: TEXT (`'insert'` | `'update'` | `'delete'`)
- `payload`: JSONB (Complete serialized row data)
- `targetNode`: TEXT (`'cloud'` or `'store_server'`)
- `sentAt`: TIMESTAMPTZ (NULL until acknowledged by destination)

---

## 7. Core Workflows & Algorithmic Engines

### 7.1 Sub-Second POS Sale Finalization (`finalizeSale`)

Source file: `src/lib/server/billing/engine.ts`

When a cashier confirms a sale (`Ctrl+S` or `F10`), the request hits `POST /api/sales`. The entire process runs inside a **single atomic PostgreSQL database transaction**:

```
Step 1: Load Context & Row Locks
  └─ Select candidate batches for all items FOR UPDATE
Step 2: Statutory Drug Check
  └─ Verify Doctor Name & Reg No if Schedule H1/X present
Step 3: Pure FEFO Allocation
  └─ allocateFefo() assigns earliest expiring batches
Step 4: Financial Math & Tax Apportionment
  └─ Integer paise arithmetic computes CGST, SGST, IGST
Step 5: Sequence Generation
  └─ nextInvoiceNumber() atomically claims next invoice ID
Step 6: Insert Sale & Sale Items
  └─ Expand line items into batch-split rows
Step 7: Deduct Inventory & Append Stock Events
  └─ batches.quantityRemaining -= alloc
  └─ Insert batch_stock_events row (delta = -alloc)
Step 8: Write Sync Outbox
  └─ Log all inserted/updated rows into sync_outbox
Step 9: Commit Transaction
```

#### Detailed Transaction Steps:

1. **Row-Level Locking:**
   Candidate batches for all requested products are fetched with `SELECT ... FOR UPDATE`. This guarantees that if another billing counter on the LAN attempts to bill the same batch at the exact same millisecond, one waits for the other, preventing double-selling.
2. **Statutory Validation:**
   If any item belongs to Schedule H1 or X, the engine verifies that `patientName`, `prescriberName`, and `prescriberRegNo` are populated. If missing, it throws a `BillingError('STATUTORY_COMPLIANCE_FAILED', ..., 400)`.
3. **FEFO Allocation & Splitting:**
   If the customer buys 15 tablets of Amoxicillin, but Batch A has 10 tablets remaining and Batch B has 20 tablets, the engine performs a **FEFO split**:
   - 10 tablets from Batch A (earliest expiry).
   - 5 tablets from Batch B.
   - The sale generates **two distinct rows in `sale_items`**, preserving batch traceability for drug recalls.
4. **Optimistic Guard:**
   The inventory deduction query uses an atomic decrement with a floor check:
   ```sql
   UPDATE batches 
   SET quantity_remaining = quantity_remaining - :qty,
       sync_version = sync_version + 1,
       updated_at = NOW()
   WHERE id = :batchId AND quantity_remaining >= :qty
   ```
   If the number of affected rows is not 1, the transaction immediately throws `BillingError('STALE_WRITE', ..., 409)` and rolls back completely.

### 7.2 Pure FEFO Allocation Algorithm (`allocateFefo`)

Source file: `src/lib/server/billing/fefo.ts`

The batch allocation algorithm is an **isolated pure function**: no database imports, no system clock dependencies.

```typescript
export function allocateFefo(
    requestedBaseUnits: number,
    candidates: FefoBatch[],
    options: FefoOptions
): FefoResult
```

#### Rules Enforced by `allocateFefo`:
1. **Integer Quantities:** `requestedBaseUnits` must be a positive integer.
2. **Pinned Batch Handling:** If the cashier explicitly pins a batch (`pinnedBatchId`), allocation considers *only* that batch.
3. **Expiry Filtering:** Unless `includeExpired: true` is passed, batches where `expiryDate <= today` are strictly excluded.
4. **Zero-Stock Filtering:** Batches with `quantityRemaining <= 0` are excluded.
5. **Deterministic Sorting:**
   - Primary: `expiryDate ASC` (earliest expiry first).
   - Tie-breaker: `id ASC` (deterministic allocation across runs).
6. **Greedy Fulfillment:** Loops through candidate batches, consuming `Math.min(remaining, batch.quantityRemaining)` until `remaining === 0`.
7. **Shortage Reporting:** If available stock cannot fulfill the order, it throws `OutOfStockError(shortage)` specifying the exact missing unit count.

### 7.3 Exact Financial Math & Rounding Engine (`money.ts` & `gst.ts`)

Source files: `src/lib/server/billing/money.ts`, `src/lib/server/billing/gst.ts`

To eliminate floating-point precision errors (e.g. `0.1 + 0.2 = 0.30000000000000004`), **all financial operations occur in integer Paise** ($1 \text{ INR} = 100 \text{ paise}$).

- `toPaise(val: string | number): number` — Parses decimal strings into integer paise:
  `"12.50"` $\rightarrow$ `1250`. Half-up rounds fractions of a paise.
- `fromPaise(paise: number): string` — Converts integer paise to a fixed 2-decimal string:
  `1250` $\rightarrow$ `"12.50"`.
- `roundToRupee(paise: number): number` — Rounds to the nearest 100 paise (whole Rupee):
  `1249` $\rightarrow$ `1200` (₹12.00); `1250` $\rightarrow$ `1300` (₹13.00).
- `percentOf(paise: number, pct: string | number): number` — Computes exact percentage in rational space with half-up rounding:
  $$\text{num} = \text{paise} \times (\text{pct} \times 100)$$
  $$\text{result} = \text{sign} \times \left\lfloor\frac{|\text{num}| + 5000}{10000}\right\rfloor$$

### 7.4 Append-Only Stock Movements (`batch_stock_events`)

The `batches.quantityRemaining` column is technically a **materialized cache**. The true legal and financial source of truth is the immutable, append-only `batch_stock_events` table.

Every inventory change appends a row:
- Inward GRN: `delta = +100`, `eventType = 'purchase'`, `referenceId = purchase.id`
- Retail Sale: `delta = -10`, `eventType = 'sale'`, `referenceId = sale.id`
- Customer Return: `delta = +5`, `eventType = 'sales_return'`, `referenceId = return.id`
- Damage/Loss: `delta = -2`, `eventType = 'adjustment'`, `reason = 'Broken bottle'`

At any point in time:
$$\text{Calculated Stock} = \sum_{\text{events}} \text{delta}$$

### 7.5 Sales & Purchase Returns (`returns.ts`)

Source file: `src/lib/server/billing/returns.ts`

When a medicine is returned:
1. `returns` record is inserted with the return reason and approving user ID.
2. `return_items` rows capture the returning batch and quantity.
3. For **Sales Returns**:
   - Stock is restored: `batches.quantityRemaining` increases.
   - A positive `batch_stock_events` row (`eventType = 'sales_return'`) is inserted.
   - The customer's khata balance is credited.
4. For **Purchase Returns** (defective stock sent back to stockist):
   - Stock is removed: `batches.quantityRemaining` decreases.
   - A negative `batch_stock_events` row (`eventType = 'purchase_return'`) is inserted.
   - The supplier payable balance is debited.

### 7.6 Dual-Party Khata Ledger Balancing

Source file: `src/lib/server/repositories/ledgerRepository.ts`

The Khata ledger provides an exact chronological running balance for any party (customer or supplier).

```typescript
// Ledger Entry Formula:
// For Customer:
Debit  = Sale Invoice Grand Total (Customer owes money)
Credit = Payment Received / Sales Return (Customer reduces debt)
Balance = Previous Balance + Debit - Credit

// For Supplier:
Credit = Purchase Invoice Grand Total (Store owes supplier money)
Debit  = Payment Paid to Supplier / Purchase Return (Store reduces debt)
Balance = Previous Balance + Credit - Debit
```

---

## 8. UI/UX Ergonomics & "The Clinical Console" Design System

### 8.1 Keyboard-First Ergonomics & Shortcuts

In a crowded pharmacy counter, **every mouse click costs 2–5 seconds of customer queue delay**. MedStock ERP is engineered so a clerk never has to lift their hands from the keyboard.

| Key | Global Action | Billing Context Action |
| :--- | :--- | :--- |
| `Ctrl+K` | Global Search Palette | Focus product search box |
| `Ctrl+N` | Open New Sale screen | — |
| `F2` | — | Focus Product Search input |
| `F3` | — | Focus Customer Search input |
| `F4` | — | Cycle Payment Mode (Cash $\rightarrow$ UPI $\rightarrow$ Credit) |
| `F6` | — | Hold current bill / Recall held bills |
| `F8` | — | Toggle Sale Type (Retail $\leftrightarrow$ Wholesale) |
| `F10` / `Ctrl+S` | — | Finalize & Print Invoice |
| `Escape` | Close modal dialog | Clear active search dropdown |
| `Tab` / `Enter` | Navigate between inputs | Add item from search dropdown to bill |

### 8.2 Visual Palette & Status Semantics

The visual styling adheres to **"The Clinical Console"** design specification (`DESIGN.md`):

| Purpose | Token / Hex | Context & Meaning |
| :--- | :--- | :--- |
| **Primary Brand** | `clinical-teal` (`#0d9488`) | Header actions, primary buttons, active tabs. |
| **Schedule H1 Violet** | `statutory-violet` (`#7c3aed`) | **Non-negotiable rule:** Applied to all Schedule H, H1, and X badges, alerts, and modal borders. Unambiguously flags regulatory scrutiny. |
| **Healthy Stock** | `emerald` (`#16a34a`) | Batches with >90 days to expiry and sufficient stock. |
| **Near-Expiry Warning** | `amber` (`#d97706`) | Batches expiring within 90 days. Warns clerk to prioritize dispensing. |
| **Expired / Critical** | `rose` (`#dc2626`) | Expired batches or depleted stock. |
| **Sidebar Canvas** | `slate-900` (`#0f172a`) | Dark, high-contrast, distraction-free navigation shell. |

### 8.3 65/35 POS Screen Division

The New Sale screen (`src/routes/sales/new/+page.svelte`) implements an ergonomic split:
- **Left Column (65% width):** High-density editable tabular grid of invoice items (Product Name, Batch No, Expiry, Pack Unit, Quantity, Rate, Discount, GST %, Line Total).
- **Right Column (35% width):** Fixed control and summary console:
  - Patient & Prescribing Doctor compliance inputs.
  - Subtotal, Itemized GST breakdown (CGST, SGST, IGST), Discount input.
  - Grand total display in large tabular numerals.
  - Payment collection input (Cash/UPI/Credit toggle).
  - Primary "Save & Print" trigger.

---

## 9. Authentication, Sessions & Security Boundary

Source files: `src/hooks.server.ts`, `src/lib/server/auth/index.ts`

1. **Security Architecture:**
   - **Frontend is Untrusted:** The UI handles presentation only. No private keys, passwords, or authority resides on the client.
   - **Password Security:** Stored as bcrypt hashes (`bcryptjs`, 10 rounds).
2. **Ephemeral Node-Local Sessions:**
   - Upon successful login (`POST /login`), a cryptographically secure 32-byte random hex string is generated via `crypto.randomBytes(32)`.
   - Stored in the node-local `sessions` table with an expiration timestamp (`expiresAt`).
   - Stored on the client in an `HttpOnly`, `SameSite=Lax` cookie named `sessionId`.
   - **Sync Boundary:** The `sessions` table is explicitly omitted from the outbox sync schema. Sessions are valid only on the specific node where they were issued.
3. **Request Lifecycle Hook (`src/hooks.server.ts`):**
   - Every incoming HTTP request checks `event.cookies.get('sessionId')`.
   - If present, `validateSession(sessionId)` fetches the user from the database and attaches it to `event.locals.user`.
   - Protected route guard redirects unauthenticated page requests to `/login` and returns `401 Unauthorized` for `/api/*` endpoints.
   - Sets `cache-control: no-store` on all authenticated HTML page responses to prevent browser back-button cache leaks after logout.

---

## 10. Directory Structure & File Inventory

```
build-medical/
├── .claude/                     # Claude agent configurations and skills
├── build-med-plans/             # Comprehensive documentation and architecture blueprints
│   ├── 00-README-Index.md       # Index of specification documents
│   ├── 01-PRD.md                # Product Requirements Document (Personas, business goals)
│   ├── 02-SRS.md                # Software Requirements Specification (Functional requirements)
│   ├── 03-TRD.md                # Technical Requirements Document (System architecture)
│   ├── 04-App-Flows.md          # State diagrams and operational user journeys
│   ├── 05-UIUX-Spec.md          # Interface layout, ergonomics, and density specs
│   ├── 06-Backend-Schema.md     # Relational PostgreSQL table specifications
│   ├── 07-API-Spec.md           # REST API endpoints and payload schemas
│   └── 08-Implementation-Plan.md# Milestones and phased delivery roadmap
├── graphify-out/                # Automated codebase knowledge graph & dependency report
│   ├── GRAPH_REPORT.md          # Graph report detailing nodes, edges, and god nodes
│   └── graph.json               # Full graph data queried by `graphify query`
├── migrations-pg/               # PostgreSQL schema migration files (Drizzle Kit)
├── scripts/
│   ├── seed.ts                  # Database seeder (45+ realistic Indian medicines, batches, stores)
│   └── migrate.js               # Legacy migration script
├── src/
│   ├── hooks.server.ts          # SvelteKit server hook (Session auth guard, headers)
│   ├── lib/
│   │   ├── components/          # Reusable UI component library
│   │   │   ├── billing/         # POS components (ProductSearch, BatchSelector, InvoiceItemsTable)
│   │   │   ├── common/          # Core primitives (Button, Modal, Badge, Toast, PageHeader)
│   │   │   ├── dashboard/       # KPI cards, stock alerts, quick actions
│   │   │   ├── forms/           # Data entry forms (ProductForm, CustomerForm, SupplierForm)
│   │   │   ├── inventory/       # Stock badges, batch tables, expiry pills
│   │   │   ├── layout/          # Sidebar, Topbar, AppShell
│   │   │   └── tables/          # DataTable, Pagination, TableFilters
│   │   ├── repositories/        # Client repository TypeScript interfaces
│   │   ├── server/              # Server-only modules (Protected from client bundling)
│   │   │   ├── apiUtils.ts      # HTTP response helpers (jsonResponse, errorResponse)
│   │   │   ├── auth/            # Password hashing and session management
│   │   │   ├── billing/         # Authoritative financial & inventory logic
│   │   │   │   ├── engine.ts    # POST /api/sales transaction coordinator (finalizeSale, quoteSale)
│   │   │   │   ├── fefo.ts      # Pure First-Expiry-First-Out batch allocation
│   │   │   │   ├── gst.ts       # Indian GST tax computation & bill discount apportionment
│   │   │   │   ├── money.ts     # Integer paise precision arithmetic
│   │   │   │   └── returns.ts   # Sales and purchase returns processor
│   │   │   ├── db/              # Database connection & schema definitions
│   │   │   │   ├── index.ts     # Drizzle client instantiation (postgres.js)
│   │   │   │   ├── mappers.ts   # Row-to-domain object mappers
│   │   │   │   ├── schema.ts    # Complete Drizzle PostgreSQL schema (16 tables)
│   │   │   │   └── sync/outbox.ts# Transactional sync outbox helper (logSyncOutbox)
│   │   │   ├── repositories/    # Concrete Drizzle ORM database repositories
│   │   │   │   ├── batchRepository.ts
│   │   │   │   ├── customerRepository.ts
│   │   │   │   ├── ledgerRepository.ts
│   │   │   │   ├── paymentRepository.ts
│   │   │   │   ├── productRepository.ts
│   │   │   │   ├── purchaseRepository.ts
│   │   │   │   ├── saleRepository.ts
│   │   │   │   └── supplierRepository.ts
│   │   │   └── servicesLocator.ts# Server dependency injection root
│   │   ├── services/            # Client-side business orchestration & API clients
│   │   │   ├── api/             # Fetch wrappers hitting /api/* endpoints
│   │   │   │   ├── batchClient.ts
│   │   │   │   ├── customerClient.ts
│   │   │   │   ├── ledgerClient.ts
│   │   │   │   ├── paymentClient.ts
│   │   │   │   ├── productClient.ts
│   │   │   │   ├── purchaseClient.ts
│   │   │   │   ├── saleClient.ts
│   │   │   │   ├── supplierClient.ts
│   │   │   │   └── unwrap.ts    # API JSON unpacker
│   │   │   ├── batchService.ts
│   │   │   ├── customerService.ts
│   │   │   ├── ledgerService.ts
│   │   │   ├── paymentService.ts
│   │   │   ├── productService.ts
│   │   │   ├── purchaseService.ts
│   │   │   ├── saleService.ts
│   │   │   ├── subscriptionService.ts
│   │   │   └── supplierService.ts
│   │   ├── stores/              # Shared client-side reactive state (Svelte 5 Runes)
│   │   │   ├── appStore.svelte.ts # Global application state (Store info, sync status)
│   │   │   └── toastStore.svelte.ts# Toast notifications
│   │   ├── types/               # Canonical domain TypeScript interfaces
│   │   └── utils/               # Pure formatting utilities (Rupee words, date formatters)
│   └── routes/                  # SvelteKit file-based routing
│       ├── +layout.svelte       # Root layout (Sidebar, Topbar, ToastContainer)
│       ├── +page.svelte         # Landing / redirection root
│       ├── api/                 # REST API endpoints (Server routes)
│       │   ├── batches/         # Batch queries and summary
│       │   ├── customers/       # Customer CRUD and ledger endpoints
│       │   ├── inventory/       # Low stock, near expiry, stock adjustments
│       │   ├── ledger/          # Party ledger queries
│       │   ├── payments/        # Payment receipts and disbursements
│       │   ├── products/        # Product catalog search and CRUD
│       │   ├── purchases/       # Inward purchase orders and GRN
│       │   ├── reports/         # GST, Schedule H1, stock, sales, and ledger reports
│       │   ├── returns/         # Sales and purchase returns
│       │   ├── sales/           # POS quote calculation and sale finalization
│       │   ├── suppliers/       # Supplier master and ledger
│       │   └── sync/            # Asynchronous node outbox pull/push
│       ├── customers/           # Customer management views
│       ├── dashboard/           # Store analytics dashboard
│       ├── inventory/           # Stock, batch, and product catalogs
│       ├── login/               # User authentication view
│       ├── payments/            # Pay / Receive cash flows
│       ├── purchases/           # Supplier inward GRN entry
│       ├── reports/             # Compliance and accounting reports
│       ├── returns/             # Credit notes and returns views
│       ├── sales/               # POS Billing views (new bill, invoice history)
│       ├── settings/            # Store configuration
│       └── suppliers/           # Supplier management views
├── drizzle.config.ts            # Drizzle Kit configuration
├── package.json                 # Node.js project manifest & scripts
├── PRODUCT.md                   # High-level product positioning and brand commitments
├── DESIGN.md                    # Visual design specification & design tokens
├── AGENTS.md                    # Coding conventions & architecture guardrails
└── vite.config.ts               # Vite build configuration (Tailwind, SvelteKit, Reticle)
```

---

## 11. Local LLM Operational Guide & Rules of Thumb

When a local LLM (e.g., Qwen 2.5/3.5 or Gemma 2/4 running on a 16GB Mac) is asked to answer questions, debug, or write code in this repository, it should follow these exact steps:

### 1. Orientation & Search Strategy
- **Do not read whole directories blindly.** In a 16GB context budget, prioritize high-density targeted reads.
- **For domain and architecture questions:** Refer directly to this file (`explain.md`) or query graphify using `graphify query "<topic>"`.
- **For database or schema questions:** Check `src/lib/server/db/schema.ts`.
- **For billing, tax, or stock bugs:** Check `src/lib/server/billing/engine.ts`, `fefo.ts`, `gst.ts`, and `money.ts`.
- **For UI behavior:** Trace from `src/routes/<route>/+page.svelte` $\rightarrow$ `src/lib/services/index.ts` $\rightarrow$ `/api/<route>/+server.ts` $\rightarrow$ `src/lib/server/servicesLocator.ts`.

### 2. Implementation Rules
1. **Never use standard Javascript floating numbers for currency.**
   - Always import `{ toPaise, fromPaise, roundToRupee, percentOf } from '$lib/server/billing/money.js'`.
2. **Never break Schedule H1 compliance.**
   - Do not remove or bypass doctor name, registration number, or patient name validation.
3. **Keep the frontend thin.**
   - In Svelte components (`.svelte`), do not write business formulas for taxes, stock allocations, or ledger balances. The server is the sole financial authority.
4. **Use Svelte 5 Runes syntax:**
   - Write `let count = $state(0)` (NOT `let count = 0` with reactive declarations `$:`).
   - Write `let doubled = $derived(count * 2)`.
   - Write `let { propA, propB } = $props()` (NOT `export let propA`).
5. **Always test non-trivial logic:**
   - Any modification to billing, stock, tax, or returns must have a corresponding test in Vitest (`npm test`).
