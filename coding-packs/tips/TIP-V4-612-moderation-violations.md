# TIP-V4-612: Kiểm duyệt §26.6 — tự ẩn, đếm vi phạm 90 ngày, tự khoá N ngày, Khôi phục tin, tự mở khoá

## HEADER
- TIP-ID: TIP-V4-612
- Project: OPCHUB
- Module: moderation (server) · account (khoá có hạn, đăng nhập) · db · shared · worker · admin (groups › tab Kiểm duyệt) · portal (chat: dòng tin bị ẩn; đăng nhập báo ngày mở khoá)
- Priority: P0 (REQ-507)
- Depends on: V4-607 (cùng `account.prisma`); xếp chồng V4-611 (PR #28 chưa merge)
- Estimated: L
- REQ / D: REQ-507 · D-77, D-83 (mở rộng D-44, D-55) · §26.6 "Tin nhắn nhạy cảm / Khôi phục tin / Tự mở khóa" · §27.1 QT-06 · §27.6 AD-08 · §27.8
- **Files touched:**
  - `packages/db/prisma/schema/moderation.prisma` (modify): `ModerationViolation`.
  - `packages/db/prisma/schema/account.prisma` (modify): `User.lockedUntil`, `User.lockKind` (enum `UserLockKind { manual, auto }`).
  - `packages/db/prisma/migrations/20261026150000_v4_moderation_violations/` (create), `packages/db/test/migration-moderation-violations.int.spec.ts` (create).
  - `packages/shared/src/api-domains/chat.ts` (modify):
    - `reportSchema` thêm `violations`, `senderLocked`, `lockedUntil`, `canLock`;
    - `REPORT_ACTIONS` thêm `restore`;
    - `reportActionSchema` thêm `days`;
    - `moderationSettingsSchema`, `LOCK_DAYS`, `MODERATION_MESSAGES`.
  - `packages/shared/src/api-domains/admin-members.ts` (modify): `userStatusUpdateSchema.days?` (khoá thủ công chọn ngày).
  - `packages/shared/src/errors.ts` (modify): `lockedUntilMessage(date)`.
  - `packages/shared/src/outbox/events.ts` (modify): `moderation.violated`.
  - `packages/shared/src/mock-data/domains/**` (modify / create `moderation-violations.ts`): ẩn ngay, đếm, khoá, khôi phục.
  - `apps/server/src/modules/moderation/**` (modify / create):
    - `services/violation.service.ts` (create): ẩn + ghi vi phạm + khoá tự động;
    - `repositories/violation.repository.ts` (create);
    - `report.service.ts`: báo cáo → ẩn ngay; từ khoá → ẩn ngay;
    - `admin-moderation.service.ts`: `restore`, `lock` có ngày;
    - `moderation-settings.service.ts` (create): `moderation.autoLockDays` trong `app_settings`;
    - controller.
  - `apps/server/src/modules/account/**` (modify):
    - `admin-users.repository.setStatus` + `admin-users.service.setStatus`: `lockedUntil` / `lockKind`;
    - `auth.service`: tự mở khi hết hạn, 403 kèm ngày mở khoá;
    - `services/auto-unlock.service.ts` (create).
  - `apps/server/src/worker/processors/{moderation,scheduler}.processor.ts` (modify), `schedules.ts` (modify: `moderation-auto-unlock` mỗi 5 phút).
  - `apps/server/test/moderation/*.int.spec.ts` (create / modify), contract + coverage + `api-contract.md`.
  - `apps/admin/src/features/groups/**` (modify):
    - thẻ Kiểm duyệt v4: "Đã ẩn tự động", "Vi phạm lần n" / "Đã khóa N ngày", "Khóa N ngày", "Khôi phục tin";
    - khối "Quy tắc xử lý vi phạm" + chọn thời gian khoá.
  - `apps/admin/src/features/members/**` (modify): hộp thoại khoá chọn số ngày.
  - `apps/admin/src/mocks/handlers/moderation.ts`, `apps/admin/messages/vi/groups.json` (modify).
  - `apps/portal/src/features/chat/components/message-body.tsx` (modify): tin bị ẩn hiện "Tin nhắn đã bị ẩn do vi phạm nội quy cộng đồng."; `use-message-actions.ts` (modify: không xoá tin ẩn khỏi cache).
  - `apps/portal/src/features/auth/**` (modify nếu cần): hiện thông báo khoá có ngày.
  - `e2e/behavior/moderation.spec.ts` (create); parity `e2e/parity/scenarios/admin-groups.ts` (modify D-33 → D-35), `portal-moderation.ts` (create) + registry.
- **Parallel-safe with:** sequential — dùng chung `account.prisma`, `admin-users.*`, `auth.service`, `outbox/events.ts`, `chat.ts` với V4-607 / V4-611.

## CONTEXT
§26.6 (nguyên văn):
- "Tin chứa từ khóa cấm hoặc bị thành viên báo cáo được ẩn ngay khỏi phòng chat (hiển thị “Tin nhắn đã bị ẩn do vi phạm nội quy cộng đồng”)."
- "Lần 1: ẩn + cảnh báo. Từ lần 2: tự động khóa tài khoản N ngày (mặc định 7, Admin chọn 1/3/7/14/30 ngày); nếu đang đăng nhập sẽ bị đăng xuất, đăng nhập lại báo ngày mở khóa. Admin có thể Khôi phục tin (không vi phạm) hoặc khóa thủ công."
- "Khôi phục tin: tin hiện lại nguyên văn trong phòng chat, lần vi phạm đó không được tính. Nếu sau khi trừ còn dưới 2 lần vi phạm và tài khoản đang bị khóa tự động thì mở khóa ngay."
- "Tự mở khóa: hệ thống kiểm tra định kỳ và khi đăng nhập: hết thời hạn khóa thì tự mở."

Quyết định:
- AD-08: tab trong Nhóm cộng đồng (đã có từ V2), danh sách tin bị ẩn, bộ lọc, Khôi phục tin, khoá theo ngày.
- D-77: áp đầy đủ.
- D-83: đếm vi phạm trong 90 ngày; Admin chọn 1/3/7/14/30, mặc định 7.

Prototype v4:
- Tab markup `index.html` 2818–2856.
- Logic:
  - `_violate` 4771;
  - tự ẩn khi gửi `addMsg` 4773 và khi báo cáo `rptSend` 6208;
  - thẻ / Khôi phục / Khoá 6429–6433;
  - tự mở `_unlockExpired` 4756;
  - đăng nhập báo ngày 6299.

Hiện trạng (V2):
- Báo cáo / từ khoá chỉ tạo ca, **không** ẩn tin.
- Admin xử lý bằng 4 nút: Ẩn & xóa / Cảnh báo / Khóa / Bỏ qua.
- Khoá không có hạn.

## APPLICABLE STANDARDS
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md) (outbox, transition có điều kiện)
- [backend/auth-rbac](../standards/backend/auth-rbac.md) (`groups.moderate`, `members.action`)
- [database/query-indexing](../standards/database/query-indexing.md) · [database/prisma-migrations](../standards/database/prisma-migrations.md)
- [realtime/socket-chat](../standards/realtime/socket-chat.md) (S-08 lọc từ khoá không chặn đường gửi; `message.updated`)
- [frontend/ui-parity](../standards/frontend/ui-parity.md) · [testing/testing](../standards/testing/testing.md)

