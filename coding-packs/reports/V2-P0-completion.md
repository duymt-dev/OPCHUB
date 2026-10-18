# V2-P0 — Cập nhật coding-packs theo SRS-3.6 (completion)

> GOAL V2-BUILD, Pha 0. Nhánh `feature/V2-P0-coding-packs`, merge vào `main`. Không có thay đổi code sản phẩm.

## Đã làm

| Hạng mục | File | Kết quả |
|---|---|---|
| REQ-ID mới | `01-REQUIREMENTS-MATRIX.md` D9 → D14 | 79 REQ: REQ-201…229 (NA-01…29), REQ-301…312 (AF + màn), REQ-321…329 (RB), REQ-341…345 (EV), 351…353 (SEC), 361…362 (GR), 371…373 (IV), 381…383 (NR), REQ-391 (popup V4), REQ-401…412 (LK) |
| REQ cũ bị thay | cùng file | REQ-011, 020, 029, 030, 068, 124, 140, 141, 142 gạch / trỏ REQ mới; D8 không còn "sau go-live" |
| Quyết định | Decisions Log | D-49 → D-63 (ưu tiên SRS-3.6, bot tự động, phạm vi go-live, phân quyền §21, Affiliate, không hoàn phí, khoá TK, Giảng viên, nhắc phí, giá V4, Meet, dịch vụ, chủ đề Admin, TK quản trị không SSO, chuẩn test) |
| Câu hỏi mở N-01 → N-12 | `audit/W1/OPEN-QUESTIONS.md` | Chuyển sang "Đã chốt"; đang mở về lại 104 |
| Số § SRS-3.6 | `AGENTS.md`, `00-PROJECT-CONTEXT.md`, `BUILDER-HANDOFF.md`, `standards/{backend/api-conventions,frontend/ui-parity,global/domain-glossary,security/security,testing/testing}.md` | Đổi theo bảng `audit/W1/SPEC-V3-DELTA.md` §2 |
| Task graph | `02-TASK-GRAPH.md` | Phần V2: 6 pha, cổng kiểm từng pha, dependency graph, bảng 33 TIP, song song, kiểm chồng file. B1 → B6 giữ làm lưu trữ |
| TIP | `tips/TIP-V2-101…115, 201…204, 301…307, 401…404, 501…503` | 33 TIP, mỗi TIP có Files touched kiểm theo code thật, Parallel-safe, acceptance Given/When/Then ghi mã NA/AT/UAT/BUG, test bắt buộc |
| TEST-GAPS | `audit/W1/TEST-GAPS.md` mục 6 | 117 dòng mới (79 REQ + 15 D + 23 AT), đều TRỐNG |
| Lựa chọn tạm | `reports/V2-questions.md` | V2Q-01 → V2Q-65 |

## Kiểm chồng file giữa TIP

Script đối chiếu `Files touched` của 33 TIP:
- Trong cùng pha: mọi cặp đụng chung file đều khai báo `sequential` (sửa thêm TIP-V2-115 cho `e2e/env.ts` với 105 và `c4-transitions.audit.ts` với 113).
- Khác pha: 119 file dùng chung (file đăng ký module, outbox events, queues, schedules, env schema, barrel, i18n, seed). Pha chạy tuần tự nên không xung đột; ghi luật rebase + chỉ thêm dòng vào `02-TASK-GRAPH.md`.

## Ghi chú cho pha sau

- Migration cần tạo (agent chính, `--create-only` + review SQL): 101 (`outbox.locked_until`), 102 (backfill ảnh), 107 (`investor_comments`), 109 (`projects.contact_*`), 113 (`project_revisions`, bỏ `done`), 114 (`mail_suppressions`, `cancelled`), 201/202 (`admin_*`), 301 (`fee_reminders`), 302 (`ConsentKind.fee_policy`), 303 (`events.meet_url…`), 304 (`group_role` lecturer), 306 (`storage_gc`), 401 (affiliate), 501 (`bot_threads` status).
- Biến env mới: `ADMIN_URL`, `FAKE_MAIL_DIR` (105), `SOCKET_CONNECT_PER_MIN` (112), `UNSUBSCRIBE_SECRET`, `MAIL_OTP_RESERVE` (114).
- Số lỗi lint `e2e/audit` đo lại là 16 (không phải 11).

## Kiểm

- Không đổi code → không chạy lint / test. `git status` sạch sau commit.
- Commit: xem `git log feature/V2-P0-coding-packs` (032be1a, 856c7f9, d27f3bd, 09427ed + commit báo cáo này).
