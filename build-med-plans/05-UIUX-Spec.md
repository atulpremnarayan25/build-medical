# UI/UX Specification

**Product:** MedERP | **Version:** 1.0 (Draft) | **Date:** 24 Aug 2026

This documents the intended UI/UX for the modules already scaffolded on mock data (Dashboard, Inventory, Sales, Customers, Suppliers, Purchases) plus the modules still to be added (Returns, Reports, Settings). Use this to bring the real backend-connected UI in line with a consistent system, and to build the remaining screens.

---

## 1. Design Principles

1. **Speed over polish.** This is a counter-billing tool used dozens of times a day by staff who are not tech enthusiasts. Every extra click in the billing flow has a daily cost. Optimize for keyboard-driven, minimal-click workflows on desktop.
2. **Never let ambiguity reach the biller.** FEFO batch selection, stock availability, and pricing should be resolved by the system and shown clearly — not left for the biller to figure out.
3. **Low-resource by default.** No heavy animations, no large unoptimized images, no auto-refreshing dashboards that re-render constantly — this runs on old hardware (NFR-002/004).
4. **Same information architecture, two densities.** Desktop shows information-dense tables and side panels; mobile condenses to single-column, card-based views with bottom navigation. Same modules, same data, different layout — not a reduced feature set.

## 2. Design Tokens

**[ASSUMPTION — proposed system, adjust to match anything already built]**

| Token                         | Value                                                  | Use                                             |
| ----------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| Primary                       | `#0F766E` (teal-700)                                   | Primary actions, active nav                     |
| Primary-hover                 | `#0D5F58`                                              | Hover/pressed state                             |
| Danger                        | `#DC2626`                                              | Expired stock flags, delete/void, overdue khata |
| Warning                       | `#D97706`                                              | Near-expiry, low-stock, pending-sync            |
| Success                       | `#16A34A`                                              | Paid/settled, in-stock, sync complete           |
| Neutral-900 / 700 / 400 / 100 | `#111827` / `#374151` / `#9CA3AF` / `#F3F4F6`          | Text / secondary text / muted / backgrounds     |
| Font — UI                     | Inter or system-ui stack                               | Body text, tables                               |
| Font — numerals in bills      | Tabular figures (`font-variant-numeric: tabular-nums`) | Prices/quantities align in columns              |
| Spacing scale                 | 4 / 8 / 12 / 16 / 24 / 32 px                           | Consistent padding/margins                      |
| Radius                        | 6px (inputs/buttons), 10px (cards)                     | —                                               |

## 3. Navigation / Information Architecture

**Desktop:** persistent left sidebar — Dashboard, Sales/Billing, Inventory, Purchases, Customers, Suppliers, Returns, Reports, Settings. Billing opens as a focused full-width view (minimal chrome) since it's the highest-frequency screen.

**Mobile:** bottom nav with the 4–5 most-used (Billing, Inventory, Customers, Dashboard), rest under a "More" sheet.

## 4. Screen-by-Screen Specification

### 4.1 Dashboard

- **Purpose:** at-a-glance store health.
- **Key components:** today's sales total, outstanding khata total (across customers), low-stock count, near-expiry count, quick links into each alert.
- **States:** loading (skeleton, not spinner — cheaper to render), empty (new store, no data yet), populated.
- **Performance note:** pull these as pre-aggregated queries, not client-side computed from full record sets (NFR-001 adjacent).

### 4.2 Billing / New Sale

