# TIP-V46-823 — Completion Report: Admin Overview Interactive Controls

**DONE — Implementation, verification, and code quality gates completed.**
Branch: `feature/TIP-V46-823-admin-overview-interactive-controls`
Target PR: [PR #114](https://github.com/duymt-dev/OPCHUB/pull/114) (base: `dev`).

## 1. Scope & Delivered Features

### 1.1 Interactive DateRangePicker on Admin Overview
- Replaced the static mockup `<div>` in `OverviewScreen` (`apps/admin/src/features/overview/components/overview-screen.tsx`) with `@opchub/ui`'s `DateRangePicker`.
- URL sync via `useOverviewUrl()` hook:
  - Updates URL parameters `?from=YYYY-MM-DD&to=YYYY-MM-DD`.
  - Clears `from`/`to` cleanly when selection is cleared.
  - Automatically re-triggers TanStack Query `['admin', 'overview', { period, from, to }]`.
- Exact typing with `DateRangeValue | null` respecting `exactOptionalPropertyTypes: true`.

### 1.2 Member Growth Period Switcher (Tuần / Tháng / Năm)
- Converted static `<span>` elements in `GrowthChart` (`apps/admin/src/features/overview/components/growth-chart.tsx`) into interactive buttons with accessible ARIA tablist (`role="tablist"`, `role="tab"`, `aria-selected`).
- Extracted `PeriodTabs` sub-component to ensure strict ESLint `max-lines-per-function` compliance (well under 80 lines limit).
- Added `.periodBtn` and `.periodOn` styles in `overview.module.css` with active background, border, and focus states.
- URL sync via `?period=week|month|year` (default `month`).
- Backend aggregation in `apps/server/src/modules/reporting/overview.service.ts`:
  - Added helper functions `lastWeeks()` (7 ISO weeks `IYYY-"W"IW`) and `lastYears()` (7 calendar years `YYYY`).
  - Dynamic `compute(now, query)` aggregates `stats_daily` by week, month, or year for member growth bars while preserving 7-month sparklines on top KPI cards.
  - Isolated Redis cache key: `admin:overview:${period}:${from ?? ''}:${to ?? ''}` with 5-minute TTL.
- Updated `mockOverview(query)` in `packages/shared/src/mock-data/domains/overview.ts` to return week labels (`W40..W46`), year labels (`2020..2026`), or month labels (`T4..T10`).
- Updated MSW shell handler `GET /admin/overview` in `apps/admin/src/mocks/handlers/shell.ts`.

### 1.3 Topbar Global Search UX Polish
- Audited and verified `packages/ui/src/global-search/`:
  - Strict adherence to BR-491 specification: minimum 2 characters required before showing dropdown suggestions (`fireEvent.change(input, { target: { value: ' a ' } }) -> listbox is null`).
  - Arrow key navigation, keyboard Enter routing, ARIA selection, and clean dismiss on Esc/blur.
  - All 8 unit tests in `global-search.spec.tsx` passing.

---

## 2. Gate Results & Evidence

| Gate | Result | Details |
|---|---|---|
| `pnpm lint` | **PASS** | 8 packages in turbo pipeline, 0 errors, 0 warnings. Strict `max-lines` & `max-lines-per-function` satisfied. |
| `pnpm typecheck` | **PASS** | 8 packages, 0 errors. Exact optional property types (`exactOptionalPropertyTypes: true`) fully respected. |
| `pnpm --filter @opchub/ui test` | **PASS** | 20 test files, 69 tests passed. |
| `pnpm --filter @opchub/shared test` | **PASS** | 125 test files, 745 tests passed. |
| `pnpm --filter @opchub/admin test` | **PASS** | 128 test files, 583 tests passed (including `data.spec.ts` & `overview-handlers.spec.ts`). |
| `pnpm --filter @opchub/server test` | **PASS** | `overview.service.spec.ts` 4/4 unit tests passed. |
| `pnpm depcheck` | **PASS** | 2613 frontend/shared modules + 1250 server modules cruised, 0 boundary violations. |

---

## 3. Files Touched

### Created
- `apps/admin/src/features/overview/hooks/use-overview-url.ts`
- `apps/server/src/modules/reporting/overview.service.spec.ts`
- `coding-packs/reports/TIP-V46-823-completion.md`

### Modified
- `packages/shared/src/api-domains/overview.ts`
- `packages/shared/src/mock-data/domains/overview.ts`
- `apps/server/src/modules/reporting/overview.controller.ts`
- `apps/server/src/modules/reporting/overview.service.ts`
- `apps/server/src/modules/reporting/index.ts`
- `apps/admin/src/features/overview/components/growth-chart.tsx`
- `apps/admin/src/features/overview/components/overview-screen.tsx`
- `apps/admin/src/features/overview/components/overview.module.css`
- `apps/admin/src/features/overview/hooks/use-overview.ts`
- `apps/admin/src/features/overview/data.ts`
- `apps/admin/src/features/overview/data.spec.ts`
- `apps/admin/src/mocks/handlers/shell.ts`
- `apps/admin/src/mocks/overview-handlers.spec.ts`
- `coding-packs/02-TASK-GRAPH.md`
