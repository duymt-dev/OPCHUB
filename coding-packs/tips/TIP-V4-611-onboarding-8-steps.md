# TIP-V4-611: Onboarding 8 bước — thẻ "Hướng dẫn bắt đầu" (Dashboard), cột Khởi đầu x/8 + lọc + Nhắc (Admin)

## HEADER
- TIP-ID: TIP-V4-611
- Project: OPCHUB
- Module: onboarding (server, mới) · db · shared · portal (onboarding mới, dashboard, stores/needs/affiliate 1 dòng) · admin (members, marketing auto mail) · ui (loại thông báo)
- Priority: P0 (REQ-505)
- Depends on: V4-603, V4-607, V4-608, V4-609 (xếp chồng V4-613, PR #27 chưa merge)
- Estimated: L
- REQ / D: REQ-505 · D-76, D-85, D-88 · §27.1 QT-02 · §27.6 UP-04 / AD-02 · §27.8 "Tiến độ khởi đầu"
- **Files touched:**
  - `packages/db/prisma/schema/onboarding.prisma` (create): `OnboardingFlag`, `OnboardingReminder`, `OnboardingProgress`; quan hệ ở `account.prisma`.
  - `packages/db/prisma/schema/chat.prisma` (modify): index `messages(sender_id)` cho bước "Gửi lời chào".
  - `packages/db/prisma/schema/mail.prisma` (modify): `MailKind.onboarding`.
  - `packages/db/prisma/migrations/20261026090000_v4_onboarding/` (create), `packages/db/test/migration-onboarding.int.spec.ts` (create), `seed/demo` (progress + cờ mẫu).
  - `packages/shared/src/api-domains/onboarding.ts` (create), `admin-members.ts` (modify: `onboarding` ở dòng + filter), `settings.ts` (modify: `NOTIFICATION_TYPES` thêm `system`), `outbox/events.ts` (modify: `onboarding.touched`), mock-data `domains/onboarding.ts` (create).
  - `apps/server/src/modules/onboarding/**` (create): `domain/steps.ts` (+ spec), `repositories/onboarding.repository.ts`, `services/onboarding.service.ts`, `services/onboarding-remind.service.ts`, `controllers/*`, `onboarding.module.ts`.
  - `apps/server/src/modules/{local-business,project,account}` (modify, 1–2 dòng mỗi chỗ): phát `onboarding.touched` khi tạo nhu cầu, tạo dự án, lưu hồ sơ / khai báo / ảnh đại diện.
  - `apps/server/src/modules/account/**` admin users (modify): cột `onboarding`, filter `onboarding=done|todo`.
  - `apps/server/src/modules/mail/**` + settings (modify): mẫu "Nhắc hoàn tất hướng dẫn bắt đầu" (app_settings `onboarding_mail`), `GET/PUT /admin/mail/onboarding`.
  - `apps/server/src/worker/processors/onboarding.processor.ts` (create), `store.processor.ts` (bỏ handler log tạm), `schedules.ts` (sweep hằng ngày).
  - `apps/server/test/onboarding/*.int.spec.ts` (create), contract + coverage + `api-contract.md`.
  - `packages/ui/src/app-shell/notification-bell.tsx` (modify: loại `system`).
  - `apps/portal/src/features/onboarding/**` (create), `features/dashboard/components/dashboard-screen.tsx` (modify: chèn lời chào + thẻ), `features/{stores,needs}` (đặt cờ `explore` khi mở), `features/affiliate` (đặt cờ `affiliate_share` khi sao chép / chia sẻ link), `messages/*/onboarding.json`, MSW handler.
  - `apps/admin/src/features/members/**` (modify: cột Khởi đầu, select lọc, Nhắc), `features/marketing` (mẫu email nhắc), `messages/vi/*.json`, MSW handler.
  - `e2e/behavior/onboarding.spec.ts` (create); parity `e2e/parity/scenarios/{portal-onboarding,admin-onboarding}.ts` (create) + registry.
- **Parallel-safe with:** sequential — dùng chung `admin-members`, dashboard, outbox events, `notification-bell.tsx`.

## CONTEXT
- UP-04: "Dashboard – Hướng dẫn bắt đầu 8 bước: phí, hồ sơ, nhóm, lời chào, gian hàng/dự án, nhu cầu/khám phá, Affiliate, sự kiện. Bước 2–8 khóa khi chưa đóng phí; tiến độ đồng bộ với cột Khởi đầu ở Admin."
- QT-02: "Admin › Thành viên có cột Khởi đầu x/8, bộ lọc và nút Nhắc."
- §27.8: "Tiến độ khởi đầu | UP-04 | AD-02 cột Khởi đầu | Admin nhắc → thông báo cho thành viên."
- D-85 (8 bước tính từ dữ liệu thật; cờ chỉ cho "khám phá" và "chia sẻ link"; Cá nhân có dự án → thẻ tùy chọn Gói Gọi vốn ngoài 8 bước). D-88 (thông báo trong app trước; email mẫu tạm Admin sửa được; Nhắc ≤ 1 lần/ngày/thành viên).
- Prototype v4:
  - Dashboard markup `index.html` 603–645.
  - Logic `_ob` 5716–5719, `_dash` 5730–5749.
  - Admin › Thành viên: cột "Khởi đầu" 2646 / 2654, lọc 5724, Nhắc 6345.

## APPLICABLE STANDARDS
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md) (outbox, module boundary)
- [backend/auth-rbac](../standards/backend/auth-rbac.md) (`members.view` / `members.action`, `settings.mail`)
- [database/query-indexing](../standards/database/query-indexing.md) · [database/prisma-migrations](../standards/database/prisma-migrations.md)
- [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md) · [frontend/data-state](../standards/frontend/data-state.md) · [frontend/ui-parity](../standards/frontend/ui-parity.md)
- [testing/testing](../standards/testing/testing.md)

