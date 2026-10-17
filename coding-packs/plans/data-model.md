# OPCHUB — Data Model v1 (PostgreSQL 16 + Prisma 7)

> Phụ lục của `BUILDER-HANDOFF.md` (Vibecode BƯỚC 4). Nguồn: SRS §8–§9, domain-glossary, Decisions D-01 → D-48,
> schema zod `packages/shared/src/api-domains`. Quy ước đặt tên, migration: [prisma-migrations](../standards/database/prisma-migrations.md).
> Index: [query-indexing](../standards/database/query-indexing.md) — "bằng trước, khoảng/sort sau", `INCLUDE`, partial, expression.

## Quy ước chung (áp mọi bảng)

- `id uuid` (`@default(uuid(7))`), `created_at`, `updated_at` `timestamptz(6)`. Bảng chỉ thêm (log, outbox) bỏ `updated_at`.
- Cột trạng thái là **enum Postgres** đúng giá trị trong `packages/shared/src/enums.ts`.
- Tiền `int` VND (một khoản), `bigint` cho tổng. Email `citext`. SĐT E.164 `text`.
- Xoá mềm `deleted_at` chỉ cho `users`, `projects`, `messages`, `categories`.
- `PK` / `FK` / `UQ` / `IX` dưới đây là ràng buộc; `IX*` = index viết tay trong SQL migration (Prisma không khai báo được).
- File schema theo domain trong `packages/db/prisma/schema/*.prisma`, mỗi file ≤ 600 dòng.

## 1. `account.prisma`

### `users`
| Cột | Kiểu | Ghi chú |
|---|---|---|
| id | uuid PK | |
| member_code | text UQ | `TV` + 6 số, sinh từ sequence `member_code_seq` (D-41) |
| account_type | enum `personal \| business \| investor` | |
| full_name | text | |
| email | citext UQ | |
| phone | text UQ NULL | E.164; SSO có thể chưa có (D-45 bắt bổ sung) |
| password_hash | text NULL | argon2id; NULL nếu chỉ SSO |
| registration_role | text NULL | Chuyên gia, Giảng viên… — **không cấp quyền** |
| system_role | enum `super_admin \| admin \| moderator \| member` | default `member` |
| status | enum `active \| locked` | BR-02 |
| perm_version | int | tăng khi đổi quyền/khoá → thu hồi phiên (auth-rbac) |
| avatar_url | text NULL | key MinIO |
| totp_secret_enc | bytea NULL | AES-256-GCM, admin bắt buộc (D-27) |
| email_verified_at | timestamptz NULL | OTP thành công / SSO |
| locked_reason | text NULL | |
| deleted_at | timestamptz NULL | |

- `IX* users_list (account_type, created_at DESC) INCLUDE (full_name, email, status) WHERE deleted_at IS NULL` — Admin Thành viên (deferred join).
- `IX* users_search GIN ((unaccent(full_name) || ' ' || email) gin_trgm_ops)` — ô tìm; truy vấn phải dùng đúng biểu thức (hàm `immutable_unaccent`).

### `business_profiles` (1–0..1 với users)
`user_id uuid PK FK`, `tax_code text`, `company_name`, `representative`, `position`, `main_field`, `sub_fields text[]`,
`address`, `verification enum unverified | verified | pending | rejected` (D-40), `verified_at`, `lookup_raw jsonb` (kết quả tra MST, chỉ đọc).
- `IX tax_code` (không unique — OQ-12 cho nhiều người cùng MST).

### `auth_identities` — SSO (D-45)
`id`, `user_id FK`, `provider enum google | facebook | linkedin | deepseek`, `subject text`, `email citext`.
`UQ (provider, subject)`, `IX (user_id)`.

### `refresh_tokens`
`id`, `user_id FK`, `family_id uuid`, `token_hash text UQ`, `expires_at`, `revoked_at NULL`, `replaced_by uuid NULL`,
`user_agent`, `ip inet`. Dùng lại token đã xoay → thu hồi cả `family_id` (auth-rbac).
- `IX (user_id, revoked_at)`; job dọn `expires_at < now()`.

### `consents`
`id`, `user_id FK`, `kind enum terms | privacy | marketing`, `version text`, `accepted_at`, `ip inet`. NĐ 13/2023.

> OTP, khoá đăng nhập 5 lần (D-44), token quên mật khẩu, Idempotency-Key: **Redis**, không có bảng.

## 2. `membership-fee.prisma`

### `membership_fees` (1–1 users, bản ghi hiện hành)
`user_id PK FK`, `status enum pending_payment | active | expiring | expired`, `valid_until timestamptz NULL`,
`amount int` (600000), `paid_at NULL`, `version int` (bump → JWT/Redis, S-03).
- `IX* membership_fees_due (valid_until) WHERE status IN ('active','expiring')` — scheduler chuyển trạng thái hằng ngày.
- `IX (status, updated_at DESC)` — Admin Phí lọc tab.