## TASK
Đưa kiểm duyệt chat lên §26.6:
- Tin bị báo cáo hoặc trúng từ khoá được ẩn ngay và tính một vi phạm.
- Từ lần 2 trong 90 ngày, tài khoản tự khoá N ngày (cài đặt).
- Admin "Khôi phục tin" thì tin hiện lại, không tính vi phạm, và mở khoá tự động nếu đủ điều kiện.
- Khoá có hạn tự mở theo job định kỳ và khi đăng nhập.
- Đăng nhập lúc đang khoá báo ngày mở khoá.

## SPECIFICATIONS
### Dữ liệu
- `moderation_violations`:
  - cột: `id`, `user_id` (FK users, cascade), `report_id` (FK reports, cascade, UQ), `message_id`, `at timestamptz`, `revoked_at timestamptz?`;
  - index `(user_id, at desc)` partial `WHERE revoked_at IS NULL`.
- `users`:
  - `locked_until timestamptz?`, `lock_kind user_lock_kind?`;
  - index partial `(locked_until) WHERE status = 'locked' AND locked_until IS NOT NULL` cho job tự mở.
- Cài đặt `app_settings.moderation` = `{ autoLockDays: 1|3|7|14|30 }`, mặc định 7.

### Business Rules
1. **Ẩn ngay + vi phạm (một transaction, idempotent theo `report_id`):**
   - Thành viên báo cáo (lần đầu với tin đó) → `hideAndCount`:
     - `messages.hidden_at = now()` (có điều kiện `hidden_at IS NULL`);
     - ca `reports` mở;
     - `moderation_violations` (UQ report_id);
     - outbox `moderation.violated { userId, reportId, messageId, roomId, count, lockedUntil? }`.
   - Job từ khoá `keywordHit` → cùng `hideAndCount` (nguồn `auto`).
   - Tin đã ẩn (đã có vi phạm của tin đó): báo thêm chỉ +1 người báo, không đếm vi phạm mới. Một tin tối đa 1 vi phạm.
   - Tin của bot / hệ thống (`sender_id` null): ẩn, không đếm vi phạm.
