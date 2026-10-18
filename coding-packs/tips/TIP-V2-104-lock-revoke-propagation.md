# TIP-V2-104: Khoá tài khoản lan truyền — ngắt socket, ẩn online, ẩn dự án Public, chuyển nhóm làm chủ về Admin (NA-16, D-55, BUG-004, BUG-005)

## HEADER
- TIP-ID: TIP-V2-104 · Project: OPCHUB · Module: account (consumer) + project + community + socket + Portal/Admin auth · Priority: P0 · Depends on: TIP-V2-101 (relay không mất sự kiện; consumer test) · Estimated: L (10h)
- **Files touched:**
  - `packages/shared/src/outbox/events.ts` (modify — chỉ thêm `'user.unlocked': z.object({ userId: z.string() })`)
  - `apps/server/src/modules/account/services/admin-users.service.ts` (modify: mở khoá ghi outbox `user.unlocked`)
  - `apps/server/src/modules/account/services/user-lifecycle.handler.ts` (create: `sessionRevoked`, `roleChanged`, `locked`, `unlocked`)
  - `apps/server/src/modules/account/ports.ts` (modify — thêm cổng `LOCK_EFFECTS_PORT` `{ onLocked(userIds), onUnlocked(userIds) }` dạng mảng provider), `account.module.ts`, `index.ts` (modify: export handler + port)
  - `apps/server/src/modules/project/repositories/project.repository.ts` (modify: `visibleTo` lọc `owner: { status: 'active' }` cho nhánh `visibility: 'public'`)
  - `apps/server/src/modules/community/repositories/group-admin.repository.ts` (modify: thêm `transferOwnedTo(tx, userIds, adminId)`), `apps/server/src/modules/community/services/group-lock.effects.ts` (create), `community-core.module.ts` (modify: đăng ký vào port)
  - `apps/server/src/common/realtime/presence.service.ts` (modify: thêm `forgetUsers(userIds)` — `ZREM presence:users`)
  - `apps/server/src/worker/processors/account.processor.ts` (create: `relay.register('user.locked'|'user.unlocked'|'user.session_revoked'|'user.role_changed', …)`), `apps/server/src/worker/worker-app.module.ts` (modify — chỉ thêm `AccountCoreModule`, `AccountProcessor`)
  - Portal/Admin: `apps/portal/src/lib/session-revoked.ts` (create: nghe `session.revoked` → `clear()` + `router.replace('/login?reason=<reason>')`), `apps/portal/src/features/shell/components/portal-shell.tsx` (modify — 1 dòng gọi hook), `apps/portal/src/features/auth/components/login-screen.tsx` (modify: hiện thông báo theo `?reason=`), `apps/portal/messages/vi/auth.json` + `apps/admin/messages/vi/auth.json` (modify — chỉ thêm khoá `login.reason.*`), `apps/admin/src/features/auth/components/login-screen.tsx` (modify: đọc `?reason=`), `apps/admin/src/lib/api-client.ts` (modify: 403 khoá / 401 phiên đổi → về `/login?reason=`)
  - Test: `apps/server/test/account/lock-propagation.int.spec.ts` (create), `apps/server/test/socket/socket-revoke.int.spec.ts` (create), `apps/server/test/common/outbox-consumers.int.spec.ts` (modify: xoá allowlist `PENDING_CONSUMERS`), `e2e/behavior/admin-members.spec.ts` (modify: thêm test UAT-24 lan truyền)
- **Parallel-safe with:** TIP-V2-102, 103, 105, 106, 109, 110, 113, 114. `sequential, after TIP-V2-101` (sửa `outbox-consumers.int.spec.ts`). `sequential, shares worker-app.module.ts + outbox/events.ts with TIP-V2-107` (chỉ thêm dòng, giữ `.wire-lock`); `shares worker-app.module.ts with TIP-V2-102/103` (thêm dòng). `sequential, shares project.repository.ts with TIP-V2-109` (109 sửa phần lộ liên hệ dòng 150-172; 104 sửa `visibleTo` dòng 24-35). `shares admin-users.service.ts with TIP-V2-112` nếu 112 đổi khoá/đổi email.
- **Phase / nhánh:** V2-P1, `feature/V2-P1-foundation-fixes` (nhánh con `feature/V2-P1-104-lock-revoke`)

