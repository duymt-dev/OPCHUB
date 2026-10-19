# TIP-V2-107: Trao đổi nhà đầu tư một luồng hai phía + thông báo, trạng thái chỉ đi tiến (completion)

> V2-P1, nhánh `feature/V2-P1-foundation-fixes`. IV-R01…R03, NA-11, BUG-006, BUG-007, TD-024 (phần NĐT).
> V2Q-62 (đã chốt), V2Q-71/72/73 (mới). Migration do agent chính tạo và áp: `bad1fd8`; builder không sửa schema.
> Commit: `29b611a` (server/shared/seed), `846d834` (web + MSW), `effb9f8` (e2e + cầu MSW) + commit báo cáo này.

## Đã làm
- **Shared**: `INVESTOR_TRANSITIONS`, `canInvestorTransition`, `INVESTOR_STATUS_LABEL`, `investorTransitionMessage`,
  `INVESTOR_ADMIN_NAME` trong `api-domains/investors-admin.ts` (bỏ ghi chú Q-G5c-3 "chọn tự do"). `NOTIFICATION_TYPES` thêm
  `invest`; outbox thêm `investor.admin_replied { investorKey, commentId }`. `NotificationBell` thêm `KIND.invest`
  (prototype không có `NT.invest` nên dùng giống `mention`).
- **Server investor**:
  - `domain/interest-status.ts`: `canTransition`, `assertTransition` (409), `statusesBefore`.
  - `repositories/investor-comment.repository.ts` (mới): đọc cả luồng theo `investor_key` 1 query (LEFT JOIN users lấy tên +
    `system_role`), ghi bình luận. `senderOf`: NĐT → tên NĐT; TK quản trị/không còn tác giả → "Admin OPC Hub"; `member` khác
    (tin cũ chủ dự án đã chuyển) → họ tên.
  - `InterestService.threads`: một phần tử, `key = first_interest_id`, dự án của quan tâm đầu tiên, `counterpartName = "Admin
    OPC Hub"`, `messages` = cả luồng. Chủ dự án → `items: []`. `send`: `key` phải là quan tâm của chính người gọi → ghi
    `investor_comments (from_investor = true, interest_id = key)`; người khác (kể cả chủ dự án) → 404. Tin NĐT không tạo
    thông báo, không đổi trạng thái.
  - `InvestorAdminService.comment`: ghi bình luận + `advanceSent` (có điều kiện) + outbox `investor.admin_replied` + audit cùng
    transaction. `comments` đọc chung bảng. `setStatus`: đọc trạng thái tổng hợp `from` → `assertTransition` → `UPDATE
    investor_summaries … WHERE status = from` (0 dòng → 409), quan tâm còn ở bước trước `to` được kéo lên `to`; audit
    `investor.status` có `diff {from,to}`. `commentCount` đếm `investor_comments`.
  - `services/investor-notify.handler.ts`: 1 query (comment ⨝ summary ⨝ quan tâm đầu tiên) → `NotificationService.notify`
    loại `invest`, tiêu đề "OPC Hub đã phản hồi quan tâm đầu tư của bạn", body bỏ thẻ ≤ 90 ký tự, link `/projects/<id>`.
  - `InvestorCoreModule` import `NotificationCoreModule`; `index.ts` export `InvestorNotifyHandler`.
  - Worker: `processors/investor.processor.ts` đăng ký consumer; `worker-app.module.ts` chỉ thêm 2 dòng + 2 import.
- **Seed demo**: `investor_comments` (2 tin mẫu Nguyễn Hoàng Nam), trạng thái tổng hợp "Đang trao đổi" khi có tin Admin;
  `reset.ts` xoá bảng mới. Chạy `seed:demo` trên opchub_dev: thành công.
- **Portal**: `funding-box.tsx` lấy luồng là phần tử duy nhất của `/me/investor-thread`, gửi bằng `threadKey` của dự án đang
  xem, bong bóng phải = `fromInvestor`. Copy `projects.json` giữ nguyên.
- **Admin**: `model.canStep`; drawer khoá bước lùi/nhảy cóc (`disabled` + `aria-disabled`, CSS chỉ đổi con trỏ để giữ
  parity). Toast 409: TIP-V2-106 chưa có trên nhánh; drawer khoá bước nên UI không gửi được PATCH sai, toast chung vẫn là
  "Không thực hiện được" — không sửa `use-investors.ts` (106 sở hữu).
