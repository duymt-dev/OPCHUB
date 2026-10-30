# Domain glossary

Một khái niệm chỉ có một tên trong code. UI hiển thị tiếng Việt qua next-intl.

## Thực thể

| Tiếng Việt (SRS) | Code / model | Bảng |
|---|---|---|
| Người dùng / Thành viên | `User` | `users` |
| Hồ sơ doanh nghiệp | `BusinessProfile` | `business_profiles` |
| Loại tài khoản (Cá nhân / DN / Nhà đầu tư) | `accountType`: `personal`, `business`, `investor` | |
| Vai trò đăng ký (Chuyên gia, Giảng viên…) | `registrationRole` (chỉ là thuộc tính hồ sơ, **không cấp quyền**) | |
| Vai trò hệ thống | `systemRole`: `super_admin`, `admin`, `moderator`, `member` | |
| Mã TV | `memberCode` (`TV` + 6 số) | |
| Phí thành viên (trạng thái hiện hành) | `MembershipFee` (không gọi tắt là `Membership` để tránh nhầm với thành viên nhóm) | `membership_fees` |
| Kỳ phí | `MembershipFeePeriod` | `membership_fee_periods` |
| Miễn phí 3 tháng | `MembershipFee.status = trial` (không dùng cờ riêng, V-11) | |
| Đã kích hoạt (qua cổng quyền) | `isFeeUsable(fee, now)` — trial / active / expiring còn hạn | |
| Cấu hình bảng giá | `PriceConfig` (`per`, `biz`, `fund`: `list`, `y`, `p`, `r`, `mo`, `aff`) | `price_configs` |
| Gói | `plan`: `personal`, `business`, `fundraising` (dùng chung cho phí, hoa hồng) | |
| Mã khoản Gọi vốn | `GV` + 6 số (`ProjectFundraising.code`) | |
| Nội dung chuyển khoản | `transferContent` (`OPCHUB TVxxxxxx 0xxxxxxxxx [GVxxxxxx]`, §28.1) | |
| Đại lý / mã giới thiệu | `Affiliate` (`code`) — mọi thành viên từ khi đăng ký (D-94 3A) | `affiliates` |
| GĐ Vùng | `RegionalDirector` — người đương nhiệm tại một trong ba ô `north`, `central`, `south` (D-120); không phải vai trò quản trị | `regional_directors` (V46-801) |
| Bổ nhiệm / thu hồi GĐ Vùng | `appoint` / `revoke`; thu hồi để trống ô, không xóa vùng; giữ nguyên hạn phí trước bổ nhiệm (BR-462) | |
| Hoa hồng | `Commission` (`plan`, `listAmount`, `rate`, `amount`) | `commissions` |
| File chia sẻ (nhóm) | `GroupFile` (view đọc từ `Message` có đính kèm) | |
| Trả lời từng tin (bot) | `BotReply` | `bot_replies` |
| Lịch chạy bot | `BotSettings.schedule { from, to }` | |
| Loại hội thoại (bot) | `BotConversationType` (có sẵn + tự định nghĩa) | `bot_conversation_types` |
| Cấu hình AI | `LlmConfig` (key mã hoá) | `llm_configs` |
| Gian hàng | `Store` (`status`: `draft`, `published`, `hidden`) | `stores` |
| Giao dịch chuyển khoản | `PaymentTransaction` | `payment_transactions` |
| Đối soát | `reconcile` | |
| Nhóm cộng đồng | `Group` | `groups` |
| Thành viên nhóm / yêu cầu vào nhóm | `GroupMember` | `group_members` |
| Chủ nhóm | `groupRole = owner` | |
| Điều phối viên (trong nhóm) | `groupRole = moderator` | |
| Phòng chat | `Room` | `rooms` |
| Tin nhắn | `Message` | `messages` |
| Sự kiện outbox | `OutboxEvent` | `outbox_events` |
| Mốc đã đọc | `RoomReadCursor` | `room_read_cursors` |
| Báo cáo vi phạm | `Report` | `reports` |
| Từ khóa nhạy cảm | `ModerationKeyword` | `moderation_keywords` |
| Sự kiện / đăng ký sự kiện | `Event` / `EventRegistration` | `events` / `event_registrations` |
| Dự án OPC | `Project` | `projects` |
| Gọi vốn | `ProjectFunding` | `project_fundings` |
| Quan tâm đầu tư | `InvestorInterest` | `investor_interests` |
| Trao đổi với nhà đầu tư | `InvestorThreadMessage` | `investor_thread_messages` |
| Danh mục lĩnh vực | `Category` | `categories` |
| Thông báo | `Notification` | `notifications` |
| Nhật ký | `AuditLog` | `audit_logs` |
| Persona (bot) | `Persona` | `personas` |
| Phiếu YC dịch vụ | `ServiceRequest` (`code` = `YC-xxxx`) | `service_requests` |

