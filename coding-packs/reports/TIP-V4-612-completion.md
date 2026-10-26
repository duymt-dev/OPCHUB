# TIP-V4-612 — Kiểm duyệt §26.6 — completion

- Nhánh: `feature/TIP-V4-612-moderation-violations`, xếp chồng trên `feature/TIP-V4-611-onboarding-8-steps` (PR #28 chưa merge)
- PR: [#29](https://github.com/duymt-dev/OPCHUB/pull/29) (base `feature/TIP-V4-611-onboarding-8-steps`)
- Commit:
  - `21e51b23` TIP
  - `17ef8ac5` sửa lan e2e UAT-31 (thẻ Thành viên 9 ô sau cột Khởi đầu V4-611) — lỗi cuối pha P3
  - `89ca098e` backend: DB + shared + module moderation/account/chat + worker + test int
  - `fa345bcc` UI Portal / Admin + MSW
  - `ba6cbd14` e2e + parity + DV/Q
- REQ / D: REQ-507 · D-77, D-83 · §26.6 · AD-08

## Đã làm

- **DB** (`20261026150000_v4_moderation_violations`):
  - `report_action` thêm `restore`; enum `user_lock_kind (manual|auto)`;
  - `users.locked_until`, `users.lock_kind` (khoá cũ backfill `manual`);
  - bảng `moderation_violations` (UQ `report_id`, FK cascade);
  - index partial `moderation_violations_active (user_id, at DESC) WHERE revoked_at IS NULL`;
  - index partial `users_lock_expiry (locked_until) WHERE status='locked' AND locked_until IS NOT NULL`.
- **Shared**:
  - `LOCK_DAYS` 1/3/7/14/30, `moderationSettingsSchema`, `VIOLATION_WINDOW_DAYS = 90`, `AUTO_LOCK_FROM = 2`;
  - `reportSchema` + `violations`, `senderLocked`, `lockedUntil`, `canLock`;
  - `accountLockedUntilMessage` (giờ VN);
  - queue `scheduler.moderationUnlock`.
- **Server**:
  - `ViolationService.hideAndCount` chạy trong cùng transaction của báo cáo / job từ khoá:
    - ẩn có điều kiện `hidden_at IS NULL`;
    - một vi phạm / tin;
    - lần 1 `moderation.warned`, từ lần 2 khoá tự động N ngày qua `AdminUsersService.setStatusTx` (outbox `user.locked` + `user.session_revoked`, audit actor null);
    - phát `message.updated` cho phòng.
  - `restore` / `dismiss`:
    - hiện lại tin, thu hồi vi phạm, đóng mọi ca của tin;
    - mở khoá ngay khi khoá tự động và còn < 2 vi phạm;
    - khoá thủ công không tự mở.
  - Job từ khoá chạy lại cho tin đã khôi phục / bỏ qua thì không ẩn lại.
  - `lock` nhận `days`; `PUT /admin/users/:id/status` và bulk nhận `days`.
  - `GET/PUT /admin/moderation/settings` (`groups.view` / `groups.moderate`, audit `moderation.settings.update`).
  - `AccountLockService`:
    - quét hết hạn theo lô 500 qua `AccountLockProcessor` (5 phút);
    - kiểm khi login / refresh / TOTP;
    - 403 "Tài khoản bị khóa đến dd/mm/yyyy do vi phạm nội quy…".
  - Portal DTO giữ tin thành viên đã ẩn (body rỗng + `hiddenAt`), bỏ tin bot ẩn và tin ẩn trong kết quả tìm.
- **Portal**:
  - dòng "Tin nhắn đã bị ẩn do vi phạm nội quy cộng đồng." (không chọn được);
  - cache socket: thay tại chỗ / bỏ khỏi kết quả tìm;
  - toast báo cáo mới;
  - lỗi đăng nhập "khóa đến …";
  - i18n 10 ngôn ngữ.
- **Admin › Nhóm cộng đồng › Kiểm duyệt**:
  - thẻ "Đã ẩn tự động" / "Vi phạm lần n" / "Đã khóa N ngày";
  - nút "Khóa N ngày" + "Khôi phục tin";
  - khối "Quy tắc xử lý vi phạm" + "Thời gian khóa".
- **MSW**:
  - vi phạm, khoá có hạn, khôi phục, cài đặt;
  - job từ khoá chạy khi đọc tin (Portal) / đọc ca (Admin);
  - đăng nhập báo "khóa đến …".

## Câu hỏi đã chọn phương án an toàn

Q-V4-612-1..4 ở `ui-parity/questions.md`:

- Q-1: `dismiss` = Khôi phục tin.
- Q-2: cảnh báo người gửi qua thông báo `moderation.warned`, chưa có toast realtime.
- Q-3: cuộn danh sách chat ở 390 sau khi tải lại (có từ trước).
- Q-4: tin bot trúng từ khoá thì ẩn, không tính vi phạm.

## Test (số thật)

| Cổng | Kết quả |
|---|---|
| lint | 0 lỗi (cảnh báo `<img>` có từ trước) |
| typecheck | sạch |
| unit | server 225 · shared 390 · portal 397 · admin 446 · ui 48 · integrations 86 (+2 skip) |
| depcheck | sạch (1921 + 843 module) |
| build (MSW) | portal + admin |
| test:int phạm vi | chat, notification, socket, community, onboarding, admin-account, account, moderation, contract (coverage 234), common (outbox-consumers), gates, auth: **63 file / 1019/1019**; bot **20 file / 90/90** |
| db migration | `migration-moderation-violations.int.spec.ts` 2/2 |
| e2e behavior | moderation, chat, admin-groups, a-01-login, mobile-acceptance, admin-members: **43/43** |

Test mới / sửa:

- Int `test/moderation/violations.int.spec.ts` (5):
  - lần 1 ẩn + cảnh báo; lần 2 (từ khoá) khoá tự động 7 ngày + thu hồi phiên + 403 kèm ngày;
  - Khôi phục mở khoá tự động, 409 lần 2, job từ khoá chạy lại không ẩn lại;
  - khoá thủ công 3 ngày không tự mở, `groups.view` 403;
  - vi phạm cũ hơn 90 ngày không tính, đăng nhập + quét tự mở;
  - Thời gian khóa 7 → 14 (400 / 403 / audit) → lần khoá kế tiếp 14 ngày.
- Contract: settings GET/PUT.
- `moderation.int` / `b3-community-chat`: báo cáo ẩn ngay, vẫn giữ nhãn đã báo cáo.
- Bot int (`bot-reply-worker`, `persona-publication`): tin persona trúng từ khoá thì ẩn, không tính vi phạm. Từ khoá thử được thêm sau khi nhận phiên trả lời, để tin thành viên không bị ẩn trước khi bot trả lời (D-77).
- e2e `moderation.spec.ts` (2):
  - Admin: Thời gian khóa 14 → "Khóa 14 ngày" → Khôi phục tin;
  - Portal: tin trúng từ khoá thành dòng giữ chỗ, không chọn được.
- `chat.spec` báo cáo → ẩn + nhãn.
- `admin-groups.spec` Khôi phục tin tới rỗng.
- Unit: `room-reload.spec` (giữ chỗ trong phòng / bỏ khỏi tìm); `moderation-actions.spec`, `report-actions.spec`, `moderation-jobs.spec`, `moderation-lock.spec`.

## EXPLAIN (ANALYZE, BUFFERS) — `opchub_test`, 20.000 thành viên, 60.000 vi phạm, ROLLBACK

| Truy vấn | Kế hoạch | Thời gian |
|---|---|---|
| `count(userId)` 90 ngày | Index Only Scan `moderation_violations_active` (cond `user_id`, `at >`) | 0,09 ms |
| `counts(userIds[20])` cho trang thẻ Admin | Bitmap Index Scan `moderation_violations_active` → GroupAggregate | 0,22 ms |
| `expiredLocks` (LIMIT 500) | Bitmap Index Scan `users_lock_expiry` | 0,33 ms |

Không có Seq Scan.

## Parity (không mask, không nới ngưỡng)

| Màn | 1440 | 390 | |
|---|---|---|---|
| D-33 Kiểm duyệt tin nhắn | 0,24% | 0,45% | đạt |
| D-34 hết tin (Khôi phục tin ×4) | 0,08% | 0,22% | đạt |
| D-35 thêm từ khóa | 0,24% | 0,35% | đạt |
| D-98 Thời gian khóa 14 ngày (mới) | 0,24% | 0,37% | đạt |
| P-44 Modal báo cáo | 0,57% | 1,10% | đạt |
| P-45 đã báo cáo (tin ẩn + nhãn) | 2,20% | 6,47% | DV-V4-612-1 |
| P-121 tin đã bị ẩn sau khi báo cáo (mới) | 2,20% | 6,47% | DV-V4-612-1 |
| A-33 đăng nhập TK khoá có hạn | — | — | `unreachable` (DV-V4-612-2) |

DV-V4-612-1: ở 390, sau khi gửi hoặc báo cáo, MSW tải lại phòng và danh sách đứng ở đầu, còn prototype cuộn xuống cuối. P-34 @390 bị lệch như vậy từ trước V4-612: đo lại trên worktree `730b3a13` cũng ra 4,99%. Lệch thêm do dòng giữ chỗ của tin seed `rpt-r4`. Bước D-33…D-35 bỏ chờ "Hiển thị 1–12 / 34 nhóm" vì prototype v4 có 90 nhóm (DV-V4-603-3).

## Luật cứng 1–14

| # | Luật | |
|---|---|---|
| 1 | Kích thước file | ✅ lớn nhất `admin-users.service.ts` 223, `admin-moderation.service.ts` 197, mock `moderation-violations.ts` 176 |
| 2 | TS strict, không `any` | ✅ zod cho body (`days`, settings) + job |
| 3 | Ranh giới import | ✅ depcheck sạch; processor khoá tách riêng (`AccountLockProcessor`) |
| 4 | Phân quyền bằng key | ✅ `groups.view` / `groups.moderate`, `members.action` |
| 5 | DB: không query trong vòng lặp, index | ✅ đếm theo lô `ANY($ids) GROUP BY`, quét lô 500, EXPLAIN ở trên |
| 6 | Realtime | ✅ `message.updated` một lần cho phòng, không truy vấn theo người nhận |
| 7 | Đổi trạng thái có điều kiện | ✅ ẩn `hidden_at IS NULL`; mở khoá `lock_kind='auto' AND locked_until <= now` |
| 8 | Outbox | ✅ `moderation.warned`, `user.locked`, `user.session_revoked`, `user.unlocked` cùng transaction |
| 9 | Thời gian UTC | ✅ `timestamptz`; ngày hiển thị theo `Asia/Ho_Chi_Minh` |
| 10 | Audit Admin | ✅ `moderation.restore/lock`, `moderation.settings.update`, `user.lock` (hệ thống) |
| 11 | Adapter | — không dịch vụ ngoài mới |
| 12 | Không secret, không `console.*` | ✅ |
| 13 | Test ở file riêng | ✅ |
| 14 | Commit theo đường dẫn, status sạch | ✅ |

## Chưa làm / chuyển tiếp

- Toast realtime cho người gửi khi tin bị ẩn (Q-V4-612-2).
- Cuộn danh sách chat ở 390 sau khi tải lại phòng (Q-V4-612-3): ngoài phạm vi, nên làm ở TIP chat.
- Owner duyệt DV-V4-612-1..2 và Q-V4-612-1..4.
- Pha P3: e2e toàn bộ 297/302 + 1 lỗi đã sửa ở `17ef8ac5`. Ghi chi tiết vào `V4-P3-completion.md`.
