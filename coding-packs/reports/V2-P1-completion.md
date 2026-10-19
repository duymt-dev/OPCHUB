# V2-P1 — Nợ nền W1 + lỗi audit (completion)

> GOAL V2-BUILD, Pha 1. Nhánh `feature/V2-P1-foundation-fixes`, merge vào `main`. 15 TIP (TIP-V2-101 → 115).

## TIP và commit báo cáo

| TIP | Nội dung | Nợ / lỗi đóng | Báo cáo |
|---|---|---|---|
| 101 | Outbox lease, handler ngoài tx, backoff, giữ sự kiện chưa có consumer | TD-019, TD-023, M1 | `cc33d9f` |
| 102 | Ảnh qua presign + storage, giới hạn body 413, backfill data URL | TD-014, BUG-002 | `b617134` |
| 103 | DOMPurify ở server, backfill HTML, SafeHtml ở FE | TD-017, BUG-003 | `44ab1ca` |
| 104 | Khoá / thu hồi phiên / đổi vai trò lan truyền, ngắt socket, chuyển nhóm | BUG-004, BUG-005 | `71d1109` |
| 105 | Đặt lại mật khẩu Portal/Admin, link chết, SSO redirect, hộp thư giả | BUG-001, 023, 034, TD-035 | `06af95e` |
| 106 | Lỗi tại ô form, hydration | BUG-019, 020, 021, 024, 040 | `2a33db8` |
| 107 | Luồng trao đổi NĐT một luồng, transition có điều kiện | TD-024, BUG-006, 007 | `4e00188` |
| 108 | Chặn theo `valid_until`, đối soát giao dịch chưa khớp | BUG-009, 025 | `554e272` |
| 109 | Audit xuất dữ liệu, liên hệ công khai dự án | BUG-011, 013, 016, 017 | `a6b7f90` |
| 110 | Kiểm phiếu YC theo đối tượng ở server | BUG-018, 022 | `10370d5` |
| 111 | Tệp đính kèm chat thật, ảnh bìa từ API, avatar nhóm | BUG-010, 014, 026 | `56e6c58` |
| 112 | Đổi email qua OTP, SSO cuối, Referer, throttle, giới hạn socket, IP webhook | BUG-030, 031, 032, TD-018 | `c2bf434` |
| 113 | Bản sửa dự án chờ duyệt, bỏ `done`, ConfirmDialog, sidebar | BUG-027, 033, 038, 039, 041, 043, 044 | `dec68f8` |
| 114 | Dừng chiến dịch, huỷ nhận thư, ưu tiên + hạn mức thư | BUG-036, 037, NA-05 | `c1d7953` |
| 115 | Chuẩn test D-63, gỡ nhánh `onServer`, lint bộ audit, `audit:regression` | TD-032, 033, 034 | `bdb30db` |

Migration (agent chính tạo, `--create-only`/viết tay, áp `opchub_dev` + `opchub_test`):
`20261018125042_outbox_lease`, `20261019010000_investor_single_thread`, `20261019030000_project_public_contact`,
`20261019050000_mail_priority_suppression`, `20261019060000_project_revisions_service_done`.

Sửa thêm của agent chính (ngoài TIP): `9bdce86` (int test ghim env, cookie cầu NĐT), `fbcccc1` (thiết bị tự đổi
mật khẩu không bị đăng xuất), `b37db1a` / `9d2ac82` (e2e chờ đúng thời điểm), `5217d76` / `4d78add` (seed demo
khớp migration + MSW), `dac4ebf` (bỏ qua `.next-server-*`), `49a530d` (`audit:regression` chạy đúng script).

## Cổng kiểm (19/10/2026, HEAD trước commit này)

| Lệnh | Kết quả |
|---|---|
| `pnpm lint` | 8/8 task, 0 lỗi (5 cảnh báo `<img>` có sẵn ở Admin) |
| `pnpm typecheck` | 8/8 |
| `pnpm depcheck` | no dependency violations (574 modules) |
| `pnpm test` | 6/6 task xanh |
| Int server (`opchub_test`) | 70 file, **345/345** |
| e2e MSW behavior | 152/153 ở lượt TIP-115; lỗi duy nhất `events.spec.ts:38` chập chờn (chạy lại đạt) |
| e2e server behavior (`opchub_dev`, Portal 3220 / Admin 3222) | **153/153** |
| Audit cơ học (`pnpm --filter @opchub/server run audit`) | C1 16/16 · C2 19/19 · C3 73/73 · C4 26/29 · C5 132/152 · C6 126/142 |
| Audit e2e trên server (`pnpm --filter @opchub/e2e run audit`) | 226 bước; **UAT 30/31 đạt** |

Audit e2e chạy sau `seed:demo` + `flush:dev-cache`, env `E2E_TARGET=server`, `AUDIT_DB_URL`, `AUDIT_PSQL`,
`AUDIT_OTP`, `UNSUBSCRIBE_SECRET` (giá trị lấy từ `.env` local, không ghi ra đây).

## Còn lại / chuyển pha sau

- **UAT-14 TRƯỢT** (persona tự phản hồi thành viên, BUG-008): thuộc TIP-V2-501/502 (Pha 5).
- **C4**: cạnh NĐT "Đang trao đổi → Đã kết nối" không dò được code (mỏ neo audit chưa theo `INVESTOR_TRANSITIONS`
  của TIP-107 — int `investor-thread` đã phủ cạnh này); cạnh "Đã gửi → Đang trao đổi" thiếu test hợp lệ
  riêng; hội thoại bot thuộc Pha 5.
- **C5**: so tên vai trò ở Admin, key `m.role`/`p.edit` không dùng → Pha 2 (TIP-V2-201 → 204, BUG-015, 035, 042).
- **C6**: biến dev/e2e (`RATE_LIMIT_DISABLED`, `FAKE_MAIL_DIR`, `STORAGE_PROVIDER`…) không có trong
  `infra/env/*.example` — cố ý (cấm ở production), mức S4.
- **Walk audit** (S3): `GET /v1/groups` 402 ở modal mail chào mừng P-05 (TK chưa đóng phí), Google Maps bị CSP
  chặn ở P-52/54/D-49, vài bước thao tác hết giờ ở drawer điều hướng / chat (P-14, P-29, P-48, D-06, D-14) —
  đưa vào Pha 3 (TIP-V2-302/303/305) và Pha 5 (parity baseline).
- BUG chưa đóng đều có TIP pha sau: BUG-008, 012 (501/502, 305), BUG-015, 035, 042 (202–204), BUG-028 (305).
- Parity: màn chênh > 3% do prototype SRS-3.6 đổi bố cục (D-32, D-42/44/45, P-23/24, P-52/54, A-12…19,
  D-46…49) và deviation có lý do DV-V2-109-1 (P-62…72), V2Q-106 (P-62/63) — chụp lại baseline ở TIP-V2-503.
- MSW khớp server cho TEST-GAPS §4 #7–11 (402 dashboard, 409 chủ nhóm tự rời, đếm phiên, `simulateTransfer`
  MSW) — chưa làm, ghi ở `TIP-V2-115-completion.md`.
- Lựa chọn tạm chờ PM: V2Q-66 → V2Q-111 (`reports/V2-questions.md`).
