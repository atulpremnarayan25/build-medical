# Graph Report - build-medical  (2026-09-30)

## Corpus Check
- 240 files · ~125,279 words
- Verdict: corpus is large enough that graph structure adds value.
- Unclassified: 4 file(s) not represented in the graph (top: (none) 2, .example 1, .css 1)

## Summary
- 951 nodes · 2187 edges · 74 communities (45 shown, 29 thin omitted)
- Extraction: 98% EXTRACTED · 2% INFERRED · 0% AMBIGUOUS · INFERRED: 37 edges (avg confidence: 0.88)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Payment Repository Layer
- Billing Engine & Tests
- Subscription Service
- API Route Handlers
- Service Locator
- Batch Repository
- Customer List UI
- Dev Dependencies
- Auth & Session
- Sale Repository
- DB Schema Definitions
- Purchase Repository
- Billing UI Components
- Package Config
- Toast & Forms
- Customer Repository
- Supplier Repository
- Product Repository
- Legacy Scripts
- Returns & Schema Tables
- DB Connection
- Ledger Repository
- Common UI Components
- Search & Forms
- TypeScript Config
- Agent Definitions
- Utility Formatters
- Returns Page
- PRD Personas
- NPM Scripts
- Batch & Expiry UI
- SRS Requirements
- Schema Table Defs
- Payment API Routes
- Plan Documents Index
- ESLint Config
- Layout Components
- Batch API Routes
- Runtime Dependencies
- Seed Script
- Customer Ledger API
- Batch Tracking Spec
- TRD Architecture
- Architecture Layer Spec
- Design System
- Dashboard Screenshots
- UI/UX Spec
- Vite Config
- Speed Principles
- Prettier Config
- Product & Purchase Screenshots
- App Type Definitions
- Dark Mode
- Reticle Verification
- Drizzle Config
- Reticle Browser SDK
- API Scaffold Script
- Hardware Target
- Purchase GRN Flow
- Sales Return Flow
- Audit Log
- Numeric Money
- Returns Schema
- UUID Keys
- Idempotency
- Graphify Config
- Flat Hairline Rule
- Tabular Money Rule
- Compliance
- Favicon

## God Nodes (most connected - your core abstractions)
1. `errorResponse()` - 41 edges
2. `jsonResponse()` - 39 edges
3. `@sveltejs/kit` - 35 edges
4. `drizzle-orm` - 29 edges
5. `logSyncOutbox()` - 28 edges
6. `Sale` - 26 edges
7. `db` - 24 edges
8. `Batch` - 24 edges
9. `Purchase` - 23 edges
10. `Customer` - 18 edges

## Surprising Connections (you probably didn't know these)
- `MedERP Working Name` --semantically_similar_to--> `MedStock ERP Project`  [INFERRED] [semantically similar]
  build-med-plans/00-README-Index.md → AGENTS.md
- `MedStock ERP Product Definition` --semantically_similar_to--> `MedStock ERP Project`  [INFERRED] [semantically similar]
  PRODUCT.md → AGENTS.md
- `Sub-Second Speed Principle` --semantically_similar_to--> `Keyboard-First Billing`  [INFERRED] [semantically similar]
  PRODUCT.md → AGENTS.md
- `Schedule H1 Narcotic Violet` --semantically_similar_to--> `Schedule H/H1/X Drug Compliance`  [INFERRED] [semantically similar]
  DESIGN.md → PRODUCT.md
- `Speed Over Polish Principle` --semantically_similar_to--> `Sub-Second Speed Principle`  [INFERRED] [semantically similar]
  build-med-plans/05-UIUX-Spec.md → PRODUCT.md

## Import Cycles
- None detected.

