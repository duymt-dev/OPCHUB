# B5 — Cài đặt, mail, marketing, xuất dữ liệu, tổng quan, bot, dịch vụ (TIP-B40 → B46) — DONE

- Nhánh: `main` (agent chính làm tuần tự — DB test/Redis db 2 dùng chung nên integration test không chạy song song được)
- SHA code cuối của pha: `036da6c` (cổng B5 + báo cáo commit sau, SHA ở commit message)
- Ngày: 17/10/2026

## TIP

| TIP | Nội dung | Commit |
|---|---|---|
| — | Schema marketing / bot / service + `service_request_seq`, partial `campaigns_due`, `mail_logs_sent_visible` | `8cde699` |
| — | TIP-B40 → B46 | `54b8e17` |
| B40 | Cài đặt chung / bảo mật (SSO `userCount` từ `auth_identities`) / ngôn ngữ; lĩnh vực (thêm, trùng 409, ẩn, sắp xếp `unnest WITH ORDINALITY`, xoá khi đang dùng 409 — BR-11); phân quyền 3 vai trò 1 câu INSERT…SELECT + bump `perm_version` + grants Redis; tài khoản quản trị (mời / thu hồi, chủ sở hữu 409); nhật ký 90 ngày. Migration `category_usage_indexes` | `88b3dcf` |
| B41 | Mail chào mừng GET/PUT/test (202 `mailJob`); SMTP: key chỉ vào `SecretBox` → `key_enc`, API chỉ `hasKey`; verify offline ở `MAIL_PROVIDER=fake`; worker gửi qua `smtp_configs` + hạn mức ngày VN (Redis, dời job tới 00:00 VN); consumer `event.registered` → mail xác nhận | `6efe421` |
| B42 | Chiến dịch nháp 201 / lên lịch 201 / gửi 202 (`sending` + outbox cùng tx), gửi lại / xoá khi đang gửi 409; worker xếp thư theo lô keyset 500 + con trỏ `send_cursor` cùng tx (chạy lại không trùng); lịch mỗi phút cho chiến dịch đến hạn; nhật ký thư deferred join + gửi lại; sanitize chuyển `common/html`. `WorkerFactory` gộp handler nhiều processor cùng queue | `640dfdc` |
| B43 | `ExportService.request(tx)` → `export_jobs` + outbox `export.requested` + audit cùng tx; worker dựng CSV (BOM) theo lô keyset → `storage.put(exports/{id}.csv)`; `GET /admin/exports/:id` chỉ người tạo, `url` presign 5'. `FakeStorageProvider` trong `packages/integrations` | `3c67627` |
| B44 | `GET /admin/overview` (KPI + 7 tháng từ `stats_daily`, cache 60s), `GET /admin/badges` theo permission key; job `statsDaily` 00:10 VN 1 câu INSERT…SELECT ON CONFLICT + `groups.weekly_active` 1 câu UPDATE…FROM; BRIN `messages(created_at)` | `4e34835` |
| B45 | Cờ `FEATURE_BOTS` (`whenFeature` — tắt → 404); persona `ps<n>` / kịch bản `sc<n>` từ sequence; run → `pending` (D-04), duyệt `pending → posted` có điều kiện → `PersonaMessageService` (sender NULL, `persona_id`, `is_simulated`, `client_msg_id = bot-{thread}-{i}`, S-11 30 tin/phút/nhóm, phát `message.new` DTO Portal); hoạt động 40 dòng + `todayCount` giờ VN; cài đặt `app_settings.bot` (seed bắt buộc) | `cb3593f` |
| B46 | Cờ `FEATURE_SERVICES`; Portal `GET /services`, `POST /service-requests` (Idempotency-Key, `YC-<seq>`, bỏ paywall); Admin danh sách deferred join, tóm tắt, nhân sự = TK có `n.edit`, chuyển trạng thái `WHERE status=from` (409), phụ trách, bình luận sanitize + @nhắc → outbox `service_request.mentioned` → thông báo; danh mục CRUD (xoá khi có phiếu 409); xuất CSV + audit | `036da6c` |

Không thêm dependency mới.

## Cổng kiểm B5

| Mục | Kết quả |
|---|---|
| `pnpm lint` | 8/8 task (0 error) |
| `pnpm typecheck` | 8/8 task |
| `pnpm test` (unit) | 6/6 task; server **53**, shared 73, admin 108, portal 84, ui 22, integrations 19 + 2 skip (S3 thật cần RustFS — tiến trình RustFS local đã dừng do hết giới hạn 2 giờ của tác vụ nền, test S3 tự skip) |
| `pnpm --filter @opchub/server test:int` | **189/189** (41 file) trên `opchub_test` + Redis db 2 — 2 lần chạy liên tiếp đều xanh |
| `pnpm depcheck` | 0 vi phạm (478 module) |
| `pnpm build` | 3/3 task |
| **Cổng B5 đầu-cuối** | `test/gates/b5-admin-ops.int.spec.ts`: Super Admin cấp `n.edit` cho điều phối viên → SMTP lưu key (`hasKey`) → chiến dịch theo nhóm, worker xếp đủ thư → xuất thành viên nhóm lên storage → điều phối viên duyệt hội thoại bot, Portal thấy tin nhưng không có `isSimulated` → thành viên gửi phiếu dịch vụ, badge `requests` ≥ 1, điều phối viên chuyển `new → consulting` → Tổng quan đúng schema → nhật ký có đủ các bước |

