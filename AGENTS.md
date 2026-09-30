## Project Configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: prettier, eslint, tailwindcss, vitest

---

# AGENTS.md — build-medical

Wholesale medical/pharmaceutical ERP for inventory, billing, and business management. Inspired by Indian wholesale stockist workflows (Marg/PKS-style systems).

## Stack

- **Framework:** SvelteKit + TypeScript (strict mode)
- **Styling:** Tailwind CSS
- **Icons:** Lucide (lightweight)
- **Desktop:** Tauri-compatible architecture
- **Web:** PWA-compatible
- **Future backend:** Local SQLite → Cloud PostgreSQL with sync

### Prohibited technologies

Do not introduce React, Vue, Angular, Electron, Bootstrap, Material UI, heavy enterprise UI frameworks, unnecessary state-management libraries, unnecessary animation libraries, or any dependency that cannot be justified. Prefer browser-native APIs over library abstractions.

## Architecture

Layered frontend with strict separation:

```
UI (Svelte components)
 ↓
State (Svelte 5 runes / stores)
 ↓
Service (pure TypeScript, no Svelte imports)
 ↓
Repository (interface → mock now, API later)
```

### Layer rules

- **UI** — Svelte components. Read from state, call service methods. No direct data access, no fetch calls, no API URLs, no repository imports.
- **State** — Reactive UI state via Svelte 5 runes (`$state`, `$derived`, `$effect`). Calls services, never repositories.
- **Service** — Business orchestration. Calls repositories. Pure TypeScript. Example: `productService.getProducts()`, `productService.createProduct(data)`.
- **Repository** — Data access behind TypeScript interfaces. Mock implementations now; API implementations later. Swappable without changing UI or service code.

### Directory structure (expected)

```
src/lib/
  types/          # Centralized domain types — one canonical definition per model
  components/     # Reusable UI components
    common/       # Button, Modal, Badge, Toast, EmptyState, LoadingState, ConfirmDialog
    layout/       # Sidebar, Topbar, PageHeader
    tables/       # DataTable, Pagination, TableFilters
    forms/        # ProductForm, CustomerForm, SupplierForm
    billing/      # ProductSearch, InvoiceItemsTable, InvoiceSummary, BatchSelector
    inventory/    # StockBadge, ExpiryBadge, BatchTable
  services/       # Business orchestration
  repositories/   # Repository interfaces
  mock/           # Mock repository implementations + seed data
    data/         # Seed data arrays
  stores/         # Shared reactive state
  utils/          # Pure utility functions
```

Do not define the same interface in multiple files. Domain types (Product, Batch, Customer, Supplier, Sale, SaleItem, Purchase, PurchaseItem, Payment, LedgerEntry, StockAdjustment, User, etc.) belong in `src/lib/types/`.

Mock data belongs in `src/lib/mock/data/`, never inside components.

## Frontend / backend boundary

### Frontend is responsible for

Presentation, user interaction, navigation, form handling, local UI state, loading/empty/error states, basic input validation, displaying backend results, optimistic UI, communicating sync state.

### Frontend is NOT authoritative for

These concerns belong to the future backend. The frontend may display computed previews but must never be the source of truth:

- FEFO (First Expiry First Out)
- GST / tax calculations
- Final invoice totals
- Accounting and ledger calculations
- Stock reconciliation and inventory valuation
- Final payment balances
- Sync conflict resolution

### Money and financial data

This is a financial application. Do not use floating-point arithmetic for authoritative financial calculations. The frontend is not the financial source of truth. When displaying monetary values: use `₹`, right-align in tables, use consistent decimal precision, do not silently round.

## Performance requirements

Target hardware: 4 GB RAM, older CPU, integrated graphics, HDD, 1366x768 display, unstable internet.

Performance is a product requirement, not an optional optimization:

- Minimize JavaScript bundle size
- Avoid unnecessary reactivity and component re-renders
- Avoid giant DOM trees — use virtual scrolling for large tables
- Avoid expensive animations, large media, heavy dependencies
- Prefer CSS and native browser functionality
- Avoid continuously running `$effect` or polling unless explicitly required
- Keep tables efficient and forms responsive

## Design language

Professional modernized business ERP. Not a SaaS dashboard.

- Neutral backgrounds, clear surfaces, subtle borders, consistent spacing
- Readable typography, moderate corner radius, restrained status colors
- Dense information display, especially on desktop
- No giant stat cards, excessive gradients, glassmorphism, neon styling, decorative graphs, or unnecessary animations

