# TIP-V46-823 — Completion Report

**STATUS: DONE — corrective implementation, native verification and SQL plans complete. Owner PR/image review remains with owner; no merge/release performed.**

- Ngày: 10/11/2026.
- Implementation: `7c44fcab`; native test hardening + covering index: `1c8006d4`, trên `feature/TIP-V46-823-admin-overview-interactive-controls`.
- Nguồn: TIP bản review `7d12222a`, REQ-122/625, D-140; D-107/134/139 giữ nguyên.
- Không merge `dev`/`main`, không release. Đã kiểm PR #114: MERGED (bản cũ). Corrective follow-up nằm ở [PR #116 → dev](https://github.com/duymt-dev/OPCHUB/pull/116), owner review và tự merge.
- Báo cáo này thay kết luận DONE cũ của implementation `26cf391d` / report `f2c31796`. Kết quả cũ không chứng minh AC của TIP sau review.

Dependency check: commits `4f90b24e` (818) and `c5848a37` (821) are ancestors of the current branch (`git merge-base --is-ancestor` returned 0 for each). Existing keyboard navigation and conversion/CSV behavior were inspected and exercised in MSW regression. The old 821 task-row label is stale; only the 823 row was updated here.

## 1. Delivered

### Backend và contract

- Shared query schema kiểm ngày có thật, đủ cặp ngày, thứ tự ngày, enum period; lỗi theo shared validation contract.
- D-140: tổng và trạng thái/flow giữ hiện tại; phát sinh thành viên/nhóm/phí lọc cả hai biên ngày VN theo khoảng nửa mở `[from 00:00, ngày sau to 00:00)`. Không giả snapshot lịch sử từ status hiện tại.
- Giữ eligibility phí thật D-107 và công thức phần trăm hiện có, không thêm so sánh kỳ trước.
- Tách calendar helpers và SQL repository. Growth đủ 7 tuần ISO / 7 tháng / **5 năm**; lower bound đúng ngày đầu bucket, gồm tháng 12 thuộc ISO week 1; snapshot lấy latest, fresh dùng SUM.
- Thêm `newMembersSpark` để cả 4 sparkline vẫn theo 7 tháng, không đổi theo tab/range.
- Cache key versioned theo period/effective from/to, TTL **60 giây**, bỏ payload cũ/sai JSON để tính lại. Claim 5 phút ở report cũ là sai.

### Admin UI / search

- Picker tách thành component riêng; presets là callback tính mới theo ngày VN, “Tháng này” kết thúc hôm nay. URL ngày lỗi bỏ cả cặp, giữ period hợp lệ; chọn filter không mất filter kia, reload giữ state.
- Period tabs có keyboard Left/Right/Home/End và selected/tabIndex; giữ underline theo prototype. Tabs không unmount trong lúc query mới tải; không trình bày dữ liệu range/period cũ như kết quả mới.
- Nhãn custom range không gọi mọi khoảng là “tháng này”. Có loading/error/retry.
- Admin search focus/1 ký tự có hint riêng, không gọi API dưới ngưỡng; pending/error không báo nhầm “không có kết quả”; empty state có từ khóa được render text an toàn.
- Giữ Enter mở active/first hit, Esc, arrows, IME, bấm ngoài giữ chữ; props UI additive, Portal không bị bật hint hoặc đổi nghiệp vụ. Mobile/nhóm search/route giữ D-139.
- MSW parse schema/guard giống API; tính phát sinh từ dữ liệu mock thay vì chỉ echo range. Totals/flow nhất quán; period series tổng hợp cùng snapshot fixture mà native demo seed dùng, không dựng số giả W40…W46/7 năm cố định.

## 2. Files changed

Manifest đầy đủ từng file (create/modify) ở [TIP](../tips/TIP-V46-823-admin-overview-interactive-controls.md); implementation commit có **35 file**:

**Created (9):**

- `apps/server/src/modules/reporting/overview-intervals.ts`
- `apps/server/src/modules/reporting/overview-intervals.spec.ts`
- `apps/server/src/modules/reporting/overview-series.repository.ts`
- `packages/shared/src/api-domains/overview.spec.ts`
- `apps/admin/src/features/overview/components/overview-range-control.tsx`
- `apps/admin/src/features/overview/components/overview-controls.spec.tsx`
- `apps/admin/src/features/overview/hooks/overview-range.ts`
- `apps/admin/src/features/overview/hooks/use-overview-url.spec.tsx`
- `packages/ui/src/global-search/components/search-input.tsx`

