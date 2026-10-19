# OPCHUB — API Contract v1

> Phụ lục của `BUILDER-HANDOFF.md` (Vibecode BƯỚC 4). Sinh ngày 17/10/2026 từ MSW handler
> (`apps/{portal,admin}/src/mocks/handlers`) đối chiếu SRS §13. **198 endpoint** (195 sau TIP-V2-203): 79 có trong SRS §13,
> 119 bổ sung trong lúc dựng FE (Q-G*-1). File này là **bản bổ sung có hiệu lực của SRS §13** — `docs/spec` chỉ đọc.

## Cách đọc

- Base `/v1`. Request/response = **zod schema trong `packages/shared/src/api-domains/*.ts`** — nguồn sự thật duy nhất,
  FE đang dùng. Server parse input và serialize output bằng đúng schema đó (`nestjs-zod`); TIP-B61 chạy contract test
  so response thật với schema.
- Envelope, mã lỗi, phân trang, idempotency: [standards/backend/api-conventions](../standards/backend/api-conventions.md).
- **Quyền**
  - `Public`: `@Public()`.
  - `Đăng nhập`: `JwtAuthGuard` + `AccountStatusGuard`.
  - `+ phí`: thêm `MembershipFeeGuard` → 402 `MEMBERSHIP_REQUIRED`.
  - `(+investor)`: D-14 — TK Nhà đầu tư bỏ qua phí nhưng chỉ vào route có `@AllowAccountTypes('investor')`.
  - `+ chủ nhóm`: `@RequireGroupRole('owner')` (D-43).
  - (cũ, trước SRS-3.6) `m.view`, `c.mod`…: `@RequirePermission` theo D-20/D-46 cho `/admin/*`. Cặp `m.view / m.edit`: GET dùng key đọc, ghi dùng key ghi.
  - **SRS-3.6 §21 (TIP-V2-203, có hiệu lực)**: `/admin/*` dùng `@RequireAdmin(<25 khoá>)` theo bảng ánh xạ ở `tips/TIP-V2-203-rbac-guards-live.md` (GET → `<menu>.view`, ghi → khoá thao tác); cột Quyền của các dòng cũ đọc theo bảng đó. Thiếu thao tác mà có Xem → 403 `VIEW_ONLY`.
  - `flag`: sau feature flag D-05 (`FEATURE_BOTS`, `FEATURE_SERVICES`) — tắt thì trả 404.
- Cột **MSW** là file handler hiện tại — đọc để biết hành vi mong đợi (transition hợp lệ, khi nào 409, audit).
- Danh sách Admin có số trang: **deferred join**. Chat, thông báo, audit log, giao dịch: **keyset**.

## Socket.IO (SRS §13.4 — websocket-only, `@socket.io/redis-adapter`)

Tên event + zod payload đặt ở `packages/shared/src/socket` (TIP-B05).

| Event | Hướng | Payload |
|---|---|---|
| `room.join` / `room.leave` | C → S | `{ roomId }` → ack `{ ok, unread, online }` |
| `message.send` | C → S | `sendMessageSchema & { roomId }` → ack `chatMessageSchema` **sau commit** (S-12) |
| `message.react` / `message.pin` | C → S | `reactMessageSchema` / `pinMessageSchema` → ack `chatMessageSchema` |
| `message.new` / `message.updated` | S → C | `chatMessageSchema` — **không có `isSimulated`** (D-48) |
| `room.online` | S → C | `{ roomId, online }` gom 5 giây (S-01) |
| `member.request` | S → C chủ nhóm | `{ groupId, userId, intro }` |
| `notification.new` | S → C | `notificationSchema` |
| `membership.updated` | S → C | `{ status, validUntil }` — Portal đóng paywall |
| `session.revoked` | S → C | `{ reason }` — khoá TK / đổi quyền / đổi mật khẩu; client đăng xuất |

## Mục lục module

| Module server | Endpoint |
|---|---|
| `account` | 30 |
| `audit` | 1 |
| `bot` | 16 |
| `chat` | 8 |
| `community` | 17 |
| `event` | 10 |
| `export` | 1 |
| `investor` | 11 |
| `mail` | 8 |
| `marketing` | 12 |
| `membership-fee` | 13 |
| `moderation` | 6 |
| `notification` | 2 |
| `project` | 22 |
| `reporting` | 2 |
| `service-request` | 15 |
| `settings` | 19 |
| `storage` | 3 |

