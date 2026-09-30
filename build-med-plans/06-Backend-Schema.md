# Backend Schema Document

**Product:** MedERP | **Version:** 1.0 (Draft) | **Date:** 24 Aug 2026
**DB:** PostgreSQL (identical schema on Store Server and Cloud node, per TRD §3–4)

## 0. Cross-cutting conventions

- **Primary keys:** `UUID` (generated client- or server-side via `gen_random_uuid()`) on every table — not auto-increment integers. This matters specifically because two nodes (Store Server, Cloud) can both create rows independently; UUIDs avoid PK collisions that sequential integers would cause across nodes.
- **Sync columns**, present on every syncable table:
  - `updated_at TIMESTAMPTZ NOT NULL DEFAULT now()`
  - `origin_node TEXT NOT NULL` — which node (`store_server` / `cloud`) created/last touched this row; used by sync logic (TRD §4).
  - `sync_version INTEGER NOT NULL DEFAULT 1` — incremented on every update; used for optimistic-concurrency checks.
  - `is_deleted BOOLEAN NOT NULL DEFAULT false` — soft delete only; nothing is hard-deleted, so sync/audit history stays intact.
- **Money/quantity columns:** `NUMERIC`, never `FLOAT`, to avoid rounding errors in GST and stock math.
- **Every write-heavy business table** (batches, sales, purchases, payments) has a corresponding `audit_log` entry (see §12) rather than embedding audit fields in every table individually.

---

## 1. `stores`

**[ASSUMPTION]** included now for forward-compatibility with multi-branch/e-commerce, even though v1 UX assumes exactly one row.

| Column            | Type        | Notes                                                                   |
| ----------------- | ----------- | ----------------------------------------------------------------------- |
| id                | UUID PK     |                                                                         |
| name              | TEXT        |                                                                         |
| address           | TEXT        |                                                                         |
| gstin             | TEXT        |                                                                         |
| drug_license_no   | TEXT        |                                                                         |
| drug_license_no_2 | TEXT        | nullable — stores often hold two licenses (e.g. allopathic + Ayurvedic) |
| created_at        | TIMESTAMPTZ |                                                                         |

## 2. `users`

| Column        | Type             | Notes                                       |
| ------------- | ---------------- | ------------------------------------------- |
| id            | UUID PK          |                                             |
| store_id      | UUID FK → stores |                                             |
| name          | TEXT             |                                             |
| username      | TEXT UNIQUE      |                                             |
| password_hash | TEXT             | bcrypt/argon2, NFR-010                      |
| role          | TEXT             | `owner_admin` \| `biller` (v1.1: `manager`) |
| is_active     | BOOLEAN          | disable instead of delete                   |
| created_at    | TIMESTAMPTZ      |                                             |

Index: `username` unique.

## 3. `products`

| Column            | Type    | Notes                                          |
| ----------------- | ------- | ---------------------------------------------- |
| id                | UUID PK |                                                |
| store_id          | UUID FK |                                                |
| name              | TEXT    |                                                |
| category          | TEXT    |                                                |
| manufacturer      | TEXT    |                                                |
| hsn_code          | TEXT    | for GST (FR-SET-002)                           |
| gst_rate          | NUMERIC | percentage, e.g. 12.00                         |
| base_unit         | TEXT    | e.g. "Tablet"                                  |
| barcode           | TEXT    | nullable, indexed for scan lookup (FR-INV-010) |
| reorder_threshold | NUMERIC | nullable, low-stock alert (FR-INV-006)         |
| is_active         | BOOLEAN |                                                |
| + sync columns    |         |                                                |

Indexes: `name` (trigram/GIN for search, FR-INV-009), `barcode` (unique where not null).

## 4. `product_units`

Multi-unit conversion (FR-INV-001).

| Column             | Type               | Notes                        |
| ------------------ | ------------------ | ---------------------------- |
| id                 | UUID PK            |                              |
| product_id         | UUID FK → products |                              |
| unit_name          | TEXT               | e.g. "Strip", "Box"          |
| conversion_to_base | NUMERIC            | e.g. Strip = 10 base units   |
| wholesale_price    | NUMERIC            | per this unit                |
| retail_price       | NUMERIC            | per this unit                |
| is_base_unit       | BOOLEAN            | exactly one true per product |

