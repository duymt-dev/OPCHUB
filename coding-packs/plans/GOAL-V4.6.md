# GOAL V4.6 — nâng cấp theo đặc tả + prototype v4.6, tuần tự V46-801 → V46-812

> Câu `/goal` chỉ là bản tóm tắt và trỏ về file này. **File này mới là bản có hiệu lực.**
> Mỗi lần tiếp tục, agent đọc lại cả file. Chỉ Chủ nhà được sửa file này, agent không sửa giữa chừng.

**Mục tiêu:** Hiện thực D17 (REQ-616 → 630, D-118 → D-127) theo thứ tự D-126. Làm **tuần tự từng TIP**, mỗi TIP một PR vào `dev`.
**TIP viết đến đâu làm đến đấy**: không viết trước TIP cho cả goal; tới bước nào mới sinh TIP bước đó, dựa trên code `dev` lúc ấy.
Cuối cùng đo parity lại trên prototype v4.6 và nghiệm thu §31 → §33 trên server dev.

## ĐỌC TRƯỚC

`~/.claude/CLAUDE.md`, `AGENTS.md` (14 luật cứng + Git flow 21/10/2026), D-118 → D-127 + D17 + OQ-22/23 trong
`coding-packs/01-REQUIREMENTS-MATRIX.md` (kèm bảng Applicable Standards), `coding-packs/audit/SPEC-V4.6-DELTA.md` (P1 → P17),
`coding-packs/00-PROJECT-CONTEXT.md` (Scan 30/10/2026: REUSABLE_COMPONENTS, GAPS; Vision §5, S-01 → S-12),
`coding-packs/BUILDER-HANDOFF.md`, `coding-packs/standards/**`.
Prototype `docs/spec/index.html` v4.6 **thắng đặc tả** (D-89, D-93); nút prototype không bấm được vẫn làm đúng nghiệp vụ (D-95).
Đặc tả `docs/spec/dac-ta.html`: §33 > §32 > §31 > §29 > §28 > §27 > §1–26 (§30 bị §31 thay).

**Mỗi lần tiếp tục:** đọc `coding-packs/reports/V4.6-progress.md` (agent tự tạo và cập nhật sau mỗi TIP: # | TIP | nhánh | SHA | PR |
test | parity | ghi chú), rồi `git log` nhánh TIP gần nhất để biết đang ở bước nào.

## THỨ TỰ (một TIP một lúc, xong cổng mới sang TIP sau)

| # | TIP | Nội dung | REQ / D |
|---|---|---|---|
| 1 | V46-801 | GĐ Vùng — dữ liệu + bổ nhiệm / thu hồi: 3 vùng cố định, mỗi vùng đúng 1, mỗi TV 1 vùng, mỗi tỉnh 1 vùng; tỉnh phụ trách, tài khoản nhận, lịch sử; trạng thái phí "Miễn phí · GĐ Vùng" (transition + `isFeeUsable` + paywall + nhắc phí bỏ qua); thu hồi giữ hạn phí cũ (BR-462); email EM-GDV1/2 không mật khẩu; permission key; audit; Admin › Affiliate › Cấu hình GĐ Vùng | REQ-616, D-120, D-121 |
| 2 | V46-802 | Sổ chia sẻ Media Soft ↔ GĐ Vùng: 3 thông số Chính sách, năm của khách (backfill từ giao dịch thực thu đầu), ghi khi phí / Gọi vốn được đối soát (qua outbox), gán theo tỉnh của affiliate, vùng trống → Media Soft, kỳ chi cuối tháng, Chi trả từng GĐ Vùng (idempotent), lịch sử chi trả; Admin › Affiliate › GĐ Vùng | REQ-617, D-119, D-121, D-122 |
| 3 | V46-803 | Admin › Affiliate: Chính sách theo §31, Hoa hồng chỉ tham khảo (bỏ chi trả trực tiếp, "Xem đối soát", "GĐ Vùng chi"), cột "Thuộc vùng (theo tỉnh)" chỉ hiển thị; seed / MSW sinh lại theo mô hình mới | REQ-619, D-119, D-121 |
| 4 | V46-804 | Portal › Affiliate › tab "Vùng của tôi" (chỉ xem) + banner GĐ Vùng; nhãn affiliate gọn (BR-495) | REQ-618, REQ-630 |
| 5 | V46-805 | Nhắc gia hạn: Admin › Cài đặt › Nhắc gia hạn (mốc 30 / 7 / 1, kênh Email + Thông báo, **không Zalo**), job hằng ngày dùng `FeeReminder`, gửi tay từng người / tất cả, cột Lần gửi; bỏ qua GĐ Vùng đương nhiệm | REQ-620, D-125 |
| 6 | V46-806 | Admin › Cài đặt › Đối soát ngân hàng: webhook URL, khóa bí mật + tạo lại, bật / tắt tự kích hoạt, giao dịch gần đây 4 trạng thái, Gán / Ghi nhận thiếu, cú pháp hiển thị `OPCHUB …` | REQ-621, D-123 |
| 7 | V46-807 | Nhóm 1 + minh bạch: BR-461 chat không treo, BR-463 không tạo hoa hồng 0đ (ẩn khoản 0đ cũ), BR-465 tự mở khóa lúc đăng nhập + job; nhật ký thao tác Admin đủ phủ + Xuất CSV 4 màn; chuyển đổi theo vùng ở Tổng quan; copy trang đăng nhập / chào | REQ-622 → 624, REQ-630, D-127 |
| 8 | V46-808 | Tìm kiếm chung topbar Portal / Admin (server, 4 kết quả / nhóm, index phù hợp) | REQ-625 |
| 9 | V46-809 | AI gợi ý nhu cầu phù hợp gian hàng trên Dashboard (chấm điểm BR-478 → 480, không gọi LLM) | REQ-626 |
| 10 | V46-810 | Trang công khai gian hàng `/g/<slug>` (SSR, chỉ trường công khai, bật / tắt Google = `noindex`, tiêu đề, mô tả ≤ 160, sao chép link, xem như khách) | REQ-627 |
| 11 | V46-811 | Nhà cung cấp AI nhiều bên: phân bổ theo chức năng + dự phòng, hạn mức / ngân sách / cảnh báo, nhật ký gọi AI 90 ngày, ẩn PII; **ẩn dòng Trợ lý**; màn Ứng dụng & thông báo chỉ lưu cấu hình (không Web Push) | REQ-628, REQ-629, D-124, D-125 |
| 12 | V46-812 | Đo parity lại toàn bộ màn đổi ở v4.6 (P1 → P17) + nghiệm thu AT-GDV01 → 07, TC-461 → 494 trên server dev | D-118 |

