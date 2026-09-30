# App Flow Document

**Product:** MedERP | **Version:** 1.0 (Draft) | **Date:** 24 Aug 2026

Step-by-step flows for every core journey. Diagrams use Mermaid syntax (renders in GitHub, VS Code, Obsidian, etc.). Each flow references the functional requirements it satisfies.

---

## 1. Login & Session (FR-AUTH-001–004)

```mermaid
flowchart TD
    A[App launch] --> B{Session token cached & valid?}
    B -- Yes --> C[Go to Dashboard]
    B -- No --> D[Login screen: username + PIN/password]
    D --> E{Store Server reachable on LAN?}
    E -- Yes --> F[Authenticate against Store Server]
    E -- No --> G{Internet reachable?}
    G -- Yes --> H[Authenticate against Cloud node]
    G -- No --> I[Show: cannot connect, retry]
    F --> C
    H --> C
```

## 2. New Retail Sale (walk-in consumer) — FR-SAL-001–009

```mermaid
flowchart TD
    A[Billing screen: New Sale] --> B[Select customer type: Retail]
    B --> C[Search/scan product]
    C --> D[System auto-allocates batch via FEFO]
    D --> E{Enough stock in nearest-expiry batch?}
    E -- No --> F[Split across next batch automatically]
    E -- Yes --> G[Add line item to bill]
    F --> G
    G --> H{More items?}
    H -- Yes --> C
    H -- No --> I[Review bill: line items, GST breakdown, total]
    I --> J[Take payment: cash/UPI, full amount expected for retail]
    J --> K[Finalize: deduct stock, generate invoice number]
    K --> L[Print GST invoice]
```

## 3. New Wholesale Sale (retailer customer, khata-eligible) — FR-SAL-001–007, FR-CUS-002

```mermaid
flowchart TD
    A[Billing screen: New Sale] --> B[Select customer type: Wholesale]
    B --> C[Search/select existing customer or add new]
    C --> D[Search/scan product, FEFO auto-allocation as in Flow 2]
    D --> E[Apply wholesale pricing + any active scheme]
    E --> F{More items?}
    F -- Yes --> D
    F -- No --> G[Review bill: line items, GST breakdown, total]
    G --> H[Record payment: Full / Partial / Full credit]
    H --> I{Partial or full credit?}
    I -- Yes --> J[Unpaid balance posts to customer khata]
    I -- No, fully paid --> K[Finalize: deduct stock, generate invoice]
    J --> K
    K --> L[Print GST invoice]
```

## 4. Purchase Entry / GRN — FR-PUR-001–005

```mermaid
flowchart TD
    A[Purchases: New Purchase] --> B[Select/add supplier]
    B --> C[Enter supplier's invoice ref number + date]
    C --> D[Add line item: product]
    D --> E{Existing batch or new batch?}
    E -- New --> F[Enter batch no., expiry, MRP, purchase price, qty]
    E -- Existing batch no. --> G[Add quantity to existing batch]
    F --> H{More items?}
    G --> H
    H -- Yes --> D
    H -- No --> I[Review purchase total]
    I --> J[Save: batches created/updated, stock increased]
    J --> K[Supplier payable balance increases]
```

## 5. Stock Adjustment — FR-INV-008

```mermaid
flowchart TD
    A[Inventory: select product/batch] --> B[Adjust Stock]
    B --> C[Enter adjustment qty +/- and mandatory reason]
    C --> D{Requires approval? e.g. large adjustment}
    D -- Yes --> E[Owner/Admin confirms]
    D -- No --> F[Apply adjustment]
    E --> F
    F --> G[Audit log entry recorded]
```

## 6. Customer Khata Payment Collection — FR-CUS-003

```mermaid
flowchart TD
    A[Customers: select customer] --> B[View ledger: invoices, prior payments, running balance]
    B --> C[Record Payment]
    C --> D[Enter amount, date, method]
    D --> E[Balance recalculated]
    E --> F[Ledger entry visible immediately to all devices once synced/local-committed]
```

## 7. Sales Return — FR-RET-001

```mermaid
flowchart TD
    A[Sales: locate original invoice] --> B[Select line item(s) to return]
    B --> C[Enter return quantity + reason]
    C --> D{Return value exceeds approval threshold?}
    D -- Yes --> E[Owner/Admin approves]
    D -- No --> F[Process return]
    E --> F
    F --> G[Stock added back to originating batch]
    G --> H{Customer type}
    H -- Wholesale/khata --> I[Khata balance reduced]
    H -- Retail --> J[Refund recorded]
```

## 8. Purchase Return — FR-RET-002

```mermaid
flowchart TD
    A[Purchases: locate original purchase] --> B[Select line item(s) to return]
    B --> C[Enter return quantity + reason]
    C --> D[Batch quantity reduced]
    D --> E[Supplier payable reduced]
```

## 9. End-of-Day / Reporting — FR-RPT-001–007

```mermaid
flowchart TD
    A[Reports screen] --> B[Select report type]
    B --> C{Type}
    C -- GST Summary --> D[Pick date range → GST collected/paid by rate]
    C -- Drug-license Register --> E[Pick date range → batch-level sales/purchase register]
    C -- Stock --> F[Current stock by product/batch + valuation]
    C -- Expiry --> G[Batches expiring within configurable window]
    D --> H[View / export CSV]
    E --> H
    F --> H
    G --> H
```

## 10. Sync / Reconnection Flow — FR-SYNC-001–004

```mermaid
flowchart TD
    A[Store Server loses internet] --> B[All billing/inventory ops continue normally on LAN]
    B --> C[Writes queue in local sync_outbox]
    C --> D{Internet restored?}
    D -- No --> B
    D -- Yes --> E[Outbox worker pushes queued changes to Cloud]
    E --> F[Cloud pulls any changes made by remote/off-LAN devices in the interim]
    F --> G[Deltas replay on both sides — stock/khata/invoice numbers converge per TRD §4]
    G --> H[Sync status indicator updates: 'up to date']
```

---

## Notes for implementers

- Flows 2 and 3 share the same underlying billing engine — the split is customer-type selection at the start plus different pricing/payment rules downstream, not two separate code paths. Keep this unified in the backend to avoid drift.
- FEFO allocation (Flows 2 & 3, step "auto-allocates batch") is the single most safety-critical piece of business logic in the app — it should be one well-tested, shared function, not duplicated per flow.
- Every flow that changes stock, khata, or supplier balances must be wrapped in a single DB transaction — partial application (e.g., stock deducted but invoice not created) is a data-integrity failure per NFR-006.
