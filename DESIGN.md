---
name: MedStock ERP
description: Clinical, high-density pharmaceutical enterprise and POS billing design system
colors:
  primary: "#0d9488"
  primary-hover: "#0f766e"
  primary-light: "#ccfbf1"
  surface: "#ffffff"
  surface-secondary: "#f8fafc"
  surface-hover: "#f1f5f9"
  border: "#e2e8f0"
  border-subtle: "#f1f5f9"
  border-strong: "#cbd5e1"
  text-primary: "#0f172a"
  text-secondary: "#475569"
  text-muted: "#94a3b8"
  success: "#16a34a"
  success-light: "#dcfce7"
  warning: "#d97706"
  warning-light: "#fef3c7"
  danger: "#dc2626"
  danger-light: "#fee2e2"
  info: "#0284c7"
  info-light: "#e0f2fe"
  schedule-h1: "#7c3aed"
  schedule-h1-light: "#ede9fe"
  sidebar: "#0f172a"
  sidebar-text: "#94a3b8"
  sidebar-text-active: "#ffffff"
typography:
  display:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: "2.25rem"
    letterSpacing: "-0.025em"
  headline:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: "1.75rem"
    letterSpacing: "-0.015em"
  title:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: "1.25rem"
    letterSpacing: "normal"
  body:
    fontFamily: "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: "1rem"
    letterSpacing: "normal"
  label:
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
    fontSize: "0.6875rem"
    fontWeight: 600
    lineHeight: "0.875rem"
    letterSpacing: "0.05em"
rounded:
  xs: "4px"
  sm: "6px"
  md: "8px"
  lg: "12px"
  xl: "16px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  lg: "24px"
  xl: "32px"
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "6px 14px"
  button-primary-hover:
    backgroundColor: "{colors.primary-hover}"
  button-secondary:
    backgroundColor: "{colors.surface}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
    padding: "6px 14px"
  button-danger:
    backgroundColor: "{colors.danger}"
    textColor: "#ffffff"
    rounded: "{rounded.sm}"
    padding: "6px 14px"
---

# Design System: MedStock ERP

## Overview

**Creative North Star: "The Clinical Console"**

MedStock ERP’s visual world is engineered for high-density, high-focus pharmaceutical workflows. Built for countertops where speed, statutory rigor, and absolute data clarity govern every interaction, the interface recedes into a quiet, structured canvas that makes critical indicators—such as drug schedule warnings, batch expiry thresholds, and financial totals—instantly recognizable.

The system emphasizes high contrast, crisp hairline separators, tabular numeric alignments, and tight keyboard-navigable spatial rhythm. It eliminates extraneous decorative flourishes in favor of information density, tactile status badges, and rapid visual scanning.

**Key Characteristics:**
- High-density information architecture designed for 1080p and dual-screen POS environments.
- Unambiguous clinical color semantics for batch health and narcotics compliance.
- Monospace tabular numbers for prices, quantities, GST rates, and batch identifiers.
- Tactile hairline borders and subtle tonal layering over heavy drop shadows.

## Colors

The palette pairs a trustworthy medical clinical teal primary accent with neutral slate foundations and vivid status indicators.