## TASK
- Tính tiến độ 8 bước khởi đầu cho từng thành viên (Cá nhân / Doanh nghiệp) từ dữ liệu thật bằng một truy vấn snapshot.
- Hiện thẻ "Hướng dẫn bắt đầu" (kèm lời chào) đầu Dashboard Portal.
- Đồng bộ số x/8 sang Admin › Thành viên: cột Khởi đầu, bộ lọc Đã / Chưa hoàn tất, nút Nhắc. Nhắc gửi thông báo + email mẫu tạm, tối đa 1 lần/ngày.

## SPECIFICATIONS
### Business Rules — 8 bước (key · điều kiện "xong")
Bước 2–8 chỉ "xong" khi bước 1 xong (prototype `ok && (k==='pay'||paid)`). Chưa đóng phí thì bước 2–8 `locked`.

| # | key | DN | Cá nhân | Xong khi |
|---|---|---|---|---|
| 1 | `pay` | ✓ | ✓ | `membership_fees.status IN (active, expiring) AND valid_until > now()` |
| 2 | `prof` | ✓ | ✓ | DN: `business_profiles` có `representative`, `tax_code`, `main_field` ≠ '' và `users.avatar_url` ≠ null. Cá nhân: `registration_role` ≠ null, `opc_intent` ≠ {}, `avatar_url` ≠ null, `phone` ≠ null (D-85) |
| 3 | `grp` | ✓ | ✓ | có `group_members.status = 'member'` |
| 4 | `chat` | ✓ | ✓ | có `messages.sender_id = user`, chưa xoá, không `is_simulated` |
| 5 | `st` / `pj` | gian hàng | dự án | DN: `stores.status <> 'hidden' AND (intro <> '' OR item_count > 0)`. Cá nhân: có `projects` chưa xoá |
| 6 | `nd` / `ex` | nhu cầu | khám phá | DN: có `needs.owner_id`. Cá nhân: cờ `explore` |
| 7 | `aff` | ✓ | ✓ | cờ `affiliate_share` |
| 8 | `ev` | ✓ | ✓ | có `event_registrations.status IN (registered, attended)` |

- Thẻ tuỳ chọn "Gói Gọi vốn cho dự án (tùy chọn)":
  - chỉ hiện cho Cá nhân có dự án;
  - xong khi có `project_fundraisings.status IN (pending_review, active)`;
  - không tính vào x/8.
