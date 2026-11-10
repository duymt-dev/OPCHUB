# TIP-V46-823 — Completion Report

**STATUS: PARTIAL — implementation + unit/MSW/UI verified; native verification chưa đạt.**

- Ngày: 10/11/2026.
- Implementation: `7c44fcab` trên `feature/TIP-V46-823-admin-overview-interactive-controls`, đã push.
- Nguồn: TIP bản review `7d12222a`, REQ-122/625, D-140; D-107/134/139 giữ nguyên.
- Không merge `dev`/`main`, không release. PR #114 là liên kết được ghi từ baseline, không xác nhận trạng thái PR hiện tại.
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

**Evidence/report follow-up:** completion report, only TIP-823 task row, TIP checklist, D-01 parity rows and [evidence directory](evidence/v46-823/). No dependencies, stack changes, new migration or environment secrets in source.

## 3. Verification commands and evidence

The global pnpm launcher had a broken managed-version store path. Commands used the **same pinned pnpm 12.11.2**, from the existing Corepack cache, via a process-local TEMP PATH wrapper. No repo package-manager version/config changes and no hook bypass.

| Gate | Observed result | Evidence |
|---|---|---|
| `pnpm lint` | PASS, 8 tasks, 7 cached | [lint.log](evidence/v46-823/lint.log) |
| `pnpm typecheck` | PASS, 8 tasks, 6 cached | [typecheck.log](evidence/v46-823/typecheck.log) |
| `pnpm test` | PASS, 6 tasks, 1 cached; **2297 passed, 2 skipped** | [unit.log](evidence/v46-823/unit.log) |
| Focused tests after final edits | PASS: server 6, UI 11, shared 8, Admin overview/MSW 22 = **47 tests** | Commands/counts below; full suite includes the same test files |
| `pnpm depcheck` | PASS: 2619 frontend/shared modules, 1253 server modules | [depcheck.log](evidence/v46-823/depcheck.log) |
| Admin build | PASS, isolated `.next-msw-tip823` | [build-admin.log](evidence/v46-823/build-admin.log) |
| Portal build | PASS, isolated `.next-msw-tip823` | [build-portal.log](evidence/v46-823/build-portal.log) |
| Server build | PASS | [build-server.log](evidence/v46-823/build-server.log) |
| MSW Playwright overview + search | **10 passed**, 29.7s | [msw-behavior.log](evidence/v46-823/msw-behavior.log) |
| D-01 parity 1440/390 | **2 passed**, 16.5s | [parity.log](evidence/v46-823/parity.log) |
| Native overview integration | **FAILED at app bootstrap; 10 skipped**, not PASS | [native-overview.log](evidence/v46-823/native-overview.log) |
| Native e2e / search regression / SQL plans >=10k rows | **NOT RUN / UNVERIFIED** | DB hold below |

Full unit breakdown: server 276; integrations 126 + 2 pre-existing S3 skips; shared 753; Portal 476 (cache replay); UI 72; Admin 594. Focused rerun used the commands below, **without** an extra `--` before file filters:

```text
pnpm --filter @opchub/server exec vitest run --project unit src/modules/reporting/overview.service.spec.ts src/modules/reporting/overview-intervals.spec.ts
pnpm --filter @opchub/ui exec vitest run src/global-search/global-search.spec.tsx
pnpm --filter @opchub/shared exec vitest run src/api-domains/overview.spec.ts
pnpm --filter @opchub/admin exec vitest run src/features/overview src/mocks/overview-handlers.spec.ts
pnpm --filter @opchub/server exec vitest run --project int test/reporting/overview.int.spec.ts
pnpm --filter @opchub/e2e exec playwright test --project=behavior behavior/admin-overview.spec.ts behavior/global-search.spec.ts --workers=1
PARITY_IDS=D-01 pnpm --filter @opchub/e2e exec playwright test --project=parity parity/parity.spec.ts --workers=1
```

MSW builds/runs used `NEXT_PUBLIC_API_MOCKING=msw`, `NEXT_DIST_DIR=.next-msw-tip823`, free runtime ports from environment, and `NEXT_PUBLIC_PORTAL_URL` pointing to the local Portal origin used by the existing mock relay. The first MSW attempt lacked that build-time relay origin and returned 503 at login; rebuilt with the correct local configuration, then all 10 tests passed. No assertion was relaxed or bypassed.

## 4. AC traceability

PASS below means the stated unit/MSW checks ran. **PARTIAL** means the criterion also requires native evidence which is absent; helper tests are not represented as executed SQL/API tests.