2. **Đếm** = vi phạm `revoked_at IS NULL AND at > now() - 90 days` của người gửi (D-83).
   - Lần 1: outbox `moderation.warned` (thông báo cảnh báo sẵn có).
   - Từ lần 2: khoá tự động nếu đang `active`:
     - `status = locked`, `lock_kind = auto`, `locked_until = now + N ngày`, `locked_reason = 'Vi phạm nội quy cộng đồng'`;
     - dùng lại hiệu ứng khoá D-55 / NA-16 (outbox `user.locked` + `user.session_revoked`, perm_version + 1, Redis `applyStatus`, thu hồi refresh) → đang đăng nhập bị đăng xuất;
     - audit `user.lock` (actor null = hệ thống, tag member).
   - Đang khoá thì không đổi hạn.
3. **Realtime**: ẩn → `message.updated` (hiddenAt) cho phòng. Portal **giữ** dòng tin và hiện câu "Tin nhắn đã bị ẩn do vi phạm nội quy cộng đồng." (prototype giữ tin, đổi chữ; không lộ nội dung gốc; API vẫn trả `body: ''`).
   - Tin ẩn vẫn nằm trong trang tin nhắn: `pageIds` bỏ lọc `hidden_at` cho Portal.
   - Phần ghim / tệp / số chưa đọc / trả lời giữ lọc như cũ.
4. **Khôi phục tin** (`POST /admin/reports/:id/action { action: 'restore' }`, `groups.moderate`):
   - `hidden_at = null` (có điều kiện);
   - vi phạm của ca `revoked_at = now()`;
   - ca `resolved` với action `restore`;
   - audit `moderation.restore`;
   - `message.updated` cho phòng.
   - Đếm lại: còn < 2 và đang `locked` với `lock_kind = auto` → mở khoá ngay (`setStatus` active, outbox `user.unlocked`, audit `user.unlock` actor = admin). Toast: "Đã khôi phục tin nhắn của {name} · không tính vi phạm[ · đã mở khóa tài khoản]".
5. **Khoá thủ công N ngày** (`action: 'lock', days`):
   - `lock_kind = manual`, `locked_until = now + days`;
   - ca `resolved`.
   - `PATCH /admin/users/:id/status` và `POST /admin/users/status` nhận `days?` (1/3/7/14/30). Không có `days` = khoá không thời hạn như cũ (D-55).
