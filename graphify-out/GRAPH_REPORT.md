# Graph Report - build-medical  (2026-10-08)

## Corpus Check
- 252 files · ~163,903 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 1095 nodes · 2546 edges · 79 communities (53 shown, 26 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 45 edges (avg confidence: 0.9)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `c7e6d1c0`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- types/index.ts
- engine.ts
- appStore.svelte.ts
- errorResponse
- servicesLocator.ts
- Batch
- customers/+page.svelte
- devDependencies
- purchases/new/+page.svelte
- Sale
- schema.ts
- 3. Phased Implementation Roadmap
- svelte
- package.json
- toastStore.svelte.ts
- Supplier
- Customer
- Purchase
- generate.js
- logout/+page.server.ts
- compilerOptions
- MedStock ERP Project
- Product
- returns/+page.svelte
- Product Requirements Document
- scripts
- 6.2 Complete Table-by-Table Reference
- Software Requirements Specification
- services/index.ts
- $app/navigation
- Implementation Plan
- eslint.config.js
- MedStock ERP — Technical & Domain Architecture Guide (`explain.md`)
- 2. Operating Context & Domain Foundations (The "WHY")
- dependencies
- 3. System Architecture & Deployment Topology (The "HOW")
- common/index.ts
- batches Table
- Technical Requirements Document
- Layered Frontend Architecture
- The Clinical Console Design System
- Dashboard View (1366px)
- UI/UX Specification
- vite.config.ts
- Sub-Second Speed Principle
- prettier.config.js
- Sidebar Navigation
- app.d.ts
- Dark Mode Support
- sv
- drizzle-kit
- @reticlehq/browser
- api-scaffold.sh
- Low-End Hardware Target
- Purchase GRN Flow
- Sales Return Flow
- audit_log Table
- NUMERIC for Money/Quantity
- returns / return_items Tables
- UUID Primary Keys Convention
- Idempotency-Key Header
- Graphify Knowledge Graph
- Flat Hairline Rule
- Tabular Money Rule
- Zero Compliance Compromise Principle
- Svelte Logo Favicon
- 5. Codebase Layering & Strict Separation of Concerns
- 8. UI/UX Ergonomics & "The Clinical Console" Design System
- 1. Executive Summary & High-Level Purpose
- 4. Technology Stack & Architectural Guardrails
- api/sales/+server.ts
- sales/[id]/+page.svelte
- ref_types
- inventoryService
- customers/[id]/ledger/+server.ts

## God Nodes (most connected - your core abstractions)
1. `errorResponse()` - 50 edges
2. `jsonResponse()` - 48 edges
3. `@sveltejs/kit` - 38 edges
4. `drizzle-orm` - 38 edges
5. `db` - 35 edges
6. `logSyncOutbox()` - 34 edges
7. `Sale` - 27 edges
8. `Batch` - 24 edges
9. `Purchase` - 24 edges
10. `storesTable` - 18 edges

## Surprising Connections (you probably didn't know these)
- `2.3 Indian GST Tax Architecture (HSN, CGST, SGST, IGST)` --references--> `roundToRupee()`  [INFERRED]
  explain.md → src/lib/utils/money.ts
- `Rules Enforced by `allocateFefo`:` --references--> `allocateFefo()`  [INFERRED]
  explain.md → src/lib/server/billing/fefo.ts
- `5.2 Client Services vs. Server Services Disambiguation` --references--> `DbProductRepository`  [INFERRED]
  explain.md → src/lib/server/repositories/productRepository.ts
- `5.2 Client Services vs. Server Services Disambiguation` --references--> `DbSaleRepository`  [INFERRED]
  explain.md → src/lib/server/repositories/saleRepository.ts
- `MedERP Working Name` --semantically_similar_to--> `MedStock ERP Project`  [INFERRED] [semantically similar]
  build-med-plans/00-README-Index.md → AGENTS.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **MedStock ERP UI Screens** — screenshots_dashboard_1366_dashboard_view, screenshots_dashboard_1920_dashboard_view, screenshots_new_product_1366_product_form, screenshots_purchase_failure_purchase_entry [EXTRACTED 0.95]
- **MedERP Documentation Suite** — build_med_plans_01_prd, build_med_plans_02_srs, build_med_plans_03_trd, build_med_plans_04_app_flows, build_med_plans_05_uiux_spec, build_med_plans_06_backend_schema, build_med_plans_07_api_spec, build_med_plans_08_implementation_plan [EXTRACTED 1.00]
- **FEFO Billing and Stock Management System** — agents_fefo, build_med_plans_06_batches_table, build_med_plans_06_batch_stock_events_table, build_med_plans_07_sales_quote_endpoint, build_med_plans_04_retail_sale_flow [INFERRED 0.85]
- **Store Server Sync Architecture** — build_med_plans_03_store_server_model, build_med_plans_03_outbox_sync, build_med_plans_03_delta_stock_reconciliation, build_med_plans_06_sync_outbox_table, build_med_plans_07_sync_api [INFERRED 0.85]

## Communities (79 total, 26 thin omitted)

### Community 0 - "types/index.ts"
Cohesion: 0.05
Nodes (40): vitest, LedgerRepository, PaymentRepository, DbLedgerRepository, DbPaymentRepository, QuoteSaleInput, saleService, createLedgerService() (+32 more)

### Community 1 - "engine.ts"
Cohesion: 0.07
Nodes (51): 7.1 Sub-Second POS Sale Finalization (`finalizeSale`), 7.2 Pure FEFO Allocation Algorithm (`allocateFefo`), 7.3 Exact Financial Math & Rounding Engine (`money.ts` & `gst.ts`), 7.4 Append-Only Stock Movements (`batch_stock_events`), 7.5 Sales & Purchase Returns (`returns.ts`), 7.6 Dual-Party Khata Ledger Balancing, 7. Core Workflows & Algorithmic Engines, Detailed Transaction Steps: (+43 more)

### Community 2 - "appStore.svelte.ts"
Cohesion: 0.07
Nodes (21): DEFAULT_ACTIVE_SUBSCRIPTION, DEFAULT_EXPIRED_SUBSCRIPTION, SUBSCRIPTION_PLANS, subscriptionService, applyTheme(), currentSubscription, getSubscription(), lastSyncAt (+13 more)

### Community 3 - "errorResponse"
Cohesion: 0.16
Nodes (22): errorResponse(), jsonResponse(), supplierService, GET(), PATCH(), GET(), POST(), GET() (+14 more)

### Community 4 - "servicesLocator.ts"
Cohesion: 0.07
Nodes (11): batchRepo, customerRepo, ledgerRepo, paymentRepo, paymentService, productRepo, purchaseRepo, purchaseService (+3 more)

### Community 5 - "Batch"
Cohesion: 0.15
Nodes (8): BatchRepository, mapToBatch(), computeBatchStatus(), DbBatchRepository, createBatchService(), Batch, BatchStatus, CreateBatchInput

### Community 6 - "customers/+page.svelte"
Cohesion: 0.08
Nodes (17): filteredCustomers, paginatedCustomers, totalOutstanding, totalPages, filteredProducts, h1Products, paginatedProducts, totalPages (+9 more)

### Community 7 - "devDependencies"
Cohesion: 0.07
Nodes (29): devDependencies, drizzle-kit, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-svelte, globals, @playwright/test (+21 more)

### Community 8 - "purchases/new/+page.svelte"
Cohesion: 0.24
Nodes (3): cyclePaymentType(), handleSavePurchase(), handleWindowKeydown()

### Community 9 - "Sale"
Cohesion: 0.15
Nodes (6): SaleRepository, DbSaleRepository, mapSaleRow(), createSaleService(), CreateSaleInput, Sale

### Community 10 - "schema.ts"
Cohesion: 0.06
Nodes (75): ref_app, bcryptjs, ref_crypto, drizzle-orm, ref_env, @sveltejs/kit, ref_types_js, uuid (+67 more)

### Community 11 - "3. Phased Implementation Roadmap"
Cohesion: 0.09
Nodes (22): 1. Executive Diagnosis: Why the Current Build is Not Commercial-Grade, 2.1 The Ergonomic 65/35 POS Screen Division, 2.2 Global Keyboard Ergonomics Matrix, 2.3 Visual Design Tokens & Clinical Styling System, 2. Target UI/UX Architecture: "The Clinical Console v2", 3. Phased Implementation Roadmap, 4. Immediate Next Steps & Execution Order, Detailed Tasks: (+14 more)

### Community 12 - "svelte"
Cohesion: 0.08
Nodes (7): index(), formatDate(), numberToWordsRupees(), handleKeydown(), exportToCSV(), ./$types.js, svelte

### Community 13 - "package.json"
Cohesion: 0.09
Nodes (22): name, private, type, version, dotenv, @lucide/svelte, @playwright/test, postgres (+14 more)

### Community 14 - "toastStore.svelte.ts"
Cohesion: 0.09
Nodes (12): addToast(), generateId(), removeToast(), Toast, toasts, ToastType, handleSave(), now (+4 more)

### Community 15 - "Supplier"
Cohesion: 0.18
Nodes (6): SupplierRepository, mapToSupplier(), DbSupplierRepository, createSupplierService(), CreateSupplierInput, Supplier

### Community 16 - "Customer"
Cohesion: 0.18
Nodes (6): CustomerRepository, mapToCustomer(), DbCustomerRepository, createCustomerService(), CreateCustomerInput, Customer

### Community 17 - "Purchase"
Cohesion: 0.18
Nodes (7): PurchaseRepository, DbPurchaseRepository, mapPurchaseRow(), createPurchaseService(), CreatePurchaseInput, Purchase, PaymentStatus

### Community 18 - "generate.js"
Cohesion: 0.10
Nodes (14): better-sqlite3, ref_fs, ref_path, ref_src_lib_mock_data_customers_js, ref_src_lib_mock_data_purchases_js, ref_src_lib_mock_data_sales_js, ref_src_lib_mock_data_suppliers_js, text (+6 more)

### Community 21 - "logout/+page.server.ts"
Cohesion: 0.60
Nodes (4): invalidateSession(), actions, clearSession(), load()

### Community 24 - "compilerOptions"
Cohesion: 0.14
Nodes (13): ./.svelte-kit/tsconfig.json, compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule (+5 more)

### Community 25 - "MedStock ERP Project"
Cohesion: 0.15
Nodes (15): FEFO (First Expiry First Out), GST Tax Calculations, MedStock ERP Project, SvelteKit Framework, Tailwind CSS, Tauri Desktop Shell, MedERP Working Name, POST /sales/quote Endpoint (+7 more)

### Community 26 - "Product"
Cohesion: 0.20
Nodes (6): ProductRepository, mapToProduct(), DbProductRepository, createProductService(), CreateProductInput, Product

### Community 27 - "returns/+page.svelte"
Cohesion: 0.17
Nodes (9): filteredReturns, loading, purchaseReturns, purchaseReturnsVal, salesReturns, salesReturnsVal, searchQuery, totalCount (+1 more)

### Community 28 - "Product Requirements Document"
Cohesion: 0.18
Nodes (11): Biller/Counter Staff Persona, Khata Credit Ledger, Owner/Admin Persona, Product Requirements Document, Store Server (Local Primary), Store Server Deployment Model, Wholesale Sale Flow, customers Table (+3 more)

### Community 29 - "scripts"
Cohesion: 0.18
Nodes (11): scripts, build, check, check:watch, dev, format, lint, prepare (+3 more)

### Community 30 - "6.2 Complete Table-by-Table Reference"
Cohesion: 0.12
Nodes (17): 10. `purchases` & `purchase_items`, 11. `sales` & `sale_items`, 12. `payments`, 13. `returns` & `return_items`, 14. `invoice_sequences`, 15. `audit_log`, 16. `sync_outbox`, 1. `stores` (+9 more)

### Community 31 - "Software Requirements Specification"
Cohesion: 0.27
Nodes (10): Documentation Set Index, Multi-Device Concurrent Billing, Role-Based Access Control, Software Requirements Specification, App Flow Document, Backend Schema Document, API Specification, REST API Contract (+2 more)

### Community 32 - "services/index.ts"
Cohesion: 0.25
Nodes (9): batchService, inventoryService, customerService, ledgerService, paymentService, productService, purchaseService, supplierService (+1 more)

### Community 34 - "Implementation Plan"
Cohesion: 0.22
Nodes (9): Ballia Store (Target Deployment), Sync Engine Module, Outbox Sync Pattern, Sync Reconnection Flow, sync_outbox Table, Implementation Plan, Phase 0: Frontend Foundation (Complete), Phase 5: Sync Engine (+1 more)

### Community 35 - "eslint.config.js"
Cohesion: 0.22
Nodes (8): gitignorePath, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-svelte, globals, ref_node_path, typescript-eslint

### Community 36 - "MedStock ERP — Technical & Domain Architecture Guide (`explain.md`)"
Cohesion: 0.22
Nodes (8): 10. Directory Structure & File Inventory, 11. Local LLM Operational Guide & Rules of Thumb, 1. Orientation & Search Strategy, 2. Implementation Rules, 6.1 Global Schema Conventions & Sync Columns, 6. Exhaustive Database Schema (PostgreSQL + Drizzle ORM), 9. Authentication, Sessions & Security Boundary, MedStock ERP — Technical & Domain Architecture Guide (`explain.md`)

### Community 37 - "2. Operating Context & Domain Foundations (The "WHY")"
Cohesion: 0.33
Nodes (6): 2.1 Indian Pharmaceutical Regulatory Framework (Schedule H/H1/X & Rule 65), 2.2 FEFO vs. FIFO Inventory Management, 2.3 Indian GST Tax Architecture (HSN, CGST, SGST, IGST), 2.4 Pharmaceutical Multi-Tier Pricing (MRP, PTR, PTS, Unit Packaging), 2.5 The B2B Khata (Credit Ledger) System, 2. Operating Context & Domain Foundations (The "WHY")

### Community 38 - "dependencies"
Cohesion: 0.25
Nodes (8): dependencies, bcryptjs, better-sqlite3, dotenv, drizzle-orm, @lucide/svelte, postgres, uuid

### Community 39 - "3. System Architecture & Deployment Topology (The "HOW")"
Cohesion: 0.33
Nodes (6): 3.1 The Store Server Model (Local Primary + Cloud Replica), 3.2 Offline-First LAN Operation vs. Internet Disruption, 3.3 Transactional Outbox Sync Engine, 3.4 Conflict Resolution & Delta-Based Stock Reconciliation, 3.5 Non-Colliding Distributed Invoice Numbering, 3. System Architecture & Deployment Topology (The "HOW")

### Community 40 - "common/index.ts"
Cohesion: 0.09
Nodes (9): batch(), DrugSchedule, filteredBatches, paginatedBatches, totalMrpValuation, totalPages, totalStockValuation, ./$types (+1 more)

### Community 41 - "batches Table"
Cohesion: 0.29
Nodes (7): Batch-Level Stock Tracking, Delta-Based Stock Reconciliation, batch_stock_events Table, batches Table, products Table, stores Table, users Table

### Community 42 - "Technical Requirements Document"
Cohesion: 0.29
Nodes (7): Invoice Numbering Strategy, Node.js TypeScript Backend, Optimistic Concurrency Control, PostgreSQL Database, Technical Requirements Document, invoice_sequences Table, Docker Compose PostgreSQL Service

### Community 43 - "Layered Frontend Architecture"
Cohesion: 0.53
Nodes (6): Layered Frontend Architecture, Mock Data Layer, Repository Layer (Interfaces), Service Layer (Pure TypeScript), State Layer (Svelte 5 Runes), UI Layer (Svelte Components)

### Community 44 - "The Clinical Console Design System"
Cohesion: 0.33
Nodes (6): The Clinical Console Design System, Clinical Teal Primary Color, POS Grid Layout (65/35 Split), Schedule H1 Narcotic Violet, Statutory Violet Rule, Schedule H/H1/X Drug Compliance

### Community 45 - "Dashboard View (1366px)"
Cohesion: 0.40
Nodes (5): Dashboard View (1366px), KPI Summary Cards, Quick Actions Panel, Stock Alerts Panel, Dashboard View (1920px)

### Community 46 - "UI/UX Specification"
Cohesion: 0.50
Nodes (4): Retail Sale Flow, Billing / New Sale Screen, Dashboard Screen, UI/UX Specification

### Community 47 - "vite.config.ts"
Cohesion: 0.50
Nodes (3): @reticlehq/vite-plugin, @sveltejs/adapter-auto, @tailwindcss/vite

### Community 48 - "Sub-Second Speed Principle"
Cohesion: 0.67
Nodes (3): Keyboard-First Billing, Speed Over Polish Principle, Sub-Second Speed Principle

### Community 50 - "Sidebar Navigation"
Cohesion: 0.67
Nodes (3): Sidebar Navigation, New Product Form, Purchase Entry Form

### Community 54 - "sv"
Cohesion: 0.40
Nodes (4): Building, Creating a project, Developing, sv

### Community 74 - "5. Codebase Layering & Strict Separation of Concerns"
Cohesion: 0.50
Nodes (4): 5.1 The 4-Tier Layer Rule, 5.2 Client Services vs. Server Services Disambiguation, 5.3 Svelte 5 Runes State Architecture, 5. Codebase Layering & Strict Separation of Concerns

### Community 75 - "8. UI/UX Ergonomics & "The Clinical Console" Design System"
Cohesion: 0.50
Nodes (4): 8.1 Keyboard-First Ergonomics & Shortcuts, 8.2 Visual Palette & Status Semantics, 8.3 65/35 POS Screen Division, 8. UI/UX Ergonomics & "The Clinical Console" Design System

### Community 76 - "1. Executive Summary & High-Level Purpose"
Cohesion: 0.67
Nodes (3): 1. Executive Summary & High-Level Purpose, What it does:, Why generic POS / ERP software fails in this domain:

### Community 77 - "4. Technology Stack & Architectural Guardrails"
Cohesion: 0.67
Nodes (3): 4.1 Core Technologies, 4.2 Prohibited Technologies & Anti-Patterns, 4. Technology Stack & Architectural Guardrails

### Community 78 - "api/sales/+server.ts"
Cohesion: 0.27
Nodes (8): EngineLineInput, SaleInput, POST(), todayIso(), finalizeLegacy(), isLegacyPayload(), POST(), todayIso()

### Community 80 - "ref_types"
Cohesion: 0.22
Nodes (6): ref_types, productService, GET(), PATCH(), GET(), POST()

### Community 82 - "customers/[id]/ledger/+server.ts"
Cohesion: 0.25
Nodes (3): customerService, ledgerService, GET()

## Knowledge Gaps
- **287 isolated node(s):** `gitignorePath`, `name`, `private`, `version`, `type` (+282 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 429 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **26 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `drizzle-orm` connect `schema.ts` to `engine.ts`, `generate.js`, `package.json`?**
  _High betweenness centrality (0.089) - this node is a cross-community bridge._
- **Why does `finalizeSale()` connect `engine.ts` to `schema.ts`, `api/sales/+server.ts`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `MedStock ERP — Technical & Domain Architecture Guide (`explain.md`)` connect `MedStock ERP — Technical & Domain Architecture Guide (`explain.md`)` to `engine.ts`, `2. Operating Context & Domain Foundations (The "WHY")`, `3. System Architecture & Deployment Topology (The "HOW")`, `5. Codebase Layering & Strict Separation of Concerns`, `8. UI/UX Ergonomics & "The Clinical Console" Design System`, `1. Executive Summary & High-Level Purpose`, `4. Technology Stack & Architectural Guardrails`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **What connects `gitignorePath`, `name`, `private` to the rest of the system?**
  _287 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `types/index.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.0531883632089333 - nodes in this community are weakly interconnected._
- **Should `engine.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07213114754098361 - nodes in this community are weakly interconnected._
- **Should `appStore.svelte.ts` be split into smaller, more focused modules?**
  _Cohesion score 0.07171717171717172 - nodes in this community are weakly interconnected._