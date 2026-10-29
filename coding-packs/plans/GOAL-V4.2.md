# GOAL V4.2 — nâng cấp theo đặc tả + prototype v4.2, tuần tự V42-701 → V42-714

> Câu `/goal` chỉ là bản tóm tắt và trỏ về file này. **File này mới là bản có hiệu lực.**
> Mỗi lần tiếp tục, agent đọc lại cả file. Chỉ Chủ nhà được sửa file này, agent không sửa giữa chừng.

**Mục tiêu:** Hiện thực toàn bộ D16 (REQ-601 → 615, D-93 → D-117) theo thứ tự trong `BUILDER-HANDOFF.md` › "V4.2" và phần
**V4.2** của `02-TASK-GRAPH.md`. Làm **tuần tự từng TIP**, mỗi TIP một PR vào `dev`; cuối cùng đo parity lại trên prototype v4.2
và nghiệm thu §27 → §29 trên server dev.

## ĐỌC TRƯỚC

`~/.claude/CLAUDE.md`, `AGENTS.md` (14 luật cứng + Git flow 21/10/2026), `coding-packs/BUILDER-HANDOFF.md` (bảng "Quyết định v4.2"),
`coding-packs/00-PROJECT-CONTEXT.md` (Vision §5 vòng đời phí, S-03 / S-08 / S-11, V-11 → V-15), D-93 → D-117 + D16 trong
`coding-packs/01-REQUIREMENTS-MATRIX.md`, `coding-packs/audit/SPEC-V4.2-FULL-AUDIT.md` (file:dòng cần sửa), `coding-packs/audit/SPEC-V4.2-DELTA.md`,
`docs/adr/0008-llm-config-in-admin.md`, `coding-packs/standards/**` (đặc biệt `backend/auth-rbac.md`, `security/security.md`,
`integrations/adapters.md`, `frontend/ui-parity.md`, `database/query-indexing.md`, `testing/testing.md`, `global/domain-glossary.md`).
Prototype `docs/spec/index.html` v4.2 **thắng đặc tả** (D-93); nút prototype không bấm được vẫn làm đúng nghiệp vụ (D-95).
Đặc tả `docs/spec/dac-ta.html`: §29 > §28 > §27 > §1–26.

**Mỗi lần tiếp tục:** đọc `coding-packs/reports/V4.2-progress.md` (agent tự tạo và cập nhật sau mỗi TIP: # | TIP | nhánh | SHA | PR |
test | parity | ghi chú), rồi `git log` nhánh TIP gần nhất để biết đang ở bước nào.

## THỨ TỰ (một TIP một lúc, xong cổng mới sang TIP sau)

| # | TIP | Nội dung | REQ / D |
|---|---|---|---|
| 1 | V42-701 | Sửa lỗi B1 → B6: % đại lý không đè Gọi vốn, giá gia hạn, mẫu TV + GV, kiểm từ khoá trước khi phát, chặn file thực thi, GET file ký ngắn hạn | REQ-615, D-117 |
| 2 | V42-702 | Miễn phí 3 tháng: `trial`, `isFeeUsable` dùng chung mọi cổng, migration TK cũ, hết hạn → Bảng giá bắt buộc, huỷ khoản 600.000 cũ, nhắc T-7 / T-0 | REQ-601, D-94 1A/2A, D-113, D-116 |
| 3 | V42-703 | Cấu hình bảng giá: `price_configs` + lịch sử + audit + cache Redis, tab Admin, thay mọi hằng số giá server + FE | REQ-603, D-94 5A |
| 4 | V42-704 | Đối soát §28.1 (tiền tố OPCHUB, đúng bằng giá), nội dung CK Gọi vốn mới, khớp tay khoản Gọi vốn, email biên nhận | REQ-610, D-104, D-105, D-113 |
| 5 | V42-705 | VietQR EMVCo sinh ở server (phí + Gọi vốn), popup Gọi vốn 2 cột, 1 dự án / khoản | REQ-604, D-96, D-94 4B |
| 6 | V42-706 | Gọi vốn: gia hạn giá `fund.r` chỉ khi hết hạn; từ chối → bổ sung → duyệt lại | REQ-611, D-106, D-113 |
| 7 | V42-707 | Affiliate mọi TV từ khi đăng ký, mã luôn hoạt động, cột `plan`, khôi phục Đã hủy, làm tròn đến đồng, doanh thu tách gói | REQ-602, REQ-613, D-94 3A, D-110 |
| 8 | V42-708 | Admin › Phí (cột, 6 tab, lọc trial), Thành viên (bỏ Khởi đầu), tự nhắc khởi đầu lần mở Portal đầu ngày, thay đổi nhỏ FX-02 → 04 | REQ-608, REQ-609, D-100, D-101, D-107, D-115 |
| 9 | V42-709 | Chat: chủ đề đổi tên + xoá mềm ("Chung" khoá), tab File chia sẻ nhóm (keyset), đính kèm 20 MB | REQ-606, REQ-614, D-98, D-111 |
| 10 | V42-710 | Gian hàng: trình tạo / sửa 5 bước + media, Nháp, migration Nháp cho DN chưa có, chi tiết gian hàng không dữ liệu giả | REQ-605, D-97, D-114 |
| 11 | V42-711 | Dự án hiện ngay + Admin hậu kiểm, ẩn khi chủ hết hạn, đăng Dự án từ gian hàng (QT-ST-PJ) | REQ-612, D-108, D-109 |
| 12 | V42-712 | Cấu hình AI trong Admin: `llm_configs` mã hoá, Kiểm tra kết nối, adapter đọc lúc chạy, stub HTTP cho test | REQ-607, D-99, ADR-0008 |
| 13 | V42-713 | Bot: lịch chạy + Tạm dừng / Chạy lại, Trả lời từng tin (giây, trần 12 / phút / nhóm, 60 / phút hệ thống), AI tạo kịch bản hàng loạt, loại hội thoại | REQ-607, D-99, D-112 |
| 14 | V42-714 | Đo parity lại toàn bộ trên prototype v4.2 + nghiệm thu §27 → §29 (E2E-01 → 16) trên server dev | D-93, D-95 |