6. **Bỏ** các nút "Ẩn & xóa tin" / "Cảnh báo người gửi" / "Bỏ qua" ở UI (tin đã tự ẩn, cảnh báo tự gửi). API giữ `dismiss | hide | warn` cho tương thích; `dismiss` = như `restore` (D-77: không vi phạm).
7. **Tự mở khoá:**
   - Job `moderation-auto-unlock` mỗi 5 phút: `UPDATE users SET status='active', locked_until=null, lock_kind=null, perm_version+1 WHERE status='locked' AND locked_until <= now() RETURNING id` theo lô 500, outbox `user.unlocked`, audit `user.unlock` actor null.
   - Khi đăng nhập / refresh / TOTP: nếu `locked_until <= now()` → mở như trên rồi cho vào.
   - Còn hạn → 403 `ACCOUNT_LOCKED` "Tài khoản bị khóa đến dd/mm/yyyy do vi phạm nội quy. Vui lòng liên hệ quản trị viên OPC Hub." (prototype 6299, ngày theo `Asia/Ho_Chi_Minh`). Khoá không hạn giữ câu cũ.
8. **Cài đặt thời gian khoá:**
   - `GET /admin/moderation/settings` (`groups.view`);
   - `PUT /admin/moderation/settings { autoLockDays }` (`groups.moderate`, audit `moderation.settings.update`).
9. **Thẻ Admin** (`reportSchema` mở rộng, tính trong 1 query của trang, không N+1):
   - `violations` = số vi phạm 90 ngày của người gửi;
   - `senderLocked`, `lockedUntil`;
   - `canLock` = có người gửi và chưa khoá.

### Copy (prototype, verbatim)
- Tiêu đề: "Tin nhắn nhạy cảm". Phụ đề: "Tin nhắn chứa từ khóa cấm hoặc bị thành viên báo cáo được ẩn ngay khỏi phòng chat. Vi phạm từ lần 2 trở đi tự động khóa tài khoản {N} ngày."
- Thẻ: nhãn "Đã ẩn tự động"; "Vi phạm lần {n}" hoặc "Đã khóa {N} ngày"; nút "Khóa {N} ngày", "Khôi phục tin" (title "Không vi phạm: hiện lại tin trong phòng chat và không tính lần vi phạm").
- Khối phải: "Quy tắc xử lý vi phạm" · "Lần 1: Ẩn tin nhắn ngay, gửi cảnh báo tới thành viên" · "Lần 2+: Ẩn tin nhắn và tự động khóa tài khoản" · "Thời gian khóa" (select 1/3/7/14/30 ngày) · toast "Thời gian khóa: {N} ngày".
- Toast:
  - Khoá: "Đã khóa {name} {N} ngày".
  - Báo cáo (Portal): "Đã báo cáo – tin nhắn đã được ẩn khỏi phòng chat".
  - Người gửi trúng từ khoá lần 1 (Portal): "Tin nhắn đã bị ẩn do vi phạm nội quy. Nếu tiếp tục, tài khoản sẽ bị khóa {N} ngày." Dùng `message.updated` của chính tin mình; nếu không làm được realtime trong phạm vi thì ghi Q.

### API
| Method | Path | Quyền | |
|---|---|---|---|
| POST | `/messages/:id/report` | thành viên | như cũ + ẩn ngay; 201 `Report` |
| POST | `/admin/reports/:id/action` | `groups.moderate` | `action: restore \| lock (+days) \| dismiss \| hide \| warn` |
| GET / PUT | `/admin/moderation/settings` | `groups.view` / `groups.moderate` | `{ autoLockDays }` |
| PATCH | `/admin/users/:id/status`, POST `/admin/users/status` | `members.action` | thêm `days?` |
| POST | `/auth/login` (+ refresh, TOTP) | — | 403 kèm ngày mở khoá; tự mở khi hết hạn |