## Hyperedges (group relationships)
- **FEFO Billing and Stock Management System** — agents_fefo, build_med_plans_06_batches_table, build_med_plans_06_batch_stock_events_table, build_med_plans_07_sales_quote_endpoint, build_med_plans_04_retail_sale_flow [INFERRED 0.85]
- **Store Server Sync Architecture** — build_med_plans_03_store_server_model, build_med_plans_03_outbox_sync, build_med_plans_03_delta_stock_reconciliation, build_med_plans_06_sync_outbox_table, build_med_plans_07_sync_api [INFERRED 0.85]
- **MedERP Documentation Suite** — build_med_plans_01_prd, build_med_plans_02_srs, build_med_plans_03_trd, build_med_plans_04_app_flows, build_med_plans_05_uiux_spec, build_med_plans_06_backend_schema, build_med_plans_07_api_spec, build_med_plans_08_implementation_plan [EXTRACTED 1.00]
- **MedStock ERP UI Screens** — screenshots_dashboard_1366_dashboard_view, screenshots_dashboard_1920_dashboard_view, screenshots_new_product_1366_product_form, screenshots_purchase_failure_purchase_entry [EXTRACTED 0.95]

## Communities (74 total, 29 thin omitted)

### Community 0 - "Payment Repository Layer"
Cohesion: 0.06
Nodes (41): PaymentRepository, DbPaymentRepository, batchService, inventoryService, customerService, ledgerService, paymentService, productService (+33 more)

### Community 1 - "Billing Engine & Tests"
Cohesion: 0.08
Nodes (48): vitest, aggregateTotals(), BillingError, EngineLineInput, Executor, FinalizeOptions, finalizeSale(), InvoiceItemPayload (+40 more)

### Community 2 - "Subscription Service"
Cohesion: 0.07
Nodes (21): DEFAULT_ACTIVE_SUBSCRIPTION, DEFAULT_EXPIRED_SUBSCRIPTION, SUBSCRIPTION_PLANS, subscriptionService, applyTheme(), currentSubscription, getSubscription(), lastSyncAt (+13 more)

### Community 3 - "API Route Handlers"
Cohesion: 0.14
Nodes (26): ref_types, errorResponse(), jsonResponse(), productService, supplierService, GET(), PATCH(), GET() (+18 more)

### Community 4 - "Service Locator"
Cohesion: 0.09
Nodes (15): batchRepo, customerRepo, ledgerRepo, paymentRepo, productRepo, purchaseRepo, purchaseService, saleRepo (+7 more)

### Community 5 - "Batch Repository"
Cohesion: 0.15
Nodes (8): BatchRepository, mapToBatch(), computeBatchStatus(), DbBatchRepository, createBatchService(), Batch, BatchStatus, CreateBatchInput

### Community 6 - "Customer List UI"
Cohesion: 0.08
Nodes (17): filteredCustomers, paginatedCustomers, totalOutstanding, totalPages, filteredProducts, h1Products, paginatedProducts, totalPages (+9 more)

### Community 7 - "Dev Dependencies"
Cohesion: 0.07
Nodes (29): devDependencies, drizzle-kit, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-svelte, globals, @playwright/test (+21 more)

### Community 8 - "Auth & Session"
Cohesion: 0.11
Nodes (17): ref_app, bcryptjs, ref_crypto, @sveltejs/kit, handle(), createSession(), hashPassword(), invalidateSession() (+9 more)

### Community 9 - "Sale Repository"
Cohesion: 0.15
Nodes (5): SaleRepository, DbSaleRepository, mapSaleRow(), CreateSaleInput, Sale

### Community 10 - "DB Schema Definitions"
Cohesion: 0.08
Nodes (24): ref_env, AuditLogEntry, auditLogTable, Batch, BatchStockEvent, createdAt, Customer, InvoiceSequence (+16 more)

### Community 11 - "Purchase Repository"
Cohesion: 0.18
Nodes (7): PurchaseRepository, DbPurchaseRepository, mapPurchaseRow(), createPurchaseService(), CreatePurchaseInput, Purchase, PaymentStatus

### Community 12 - "Billing UI Components"
Cohesion: 0.14
Nodes (3): index(), handleKeydown(), svelte

### Community 13 - "Package Config"
Cohesion: 0.09
Nodes (22): name, private, type, version, dotenv, @lucide/svelte, @playwright/test, postgres (+14 more)

### Community 14 - "Toast & Forms"
Cohesion: 0.13
Nodes (9): addToast(), generateId(), removeToast(), Toast, toasts, ToastType, cyclePaymentType(), handleSavePurchase() (+1 more)

### Community 15 - "Customer Repository"
Cohesion: 0.19
Nodes (5): CustomerRepository, mapToCustomer(), DbCustomerRepository, CreateCustomerInput, Customer

