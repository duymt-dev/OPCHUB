# TIP-V4-607 — Khai báo sau đăng nhập + câu xác nhận D-87 — completion

- Nhánh: `feature/TIP-V4-607-declaration` (xếp chồng trên `feature/TIP-V4-602-commission-actual-fee`, PR #22 chưa merge)
- PR: [#23](https://github.com/duymt-dev/OPCHUB/pull/23) (base `feature/TIP-V4-602-commission-actual-fee`)
- Commit:
  - `ab7e78c4` TIP
  - `e442cbb2` db + shared + mock
  - `b0744eeb` server (account)
  - `b4171c7e` Portal
  - `af5079fc` e2e + parity
- REQ / D: REQ-503 · REQ-504 · D-87 · NA-18 · D-40 · OQ-12

## Đã làm

- **DB**
  - Thêm `users.declared_at`, `users.opc_intent`, `business_profiles.province`. Backfill user cũ: `declared_at = created_at`, `opc_intent` lấy từ các nhóm đang tham gia.
  - Test migration `packages/db/test/migration-declaration.int.spec.ts`: 2/2.
  - Seed (required, demo, affiliate-scenario, load) đánh dấu user demo đã khai báo.
- **Shared**
  - `me.needsDeclaration` (boolean).
  - `api/declaration.ts`: schema khai báo cá nhân, DN, hợp nhất + `declarationDraftSchema`.
  - MSW: state `declared` nằm trong snapshot đăng ký; `domains/registration/declaration.ts` (draft, save, 403/400 giống server).
- **Server (account)**
  - `needsDeclaration = declaredAt IS NULL && accountType != investor`.
  - `GET /v1/me/declaration` + `PUT /v1/me/declaration` (`@SkipMembershipFee`). Cả hai chạy trong một transaction, gồm:
    - đánh dấu khai báo (cá nhân, hoặc upsert hồ sơ DN);
    - vào nhóm qua `groups.requestJoin` (NA-18).
  - Tra MST giống lúc đăng ký: lỗi tra cứu không chặn (D-40), chỉ tra lại khi MST hoặc tên công ty đổi.
  - NĐT và loại tài khoản không khớp → 403. Nhóm, vai trò, tỉnh không hợp lệ → 400.
  - Hợp đồng API 203 → 205 (`api-contract.md`, `coverage.int.spec.ts`).
- **Portal**
  - Feature `declaration/` gồm 2 popup theo prototype v4:
    - "Hoàn tất thông tin tham gia": chọn OPC, vai trò, gợi ý nhóm.
    - "Khai báo thông tin doanh nghiệp": MST + nút Tra cứu, tỉnh/thành.
  - Popup không đóng được, chỉ có Đăng xuất và "Lưu & tiếp tục".
  - `DeclarationGate` trong `portal-shell`: popup chặn Bảng giá/Paywall tới khi lưu xong; thư chào mừng vẫn nằm trên cùng (z 72/73 như prototype).
  - Câu xác nhận D-87 dùng chung cho Cá nhân và DN, đủ 10 ngôn ngữ (`auth.json` + `declaration.json` mới).
- **Câu hỏi đã chọn phương án an toàn**: Q-V4-607-1…5 trong `reports/ui-parity/questions.md`
  1. Giữ form đăng ký hiện có, popup điền sẵn từ dữ liệu đó.
  2. MST trùng xử lý theo OQ-12.
  3. Tra MST lỗi thì cho nhập tay.
  4. SSO mock: `needsDeclaration` false.
  5. Thứ tự hiện: thư chào mừng → khai báo → Bảng giá.

## Test (số thật)

| Cổng | Kết quả |
|---|---|
| lint | 0 lỗi (chỉ cảnh báo có từ trước) |
| typecheck | 8/8 |
| unit | portal 328 · admin 429 · shared 378 · server 225 · ui 48 · integrations 77 (+2 skip) |
| depcheck | sạch |
| build (MSW) | 3/3 |
| test:int server: account + contract + gates | 34 file / 141 test passed |
| test:int server: community + membership-fee + affiliate | 29 file / 97 test passed |
| db int | 10 file / 35 test passed (có migration-declaration 2/2) |
| e2e behavior (domain đăng ký/khai báo/portal-shell + smoke đăng nhập/menu) | 97 passed, 4 skipped |

Test mới:
- `apps/server/test/account/declaration.int.spec.ts` (6)
- `test/contract/account-me.int.spec.ts` (thêm ca V4-607)
- `me.mapper.spec.ts`
- `e2e/behavior/declaration.spec.ts` (4)

Sửa test theo D-87 (hành vi mới, không nới assertion):
- Bộ chọn câu xác nhận đổi thành `/^Tôi xác nhận là người đại diện hợp pháp/`.
- Luồng đăng ký mới thêm bước `completeDeclaration` sau khi đóng thư chào mừng.
- AT-NR01 (`popup-v4.spec.ts`) viết lại theo D-87.

EXPLAIN: không có truy vấn danh sách mới. Đọc/ghi theo PK `users.id`, `business_profiles.user_id`.

## Parity (prototype v4, không mask, không nới ngưỡng)

| Màn | 1440 | 390 | |
|---|---|---|---|
| P-100 Popup khai báo cá nhân | 0,11% | 0,15% | đạt |
| P-101 Popup khai báo cá nhân (đã chọn) | 0,09% | 0,16% | đạt |
| P-102 Popup khai báo DN | 0,26% | 0,81% | đạt |
| P-05 Thư chào mừng | 4,52% | 4,71% | DV-V4-607-2 (chỉ chụp hộp thoại) |
| A-13/14/15/19 màn đăng ký | — | — | DV-V4-607-1: prototype v4 dựng lại màn auth (chênh 70–91%), ngoài phạm vi; đo lại ở V4-615 |

Demo đã seed lại trên `opchub_dev` sau khi đo (native HOLD giữ nguyên).

## Chưa làm / chuyển tiếp

- Dựng lại màn đăng nhập/đăng ký theo prototype v4 → V4-615 (DV-V4-607-1).
- Chạy toàn bộ test:int + e2e behavior của pha P2 sau V4-610 → `V4-P2-completion.md`.
