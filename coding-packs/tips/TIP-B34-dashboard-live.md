# TIP-B34: Dashboard Portal `/dashboard/live` (REQ-120, Q-G2a-1/3)

## HEADER
- TIP-ID: TIP-B34 · Module: dashboard · Priority: P1 · Depends on: TIP-B23, TIP-B32 · Estimated: M (6h)
- **Files touched:**
  - `apps/server/src/modules/dashboard/**` (create: `services/dashboard-live.service.ts`, `controllers/dashboard.controller.ts`, `dashboard.module.ts`, `index.ts`)
  - `apps/server/src/api/api-app.module.ts` (modify)
  - `apps/server/test/dashboard/dashboard.int.spec.ts` (create)
- **Parallel-safe with:** TIP-B33.

## SPECIFICATIONS
1. Số thật: `communityCount` (nhóm chưa xoá), `stats.totalMembers` (users active), `stats.online` (`PresenceService`), `messagesToday` (từ 0h VN), `eventJoins` (đăng ký còn hiệu lực của sự kiện sắp tới).
2. Phần mô phỏng (members / activities / countries / messages / sessions / threads) theo seed prototype (Q-G2a-3) tới khi bot B45 có dữ liệu thật — ghi Q-B34-1.
3. Cache Redis 10s (`dashboard:live`), không tính lại mỗi request (S-10).

## ACCEPTANCE CRITERIA
- Payload parse `dashboardLiveSchema`; 2 lần gọi trong 10s → 1 lần tính.

## ⚠️ BUILDER-CHECKLIST
- [ ] gate; commit; SHA