### Community 16 - "Supplier Repository"
Cohesion: 0.19
Nodes (5): SupplierRepository, mapToSupplier(), DbSupplierRepository, CreateSupplierInput, Supplier

### Community 17 - "Product Repository"
Cohesion: 0.20
Nodes (6): ProductRepository, mapToProduct(), DbProductRepository, createProductService(), CreateProductInput, Product

### Community 18 - "Legacy Scripts"
Cohesion: 0.10
Nodes (14): better-sqlite3, ref_fs, ref_path, ref_src_lib_mock_data_customers_js, ref_src_lib_mock_data_purchases_js, ref_src_lib_mock_data_sales_js, ref_src_lib_mock_data_suppliers_js, text (+6 more)

### Community 19 - "Returns & Schema Tables"
Cohesion: 0.23
Nodes (12): processReturn(), batchesTable, batchStockEventsTable, productsTable, purchaseItemsTable, purchasesTable, returnItemsTable, returnsTable (+4 more)

### Community 20 - "DB Connection"
Cohesion: 0.24
Nodes (7): drizzle-orm, uuid, client, db, productUnitsTable, suppliersTable, tableMap

### Community 21 - "Ledger Repository"
Cohesion: 0.23
Nodes (5): LedgerRepository, DbLedgerRepository, CreateLedgerEntryInput, LedgerEntry, LedgerEntryType

### Community 24 - "TypeScript Config"
Cohesion: 0.14
Nodes (13): ./.svelte-kit/tsconfig.json, compilerOptions, allowJs, checkJs, esModuleInterop, forceConsistentCasingInFileNames, moduleResolution, resolveJsonModule (+5 more)

### Community 25 - "Agent Definitions"
Cohesion: 0.18
Nodes (13): FEFO (First Expiry First Out), GST Tax Calculations, MedStock ERP Project, SvelteKit Framework, Tailwind CSS, Tauri Desktop Shell, MedERP Working Name, POST /sales/quote Endpoint (+5 more)

### Community 26 - "Utility Formatters"
Cohesion: 0.18
Nodes (3): formatDate(), numberToWordsRupees(), exportToCSV()

### Community 27 - "Returns Page"
Cohesion: 0.17
Nodes (9): filteredReturns, loading, purchaseReturns, purchaseReturnsVal, salesReturns, salesReturnsVal, searchQuery, totalCount (+1 more)

### Community 28 - "PRD Personas"
Cohesion: 0.18
Nodes (11): Biller/Counter Staff Persona, Khata Credit Ledger, Owner/Admin Persona, Product Requirements Document, Store Server (Local Primary), Store Server Deployment Model, Wholesale Sale Flow, customers Table (+3 more)

### Community 29 - "NPM Scripts"
Cohesion: 0.18
Nodes (11): scripts, build, check, check:watch, dev, format, lint, prepare (+3 more)

### Community 30 - "Batch & Expiry UI"
Cohesion: 0.20
Nodes (6): batch(), filteredBatches, paginatedBatches, totalMrpValuation, totalPages, totalStockValuation

### Community 31 - "SRS Requirements"
Cohesion: 0.22
Nodes (10): Multi-Device Concurrent Billing, Role-Based Access Control, Software Requirements Specification, Sync Engine Module, Outbox Sync Pattern, Sync Reconnection Flow, sync_outbox Table, API Specification (+2 more)

### Community 32 - "Schema Table Defs"
Cohesion: 0.22
Nodes (4): customersTable, paymentsTable, saleItemsTable, usersTable

### Community 34 - "Plan Documents Index"
Cohesion: 0.25
Nodes (9): Ballia Store (Target Deployment), Documentation Set Index, App Flow Document, Backend Schema Document, Implementation Plan, Phase 0: Frontend Foundation (Complete), Phase 1: Backend Foundation, Phase 5: Sync Engine (+1 more)

### Community 35 - "ESLint Config"
Cohesion: 0.22
Nodes (8): gitignorePath, eslint, eslint-config-prettier, @eslint/js, eslint-plugin-svelte, globals, ref_node_path, typescript-eslint

### Community 38 - "Runtime Dependencies"
Cohesion: 0.25
Nodes (8): dependencies, bcryptjs, better-sqlite3, dotenv, drizzle-orm, @lucide/svelte, postgres, uuid