| AC | Verdict | Evidence / gap |
|---|---|---|
| AC823-01 | PASS (unit/MSW) | `BUG-029 VN defaults and fresh presets independent of browser timezone`; real picker presets exercised in overview behavior spec |
| AC823-02 | PASS (unit/MSW) | URL hook atomic fallback, preserve filters, reload and reset; behavior reload keeps year+range |
| AC823-03 | PARTIAL | Shared schema 8 tests + MSW invalid query 400 pass; native API validation not reached |
| AC823-04 | PARTIAL | MSW unauthenticated 401 pass; native 401/403/permission test added, not executed |
| AC823-05 | PARTIAL | Service fake verifies bounded VN cohort args, totals/flow; MSW historical cohort test pass. PostgreSQL microsecond-boundary test added but unexecuted |
| AC823-06 | PARTIAL | 7/7/5 helpers, service response and mock aggregation verified; SQL latest snapshot/SUM native assertions unexecuted |
| AC823-07 | PARTIAL | Exact 12/02/2026 -> 29/12/2025 ISO lower bound verified in unit test. Native repository test uses equivalent isolated 2003/2004 boundary, not executed |
| AC823-08 | PASS (unit) | Cache isolation/default alias-equivalence, TTL60, stale payload missing spark and malformed JSON tests pass; Redis is mocked, not a native TTL observation |
| AC823-09 | PASS (unit/MSW) | Real picker/tab behavior, URL, selected state, 7/5 columns and all 4 unchanged monthly sparkline polylines; loading/error unit checks |
| AC823-10 | PASS (unit/MSW) | Hint, threshold, zero requests inside debounce window, Esc, Enter/arrow navigation |
| AC823-11 | PASS (unit/MSW) | Keyword empty text/HTML safety, no Enter route, pending/error not empty results |
| AC823-12 | PARTIAL | Portal targets, mobile hiding and existing keyboard behavior pass in MSW; native search/permission regression not run |
| AC823-13 | PARTIAL | MSW values change (not range echo), historical zero cohorts/live flow and conversion/CSV regression pass; native lane not run |

**6 AC verified at unit/MSW level; 7 PARTIAL. No overall DONE/READY verdict.**

## 5. UI parity / owner review

| Viewport | Current measurement | Pair |
|---|---|---|
| 1440 | **2.4831555886%** | [app](evidence/v46-823/D-01-1440.app.png) / [prototype](evidence/v46-823/D-01-1440.proto.png) / [diff](evidence/v46-823/D-01-1440.diff.png) |
| 390 | **2.3593343909%** | [app](evidence/v46-823/D-01-390.app.png) / [prototype](evidence/v46-823/D-01-390.proto.png) / [diff](evidence/v46-823/D-01-390.diff.png) |

- Measured at implementation `7c44fcab`; agent viewed both app/prototype pairs. Main blocks, picker, period underline and responsive conversion table are present. Owner image approval is **pending**, not implied by passing the pixel threshold (D-134).
- The harness uses its **pre-existing** `OVERVIEW_CHART_MASK` (DV-V2-307-4) for live charts/sparklines. No new masks, baseline changes or threshold changes. The chart area is therefore **not visually verified by the pixel percentage**; behavior tests separately assert column counts and unchanged sparkline points.
- Differences include live mock counts vs prototype constants, current VN day vs fixed prototype date, actual fee/conversion statuses and the pre-existing flag-vs-globe shell difference. Do not change business data to imitate prototype totals.
- D-01 row updates in shared parity results refer to this measured commit; no unrelated scenario was remeasured.

## 6. Native blocker and owner's hold

Initial native test reaches PostgreSQL but cannot initialize `ApiAppModule`: required `app_settings` record `ai` is absent (`appSetting.findUniqueOrThrow`). Required seed then reports missing `affiliate_policy.renewal_rate`. A guarded deploy attempt targeted **only `opchub_test`**, but migration `20261104090000_v46_regional_directors` fails P3018 / 42710 because enum label `regional_director` already exists. This is existing schema/migration drift, not a TIP migration.

Owner response on 10/11/2026: **“Giữ DB test, ghi native verification chưa đạt”**. After that response, no further DB migration/seed/reset was attempted. No DB drop, force reset, migration resolve, manual schema repair or development DB mutation. The failed deploy may leave a failed migration record in `_prisma_migrations`; enum/data were not cleared. Existing native services were not stopped/reconfigured; Playwright managed only its own isolated MSW servers.

Pending before implementation can be called DONE:

1. Owner/environment maintainer repairs migration history/schema and required seed, with separate authorization; do not reset under this TIP's current hold.
2. Run native overview integration + search regression, fix any real failures, then run the same behavior specs in native lane with unchanged assertions.
3. Run `EXPLAIN (ANALYZE, BUFFERS)` for week/month/year on >=10k representative rows; review indexes based on those plans. **No performance PASS or index-only scan claim** is made now.
4. Review captured UI pairs; masked charts still need unmasked visual inspection if required for approval.

## Quality Gate — Self-Review

- Scope/architecture: D-140 contract, shared zod, modular helpers/repository, frontend orchestrators, file caps, no new dependencies/migration; code committed/pushed with normal hooks.
- Verified: lint/typecheck/unit/depcheck/builds; focused tests; MSW behavior; existing D-01 parity measurement.
- Gaps: 7 AC need native evidence, SQL performance plans absent, owner UI approval pending. Overall **PARTIAL**, not DONE; no merge/release requested or performed.
