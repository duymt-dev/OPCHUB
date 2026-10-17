# B2 — Thành viên & phí (TIP-B10 → B15) — DONE

- Nhánh: `main` (agent chính làm tuần tự)
- SHA cuối của code pha: `ab69145` (báo cáo này commit sau, SHA ghi ở commit message)
- Ngày: 17/10/2026

## TIP

| TIP | Nội dung | Commit |
|---|---|---|
| B10 | `packages/integrations`: mail (SMTP/fake), bank webhook (SePay/fake, HMAC `timingSafeEqual`, `extractMemberCode` D-41), tra MST (ESGOO→VietQR/fake), S3 (RustFS), LLM fake | `a5828a5` |
| B11 | Đăng ký cá nhân/DN (bản chờ Redis, OTP HMAC 5 sai/3 gửi), kích hoạt 1 transaction (user + phí pending + nhóm pending + consent + mail chào mừng qua outbox), D-40 MST, SSO fake (D-45), `/biz/lookup`, `/public/settings`, `/public/stats`, `/me/welcome-mail`, mail worker; hạ tầng `QueueService`/`WorkerFactory`, `IntegrationsModule`, `SecretBox`, settings core | `b4ab237`, `f0ba622` |
| B12 | Quên/đặt lại/đổi mật khẩu (token sha256 15', 3/giờ, bump `perm_version` + outbox `session_revoked`), thu hồi phiên khác, TOTP RFC 6238 (vector RFC) bước 2 đăng nhập | `bea733b` |
| B13 | `GET/PATCH /me` = `profileSchema`, `ProfileStatsRegistry`, `/members/suggest` (GIN), liên kết SSO, `/uploads/presign` | `4cf01f8` |
| B14 | Máy trạng thái phí + kỳ BR-05, webhook raw body + HMAC, lưu `ON CONFLICT`, đối soát khoá `FOR UPDATE` + version, quét bù 2', scheduler 00:05 VN, consumer outbox → Redis `auth:fee` + `membership.updated`, `Idempotency-Key`, `/dev/bank/simulate` | `342261b` |
| B15 | Admin Thành viên (deferred join, khoá/mở hàng loạt, vai trò `s.role`, xác minh DN, gán nhóm, xuất + audit) + Admin Phí (list, summary, collect/renew/remind/remind-all, export CSV, giao dịch không khớp + khớp tay) | `ab69145` |

## Cổng kiểm B2

| Mục | Kết quả |
|---|---|
| `pnpm lint` | 8/8 task xanh (FE còn 12 warning cũ, 0 error) |
| `pnpm typecheck` | 8/8 task xanh |
| `pnpm test` (unit) | 6/6 task; server **42**, shared **73**, integrations **21/21** (gồm S3 thật trên RustFS) |
| `pnpm --filter @opchub/server test:int` | **92/92** trên `opchub_test` + Redis db 2 |
| `pnpm --filter @opchub/db test:int` | **6/6** |
| `pnpm depcheck` | 0 vi phạm (FE+packages 1036 module; server 251 module) |
| `pnpm build` | 3/3 task xanh |
| Worker boot | `dist/main-worker.mjs` khởi động sạch; BullMQ đăng ký `fee-status-daily` (00:05 Asia/Ho_Chi_Minh) + `reconcile-poll` (2') |
| **Cổng B2 đầu-cuối** | `test/gates/b2-member-lifecycle.int.spec.ts`: đăng ký → OTP → phí pending (402) → hộp CK → webhook FakeBank ký HMAC → đối soát → consumer outbox → **token cũ** qua paywall (200) → `/me` active |

### Phân bổ test tích hợp server (92)

| Nhóm | Số test |
|---|---|
| common (envelope, outbox, audit, guard) | 25 |
| account: auth 10 · đăng ký/OTP 9 · SSO 4 · mật khẩu/phiên/TOTP 7 · hồ sơ 7 · admin thành viên 8 | 45 |
| mail (tx, rollback, lỗi lần cuối, đầu-cuối BullMQ) | 4 |
| membership-fee: đối soát + scheduler 9 · `/me/membership` + paywall 3 · admin phí 5 | 17 |
| cổng B2 | 1 |

## EXPLAIN (≥ 20.000 dòng, transaction ROLLBACK trên `opchub_test`) — `reports/explain/`

| Query | Plan | Thời gian |
|---|---|---|
| `/members/suggest` ILIKE không dấu (20k) | Bitmap Index Scan `users_search` (GIN trigram) | 2.9 ms |
| Scheduler → expired (30k phí) | Bitmap Index Scan **`membership_fees_due`** (partial) | 37 ms (cả UPDATE 1.550 dòng) |
| Scheduler → expiring | Bitmap Index Scan `membership_fees_due` | 27 ms (UPDATE 1.125 dòng) |
| Hàng đợi GD không khớp, 20 dòng mới nhất | Index Scan **`payment_tx_unmatched`** (partial) | 0.03 ms |
| Admin Thành viên: subquery id theo loại / tất cả | Index Scan `users_list_all` | 0.06 / 0.03 ms |
| Admin Phí: subquery user_id theo trạng thái | Index Scan `membership_fees_status_updated_at_idx` + PK users | 0.11 ms |

Không có Seq Scan trên bảng lớn.

## Soát CODING RULE 1–15

| # | Kết quả |
|---|---|
| 1 Kích thước | Nguồn lớn nhất `membership-fee/services/admin-fees.service.ts` 226 dòng; test lớn nhất 212. Không file nào > 400 |
| 2 Không dồn code | Module mới tách riêng: `mail`, `settings`, `community` (cổng), `uploads`; `membership-fee` chuyển sang `controllers/ services/ repositories/ domain/` |
| 3 Test riêng | `*.spec.ts` (mapper, TOTP, máy trạng thái, mẫu mail, env) + `test/**/*.int.spec.ts` |
| 4 TS strict / zod | Quét: 0 `any`, 0 `@ts-ignore`, 0 non-null. Zod cho body/query/header, env, Redis (bản chờ đăng ký, SSO, MFA, idempotency, cache settings/MST), outbox, job BullMQ, socket payload |
| 5 Ranh giới | membership-fee/community/mail đọc account qua `index.ts` (`MemberDirectory`, cổng `FEE_*`, `GROUP_*`, `ProfileStatsRegistry`); common không import modules; 0 `forwardRef`; depcheck xanh |
| 6 Permission key | Admin: `m.view` / `m.edit` / `s.role`; quét 0 so sánh tên vai trò |
| 7 Postgres | Deferred join (users, phí), keyset (giao dịch không khớp), partial + expression index; không query trong vòng lặp (outbox `addMany`, audit `logMany`, Redis pipeline, `revokeAllOfUsers`, `createManyAndReturn` mail) — ngoại lệ có chủ đích: `collect` hàng loạt mỗi người 1 transaction có khoá dòng (≤ 100, ghi chú trong code); `$queryRawUnsafe` 0 |
| 8 Transition | Phí: khoá `FOR UPDATE` + `WHERE version`; giao dịch `WHERE match_status='unmatched'`; khoá TK `WHERE status=<from>`; xác minh DN `WHERE verification='pending'`; mail `WHERE status='queued'`; 0 dòng → 409 |
| 9 Outbox | Kích hoạt phí, đổi trạng thái phí, khoá TK, đổi vai trò, đổi mật khẩu, mọi mail — cùng transaction |
| 10 Tiền/thời gian | `amount Int` VND; kỳ phí UTC, cron theo `Asia/Ho_Chi_Minh` |
| 11 Audit | Khoá/mở, vai trò, xác minh DN, gán nhóm, xuất thành viên, thu phí, nhắc phí, xuất phí, khớp tay — cùng transaction |
| 12 Adapter | Mail/bank/MST/S3/SSO chỉ qua token DI; dev/test dùng fake; `/dev/bank/simulate` 404 ở production |
| 13 Secret/env | Biến mới có trong `.env.example` + zod; `OTP_FIXED_CODE` bị env schema từ chối ở production; biến trống = chưa đặt; 0 `console.*` |
| 14 Chat | Chưa đụng (B3) — sự kiện `membership.updated` publish qua kênh Redis `socket:user` cho B22 |
| 15 Git | Mỗi TIP một commit Conventional, `git commit -- <paths>`, đã push, `git status` sạch |

## Câu hỏi đã ghi (questions.md › Backend)

Q-B11-1 → 4 (mật khẩu/SĐT tuỳ chọn, OTP cố định dev/test, welcome-mail + public stats, SSO fake),
Q-B12-1 → 2 (TOTP chỉ khi đã bật, trang reset FE), Q-B13-1 → 3 (presign, SSO link, persona),
Q-B14-1 → 3 (giao dịch không khớp, transfer-confirm, kênh realtime), Q-B15-1 → 4 (lý do thu mặc định,
API khớp tay, 403 khi khoá, quyền màn Phí). Không có mục L3.

## Chưa làm / chuyển pha sau

- Trang FE `/reset-password` và màn giao dịch không khớp (ngoài phạm vi BE — ghi cho B62).
- Process socket subscribe kênh `socket:user` → B22. Ẩn dự án khi khoá TK (consumer `user.locked`) → B32.
- Xuất thành viên thật (job CSV lên S3) → B43; trước đó chỉ trả job id + audit.
- `test:int` của `@opchub/db` cần `TEST_DATABASE_URL` trong env (lấy từ `apps/server/.env`) — giữ như B1.
