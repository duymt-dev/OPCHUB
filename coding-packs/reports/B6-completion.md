# B6 — FE trên server thật, contract test, e2e + parity, infra, backup, k6 (TIP-B60 → B66) — DONE

- Nhánh: `main`. Agent chính làm B60–B63 và B66; B64/B65 do một làn subagent làm trong worktree riêng, agent chính gộp.
- SHA code cuối của pha: `5bc8e24`. Các báo cáo và EXPLAIN của pha được commit sau đó; SHA nằm ở commit message.
- Ngày 18/10/2026.
- B67 (deploy staging, go-live) mới ở bước chuẩn bị (`infra/GO-LIVE-CHECKLIST.md`), phần còn lại để Chủ nhà làm.

## TIP

| TIP | Nội dung | Commit | Báo cáo |
|---|---|---|---|
| B60 | FE chạy được với `NEXT_PUBLIC_API_MOCKING=off`. api-client: lỗi 401 thì gọi refresh đúng một lần rồi thử lại; AuthGate refresh bằng cookie. Thêm rewrite `/v1` và chuyển chat Portal sang Socket.IO. Admin lấy badge và tổng quan từ API, chuông Portal nhận `notification.new` | `c899774`, `563a955` | — |
| B61 | Contract test cho 193/193 endpoint, response parse bằng đúng zod schema của FE; vá 7 endpoint server còn thiếu | `5c7b7e7` `d4c9270` `46a5d93` `de98535` `435cca4` | `TIP-B61-completion.md` |
| B62 | `seed:demo` dựng từ mock MSW; 115/115 behavior e2e trên server thật | `0cd95d3` → `200053b` (9 commit) | `TIP-B62-completion.md` |
| B63 | Chạy 205 màn parity trên server: 170 đạt, 25 deviation, 10 unreachable; 12 deviation mới đều đã ghi (Q-B63-7) | `4f58cd2` `f139e4b` `a7e835e` `a2a3a12` | `TIP-B63-completion.md` |
| B64 | `infra/`: nginx, systemd (`portal@`, `admin`, `api@`, `socket@`, `worker`, target), PgBouncer, Redis, RustFS, deploy / rollback | `f66ebad` `8a4af68` | Q-B64-1…7 |
| B65 | `pg-backup.sh` gồm pg_dump, WAL archive và đẩy offsite; khôi phục theo `restore.md`; healthcheck chạy bằng timer; logrotate; SLO §14.1 (`slo.md`) | `f66ebad` | Q-B65-1…4 |
| B66 | 4 kịch bản k6 §14.2, `seed:load`, `tokens.js`; sửa lỗi timezone (Q-B66-1) | `56e02d6` `18b4292` `fe2e312` `c51a346` `ad52790` | `B66-k6.md` |
| B67 | Chỉ chuẩn bị: checklist go-live, các đầu vào cần Chủ nhà (L3), thứ tự deploy, UAT-01 → UAT-31 | `470960f` | — |

## Cổng kiểm B6

| Mục | Kết quả |
|---|---|
| Behavior e2e, MSW tắt | **115/115** (7,1 phút, chạy lại cuối cùng ở SHA code cuối). Lần chạy trước đó có 1 lỗi: dòng nhật ký seed "DeepSeek" bị dòng `audit_logs` insert-only của các lượt trước đẩy khỏi 500 dòng → chế độ server bỏ kiểm dòng seed đó (DV-B63-6) |
| Parity `PARITY_IDS='*'`, MSW tắt | 345/378 ảnh. Theo màn: **170 đạt / 25 deviation / 10 unreachable**. G6 là 182 / 13 / 10; chênh 12 màn, đều nằm trong DV-B63-1 → DV-B63-6 (Q-B63-7) |
| Contract test | **193/193** endpoint, thiếu 0 (`coverage.int.spec.ts`) |
| k6 §14.2 (máy dev) | Đăng ký p95 70 ms. Chat 5.000 kết nối: ack p95 180 ms, nhận p95 173 ms, không mất tin. Admin p95 8 ms. Webhook p95 5 ms, khớp sau 0,04 s — số đo đầy đủ ở `B66-k6.md` |
| `infra/scripts/check-syntax.sh` | OK: `bash -n` toàn bộ script, `check-units.mjs` 25 tệp. Máy dev Windows không có shellcheck, nginx, systemd-analyze nên bỏ qua 3 bước này |
| `pnpm install --frozen-lockfile` / `lint` / `typecheck` | xanh: lint 8/8 task (0 lỗi, 12 cảnh báo đã có từ trước), typecheck 8/8 |
| `pnpm test` (unit) | 6/6 task: server 53, shared 73, admin 117, portal 88, ui 22, integrations 22 + 2 skip (S3 thật) |
| `test:int` | server **231/231** (59 file), db **12/12**. Chạy nối tiếp server → db đều xanh, sau khi sửa `afe4bd8`: spec admin-groups để lại 1 nhóm, test seed của db đếm ra 35 |
| `pnpm depcheck` | 0 vi phạm (1.078 + 510 module) |
| `pnpm build` | 3/3 task |

