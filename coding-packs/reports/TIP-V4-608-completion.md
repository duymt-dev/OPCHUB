# TIP-V4-608 — Gian hàng địa phương (tự tạo, Khám phá, Gian hàng của tôi, Admin ẩn/hiện) — completion

- Nhánh: `feature/TIP-V4-608-local-stores`, xếp chồng trên `feature/TIP-V4-610-fundraising-plan` (PR #24 chưa merge)
- PR: [#25](https://github.com/duymt-dev/OPCHUB/pull/25) (base `feature/TIP-V4-610-fundraising-plan`)
- Commit:
  - `a93e5e6a` TIP
  - `e69f2e06` db + shared + server (tự tạo khi đóng phí, Khám phá, Gian hàng của tôi, Admin)
  - `1425fdc0` seed demo
  - `b78b4a18` outbox `store.published`, Q-V4-608-1..7
  - `0b9dc993` MSW
  - `15a813ef` Admin › Gian hàng
  - `d415ab78` Portal
  - `8b2a5e78` e2e behavior
  - `861f1ad5` Khám phá: trang 24, thứ tự như prototype
  - `fc71382a` parity: Portal chi tiết / form / thẻ, Admin chip / bảng 390, DV
- REQ / D: REQ-510 · D-75 · D-84 · §25.1 / §25.2 · §27.6 UP-03 / UP-08 / UT-09 / AD-07

## Đã làm

### DB

- Bảng `stores`:
  - Mỗi chủ một gian hàng (`owner_id` UQ).
  - Trạng thái `draft | published | hidden`. Cột `hidden_prev` nhớ trạng thái trước khi ẩn.
  - Đếm sẵn `item_count`, `has_product`, `has_service` để lọc không cần join.
  - CHECK: `hidden_prev` chỉ có khi đang ẩn; `item_count` ≥ 0.
  - Index `(status, province, field, updated_at DESC)` và `(status, updated_at DESC, id)`.
- Bảng `store_items`:
  - Giá là số nguyên VND; NULL = "Liên hệ báo giá" (CHECK ≥ 0).
  - Index `(store_id, sort)`.
- Không tạo hàng loạt cho DN có sẵn (D-84).
- Test migration: `migration-stores.int.spec.ts` 3/3.

### Shared

- Schema API `stores` (Khám phá, chi tiết, upsert, Admin) và `canPublishStore`.
- `STORE_MESSAGES`: câu thông báo lỗi dùng chung cho server và MSW.
- Fixture `STORE_SEED`: 17 gian hàng mẫu của prototype; lĩnh vực chuẩn hoá về 14 danh mục v4.
- Upload thêm kind `store-cover`, `store-item`.
- Outbox `store.published`.

### Server (`modules/local-business`)

- Consumer `membership_fee.confirmed`: chỉ TK Doanh nghiệp, tạo bản nháp, idempotent.
- Chuyển trạng thái có điều kiện (`WHERE status IN from`):
  - publish / unpublish: chủ gian hàng;
  - hide / show: Admin, show trả về `hidden_prev`.
- API:
  - `GET /stores`:
    - lọc `q` / `kind` / `audience[]` / `field[]` / `province[]`, sort `newest | name | items`;
    - deferred join;
    - facet đếm bằng `groupBy`, cache Redis 60 s.
  - `GET /stores/:id`: chỉ gian hàng công khai, hoặc gian hàng của chính người xem.
  - `GET` / `PUT /me/store`, `POST /me/store/publish | unpublish`:
    - xuất bản cần tên, giới thiệu ≥ 40 ký tự và ≥ 1 sản phẩm / dịch vụ, không qua duyệt;
    - publish ghi outbox `store.published` trong cùng transaction.
  - `GET /admin/stores`, `GET /admin/stores/:id`: quyền `stores.view`.
  - `POST /admin/stores/hide | show`: quyền `stores.action`; mỗi gian hàng đổi ghi một dòng `audit_logs`.
- Khám phá chỉ hiện gian hàng của chủ còn hạn phí (`active` / `expiring`, `valid_until > now`).
- Ảnh kiểm ngoài transaction; ảnh cũ bị thay đưa vào GC media.
- Hợp đồng API: 219 endpoint (`api-contract.md`, `coverage.int.spec.ts`).

### Seed demo

- `st1` luôn có, chủ là M1.
- `seed:demo --stores` thêm 16 chủ DN mẫu (không đăng nhập được, phí còn hạn), đủ 17 gian hàng (Q-V4-608-7).

### Portal

- Menu "Gian hàng địa phương" là mục đầu nhóm KẾT NỐI KINH DOANH.
- Khám phá:
  - hero và ô tìm, 14 ô danh mục, bộ lọc trái có số đếm;
  - lưới / danh sách, sắp xếp;
  - trạng thái rỗng "Không tìm thấy giải pháp phù hợp.".
- Chi tiết:
  - Giới thiệu, Sản phẩm & Dịch vụ;
  - Thông tin liên hệ với Email (`mailto:`), Zalo (`zalo.me`), Gọi (`tel:`).
  - Bản nháp hoặc bị ẩn: chỉ chủ xem, kèm banner "Bản xem trước".
- Gian hàng của tôi:
  - form, sản phẩm / dịch vụ, ảnh bìa và ảnh sản phẩm tải lên thật;
  - Mức độ hoàn thiện 5 mục;
  - Xuất bản / Gỡ xuống;
  - banner tự tạo / bị Admin ẩn;
  - TK Cá nhân hoặc chưa đóng phí có khối thông báo riêng.
- i18n 10 ngôn ngữ.

### Admin

- Mục "Gian hàng" trong nhóm KẾT NỐI KINH DOANH (`stores.view`).
- 4 KPI, ô tìm, chip trạng thái có số đếm, bảng 10 dòng / trang.
- Chọn nhiều để Ẩn / Hiển thị (cần `stores.action`); panel chi tiết.
- Toast "Đã ẩn / Đã hiển thị N gian hàng".

### MSW

- Mock dùng chung có hành vi như server.
- Trạng thái chung giữa Portal và Admin qua cookie `opchub-mock-st`.

## Câu hỏi đã chọn phương án an toàn (`reports/ui-parity/questions.md`)

1. **Q-V4-608-1** — TK Cá nhân / chưa đóng phí: khối thông báo, server 403.
2. **Q-V4-608-2** — Tự tạo ở trạng thái nháp, chủ bấm Xuất bản.
3. **Q-V4-608-3** — Hiện lại trả về trạng thái trước khi ẩn; lý do ẩn là tuỳ chọn.
4. **Q-V4-608-4** — Chủ hết hạn phí thì gian hàng rời Khám phá, dữ liệu giữ nguyên.
5. **Q-V4-608-5** — Chỉ có Email / Zalo / Gọi; không làm Quan tâm / Xem nhiều / Nổi bật.
6. **Q-V4-608-6** — Không làm dashboard số liệu giả, hồ sơ mở rộng, reels, mẫu `equip`.
7. **Q-V4-608-7** — Seed demo mặc định chỉ có `st1`; dùng `--stores` để có đủ 17 gian hàng.

## Test (số thật)

| Cổng | Kết quả |
|---|---|
| lint | 0 lỗi (chỉ còn cảnh báo `<img>` có từ trước ở file không đụng) |
| typecheck | sạch (shared, server, portal, admin, db, e2e) |
| unit | portal 347 · admin 434 · shared 378 · server 225 · ui 48 · integrations 86 (+2 skip) |
| depcheck | sạch |
| build (MSW) | 3/3 |
| test:int server — local-business, contract, outbox-consumers, gates | 28 file / 59 test passed |
| db int | 13 file / 43 test passed (gồm migration-stores 3/3, stores-demo 2/2) |
| e2e behavior — stores, portal-shell, admin-shell, admin-rbac, a-01-login, i18n, i18n-screens | 64/64 (lần đầu 62/64: admin-rbac đếm menu cũ → sửa kỳ vọng); chạy lại sau parity: stores + shell + rbac + login 30/30 |

Test mới:

- Server:
  - `test/local-business/stores.int.spec.ts` (4)
  - `test/contract/local-business.int.spec.ts` (10 endpoint)
- DB: `migration-stores.int.spec.ts` (3), `stores-demo.int.spec.ts` (2)
- MSW: `apps/portal/src/mocks/stores-handlers.spec.ts` (3), `apps/admin/src/mocks/admin-stores-handlers.spec.ts` (2)
- Unit helper: portal `features/stores/model.spec.ts`, admin `features/stores/model.spec.ts`
- e2e: `e2e/behavior/stores.spec.ts` (2)
  - Menu → Khám phá → tìm / lọc / đặt lại → chi tiết có link Email / Zalo / Gọi.
  - Chủ gỡ xuống → rời Khám phá → xuất bản lại; Admin ẩn → banner phía chủ → hiện lại.

Sửa test theo menu mới (không nới assertion):

- `portal-shell`, `admin-shell`: thêm mục "Gian hàng địa phương" / "Gian hàng".
- `admin-rbac`: menu Biên tập nội dung có thêm "Gian hàng" (vai trò này có `stores.*`); Super Admin có 11 mục.

Truy vấn:

- Khám phá chạy deferred join trên `(status, updated_at DESC, id)`. Lọc tỉnh / ngành dùng `(status, province, field, …)`.
- Facet: 6 truy vấn chạy song song, cache Redis 60 s, xoá cache khi xuất bản / gỡ / ẩn.
- Admin ẩn hàng loạt: 2 lệnh UPDATE có điều kiện, không truy vấn trong vòng lặp.

## Parity (prototype v4, không mask, không nới ngưỡng)

| Màn | 1440 | 390 | |
|---|---|---|---|
| P-105 Khám phá (mặc định) | 3,99% | 1,45% | 1440: DV-V4-608-1 (prototype không phân trang, thẻ có tim / lượt xem / badge; lệch vài px cộng dồn 6 hàng) |
| P-106 Lọc ô danh mục Thủy sản | 0,54% | 0,61% | đạt |
| P-107 Không có kết quả | 0,43% | 1,09% | đạt |
| P-108 Chi tiết gian hàng | 2,20% | 0,75% | đạt (đo đầu trang; phần dưới là V4-609 / Q-V4-608-6, DV-V4-608-2) |
| P-109 Gian hàng của tôi · form | 1,43% | 1,43% | đạt |
| P-110 Chưa đóng phí | — | — | `unreachable` (prototype luôn coi m1 đã đóng phí, như P-87) |
| D-93 Admin › Gian hàng | 3,47% | 3,10% | DV-V4-608-3 (thứ tự seed vs `updated_at desc` AD-07; 390 app giữ cột thao tác) |
| D-94 Panel chi tiết | 0,02% | 0,02% | đạt |

Đã seed lại demo trên `opchub_dev` sau khi đo (native HOLD giữ nguyên).

## Chưa làm / chuyển tiếp

- Khối "Đang cần" và badge "Đang tìm đối tác" (V4-609 Nhu cầu).
- Mục con "Nhu cầu địa phương" trong nhóm Admin "Gian hàng & Nhu cầu" (V4-609).
- Dashboard số liệu, hồ sơ mở rộng, reels, mẫu `equip`: chờ owner chốt (Q-V4-608-6).
- Onboarding dùng `store.published` (V4-611).