## CONTEXT
- Đặc tả §8.18 NA-16 (thu hồi refresh, ngắt WebSocket, ẩn khỏi online, về màn Đăng nhập báo "tài khoản đã bị khóa", tin cũ giữ, **dự án Public tạm ẩn khỏi Khám phá**); §22 SEC-R03 (áp cả TK quản trị); D-15; **D-55**: thêm chuyển nhóm làm chủ về Admin; mở khoá → dự án hiện lại, nhóm **không** tự trả lại. QT-02 (đặt lại mật khẩu → thu hồi mọi phiên), NA-28 (quyền hiệu lực ngay).
- Audit: BUGS.md BUG-004 (dự án vẫn hiện, nhóm vẫn do TK khoá làm chủ, `user.locked` không có consumer), BUG-005 (`user.session_revoked` / `user.role_changed` không consumer, socket chỉ kiểm lúc handshake); `work/mechanical.md` M1 #1–3; kiểm cơ học `apps/server/test/audit/c1-outbox.audit.ts`.
- Phát sự kiện: `admin-users.service.ts:80-94` (khoá: `user.locked` + `user.session_revoked`), `:128` (`user.role_changed`), `password-reset.service.ts:77` (`password_changed`), `settings/services/admin-accounts.service.ts:147` (thu hồi quản trị). Moderation khoá qua `AdminUsersService.setStatus` (`admin-moderation.service.ts:80`).
- Đường realtime đã có: `UserEventsPublisher.publish(userId, 'session.revoked', { reason })` → `socket/gateways/user-events.subscriber.ts:41` emit + `disconnectSockets(true)`. Presence: `presence.service.ts` (`presence:users` ZSET, phòng tự hết hạn 90 s).
- Mẫu consumer: `worker/processors/fee.processor.ts`, `membership-fee/services/fee-events.handler.ts`.
- Bảng `groups` không có cột `owner_id`; chủ nhóm = dòng `group_members.group_role = 'owner'` (mẫu đổi chủ: `group-admin.repository.ts › setStaff`).

## APPLICABLE STANDARDS
[socket-chat](../standards/realtime/socket-chat.md) (S-02, S-04, "bị khoá: server phát vào user:{id}") · [auth-rbac](../standards/backend/auth-rbac.md) · [nestjs-modules](../standards/backend/nestjs-modules.md) (outbox, port giữa module) · [queues-workers](../standards/backend/queues-workers.md) · [query-indexing](../standards/database/query-indexing.md) · [routing-auth](../standards/frontend/routing-auth.md) · [testing](../standards/testing/testing.md)

## TASK
Viết consumer cho `user.locked`, `user.unlocked`, `user.session_revoked`, `user.role_changed`: đẩy `session.revoked` ngắt mọi socket, bỏ khỏi danh sách online, ẩn dự án Public của TK khoá, chuyển nhóm TK khoá đang làm chủ về Admin; client đang mở bị đưa về màn đăng nhập kèm lý do.