Status color semantics (never rely on color alone):

- Green: success / healthy / paid
- Red: error / expired / overdue
- Orange: warning / near expiry
- Blue: information / active
- Gray: neutral / inactive

## Responsive strategy

Desktop is the primary experience: dense data, multi-column forms, tables, keyboard navigation.

Mobile is secondary: touch controls, simplified navigation, stacked forms, readable info.

Do not simply shrink desktop onto mobile. Do not build mobile-only layouts that ignore desktop density.

Target platforms: Windows desktop, Linux desktop, Android, iOS, Web.

## Keyboard-first billing

All billing workflows must be fully operable via keyboard. Important shortcuts:

- `Ctrl/Cmd+K` — global search
- `Ctrl/Cmd+N` — new sale
- `Ctrl/Cmd+S` — save
- `Escape` — close active modal
- `Enter` — confirm/select
- `Tab` — move between fields

Do not override browser/OS shortcuts unnecessarily.

## UI states

Every significant data-driven view must handle: loading, empty, error, and success. Never leave a blank screen. Prefer clear contextual feedback over generic spinners.

Sync states (may be mocked initially): Synced, Offline, Syncing, Pending changes, Sync error.

## Accessibility

Use semantic HTML, labels, keyboard navigation, visible focus, sensible contrast, accessible interactive elements. Accessibility should not require a redesign later.

## Security boundary

The frontend is not trusted. No hardcoded secrets, API credentials, or private keys. Frontend validation is not authorization. Real auth will be handled by the backend.

## Code quality

- Small functions, readable code, predictable naming, explicit types
- Simple logic, reusable services and components
- Comments explain WHY, not WHAT
- No giant components, duplicated types, cryptic names, unnecessary generics, clever one-liners, premature abstractions, dead code

### Developer profile

The primary developer is learning while building with AI assistance. Prioritize readability, predictable structure, simple abstractions, explicit naming, easy debugging, understandable data flow, low cognitive overhead. Avoid clever abstractions that are theoretically elegant but hard to follow.

## AI development workflow

Before making changes:

1. Inspect existing code and understand existing patterns
2. Reuse existing abstractions — do not reinvent
3. Make the smallest coherent change
4. Run relevant checks (`check`, `lint`, `test`)
5. Fix errors before moving on
6. Review the resulting code

Do not rewrite large sections merely because another implementation looks cleaner. Do not invent APIs or files without inspecting what exists. Do not create files unless necessary.

## Development order

Build in small vertical slices:

1. Project foundation and scaffolding
2. Design system / base components
3. Application shell and navigation
4. Dashboard
5. Inventory (products, batches)
6. Customers and suppliers
7. Sales and billing
8. Purchases
9. Payments and ledgers
10. Reports
11. Settings and users
12. Mobile refinement
13. Performance optimization

## Commands

```sh
npm run dev          # SvelteKit dev server
npm run build        # Production build
npm run check        # svelte-check (typecheck + lint)
npm run test         # Vitest (npm run test:unit for watch mode)
npm run lint         # Prettier check + ESLint
npm run format       # Prettier write
```

## Terminology

Use consistent terminology throughout the codebase. Canonical terms:

Sale, Purchase, Customer, Supplier, Product, Batch, Stock, Invoice, Payment, Ledger, Receivable, Payable, GST, HSN, MRP, Expiry, Adjustment

Do not randomly substitute: Client, Buyer, Vendor, Item, Transaction — unless there is a specific reason.

## Domain scope

This is a wholesale inventory and billing ERP. It is NOT a hospital management system, patient record system, prescription manager, or doctor appointment system. Do not add unrelated medical features.

## Dark mode

Support light and dark themes. Light mode is the default. Prioritize readability over aesthetic effects.

## Printing

Invoice, report, ledger, and stock printing will be needed. Keep printing behind a service boundary. Prefer print-friendly CSS layouts. Do not couple printing logic to individual components.

## Unimplemented features

If a feature is not yet implemented, do not leave dead buttons that silently do nothing. Instead show a clear placeholder state (e.g., a modal with "Coming soon" or a disabled state with tooltip). Implement the frontend interaction with mock services so the UI behaves realistically: validate form → show saving state → mock service saves → show success → navigate.

## Mock data scale

Populate mock data with enough volume to test UI properly: ~50 products, ~30 batches, ~20 customers, ~15 suppliers, ~50 sales, ~30 purchases, ~20 payments, plus edge cases (expired batches, zero-stock items, near-expiry items, low-stock products).

## Project configuration