## `account` (29)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/admin/users` | m.view / m.edit | SRS §13 | members.ts |
| PATCH | `/admin/users/:id/status` | m.view / m.edit | SRS §13 | admin-members.ts |
| POST | `/admin/users/:id/verification` | m.view / m.edit | bổ sung | members.ts |
| POST | `/admin/users/assign-groups` | m.view / m.edit | SRS §13 | admin-members.ts |
| POST | `/admin/users/export` | m.view / m.edit | SRS §13 | admin-members.ts |
| POST | `/admin/users/status` | m.view / m.edit | bổ sung | members.ts |
| POST | `/auth/login` | Public | SRS §13 | auth.ts |
| POST | `/auth/logout` | Đăng nhập | SRS §13 | auth.ts |
| POST | `/auth/otp/resend` | Public | SRS §13 | register.ts |
| POST | `/auth/otp/verify` | Public | SRS §13 | register.ts |
| POST | `/auth/password/change` | Đăng nhập | bổ sung | profile.ts |
| POST | `/auth/password/forgot` | Public | SRS §13 | auth.ts |
| POST | `/auth/password/reset` | Public | SRS §13 | (server) |
| POST | `/auth/refresh` | Public | bổ sung | (server) |
| POST | `/auth/register/business` | Public | SRS §13 | register.ts |
| POST | `/auth/register/personal` | Public | SRS §13 | register.ts |
| POST | `/auth/sessions/revoke-others` | Đăng nhập | bổ sung | profile.ts |
| GET | `/auth/sso/:provider/callback` | Public | SRS §13 | sso.ts |
| POST | `/auth/sso/complete` | Public | bổ sung | sso.ts |
| POST | `/auth/totp/verify` | Public | bổ sung | (server — D-27) |
| GET | `/biz/lookup` | Public | SRS §13 | register.ts |
| GET | `/me` | Đăng nhập | SRS §13 | profile.ts |
| PATCH | `/me` | Đăng nhập | SRS §13 | profile.ts |
| POST | `/me/email/otp` | Đăng nhập | bổ sung | profile.ts |
| POST | `/me/email/verify` | Đăng nhập | bổ sung | profile.ts |
| DELETE | `/me/sso/:provider` | Đăng nhập | bổ sung | profile.ts |
| POST | `/me/sso/:provider` | Đăng nhập | bổ sung | profile.ts |
| GET | `/members/suggest` | Đăng nhập | bổ sung | projects.ts |
| PUT | `/messages/:id/pin` | Đăng nhập | bổ sung | chat.ts |
| POST | `/messages/:id/reactions` | Đăng nhập | bổ sung | chat.ts |
| POST | `/messages/:id/report` | Đăng nhập | SRS §13 | community.ts |

## `audit` (1)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/admin/audit-logs` | s.log | bổ sung | settings.ts |

## `bot` (16)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/admin/bot/activity` | c.mod · flag | bổ sung | bots.ts |
| GET | `/admin/bot/log` | c.mod · flag | SRS §13 | admin-system.ts |
| GET | `/admin/bot/settings` | c.mod · flag | bổ sung | admin-system.ts |
| PATCH | `/admin/bot/settings` | c.mod · flag | SRS §13 | bots.ts |
| GET | `/admin/bot/threads` | c.mod · flag | bổ sung | bots.ts |
| DELETE | `/admin/bot/threads/:id` | c.mod · flag | bổ sung | bots.ts |
| POST | `/admin/bot/threads/:id/approve` | c.mod · flag | bổ sung | bots.ts |
| GET | `/admin/personas` | c.mod · flag | SRS §13 | admin-system.ts |
| POST | `/admin/personas` | c.mod · flag | SRS §13 | bots.ts |
| DELETE | `/admin/personas/:id` | c.mod · flag | SRS §13 | bots.ts |
| PATCH | `/admin/personas/:id` | c.mod · flag | SRS §13 | bots.ts |
| GET | `/admin/scripts` | c.mod · flag | SRS §13 | admin-system.ts |
| POST | `/admin/scripts` | c.mod · flag | SRS §13 | bots.ts |
| DELETE | `/admin/scripts/:id` | c.mod · flag | SRS §13 | bots.ts |
| PATCH | `/admin/scripts/:id` | c.mod · flag | SRS §13 | bots.ts |
| POST | `/admin/scripts/:id/run` | c.mod · flag | SRS §13 | bots.ts |

