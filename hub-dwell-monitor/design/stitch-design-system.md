---
name: Logistics Operations Pulse
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#5b3f45'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#8f6f75'
  outline-variant: '#e4bdc4'
  surface-tint: '#bb0055'
  primary: '#b20051'
  on-primary: '#ffffff'
  primary-container: '#e00067'
  on-primary-container: '#fff7f7'
  inverse-primary: '#ffb1c2'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#7f4f00'
  on-tertiary: '#ffffff'
  tertiary-container: '#a06500'
  on-tertiary-container: '#fff7f1'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#ffd9df'
  primary-fixed-dim: '#ffb1c2'
  on-primary-fixed: '#3f0018'
  on-primary-fixed-variant: '#8f003f'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#ffddb8'
  tertiary-fixed-dim: '#ffb95f'
  on-tertiary-fixed: '#2a1700'
  on-tertiary-fixed-variant: '#653e00'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '800'
    lineHeight: 48px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '800'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 30px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.015em
  headline-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
  title-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 22px
  body-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 18px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.25rem
  gutter-desktop: 1.5rem
  margin: 1rem
  margin-tablet: 1.5rem
  margin-desktop: 2rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system is engineered for mission-critical logistics operations, specifically for real-time monitoring of dwell times, sorting hub throughput, and parcel bottlenecks. It balances industrial precision with consumer-grade clarity and polish.

The brand persona is alert, methodical, transparent, and decisively fast. The interface must inspire operational confidence under high-stress processing windows, turning massive volume flows into actionable, glanceable insights.

The aesthetic blends **Modern Corporate Dashboard** structure with **Soft-Border Precision**:
- High-contrast, dark slate typography against immaculate porcelain and cool-tinted slate backdrops.
- Crisp white surface cards floating cleanly over an ultra-light slate foundation, avoiding visual noise or unnecessary gradients.
- Electric magenta accents used intentionally to pinpoint critical operational alerts, urgent parcel thresholds, and high-priority dwell excursions.

## Colors

The palette establishes an ultra-clean, daylight-optimized visual field built on cool slate neutrals, anchored by the iconic vibrant magenta signature:

- **Primary (`#E00067`)**: Reserved for core interactive states, operational hot zones, and focal metrics requiring immediate human intervention. Paired with `primary-container` (`#FDF2F8`) for subtle highlighted backdrops without chromatic fatigue.
- **Surface Infrastructure**:
  - `surface` (`#F8FAFC`): The primary viewport workspace background.
  - `surface-bright` & `surface-container-lowest` (`#FFFFFF`): High-clarity elevated card modules and active data tables.
  - `surface-dim` / `surface-container-high` (`#F1F5F9`): Inset toolbars, search headers, and nested metrics.
  - `surface-container-highest` (`#E2E8F0`): Table dividers and segmented control wells.
- **Typography & Structure**:
  - `on-surface` (`#0F172A`): Deep slate for maximum legibility in high-density data.
  - `on-surface-variant` (`#64748B`): Controlled mid-tone slate for supporting timestamps, column headers, and metric labels.
  - `outline` (`#E2E8F0`) & `outline-variant` (`#CBD5E1`): Ghost borders to provide razor-sharp spatial boundary enforcement.
- **Operational Status Palette**:
  - `error` (`#EF4444`): Critical SLA breaches and severe hub dwell delays (>12h).
  - `warning` (`#F59E0B`): Warning thresholds approaching dwell limits (4–8h).
  - `success` (`#10B981`): Healthy turnover, sorted flow, and on-time outbound dispatches.

## Typography

Plus Jakarta Sans is utilized across all typographic roles to preserve geometric readability and a modern, high-clarity feel. 

- Large statistical values leverage tight letter spacing (`-0.02em`) with bold weights (700/800) to ensure immediate comprehension on large overhead displays or tablet views.
- Data tables and telemetry feeds utilize `body-md` (14px) and `body-sm` (12px) to optimize row density while maintaining comfortable vertical line pacing.
- Status tags and metric subheaders rely heavily on `label-sm` and `label-md` with elevated letter spacing (`0.02em` to `0.04em`) to prevent visual crowding in dense alert lists.

## Layout & Spacing

The interface employs a responsive fluid-grid architecture tailored for operational control rooms:
- **Desktop (≥ 1280px)**: 12-column grid with a `1.5rem` (24px) gutter and `2rem` outer margins. Accommodates multi-column throughput graphs, dwell time duration histograms, and real-time package feeds simultaneously.
- **Tablet (768px – 1279px)**: 8-column layout with `1.25rem` gutters and `1.5rem` margins. Side panels collapse into off-canvas drawers or stacked diagnostic sheets.
- **Mobile (< 768px)**: 4-column flow with `1rem` margins and `1rem` gutters. Metric cards stack sequentially into single-column priority feeds.

