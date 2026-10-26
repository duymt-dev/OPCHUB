# TIP-V4-611 — Onboarding 8 bước — completion

- Nhánh: `feature/TIP-V4-611-onboarding-8-steps`, xếp chồng trên `feature/TIP-V4-613-assistant` (PR #27 chưa merge)
- PR: [#28](https://github.com/duymt-dev/OPCHUB/pull/28) (base `feature/TIP-V4-613-assistant`)
- Commit:
  - `1f8ef322` TIP
  - `ff10ea5a` backend: DB + module `onboarding` + cột Admin + Nhắc
  - `11a80236` UI Portal / Admin + MSW + Q-V4-611-1..7
  - `dce6de6d` parity Admin › Thành viên (ẩn hàng tiêu đề ở mobile, chữ viết tắt như prototype)
  - `98f49ec7` e2e + parity
- REQ / D: REQ-505 · D-76, D-85, D-88 · §27.1 QT-02 · §27.6 UP-04 / AD-02 · §27.8

## Đã làm

- **DB** (`20261026090000_v4_onboarding`):
  - `onboarding_flags` (PK user_id + key);
  - `onboarding_reminders` (index `(user_id, sent_at desc)`);
  - `onboarding_progress` (PK user_id, `done` CHECK 0..8, index `(done, user_id)`);
  - index `messages(sender_id)`, `MailKind.onboarding`.
- **Shared**: `onboarding/steps.ts` dùng chung server + MSW. 8 bước DN / Cá nhân; bước 2–8 khoá và không tính khi chưa phí; thẻ Gọi vốn tuỳ chọn ngoài x/8. Có schema API, sự kiện outbox `onboarding.touched` / `onboarding.reminded`, loại thông báo `system`.
- **Server** module `onboarding`:
  - snapshot **một truy vấn cho cả lô** (EXISTS mỗi bước);
  - `GET /me/onboarding` (NĐT 204), `POST /me/onboarding/flags/:key` (idempotent, key lạ 404);
  - `POST /admin/users/:id/onboarding-remind` (`members.action`; 409 đã đủ; 429 trong 24 giờ; advisory lock; audit `member.onboarding_remind`; outbox → thông báo + email đúng một lần);
  - `GET/PUT /admin/mail/onboarding` (`settings.mail`, audit `mail.onboarding.update`).
- **Tiến độ Admin**:
  - worker refresh khi có phí / vào nhóm / chat / gian hàng / sự kiện / `onboarding.touched`;
  - `onboarding.touched` phát khi tạo nhu cầu, tạo dự án, lưu hồ sơ, khai báo;
  - sweep 03:10 theo lô 500, backfill khi bảng trống.
- **Admin › Thành viên**:
  - cột x/8 tính trực tiếp cho trang bằng snapshot lô;
  - lọc `onboarding=done|todo` qua bảng progress trong deferred join;
  - nút Nhắc / Đã nhắc, tooltip "Còn thiếu: …";
  - mẫu email nhắc ở Email tự động.
- **Portal**:
  - lời chào + thẻ "Hướng dẫn bắt đầu" đầu Dashboard (giữ khối LIVE, Q-V4-611-1);
  - cờ `explore` khi mở Gian hàng / Nhu cầu, `affiliate_share` khi sao chép / chia sẻ link;
  - i18n 10 ngôn ngữ.

## Câu hỏi đã chọn phương án an toàn

Q-V4-611-1..8 ở `ui-parity/questions.md`. Chính:

- Q-1: giữ khối LIVE.
- Q-2 / Q-8: tiêu chí hồ sơ theo D-85, không theo prototype.
- Q-3: đếm mọi tin + sweep.
- Q-4: NĐT không có thẻ.
- Q-5: câu 429 + mẫu mail tạm.
- Q-6: chỉ làm lọc "Khởi đầu".

## Test (số thật)

| Cổng | Kết quả |
|---|---|
| lint | 0 lỗi (cảnh báo có từ trước) |
| typecheck | sạch (8/8) |
| unit | shared 390 · portal 396 · admin 446 · server 225 · ui 48 · integrations 86 (+2 skip) |
| depcheck | sạch (836 module) |
| build (MSW) | portal + admin |
| test:int phạm vi | 56 file / **960/960**: onboarding, account, admin-account, local-business, project, mail, notification, contract (coverage 232), common/outbox-consumers, gates/* |
| db migration | `migration-onboarding.int.spec.ts` 3/3 |
| e2e behavior | onboarding, admin-members, admin-shell, admin-rbac, portal-shell, a-01-login: **40/40** |

Test mới:

- Unit `steps.spec` (DN / Cá nhân / khoá / Gọi vốn tuỳ chọn), `onboarding-model.spec`, `onboarding-cell.spec`, `memberInitials`.
- Int `test/onboarding/onboarding.int.spec.ts` (5):
  - khoá khi chưa phí, dữ liệu thật, NĐT 204;
  - cờ idempotent + outbox;
  - cột x/8 + lọc;
  - Nhắc 204 / 429 / 403 + thông báo + mail một lần;
  - mẫu email.
- Contract `test/contract/onboarding.int.spec.ts`.
- e2e `onboarding.spec.ts` (2):
  - Portal: M1 6/8 → "Lấy link" → 7/8;
  - Admin: lọc Chưa hoàn tất → Nhắc → "Đã nhắc" → nhắc lại 429 → lọc Đã hoàn tất.

## EXPLAIN (ANALYZE, BUFFERS) — `opchub_test`, 20.000 thành viên, ROLLBACK

| Truy vấn | Kế hoạch | Thời gian |
|---|---|---|
| Snapshot 10 id (cột x/8, `GET /me/onboarding`) | Bitmap `users_pkey`; EXISTS: Index Only Scan `group_members_user_id_status_idx`, Index Scan `messages_sender_id_idx`, Index Only Scan `event_registrations_user_id_status_idx`, `onboarding_flags_pkey` | 0,54 ms |
| Lọc "Chưa hoàn tất" (LIMIT 10) | Index Only Scan `users_list_all` → Anti Join Index Only Scan `onboarding_progress_done_user_id_idx` | 0,13 ms |
| Lọc "Đã hoàn tất" (LIMIT 10) | Index Only Scan `users_list_all` → Nested Loop Index Only Scan `onboarding_progress_done_user_id_idx` | 2,22 ms |

Không có Seq Scan trên bảng lớn. Các bảng `membership_fees`, `stores`, `projects`, `needs`, `project_fundraisings` chỉ vài trăm dòng ở `opchub_test`, nên planner tự chọn Seq Scan (0,07 ms). Mỗi bảng đều đã có index theo người dùng.

## Parity (không mask, không nới ngưỡng)

| Màn | 1440 | 390 | |
|---|---|---|---|
| P-119 Dashboard · Hướng dẫn bắt đầu | 0,00% | 0,35% | đạt |
| P-120 chưa đóng phí | — | — | `unreachable` (prototype không có TK chưa phí) |
| D-96 cột Khởi đầu | 3,69% | 5,43% | DV-V4-611-2: thứ tự dòng (DV-B63-2), m7 2/8 (Q-V4-611-8) |
| D-97 lọc Chưa hoàn tất | 3,69% | 5,43% | như D-96 |
| D-07 | 1,88% | 10,94% | DV-V4-611-3: thứ tự dòng + 6 ô lọc chưa làm (Q-V4-611-6) |
| D-08 | 3,08% | 10,38% | DV-V4-611-3 |
| D-09 | 1,32% | 14,05% | DV-V4-611-4 |
| D-10 | 2,79% | 11,44% | DV-V4-611-3 |
| D-11 | 3,94% | 12,12% | DV-V4-611-3 |
| D-12 | 3,13% | 3,64% | DV-V4-611-4 |
| D-13 | 2,13% | 3,88% | DV-V4-611-4 |
| D-14 | 1,91% | 12,46% | DV-V4-611-3 |
| D-17 | 0,78% | 17,78% | DV-V4-611-3 |
| P-01 Dashboard | 72,04% | 75,33% | DV-V4-611-1: giữ khối LIVE (Q-V4-611-1) |

Trước V4-611, đo trên cùng prototype v4: D-07 11,61 / 8,67%, D-08 12,30 / 12,89%, D-11 11,58 / 9,73%, D-14 11,59 / 10,05%. Ở 1440, mọi màn D-07 → D-14 đều giảm. Ở 390 vẫn lệch vì thanh lọc của app thấp hơn prototype khoảng 190px (6 ô lọc chưa làm), nên mọi thẻ dòng bị đẩy lên.

## Luật cứng 1–14

| # | Luật | |
|---|---|---|
| 1 | Kích thước file | ✅ lớn nhất `mock-data/domains/onboarding.ts` 260 dòng; server < 210 |
| 2 | TS strict, không `any` | ✅ zod cho HTTP + outbox payload |
| 3 | Ranh giới import | ✅ port `ONBOARDING_PORT`; depcheck sạch |
| 4 | Phân quyền bằng key | ✅ `members.view` / `members.action` / `settings.mail` |
| 5 | DB: không query trong vòng lặp, index | ✅ snapshot lô, refresh 1 upsert, EXPLAIN ở trên |
| 6 | Realtime | — không đụng |
| 7 | Đổi trạng thái có điều kiện | ✅ mail claim `updateMany mailedAt null` |
| 8 | Outbox | ✅ `onboarding.touched` / `onboarding.reminded` cùng transaction, consumer idempotent |
| 9 | Thời gian UTC | ✅ `timestamptz`; sweep theo giờ VN |
| 10 | Audit Admin | ✅ `member.onboarding_remind`, `mail.onboarding.update` |
| 11 | Adapter | ✅ mail qua `MailService` |
| 12 | Không secret, không `console.*` | ✅ |
| 13 | Test ở file riêng | ✅ |
| 14 | Commit theo đường dẫn, status sạch | ✅ |

## Chưa làm / chuyển tiếp

- 6 ô lọc còn lại của Admin › Thành viên (Nhóm, Vai trò, Phí, Trạng thái, Hồ sơ, Ngày): Q-V4-611-6, TIP SKIP.
- Owner duyệt DV-V4-611-1..4 và Q-V4-611-1..8.
- Gửi email nhắc thật qua nhà cung cấp mail: dev dùng fake adapter.
