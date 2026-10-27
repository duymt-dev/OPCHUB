# TIP-V4-621: Admin Tổng quan "Luồng hệ thống" theo prototype v4 — D-89

## HEADER
- TIP-ID: TIP-V4-621
- Project: OPCHUB
- Module: `packages/shared` (schema Tổng quan, MSW) · `packages/db` (index) · server `modules/reporting` · Admin `features/overview` · e2e
- Priority: P1 (goal V4-UI, sau TIP-V4-620)
- Depends on: TIP-V4-620 (nhánh `feature/TIP-V4-620-projects-v4` chưa merge → xếp chồng)
- Estimated: M
- REQ / D: D-89, Q-V4-615-4, DV-V4-615-6, DV-V2-307-4 (giữ mask biểu đồ), S-03 (cache 60 giây)
- **Files touched:**
  - `packages/shared/src/api-domains/overview.ts` (modify): `events.upcoming`, `paid`, `flow`.
  - `packages/shared/src/mock-data/domains/overview.ts` (modify): số prototype v4, `mockOverview()` đếm Luồng hệ thống từ CSDL giả.
  - `packages/db/prisma/schema/membership-fee.prisma` (modify, chú thích), `packages/db/prisma/migrations/20261027140000_v4_overview_paid/migration.sql` (create): partial index `membership_fees_paid_at`.
  - `apps/server/src/modules/reporting/{overview.service,reporting.module}.ts` (modify), `overview-flow.repository.ts` (create), `apps/server/test/reporting/overview.int.spec.ts` (modify).
  - Admin: `features/overview/{data.ts,flow.ts,flow.spec.ts}`, `components/{overview-screen,stat-cards,growth-chart,system-flow}.tsx` + css, `messages/vi/overview.json`, `mocks/handlers/shell.ts`, `mocks/overview-handlers.spec.ts`.
  - e2e: `behavior/{admin-overview,realtime-metrics}.spec.ts`.
  - Báo cáo: `coding-packs/reports/ui-parity/{results.*,deviations.md,questions.md}`, `coding-packs/reports/TIP-V4-621-completion.md`.
- **Parallel-safe with:** sequential — chuỗi V4-617 → 624.

## CONTEXT
- Prototype `docs/spec/index.html` dòng 2544–2600 (`aOverview`, `flow.admin`), `FLOW.admin` (card: tên, giá trị, dòng phụ, CTA, Hoàn tất / Cần làm), `stats` (Thành viên 20.000 · Cộng đồng · Thành viên mới 2.165 · Sự kiện 12 / 4 sắp diễn ra), CSS mobile `minmax(170px)` → 2 cột.
- Bảng > 3% trước TIP: D-01 → D-05 35 – 42% / 4 – 33%, D-81 29,10 / 3,68%.

## APPLICABLE STANDARDS
- [frontend/ui-parity](../standards/frontend/ui-parity.md)
- [database/query-indexing](../standards/database/query-indexing.md) — đếm bằng `count` / `groupBy status` trên index sẵn có; partial index cho `paid_at`.
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md), [testing/testing](../standards/testing/testing.md)

## TASK
Thêm khối "Luồng hệ thống" vào Admin Tổng quan, đổi 4 thẻ số và số biểu đồ theo prototype v4; API `GET /admin/overview` trả số trực tiếp từ module phí, gian hàng, nhu cầu, dự án, nhóm.

## SPECIFICATIONS
### Business Rules
1. 5 thẻ theo thứ tự prototype; thẻ dự án "Cần làm" khi còn dự án chờ duyệt, còn lại "Hoàn tất".
2. Bấm thẻ mở module: `/fees`, `/stores`, `/needs`, `/projects?tab=pending`, `/groups`.
3. Thành viên đã đóng phí = phí `active` + `expiring`; đóng phí trong tháng = `paid_at` ≥ đầu tháng VN.
4. Cache Redis 60 giây giữ nguyên (S-03); quyền `overview.view` giữ nguyên.

### Validation / Error Handling
- Response parse bằng `adminOverviewSchema` (respond); cache hỏng → tính lại.

## ACCEPTANCE CRITERIA
- Given CSDL test When `GET /admin/overview` Then `flow` bằng đếm trực tiếp từng bảng.
- Given Admin MSW When mở Tổng quan Then 5 thẻ, "Dự án chờ duyệt 2 · Cần làm", bấm → tab Chờ duyệt.
- Parity D-01 → D-05, D-81 ≤ 3% ở 1440 + 390.

## CONSTRAINTS
- DO NOT: mask thêm, nới ngưỡng, sửa dữ liệu phí cho khớp "1 / 8".
- REUSE: `useOverview`, `tones`, `sparkPoints`.
- SKIP: Cài đặt / Bot / Sự kiện / danh mục (→ TIP-V4-622).

## ⚠️ BUILDER-CHECKLIST
- [x] Đúng `Files touched`
- [x] AC pass (int `test/reporting`; e2e `admin-overview`, `realtime-metrics`; parity)
- [x] Không query trong vòng lặp; cache 60 giây giữ nguyên
- [x] Commit theo đường dẫn, `git status --short` sạch