### Community 39 - "Seed Script"
Cohesion: 0.32
Nodes (7): isoDate(), masterPasswordHash, money(), PRODUCTS, ProductSeed, seedDb(), invoiceSequencesTable

### Community 40 - "Customer Ledger API"
Cohesion: 0.25
Nodes (3): customerService, ledgerService, GET()

### Community 41 - "Batch Tracking Spec"
Cohesion: 0.29
Nodes (7): Batch-Level Stock Tracking, Delta-Based Stock Reconciliation, batch_stock_events Table, batches Table, products Table, stores Table, users Table

### Community 42 - "TRD Architecture"
Cohesion: 0.29
Nodes (7): Invoice Numbering Strategy, Node.js TypeScript Backend, Optimistic Concurrency Control, PostgreSQL Database, Technical Requirements Document, invoice_sequences Table, Docker Compose PostgreSQL Service

### Community 43 - "Architecture Layer Spec"
Cohesion: 0.53
Nodes (6): Layered Frontend Architecture, Mock Data Layer, Repository Layer (Interfaces), Service Layer (Pure TypeScript), State Layer (Svelte 5 Runes), UI Layer (Svelte Components)

### Community 44 - "Design System"
Cohesion: 0.33
Nodes (6): The Clinical Console Design System, Clinical Teal Primary Color, POS Grid Layout (65/35 Split), Schedule H1 Narcotic Violet, Statutory Violet Rule, Schedule H/H1/X Drug Compliance

### Community 45 - "Dashboard Screenshots"
Cohesion: 0.40
Nodes (5): Dashboard View (1366px), KPI Summary Cards, Quick Actions Panel, Stock Alerts Panel, Dashboard View (1920px)

### Community 46 - "UI/UX Spec"
Cohesion: 0.50
Nodes (4): Retail Sale Flow, Billing / New Sale Screen, Dashboard Screen, UI/UX Specification

### Community 47 - "Vite Config"
Cohesion: 0.50
Nodes (3): @reticlehq/vite-plugin, @sveltejs/adapter-auto, @tailwindcss/vite

### Community 48 - "Speed Principles"
Cohesion: 0.67
Nodes (3): Keyboard-First Billing, Speed Over Polish Principle, Sub-Second Speed Principle

### Community 50 - "Product & Purchase Screenshots"
Cohesion: 0.67
Nodes (3): Sidebar Navigation, New Product Form, Purchase Entry Form

## Knowledge Gaps
- **224 isolated node(s):** `gitignorePath`, `name`, `private`, `version`, `type` (+219 more)
  These have ≤1 connection - possible missing edges or undocumented components. (Counts symbols only; 347 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **29 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `drizzle-orm` connect `DB Connection` to `Payment Repository Layer`, `Billing Engine & Tests`, `Schema Table Defs`, `Seed Script`, `Auth & Session`, `DB Schema Definitions`, `Package Config`, `Legacy Scripts`, `Returns & Schema Tables`, `Ledger Repository`?**
  _High betweenness centrality (0.106) - this node is a cross-community bridge._
- **Why does `devDependencies` connect `Dev Dependencies` to `Package Config`?**
  _High betweenness centrality (0.050) - this node is a cross-community bridge._
- **Why does `@sveltejs/kit` connect `Auth & Session` to `Schema Table Defs`, `Payment API Routes`, `Billing Engine & Tests`, `API Route Handlers`, `Service Locator`, `Batch API Routes`, `Customer Ledger API`, `DB Schema Definitions`, `Package Config`, `Vite Config`, `Returns & Schema Tables`, `DB Connection`?**
  _High betweenness centrality (0.046) - this node is a cross-community bridge._
- **What connects `gitignorePath`, `name`, `private` to the rest of the system?**
  _224 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Payment Repository Layer` be split into smaller, more focused modules?**
  _Cohesion score 0.055135135135135134 - nodes in this community are weakly interconnected._
- **Should `Billing Engine & Tests` be split into smaller, more focused modules?**
  _Cohesion score 0.07740112994350283 - nodes in this community are weakly interconnected._
- **Should `Subscription Service` be split into smaller, more focused modules?**
  _Cohesion score 0.07171717171717172 - nodes in this community are weakly interconnected._