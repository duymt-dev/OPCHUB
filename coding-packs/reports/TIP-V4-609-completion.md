# TIP-V4-609 — Nhu cầu địa phương (đăng, gợi ý, Nhu cầu của tôi, Admin ẩn/hiện) — completion

- Nhánh: `feature/TIP-V4-609-local-needs`, xếp chồng trên `feature/TIP-V4-608-local-stores` (PR #25 chưa merge)
- PR: [#26](https://github.com/duymt-dev/OPCHUB/pull/26) (base `feature/TIP-V4-608-local-stores`)
- Commit:
  - `fae034cb` TIP
  - `dd4dfbcd` db + shared + server (danh sách + gợi ý, chủ đăng / đóng / mở lại / xoá, Admin ẩn / hiện)
  - `d17b0733` MSW
  - `9d1e38da` Admin › Nhu cầu địa phương
  - `418f3395` Portal (danh sách, form đăng, Nhu cầu của tôi, khối "Đang cần" + badge ở gian hàng)
  - `3be951a6` e2e behavior
  - `4fc6b7df` parity: tiêu đề + ô ngày, phường/xã seed, lưới form / bảng Admin ≤ 1023px
- REQ / D: REQ-511 · D-75 · §25.3 · §27.6 UP-09 / AD-07

## Đã làm

### DB

- Bảng `needs`:
  - 9 loại nhu cầu.
  - Trạng thái `open | closed | hidden`, cột `hidden_prev` nhớ trạng thái trước khi ẩn.
  - Phạm vi, hình thức hợp tác, tiêu chuẩn, người liên hệ, kênh ưu tiên.
- Ngân sách là số nguyên VND (BigInt), CHECK ≥ 0 và `min < max`.
- CHECK: `hidden_prev` chỉ có khi đang ẩn; phải có SĐT hoặc email.
- Index:
  - `(status, updated_at DESC, id)`
  - `(status, province, field, updated_at DESC)`
  - `(owner_id, created_at DESC)`
  - `(store_id, status)`
- Test migration: `migration-needs.int.spec.ts` 3/3. `stores-demo.int.spec.ts` thêm ca kiểm: mặc định chỉ có `n11`, có `--stores` thì đủ 11.

### Shared

- Schema API `needs`:
  - danh sách + facet;
  - Nhu cầu của tôi;
  - tạo nhu cầu, `superRefine` báo lỗi theo copy prototype;
  - Admin.
- `storeCardSchema.seeking`, `storeDetailSchema.openNeeds`.
- Fixture `NEED_SEED`: 11 nhu cầu mẫu của prototype. Ngành chuẩn hoá về 14 danh mục v4; phường/xã lấy theo gian hàng.

### Server (`modules/local-business`)

- Chỉ chủ gian hàng (TK Doanh nghiệp đã đóng phí) đăng được. Nhu cầu hiện ngay, không qua duyệt (D-75).
- Chuyển trạng thái có điều kiện:
  - close / reopen: chủ nhu cầu;
  - hide / show: Admin, show trả về `hidden_prev`.
  - Nhu cầu đang bị ẩn thì chủ không xoá được (409).
- API:
  - `GET /needs`:
    - lọc `q` / `type` / `province` / `field`, phân trang `page`;
    - deferred join;
    - facet cache Redis 60 s.
  - Gợi ý gian hàng: một `GROUP BY (field, province)` trên `stores` cho cả trang, trừ gian hàng của chính nhu cầu.
  - `GET` / `POST /me/needs`, `PATCH` / `DELETE /me/needs/:id`.
  - `GET /admin/needs`: quyền `stores.view`.
  - `POST /admin/needs/hide | show`: quyền `stores.action`; mỗi nhu cầu đổi ghi một dòng `audit_logs` trong cùng transaction.
- Chi tiết gian hàng trả `openNeeds` (tối đa 6); thẻ Khám phá có cờ `seeking`.
- Hợp đồng API: 227 endpoint (`api-contract.md`, `coverage.int.spec.ts`).

### Seed demo

- `n11` của `st1` (M1) luôn có.
- `seed:demo --stores` cho đủ 11 nhu cầu.

### Portal

- Menu "Nhu cầu địa phương" là mục đầu nhóm KẾT NỐI KINH DOANH, icon `needs` mới ở `packages/ui`.
- Tất cả nhu cầu:
  - chip loại có số đếm, ô tìm, lọc tỉnh / ngành;
  - lưới / danh sách;
  - gợi ý gian hàng;
  - nút Zalo / Gọi / Email.
- Form đăng 5 mục:
  - kiểm theo đúng thứ tự và copy của prototype;
  - đăng xong chuyển sang Nhu cầu của tôi.
- Nhu cầu của tôi:
  - Đóng / Mở lại / Xoá;
  - nhu cầu bị Admin ẩn hiện "Liên hệ Admin để mở lại";
  - TK Cá nhân / chưa đóng phí có khối thông báo riêng.
- Gian hàng:
  - chi tiết có khối "Đang cần";
  - thẻ Khám phá có badge "Đang tìm đối tác".
- i18n 10 ngôn ngữ.

### Admin

- Mục "Nhu cầu địa phương" nằm trước "Gian hàng" (`stores.view`).
- 4 KPI, ô tìm, chip trạng thái, bảng 10 dòng / trang.
- Chọn nhiều để Ẩn / Hiển thị (cần `stores.action`).

### MSW

- Mock dùng chung, hành vi như server.
- Kho Nhu cầu tách theo cổng (Q-V4-609-5).

## Câu hỏi đã chọn phương án an toàn (`reports/ui-parity/questions.md`)

1. **Q-V4-609-1** — Hiện lại về trạng thái trước khi ẩn (không tự mở lại nhu cầu chủ đã đóng).
2. **Q-V4-609-2** — Nhu cầu đang bị ẩn: chủ không xoá được.
3. **Q-V4-609-3** — Gợi ý chỉ là số đếm + link sang Khám phá, không gửi thông báo.
4. **Q-V4-609-4** — Ngành "Khác" tự nhập: không có gợi ý.
5. **Q-V4-609-5** — MSW Portal / Admin không chung kho nhu cầu.
6. **Q-V4-609-6** — Thẻ Dashboard / bước onboarding / tin bảng tin chuyển sang V4-611.
7. **Q-V4-609-7** — Tỉnh/thành chọn từ danh sách 34 tỉnh (prototype gõ tự do).
8. **Q-V4-609-8** — Nút liên hệ lấy SĐT / email khai trên nhu cầu.
9. **Q-V4-609-9** — Câu cho TK Cá nhân bấm "Đăng nhu cầu".

## Test (số thật)

| Cổng | Kết quả |
|---|---|
| lint | 0 lỗi (chỉ còn cảnh báo `<img>` có từ trước, ở file không đụng) |
| typecheck | sạch (8/8 task) |
| unit | portal 364 · admin 437 · shared 378 · server 225 · ui 48 · integrations 86 (+2 skip) |
| depcheck | sạch (823 module) |
| build (MSW) | 3/3 |
| test:int server — local-business, contract, outbox-consumers, gates | 29 file / 64 test passed |
| db int | 14 file / 46 test passed (gồm migration-needs 3/3) |
| e2e behavior — needs, stores, portal-shell, admin-shell, admin-rbac, a-01-login | 33/33 (trước và sau parity) |

Test mới:

- Server: `test/local-business/needs.int.spec.ts` (4); contract `local-business` thêm 8 endpoint.
- DB: `migration-needs.int.spec.ts` (3).
- MSW: `apps/portal/src/mocks/needs-handlers.spec.ts` (3).
- Unit helper: portal `features/needs/model.spec.ts` (5), admin `features/needs/model.spec.ts`.
- e2e `e2e/behavior/needs.spec.ts` (3):
  - Menu → lọc chip → M1 đăng (gặp lỗi mô tả quá ngắn rồi sửa) → hiện ngay → đóng / mở lại → xoá.
  - Thẻ "Đang tìm đối tác" → khối "Đang cần" → link về trang Nhu cầu.
  - Admin ẩn → "Admin đã ẩn" (trên server: chủ không xoá được) → chip Đã ẩn → hiện lại hàng loạt.

Sửa test theo menu mới (không nới assertion):

- `portal-shell`, `admin-shell`: thêm mục "Nhu cầu địa phương".
- `admin-rbac`: Super Admin có 12 mục.

## EXPLAIN (ANALYZE, BUFFERS)

Chạy trên `opchub_test` với 20.000 nhu cầu / 2.000 gian hàng, trong transaction ROLLBACK.

| Truy vấn | Kế hoạch | Thời gian |
|---|---|---|
| Danh sách `open` mới nhất (LIMIT 24) | Index Scan `needs_status_updated_at_id_idx` → nested loop `stores_pkey`, `membership_fees_pkey` | 0,59 ms |
| Lọc tỉnh + ngành | Index Scan `needs_status_province_field_updated_at_idx` (cả 3 cột trong Index Cond) | 0,94 ms |
| Admin chip "Đã ẩn" (LIMIT 10) | Index Only Scan `needs_status_updated_at_id_idx` | 0,03 ms |

Không có Seq Scan trên `needs`. Bảng `users` bị quét tuần tự bên trong nested loop vì điều kiện `deleted_at IS NULL`; bảng này nhỏ và phép join có từ V4-608.

## Parity (prototype v4, không mask, không nới ngưỡng)

| Màn | 1440 | 390 | |
|---|---|---|---|
| P-111 Nhu cầu · tất cả | 0,11% | 0,09% | đạt |
| P-112 Lọc chip "Cần mua" | 0,18% | 0,19% | đạt |
| P-113 Không có kết quả | 0,30% | 2,45% | đạt |
| P-114 Form đăng nhu cầu | 0,02% | 0,01% | đạt |
| P-115 Nhu cầu của tôi | 0,25% | 0,51% | đạt |
| P-116 Chưa đóng phí | — | — | `unreachable` (prototype luôn coi m1 đã đóng phí, như P-110) |
| P-108 Chi tiết gian hàng (đo lại) | 1,95% | 0,75% | đạt |
| D-95 Admin › Nhu cầu | 0,13% | 0,16% | đạt |

- D-93 giữ nguyên 3,16% / 3,10%, đã có DV-V4-608-3. Không thêm DV mới.
- P-113: kịch bản thêm `tick(400)` sau khi gõ, vì đồng hồ parity đứng yên nên bộ trễ tìm kiếm 300 ms không chạy. Không che chênh lệch nào.

Đã seed lại demo trên `opchub_dev` sau khi đo (native HOLD giữ nguyên).

## Luật cứng 1–14

| # | Luật | |
|---|---|---|
| 1 | Kích thước file | ✅ BE ≤ 600, FE ≤ 400 (CSS lớn nhất 330 dòng) |
| 2 | TS strict, không `any`, zod cho input | ✅ |
| 3 | Ranh giới import | ✅ depcheck sạch; gỡ vòng import `detail-items` ↔ `detail-screen` có từ trước |
| 4 | Quyền bằng permission key | ✅ `stores.view` / `stores.action`, `AllowAccountTypes` |
| 5 | DB: không query trong vòng lặp, index, deferred join | ✅ gợi ý chỉ một `GROUP BY`; EXPLAIN ở trên |
| 6 | Realtime | — không đụng |
| 7 | Đổi trạng thái có điều kiện | ✅ `WHERE status IN (from)` |
| 8 | Outbox | — không có hiệu ứng phụ quan trọng (đăng nhu cầu không thanh toán / duyệt) |
| 9 | Tiền VND số nguyên, giờ UTC | ✅ ngân sách BigInt; hạn 00:00 giờ VN lưu UTC |
| 10 | Audit thao tác Admin | ✅ `need.hide` / `need.show` |
| 11 | Dịch vụ ngoài qua adapter | — không có |
| 12 | Không secret, không `console.*` | ✅ |
| 13 | Test ở file riêng | ✅ |
| 14 | Commit theo đường dẫn, status sạch | ✅ |

## Chưa làm / chuyển tiếp

- Thẻ "Nhu cầu phù hợp" ở Dashboard, bước onboarding "Gửi nhu cầu", tin "Nhu cầu" ở bảng tin: V4-611 (Q-V4-609-6).
- Thông báo cho gian hàng được gợi ý: chờ owner (Q-V4-609-3).
