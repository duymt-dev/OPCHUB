# B3 — Cộng đồng, chat realtime, kiểm duyệt, thông báo (TIP-B20 → B25) — DONE

- Nhánh: `main` (agent chính làm tuần tự)
- SHA cuối của code pha: `9b7c69a` (cổng B3 + báo cáo commit sau, SHA ở commit message)
- Ngày: 17/10/2026

## TIP

| TIP | Nội dung | Commit |
|---|---|---|
| — | Migration chat/moderation/notification + chỉnh theo hợp đồng FE (UQ partial tỉnh/slug khi xoá mềm, `rooms.description`, ca báo cáo gom theo tin, `message_flags`) | `5319494`, `c4f419f` |
| — | TIP-B20 → B25 | `180d460` |
| B20 | `/groups` (nhãn miền, `myStatus`, BR-12), join/leave có điều kiện + `member_count` cùng tx, outbox `group.join_requested`; Admin Nhóm CRUD (xoá mềm, phòng mặc định + phòng thêm, chủ nhóm/ĐPV qua `group_role`), member-counts, members, export + audit; `GROUP_ROLE_PORT` thật | `87db94d` |
| B21 | Chủ nhóm duyệt/từ chối (D-43; `c.mod` mọi nhóm), tin hệ thống phòng Chung, outbox `group.request_decided`, worker đẩy `member.request` | `3ec79c8` |
| B22 | Process Socket.IO: websocket-only, redis-adapter, handshake JWT + Redis (khoá/version/phí, không DB), `user:{id}`, `room.join` cache quyền, presence ZSET + số online gom ≤5s, kênh `socket:user` (ngắt khi `session.revoked`) | `b230b80` |
| B23 | Phòng/chủ đề, tin nhắn REST + socket dùng chung service, insert idempotent (S-12) ack sau commit, `message.new/updated` qua kênh `socket:room`, keyset `before/after` (S-06), react/pin/reply, chưa đọc theo seq Redis (S-05), `/me/chat`, members/pins/files, DTO Portal không `isSimulated` + DTO Admin xem chỉ đọc (D-26, D-48) | `723868f` |
| B24 | Báo cáo tin (ca gom theo tin + lượt báo từng người), Aho–Corasick in-memory reload pub/sub, hook sau commit → job `moderation.keywordHit`, Admin reports/action (hide/warn/lock) + từ khoá CRUD + audit, seed 7 từ khoá | `cecfd5a` |
| B25 | Hộp thư keyset + unread partial index, đánh dấu đọc, consumer outbox (mention/reply, duyệt nhóm, cảnh báo, phí kích hoạt) → `notification.new`; relay outbox nhiều handler/loại | `9b7c69a` |

## Cổng kiểm B3

| Mục | Kết quả |
|---|---|
| `pnpm lint` | 8/8 task (FE còn 12 warning cũ, 0 error) |
| `pnpm typecheck` | 8/8 task |
| `pnpm test` (unit) | 6/6 task; server **46**, shared **73**, admin 108, portal 84, ui 22, integrations **21/21** (S3 thật RustFS khi nạp `s3.env` + endpoint local) |
| `pnpm --filter @opchub/server test:int` | **124/124** (24 file) trên `opchub_test` + Redis db 2 |
| `pnpm depcheck` | 0 vi phạm (FE+packages 1036 module; server 320 module) |
| `pnpm build` | 3/3 task |
| Boot | `main-socket` in "Socket.IO sẵn sàng", không lỗi; `main-worker` khởi tạo đủ module (Moderation/Notification/Chat/Community), queue `moderation` có trong Redis |
| **Cổng B3 đầu-cuối** | `test/gates/b3-community-chat.int.spec.ts`: xin vào nhóm duyệt → 403 đọc chat → chủ nhóm duyệt (tin hệ thống + thông báo) → 2 socket `room.join` → `message.send` có @nhắc, người kia nhận `message.new` → thông báo mention → báo cáo → Admin ẩn → tin biến khỏi lịch sử |

### Phân bổ test tích hợp mới (32)

| Nhóm | Số test |
|---|---|
| community: nhóm Portal 4 · Admin Nhóm 3 · yêu cầu vào nhóm 4 | 11 |
| socket: handshake/khoá/sự kiện user/presence | 4 |
| chat: REST 6 · socket đầu-cuối 1 | 7 |
| moderation | 5 |
| notification | 3 |
| outbox nhiều consumer | 1 |
| cổng B3 | 1 |

## EXPLAIN — `reports/explain/`

| Query | Plan | Thời gian |
|---|---|---|
| `/groups` trạng thái người gọi trên trang (20k group_members) | Index Scan `group_members_user_id_status_idx` | 0.03 ms |
| Admin members?groupIds (20k) | Bitmap Index Scan `group_members_group_id_status_group_role_idx` (users Hash Join — ghi chú trong file) | 9 ms |
| Lịch sử phòng trang đầu (40k tin) | Index Scan `messages_room_id_created_at_id_idx` | 0.05 ms |
| `before=` | Index Scan cùng index + PK | 0.08 ms |
| `after=` reconnect (S-06) | Index Scan Backward cùng index (đã sửa từ 10k dòng → 99) | 0.09 ms |
| Tin cuối mỗi phòng (LATERAL) | Index Scan, 1 dòng/phòng | 0.05 ms |
| Hộp thư (60k thông báo) | Bitmap Index Scan `notifications_user_id_created_at_id_idx` | 0.10 ms |
| Đếm chưa đọc | Bitmap Index Scan **`notifications_unread`** (partial) | 0.06 ms |