- **NĐT** (`investor`): không có onboarding. `GET /me/onboarding` → 204; Admin list không có NĐT.
- **Cờ** `explore` / `affiliate_share`:
  - `POST /me/onboarding/flags/:key` → 204, idempotent (PK `(user_id, key)`).
  - Portal đặt `explore` khi mở Gian hàng / Nhu cầu (prototype 6304) hoặc bấm "Khám phá".
  - Portal đặt `affiliate_share` khi sao chép / chia sẻ link Affiliate (prototype 5242).

### Tiến độ cho Admin (không N+1)
- `onboarding_progress(user_id PK, done smallint, updated_at)` + index `(done, user_id)`.
- `OnboardingService.refresh(userIds[])`: một truy vấn snapshot cho cả lô → `steps.ts` → một `INSERT … ON CONFLICT DO UPDATE`.
- Refresh khi có outbox:
  - sự kiện có sẵn: `membership_fee.confirmed | .changed`, `group.joined`, `chat.member_sent` (tra `sender_id`), `store.published`, `event.registered`;
  - sự kiện mới `onboarding.touched { userId }`: phát cùng transaction khi tạo nhu cầu, tạo dự án, lưu hồ sơ / khai báo / ảnh đại diện, đặt cờ.
- Sweep hằng ngày 03:10 (Asia/Ho_Chi_Minh): refresh theo lô 500 cho mọi thành viên Cá nhân / DN (phí hết hạn, tin chat ở phòng không mặc định, dữ liệu cũ). Worker khởi động mà bảng trống → chạy sweep một lần (backfill).
- Admin list:
  - cột x/8 **tính trực tiếp** cho các dòng của trang bằng snapshot lô (≤ 1 query, luôn đúng);
  - lọc `onboarding=done|todo` dùng bảng progress (`done = 8` / `COALESCE(done,0) < 8`) trong subquery deferred join.

### API
| Method | Path | Quyền | |
|---|---|---|---|
| GET | `/me/onboarding` | thành viên (bỏ paywall) | `{ accountType, done, total: 8, paid, steps: [{ key, done, locked }], fundraising?: { done } }`; NĐT 204 |
| POST | `/me/onboarding/flags/:key` | thành viên | `explore \| affiliate_share` → 204 |
| GET | `/admin/users?onboarding=done\|todo` | `members.view` | dòng thêm `onboarding: { done, missing: key[], remindedToday }` |
| POST | `/admin/users/:id/onboarding-remind` | `members.action` | 204; 409 nếu đã hoàn tất; 429 nếu đã nhắc trong 24 giờ |
| GET / PUT | `/admin/mail/onboarding` | `settings.mail` (đọc / sửa) | `{ subject, body }` mẫu tạm, audit `mail.onboarding.update` |

### Nhắc (D-88)
- Trong một transaction:
  - kiểm `onboarding_reminders` của thành viên trong 24 giờ (429 "Đã nhắc thành viên này trong 24 giờ qua");
  - ghi reminder + audit `member.onboarding_remind`;
  - outbox `onboarding.reminded { userId, missing }`.
- Consumer outbox:
  - thông báo `type: system`, tiêu đề "Admin nhắc: hoàn tất hướng dẫn bắt đầu", nội dung "Còn thiếu: …", link `/dashboard`;
  - email `kind: onboarding` theo mẫu `onboarding_mail`, biến `{{ten}}`, `{{con_thieu}}`, `{{link}}`.
- Toast Admin: "Đã gửi nhắc tới {name} (thông báo + email)".
- Mẫu mặc định (tạm, Admin sửa ở Email tự động):
  - Tiêu đề: "Hoàn tất hướng dẫn bắt đầu trên OPC Hub".
  - Nội dung: "Xin chào {{ten}}, bạn còn vài bước để tham gia OPC Hub đầy đủ: {{con_thieu}}. Mở Dashboard để hoàn tất: {{link}}".

### Copy (prototype, verbatim)
- Thẻ:
  - tiêu đề "Hướng dẫn bắt đầu"; tiến độ "Đã xong {x}/8 bước · {pct}%";
  - xong hết: "Bạn đã hoàn thành tất cả các bước khởi đầu. Chúc bạn kết nối hiệu quả!";
  - CTA từng bước: Thanh toán · Cập nhật · Chọn nhóm · Mở chat · Mở gian hàng / Đăng dự án · Đăng nhu cầu / Khám phá · Lấy link · Xem sự kiện;
  - bước khoá: nút "Cần thanh toán phí", phụ đề thêm " · mở sau khi thanh toán phí"; bước đã xong: "Đã hoàn thành".