## SPECIFICATIONS
### Business Rules
1. **`user.session_revoked`** (khoá, đặt lại/đổi mật khẩu, đăng xuất mọi nơi) → `UserEventsPublisher.publish(userId, 'session.revoked', { reason })`; `reason='locked'` thêm `PresenceService.forgetUsers([userId])`. Idempotent (publish lại vô hại).
2. **`user.role_changed`** → publish `session.revoked` `{ reason: 'role_changed' }` (client refresh token mới theo NA-28; perm_version đã bump ở nơi phát).
3. **Dự án (NA-16)** — không cần handler, hiệu lực ngay lúc commit khoá: không đổi `projects.status` (tránh cạnh ngoài §9). `visibleTo(userId)` nhánh `visibility: 'public'` thêm điều kiện `owner: { status: 'active' }`; chủ dự án (chính mình), thành viên đội, nhóm được chia sẻ vẫn theo nhánh cũ. Admin vẫn thấy ở màn kiểm duyệt. Mở khoá → tự hiện lại.
   **`user.locked`** (lô theo `userId`): gọi lần lượt các provider `LOCK_EFFECTS_PORT`:
   - **Nhóm (D-15, D-55)**: `transferOwnedTo(tx, userIds, adminId)` một transaction: `adminId` = super_admin đang `active` cũ nhất (một query; không có → log error, ném để relay thử lại); với mỗi nhóm có dòng `group_role='owner' AND user_id = ANY(userIds)`: hạ dòng đó thành `member` (giữ thành viên, không xoá) **có điều kiện** `WHERE group_role='owner'`, upsert Admin thành `owner` `status='member'`, `bump member_count` nếu Admin mới vào; ghi `audit_logs` `actorId=null`, action `group.owner_transfer`, summary "Chuyển chủ nhóm <tên> về Admin (TK bị khoá)". Không gửi thông báo. Idempotent: chạy lại không còn dòng owner của TK khoá → 0 thay đổi.
4. **`user.unlocked`** (mới, ghi ở `setStatus` khi `status='active'`, cùng transaction): hiện không có hiệu ứng (dự án tự hiện; nhóm không trả lại — D-55) — consumer chỉ log debug để giữ M1 xanh và cho TIP sau (affiliate…) mở rộng.
5. **Client**: Portal/Admin nghe `session.revoked` → `useAuthStore.clear()` → `router.replace('/login?reason=' + reason)`. Màn đăng nhập hiện: `locked` "Tài khoản đã bị khóa, liên hệ hỗ trợ"; `password_changed` "Mật khẩu đã đổi, vui lòng đăng nhập lại"; `role_changed` "Quyền của bạn đã thay đổi, vui lòng đăng nhập lại"; `logout_all` "Phiên đăng nhập đã kết thúc". Admin chưa có socket → `api-client` bắt 403 có thông điệp khoá / 401 refresh hỏng → về `/login?reason=locked|role_changed`.
6. Tin nhắn cũ của TK khoá giữ nguyên (NA-16).
7. Handler không gọi lẫn domain khác trực tiếp: account định nghĩa `LOCK_EFFECTS_PORT` (multi-provider như `ProfileStatsRegistry`), project/community tự đăng ký — giữ ranh giới (luật 3).

### Data / Index
- `visibleTo`: thêm join `users` theo `projects.owner_id` (PK) — không cần index mới; kiểm `EXPLAIN` danh sách Khám phá 10k dự án vẫn Index Scan `(status, …)`.
- `transferOwnedTo` dùng index `group_members (group_id, status, group_role)` + `(user_id, status)` có sẵn. Không migration.

### Error Handling
- Handler ném → relay (TIP-V2-101) thử lại có backoff. Không có super_admin active → ném lỗi rõ ràng (đã cảnh báo ở log).

## ACCEPTANCE CRITERIA
- Given TV A có dự án Public `p6` và làm chủ nhóm `c5`, When Admin khoá A và relay chạy, Then TV khác `GET /projects/p6` → 404, Khám phá không có `p6`; chủ nhóm `c5` là super_admin, A là thành viên thường `c5`; audit `group.owner_transfer` (BUG-004, NA-16, D-55, UAT-24).
- Given A đang mở socket trong phòng chat, When khoá, Then trong ≤ 3 s socket nhận `session.revoked {reason:'locked'}` rồi bị ngắt; `presence:users` không còn A; reconnect bằng token cũ → `FORBIDDEN` (BUG-005, NA-16).
- Given TV đặt lại mật khẩu, Then mọi socket của TV nhận `session.revoked {reason:'password_changed'}` và bị ngắt (BUG-005, QT-02).
- Given Admin đổi vai trò / thu hồi quyền quản trị của B, Then socket B nhận `session.revoked {reason:'role_changed'}` (BUG-005, NA-28).
- Given mở khoá A, Then `p6` hiện lại ở Khám phá; chủ `c5` vẫn là Admin (D-55).
- Given relay gọi `user.locked` hai lần, Then không đổi gì thêm ở lần 2 (idempotent).
- Given Portal đang mở của A, When bị khoá, Then trình duyệt về `/login` và hiện "Tài khoản đã bị khóa, liên hệ hỗ trợ" (NA-16 bước 4).
- `outbox-consumers.int.spec.ts` không còn allowlist, xanh (M1).