## `chat` (8)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/me/chat` | Đăng nhập + phí | bổ sung | chat.ts |
| DELETE | `/rooms/:id` | Đăng nhập + phí | bổ sung | chat.ts |
| GET | `/rooms/:id/files` | Đăng nhập + phí | bổ sung | chat.ts |
| GET | `/rooms/:id/members` | Đăng nhập + phí | bổ sung | chat.ts |
| GET | `/rooms/:id/messages` | Đăng nhập + phí | SRS §13 | admin-groups.ts |
| POST | `/rooms/:id/messages` | Đăng nhập + phí | bổ sung | chat.ts |
| GET | `/rooms/:id/pins` | Đăng nhập + phí | bổ sung | chat.ts |
| POST | `/rooms/:id/read` | Đăng nhập + phí | bổ sung | chat.ts |

## `community` (17)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/admin/groups` | c.room | SRS §13 | admin-members.ts |
| POST | `/admin/groups` | c.room | SRS §13 | admin-members.ts |
| DELETE | `/admin/groups/:id` | c.room | SRS §13 | admin-members.ts |
| GET | `/admin/groups/:id` | c.room | bổ sung | admin-groups.ts |
| PATCH | `/admin/groups/:id` | c.room | SRS §13 | admin-members.ts |
| POST | `/admin/groups/:id/members/export` | c.room | SRS §13 | admin-members.ts |
| GET | `/admin/groups/member-counts` | c.room | bổ sung | admin-groups.ts |
| GET | `/admin/groups/members` | c.room | bổ sung | admin-groups.ts |
| POST | `/admin/groups/members/export` | c.room | bổ sung | admin-groups.ts |
| GET | `/admin/groups/requests` | c.room | bổ sung | admin-members.ts |
| GET | `/groups` | Đăng nhập + phí | SRS §13 | lists.ts |
| DELETE | `/groups/:id/join` | Đăng nhập + phí | SRS §13 | community.ts |
| POST | `/groups/:id/join` | Đăng nhập + phí | SRS §13 | community.ts |
| GET | `/groups/:id/requests` | Đăng nhập + phí + chủ nhóm | bổ sung | community.ts |
| POST | `/groups/:id/requests/:userId/:decision` | Đăng nhập + phí + chủ nhóm | SRS §13 | community.ts |
| GET | `/groups/:id/rooms` | Đăng nhập + phí | bổ sung | admin-groups.ts |
| POST | `/groups/:id/rooms` | Đăng nhập + phí | bổ sung | chat.ts |

## `event` (10)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/admin/events` | e.edit | SRS §13 | admin-events.ts |
| POST | `/admin/events` | e.edit | SRS §13 | admin-events.ts |
| DELETE | `/admin/events/:id` | e.edit | SRS §13 | admin-events.ts |
| PATCH | `/admin/events/:id` | e.edit | SRS §13 | admin-events.ts |
| GET | `/admin/events/:id/registrations` | e.reg | SRS §13 | admin-events.ts |
| POST | `/admin/events/:id/registrations/check-in` | e.reg | bổ sung | admin-events.ts |
| POST | `/admin/events/:id/registrations/export` | e.reg | bổ sung | admin-events.ts |
| GET | `/events` | Đăng nhập + phí | SRS §13 | lists.ts |
| DELETE | `/events/:id/registration` | Đăng nhập + phí | SRS §13 | content.ts |
| POST | `/events/:id/registration` | Đăng nhập + phí | SRS §13 | membership.ts |

## `export` (1)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/admin/exports/:id` | người tạo job | bổ sung | (server — Q-G4a-6) |

