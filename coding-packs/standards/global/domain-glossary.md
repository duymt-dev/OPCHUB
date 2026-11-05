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

## GĐ Vùng (D-120, D-128, D-129)

| Thuật ngữ | Code / dữ liệu | Ý nghĩa |
|---|---|---|
| Giám đốc Vùng (GĐ Vùng) | `RegionalDirector`, `regional_directors` | Thành viên được bổ nhiệm phụ trách một trong ba miền |
| Ô vùng | `RegionalDirector.region` | Ba ô cố định Bắc, Trung & Tây Nguyên, Nam; thu hồi chỉ làm trống ô |
| Tỉnh phụ trách | `regional_director_provinces` | Phạm vi hiển thị; không quyết định bên nhận chia sẻ doanh thu (D-129) |
| Miễn phí · GĐ Vùng | `MembershipFeeStatus.regional_director` | Miễn phí không hạn trong nhiệm kỳ; không tính là khoản phí thực thu |
| Quyền bổ nhiệm / thu hồi | `affiliate.regional` | Quyền ghi cấu hình GĐ Vùng; `affiliate.view` chỉ cho xem |
| Sổ chia sẻ | `RegionalShare`, `regional_shares` | Snapshot chia doanh thu cho GĐ Vùng từ giao dịch thực thu; không phải khoản hoa hồng chi trực tiếp cho affiliate |
| Năm của khách | `CustomerYear`, `customer_years` | Mốc giao dịch thực thu đầu tiên, gồm Gọi vốn; tính năm theo ngày kỷ niệm tại Việt Nam |
| Kỳ chi | `month_key`, `RegionalPayout.monthKeys` | Tháng Việt Nam của khoản ghi nhận; chỉ chi các tháng đã đóng |
| Biên lai chi GĐ Vùng | `RegionalPayout`, `regional_payouts` | Tổng VND bigint, người nhận và ngân hàng snapshot; lưu bền vững để chống chi trùng |
| Quy tắc chia sẻ | `regionalFirstYear`, `regionalStep`, `regionalMin` | Tỷ lệ năm đầu, mức giảm mỗi năm, mức sàn; thay đổi chỉ áp dụng khoản mới |
| Doanh thu Media Soft giữ lại | `netRevenue = revenue - regionalTotal` | Sau phần GĐ Vùng cùng phạm vi tháng; hủy hoa hồng không đảo sổ chia sẻ (D-132) |
| Thuộc vùng (theo tỉnh) | `AffiliateAdminRow.region` | Projection chỉ đọc từ nhóm tỉnh tham gia sớm nhất còn hiệu lực; không phải thao tác gán vùng |
| GĐ Vùng chi | Nhãn lịch sử tháng affiliate | Media Soft không chi trực tiếp affiliate; GĐ Vùng tự chi ngoài hệ thống (D-119) |
| Vùng của tôi | `GET /me/gdv`, `/affiliate?tab=reg` | Màn chỉ đọc cho GĐ Vùng hiện tại, chỉ gồm các khoản snapshot ghi cho chính người nhận đó |
| Phần GĐ Vùng được chia | `kpi.share`, `years[].share` | Tổng `director_amount` đã chụp, không tính lại theo chính sách hiện hành |
| Chờ chi cuối tháng | `kpi.due` | Tổng phần GĐ Vùng trừ phần đã chi; không phải lệnh chi và không thay quy tắc chỉ chi tháng đã đóng |
| Nhắc gia hạn | `app_settings.renewal`, `renewal` | Nhắc Gói Cá nhân / Doanh nghiệp, kể cả trial; không GĐ Vùng hoặc Gọi vốn (REQ-620) |
| Mốc nhắc | `D30`, `D7`, `D1` | Cửa sổ 30 / 7 / 1 ngày lịch VN trước hạn, tự động mỗi kỳ/mốc tối đa một lần |
| Lần gửi | `max(fee_reminders.sent_at)` | Lần gần nhất của mọi kỳ; gửi tay dùng `M:yyyy-mm-dd` theo ngày VN, không chặn mốc tự động |
| Đối soát ngân hàng | `bank`, `payment_transactions` | Đối chiếu giao dịch thực thu với thành viên / khoản phí, giữ nguyên cú pháp OPCHUB |
| Tự kích hoạt khi khớp | `app_settings.bank.autoActivate` | Công tắc lưu ngay có audit; bật lại không replay giao dịch đã chờ (D-135) |
| Ghi nhận thiếu | `match_status = short`, `short_note` | Ghi chú bắt buộc, không kích hoạt hoặc cộng dồn giao dịch (D-135) |
| Khóa bí mật webhook | `bank_webhook_keys.key_enc`, `hint` | Mã hóa, chỉ trả rõ một lần khi tạo lại; khóa cũ mất hiệu lực ngay |
### V4.6 — TIP-V46-807

| Thuật ngữ | Code | Nghĩa |
|---|---|---|
| Tỷ lệ chuyển đổi | conversion / ratePct | Đã trả phí / (Đã trả phí + Hết hạn chưa trả), làm tròn %, không tính đang dùng thử vào mẫu số |
| Nhật ký hoạt động | audit log | Nhật ký Admin chỉ ghi thêm; màn hình và CSV hiển thị90 ngày, DB giữ theo NA-13/REQ-213 |

### V4.6 — TIP-V46-808

| Thuật ngữ | Code | Nghĩa |
|---|---|---|
| Tìm kiếm chung | global search | Ô topbar tìm gian hàng, nhu cầu, dự án, nhóm và thành viên (chỉ Admin), theo quyền/visibility; tối đa4 mỗi nhóm |