- **MSW**: `investor-thread.ts` (một kho bình luận theo NĐT cho cả Admin và Portal, thông báo `invest`), `investors-admin.ts`
  (gom theo tên NĐT, `setInvestorStatus` 409 cùng thông điệp server), bỏ `threadMessages` khỏi `store.ts` / `ops-content.ts`.
  `investor-bridge.ts` + handler 2 app: cầu cookie `opchub-mock-iv` để Portal và Admin MSW chung dữ liệu (V2Q-72).

## Test (số thật)
- Unit: server 76/76 (`interest-status.spec.ts` +2: `BUG-007 §9 chỉ đi tiến…`, `BUG-007 chặn lùi và nhảy cóc`), shared 76/76,
  ui 25/25, integrations 25 + 2 skip, portal 94/94 (`domain-handlers.spec.ts`: `IV-R02 REQ-372 chủ dự án không có luồng…`,
  `IV-R02 BUG-006 NĐT 2 dự án → một luồng chung…`), admin 128/128 (`model.spec.ts` `BUG-007 canStep khoá bước lùi`;
  `g5c-handlers.spec.ts` `BUG-007 MSW đổi trạng thái lùi → 409…`, `IV-R01 BUG-006 bình luận Admin vào luồng chung…`).
- Int (opchub_test): toàn bộ **282/282** (67 file). Mới `investor-thread.int.spec.ts` 5 ca (AT-IV01 REQ-371, UAT-20 REQ-372,
  REQ-373, REQ-211, REQ-372 404; ca AT-IV01 ghi rõ relay chạy lại → 2 thông báo, chấp nhận theo quy ước). `investors.int.spec.ts`:
  sửa ca chủ dự án (giờ 404, trạng thái giữ `sent`), thêm `BUG-007 PATCH lùi → 409, nhảy cóc → 409, tiến → 200 + audit diff`.
  `outbox-consumers.int.spec.ts` (M1) xanh với loại mới.
- `pnpm lint` 8/8 (chỉ cảnh báo `<img>` có sẵn), `pnpm typecheck` 8/8, `pnpm depcheck`: không vi phạm; e2e lint/typecheck sạch.
- e2e MSW (build riêng `.next-107`, Portal 3310 / Admin 3311 / proto 4810, đã dừng và xoá sau khi chạy): behavior toàn bộ
  **126/126**. Mới/sửa: `investor-thread.spec.ts` (`IV-R02 … gửi tin bằng Enter`, `UAT-20 AT-IV01 Admin gửi → thành viên
  thấy thông báo + tin`), `admin-investors.spec.ts` (`BUG-007 drawer: … Đã kết nối → khoá bước lùi`).
- Parity D-58/D-59/D-60/P-69/P-71/P-72: 12/12 đạt (≤ 0,28%); không commit thay đổi file kết quả parity.

## e2e server: CHƯA chạy (lý do môi trường)
api/socket/worker dev trên 4000/4001 là bản build trước TIP này (chưa có bảng mới trong code, chưa có consumer
`investor.admin_replied`); Next chế độ server 3220/3222 cũng là bản cũ. Builder không dừng/khởi động lại tiến trình không do
mình tạo. Spec viết cùng assertion cho MSW và server (không nhánh `onServer`; bước chờ thông báo dùng `toPass` 30 s để đợi
relay worker). `e2e/audit/uat-interaction.audit.ts` mục UAT-20 cũng chưa chạy lại vì cùng lý do.
**Cần agent chính**:
1. Rebuild + restart api/socket/worker; rebuild `.next-server-v2` Portal/Admin.
2. `SERVER_PORTAL_PORT=3220 SERVER_ADMIN_PORT=3222 FAKE_MAIL_DIR=D:/opchub-local/mailbox pnpm e2e:server --project behavior`
   (ít nhất `investor-thread`, `admin-investors`, `projects`) và audit UAT-20.

## Ngoài phạm vi / ghi chú
- Không thông báo cho Admin khi NĐT trả lời (§12 không yêu cầu, V2Q-62); Admin thấy qua `commentCount`.
- Toast 409 hiển thị `e.message`: thuộc TIP-V2-106 (`use-investors.ts`).
- Nút "Nhắn tin" chủ dự án: TIP-V2-109.
- Lời nhắn kèm quan tâm không vào luồng (V2Q-71). Tin `-m0` cũ đã được migration chuyển vào `investor_comments` vẫn hiển
  thị (tác giả = NĐT).
