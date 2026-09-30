# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Pharmacists, POS billing clerks, store managers, and wholesale distribution operators working in high-rush pharmacy counters and pharmaceutical stockist warehouses.
They need ultra-fast keyboard-driven checkout for walk-in retail patients and robust B2B batch-wise billing, tax invoicing, and credit management for clinic/hospital accounts.

## Product Purpose

MedStock ERP is a specialized pharmaceutical enterprise and retail POS billing platform designed to eliminate checkout bottlenecks, maintain strict statutory drug compliance (Schedule H/H1/X), and prevent financial losses from inventory expiry through automated FEFO management.

## Positioning

Unlike generic retail POS or accounting software, MedStock ERP is custom-engineered for Indian pharmaceutical operations: combining 100% keyboard-first sub-second billing ergonomics, automated batch-level FEFO selection, mandatory narcotic/schedule-drug doctor verification, multi-tier pricing (PTR/PTS/MRP), and integrated GST tax engine.

## Operating Context

- **High-Rush Countertops**: High ambient noise, dual-monitor / barcode scanner / thermal receipt printer setups where mouse usage slows down queues.
- **Statutory Audits**: Drug inspector verification requiring tamper-proof Schedule H1 registers with prescribing doctor registration numbers and patient identities.
- **Wholesale Warehouses**: B2B bulk invoicing, credit limit controls, supplier payables tracking, and stock inward receiving.

## Capabilities and Constraints

- **Keyboard-Driven POS**: Instant shortcuts (`F2` Item Search, `F3` Customer, `F4` Payment Mode, `F6` Hold/Recall, `F8` Retail/Wholesale toggle, `Ctrl+S`/`F10` Save & Print).
- **Statutory Compliance**: Automated detection of Schedule H, H1, and X medicines with mandatory Doctor Name, Registration Number, and Patient Details before bill completion.
- **FEFO Inventory Allocation**: Auto-priority batch selection based on earliest expiry date with near-expiry (<90 days) and expired batch warnings.
- **Hybrid Pricing & Tax Model**: Support for MRP, PTR (Price to Retailer), PTS (Price to Stockist), GST breakdown (CGST, SGST, IGST), and HSN code compliance.
- **Credit & Receivables**: Customer credit limits, overdue tracking, aging analysis, and settlement ledgers.
- **Technical Stack**: SvelteKit 2, Svelte 5 Runes, Tailwind CSS v4, PostgreSQL with Drizzle ORM.

## Brand Commitments

- **Name**: MedStock ERP
- **Tone**: Mission-critical, precise, high-density, reliable, clinical, and distraction-free.
- **Visual Ergonomics**: High information density, high contrast, clean typography, unambiguous color coding for batch urgency (emerald for active/healthy, amber for warning/near-expiry, rose for expired/critical).

## Evidence on Hand

- Production SvelteKit codebase with full route coverage (`/sales`, `/sales/new`, `/purchases`, `/inventory`, `/customers`, `/suppliers`, `/reports`).
- Verified database schemas for products, batches, sales, purchase orders, customers, and suppliers with relational Drizzle ORM models.

## Product Principles

1. **Sub-Second Speed Over Clicks**: Every frequent counter action must be executable in under 2 keypresses without lifting hands from the keyboard.
2. **Zero Compliance Compromise**: Never permit sale finalization of regulated drugs without required medical audit details.
3. **Financial Leakage Prevention**: Never let stock expire unnoticed; surface earliest-expiring batches by default.
4. **Resilient Data Integrity**: Ensure all ledger updates, stock adjustments, and tax computations are transactional and accurate down to the paise.

## Accessibility & Inclusion

- Keyboard navigability across all data tables, inputs, and modal dialogues.
- High contrast light and dark modes with WCAG AA compliance.
- Clear numeric tabular formatting with currency and date clarity.
