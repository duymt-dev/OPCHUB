# TIP-V42-701 — Sửa lỗi B1 → B6 (rà soát v4.2) — completion

- Nhánh `feature/TIP-V42-701-bugs-b1-b6`, tách từ `docs/goal-v4.2` (PR GOAL chưa merge → xếp chồng).
- PR: base `docs/goal-v4.2`. **Chưa tạo được** vì `gh` chưa đăng nhập và phiên không có `GH_TOKEN`. Nhánh đã push.
  Link: https://github.com/duymt-dev/OPCHUB/compare/docs/goal-v4.2...feature/TIP-V42-701-bugs-b1-b6
- REQ / D: REQ-615, D-117 (kèm D-77, D-98, D-105, D-106), V-15.

## Commit

| SHA | Nội dung |
|---|---|
| `c87df197` | TIP-V42-701 |
| `1abd22f1` | B1 đổi % đại lý chỉ tính lại `source='membership'`; B2 còn hạn → 409, đã từng duyệt → `renewAmount`; B3 nội dung TV + GV ưu tiên GV, TV phải là chủ khoản |
| `59dcf066` | B4 kiểm từ khoá đồng bộ trước INSERT: trúng → `hidden_at` khi lưu, phòng nhận dòng ẩn rỗng; tin bot trúng không phát |
| `5e50b026` | B5 chặn đuôi thực thi / đuôi lệch MIME / byte đầu lệch chữ ký → xoá object, 422 `FILE_REJECTED`; B6 `chat-file/`, `chat-image/` chỉ tải qua link ký 5 phút, `GET /messages/:id/attachment`, Portal xin link mới khi bấm Tải về |
| `891c9eb1` | Chat: danh sách tin bám đáy ngay sau khi gửi (P-34 @390 chập chờn 4,84% — sự kiện `scroll` đến trễ một nhịp) |
| commit báo cáo này | SHA ở `git log` |

## Acceptance

| AC | Test | Kết quả |
|---|---|---|
| B1 đổi % chỉ khoản phí TV | int `test/project/fundraising-v42-fixes` › B1 | pass |
| B2 còn hạn 5 ngày → 409; hết hạn → `renewAmount` | int `fundraising-v42-fixes` › B2 | pass |
| B3 `OPCHUB TV.. 0.. GV..` đúng chủ → `pending_review`; TV khác → unmatched | int `fundraising-v42-fixes` › B3 (2 test) + unit `bank-webhook/content.spec` | pass |
| B4 DB `hidden_at`, sự kiện không nguyên văn, job kiểm duyệt enqueue; bot trúng không phát | int `test/moderation/keyword-pre-publish` (3) + `test/bot/persona-publication` | pass |
| B5 `hoa-don.pdf.exe` / MZ khai PDF → 422, object xoá, không có tin | int `test/chat/chat-rest` › D-117 B5 + unit `upload-safety.spec`, `image-ref.service.spec` | pass |
| B6 người ngoài → 403; URL không chữ ký → 404; Tải về gọi `/attachment` 200 | int `chat-rest` + e2e `behavior/chat.spec` | pass |

## Test (số thật, máy dev)

- `pnpm lint`: 0 lỗi (chỉ cảnh báo `<img>` có từ trước). `pnpm typecheck`: 8 / 8 task. `pnpm depcheck`: 0 vi phạm.
- `pnpm test`: server 229, shared 403, portal 384, admin 460, integrations 89 (+2 skip), ui 49 — tất cả pass.
- `pnpm test:int`: db 51 / 51; server 149 file, 1416 / 1416.
- `pnpm build`: server, admin, portal (MSW) thành công.
- e2e MSW toàn bộ: **311 pass / 0 fail / 4 skip** (13,8 phút). `dev` có 269 `test()` hành vi (đã bỏ Trợ lý, D-92) → tổng 311,
  không tụt so với `dev`.
- Sau `891c9eb1`: portal unit 60 file / 384 test pass; e2e `behavior/chat` 13 / 13 pass.

## Parity (MSW, ngưỡng 3%, không mask, prototype v4.2)

| Màn | 1440 | 390 | Ghi chú |
|---|---|---|---|
| P-28 Chat phòng mặc định | đạt | đạt | |
| P-34 Chat · đã gửi tin | 0,78% | 2,54% | trước sửa: chập chờn 4,84% @390 (1/4 lần); sau sửa 12 / 12 lần đạt |
| P-36 Chat · chọn tin | đạt | đạt | |
| P-43 Chat · Đã ghim | đạt | — | |
| P-45 / P-121 Chat · báo cáo, tin ẩn | 1,22% | 2,95% | |
| P-29, P-30, P-35, P-37 → P-39, P-44 | đạt | đạt | lượt đo 13 màn chat: 24 / 24 ảnh đạt |
| **P-42 Chat · bảng File** | **timeout** | — | prototype v4.2 đổi nhãn tab "File" → "File chia sẻ" (`rtTabs`), kịch bản không tìm thấy tab. Đây là "tab File chia sẻ nhóm" của **V42-709** (REQ-606, D-111) — đổi nhãn, nguồn dữ liệu theo nhóm, keyset và kịch bản parity làm ở 709. Không do 701 gây ra |

## EXPLAIN

Không có list query mới. B2 `everApproved` = `findFirst` theo `project_id` (index `project_fundraisings(project_id, …)` có sẵn).

## Soát luật cứng

1. Kích thước file: mọi file sửa < trần (FE ≤ 400, BE ≤ 600). 2. Không `any` / `@ts-ignore`; `attachmentLinkSchema` zod ở shared.
3. depcheck sạch. 4. `assertRead` trước khi cấp link. 5. Ký URL thuần tính toán, không query trong vòng lặp. 6. S-08: kiểm từ khoá
in-memory (Aho-Corasick), không truy vấn DB. 7. Đổi trạng thái Gọi vốn qua transition có điều kiện. 8. Kiểm duyệt vẫn qua job sau
commit. 9. Tiền VND nguyên. 10. Không thao tác Admin mới. 11. Storage qua adapter (`readPrefix`, `verifyGet`). 12. Không env mới,
không secret. 13. Test ở file riêng. 14. Commit theo đường dẫn, `git status --short` sạch.

## Chưa làm / ghi chú

- PR chưa tạo (không có `gh` / token). Owner: `gh auth login` hoặc chạy script REST với `GH_TOKEN` của owner.
- Bucket S3 production: chính sách private + `presignGet` cần cấu hình trên VPS khi triển khai (ngoài repo).
- P-42: chuyển sang V42-709 như trên.
