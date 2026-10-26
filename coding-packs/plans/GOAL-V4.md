# GOAL V4 — nâng cấp SRS-4.0, tuần tự V4-601 → V4-616

> Câu `/goal` chỉ là bản tóm tắt và trỏ về file này. **File này mới là bản có hiệu lực.**
> Mỗi lần tiếp tục, agent đọc lại cả file. Chỉ Chủ nhà được sửa file này, agent không sửa giữa chừng.

**Mục tiêu:** Hiện thực toàn bộ D15 (REQ-501 → 517, D-67 → D-88) theo `plans/V4-BLUEPRINT.md` và phần V4 của `02-TASK-GRAPH.md`.
Làm **tuần tự từng TIP**, mỗi TIP một PR vào `dev`; cuối cùng nghiệm thu §27 trên server dev, parity ≤ 3%.

## ĐỌC TRƯỚC

`~/.claude/CLAUDE.md`, `AGENTS.md` (14 luật cứng + **Git flow 21/10/2026**), `coding-packs/BUILDER-HANDOFF.md`,
`coding-packs/plans/V4-BLUEPRINT.md`, `coding-packs/02-TASK-GRAPH.md` (phần V4: pha, cổng kiểm, bảng parity),
D-67 → D-88 + D15 trong `coding-packs/01-REQUIREMENTS-MATRIX.md`, `coding-packs/audit/SPEC-V4-DELTA.md`,
`coding-packs/standards/**` (đặc biệt `frontend/ui-parity.md`, `database/query-indexing.md`, `testing/testing.md`).
Đặc tả `docs/spec/dac-ta.html` (§27 ưu tiên cao nhất, §26.6 kiểm duyệt), prototype `docs/spec/index.html` (chỉ tham chiếu, không copy code).

**Mỗi lần tiếp tục:** đọc `coding-packs/reports/V4-progress.md` (agent tự tạo và cập nhật sau mỗi TIP: TIP | nhánh | SHA | PR | test | parity),
rồi `git log` của nhánh TIP gần nhất để biết đang ở bước nào.

## THỨ TỰ (một TIP một lúc, xong cổng mới sang TIP sau)

| # | TIP | Pha |
|---|---|---|
| 1 | V4-601 phí 3 gói | P1 |
| 2 | V4-606 menu §27.3 + quyền + tắt Marketing | P1 |
| 3 | V4-603 vào nhóm ngay | P1 |
| 4 | V4-604 nhà đầu tư = danh sách + xuất | P1 |
| 5 | V4-605 yêu cầu dịch vụ = phiếu + danh mục | P1 |
| 6 | V4-602 hoa hồng theo phí thực trả | P2 |
| 7 | V4-607 câu xác nhận + khai báo sau đăng nhập | P2 |
| 8 | V4-610 Gói Gọi vốn | P2 |
| 9 | V4-608 Gian hàng | P3 |
| 10 | V4-609 Nhu cầu | P3 |
| 11 | V4-613 Trợ lý OPC Hub | P3 |
| 12 | V4-611 Onboarding 8 bước | P3 |
| 13 | V4-612 Kiểm duyệt §26.6 | P4 |
| 14 | V4-614 Báo cáo B1/B2/B3 | P4 |
| 15 | V4-615 Parity v4 đo lại + tổng hợp | P5 |
| 16 | V4-616 Nghiệm thu §27 | P5 |

Hết mỗi pha: viết `coding-packs/reports/V4-P<n>-completion.md` (cổng kiểm của pha trong `02-TASK-GRAPH.md`, số thật).

## GIT — NHÁNH XẾP CHỒNG (stacked), KHÔNG TỰ MERGE

- `pwd` = `D:\CODING\OPCHUB\CODING`. Đầu goal: `git switch dev && git pull --ff-only`.
- TIP #1 tách từ `dev`. TIP #k (k ≥ 2): nếu PR của TIP #k-1 **đã được owner merge** vào `dev` → `git pull` dev rồi tách từ `dev`;
  nếu **chưa** → tách từ nhánh TIP #k-1 (xếp chồng). Nhánh: `feature/TIP-V4-6xx-<slug>`.
- PR mỗi TIP: `base: dev` nếu tách từ `dev`; `base: <nhánh TIP trước>` nếu xếp chồng (ghi "Stacked on #<PR trước>" đầu mô tả).
  Mở PR qua REST API (`git credential fill` lấy token), body JSON viết ra file trong `%TEMP%`.
- **Cấm:** tự merge PR, bật auto-merge, merge local vào `dev`/`main`, push `main`, rebase/force-push nhánh đã có PR người khác đang review
  (trừ khi owner yêu cầu). Khi owner merge PR dưới, PR trên tự đổi base hoặc agent đổi base sang `dev` qua API (không force-push).