Member-counts: bỏ đếm `group_members` (Seq Scan) → đọc `groups.member_count` (34 dòng, cập nhật cùng tx).

## Soát CODING RULE 1–15

| # | Kết quả |
|---|---|
| 1 Kích thước | Nguồn lớn nhất mới `group-admin.service.ts` ~190, `message.service.ts` ~185; test lớn nhất `chat-rest.int.spec.ts` 228. Không file > 400 |
| 2 Không dồn code | Module mới `chat`, `moderation`, `notification`; community tách `controllers/ services/ repositories/ domain/`; gateway tách `chat.gateway` (kết nối/phòng) + `message.gateway` (tin) |
| 3 Test riêng | `aho-corasick.spec.ts` + `test/**/*.int.spec.ts` |
| 4 TS strict / zod | 0 `any`, 0 `@ts-ignore`, 0 non-null. Zod: body/query, payload socket (`clientEvents`), envelope Redis `socket:user`/`socket:room`, outbox, job BullMQ |
| 5 Ranh giới | chat → community qua `index.ts` (`GroupRoleService`, `GroupAccessService`, `GroupService`); moderation → chat/account qua `index.ts`; socket gateway chỉ gọi domain qua cổng/index; 0 `forwardRef`; depcheck xanh |
| 6 Permission key | Admin Nhóm `m.view`/`c.create`, kiểm duyệt + xem chat `c.mod`; vai trò trong nhóm (D-43) qua `group_members.group_role`, không so tên vai trò hệ thống |
| 7 Postgres | Keyset tin/thông báo, deferred join báo cáo, LATERAL tin cuối, partial index (`groups_province_live`, `reports_open_case`, `notifications_unread`, `messages_persona_client_msg`); DTO tin 1 query/trang (không N+1); `createMany`/pipeline; 0 `$queryRawUnsafe` |
| 8 Transition | `group_members` `WHERE status=<from>` (join/leave/duyệt); báo cáo `open→resolved` có điều kiện (0 dòng → 409); xoá chủ đề `WHERE created_by` |
| 9 Outbox | join_requested, request_decided, chat.mentioned, moderation.warned cùng transaction; khoá TK qua AdminUsers (outbox) |
| 10 Tiền/thời gian | Không đụng tiền; timestamptz UTC, ngày hiển thị `Asia/Ho_Chi_Minh` |
| 11 Audit | group.create/update/delete, group.members.export, moderation.*, moderation.keyword.add/remove — cùng transaction |
| 12 Adapter | Không dịch vụ ngoài mới (socket/Redis là hạ tầng) |
| 13 Secret/env | Không biến env mới; 0 `console.*` |
| 14 Chat S-01→S-12 | S-01 số online gom; S-02 quyền 1 lần ở `room.join`, fan-out theo room qua Redis, 0 query theo người nhận; S-03 handshake Redis; S-04 thông báo chỉ @nhắc/trả lời; S-05 seq Redis rebuild từ cursor; S-06 `after=`; S-08 Aho–Corasick + queue; S-09 process riêng + redis-adapter; S-12 ack sau commit, idempotent; `isSimulated` không tới Portal (test khẳng định) |
| 15 Git | Mỗi TIP một commit Conventional, `git commit -- <paths>`, đã push, `git status` sạch |

## Câu hỏi đã ghi (questions.md › Backend)

Q-B20-1 → 5 (chủ nhóm rời, sửa phòng chỉ thêm, quyền Admin Nhóm, chủ nhóm mặc định, miền "Khác"),
Q-B21-1 (`/admin/groups/requests` không FE gọi — bỏ), Q-B23-1 → 5 (DTO theo quyền, DTO phát trung lập, đọc khi tự gửi,
members 50 đầu, ảnh nhóm), Q-B24-1 → 3 (lý do ca từ khoá, gom ca, nội dung cảnh báo). Không có mục L3.

## Chưa làm / chuyển pha sau

- FE vẫn dùng `restTransport` — đổi sang socket transport + retry/backoff/`after=` ở **B60**.
- Ảnh bìa nhóm thật (`groups.cover_url`, D-36) và upload ảnh/file chat lên S3 — B60 (presign đã có ở B13).
- `weekly_active` nhóm: cột có sẵn, scheduler cập nhật ở **B34** (`stats_daily`).
- Persona/bot (`persona_id`, `is_simulated=true`) — **B45**.
- Seed demo (tin nhắn/ghim/yêu cầu/báo cáo/thông báo mẫu cho e2e: c1 general, r1–r4, s1–s4) — **B62**.