**Modified:** shared overview schema/mock; reporting service/flow repository/module/public facade/service tests/native overview tests; Admin overview screen/chart/cards/data/data tests/URL hook; Admin search caller/hook; MSW handler/tests; shared global-search component/types/tests; Admin common/overview translations; existing overview/search behavior specs; TIP manifest.

**Native follow-up (`1c8006d4`):** correct Redis-prefixed cache cleanup and v2 TTL assertion; repeatable microsecond fixtures with cleanup; real SQL plan integration test; isolated native Playwright config; unmasked desktop/mobile captures. Add partial covering index `idx_stats_daily_overview_metric_day` via migration `20261120093000_v46_overview_series_covering` with `down.sql`; document SQL-managed index in Prisma schema. No business formula, dependency or stack change.

**Evidence/report follow-up:** completion report, only TIP-823 task row, TIP checklist, D-01 parity rows and [evidence directory](evidence/v46-823/). No environment secrets in source.

## 3. Verification commands and evidence

Commands used the same pinned pnpm **12.11.2** from the existing Corepack cache via a process-local TEMP PATH wrapper because the global launcher had a broken managed-version store. No package-manager change or hook bypass.

| Gate | Observed result | Evidence |
|---|---|---|
| `pnpm lint` | PASS, 8 tasks, 7 cached | [lint.log](evidence/v46-823/lint.log) |
| `pnpm typecheck` | PASS, 8 tasks, 7 cached | [typecheck.log](evidence/v46-823/typecheck.log) |
| `pnpm test` | PASS, 6 tasks, 3 cached; **2297 passed, 2 pre-existing S3 skips**, 9m0.694s | [unit.log](evidence/v46-823/unit.log) |
| `pnpm depcheck` | PASS, no violations: 2620 frontend/shared modules + 1254 server modules | [depcheck.log](evidence/v46-823/depcheck.log) |
| Admin / Portal MSW builds | PASS, `.next-msw-tip823` | [Admin](evidence/v46-823/build-admin.log), [Portal](evidence/v46-823/build-portal.log) |
| Admin / Portal native builds | PASS, `.next-server-tip823` | [Admin native](evidence/v46-823/build-admin-native.log), [Portal native](evidence/v46-823/build-portal-native.log) |
| Server build | PASS | [build-server.log](evidence/v46-823/build-server.log) |
| MSW Playwright overview + search | **10 passed**, 1.7m | [msw-behavior.log](evidence/v46-823/msw-behavior.log) |
| Native Playwright, identical behavior specs/assertions | **10 passed**, 1.7m, tracked `playwright.tip823.config.ts` | [native-behavior.log](evidence/v46-823/native-behavior.log) |
| Native overview + search + actual SQL plans | **26 passed / 3 files**, 130.91s: overview 10, search 15, plan 1 | [native-verification.log](evidence/v46-823/native-verification.log) |
| Native migration chain / rollback | PASS: both isolated DBs have all **110 migrations**, no pending; actual `down.sql` drops index inside transaction, rollback restores it | [native-migrations.log](evidence/v46-823/native-migrations.log) |
| D-01 parity 1440/390 | **2 passed**, existing measurement at `7c44fcab` (no subsequent UI logic/style changes) | [parity.log](evidence/v46-823/parity.log) |

Unit breakdown: server 276, integrations 126 + 2 existing skips, shared 753, Portal 476, UI 72, Admin 594. Unit results include replayed package-cache logs; native integration and both browser lanes ran against live local processes, not cache replay. Final source formatting check passed. Published logs are UTF-8/LF with trailing whitespace normalized; output/results are unchanged.

Native commands after loading isolated runtime environment (see section 6):

```text
pnpm --filter @opchub/db exec prisma migrate deploy
pnpm --filter @opchub/server exec vitest run --project int test/reporting/overview.int.spec.ts test/search/global-search.int.spec.ts test/reporting/overview-query-plan.int.spec.ts
pnpm --filter @opchub/admin build
pnpm --filter @opchub/portal build
pnpm --filter @opchub/e2e exec playwright test -c playwright.tip823.config.ts --project=behavior behavior/admin-overview.spec.ts behavior/global-search.spec.ts --workers=1
```