- **Purpose:** the core, highest-frequency screen (App Flow §2–3).
- **Key components:**
  - Customer-type toggle (Retail / Wholesale) at the top, changes downstream pricing/payment behavior.
  - Product search bar (autofocus on screen entry; accepts barcode scan input directly).
  - Line-item table: product, batch/expiry (shown, not hidden — biller should see what's being sold), qty, unit, rate, GST, line total. Editable qty inline.
  - Running totals panel: subtotal, GST breakdown, grand total — always visible, doesn't require scrolling.
  - Payment panel: amount tendered, change (retail) or paid/partial/credit split (wholesale).
  - Primary action: **Finalize & Print**, large and unambiguous.
- **States:** empty bill, mid-bill (unsaved), stock-insufficient warning inline on a line item, finalized (read-only, print/reprint available).
- **Keyboard shortcuts [ASSUMPTION, define exact bindings during build]:** add line, focus search, finalize bill — minimize mouse dependency for trained staff.

### 4.3 Inventory

- **Purpose:** product + batch management.
- **Key components:** product list (search/filter by name/category/manufacturer/barcode), per-product detail showing all batches with expiry/qty/MRP, near-expiry and low-stock visual flags (warning/danger tokens), Add Product, Add/Adjust Stock actions.
- **States:** empty (no products yet), filtered-empty (search with no match), populated.

### 4.4 Purchases

- **Purpose:** GRN entry against suppliers (App Flow §4).
- **Key components:** purchase list (by supplier/date), New Purchase form (supplier select, invoice ref, line items each resolving to a batch — new or existing), running purchase total.
- **States:** draft (in-progress entry), saved.

### 4.5 Customers

- **Purpose:** customer master + khata ledger (App Flow §6).
- **Key components:** customer list with running balance column (sortable — overdue customers surface first), customer detail: profile, full ledger (invoices + payments chronologically), Record Payment action, outstanding balance prominent.
- **States:** zero-balance (settled) vs. balance-due (visually flagged with warning/danger token by age of due, if aging is tracked).

### 4.6 Suppliers

- **Purpose:** supplier master + payable ledger — mirrors Customers structurally.
- **Key components:** supplier list with payable balance, detail view with purchase + payment history.

### 4.7 Returns _(new screen)_

- **Purpose:** sales and purchase returns (App Flow §7–8).
- **Key components:** "Return from Invoice" / "Return from Purchase" entry points, invoice/purchase lookup, line-item selection with return-quantity input, reason field (required), approval indicator when over threshold.

### 4.8 Reports _(new screen)_

- **Purpose:** statutory + operational reporting (App Flow §9).
- **Key components:** report-type selector, date-range picker, tabular result with export action, print-friendly layout for GST/drug-license registers specifically (these may need to be shown to an inspector).

### 4.9 Settings _(new screen)_

- **Purpose:** store profile, GST/HSN config, users, thresholds, sync status.
- **Key components:** sectioned form (Store Profile, GST/Tax, Users & Roles, Thresholds, Invoice Template, Sync & Backup Status). Owner/Admin only — enforce both in UI (hide) and API (NFR-012).

## 5. Responsive Behavior

| Aspect       | Desktop                                           | Mobile                                                                                                                    |
| ------------ | ------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Layout       | Sidebar + content, multi-column tables            | Bottom nav, single column, card lists instead of dense tables                                                             |
| Billing      | Side-by-side line items + totals panel            | Stacked: line items scroll, totals panel pinned to bottom                                                                 |
| Data density | Full tables with all columns                      | Cards showing 2–3 key fields, tap for detail                                                                              |
| Input        | Keyboard-first, barcode scanner as keyboard input | Touch-first, larger tap targets, camera-based barcode scan **[ASSUMPTION, if device camera used for scanning on mobile]** |

## 6. Accessibility & Low-End-Hardware UI Notes

- Minimize animation; where used, keep under ~150ms and skip entirely on low-power-mode detection if feasible.
- No infinite-scroll re-render storms — paginate long lists (product catalog, customer list, invoice history).
- High-contrast text (meet at least WCAG AA contrast) since counters are often in bright, harsh lighting.
- Large enough tap targets on mobile (44px minimum) for a busy counter environment.

## 7. Empty/Loading/Error State Standard

Every list/table screen needs, at minimum: a loading skeleton (not a spinner — perceived performance matters more on slow hardware), an empty state with a clear next action, and an error state that distinguishes "no internet, but local data is fine" from "something actually broke" — this distinction matters a lot given the offline-first architecture (TRD §3–4) and should never alarm a biller just because the Store Server is temporarily cloud-disconnected.