## ACCEPTANCE CRITERIA
- Given M2 báo cáo một tin của M4 (lần 1 trong 90 ngày), Then tin ẩn ngay trong phòng ("Tin nhắn đã bị ẩn do vi phạm nội quy cộng đồng."), M4 nhận cảnh báo, thẻ Admin "Vi phạm lần 1".
- Given M4 có thêm một tin trúng từ khoá, Then tin ẩn, M4 bị khoá 7 ngày (mặc định), phiên bị thu hồi; đăng nhập báo "Tài khoản bị khóa đến {ngày} …".
- Given Admin bấm "Khôi phục tin" ở một trong hai ca, Then tin hiện lại nguyên văn, còn 1 vi phạm → M4 mở khoá ngay (khoá tự động).
- Given Admin khoá thủ công 3 ngày, When Khôi phục tin, Then **không** tự mở (khoá thủ công).
- Given `locked_until` đã qua, When job chạy hoặc M4 đăng nhập, Then TK active, đăng nhập được.
- Given vi phạm cũ hơn 90 ngày, Then không tính vào đếm.
- Given Admin đổi Thời gian khoá = 14, Then lần khoá tự động kế tiếp 14 ngày; audit.
- Thiếu `groups.moderate` → 403; báo cáo / job lặp lại không tạo vi phạm trùng.

## PARITY
- D-33 / D-34 / D-35 (đo lại trên prototype v4, thẻ + khối quy tắc mới). D-34 v4: "Khôi phục tin" cho cả 4 thẻ → "Không còn tin nhắn nhạy cảm cần xử lý.".
- Mới:
  - **D-98** "Kiểm duyệt · đổi thời gian khoá 14 ngày";
  - **P-121** Chat có tin đã bị ẩn (sau khi báo cáo);
  - **A-33** Đăng nhập TK bị khoá có hạn (prototype không có TK khoá có hạn sẵn → `unreachable` nếu không dựng được bằng thao tác, ghi lý do).
- 1440 + 390, không mask, không nới ngưỡng.

## CONSTRAINTS
- DO NOT:
  - truy vấn DB trong đường gửi tin (S-08: lọc từ khoá vẫn enqueue job);
  - đếm vi phạm bằng vòng lặp;
  - xoá tin khi ẩn (giữ nguyên văn để khôi phục);
  - dùng hằng số 600000;
  - check tên vai trò.
- REUSE:
  - `AdminUsersService.setStatus` (thêm hạn);
  - `LockEffectsRegistry`, `UserLifecycleHandler`, `AuthStateService.applyStatus`;
  - `moderation.warned` + `moderationWarningContent`;
  - `AppSettingsService`, `AuditService`, `RoomEventsPublisher`.
- SKIP: email khi khoá (chỉ thông báo trong app); thống kê vi phạm theo nhóm.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched`; migration `--create-only`, deploy `opchub_dev` + `opchub_test`, test migration.
- [ ] Int:
  - ẩn ngay khi báo cáo / từ khoá;
  - lần 1 cảnh báo, lần 2 khoá + thu hồi phiên;
  - 90 ngày;
  - khôi phục mở khoá auto, không mở manual;
  - job tự mở + đăng nhập tự mở + 403 kèm ngày;
  - cài đặt + audit; 403 quyền; idempotent.
- [ ] Gate: `test/contract/coverage`, `test/common/outbox-consumers` (`moderation.violated` có consumer), `test/gates/*`.
- [ ] EXPLAIN đếm vi phạm cho trang Admin + job tự mở trên ≥ 10k dòng: không Seq Scan bảng lớn.
- [ ] e2e `moderation.spec.ts` + `chat.spec` + `admin-groups` / `a-01-login`; parity D-33 → D-35, D-98, P-121.
- [ ] Commit theo đường dẫn, `git status --short` sạch, báo DONE kèm SHA.