## 5. `batches`

| Column             | Type                | Notes                                                                                                            |
| ------------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------- |
| id                 | UUID PK             |                                                                                                                  |
| product_id         | UUID FK → products  |                                                                                                                  |
| batch_no           | TEXT                | as printed on the pack                                                                                           |
| expiry_date        | DATE                | drives FEFO, FR-INV-004                                                                                          |
| mrp                | NUMERIC             |                                                                                                                  |
| purchase_price     | NUMERIC             | per base unit                                                                                                    |
| quantity_received  | NUMERIC             | original received qty, base unit                                                                                 |
| quantity_remaining | NUMERIC             | **derived** — see `batch_stock_events` below; kept as a maintained column for fast reads, reconciled from events |
| supplier_id        | UUID FK → suppliers | which purchase this batch came from                                                                              |
| purchase_id        | UUID FK → purchases | nullable link to originating GRN                                                                                 |
| + sync columns     |                     |                                                                                                                  |

Indexes: `(product_id, expiry_date)` — this is _the_ FEFO query, must be fast. `expiry_date` alone for expiry reports.

## 6. `batch_stock_events`

**This table is the actual source of truth for stock** — `batches.quantity_remaining` is a maintained cache recomputed from this log, so concurrent stock changes from different nodes replay as deltas rather than overwriting each other (TRD §4.2).

| Column       | Type              | Notes                                                                          |
| ------------ | ----------------- | ------------------------------------------------------------------------------ |
| id           | UUID PK           |                                                                                |
| batch_id     | UUID FK → batches |                                                                                |
| delta        | NUMERIC           | positive (purchase, return-in) or negative (sale, return-out, adjustment-down) |
| event_type   | TEXT              | `purchase` \| `sale` \| `sales_return` \| `purchase_return` \| `adjustment`    |
| reference_id | UUID              | nullable — FK to the sale/purchase/return/adjustment row that caused this      |
| reason       | TEXT              | required for `adjustment` (FR-INV-008)                                         |
| created_by   | UUID FK → users   |                                                                                |
| created_at   | TIMESTAMPTZ       |                                                                                |
| origin_node  | TEXT              |                                                                                |

Index: `batch_id, created_at`.

## 7. `suppliers`

| Column         | Type    | Notes |
| -------------- | ------- | ----- |
| id             | UUID PK |       |
| store_id       | UUID FK |       |
| name           | TEXT    |       |
| contact_phone  | TEXT    |       |
| address        | TEXT    |       |
| gstin          | TEXT    |       |
| + sync columns |         |       |

Payable balance is **derived** (sum of purchases − sum of supplier payments − purchase-return credits), not stored redundantly, to avoid drift — computed via a view or query, not a stale column.

## 8. `customers`

| Column         | Type    | Notes                        |
| -------------- | ------- | ---------------------------- |
| id             | UUID PK |                              |
| store_id       | UUID FK |                              |
| name           | TEXT    |                              |
| contact_phone  | TEXT    |                              |
| address        | TEXT    |                              |
| gstin          | TEXT    | nullable, wholesale/B2B only |
| customer_type  | TEXT    | `wholesale` \| `retail`      |
| credit_limit   | NUMERIC | nullable (FR-CUS-005)        |
| + sync columns |         |                              |

Khata balance likewise **derived** (sum of sale amounts − sum of customer payments − sales-return credits) — see §11 for how payments are recorded.

## 9. `purchases` / `purchase_items`

**purchases**

| Column                | Type                | Notes                                   |
| --------------------- | ------------------- | --------------------------------------- |
| id                    | UUID PK             |                                         |
| store_id              | UUID FK             |                                         |
| supplier_id           | UUID FK → suppliers |                                         |
| supplier_invoice_ref  | TEXT                | supplier's own bill number (FR-PUR-003) |
| supplier_invoice_date | DATE                |                                         |
| total_amount          | NUMERIC             |                                         |
| created_by            | UUID FK → users     |                                         |
| created_at            | TIMESTAMPTZ         |                                         |
| + sync columns        |                     |                                         |

**purchase_items**