Spacing rhythm is strictly anchored to a 4px/8px modular scale (`space-xs` to `space-xl`) ensuring precise component padding and rhythm across all modular cards.

## Elevation & Depth

Visual hierarchy is maintained primarily through **Tonal Surface Layering** and **Subtle Boundary Outlines**, avoiding heavy drop shadows that muddy analytical screens:

- **Level 0 (Canvas Base)**: `#F8FAFC` raw workspace background.
- **Level 1 (Default Operational Cards)**: `#FFFFFF` surface bordered by a crisp `1px` outline of `#E2E8F0` with an ambient micro-shadow (`0 1px 3px 0 rgba(15, 23, 42, 0.04), 0 1px 2px -1px rgba(15, 23, 42, 0.02)`).
- **Level 2 (Active/Hover Cards, Sticky Table Headers)**: Lifted using `0 4px 6px -1px rgba(15, 23, 42, 0.06), 0 2px 4px -2px rgba(15, 23, 42, 0.03)` with border shifting to `#CBD5E1`.
- **Level 3 (Modals, Slide-over Dwell Drilldowns, Popovers)**: Elevated with `0 12px 24px -4px rgba(15, 23, 42, 0.08), 0 8px 16px -4px rgba(15, 23, 42, 0.03)` over a neutral backdrop overlay (`#0F172A` at 20% opacity).

## Shapes

The design uses a balanced **Rounded (`2`)** shape vocabulary:
- Cards, data containers, and analytical panels utilize `rounded-lg` (16px / 1rem) for an approachable, modern feel without wasting corner space.
- Interactive controls, including buttons, inputs, dropdown triggers, and filter chips, use `rounded` (8px / 0.5rem).
- Real-time status indicators, live dwell counters, and SLA metric tags utilize full pill radiuses (`rounded-full` / 9999px) for clear separation between data containers and status tags.

## Components

### Buttons
- **Primary**: Solid background `#E00067`, text `#FFFFFF`, font weight 600 (`label-lg`), height 40px, padding `0 1rem`, rounded 8px. Hover shifts to `#C7005B`; active to `#B00050`. Focus ring: 2px solid `#E00067` with a 2px offset in `#FFFFFF`.
- **Secondary**: Surface `#F1F5F9`, text `#0F172A`, border `1px solid #E2E8F0`. Hover switches background to `#E2E8F0`.
- **Ghost/Tertiary**: Transparent background, text `#64748B`, hover text `#0F172A` and background `#F1F5F9`.

### Chips & Dwell Status Tags
- **Critical Dwell Tag (>8h)**: `#EF4444` text on `#FEF2F2` background, border `1px solid #FCA5A5`, height 24px, pill-shaped (`rounded-full`), font `label-sm`.
- **Warning Dwell Tag (4-8h)**: `#D97706` text on `#FFFBEB` background, border `1px solid #FCD34D`, pill-shaped.
- **Optimal Dwell Tag (<4h)**: `#059669` text on `#ECFDF5` background, border `1px solid #6EE7B7`, pill-shaped.
- **Filter Chips**: Height 32px, rounded 8px. Inactive: `#FFFFFF` surface with `#E2E8F0` border and `#64748B` text. Active: `#FDF2F8` background, `#E00067` border and text.

### Form Inputs & Search Fields
- Inset container height 40px, background `#FFFFFF`, border `1px solid #E2E8F0`, rounded 8px, text `body-md` (`#0F172A`). Placeholder text in `#94A3B8`.
- Focus state: Border transitions to `#E00067` with a subtle outline glow (`box-shadow: 0 0 0 3px rgba(224, 0, 103, 0.12)`).

### Cards & Metric Containers
- Surface `#FFFFFF`, border `1px solid #E2E8F0`, corner radius 16px, padding `1.25rem` or `1.5rem`.
- KPI metric displays highlight dwell duration with `display-lg` typography in `#0F172A`, accompanied by trend arrows tinted with corresponding semantic colors (`#10B981` decrease in dwell, `#EF4444` increase in dwell).

### Operational Lists & Data Tables
- Table headers use `#F8FAFC` background, `1px solid #E2E8F0` bottom border, with `label-md` text styled in uppercase `#64748B`.
- Row height: 48px standard, alternating or clear background `#FFFFFF`, subtle hover row state `#F8FAFC`.
- Divider lines strictly calibrated to `1px solid #F1F5F9`.

### Dwell Progress Gauges
- Horizontal inline bars with height 6px, track background `#F1F5F9`, rounded 9999px. Fill transitions dynamically from `#10B981` (0-50% threshold) to `#F59E0B` (51-80%) and `#E00067` / `#EF4444` (>80% SLA breach).