## `investor` (11)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/admin/investors` | p.pub | SRS §13 | investors.ts |
| GET | `/admin/investors/:key` | p.pub | bổ sung | investors.ts |
| GET | `/admin/investors/:key/comments` | p.pub | bổ sung | investors.ts |
| POST | `/admin/investors/:key/comments` | p.pub | bổ sung | investors.ts |
| PATCH | `/admin/investors/:key/status` | p.pub | bổ sung | investors.ts |
| POST | `/admin/investors/export` | p.pub | bổ sung | investors.ts |
| GET | `/admin/investors/summary` | p.pub | bổ sung | investors.ts |
| POST | `/investor-thread/:key/messages` | Đăng nhập (+investor) | SRS §13 | projects.ts |
| GET | `/me/investor-thread` | Đăng nhập (+investor) | SRS §13 | projects.ts |
| POST | `/projects/:id/interest` | Đăng nhập + phí (+investor) | SRS §13 | projects.ts |
| GET | `/projects/:id/interests` | Đăng nhập + phí (+investor) | bổ sung | projects.ts |

## `mail` (8)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/admin/mail/welcome` | s.cfg | SRS §13 | admin-system.ts |
| PUT | `/admin/mail/welcome` | s.cfg | SRS §13 | admin-system.ts |
| POST | `/admin/mail/welcome/test` | s.cfg | bổ sung | marketing.ts |
| GET | `/admin/smtp` | s.cfg | SRS §13 | admin-system.ts |
| PUT | `/admin/smtp` | s.cfg | SRS §13 | admin-system.ts |
| POST | `/admin/smtp/test` | s.cfg | SRS §13 | admin-system.ts |
| POST | `/admin/smtp/verify` | s.cfg | bổ sung | settings.ts |
| GET | `/me/welcome-mail` | Đăng nhập | bổ sung | shell.ts |

## `marketing` (12)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/admin/campaigns` | n.edit | bổ sung | marketing.ts |
| POST | `/admin/campaigns` | n.edit | bổ sung | marketing.ts |
| DELETE | `/admin/campaigns/:id` | n.edit | bổ sung | marketing.ts |
| POST | `/admin/campaigns/:id/cancel` | n.edit | bổ sung | marketing.ts |
| POST | `/admin/campaigns/:id/send` | n.edit | bổ sung | marketing.ts |
| GET | `/admin/campaigns/estimate` | n.edit | bổ sung | marketing.ts |
| GET | `/admin/campaigns/templates` | n.edit | bổ sung | marketing.ts |
| GET | `/admin/mail/log` | n.edit | bổ sung | marketing.ts |
| POST | `/admin/mail/log/:id/resend` | n.edit | bổ sung | marketing.ts |
| GET | `/admin/marketing/summary` | n.edit | bổ sung | marketing.ts |
| GET | `/public/unsubscribe` | Public | bổ sung | unsubscribe.ts |
| POST | `/public/unsubscribe` | Public | bổ sung | unsubscribe.ts |

## `membership-fee` (13)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/admin/fees` | m.edit | SRS §13 | admin-members.ts |
| POST | `/admin/fees/:uid/:action` | m.edit | SRS §13 | admin-members.ts |
| POST | `/admin/fees/collect` | m.edit | bổ sung | fees.ts |
| POST | `/admin/fees/export` | m.edit | bổ sung | fees.ts |
| POST | `/admin/fees/remind` | m.edit | SRS §13 | admin-members.ts |
| POST | `/admin/fees/remind-all` | m.edit | bổ sung | fees.ts |
| GET | `/admin/fees/summary` | m.edit | bổ sung | fees.ts |
| GET | `/admin/fees/transactions` | m.edit | bổ sung | (server — hàng đợi GD không khớp) |
| POST | `/admin/fees/transactions/:id/match` | m.edit | bổ sung | (server — hàng đợi GD không khớp) |
| POST | `/dev/bank/simulate` | dev only | bổ sung | (server dev-only — FakeBank) |
| GET | `/me/membership` | Đăng nhập | SRS §13 | account.ts |
| POST | `/me/membership/transfer-confirm` | Đăng nhập | SRS §13 | membership.ts |
| POST | `/webhooks/bank` | Public + HMAC | SRS §13 | (server) |