- Commit từng bước với đường dẫn cụ thể (`git commit -- <paths>`), cấm `git add -A`; Conventional Commits, subject viết thường.
- Migration: chỉ agent chính tạo, `--create-only` rồi sửa SQL; mỗi TIP thư mục migration riêng; chạy `migrate deploy` trên `opchub_dev` + `opchub_test`.

## MỖI TIP

1. **TIP**: nếu `coding-packs/tips/TIP-V4-6xx-*.md` chưa có → sinh bằng `/vibecode:tip` theo blueprint (đủ Files touched, Parallel-safe,
   Acceptance Given/When/Then, BUILDER-CHECKLIST, danh sách màn parity từ bảng "V4 — PARITY UI"). Commit TIP trong chính nhánh TIP.
2. **EXECUTE** đúng phạm vi TIP: zod trong `packages/shared`, server, MSW handler + seed theo prototype, Portal/Admin, test.
   Ngoài phạm vi → ghi `coding-packs/reports/ui-parity/questions.md` hoặc completion report, không sửa lan.
3. **TEST** (ghi số thật, chép output):
   - `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`.
   - Integration trên Postgres + Redis thật (`opchub_test`, Redis db 2), không mock Prisma. Bắt buộc: transition hợp lệ + bị chặn,
     permission/paywall, idempotency, migration dữ liệu (D-69, D-71, D-72), đối soát cả kỳ 600.000 cũ và kỳ gói mới.
   - `pnpm e2e` (MSW) toàn bộ behavior, không tụt số test so với `dev`; e2e server cho luồng TIP đụng tới.
   - **Parity**: mọi màn TIP đụng tới (bảng "V4 — PARITY UI") đạt **≤ 3% ở 1440 và 390**, có test hành vi riêng trong `e2e/behavior/`.
   - List mới: `EXPLAIN (ANALYZE, BUFFERS)` trên ≥ 10k dòng, không Seq Scan bảng lớn.
4. **Commit + push + PR**, `git status --short` sạch; viết `coding-packs/reports/TIP-V4-6xx-completion.md`
   (SHA, PR, số test, % parity từng màn, EXPLAIN, soát luật cứng 1–14, chưa làm); cập nhật `V4-progress.md`.
5. Sang TIP kế tiếp ngay, không chờ owner merge.

## CẤM (vi phạm = không được báo DONE)

- Nới ngưỡng parity, mask/che vùng lệch, đổi FAIL → PASS, sửa ảnh baseline; retries/fixme/nới assertion/tăng timeout để che lỗi.
- Ẩn control đặc tả yêu cầu; dữ liệu giả trên Dashboard chạy server thật.
- Dùng số tiền 600.000 làm hằng số mới (giá chỉ đọc từ `packages/shared/src/membership/plans.ts`).
- Gọi ngân hàng thật (D-81: fake provider); chạy gì trên VPS; commit secret, cookie, token, trace có phiên đăng nhập.
- File vượt trần (BE 600, FE 400), `any`, `@ts-ignore`, query trong vòng lặp, check tên vai trò thay permission key.

## QUY TẮC VẬN HÀNH

- Chỉ dùng DB `opchub_dev` / `opchub_test` trên Postgres 5432, Redis 6379 (db 1 dev, db 2 test), storage local; không đụng DB khác.
- Giữ native HOLD: sau khi đo, trả lại dữ liệu demo (`pnpm --filter @opchub/db seed`) để owner vào kiểm.
- Được dùng subagent cho việc đọc/tìm; code của một TIP do một agent làm, không chạy hai TIP song song trong goal này.

## DỪNG KHI

- Đủ 16 TIP có completion report + SHA + PR mở vào `dev` (hoặc đã merge); đủ `V4-P1` → `V4-P5-completion.md`.
- V4-615: `results.md` đo lại toàn bộ trên prototype v4, mọi màn đạt ≤ 3% hoặc có DV chờ owner duyệt; màn gỡ = `unreachable`.
- V4-616: test nghiệm thu §27 (UP-01→14, AD-01→12, F01→F09) 100% trên server dev, báo cáo `reports/V4-acceptance.md`.
- Báo DONE kèm SHA cuối + bảng tổng hợp (TIP | PR | test | parity | chưa làm).

**KHÔNG HỎI GIỮA CHỪNG.** Mơ hồ mới → ghi `questions.md` (mục V4, Q-V4-6xx-n), chọn phương án an toàn theo D-xx gần nhất rồi làm tiếp.
Chỉ dừng (BLOCKED) ở mức L3 của BUILDER-HANDOFF: đổi kiến trúc, đổi hợp đồng phá FE ngoài phạm vi D-67 → D-88, cần secret thật, tiền/pháp lý
chưa có D-xx. Parity một màn không xuống ≤ 3% sau khi đã sửa hết lệch thật → ghi DV đề xuất, làm TIP tiếp, liệt kê ở báo cáo cuối.