## Enum trạng thái (SRS §9)

| Đối tượng | Giá trị | Nhãn UI |
|---|---|---|
| `User.status` | `active`, `locked` | Hoạt động, Đã khóa |
| `MembershipFee.status` | `trial`, `pending_payment` (cũ, D-116 huỷ), `active`, `expiring`, `expired` | Miễn phí 3 tháng, Chờ thanh toán, Đang hiệu lực, Sắp hết hạn, Hết hạn |
| `PaymentTransaction.matchStatus` | `unmatched`, `matched`, `manual`, `ignored` | |
| `GroupMember.status` | `pending`, `member`, `rejected`, `cancelled`, `left`, `removed` | Chờ duyệt, Thành viên, Từ chối, Đã hủy, Đã rời, Bị mời ra |
| ~~`Group.joinMode`~~ | bỏ duyệt vào nhóm (D-71), luôn `open` | Công khai |
| `Project.status` | `draft`, `pending_review`, `published`, `hidden`, `needs_changes`, `rejected` | Nháp, Chờ duyệt, Đang hiển thị, Đã ẩn, Cần chỉnh sửa, Bị từ chối · D-108: đăng khi đã kích hoạt → `published` ngay, sửa không duyệt lại |
| `Project.visibility` | `public`, `private` | |
| `Project.stage` | `idea`, `mvp`, `growth`, `launched` | Ý tưởng, MVP, Tăng trưởng, Đã ra mắt |
| `Report.status` | `open`, `resolved` | Mới, Đã xử lý |
| `Report.action` | `dismiss`, `hide`, `warn`, `lock` | Bỏ qua, Ẩn tin, Cảnh báo, Khóa |
| `EventRegistration.status` | `registered`, `attended`, `cancelled` | |
| `Event.mode` | `online`, `offline` | |
| ~~`InvestorInterest.status`~~ | bỏ (D-72) | |
| `InvestorInterest.kind` | `individual`, `business`, `fund` | Cá nhân, Doanh nghiệp, Quỹ |
| ~~`ServiceRequest.status`~~ | bỏ (D-72) | |
| `Commission.status` | `recorded`, `paid`, `cancelled` (cancelled → recorded khôi phục được, D-110) | Đã ghi nhận, Đã chi trả, Đã hủy |
| `ProjectFundraising.status` | `pending_payment`, `pending_review`, `active`, `rejected` (→ `pending_review` khi bổ sung, D-113), `expired` | Chờ thanh toán, Chờ duyệt, Đang gọi vốn, Từ chối, Hết hạn |

Nhãn tiếng Việt chỉ đặt trong file messages của next-intl, không viết cứng trong component.

## Chia sẻ doanh thu (D-119 → D-122)

- **Sổ chia sẻ / Revenue share ledger:** bản ghi phân bổ phí thực thu đã đối soát
  giữa Media Soft và GĐ Vùng; khác hoa hồng affiliate chỉ để tham khảo.
- **Năm của khách / Customer year:** chu kỳ 12 tháng tính từ giao dịch thực thu
  đầu tiên trên mọi loại gói, không tính từ đăng ký hoặc ngày bắt đầu kỳ gia hạn.
- **Kỳ chi / Payout period:** tháng lịch Việt Nam của khoản ghi nhận; chỉ chi sau
  khi tháng kết thúc, từng GĐ Vùng, lưu tài khoản nhận và người ghi nhận chi.
- **Biên lai chi / Payout receipt:** kết quả chi được lưu bền vững để phát lại
  yêu cầu không chi hai lần; không đồng nghĩa hệ thống gọi chuyển khoản ngân hàng.
- `RevenueShare.status`: `recorded` (Đã ghi nhận), `paid` (Đã chi trả).