### `membership_fee_periods` — lịch sử kỳ phí
`id`, `user_id FK`, `starts_at`, `ends_at`, `amount int`, `source enum transfer | manual`, `payment_transaction_id FK NULL`,
`collected_by uuid FK users NULL`, `reason text NULL` (bắt buộc khi `manual`, D-41).
- `IX (user_id, ends_at DESC)`. BR-05: kỳ mới bắt đầu từ `max(valid_until, now)`.

### `payment_transactions`
`id`, `provider text`, `bank_txn_id text`, `amount int`, `content text`, `received_at`, `match_status enum unmatched | matched | manual | ignored`,
`matched_user_id FK NULL`, `matched_at NULL`, `raw jsonb`.
- `UQ (provider, bank_txn_id)` — webhook + poll trùng thì `ON CONFLICT DO NOTHING` (V-06).
- `IX* payment_tx_unmatched (received_at DESC) WHERE match_status = 'unmatched'`.

## 3. `community.prisma`

### `groups`
`id`, `slug UQ` (`c1`…), `province text UQ` (mỗi tỉnh một nhóm — Q-G4c-6), `region enum north | central | south`, `name`,
`description`, `cover_url`, `rules text[]`, `join_mode enum open | approval`, `member_count int` (cập nhật trong transaction), `deleted_at NULL`.
- `IX (region, member_count DESC)` — Cộng đồng sắp xếp; `IX* groups_search GIN (unaccent(name) gin_trgm_ops)`.

### `group_members`
`group_id FK`, `user_id FK`, **PK (group_id, user_id)**, `group_role enum owner | moderator | member`,
`status enum pending | member | rejected | cancelled | left | removed`, `intro text NULL`, `decided_by FK NULL`, `decided_at NULL`.
- `IX (user_id, status)` — nhóm của tôi; `IX* group_members_pending (group_id, created_at DESC) WHERE status = 'pending'`;
  `IX (group_id, status, group_role)`.
- Transition: `pending → member | rejected | cancelled`, `member → left | removed`; cập nhật có điều kiện.

## 4. `chat.prisma`

### `rooms`
`id`, `group_id FK`, `slug` (`general`, `qa`…), `name`, `created_by FK NULL`, `is_default bool`. `UQ (group_id, slug)`.

### `messages`
`id`, `room_id FK`, `sender_id uuid FK users NULL`, `persona_id FK NULL` (D-48: Portal **không** thấy cột này),
`kind enum text | file | image`, `body text` (≤ 4000, text thuần), `attachment jsonb NULL` (`{key,name,size,mime}`),
`reply_to_id FK messages NULL`, `client_msg_id uuid NULL`, `is_simulated bool` (D-48 chỉ Admin/DB), `hidden_at NULL`, `deleted_at NULL`.
- `UQ (room_id, sender_id, client_msg_id)` — idempotent S-12 (persona dùng `persona_id` thay `sender_id`, `UQ (room_id, persona_id, client_msg_id)`).
- `IX (room_id, created_at DESC, id DESC)` — keyset lịch sử + `after=` khi reconnect.
- `IX* messages_search GIN (unaccent(body) gin_trgm_ops) WHERE deleted_at IS NULL` — tìm trong phòng.

### `message_reactions`
`message_id FK`, `user_id FK`, `emoji text`, **PK (message_id, user_id, emoji)**.

### `pinned_messages`
`room_id FK`, `message_id FK UQ`, `pinned_by FK`, `pinned_at`. **PK (room_id, message_id)**.

### `room_read_cursors` (S-04, S-05)
`user_id FK`, `room_id FK`, `last_read_message_id uuid`, `updated_at`. **PK (user_id, room_id)**. Counter chưa đọc ở Redis.

## 5. `moderation.prisma`

### `reports`
`id`, `message_id FK`, `source enum keyword | member`, `reporter_id FK NULL`, `reason text`, `status enum open | resolved`,
`action enum dismiss | hide | warn | lock NULL`, `resolved_by FK NULL`, `resolved_at NULL`.
- `IX* reports_open (source, created_at DESC) WHERE status = 'open'` (badge sidebar + tab Kiểm duyệt).
- `UQ (message_id, reporter_id)` — một người báo một lần (`reportedByMe`).

### `moderation_keywords`
`word citext PK`, `created_by FK`. Nạp vào Aho-Corasick in-memory, reload qua pub/sub khi đổi (S-08).

## 6. `event.prisma`

### `events`
`id`, `title`, `description`, `mode enum online | offline`, `starts_at`, `ends_at`, `address NULL`, `map_url NULL`, `online_url NULL`,
`seats int NULL`, `registered_count int`, `group_id FK NULL`, `registration_open bool` (Q-G5a-5), `cover_url NULL`, `created_by FK`.
- `IX (mode, starts_at)`; `IX (starts_at) INCLUDE (title, mode, seats, registered_count)` cho Portal danh sách.

