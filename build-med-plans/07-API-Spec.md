# API Specification

**Product:** MedERP | **Version:** 1.0 (Draft) | **Date:** 24 Aug 2026
**Base:** REST over HTTPS. Same contract served by the Store Server (LAN) and the Cloud node (remote) — clients don't need to know which one they're talking to beyond the base URL they're configured with.

## 0. Conventions

- **Auth:** `Authorization: Bearer <token>` on every endpoint except `POST /auth/login`. Token obtained per TRD §6.
- **Response envelope:**

```json
{ "data": { ... }, "error": null }
```

on error:

```json
{ "data": null, "error": { "code": "OUT_OF_STOCK", "message": "..." } }
```

- **Pagination:** `?page=1&pageSize=50` on all list endpoints; response includes `{ "data": [...], "meta": { "total": N, "page": 1, "pageSize": 50 } }`.
- **Role enforcement:** every endpoint below notes minimum role. Enforced server-side (NFR-012) regardless of what the UI shows.
- **Idempotency:** write endpoints that create financial/stock records (`POST /sales`, `POST /purchases`, `POST /returns`, `POST /payments`) accept an optional `Idempotency-Key` header so a retried request (e.g. after a flaky LAN blip) doesn't double-create a bill.

## 1. Auth (`AUTH`)

| Method | Path           | Role        | Notes                                              |
| ------ | -------------- | ----------- | -------------------------------------------------- |
| POST   | `/auth/login`  | —           | body: `{ username, password }` → `{ token, user }` |
| POST   | `/auth/logout` | any         | invalidates token                                  |
| GET    | `/auth/me`     | any         | current user + role                                |
| POST   | `/users`       | owner_admin | create user (FR-SET-004)                           |
| PATCH  | `/users/:id`   | owner_admin | disable/reset/reassign role                        |
| GET    | `/users`       | owner_admin | list                                               |

## 2. Products & Inventory (`INV`)

| Method | Path                                    | Role                         | Notes                                                                |
| ------ | --------------------------------------- | ---------------------------- | -------------------------------------------------------------------- |
| GET    | `/products`                             | any                          | search via `?q=`, filter `?category=`, `?barcode=` (FR-INV-009/010)  |
| GET    | `/products/:id`                         | any                          | includes `product_units` and current batch summary                   |
| POST   | `/products`                             | owner_admin                  | create product + units                                               |
| PATCH  | `/products/:id`                         | owner_admin                  | edit product/units                                                   |
| GET    | `/products/:id/batches`                 | any                          | batch list, ordered by expiry (FEFO view)                            |
| POST   | `/products/:id/batches/:batchId/adjust` | any (approval per threshold) | body: `{ delta, reason }` → writes `batch_stock_events` (FR-INV-008) |
| GET    | `/inventory/low-stock`                  | any                          | dashboard alert feed (FR-INV-006)                                    |
| GET    | `/inventory/near-expiry?days=90`        | any                          | dashboard alert feed                                                 |

## 3. Purchases (`PUR`)

| Method | Path             | Role                                        | Notes                                                                                                                           |
| ------ | ---------------- | ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------- |
| GET    | `/purchases`     | any                                         | filter by supplier/date                                                                                                         |
| GET    | `/purchases/:id` | any                                         | full detail incl. items                                                                                                         |
| POST   | `/purchases`     | owner_admin (biller view-only per SRS §2.3) | body: supplier, invoice ref/date, line items (new-or-existing batch) — creates/updates batches transactionally (FR-PUR-001/002) |

## 4. Sales / Billing (`SAL`)