## `moderation` (6)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/admin/moderation/keywords` | c.mod | bổ sung | admin-groups.ts |
| POST | `/admin/moderation/keywords` | c.mod | bổ sung | admin-groups.ts |
| DELETE | `/admin/moderation/keywords/:word` | c.mod | bổ sung | admin-groups.ts |
| GET | `/admin/reports` | c.mod | bổ sung | admin-content.ts |
| GET | `/admin/reports/:id/action` | c.mod | bổ sung | admin-content.ts |
| POST | `/admin/reports/:id/action` | c.mod | SRS §13 | admin-content.ts |

## `notification` (2)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/notifications` | Đăng nhập | SRS §13 | shell.ts |
| POST | `/notifications/read` | Đăng nhập | bổ sung | shell.ts |

## `project` (22)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/admin/projects` | p.pub | bổ sung | admin-projects.ts |
| DELETE | `/admin/projects/:id` | p.pub | bổ sung | admin-projects.ts |
| GET | `/admin/projects/:id` | p.pub | bổ sung | admin-projects.ts |
| POST | `/admin/projects/:id/review` | p.pub | SRS §13 | admin-projects.ts |
| POST | `/admin/projects/bulk` | p.pub | bổ sung | admin-projects.ts |
| GET | `/admin/projects/counts` | p.pub | bổ sung | admin-projects.ts |
| PUT | `/admin/projects/featured` | p.pub | bổ sung | admin-projects.ts |
| PUT | `/comments/:id/like` | Đăng nhập + phí | bổ sung | projects.ts |
| POST | `/comments/:id/replies` | Đăng nhập + phí | bổ sung | projects.ts |
| PUT | `/comments/:id/resolved` | Đăng nhập + phí | bổ sung | projects.ts |
| GET | `/me/projects` | Đăng nhập + phí | SRS §13 | projects.ts |
| GET | `/me/projects/:id` | Đăng nhập + phí | bổ sung | projects.ts |
| GET | `/projects` | Đăng nhập + phí (+investor đọc) | SRS §13 | projects.ts |
| POST | `/projects` | Đăng nhập + phí (+investor đọc) | SRS §13 | projects.ts |
| GET | `/projects/:id` | Đăng nhập + phí (+investor đọc) | bổ sung | projects.ts |
| PATCH | `/projects/:id` | Đăng nhập + phí (+investor đọc) | SRS §13 | projects.ts |
| GET | `/projects/:id/comments` | Đăng nhập + phí (+investor đọc) | bổ sung | projects.ts |
| POST | `/projects/:id/comments` | Đăng nhập + phí (+investor đọc) | SRS §13 | projects.ts |
| PUT | `/projects/:id/follow` | Đăng nhập + phí (+investor đọc) | bổ sung | projects.ts |
| POST | `/projects/:id/repo-access` | Đăng nhập + phí (+investor đọc) | bổ sung | projects.ts |
| POST | `/projects/:id/share` | Đăng nhập + phí (+investor đọc) | bổ sung | projects.ts |
| GET | `/projects/stats` | Đăng nhập + phí (+investor đọc) | bổ sung | projects.ts |

## `reporting` (2)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/admin/overview` | m.view | bổ sung | (server — overview/data.ts) |
| GET | `/dashboard/live` | Đăng nhập + phí | bổ sung | shell.ts |

## `service-request` (15)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/admin/service-requests` | n.edit · flag | SRS §13 | service-requests.ts |
| PATCH | `/admin/service-requests/:code` | n.edit · flag | SRS §13 | service-requests.ts |
| PATCH | `/admin/service-requests/:code/assignee` | n.edit · flag | bổ sung | service-requests.ts |
| GET | `/admin/service-requests/:code/comments` | n.edit · flag | bổ sung | service-requests.ts |
| POST | `/admin/service-requests/:code/comments` | n.edit · flag | SRS §13 | service-requests.ts |
| POST | `/admin/service-requests/:code/transition` | n.edit · flag | bổ sung | service-requests.ts |
| POST | `/admin/service-requests/export` | n.edit · flag | bổ sung | service-requests.ts |
| GET | `/admin/service-requests/staff` | n.edit · flag | bổ sung | service-requests.ts |
| GET | `/admin/service-requests/summary` | n.edit · flag | bổ sung | service-requests.ts |
| GET | `/admin/services` | n.edit · flag | bổ sung | service-requests.ts |
| POST | `/admin/services` | n.edit · flag | bổ sung | service-requests.ts |
| DELETE | `/admin/services/:id` | n.edit · flag | bổ sung | service-requests.ts |
| PATCH | `/admin/services/:id` | n.edit · flag | bổ sung | service-requests.ts |
| POST | `/service-requests` | Đăng nhập · flag | SRS §13 | account.ts |
| GET | `/services` | Đăng nhập · flag | bổ sung | account.ts |