### `event_registrations`
`event_id FK`, `user_id FK`, **PK (event_id, user_id)**, `status enum registered | attended | cancelled`, `checked_in_at NULL`.
- `IX (user_id, status)`; `IX (event_id, status, created_at)`. Hết chỗ → 409 (khoá dòng `events FOR UPDATE`).

## 7. `project.prisma`

### `projects`
`id`, `owner_id FK`, `name`, `short_description`, `description_html` (sanitize lúc ghi), `category_id FK`, `stage enum idea | mvp | growth | launched`,
`visibility enum public | private`, `status enum draft | pending_review | published | hidden | needs_changes | rejected`, `review_note NULL`,
`test_url NULL`, `repo_url NULL`, `repo_private bool`, `cover_url NULL`, `featured_week date NULL` (Q-G5b-4), `followers_count int`, `deleted_at NULL`.
- `IX* projects_review (created_at DESC) WHERE status = 'pending_review' AND deleted_at IS NULL`.
- `IX (status, category_id, created_at DESC) WHERE deleted_at IS NULL` — Khám phá (chỉ `published`, BR-08).
- `IX (owner_id, updated_at DESC)` — Dự án của tôi. State machine: `nestjs-modules.md` (D-18 sửa → duyệt lại).

### `project_members`
`project_id FK`, `user_id FK NULL`, `name`, `role`, `avatar_url NULL`, `sort int`. PK `id`, `IX (project_id, sort)`.

### `project_shares` (BR-08 private chia sẻ cho nhóm)
`project_id FK`, `group_id FK`, **PK (project_id, group_id)**.

### `project_fundings` (1–0..1)
`project_id PK FK`, `amount bigint`, `currency text`, `equity_pct numeric(5,2) NULL` (ẩn bằng flag OQ-15), `min_amount int`, `use_of_funds text`.

### `project_follows`
`project_id FK`, `user_id FK`, **PK (project_id, user_id)**.

### `project_comments`
`id`, `project_id FK`, `author_id FK`, `parent_id FK NULL`, `body`, `resolved_at NULL`, `like_count int`.
- `IX (project_id, parent_id, created_at)`. `project_comment_likes (comment_id, user_id) PK`.

### `repo_access_requests`
`project_id FK`, `user_id FK`, **PK**, `status enum pending | granted | denied`.

## 8. `investor.prisma`

### `investor_interests`
`id`, `project_id FK`, `user_id FK`, `kind enum individual | business | fund`, `contact_name`, `phone`, `organization NULL`,
`amount bigint`, `message`, `status enum sent | in_discussion | connected`, `investor_key text` (gom theo người — Q-G5c-1: dùng `user_id`,
`investor_key` giữ cho NĐT ngoài hệ thống).
- `UQ (project_id, user_id)` — BR-09; `IX (status, created_at DESC)`, `IX (investor_key)`.

### `investor_thread_messages`
`id`, `investor_key text`, `author_id FK NULL`, `from_investor bool`, `body`. `IX (investor_key, created_at)`.

### `investor_admin_notes`
`id`, `investor_key`, `author_id FK`, `body`. (bình luận nội bộ Admin)

## 9. `notification.prisma`

### `notifications` (S-04: chỉ @mention, reply, sự kiện cá nhân)
`id`, `user_id FK`, `type text`, `title`, `body`, `link`, `read_at NULL`.
- `IX (user_id, created_at DESC, id DESC)` keyset; `IX* notifications_unread (user_id) WHERE read_at IS NULL`.

## 10. `settings.prisma`

- `categories`: `id`, `name citext UQ`, `color`, `scopes text[]` (`project`, `biz`), `sort int`, `hidden bool`, `deleted_at` (BR-11: đang dùng chỉ ẩn).
- `role_permissions`: `role enum admin | moderator | member` PK, `keys text[]` (D-20/D-46; `super_admin` không lưu).
- `app_settings`: `key text PK`, `value jsonb` — `general`, `security` (D-33/D-44), `languages`, `welcome_mail` (D-47, không có `showPassword`).
- `smtp_configs`: một dòng: `host`, `port`, `encryption`, `login`, `key_enc bytea` (AES-256-GCM), `from_name`, `from_email`, `reply_to`, `daily_limit`.
- `admin_invites`: `id`, `email citext`, `system_role`, `token_hash`, `expires_at`, `accepted_at NULL`, `invited_by FK`.

## 11. `mail.prisma` + `marketing.prisma`

- `mail_logs`: `id`, `to citext`, `kind enum otp | welcome | fee_reminder | event | campaign | test`, `subject`, `status enum queued | sent | failed`,
  `provider_message_id NULL`, `error NULL`, `campaign_id FK NULL`, `sent_at NULL`. `IX (kind, created_at DESC)`, `IX (campaign_id)`.
