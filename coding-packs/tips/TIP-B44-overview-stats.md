# TIP-B44: Admin Tổng quan + stats_daily + badge (S-10)

## HEADER
- TIP-ID: TIP-B44 · Module: reporting · Priority: P1 · Depends on: TIP-B15, TIP-B32 · Estimated: S (6h)
- **Files touched:**
  - `apps/server/src/modules/reporting/**` (create), `packages/shared/src/api-domains/overview.ts` (create)
  - `apps/server/src/worker/processors/stats.processor.ts`, `worker/schedules.ts`, `worker/worker-app.module.ts` (create/modify)
  - `apps/server/test/reporting/*.int.spec.ts` (create)
- **Parallel-safe with:** `sequential`.

## SPECIFICATIONS
1. Job `statsDaily {day}` (scheduler 00:10 VN): ghi `stats_daily` (members_total, members_new, members_active, groups, projects_live, projects_pending, events_upcoming) bằng 1 câu INSERT … SELECT ON CONFLICT; cập nhật `groups.weekly_active` (số người gửi tin 7 ngày, 1 câu UPDATE … FROM).
2. `GET /admin/overview` (`m.view`): KPI hiện tại (đếm có index / bảng nhỏ) + chuỗi 7 tháng từ `stats_daily`; cache Redis 60s. Schema `adminOverviewSchema` mới (FE nối ở B60).
3. `GET /admin/badges` (đăng nhập Admin): `{reports, projects, requests}` theo quyền của người gọi (không có quyền → 0) — thay 3 lời gọi rời của FE ở B60 (Q-B44-1).

## ⚠️ BUILDER-CHECKLIST
- [ ] Không Seq Scan bảng lớn trong job; gate; commit; SHA