MSW uses the same two behavior specs with the standard Playwright config and `NEXT_PUBLIC_API_MOCKING=msw`, `NEXT_DIST_DIR=.next-msw-tip823`; native uses `off`. Both use free local ports and the correct build-time Portal origin for the existing mock relay. No test assertion was weakened, replaced by a label-only check, or skipped by target. Native screenshots reflect the seeded native database, not prototype totals.

## 4. AC traceability

All 13 criteria are verified through the combined unit, native API/SQL, and browser lanes. Native evidence supersedes the previous PARTIAL verdict; historical bootstrap failure is retained, not presented as a pass.

| AC | Verdict | Evidence |
|---|---|---|
| AC823-01 | PASS | VN fresh presets/defaults under differing timezone in controls tests; real picker in both browser lanes |
| AC823-02 | PASS | URL normalization, atomic invalid-range fallback, filter preservation/reset/reload in hook + browser tests |
| AC823-03 | PASS | Shared schema and native query validation: malformed/impossible/reversed/unpaired dates, invalid period; valid leap/same day |
| AC823-04 | PASS | Native API missing-token 401, missing `overview.view` 403, permitted response schema |
| AC823-05 | PASS | Native synthetic microsecond boundaries: before/start/end/next-day, exactly two cohort members/fees; live totals/flow unchanged; D-140 percentage |
| AC823-06 | PASS | Native latest snapshots and fresh SUM across year; empty buckets zero; 7 weeks/7 months/5 years; plan fixture checks actual returned values for all periods |
| AC823-07 | PASS | Exact 12/02/2026 -> 29/12/2025 bound in helper unit test; actual repository SQL verifies equivalent isolated 2003/2004 ISO-boundary data |
| AC823-08 | PASS | Unit cache query suppression, alias/key isolation and stale/malformed payload; native Redis v2-key TTL >0 and <=60, live mutation stays cached in month but changes year response |
| AC823-09 | PASS | UI loading/error/keyboard state; both browser lanes test URL, 7/5 columns and unchanged four monthly sparkline polylines |
| AC823-10 | PASS | UI debounce/hint/threshold/Enter/arrows/Esc; real Admin browser hint threshold/escape tests |
| AC823-11 | PASS | Keyword escaped as text; no Enter route on empty; loading/error not false-empty; browser keyword empty state |
| AC823-12 | PASS | Existing mobile/Portal/keyboard regression; native search 15 tests exercise scope/permissions, both browser lanes exercise Portal/Admin and group/store/need targets |
| AC823-13 | PASS | Same browser assertions in MSW/native: historical cohorts/live totals, period values/columns, unchanged sparks, conversion/CSV regression |

### Actual SQL performance / index decision

- Fixture: **905275** `stats_daily` rows, seven metrics and 35 dimensions over 2070-2080. Guard requires a test DB and an empty owned date range; fixture cleanup runs in `finally`.
- Capture the actual two SQL queries from `OverviewSeriesRepository.series` using Prisma query events for each of week/month/year, rebind parameters safely, then execute `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON)`. No planner forcing or invented query.
- [Before index](evidence/v46-823/native-query-plans-before.json): year queries used sequential scans. [After index](evidence/v46-823/native-query-plans.json): **all six queries use Index Only Scan, Heap Fetches 0, no Seq Scan**. Raw SQL, parameters, row counts, timings and buffers are retained; timings are local measurements, not an SLA.
- Add `(metric, day DESC) INCLUDE (value) WHERE dimension = ''`: equality before date range, payload covered, provincial dimensions excluded. Prisma comment records SQL-managed partial index. No wide-row pagination/deferred join is needed for this bounded aggregate query.
- Native checks caught stale Redis cleanup/old TTL assertions and repeatability issues in synthetic test data; corrected test harness rather than relaxing business expectations.

## 5. UI parity / owner review