- Lời chào: "{Chào buổi sáng|trưa|chiều|tối}, {tên}" + "Hoàn thành các bước dưới đây để bắt đầu tham gia cộng đồng OPC Hub một cách đầy đủ."
- Admin:
  - cột "Khởi đầu", ô "x/8", "Nhắc" / "Đã nhắc";
  - tooltip "Còn thiếu: …" / "Đã hoàn tất 8 bước khởi đầu";
  - select "Khởi đầu": Tất cả / Đã hoàn tất / Chưa hoàn tất.

### Dashboard
- Prototype v4 chỉ có lời chào + thẻ. App **giữ** khối LIVE (REQ-224 / NA-24, có e2e) phía dưới; lời chào + thẻ đặt trên cùng (Q-V4-611-1).
- NĐT: không có thẻ.

## ACCEPTANCE CRITERIA
- Given DN M1 đã đóng phí, có nhóm, đã chat, gian hàng có nội dung, có nhu cầu, When mở Dashboard, Then thẻ "Đã xong x/8" đúng dữ liệu; bước kế tiếp tô xanh.
- Given TK chưa đóng phí, Then bước 2–8 hiện "Cần thanh toán phí"; bấm → popup thanh toán.
- Given Cá nhân bấm "Khám phá", Then cờ `explore` lưu; tải lại vẫn xong; gọi lại không lỗi.
- Given thành viên tạo nhu cầu / đăng ký sự kiện, Then `onboarding_progress.done` tăng (outbox) và Admin lọc "Chưa hoàn tất" phản ánh.
- Given Admin bấm "Nhắc", Then thành viên có thông báo + mail log `onboarding`, audit; bấm lại trong 24 giờ → 429; thiếu `members.action` → 403.
- Given 10 dòng ở Admin list, Then số query của trang không tăng theo số dòng (snapshot lô).

## PARITY
- **P-119** Dashboard · Hướng dẫn bắt đầu (M1, đã phí). Capture vùng lời chào + thẻ ở cả hai bên, vì app có khối LIVE bên dưới (Q-V4-611-1). Đo 1440 + 390.
- **P-120** chưa đóng phí (bước khoá): `unreachable` (prototype không có TK chưa đóng phí, như P-110).
- **D-96** Admin › Thành viên (cột Khởi đầu); **D-97** lọc "Chưa hoàn tất". Đo lại D-07 → D-14 (DV-V4-606-4).
- Cập nhật DV-V4-606-1 / -4 bằng số mới. Không mask, không nới ngưỡng.

## CONSTRAINTS
- DO NOT:
  - lưu cờ thủ công cho bước có dữ liệu (D-85);
  - tính x/8 từng dòng bằng vòng lặp query;
  - xoá khối LIVE;
  - dùng hằng số 600000.
- REUSE: `NotificationService.notify`, `MailService.request`, `AppSettingsService`, `AuditService`, deferred join `admin-users.repository`.
- SKIP: các select lọc khác của prototype ở Admin › Thành viên (Nhóm, Vai trò, Phí, Trạng thái, Hồ sơ, Ngày đăng ký) — ghi DV nếu ảnh hưởng parity.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng `Files touched`; migration `--create-only`, deploy `opchub_dev` + `opchub_test`.
- [ ] Unit `steps.ts` đủ DN / Cá nhân / khoá / tuỳ chọn Gọi vốn; int: snapshot, refresh qua outbox, filter, nhắc 429 / 403 / 409, migration.
- [ ] Gate: `test/contract/coverage`, `test/common/outbox-consumers` (`onboarding.touched`, `onboarding.reminded` có consumer), `test/gates/*`.
- [ ] EXPLAIN snapshot lô + lọc Admin trên ≥ 10k user: không Seq Scan bảng lớn.
- [ ] e2e `onboarding.spec.ts` + portal-shell / admin-shell / admin-members / a-01-login; parity P-119, D-96, D-97, D-07 → D-14.
- [ ] Commit theo đường dẫn, `git status --short` sạch, báo DONE kèm SHA.
