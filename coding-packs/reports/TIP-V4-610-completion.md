# TIP-V4-610 — Gói Gọi vốn (mua, đối soát, thẩm định, tab Gọi vốn) — completion

- Nhánh: `feature/TIP-V4-610-fundraising-plan`, xếp chồng trên `feature/TIP-V4-607-declaration` (PR #23 chưa merge)
- PR: [#24](https://github.com/duymt-dev/OPCHUB/pull/24) (base `feature/TIP-V4-607-declaration`)
- Commit:
  - `f2452f26` TIP
  - `3af6e812` db + shared + integrations + mock
  - `400480ad` server: project, membership-fee, affiliate, notification, mail, worker
  - `4bcbf08f` Portal + Admin + MSW
  - `fe5f1fe5` e2e behavior
  - `8fe59344` parity, sửa nền Bảng giá và chip
  - `26d08a1c` test đọc giá gói từ hằng số
- REQ / D: REQ-512 · REQ-502 · D-70 · D-82 · D-81 (ngân hàng giả) · D-31 · D-72 · §27.6.1 UP-11/UP-12 · §27.6.2 AD-06

## Đã làm

### DB

- Bảng `project_fundraisings`:
  - Trạng thái: `pending_payment → pending_review → active | rejected`, và `active → expired`.
  - Mã CK `GV` + 6 số lấy từ sequence.
  - CHECK: số tiền ≥ 0; mã `GV` khi không phải legacy; `active`/`expired` phải có `starts_at`/`ends_at`.
  - UQ một phần: chỉ một khoản đang mở mỗi dự án.
  - Index `(project_id, status)`, `(status, ends_at)`, `(owner_id, created_at DESC)`.
- Backfill: dự án đã khai báo gọi vốn trước V4 có một khoản `legacy` đang hiệu lực 6 tháng (Q-V4-610-2).
- `commissions`:
  - Thêm `fundraising_id` (UQ).
  - `fee_period_id` cho phép NULL.
  - UQ `referred_user_id` chỉ áp cho `source='membership'`.
  - CHECK nguồn ↔ khoá.
- Test migration: `migration-fundraising.int.spec.ts` 3/3.

### Shared, integrations

- Schema API `fundraising`; thêm `fundraising` vào thẻ dự án và dự án Admin.
- Outbox:
  - `fundraising.paid`, `fundraising.reviewed`, `fundraising.reminded`.
  - Queue `scheduler.fundraisingStatus`.
- `extractPaymentCode`: nhận mã TV (phí thành viên) hoặc GV (Gói Gọi vốn), đúng một mã.

### Server

- Domain `fundraising-status`: các transition, cửa sổ 6 tháng, cho gia hạn từ 14 ngày trước hạn.
- API:
  - `POST /projects/:id/fundraising` — idempotent theo dự án.
  - `GET /me/fundraisings`.
  - `POST /me/fundraisings/:id/transfer-confirm` — 202, có idempotency key.
  - `POST /admin/projects/:id/fundraising/:fid/review` — quyền `projects.action`, ghi audit.
- Đối soát ngân hàng: mã GV đi qua port `FUNDRAISING_PAYMENT_PORT`, membership-fee không import project.
  - Thiếu tiền hoặc sai trạng thái → vào hàng chờ khớp.
  - Đủ tiền → `pending_review` + outbox.
- Hoa hồng Affiliate khi Admin duyệt:
  - Tỷ lệ `fundraisingRate` (10%), chỉ khi có người giới thiệu và không tự giới thiệu.
  - Thông báo "Hoa hồng Gói Gọi vốn".
- Thông báo cho chủ dự án theo văn bản prototype: đã nhận, được duyệt, bị từ chối, nhắc gia hạn, hết hạn.
- Mail `fundraising`.
- Lịch worker `fundraising-status-daily` (08:10 giờ VN): hết hạn + nhắc, lô 200.
- Chỉ dự án có gói hiệu lực mới:
  - lộ `funding` (trừ với chủ dự án);
  - lọt bộ lọc "đang gọi vốn";
  - nhận quan tâm đầu tư.
- Dự án liên quan tối đa 6.
- Hợp đồng API: 209 endpoint (`api-contract.md`, `coverage.int.spec.ts`).

### Portal

- Popup "Thanh toán Gói Gọi vốn" (z 80/81) có 2 chế độ:
  - Sau khi gửi dự án bật gọi vốn mà chưa có khoản chờ duyệt hoặc đang hiệu lực.
  - Từ Bảng giá: chọn dự án, hoặc "+ Đăng dự án mới".
- Chi tiết dự án có 6 tab:
  - "Gọi vốn đầu tư" chỉ hiện khi gói hiệu lực.
  - "Dự án liên quan" dạng lưới.
  - Cột phải chỉ còn Chủ dự án + Thông tin; Bản test nằm trong Tổng quan.
- i18n 10 ngôn ngữ.
- Bảng giá dạng trang vẫn giữ phía sau popup.

### Admin

- Chip Gọi vốn (chờ thanh toán / chờ duyệt / đang gọi vốn / từ chối) ở lưới và bảng.
- Nút "Duyệt gọi vốn" / "Từ chối", toast đúng câu prototype.
- Nhãn mail log "Gói Gọi vốn".

### MSW

- State dùng chung Portal ↔ Admin qua cookie `opchub-mock-gv`.
- Webhook giả trễ 2,2 s; audit khi duyệt.

## Câu hỏi đã chọn phương án an toàn (`reports/ui-parity/questions.md`)

1. **Q-V4-610-1** — D-31: "Tôi đã chuyển khoản" chỉ ghi nhận; trạng thái đổi khi webhook về.
2. **Q-V4-610-2** — Khoản legacy cho dự án gọi vốn trước V4.
3. **Q-V4-610-3** — Gia hạn thu 15.000.000đ (D-82). Prototype ghi 7.500.000đ, chờ owner chốt.
4. **Q-V4-610-4** — Lịch sử thanh toán ở Hồ sơ (UP-14) chưa làm.
5. **Q-V4-610-5** — Khớp tay GV ở Admin › Phí chưa làm.
6. **Q-V4-610-6** — Prototype v4 lồng nhầm tab Gọi vốn / Liên quan vào trong tab Góp ý.

## Test (số thật)

| Cổng | Kết quả |
|---|---|
| lint | 0 lỗi (chỉ cảnh báo có từ trước ở file không đụng) |
| typecheck | sạch (portal, admin, server, e2e) |
| unit | portal 330 · admin 429 · shared 378 · server 225 · ui 48 · integrations 86 (+2 skip) |
| depcheck | sạch (794 module) |
| build (MSW) | 3/3 |
| test:int server — project, investor, membership-fee, affiliate, notification, contract, outbox-consumers, gates | 60 file / 183 test passed |
| db int | 11 file / 38 test passed (gồm migration-fundraising 3/3) |
| e2e behavior — fundraising, projects, admin-projects, membership, services, new-member-paywall, popup-v4, portal-shell, a-01-login, admin-investors, admin-marketing | 2 + 15 + 6 + 43 smoke, tất cả passed |

Test mới:

- Server:
  - `test/project/fundraising.int.spec.ts` (5)
  - `fundraising-scheduler.int.spec.ts` (1)
  - `test/contract/project-fundraising.int.spec.ts`
- Unit:
  - `packages/integrations` `extractPaymentCode`
  - `apps/portal/src/mocks/fundraising-handlers.spec.ts` (2)
- e2e: `e2e/behavior/fundraising.spec.ts` (2)
  - Bảng giá → mã GV → CK → webhook → Admin duyệt → tab Gọi vốn.
  - Gửi dự án → popup → Để sau.

Sửa test theo hành vi mới (không nới assertion):

- Test NĐT/gates kích hoạt gói trước khi gửi quan tâm.
- Tra hoa hồng theo `source='membership'`.
- `projects.spec` mở tab Gọi vốn; luồng sửa dự án bấm "Để sau".

EXPLAIN — truy vấn mới đều theo index:

- `current` / `activeEnd`: theo `(project_id, status)`.
- `due` / `toRemind`: theo `(status, ends_at)`, LIMIT 200.
- `mine`: theo `(owner_id, created_at DESC)`.
- Không có truy vấn trong vòng lặp; nhắc và hết hạn xử lý theo lô.

## Parity (prototype v4, không mask, không nới ngưỡng)

| Màn | 1440 | 390 | |
|---|---|---|---|
| P-103 Popup Gói Gọi vốn · chọn dự án | 0,44% | 0,37% | đạt |
| P-104 Popup sau khi gửi dự án | 0,63% | 15,94% | 390: DV-V4-610-4 (mã CK prototype dài, xuống 2 dòng) |
| D-92 Admin · chip Gọi vốn chờ duyệt | 1,23% | 0,96% | đạt |
| P-69 → P-72 | — | — | `unreachable` (DV-V4-610-1, lỗi lồng thẻ prototype) |
| P-62, P-68 | 28,67 / 32,90% | 35,50 / 34,56% | DV-V4-610-2 (khối nội dung giả + dải liên hệ có từ trước) |
| P-63 → P-67 | 3,30 – 4,56% | 7,04 – 20,68% | DV-V4-610-3 |

Đã seed lại demo trên `opchub_dev` sau khi đo (native HOLD giữ nguyên). Còn 4 khoản legacy active.

## Chưa làm / chuyển tiếp

- UP-14 lịch sử thanh toán, khớp tay GV, "Đã thẩm định" / Gọi vốn nổi bật / Demo Day: Q-V4-610-4/5, ngoài phạm vi.
- Giá gia hạn riêng chờ owner chốt (Q-V4-610-3).
- Cuối pha P2: chạy toàn bộ test:int + e2e behavior → `V4-P2-completion.md`.