## EXPLAIN — `reports/explain/`

| Query | Plan | Thời gian |
|---|---|---|
| Đếm thành viên theo nhóm cho hộp xuất (B63, 20.025 dòng `group_members`) | Seq Scan + HashAggregate. Query đếm khoảng 100% bảng nên Seq Scan là phương án rẻ nhất. Ép dùng index thì planner chọn Index Only Scan `group_members_group_id_status_group_role_idx`, 7,7 ms, gần như không nhanh hơn | 8,9 ms |

Các list khác của pha (contract, seed) không thêm query mới. Thay đổi server ở B61 có EXPLAIN cho bot log (deferred join theo `(created_at DESC, id)`), ghi trong báo cáo TIP-B61.

## Rà CODING RULE 1–15

1. File mã lớn nhất là `packages/shared/src/mock-data/domains/ops-project-portal.ts`, 364 dòng. Server lớn nhất là
   `service-admin.service.ts`, 280 dòng; FE lớn nhất là `event-form-fields.tsx`, 259 dòng. Không file nào vượt trần.
   `docs/spec/*.js` là tài liệu chỉ đọc; `mockServiceWorker.js` là file sinh tự động.
2. Code mới đặt ở module mới: `lib/socket.ts`, `use-notification-push.ts`, `seed/demo/reporting.ts`, `seed/load.ts`, `e2e/server/api.ts`.
3. Test nằm ở file riêng (`test/contract/**`, `e2e/**`).
4. Không dùng `any`, `@ts-ignore` hay non-null assertion. Ack của socket và env của script seed đều parse bằng zod.
5. depcheck 0 vi phạm; seed chỉ import `@opchub/shared`, không import chéo app.
6. Endpoint mới ở B61 kiểm quyền bằng permission key (`c.room`, `c.mod`, …).
7. Đếm thành viên chỉ chạy một câu `GROUP BY`, không query trong vòng lặp; EXPLAIN ở trên. `seed:load` dùng `createMany`.
8. Chuyển trạng thái phiếu YC ở B61 dùng `WHERE status = <from>`, 0 dòng trả 409.
9. Phí được kích hoạt qua outbox (`membership_fee.activated` cập nhật Redis `auth:fee`); thông báo sinh ở worker.
10. Phiên Postgres luôn chạy UTC (Q-B66-1); tiền lưu số nguyên VND (600.000).
11. `audit_logs` chỉ INSERT; e2e và parity không xoá được, nên phần lệch này ghi là DV-B63-6.
12. Ngân hàng, mail, MST, OTP, storage đều dùng fake provider; `STORAGE_PROVIDER=local` bị cấm ở production.
13. Không có secret trong repo. Mật khẩu tài khoản tải và token k6 nằm ở `D:\opchub-local\`. `RATE_LIMIT_DISABLED` bị env schema cấm ở production.
14. Chat qua Socket.IO thật, ack sau commit (S-12); DTO Portal không có `isSimulated`.
15. Commit theo từng bước bằng `git commit -- <paths>` rồi push.

## Chưa làm / để lại

- B67: deploy staging, chạy UAT trên staging và cấp secret thật (SePay, SMTP, SSO, Sentry DSN, offsite backup) là
  việc mức L3 của Chủ nhà; xem `infra/GO-LIVE-CHECKLIST.md`.
- Parity trên server còn 12 màn lệch so với G6 vì sắp xếp, dữ liệu thật và audit insert-only. Chủ nhà đã chốt giữ
  hành vi server (Q-B63-7).
- k6 chưa chạy qua nginx và PgBouncer vì máy dev Windows không có hai thành phần này; thu phí mới đo 3 phút.
- Máy dev Windows chưa có shellcheck, `nginx -t`, `systemd-analyze verify`; cần chạy lại các bước này trên VPS.