### Primary
- **Clinical Teal** (#0d9488): Primary interactive focus, active tab states, and primary submission triggers.
- **Teal Hover** (#0f766e): Hover and active states for primary action elements.
- **Teal Wash** (#ccfbf1): Subtle background tint for selected items and active badge backgrounds.

### Status & Statutory Roles
- **Schedule H1 Narcotic Violet** (#7c3aed): Reserved exclusively for Schedule H, H1, and X restricted drugs and mandatory doctor prescription alerts.
- **Batch Healthy Emerald** (#16a34a): Confirmed active stock, paid invoices, and healthy batch shelf-life (>90 days).
- **Near-Expiry Warning Amber** (#d97706): Batches nearing expiry (<90 days), pending balances, and held carts.
- **Critical Expiry Rose** (#dc2626): Expired stock, overdue credit, out-of-stock items, and destructive actions.
- **Info Sky Blue** (#0284c7): Informational callouts, B2B wholesale flags, and system telemetry.

### Neutral
- **Slate Text Primary** (#0f172a): Body text and high-contrast table headers.
- **Slate Text Secondary** (#475569): Column labels, secondary attributes, and helper text.
- **Slate Text Muted** (#94a3b8): Placeholder text, hotkey badges, and disabled indicators.
- **Canvas White / Deep Slate** (#ffffff / #1e293b): Main card and workspace backgrounds.
- **Subtle Surface** (#f8fafc / #0f172a): App canvas ground and alternate table row stripes.
- **Hairline Border** (#e2e8f0 / #334155): Card boundaries, table grid lines, and divider rules.

### Named Rules
**The Statutory Violet Rule.** Violet (#7c3aed) is strictly reserved for Schedule H/H1/X regulated drugs and prescription compliance badges. It must never be used for general branding or decorative accents.
**The Tabular Money Rule.** All currency amounts, batch numbers, and stock quantities must be rendered in tabular monospace font to guarantee vertical decimal alignment.

## Typography

**Display & Body Font:** `system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`
**Tabular/Code Font:** `ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace`

**Character:** Ultra-clean, neutral system typography ensuring native rendering speed without external font blocking, paired with crisp monospace figures for financial and regulatory precision.

### Hierarchy
- **Display** (Bold 700, 1.875rem / 30px, line-height 2.25rem): Top-level dashboard summary metrics and modal headers.
- **Headline** (Bold 700, 1.25rem / 20px, line-height 1.75rem): Page titles and major section dividers.
- **Title** (Semi-bold 600, 0.875rem / 14px, line-height 1.25rem): Card titles, modal headers, and table grouping labels.
- **Body** (Regular 400, 0.75rem / 12px, line-height 1rem): Primary data grid cell contents and form inputs.
- **Label** (Semi-bold 600, 0.6875rem / 11px, letter-spacing 0.05em, UPPERCASE): Table column headers, metric category labels, and hotkey hints.

### Named Rules
**The Uppercase Header Rule.** All table column headers and metric card sub-labels must be 11px uppercase with 0.05em letter spacing and muted text color for immediate cognitive distinction from cell data.

## Layout

The layout uses a fixed 240px dark sidebar navigation paired with a flexible high-density workspace. Tables and POS terminals utilize dense spacing (compact cell padding: 12px horizontal, 6px vertical) to fit up to 20 line items above the fold without scrolling.

- **Breakpoints**: sm (640px), md (768px), lg (1024px), xl (1280px), 2xl (1536px).
- **POS Grid Layout**: 65% left panel for product entry and invoice lines, 35% right panel for customer ledger, Schedule H1 audit block, and tender summary.

## Elevation & Depth

MedStock ERP relies on crisp hairline borders (`border border-border`) and subtle tonal stepping rather than heavy drop shadows.

### Shadow Vocabulary
- **Card Rest** (`box-shadow: 0 1px 2px 0 rgba(0, 0, 0, 0.05)`): Applied to KPI metric cards and workspace panels.
- **Floating Modal / Dropdown** (`box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -4px rgba(0, 0, 0, 0.1)`): Applied to product search autocomplete popups and confirmation dialogs.

### Named Rules
**The Flat Hairline Rule.** Containers achieve separation through 1px solid border tokens and background contrast rather than elevation shadows, preserving visual sharpness under bright pharmacy counter lighting.

## Shapes

- **Base Radius**: 6px (`rounded-md`) for buttons, inputs, and form controls.
- **Container Radius**: 12px (`rounded-xl`) for main metric cards, modal dialogs, and table wrappers.
- **Pill Radius**: 9999px (`rounded-full`) for status chips, batch urgency indicators, and shortcut chips.

## Components

### Buttons
- **Shape:** 6px radius (`rounded-md`), font size 12px/14px, semi-bold.
- **Primary:** Teal background (#0d9488), white text, padding 6px 14px. Hover: #0f766e.
- **Secondary:** Surface background with 1px border (#e2e8f0), text #0f172a.
- **Danger:** Rose background (#dc2626), white text.
- **Outline / Ghost:** Transparent background with subtle hover background (#f1f5f9).

### Badges & Status Chips
- **Success (Active / Healthy Batch):** Emerald tint (#dcfce7), text #16a34a, optional 6px dot indicator.
- **Warning (Near-Expiry <90d / Pending):** Amber tint (#fef3c7), text #d97706.
- **Danger (Expired / Critical):** Rose tint (#fee2e2), text #dc2626.
- **Schedule H1 (Narcotic / Regulated):** Violet tint (#ede9fe), text #7c3aed.

### Data Tables
- **Header:** Background #f8fafc (dark: #0f172a), border bottom 1px #e2e8f0, text 11px uppercase semi-bold.
- **Row:** Height 36px-40px, hover background #f1f5f9 (dark: #334155).
- **Numeric Cells:** Right-aligned, monospace tabular-nums with 2 decimal precision for currency.

### Form Inputs
- **Style:** Height 32px-36px, border 1px #e2e8f0, radius 6px, text 12px/14px.
- **Focus:** 1px ring #0d9488 with border #0d9488, no offset blur.

## Do's and Don'ts

### Do:
- **Do** display keyboard shortcut hints in monospace uppercase badges alongside interactive buttons (e.g., `[F2]`, `[Ctrl+S]`).
- **Do** highlight batches expiring within 90 days with amber warning badges and batches expired with red danger tags.
- **Do** format all monetary amounts with currency symbol `₹` and strict two-digit fractional precision (`₹1,240.50`).
- **Do** trigger mandatory doctor prescription fields whenever a Schedule H/H1/X product is added to a bill.

### Don't:
- **Don't** hide critical inventory quantities or batch expiry dates behind hover tooltips; keep them visible in the primary data row.
- **Don't** use low-contrast text for critical medical or financial warnings.
- **Don't** allow form submission or checkout completion on unhandled keyboard events.
- **Don't** use decorative animated transitions that delay POS counter transaction speed.
