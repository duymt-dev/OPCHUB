# GOAL B1→B6 — toàn văn

> Câu `/goal` chỉ chứa tóm tắt (giới hạn 4.000 ký tự) và trỏ về file này. **File này là bản có hiệu lực.**
> Agent đọc lại nguyên file mỗi lần tiếp tục. Không sửa file này giữa chừng (chỉ Chủ nhà sửa).

**Mục tiêu:** Dựng toàn bộ backend OPCHUB; FE chạy trên server thật (MSW tắt) vẫn qua 115 e2e + 205 parity.

## ĐỌC TRƯỚC

`~/.claude/CLAUDE.md` (global rule), `AGENTS.md` (14 luật cứng), `coding-packs/BUILDER-HANDOFF.md` (7 luật tuyệt đối),
`coding-packs/02-TASK-GRAPH.md`, `coding-packs/plans/{api-contract.md,data-model.md}`,
`coding-packs/standards/{global,backend,database,realtime,integrations,security,testing}/*`, Decisions Log D-01 → D-48.
Đầu mỗi lần tiếp tục: đọc `coding-packs/reports/B*-completion.md` để biết pha nào đã xong, làm tiếp pha kế.

## LÀM TUẦN TỰ TỪNG PHA

Xong cổng kiểm của pha mới sang pha sau. TIP theo `02-TASK-GRAPH.md`:

- **B1** — Nền tảng: B01 → B07 (server 3 entrypoint, packages/db, outbox, audit, common, shared socket/queues, auth, guard)
- **B2** — Thành viên & phí: B10 → B15
- **B3** — Cộng đồng & chat realtime: B20 → B25
- **B4** — Sự kiện, dự án, nhà đầu tư, upload, dashboard: B30 → B34
- **B5** — Cài đặt, mail, marketing, export, Tổng quan, bot + dịch vụ sau flag: B40 → B46
- **B6** — FE tắt MSW, contract test, e2e + parity trên server, infra, backup, k6: B60 → B66 (B67 chỉ chuẩn bị)

## CODING RULE

Vi phạm thì không được qua cổng kiểm, không được báo DONE.

1. **Kích thước file:** BE tối ưu 200–400 dòng, trần cứng 600; chạm 500 thì tách thành thư mục con theo domain.
   FE tối ưu 150–250, trần 400; page/screen chỉ là orchestrator. ESLint `max-lines` phải xanh.
2. **Không dồn code:** không viết thêm vào file đã vượt trần; tính năng mới vào module mới, nối bằng facade 1–2 dòng.
   Mỗi file một trách nhiệm, không trộn domain (account / membership-fee / community / chat / …).
3. **Test ở file riêng** (`*.spec.ts` cạnh nguồn, `*.int.spec.ts` trong `apps/server/test`), không viết test dài trong file production.
4. **TypeScript strict:** không `any`, không `@ts-ignore`, không non-null assertion; mọi dữ liệu từ ngoài vào (HTTP, socket,
   webhook, job, env) parse bằng zod trong `packages/shared`.
5. **Ranh giới:** không import chéo app; module nghiệp vụ chỉ trong `apps/server/src/modules`; domain gọi nhau qua `index.ts`;
   không vòng phụ thuộc, không `forwardRef`. `pnpm depcheck` phải xanh.
6. **Phân quyền ở backend bằng permission key** (`m.edit`, `c.mod`, `s.role`…), không bao giờ so tên vai trò.
7. **PostgreSQL:**
   - Composite index "bằng trước, khoảng/sort sau" (vd `WHERE tenant=… AND status=… ORDER BY created_at`
     → `(tenant, status, created_at DESC)`), để DB Index Seek chứ không Index Filter.
   - Cột chỉ dùng ở SELECT đưa vào `INCLUDE` (covering, Index Only Scan).
   - Phân trang list lớn/cột rộng: deferred join (subquery `SELECT id … LIMIT/OFFSET` rồi JOIN lại theo PK);
     chat/thông báo/audit/giao dịch: keyset.
   - Partial index cho tập hay truy vấn; expression index khi lọc bằng hàm (`unaccent`, `lower`) và query dùng đúng biểu thức.
   - Không query trong vòng lặp, chỉ select cột cần, cấm `$queryRawUnsafe`; mọi list mới kèm `EXPLAIN (ANALYZE, BUFFERS)`
     trên ≥ 10k dòng, không chấp nhận Seq Scan trên bảng lớn.
8. **Đổi trạng thái** chỉ qua hàm transition của domain + `UPDATE … WHERE status = <from>`; 0 dòng → 409.
9. **Hiệu ứng phụ quan trọng** (phí, khoá TK, duyệt, đổi quyền, gửi mail) qua outbox trong cùng transaction;
   không gọi dịch vụ ngoài trong transaction.