| Column         | Type                | Notes                                 |
| -------------- | ------------------- | ------------------------------------- |
| id             | UUID PK             |                                       |
| purchase_id    | UUID FK → purchases |                                       |
| batch_id       | UUID FK → batches   | new or existing batch created/updated |
| quantity       | NUMERIC             | base unit                             |
| purchase_price | NUMERIC             |                                       |

## 10. `sales` / `sale_items`

**sales**

| Column              | Type                | Notes                                                  |
| ------------------- | ------------------- | ------------------------------------------------------ |
| id                  | UUID PK             |                                                        |
| store_id            | UUID FK             |                                                        |
| invoice_number      | TEXT UNIQUE         | see §13 invoice_sequences                              |
| customer_id         | UUID FK → customers | nullable for anonymous retail walk-in **[ASSUMPTION]** |
| sale_type           | TEXT                | `wholesale` \| `retail`                                |
| subtotal            | NUMERIC             |                                                        |
| gst_amount          | NUMERIC             |                                                        |
| total_amount        | NUMERIC             |                                                        |
| amount_paid_at_sale | NUMERIC             | may be less than total (khata case)                    |
| payment_status      | TEXT                | `paid` \| `partial` \| `credit`                        |
| created_by          | UUID FK → users     |                                                        |
| created_at          | TIMESTAMPTZ         |                                                        |
| + sync columns      |                     |                                                        |

**sale_items**

| Column         | Type                    | Notes                                                                                                                                         |
| -------------- | ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| id             | UUID PK                 |                                                                                                                                               |
| sale_id        | UUID FK → sales         |                                                                                                                                               |
| product_id     | UUID FK → products      |                                                                                                                                               |
| batch_id       | UUID FK → batches       | which batch this line drew from — a single "logical" line may expand to multiple `sale_items` rows if FEFO split across batches (App Flow §2) |
| unit_id        | UUID FK → product_units | which unit (strip/box/etc.) was sold                                                                                                          |
| quantity       | NUMERIC                 | in the sold unit                                                                                                                              |
| rate           | NUMERIC                 | price per unit at time of sale (snapshot — never recompute historical bills from current pricing)                                             |
| gst_rate       | NUMERIC                 | snapshot                                                                                                                                      |
| line_total     | NUMERIC                 |                                                                                                                                               |
| scheme_applied | TEXT                    | nullable description, e.g. "10+1 free" (FR-SAL-004)                                                                                           |

Index: `sales(customer_id, created_at)` for khata ledger views; `sales(invoice_number)` unique.

## 11. `payments`

Covers both customer khata payments and supplier payments in one table, distinguished by direction — **[ASSUMPTION]** simpler than two near-identical tables.

| Column          | Type                | Notes                                                                     |
| --------------- | ------------------- | ------------------------------------------------------------------------- |
| id              | UUID PK             |                                                                           |
| store_id        | UUID FK             |                                                                           |
| direction       | TEXT                | `customer_payment` (money in) \| `supplier_payment` (money out)           |
| customer_id     | UUID FK → customers | nullable                                                                  |
| supplier_id     | UUID FK → suppliers | nullable                                                                  |
| amount          | NUMERIC             |                                                                           |
| method          | TEXT                | `cash` \| `upi` \| `bank_transfer` \| `other`                             |
| related_sale_id | UUID FK → sales     | nullable — set when payment is taken at time of billing rather than later |
| notes           | TEXT                |                                                                           |
| created_by      | UUID FK → users     |                                                                           |
| created_at      | TIMESTAMPTZ         |                                                                           |

## 12. `returns` / `return_items`

**returns**

| Column               | Type                | Notes                                             |
| -------------------- | ------------------- | ------------------------------------------------- |
| id                   | UUID PK             |                                                   |
| return_type          | TEXT                | `sales_return` \| `purchase_return`               |
| original_sale_id     | UUID FK → sales     | nullable                                          |
| original_purchase_id | UUID FK → purchases | nullable                                          |
| reason               | TEXT                | required                                          |
| approved_by          | UUID FK → users     | nullable, required if over threshold (FR-RET-003) |
| created_by           | UUID FK → users     |                                                   |
| created_at           | TIMESTAMPTZ         |                                                   |

**return_items**