Ghi chú trung thực: một lần chạy `test:int` báo 1 lỗi ở cổng B5 — lần đó hai bộ integration chạy **đồng thời** trên cùng `opchub_test`/Redis db 2 (lệnh cổng nền + lệnh chạy lại), xung đột dữ liệu dùng chung (phân quyền, cache). Chạy riêng: 3/3 lần xanh.

### Test mới (37 tích hợp + 1 unit)

| Nhóm | Số test |
|---|---|
| settings (chung/bảo mật/ngôn ngữ/lĩnh vực/403) · phân quyền + quản trị + nhật ký | 5 · 2 |
| mail chào mừng + SMTP + hạn mức + mail sự kiện | 5 |
| marketing | 5 |
| export | 3 |
| reporting (overview, stats, weekly_active, badges) | 5 |
| bot | 4 |
| service | 4 |
| cổng B5 | 1 |
| `whenFeature` (unit) | 1 |

## EXPLAIN — `reports/explain/`

| Query | Plan | Thời gian |
|---|---|---|
| Nhật ký Admin 90 ngày, 500 dòng (50k) | Index Scan `audit_logs_created_at_id_idx` | 0.16 ms |
| Nhật ký thư trang 3 (60k thư) | Index Only Scan `mail_logs_sent_visible` (partial) | 0.03 ms |
| Đếm nhật ký thư | Index Only Scan `mail_logs_sent_visible` | 3.3 ms |
| Lô người nhận DN (20k users, keyset) | Index Scan `users_pkey` | 2.8 ms |
| Lô người nhận tất cả | Index Scan `users_pkey` | 0.31 ms |
| `weekly_active` (100k tin rải 1 năm) | Bitmap Index Scan `messages_created_brin` (đã sửa từ Seq Scan) | 33 ms (job đêm) |
| `members_new` một ngày | Seq Scan `users` 2.5k dòng test — bảng nhỏ ở DB test; `users_list_all (created_at)` dùng khi lớn | 1.7 ms |

Index thêm trong pha: `projects_category_live`, `business_profiles_main_field` (đếm lĩnh vực), `campaigns.send_cursor` (cột), BRIN `messages_created_brin`, sequence `persona_seq` / `bot_script_seq`. Đã thử `users_mailable` (partial INCLUDE) nhưng planner không dùng → bỏ, không commit.

## Rà CODING RULE 1–15

1. Kích thước: file lớn nhất pha `service-admin.service.ts` 217 dòng; controller ≤ 160.
2. Không nối thêm vào file quá trần; sanitize chuyển `common/html` (project giữ facade 1 dòng).
3. Test ở `test/**` riêng.
4. Không `any` / `@ts-ignore` / non-null; body + query + payload outbox + job + `params` export parse zod (`exportParamsSchema`, `storedLinesSchema`).
5. Domain giao tiếp qua `index.ts` (export → account/community; chat `PersonaMessageService` → bot); depcheck 0.
6. Quyền theo key: `s.cfg`, `s.role`, `s.log`, `n.edit`, `c.mod`, `m.view`; badge kiểm `hasPermission`, không so tên vai trò.
7. Không query trong vòng lặp (lô keyset, `unnest`, groupBy); deferred join cho nhật ký thư / phiếu YC; keyset cho lô gửi + xuất.
8. Chuyển trạng thái `WHERE status = <from>` (chiến dịch, hội thoại bot, phiếu YC, export job) → 0 dòng → 409.
9. Outbox cùng tx: `campaign.send`, `export.requested`, `service_request.mentioned`, `mail.requested`.
10. Thời gian UTC, ngày VN tính rõ (hạn mức mail, `todayCount`, `statsDaily`).
11. Audit mọi thao tác Admin (kể cả xuất CSV, gửi thử, verify SMTP).
12. SMTP / storage qua adapter; test dùng `FakeMailProvider`, `FakeStorageProvider`.
13. Không secret trong repo; key SMTP không log, không trả API. Biến mới `FEATURE_BOTS`, `FEATURE_SERVICES` có trong zod + `.env.example`.
14. Persona đi đường chat chung (S-11 rate limit nhóm); DTO Portal không `isSimulated` (test kiểm chuỗi JSON).
15. Commit ngay sau mỗi TIP, `git status` sạch.

## Chưa làm / chuyển pha sau

- Nối FE: `/admin/badges`, `/admin/overview`, tải file từ export job, ảnh qua presign → **B60**.
- Seed demo prototype (4 quản trị + 6 nhật ký, chiến dịch cp1–4, persona/kịch bản/hội thoại, dịch vụ + YC-1001…1005) → **B62**. Seed bắt buộc đã thêm `app_settings.bot`.
- Tỷ lệ mở/nhấp chiến dịch (webhook Brevo), mẫu mail chỉnh được, N của S-11 — chờ PM (Q-B42-3, Q-B42-2, Q-B45-1).
- Câu hỏi pha: Q-B40-1 → Q-B46-2 trong `reports/ui-parity/questions.md`.