- `campaigns`: `id`, `name`, `audience jsonb` (`{kind, groupIds}`), `subject`, `body_html`, `status enum draft | scheduled | sending | sent`,
  `scheduled_at NULL`, `sent_count int`, `open_count int`, `created_by FK`. `IX (status, scheduled_at)`.

## 12. `service-request.prisma` (flag D-05)

- `services`: `id`, `name`, `kind`, `description`, `enabled bool`, `sort int`.
- `service_requests`: `code text PK` (`YC-` + seq), `service_id FK`, `requester_id FK NULL`, `requester_kind enum per | biz`, `name`, `phone`, `email`,
  `org NULL`, `tax_code NULL`, `province`, `extra jsonb`, `note_html`, `status enum new | consulting | quoted | won | lost | done` (Q-G5c-4: thêm `done`),
  `assignee_id FK NULL`. `IX (status, created_at DESC)`.
- `service_request_comments`: `id`, `request_code FK`, `author_id FK`, `html`, `mentions uuid[]`.

## 13. `bot.prisma` (flag D-05, D-48)

- `personas`: `id`, `name`, `avatar_url`, `gender`, `age`, `role`, `province`, `tone`, `bio`, `skills text[]`, `frequency`, `active_hours`, `enabled`.
- `persona_groups`: `persona_id FK`, `group_id FK`, PK — BR-10.
- `bot_scripts`: `id`, `topic`, `type`, `group_ids uuid[]`, `lines jsonb` (`[{personaId, body}]`), `delay_minutes`, `run_at NULL`, `invite_real bool`, `enabled`.
- `bot_threads`: `id`, `script_id FK NULL`, `status enum pending | approved | posted | discarded`, `lines jsonb`, `group_ids uuid[]`,
  `approved_by FK NULL`, `posted_count int`. **Chỉ `approved` mới được worker đăng** (D-48).
- `bot_settings`: `app_settings.key = 'bot'`.

## 14. `system.prisma`

### `audit_logs` (luật 10, BR-13) — chỉ INSERT
`id`, `actor_id FK`, `action text` (`user.lock`, `fee.collect`, `export.users`…), `entity text`, `entity_id text`, `diff jsonb`, `ip inet`, `created_at`.
- `REVOKE UPDATE, DELETE ON audit_logs FROM opchub_app`.
- `IX (created_at DESC, id DESC)` keyset; `IX (entity, entity_id, created_at DESC)`. Giữ 90 ngày hiển thị, lưu lâu hơn.

### `outbox_events` (ADR-0005)
`id bigserial`, `type text`, `payload jsonb`, `created_at`, `dispatched_at NULL`, `attempts int`.
- `IX* outbox_pending (id) WHERE dispatched_at IS NULL` — relay `FOR UPDATE SKIP LOCKED`.

### `stats_daily` (S-10)
`day date`, `metric text`, `dimension text` (`''` nếu không có), `value bigint`, **PK (day, metric, dimension)**.

### `export_jobs`
`id`, `kind`, `params jsonb`, `requested_by FK`, `status enum queued | running | done | failed`, `file_key NULL`, `expires_at`. (Q-G4a-6: tải về qua presigned GET)

## Quan hệ chính

```
users 1─0..1 business_profiles      users 1─1 membership_fees 1─n membership_fee_periods ─0..1 payment_transactions
users n─n groups (group_members: group_role, status)      groups 1─n rooms 1─n messages ─n reactions / pins
messages 1─n reports        events 1─n event_registrations n─1 users
projects 1─n project_members / project_comments / project_follows / project_shares, 1─0..1 project_fundings
projects 1─n investor_interests n─1 users ;  investor_key 1─n investor_thread_messages
services 1─n service_requests 1─n service_request_comments
personas n─n groups (persona_groups) ; bot_scripts 1─n bot_threads → messages(persona_id, is_simulated)
```

## Seed (`packages/db/seed`, upsert, idempotent)

- **Bắt buộc (mọi môi trường):** 34 tỉnh/thành + vùng + 34 nhóm (`c1…`, phòng `general`), danh mục lĩnh vực, `role_permissions` mặc định
  (`DEFAULT_ROLE_PERMISSIONS`), mẫu email chào mừng (D-47), `app_settings` mặc định, Super Admin `admin@opchub.community` (mật khẩu từ env, D-29).
- **Demo (`seed:demo`, không chạy production):** chuyển từ `packages/shared/src/mock-data` (thành viên m1…, sự kiện, dự án, tin nhắn,
  persona, kịch bản) để e2e chạy trên server thật cho ra cùng dữ liệu như MSW — điều kiện để chạy lại parity (TIP-B63).