Mốc: sau #4, #7, #12 viết `coding-packs/reports/V4.6-M<n>-completion.md` (số thật, SHA). #1 → #2 là nền, #3 / #4 phụ thuộc #2.

## GIT — NHÁNH XẾP CHỒNG (stacked), KHÔNG TỰ MERGE

- `pwd` = `D:\CODING\OPCHUB\CODING`. Đầu goal: `git switch dev && git pull --ff-only` (PR #73 tài liệu phải đã merge).
- TIP #1 tách từ `dev`. TIP #k (k ≥ 2): PR của TIP #k-1 **đã merge** vào `dev` → pull `dev` rồi tách từ `dev`; **chưa** → tách từ nhánh
  TIP #k-1. Nhánh: `feature/TIP-V46-8xx-<slug>`.
- PR mỗi TIP: `base: dev` nếu tách từ `dev`; `base: <nhánh TIP trước>` nếu xếp chồng (ghi "Stacked on #<PR trước>" đầu mô tả).
  Mở PR bằng `gh` nếu đã đăng nhập, không thì REST API với `GH_TOKEN` owner đưa trong phiên. **Không tự dò / trích token.**
  Không có cách mở PR → push nhánh, ghi link `compare` vào progress, làm TIP tiếp.
- **Cấm:** tự merge PR, bật auto-merge, merge local vào `dev` / `main`, push `main`, rebase / force-push nhánh đã có PR.
  Owner merge PR dưới → đổi base PR trên sang `dev` qua API (không force-push).
- Commit từng bước, đường dẫn cụ thể (`git commit -- <paths>`), cấm `git add -A`; Conventional Commits, subject viết thường, header ≤ 100.
- Migration: `--create-only` rồi sửa SQL; mỗi TIP thư mục migration riêng; `migrate deploy` trên `opchub_dev` + `opchub_test`.

## MỖI TIP

1. **TIP (viết lúc tới bước)**: sinh `coding-packs/tips/TIP-V46-8xx-*.md` bằng `/vibecode:tip` **ngay trước khi code bước đó**, đọc code `dev`
   hiện tại (Files touched, Parallel-safe, Acceptance Given/When/Then, BUILDER-CHECKLIST, danh sách màn parity, mục P# trong
   SPEC-V4.6-DELTA). Commit TIP trong chính nhánh TIP. Không viết TIP cho bước sau.
2. **EXECUTE** đúng phạm vi: zod trong `packages/shared`, server, MSW handler + seed theo prototype v4.6, Portal / Admin, test.
   Thuật ngữ mới (GĐ Vùng, chia sẻ, năm của khách, kỳ chi) thêm vào `standards/global/domain-glossary.md` trong TIP đầu dùng tới.
   Ngoài phạm vi → ghi `coding-packs/reports/ui-parity/questions.md` (mục V4.6) hoặc completion report, không sửa lan.
3. **TEST** (ghi số thật, chép output):
   - `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`.
   - Integration trên Postgres + Redis thật (`opchub_test`, Redis db 2), không mock Prisma. Bắt buộc theo TIP: transition hợp lệ + bị chặn
     (bổ nhiệm / thu hồi, phí GĐ Vùng ↔ trial / active / expired / pending_payment), permission âm (Kế toán chỉ xem), mỗi vùng 1 / mỗi TV 1 /
     mỗi tỉnh 1, TK bị khóa, chia sẻ đúng tỷ lệ theo năm 1 / 2 / 3 / ≥ 4 + làm tròn đồng, trial / 0đ / huỷ không tạo khoản, vùng trống,
     chi trả idempotent, backfill năm của khách, nhắc mỗi mốc ≤ 1 lần, webhook khóa sai bị chặn.
   - `pnpm e2e` (MSW) không tụt số test so với `dev`; e2e server cho luồng TIP đụng tới.
   - **Parity**: mọi màn TIP đụng tới đạt **≤ 3% ở 1440 và 390** trên prototype v4.6, có test hành vi riêng trong `e2e/behavior/`.
   - List / query mới: `EXPLAIN (ANALYZE, BUFFERS)` trên ≥ 10k dòng, không Seq Scan bảng lớn.
4. **Commit + push + PR**, `git status --short` sạch; viết `coding-packs/reports/TIP-V46-8xx-completion.md`
   (SHA, PR, số test, % parity từng màn, EXPLAIN, soát luật cứng 1–14, chưa làm); cập nhật `V4.6-progress.md`.
5. Sang TIP kế tiếp ngay, không chờ owner merge.

## CẤM (vi phạm = không được báo DONE)

- Nới ngưỡng parity, mask / che vùng lệch, đổi FAIL → PASS, sửa ảnh baseline; retries / fixme / nới assertion / tăng timeout để che lỗi;
  dùng `onServer` để làm yếu assertion (D-63).
- Ẩn control đặc tả / prototype yêu cầu (trừ dòng Trợ lý D-124 và kênh Zalo D-125); dữ liệu giả trên màn chạy server thật.
- Chi trả trực tiếp cho affiliate; Admin đổi tay GĐ Vùng của affiliate; nội dung CK khác `OPCHUB …`.
- Hằng số giá / tỷ lệ chia sẻ trong code (chỉ đọc từ Cấu hình bảng giá / Chính sách; mặc định chỉ ở migration / seed / test).
- Viết lại điều kiện phí `status IN (...)` ngoài `isFeeUsable` (V-11).
- Gọi ngân hàng / AI / Zalo / Web Push thật trong test tự động (fake provider, stub HTTP cục bộ, D-103).
- Chạy gì trên VPS; commit secret, cookie, token, key AI, trace có phiên đăng nhập; sửa `.env`.
- File vượt trần (BE 600, FE 400), `any`, `@ts-ignore`, query trong vòng lặp, check tên vai trò thay permission key.

## QUY TẮC VẬN HÀNH

- Chỉ dùng DB `opchub_dev` / `opchub_test` trên Postgres 5432, Redis 6379 (db 1 dev, db 2 test), storage local; không đụng DB khác.
- Không tắt tiến trình HOLD (API 4000, socket 4001, worker) hay tiến trình phiên này không tạo.
- Giữ native HOLD: sau khi đo, trả lại dữ liệu demo (`pnpm --filter @opchub/db seed`) để owner vào kiểm.
- Được dùng subagent cho việc đọc / tìm / đo; code của một TIP do một agent làm, không chạy hai TIP song song.

## DỪNG KHI

- Đủ 12 TIP có completion report + SHA + PR mở vào `dev` (hoặc đã merge, hoặc link compare nếu không mở được PR);
  đủ `V4.6-M1` → `V4.6-M3-completion.md`.
- V46-812: `reports/ui-parity/results.md` đo lại các màn v4.6, mọi màn ≤ 3% ở 1440 + 390 (DV chỉ cho số liệu thật);
  AT-GDV01 → 07 + TC-461 → 494 100% trên server dev (trừ phần Zalo / Web Push theo D-125), báo cáo `reports/V4.6-acceptance.md`.
- Báo DONE kèm SHA cuối + bảng tổng hợp (TIP | PR | test | parity | chưa làm).

**KHÔNG HỎI GIỮA CHỪNG.** Mơ hồ mới → ghi `questions.md` (mục V4.6, Q-V46-8xx-n), chọn phương án an toàn theo D-xx gần nhất rồi làm tiếp.
Chỉ dừng (BLOCKED) ở mức L3 của BUILDER-HANDOFF: đổi kiến trúc, đổi hợp đồng phá FE ngoài D-118 → D-127, cần secret thật,
tiền / pháp lý / bảo mật chưa có D-xx.