10. **Tiền** là số nguyên VND; **thời gian** `timestamptz` UTC.
11. **Mọi thao tác Admin** (kể cả xuất dữ liệu cá nhân) ghi `audit_logs`; `audit_logs` chỉ INSERT.
12. **Dịch vụ ngoài** chỉ qua adapter `packages/integrations`; dev/test dùng fake provider.
13. **Không secret trong repo;** biến env mới phải có trong `.env.example` + zod env schema; không `console.*`, dùng logger (pino).
14. **Chat/realtime** tuân S-01 → S-12; không truy vấn DB cho từng người nhận; tin persona không lộ `isSimulated` ra Portal (D-48).
15. **Git:**
    - Commit ngay khi code xong và test pass, liệt kê đường dẫn cụ thể (`git commit -- <paths>`), cấm `git add -A`.
    - Conventional Commits, subject viết thường.
    - Trước khi báo DONE: `git status --short` không còn file nguồn M/?? (`.ts`, `.tsx`, `.sql`, `.prisma`, `.json`, `.toml`).
    - Mã trong mọi báo DONE là git commit SHA (`git rev-parse --short HEAD`), không bao giờ là hash file build/binary.
    - "HOLD" nghĩa là giữ dữ liệu Postgres/dịch vụ đang chạy để kiểm, không phải giữ code chưa commit.

## MỖI PHA

1. Sinh TIP của pha bằng `/vibecode:tip` (`tips/TIP-Bxx-*.md`, đủ Files touched + Parallel-safe + BUILDER-CHECKLIST trích CODING RULE liên quan).
2. Hiện thực đúng hợp đồng: input/output là zod trong `packages/shared/src/api-domains`; hành vi tham chiếu handler MSW
   cùng path. Chỉ thêm trường tương thích ngược, không đổi hợp đồng phá FE.
3. Test bắt buộc theo `standards/testing`: transition (hợp lệ + bị chặn), guard/permission/paywall, idempotency,
   đối soát nhiều biến thể; integration trên Postgres + Redis thật (DB `opchub_test`), không mock Prisma.
4. Cổng kiểm của pha = cột "Cổng kiểm" trong `02-TASK-GRAPH.md` + `pnpm lint`, `typecheck`, `test`, `depcheck`, `build` xanh
   + tự soát CODING RULE 1–15 (ghi kết quả từng mục vào completion report: file lớn nhất bao nhiêu dòng, EXPLAIN từng list,
   số dòng audit, git status).
5. Commit từng bước, push, git status sạch; viết `coding-packs/reports/B<n>-completion.md`
   (SHA + kết quả cổng kiểm + EXPLAIN + soát rule + chưa làm).

## QUY TẮC VẬN HÀNH

- Chỉ dùng DB `opchub_dev` / `opchub_test` trên Postgres 5432, Redis 6379 (db index 1 dev, 2 test), S3 storage local
  (RustFS, ADR-0007); không đụng DB khác. Secret local ở `D:\opchub-local\{db.env,s3.env}` (xem BUILDER-HANDOFF "Môi trường local").
- Dịch vụ ngoài dùng fake provider (SSO, SePay, MST, mail → fake ghi `mail_logs`) cho tới khi Chủ nhà cấp secret.
- Chỉ agent chính tạo migration Prisma. Được dùng subagent song song theo làn trong `02-TASK-GRAPH.md`
  (worktree riêng, mỗi làn sở hữu `modules/<domain>`, file dùng chung chỉ thêm dòng; brief cho subagent phải chép nguyên
  mục CODING RULE); agent chính gộp và chạy cổng kiểm.

## DỪNG KHI

- Có đủ `B1` → `B6-completion.md`, mỗi file có SHA đã push.
- `NEXT_PUBLIC_API_MOCKING=off`: 115 behavior e2e xanh và `PARITY_IDS='*'` không tụt so với G6
  (182 đạt / 13 deviation / 10 unreachable); contract test toàn bộ 193 endpoint xanh.
- k6 local đạt §14.2 ở mức máy dev cho phép (ghi rõ cấu hình máy và số đo thực).
- `infra/` (nginx, systemd, pgbouncer, backup) viết xong và kiểm cú pháp; B67 deploy staging để lại cho Chủ nhà.
- `pnpm install`, `lint`, `typecheck`, `test`, `depcheck`, `build`, e2e xanh; git status sạch; không file nào vượt trần dòng.
- Báo DONE kèm SHA cuối + bảng tổng hợp theo pha (TIP xong / test / EXPLAIN / soát rule / chưa làm).

**KHÔNG HỎI GIỮA CHỪNG.** Mâu thuẫn mới thì ghi `questions.md` (mục Backend, Q-Bxx-n), chọn phương án an toàn rồi làm tiếp.
Chỉ dừng hỏi khi gặp mức L3 của BUILDER-HANDOFF (đổi kiến trúc, đổi hợp đồng phá FE, cần secret thật, tiền/pháp lý).