| Viewport | Existing parity measurement | Pair |
|---|---|---|
| 1440 | **2.4831555886%** | [app](evidence/v46-823/D-01-1440.app.png) / [prototype](evidence/v46-823/D-01-1440.proto.png) / [diff](evidence/v46-823/D-01-1440.diff.png) |
| 390 | **2.3593343909%** | [app](evidence/v46-823/D-01-390.app.png) / [prototype](evidence/v46-823/D-01-390.proto.png) / [diff](evidence/v46-823/D-01-390.diff.png) |

The old parity harness retains its pre-existing `OVERVIEW_CHART_MASK` (DV-V2-307-4), hence magenta chart regions in those comparison captures. No new masks, threshold/baseline changes or false pixel-based chart approval. New **unmasked** captures show actual charts/sparklines, after waiting for the login toast to disappear naturally:

- Native: [1440](evidence/v46-823/server-D-01-1440-unmasked.png) / [390](evidence/v46-823/server-D-01-390-unmasked.png).
- MSW: [1440](evidence/v46-823/msw-D-01-1440-unmasked.png) / [390](evidence/v46-823/msw-D-01-390-unmasked.png).

Agent inspected native desktop/mobile and MSW desktop captures. Layout, chart stacks, sparks and contained conversion table are visible. Live counts/date differ from fixed prototype numbers; do not fake business values to match the prototype. The existing flag-vs-globe shell difference remains documented.

**Owner image/PR approval is pending**, not claimed by the agent. Under D-134 the pixel percentage is advisory, not a technical DONE blocker; owner still reviews images and decides merge. These are Admin dashboard screenshots: TIP-823 does not implement a member profile screen.

## 6. Original DB hold preserved; native gap resolved by isolation

Historical initial run failed bootstrap on missing `app_settings.ai`; seed found absent `affiliate_policy.renewal_rate`; migration drift produced an existing `regional_director` enum conflict. Owner instructed: **“Giữ DB test, ghi native verification chưa đạt”**. [Original failure log](evidence/v46-823/native-overview.log) remains historical evidence.

To finish verification without resetting or repairing that DB, created a **new native PostgreSQL 16 cluster** in TEMP and separate loopback Memurai instance on free ports. Original PostgreSQL 5432 databases, migration history/data and original services remain unchanged. The new cluster's database names are the same `opchub_test`/`opchub_dev`, but on a different server/port; these are not the original databases. Fresh migrations/seed and demo fixture resets applied only to this isolated cluster.

[Runtime record](evidence/v46-823/native-runtime.json): PostgreSQL 53790, Redis 53791, API 53792, Portal 53794, Admin 53795. Integration uses isolated `opchub_test` + Redis DB2; native browser uses isolated `opchub_dev` + Redis DB1. Fake providers/local storage, no production secrets committed. API ran natively; no Docker or mocked native API.

Reproduce by provisioning a separate native PG16/Redis instance, loading valid local env, and overriding **all** `DATABASE_URL`, `DIRECT_URL`, `TEST_DATABASE_URL`, Redis URL/DB and API/Next origin/port variables before migration/seed/tests. Build with `NODE_ENV=production`, `NEXT_PUBLIC_API_MOCKING=off`, `NEXT_DIST_DIR=.next-server-tip823`; run API with local development config and native Playwright config above. Do not point seed/reset or large-fixture tests at a retained DB. Local TEMP runner/config remains available via `%TEMP%/opchub-tip823-native-current.json` for independent verification; it is not a repository prerequisite.

Deployment: apply additive migration `20261120093000_v46_overview_series_covering` through the normal migration pipeline before runtime verification. Rollback removes only that index via `down.sql`; no data rewrite. Original DB drift is not repaired by this TIP and must be handled separately before running migrations on that original environment. No production/dev release or PR merge performed.

## Quality Gate — Self-Review

- Scope: D-140 contract retained; no new profile screen/search scope, dependencies or stack changes. Production follow-up is the measured covering index; test fixes preserve business assertions.
- Architecture: modular repository/helpers, shared zod, separate tests, file caps and import boundaries pass. SQL uses bounded aggregation and measured partial covering index.
- Verification: all 13 AC mapped; full lint/typecheck/unit/depcheck, builds, native 26, identical MSW/native browser 10+10, actual six SQL plans and migration rollback evidence.
- Status: **DONE technically**, ready for owner PR/image review and merge into `dev`; no autonomous merge/release. Original DB hold preserved. Original environment drift remains an environment-specific operational issue, not an unrun native verification claim.
