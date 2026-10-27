# TIP-V4-618: Shell, avatar, Dashboard, Chat và Hồ sơ theo prototype v4 — D-89

## HEADER
- TIP-ID: TIP-V4-618
- Project: OPCHUB
- Module: `packages/ui` (avatar khung) · Portal `features/{dashboard,chat,profile}` · membership-fee (API mới) · MSW seed · e2e
- Priority: P1 (goal V4-UI, sau TIP-V4-617)
- Depends on: TIP-V4-617 (nhánh `feature/TIP-V4-617-auth-v4`, PR #34 chưa merge → xếp chồng)
- Estimated: L
- REQ / D: D-89, Q-V4-615-3, DV-V4-615-4, DV-V4-612-1, Q-V4-612-3, D-47 (giữ), D-71 (giữ)
- **Files touched:**
  - `packages/ui/src/user-avatar/me-avatar.tsx` (create), `index.ts`, `app-shell/{topbar,user-menu}.tsx` (modify): avatar người đang đăng nhập = chữ viết tắt nền #1677FF.
  - `apps/portal/src/features/dashboard/**` (delete khối LIVE; `dashboard-screen.tsx` chỉ còn lời chào + "Hướng dẫn bắt đầu"), `messages/*/dashboard.json`.
  - `apps/portal/src/features/profile/**` (tab "Gói & thanh toán", thẻ 2 số, liên kết chỉ Google), `messages/*/profile.json`.
  - `packages/shared/src/api-domains/membership.ts`, `apps/server/src/modules/membership-fee/{controllers/me-membership.controller,services/membership-fee.service,repositories/membership-fee.repository}.ts`, `apps/server/test/membership-fee/fee-periods.int.spec.ts`: `GET /me/membership/periods`.
  - `apps/portal/src/features/chat/{components/message-{body,row,list}.tsx,hooks/use-stick-to-bottom.ts}`.
  - MSW / seed: `packages/shared/src/mock-data/domains/{store,report-demo-history,fee-history,admin}.ts`, xoá `bot-demo-history.ts`; `packages/db/seed/demo/chat.ts`.
  - e2e: `behavior/{portal-shell,mobile-acceptance,admin-members,bot-auto-lifecycle,profile}.spec.ts`, `parity/scenarios/{portal-shell,portal-chat,admin-groups}.ts`.
  - Báo cáo: `coding-packs/reports/ui-parity/{results.*,deviations.md,questions.md}`, `coding-packs/reports/TIP-V4-618-completion.md`.
- **Parallel-safe with:** sequential — chuỗi V4-617 → 624.

## CONTEXT
- Prototype `docs/spec/index.html`: `av(sz)` (ảnh nếu có, không thì `ini()` nền #1677FF, chữ 0,36 × cỡ); Dashboard chỉ còn lời chào + "Hướng dẫn bắt đầu"; Hồ sơ `prTabs` 5 tab (thêm "Gói & thanh toán" — `prBill`), `me.stats` 2 ô (Nhóm, Sự kiện), `SSO=[google]`; phòng chat không có tin bot / tin "đã bị ẩn" seed.
- Bảng màn > 3% trước TIP: `TIP-V4-615-completion.md`, `results.md` (P-01 72 / 75%, P-28 → P-48 @390 3 – 9%, P-89 → P-94 @390 6,6 – 8,8%, P-93 / P-94 19,8%).

## APPLICABLE STANDARDS
- [frontend/ui-parity](../standards/frontend/ui-parity.md), [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md), [frontend/data-state](../standards/frontend/data-state.md)
- [database/query-indexing](../standards/database/query-indexing.md) — kỳ phí đọc theo index `(user_id, ends_at DESC)`, chỉ select cột cần.
- [testing/testing](../standards/testing/testing.md), [global/code-structure](../standards/global/code-structure.md)

## TASK
Đưa khung Portal (avatar), Dashboard, Chat @390 và Hồ sơ về đúng prototype v4; thêm API lịch sử kỳ phí cho tab "Gói & thanh toán"; chỉnh dữ liệu MSW / seed demo cho khớp seed prototype.

## SPECIFICATIONS
### Business Rules
1. Avatar người đang đăng nhập: có ảnh → ảnh; chưa có → chữ viết tắt (chữ đầu từ đầu + từ cuối) nền #1677FF. Avatar người khác giữ như cũ.
2. Dashboard: chỉ lời chào + "Hướng dẫn bắt đầu"; API `/dashboard/live` giữ ở server (không xoá trong TIP UI).
3. Hồ sơ: thẻ 2 số (Nhóm, Sự kiện); tab "Gói & thanh toán" = gói theo loại TK (D-68, giá `MEMBERSHIP_PLANS`), trạng thái phí từ phiên, lịch sử = kỳ phí (`GET /me/membership/periods`) + Gói Gọi vốn có mã CK (`GET /me/fundraisings`); mã CK hiển thị là mã thật (BR-04 / D-41), không dùng mã giả của prototype.
4. "Tài khoản liên kết" chỉ liệt kê `LOGIN_SSO_IDS` (Google); khoá huỷ liên kết cuối khi chưa có mật khẩu (BUG-030) tính trên các liên kết còn hiển thị.
5. Chat: phòng không có tin "đã bị ẩn" lịch sử (tin của ca kiểm duyệt seed đặt `deleted_at`, ca vẫn trỏ tới tin để Admin xem); MSW không seed tin bot. Danh sách đang ở cuối thì giữ ở cuối khi phòng tải lại.
6. Giữ D-47 (không gửi mật khẩu qua email) và D-71 (bỏ duyệt vào nhóm) — nghiệp vụ bảo mật / quyền.

### Validation / Error Handling
- `GET /me/membership/periods`: cần đăng nhập (401), mở được khi chưa đóng phí (`@SkipMembershipFee`), parse zod `myFeePeriodsSchema` khi trả.

## ACCEPTANCE CRITERIA
- Given TK An đăng nhập When mở Hồ sơ Then topbar hiện "NA", thẻ không có ô "Dự án", tab "Gói & thanh toán" hiện "Gói Doanh nghiệp · Đang hoạt động · 300.000đ/tháng · 3.600.000đ/năm · Hiệu lực đến …" và lịch sử "Gói Doanh nghiệp · 12 tháng · Đã thanh toán".
- Given 2 kỳ phí của tôi + 1 của người khác When `GET /me/membership/periods` Then chỉ 2 kỳ của tôi, mới nhất trước.
- Given Bảo mật When mở Then chỉ có Google.
- Given Chat @390 When gửi / báo cáo tin Then danh sách đứng ở cuối như prototype.
- Parity P-01, P-07 → P-16, P-28 → P-39, P-89 → P-94 ≤ 3% ở 1440 + 390.

## CONSTRAINTS
- DO NOT: nới ngưỡng, mask thêm, sửa prototype, gửi mật khẩu qua email, bịa mã CK.
- REUSE: `MEMBERSHIP_PLANS`, `formatVnd` / `formatDate`, `openPricingPopup`, `Tag`.
- SKIP: Cộng đồng 90 nhóm (P-17 → P-27, P-46 → P-48 → TIP-V4-619).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched`
- [ ] AC pass từng cái (e2e `profile.spec.ts`, int `fee-periods.int.spec.ts`, parity)
- [ ] `pnpm lint && pnpm typecheck && pnpm test`, `pnpm depcheck`, build MSW
- [ ] Query mới đi theo index, không query trong vòng lặp; FE ≤ 400 dòng
- [ ] Commit theo đường dẫn, báo SHA thật
