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

## Enum trạng thái (SRS §8)

| Đối tượng | Giá trị | Nhãn UI |
|---|---|---|
| `User.status` | `active`, `locked` | Hoạt động, Đã khóa |
| `MembershipFee.status` | `pending_payment`, `active`, `expiring`, `expired` | Chờ thanh toán, Đang hiệu lực, Sắp hết hạn, Hết hạn |
| `PaymentTransaction.matchStatus` | `unmatched`, `matched`, `manual`, `ignored` | |
| `GroupMember.status` | `pending`, `member`, `rejected`, `cancelled`, `left`, `removed` | Chờ duyệt, Thành viên, Từ chối, Đã hủy, Đã rời, Bị mời ra |
| `Group.joinMode` | `open`, `approval` | Công khai, Cần duyệt |
| `Project.status` | `draft`, `pending_review`, `published`, `hidden`, `needs_changes`, `rejected` | Nháp, Chờ duyệt, Đang hiển thị, Đã ẩn, Cần chỉnh sửa, Bị từ chối |
| `Project.visibility` | `public`, `private` | |
| `Project.stage` | `idea`, `mvp`, `growth`, `launched` | Ý tưởng, MVP, Tăng trưởng, Đã ra mắt |
| `Report.status` | `open`, `resolved` | Mới, Đã xử lý |
| `Report.action` | `dismiss`, `hide`, `warn`, `lock` | Bỏ qua, Ẩn tin, Cảnh báo, Khóa |
| `EventRegistration.status` | `registered`, `attended`, `cancelled` | |
| `Event.mode` | `online`, `offline` | |
| `InvestorInterest.status` | `sent`, `in_discussion`, `connected` | Đã gửi, Đang trao đổi, Đã kết nối |
| `InvestorInterest.kind` | `individual`, `business`, `fund` | Cá nhân, Doanh nghiệp, Quỹ |
| `ServiceRequest.status` | `new`, `consulting`, `quoted`, `won`, `lost` | Mới, Đang tư vấn, Đã báo giá, Thành công, Từ chối |

Nhãn tiếng Việt chỉ đặt trong file messages của next-intl, không viết cứng trong component.