| Method | Path               | Role | Notes                                                                                                                                                                                                                                   |
| ------ | ------------------ | ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/sales/quote`     | any  | **not persisted** — given a customer type + line items, returns FEFO-allocated batches, pricing, GST breakdown, so the UI can show a live-updating bill before finalizing                                                               |
| POST   | `/sales`           | any  | finalizes the bill: allocates stock (with concurrency check, TRD §5), generates invoice number (§13 of schema doc), records payment status. Body includes the same line items as `/sales/quote`. Returns the full invoice for printing. |
| GET    | `/sales`           | any  | list, filter by date/customer/type                                                                                                                                                                                                      |
| GET    | `/sales/:id`       | any  | full invoice detail                                                                                                                                                                                                                     |
| GET    | `/sales/:id/print` | any  | returns print-ready invoice payload (or PDF, per print-layer decision in TRD §8)                                                                                                                                                        |

## 5. Customers (`CUS`)

| Method | Path                    | Role | Notes                                                                               |
| ------ | ----------------------- | ---- | ----------------------------------------------------------------------------------- |
| GET    | `/customers`            | any  | sortable by balance (UI §4.5)                                                       |
| GET    | `/customers/:id`        | any  | profile + derived khata balance                                                     |
| GET    | `/customers/:id/ledger` | any  | chronological invoices + payments (FR-CUS-004)                                      |
| POST   | `/customers`            | any  | create                                                                              |
| PATCH  | `/customers/:id`        | any  | edit                                                                                |
| POST   | `/payments`             | any  | body: `{ direction: "customer_payment", customer_id, amount, method }` (FR-CUS-003) |

## 6. Suppliers (`SUP`)

| Method | Path                    | Role        | Notes                                                                  |
| ------ | ----------------------- | ----------- | ---------------------------------------------------------------------- |
| GET    | `/suppliers`            | any         |                                                                        |
| GET    | `/suppliers/:id`        | any         | profile + derived payable balance                                      |
| GET    | `/suppliers/:id/ledger` | any         | purchases + payments                                                   |
| POST   | `/suppliers`            | owner_admin |                                                                        |
| POST   | `/payments`             | owner_admin | body: `{ direction: "supplier_payment", supplier_id, amount, method }` |

## 7. Returns (`RET`)

| Method | Path           | Role                         | Notes                                                                                                                       |
| ------ | -------------- | ---------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| POST   | `/returns`     | any (approval per threshold) | body: `return_type`, original sale/purchase id, line items + reason. Reverses stock/ledger transactionally (FR-RET-001/002) |
| GET    | `/returns`     | any                          | list                                                                                                                        |
| GET    | `/returns/:id` | any                          | detail                                                                                                                      |

## 8. Reports (`RPT`)

| Method | Path                                        | Role        | Notes            |
| ------ | ------------------------------------------- | ----------- | ---------------- |
| GET    | `/reports/gst-summary?from=&to=`            | owner_admin | FR-RPT-001       |
| GET    | `/reports/drug-license-register?from=&to=`  | owner_admin | FR-RPT-002       |
| GET    | `/reports/stock?asOf=`                      | any         | FR-RPT-003       |
| GET    | `/reports/near-expiry?days=`                | any         | FR-RPT-004       |
| GET    | `/reports/sales-summary?from=&to=&groupBy=` | owner_admin | FR-RPT-005       |
| GET    | `/reports/audit-log?entityType=&from=&to=`  | owner_admin | FR-RPT-006       |
| GET    | `/reports/:type/export`                     | owner_admin | CSV (FR-RPT-007) |

## 9. Settings (`SET`)

| Method | Path                    | Role        | Notes                                                        |
| ------ | ----------------------- | ----------- | ------------------------------------------------------------ |
| GET    | `/settings`             | any (read)  | key-value settings for the store                             |
| PATCH  | `/settings`             | owner_admin | update thresholds, GST/HSN defaults, invoice template fields |
| GET    | `/settings/sync-status` | any         | last sync time, pending outbox count (FR-SET-005)            |

## 10. Sync (`SYNC`) — internal, node-to-node

Not called by the frontend directly; used by the Store Server ↔ Cloud sync worker (TRD §4).

| Method | Path                       | Notes                                                                                                                |
| ------ | -------------------------- | -------------------------------------------------------------------------------------------------------------------- |
| POST   | `/sync/push`               | receiving node accepts a batch of outbox entries, applies deltas per TRD §4.2, returns per-entry ack/conflict status |
| GET    | `/sync/pull?since=`        | returns outbox entries generated on this node since a given timestamp, for the other node to apply                   |
| GET    | `/sync/invoice-range/next` | Cloud node requests its next reserved invoice-number block from the Store Server (§4.3) when running low, if online  |

## 11. Error Codes (non-exhaustive, extend as needed)

| Code                              | Meaning                                                                                                                                                   |
| --------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `OUT_OF_STOCK`                    | Requested quantity exceeds available (non-expired) stock across all batches                                                                               |
| `EXPIRED_BATCH_OVERRIDE_REQUIRED` | Attempted sale would draw from an expired batch without Owner/Admin override (FR-INV-005)                                                                 |
| `STALE_WRITE`                     | Optimistic concurrency check failed (`sync_version` mismatch) — client should refetch and retry                                                           |
| `APPROVAL_REQUIRED`               | Action (return/adjustment) exceeds configured threshold and needs Owner/Admin approval                                                                    |
| `INVOICE_NUMBER_EXHAUSTED`        | Node's reserved invoice-number block is exhausted and it can't reach the allocator — surfaces as "reconnect to Store Server/internet to continue billing" |