## TESTS BẮT BUỘC
- Int `apps/server/test/account/lock-propagation.int.spec.ts`: `REQ-216 BUG-004 khoá → dự án Public ẩn khỏi Khám phá và chi tiết`, `REQ-216 khoá → chủ dự án vẫn thấy dự án của mình (Dự án của tôi)`, `D-55 BUG-004 khoá → nhóm làm chủ chuyển về super_admin, giữ làm thành viên`, `D-55 mở khoá → dự án hiện lại, nhóm không trả lại`, `REQ-216 handler idempotent`, `REQ-216 test âm: không có super_admin → lỗi, relay thử lại`.
- Int `apps/server/test/socket/socket-revoke.int.spec.ts` (dựng socket app + `OutboxRelayService` + `AccountProcessor`): `REQ-216 BUG-005 khoá → session.revoked locked + ngắt + rời presence`, `BUG-005 đặt lại mật khẩu → ngắt`, `BUG-005 REQ-228 đổi vai trò → ngắt`.
- Int `apps/server/test/common/outbox-consumers.int.spec.ts`: xoá allowlist, `M1 mọi sự kiện có consumer` xanh.
- E2E (msw + server, **cùng assertion**, không nhánh `onServer` làm yếu — D-63) `e2e/behavior/admin-members.spec.ts`: `UAT-24 REQ-216 khoá thành viên → phiên Portal đang mở về đăng nhập, báo đã khoá`. MSW: mô phỏng bằng handler trả 403 khoá ở request kế tiếp → cùng màn kết quả.

## CONSTRAINTS
- DO NOT: query DB theo từng người nhận ở process socket (S-04); đổi `projects.status` khi khoá; xoá tư cách thành viên của TK khoá; import chéo service giữa account ↔ project/community (dùng port); thêm nhánh `onServer` làm yếu assertion.
- REUSE: `UserEventsPublisher`, `UserEventsSubscriber` (đã ngắt socket khi `session.revoked`), `PresenceService`, `AuditService.log`, `OutboxRelayService.register`, `GroupAdminRepository.bumpMemberCount`.
- SKIP: TK quản trị tách bảng (TIP-V2-201/202 — khi đó đổi `adminId` sang bảng `admin_users`, ghi chú trong report); đổi email/OTP (TIP-V2-112).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 3 (ranh giới module qua port), luật 6 (S-04: không truy vấn DB cho từng người nhận), luật 7 (đổi chủ nhóm có điều kiện `WHERE group_role='owner'`), luật 8 (outbox `user.unlocked` cùng transaction), luật 10 (audit hệ thống `actorId=null`).
- [ ] Shared file chỉ thêm dòng (`outbox/events.ts`, `worker-app.module.ts`, `messages/vi/auth.json`), giữ `.wire-lock`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`; `test:int` xanh; `pnpm e2e` (msw) + `pnpm e2e:server --project behavior` xanh; chạy lại `c1-outbox.audit.ts` → 0 loại thiếu consumer.
- [ ] `git commit -- <paths>` (không `-A`), `git status --short` sạch; báo `TIP-V2-104-DONE <sha> — <N> test passed`; report `coding-packs/reports/TIP-V2-104-completion.md`.
