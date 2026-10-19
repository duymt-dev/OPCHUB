# TIP-V2-104 — Khoá tài khoản lan truyền (completion)

> V2-P1, nhánh `feature/V2-P1-foundation-fixes`. BUG-004, BUG-005, NA-16, NA-28, D-55, V2Q-60/61/67.

## Đã làm
- `outbox/events.ts`: thêm `user.unlocked`; `setStatus` mở khoá ghi `user.unlocked` cùng transaction.
- Account: `LockEffects` (ports) + `LockEffectsRegistry` (nhiều provider như `ProfileStatsRegistry`),
  `UserLifecycleHandler` (`sessionRevoked` → publish `session.revoked` + `forgetUsers` khi `locked`;
  `roleChanged` → `session.revoked {role_changed}`; `locked`/`unlocked` → registry).
- Worker: `AccountProcessor` đăng ký 4 consumer; `WorkerAppModule` thêm `AccountCoreModule` + processor.
- Community: `GroupAdminRepository.oldestSuperAdmin` + `transferOwnedTo` (hạ owner có điều kiện
  `group_role='owner'` + TK còn `locked`, upsert Admin `owner`, `member_count` +1 một câu);
  `GroupLockEffects` — một transaction, audit `group.owner_transfer` `actorId=null`; không có Super Admin
  → ném (relay backoff). Mở khoá không trả nhóm.
- Project: `visibleTo` nhánh public thêm `owner: { status: 'active' }`; không đổi `projects.status`.
- `PresenceService.forgetUsers` (ZREM `presence:users`).
- `ACCOUNT_LOCKED_MESSAGE` trong `@opchub/shared` (server guard/socket/auth dùng chung, client so khớp).
- Portal: `lib/session-end.ts` (`endSession` → `signOut` + `router.replace('/login?reason=')`),
  `lib/session-revoked.ts` (nghe `session.revoked`, hook gọi trong `PortalShell`), `resetSocket`;
  api-client 403 khoá → `reason=locked`; login hiện `login.reason.*`.
- Admin: api-client 403 khoá → `locked`; 401 → refresh ra TK `member` → `role_changed`;
  `session-end-navigator` trong `AdminShell`; login hiện `login.reason.*`.
- MSW Portal: handler `session.ts` — cookie `opchub-mock-locked` → mọi request ngoài `/auth/*`,
  `/public/*` nhận 403 khoá.
- Test M1: xoá allowlist `PENDING_CONSUMERS`.

## Test
- Unit server 72/72; shared 73/73; portal 93/93 (+5 `session-end.spec.ts`); admin 123/123 (+6).
- Int mới: `lock-propagation.int.spec.ts` 6, `socket-revoke.int.spec.ts` 3, `outbox-consumers` 2.
- Toàn bộ int server: **270/270** (66 file).
- Lint (chỉ warning `<img>` cũ), typecheck 8/8, depcheck sạch.
- `c1-outbox.audit.ts`: **15 đạt / 0** (15 vì thêm loại `user.unlocked`).
- e2e MSW (build riêng `.next-104msw`, cổng 3110/3111/4810): toàn bộ behavior **119/119**.
- e2e server (api/socket/worker build riêng trên 4100/4101, Next 3210/3211, opchub_dev): auth/login/
  admin-members 21/22 — UAT-24 **không ổn định (1/3 đạt)**, xem dưới.

## UAT-24 trên server — chưa xanh ổn định
Sự kiện `user.locked`/`user.session_revoked` được đánh dấu dispatched trong ~1 s nhưng trình duyệt có lúc
không nhận `session.revoked`. Nguyên nhân khả dĩ: **worker dev cũ đang chạy** (`dist/main-worker.mjs`
build 03:07, code trước TIP-V2-101, dùng `lockPending` + đánh dấu dispatched loại không có handler) cùng
DB `opchub_dev` giành sự kiện với worker của lượt test → khi worker cũ nhận, sự kiện bị nuốt. Không dừng
tiến trình đó (không phải của builder). Cần agent chính: rebuild + restart `opchub-api/socket/worker` dev
rồi chạy lại `pnpm e2e:server --project behavior -g UAT-24`.

## Ghi chú
- Sau TIP-V2-201: `oldestSuperAdmin` đổi sang bảng `admin_users`.
- EXPLAIN Khám phá 10k dự án chưa đo (join `users` theo PK).