## `settings` (16)

> TIP-V2-203: `/admin/roles/permissions` (GET/PUT), `/admin/admins` (GET), `/admin/admins/invite` (POST),
> `/admin/admins/:id` (DELETE) trả **410 `GONE`** (thay bằng `/admin/admin-roles*`, `/admin/admin-accounts*` §21);
> `PATCH /admin/users/:id/role` đã bỏ (RB-R01, BUG-035). FE bỏ gọi ở TIP-V2-204.

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/admin/admin-roles` | settings.admins | SRS-3.6 §21 | settings.ts |
| PUT | `/admin/admin-roles/permissions` | settings.admins | SRS-3.6 §21 | settings.ts |
| GET | `/admin/admin-accounts` | settings.admins | SRS-3.6 §21 | settings.ts |
| GET | `/admin/categories` | s.cfg | SRS §13 | settings.ts |
| POST | `/admin/categories` | s.cfg | SRS §13 | settings.ts |
| DELETE | `/admin/categories/:id` | s.cfg | SRS §13 | settings.ts |
| PATCH | `/admin/categories/:id` | s.cfg | SRS §13 | settings.ts |
| PUT | `/admin/categories/:id` | s.cfg | bổ sung | settings.ts |
| PUT | `/admin/categories/order` | s.cfg | bổ sung | settings.ts |
| GET | `/admin/settings/general` | s.cfg | bổ sung | settings.ts |
| PATCH | `/admin/settings/general` | s.cfg | bổ sung | settings.ts |
| GET | `/admin/settings/languages` | s.cfg | bổ sung | settings.ts |
| PATCH | `/admin/settings/languages` | s.cfg | bổ sung | settings.ts |
| GET | `/admin/settings/security` | s.cfg | bổ sung | settings.ts |
| PATCH | `/admin/settings/security` | s.cfg | bổ sung | settings.ts |
| GET | `/public/settings` | Public | bổ sung | sso.ts |
| GET | `/public/stats` | Public | bổ sung | (server — D-38) |

## `storage` (3)

| Method | Path | Quyền | Nguồn | MSW |
|---|---|---|---|---|
| GET | `/uploads/:key` | Đăng nhập | bổ sung | profile.ts |
| PUT | `/uploads/:key` | Đăng nhập | bổ sung | profile.ts |
| POST | `/uploads/presign` | Đăng nhập | bổ sung | profile.ts |

## Ghi chú hợp đồng

- `GET /admin/reports/:id/action` trong MSW lấy từ chữ "GET/POST" của SRS — server **chỉ có `POST`**; danh sách báo cáo là `GET /admin/reports`.
- `POST /admin/fees/:uid/:action`: `action ∈ collect | renew | remind`; `collect` bắt buộc `reason` (D-41), ghi audit.
- `POST /groups/:id/requests/:uid/:decision`: `decision ∈ approve | reject`.
- `PUT /uploads/:key` chỉ có trong MSW (giả lập MinIO). Server: `POST /uploads/presign` trả URL MinIO; client PUT thẳng vào MinIO, server `head` kiểm lại kích thước/MIME khi lưu.
- `POST /auth/refresh` đọc cookie `httpOnly` (path `/v1/auth/refresh`), xoay vòng; `api-client` FE gọi khi gặp 401 (TIP-B60).
- `POST /auth/password/reset` nhận token từ link email (TTL 15 phút); MSW không có vì FE chưa dựng màn đặt lại mật khẩu — TIP-B12 làm cả màn.
- `POST /webhooks/bank` nhận raw body, kiểm HMAC; không có trong MSW (FE không gọi).
- Trả **404** thay 403 khi người gọi không được biết tài nguyên tồn tại (dự án private, nhóm chưa tham gia).
- Admin route ghi nào cũng ghi `audit_logs` trong cùng transaction (luật 10); thao tác phá huỷ FE đã có hộp xác nhận.