Mốc: sau #3, #7, #11, #14 viết `coding-packs/reports/V4.2-M<n>-completion.md` (số thật, SHA). #2 và #3 là nền, các TIP sau phụ thuộc.

## GIT — NHÁNH XẾP CHỒNG (stacked), KHÔNG TỰ MERGE

- `pwd` = `D:\CODING\OPCHUB\CODING`. Đầu goal: `git switch dev && git pull --ff-only`.
- TIP #1 tách từ `dev`. TIP #k (k ≥ 2): PR của TIP #k-1 **đã merge** vào `dev` → pull `dev` rồi tách từ `dev`; **chưa** → tách từ nhánh
  TIP #k-1. Nhánh: `feature/TIP-V42-7xx-<slug>`.
- PR mỗi TIP: `base: dev` nếu tách từ `dev`; `base: <nhánh TIP trước>` nếu xếp chồng (ghi "Stacked on #<PR trước>" đầu mô tả).
  Mở PR bằng `gh` nếu đã đăng nhập, không thì REST API với `GH_TOKEN` owner đưa trong phiên. **Không tự dò / trích token.**
  Không có cách mở PR → push nhánh, ghi link `compare` vào progress, làm TIP tiếp.
- **Cấm:** tự merge PR, bật auto-merge, merge local vào `dev` / `main`, push `main`, rebase / force-push nhánh đã có PR.
  Owner merge PR dưới → đổi base PR trên sang `dev` qua API (không force-push).
- Commit từng bước, đường dẫn cụ thể (`git commit -- <paths>`), cấm `git add -A`; Conventional Commits, subject viết thường, header ≤ 100.
- Migration: `--create-only` rồi sửa SQL; mỗi TIP thư mục migration riêng; `migrate deploy` trên `opchub_dev` + `opchub_test`.

## MỖI TIP

1. **TIP**: `coding-packs/tips/TIP-V42-7xx-*.md` chưa có → sinh bằng `/vibecode:tip` (Files touched, Parallel-safe, Acceptance
   Given/When/Then, BUILDER-CHECKLIST, danh sách màn parity, file:dòng từ FULL-AUDIT). Commit TIP trong chính nhánh TIP.
2. **EXECUTE** đúng phạm vi: zod trong `packages/shared`, server, MSW handler + seed theo prototype v4.2, Portal / Admin, test.
   Ngoài phạm vi → ghi `coding-packs/reports/ui-parity/questions.md` (mục V4.2) hoặc completion report, không sửa lan.