| Column      | Type              | Notes |
| ----------- | ----------------- | ----- |
| id          | UUID PK           |       |
| return_id   | UUID FK → returns |       |
| batch_id    | UUID FK → batches |       |
| quantity    | NUMERIC           |       |
| line_amount | NUMERIC           |       |

## 13. `invoice_sequences`

Backs FR-SAL-008/NFR-009 — see TRD §4.3 for the numbering strategy this table implements.

| Column       | Type        | Notes                                              |
| ------------ | ----------- | -------------------------------------------------- |
| id           | UUID PK     |                                                    |
| store_id     | UUID FK     |                                                    |
| node_id      | TEXT        | `store_server` or a specific cloud-node identifier |
| range_start  | BIGINT      |                                                    |
| range_end    | BIGINT      |                                                    |
| next_value   | BIGINT      |                                                    |
| allocated_at | TIMESTAMPTZ |                                                    |

Node pulls a fresh range when `next_value` approaches `range_end`; guarantees no two nodes ever hand out the same invoice number.

## 14. `audit_log`

| Column       | Type            | Notes                                                     |
| ------------ | --------------- | --------------------------------------------------------- |
| id           | UUID PK         |                                                           |
| store_id     | UUID FK         |                                                           |
| entity_type  | TEXT            | e.g. `sale`, `batch`, `customer`                          |
| entity_id    | UUID            |                                                           |
| action       | TEXT            | `create` \| `update` \| `delete` \| `adjust` \| `approve` |
| performed_by | UUID FK → users |                                                           |
| before_value | JSONB           | nullable snapshot                                         |
| after_value  | JSONB           | nullable snapshot                                         |
| created_at   | TIMESTAMPTZ     |                                                           |

Satisfies FR-RPT-006; also doubles as the "prior version" record referenced in TRD §4.2's last-writer-wins rule.

## 15. `settings`

Key-value store for configurable thresholds/rules (FR-SET-002/006, NFR-016), scoped per store.

| Column   | Type    | Notes                                                                       |
| -------- | ------- | --------------------------------------------------------------------------- |
| id       | UUID PK |                                                                             |
| store_id | UUID FK |                                                                             |
| key      | TEXT    | e.g. `near_expiry_days`, `return_approval_threshold`, `invoice_footer_text` |
| value    | JSONB   |                                                                             |

Unique on `(store_id, key)`.

## 16. `sync_outbox`

Implements TRD §4.1.

| Column      | Type        | Notes                               |
| ----------- | ----------- | ----------------------------------- |
| id          | UUID PK     |                                     |
| table_name  | TEXT        |                                     |
| row_id      | UUID        |                                     |
| operation   | TEXT        | `insert` \| `update` \| `delete`    |
| payload     | JSONB       |                                     |
| created_at  | TIMESTAMPTZ |                                     |
| sent_at     | TIMESTAMPTZ | nullable — null means still pending |
| target_node | TEXT        |                                     |

Index: `(target_node, sent_at)` where `sent_at IS NULL` — the worker's main query.

---

## 17. Entity Relationship Summary

```
stores 1─* users
stores 1─* products 1─* product_units
products 1─* batches 1─* batch_stock_events
suppliers 1─* purchases 1─* purchase_items ──> batches
customers 1─* sales 1─* sale_items ──> batches, product_units
sales/purchases 1─* returns 1─* return_items ──> batches
customers/suppliers 1─* payments
stores 1─* invoice_sequences, settings, audit_log, sync_outbox
```

## 18. Key Business-Logic Queries (for implementer reference)

- **FEFO batch selection for a product:** `SELECT * FROM batches WHERE product_id = ? AND quantity_remaining > 0 AND expiry_date > CURRENT_DATE ORDER BY expiry_date ASC` — this is the single most important query in the system; index per §5 makes it cheap.
- **Current stock for a product:** `SELECT SUM(quantity_remaining) FROM batches WHERE product_id = ?`.
- **Customer khata balance:** `SUM(sales.total_amount WHERE customer_id=?) - SUM(payments.amount WHERE direction='customer_payment' AND customer_id=?) - SUM(sales-return credits)`.
- **Supplier payable balance:** mirror of the above with `purchases`/`supplier_payment`/purchase-return credits.