- **Language**: TypeScript
- **Package Manager**: npm
- **Add-ons**: prettier, eslint, tailwindcss, vitest

## Project status

**Phase: Foundation.** SvelteKit scaffolded with TypeScript, Tailwind CSS v4, ESLint, Prettier, Vitest. Svelte 5 runes mode forced via vite config. Building core layout, types, mock data, and initial pages. Update this file as the project evolves.

<!-- reticle:begin (managed by `reticle init` — edit outside these markers) -->

## Verifying with Reticle

This app is instrumented by **Reticle**, an in-app verification layer exposed as `reticle_*` MCP tools and the `npx @reticlehq/server` CLI (always through npx: Reticle's server is not installed into this project). Verifying is part of "done", not an optional extra.

**Verify when you have changed something a user can see or do.** A component, a form, a route, a request, a piece of state that reaches the screen. Do it BEFORE telling the user it is complete. Reading the diff proves nothing and unit tests do not run the app.

**Do not reach for Reticle when the change cannot show up in the running app.** It costs tool calls and the user's patience, and a verdict over an unrelated flow proves nothing about what you changed. Skip it for: documentation, comments, tests, build config, CI, dependency bumps with no user-facing effect, backend or CLI work with no UI surface, and any change to a project that is not a running web app. Say in one line that you skipped verification and why, rather than silently not doing it.

**How to verify:**

- Drive the flow with `reticle_act_and_wait({ ref, action, until })`. It names the consequence you expect BEFORE the action, which is the difference between a check and a rationalisation.
- Batch a multi-step journey (a login, a form) into one `reticle_act_sequence` rather than one round trip per field.
- Read the surrounding evidence with `reticle_snapshot`, `reticle_state`, `reticle_network`, `reticle_console`.
- **Only `reticle_act_and_wait` and `reticle_assert` produce a verdict.** `reticle_act` and everything else move or read the app and prove nothing, so a session ending without one of those two has no result however many tools it used.
- Covered flows: `npx @reticlehq/server gate` reports which recorded flows the changed files affect and whether they still pass.

**Nothing connected? Get the app running.**

**If no dev server is listening, start one yourself.** Read the project's own dev script out of `package.json` (`dev`, `start`, whatever this project calls it), run it in the BACKGROUND, tell the user in one line that it is running and how to stop it, then carry on. Stopping to ask is how a verification turn ends with nothing verified.

Five guards, none optional:

1. **Never start a second one.** If something is already listening on the app's port, use it.
2. **Never guess the command.** It comes from `package.json` scripts. If there is no recognisable dev script, say so and stop rather than inventing one.
3. **Never kill anything.** Not a dev server, not a daemon, not a port holder — including one you started.
4. **Background it, and say so.** The user must know a server is running and how to stop it. A dev server the human does not know about is the same failure one step later.
5. **The permission prompt belongs to your host.** Never try to bypass, suppress or auto-approve it, and take a refusal as the answer.

A dev server that is already running does not pick up an edited build config or a newly created plugin file — restart it and hard-reload the tab. And if a server IS listening and still nothing connects, the cause is the SDK not loading in the page, not a missing dev server; do not tell the user to start one they are already running.

**Honesty, which is the whole point:**

- **`verified: "unknown"` is not a pass.** It means Reticle drove the app and could not tell what happened; `verifiedReason` says which clause decided that. Report it as unknown, never as working.
- **Never weaken a check to make it green.** Downgrading, skipping or deleting an assertion is a finding, not a fix.
- **If Reticle cannot run** (no daemon, or this is not a running web app), say so. Do not skip verification silently.
- **Setup is not finished until one real flow has been driven and produced a verdict.** `init` exiting 0, the tools appearing, and a session being listed are all things that happen before anything has been verified.

**The `/reticle` skill runs this whole loop for you** — detect, connect, drive one flow, report. If your client does not have it, install it once: `/plugin marketplace add reticlehq/reticle` then `/plugin install reticle@reticlehq` in Claude Code, or `npx skills add reticlehq/reticle` anywhere the skills CLI works.

**Report Reticle's own defects with `reticle_feedback` the moment you notice**, then carry on with your task. You are the user Reticle is built for and the only one who can say what it cost you, and that knowledge is gone when your context is.

📄 **The rest is in [RETICLE.md](./RETICLE.md): what to do when the tools are missing, when a result carries `version_skew` or `update_available`, when `reticle_state` comes back empty, and how to write a feedback report that can be acted on. Read it when you hit one of those, not before.**
<!-- reticle:end -->