3. **TEST** (ghi số thật, chép output):
   - `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`.
   - Integration trên Postgres + Redis thật (`opchub_test`, Redis db 2), không mock Prisma. Bắt buộc theo TIP: transition hợp lệ + bị chặn,
     permission + `isFeeUsable` (trial / active / expiring / expired), idempotency webhook, migration dữ liệu (TK cũ → trial / expired,
     khoản 600.000 cũ, gian hàng Nháp, cột `plan`), đối soát đủ nhánh §28.1 (đúng / thiếu / thừa / sai nội dung / TV + GV).
   - `pnpm e2e` (MSW) không tụt số test so với `dev`; e2e server cho luồng TIP đụng tới.
   - **Parity**: mọi màn TIP đụng tới đạt **≤ 3% ở 1440 và 390** trên prototype v4.2, có test hành vi riêng trong `e2e/behavior/`.
     Màn lệch → dựng lại theo prototype (bố cục, chữ, dạng dữ liệu, API mới nếu cần), **không dừng ở DV**; DV chỉ cho số liệu thật ≠ mock.
   - List / query mới: `EXPLAIN (ANALYZE, BUFFERS)` trên ≥ 10k dòng, không Seq Scan bảng lớn.
4. **Commit + push + PR**, `git status --short` sạch; viết `coding-packs/reports/TIP-V42-7xx-completion.md`
   (SHA, PR, số test, % parity từng màn, EXPLAIN, soát luật cứng 1–14, chưa làm); cập nhật `V4.2-progress.md`.
5. Sang TIP kế tiếp ngay, không chờ owner merge.

## CẤM (vi phạm = không được báo DONE)

- Nới ngưỡng parity, mask / che vùng lệch, đổi FAIL → PASS, sửa ảnh baseline; retries / fixme / nới assertion / tăng timeout để che lỗi;
  dùng `onServer` để làm yếu assertion (D-63).
- Ẩn control đặc tả / prototype yêu cầu; dữ liệu giả trên màn chạy server thật.
- Hằng số giá trong code sau V42-703 (600.000, 1.200.000, 3.600.000, 15.000.000, 7.500.000…); giá chỉ đọc từ Cấu hình bảng giá
  (giá mặc định chỉ được ở migration / seed / test).
- Viết lại điều kiện phí `status IN (...)` ngoài `isFeeUsable` (V-11).
- Gọi ngân hàng thật (fake provider); gọi AI thật trong test tự động (stub HTTP cục bộ, D-103; chỉ `@live` khi có key);
  bot tự rơi về provider fake khi chưa cấu hình AI (ADR-0008).
- Chạy gì trên VPS; commit secret, cookie, token, key AI, trace có phiên đăng nhập; sửa `.env`.
- File vượt trần (BE 600, FE 400), `any`, `@ts-ignore`, query trong vòng lặp, check tên vai trò thay permission key.

## QUY TẮC VẬN HÀNH

- Chỉ dùng DB `opchub_dev` / `opchub_test` trên Postgres 5432, Redis 6379 (db 1 dev, db 2 test), storage local; không đụng DB khác.
- Không tắt tiến trình HOLD (API 4000, socket 4001, worker) hay tiến trình phiên này không tạo.
- Giữ native HOLD: sau khi đo, trả lại dữ liệu demo (`pnpm --filter @opchub/db seed`) để owner vào kiểm.
- Được dùng subagent cho việc đọc / tìm / đo; code của một TIP do một agent làm, không chạy hai TIP song song.

## DỪNG KHI

- Đủ 14 TIP có completion report + SHA + PR mở vào `dev` (hoặc đã merge, hoặc link compare nếu không mở được PR);
  đủ `V4.2-M1` → `V4.2-M4-completion.md`.
- V42-714: `reports/ui-parity/results.md` đo lại toàn bộ trên prototype v4.2, mọi màn ≤ 3% ở 1440 + 390 (DV chỉ cho số liệu thật);
  nghiệm thu §27 → §29 + E2E-01 → 16 100% trên server dev, báo cáo `reports/V4.2-acceptance.md`.
- Báo DONE kèm SHA cuối + bảng tổng hợp (TIP | PR | test | parity | chưa làm).

**KHÔNG HỎI GIỮA CHỪNG.** Mơ hồ mới → ghi `questions.md` (mục V4.2, Q-V42-7xx-n), chọn phương án an toàn theo D-xx gần nhất rồi làm tiếp.
Chỉ dừng (BLOCKED) ở mức L3 của BUILDER-HANDOFF: đổi kiến trúc, đổi hợp đồng phá FE ngoài D-93 → D-117, cần secret thật,
tiền / pháp lý / bảo mật chưa có D-xx.
