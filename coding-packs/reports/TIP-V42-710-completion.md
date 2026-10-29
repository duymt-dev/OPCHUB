# TIP-V42-710 — Gian hàng: trình tạo / sửa 5 bước + media, gian hàng tự tạo là Nháp, dashboard số thật, chi tiết không dữ liệu giả — completion

- Nhánh `feature/TIP-V42-710-store-builder`, xếp chồng trên `feature/TIP-V42-709-chat-topics-files` (PR 709 chưa merge).
- PR: base `feature/TIP-V42-709-chat-topics-files`. **Chưa tạo được** (gh chưa đăng nhập, không có `GH_TOKEN` trong phiên). Nhánh đã push.
  Link: https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V42-709-chat-topics-files...feature/TIP-V42-710-store-builder
- REQ / D: REQ-605, D-97, D-114 (S3, S4, S5, S6, S8), §27.9, §29.3, FULL-AUDIT :116 → :125, :139 → :144; CR-16.

## Commit

| SHA | Nội dung |
|---|---|
| `35174a83` | docs(tip): tip-v42-710 store builder, five steps, media, draft stores, real dashboard |
| `4e22f1b7` | DB: cột media/liên hệ mở rộng trên `stores`, bảng `store_daily_views (store_id, day, views)` PK ghép, migration tạo gian hàng Nháp `auto_created` cho TK DN trial/active/expiring chưa có gian hàng (idempotent) |
| `5ba98050` | Server: lưu media theo bước, kiểm điều kiện 5 bước dùng chung (`storeStepErrors`), `GET /me/store/dashboard` (số thật), worker tạo Nháp khi mở trial (outbox `membership_fee.trial_started`); Portal trình tạo 5 bước + dashboard + chi tiết media thật (bản đầu) |
| `05fa16f5` | **Sửa lỗi hồi quy**: test hợp đồng `local-business.int.spec.ts` gửi payload PUT `/me/store` thiếu các trường builder mới (`ward`, `logoUrl`, `logos`...) do schema TIP-710 thêm bắt buộc — sửa test spread `EMPTY_STORE_BUILDER` + điền `coverUrl`/`phone`/`address` hợp lệ để qua kiểm 5 bước khi Xuất bản; admin `upload-image.ts` đổi sang `ImageUploadKind` (sửa lỗi build TS2345 do `UploadKind` có thêm `store-video`/`store-doc`); nối `storeSeedMedia` vào seed demo `st1` |
| `e87fa2b5` | Portal: trình tạo 5 bước (`wizard/`) + dashboard số thật (`dashboard/`) thay hẳn màn sửa một trang cũ; gỡ `mine-info/-items/-side.tsx`, `image-pick.tsx`, `use-store-actions.ts`, `use-store-images.ts`; `mine-screen.tsx` viết lại (`Mode = dashboard \| wizard`); gỡ `unpublishMyStore` khỏi `api.ts` (không còn nơi gọi — D-114 S8 B) |
| `7b9b33e1` | Portal: chi tiết gian hàng thêm Tầm nhìn & Sứ mệnh / Đội ngũ / Chứng nhận / Hình ảnh & Video / Reels / Hồ sơ năng lực dữ liệu thật (`detail-profile.tsx`, `detail-media.tsx`); logo ảnh thật ở hero; liên hệ nhiều hotline/email/địa chỉ + mạng xã hội thật |
| `8e655fed` | i18n: 4 ngôn ngữ còn lại (en, fil, id, ms) cho `stores.wizard` / `stores.dash` / `stores.detail.profile` |
| `e1dddc5c` | e2e: `stores.spec.ts` (dashboard số thật → sửa gian hàng đang hiện đủ 5 bước → Admin ẩn/hiện), parity `portal-stores.ts` P-108/P-109 |
| commit báo cáo | SHA ở `git log` |

## Acceptance

| AC | Test | Kết quả |
|---|---|---|
| Migration tạo gian hàng Nháp cho TK DN trial/active/expiring chưa có gian hàng; TK đã có giữ nguyên; chạy lại không tạo thêm | db int `migration-store-builder` | pass |
| Đăng ký TK DN mới → outbox → worker tạo Nháp; TK Cá nhân không có | int `store-auto-create` | pass |
| Nháp thiếu ảnh bìa → Xuất bản 400 "Vui lòng chọn hoặc thêm ảnh bìa"; Lưu nháp vẫn được | int `store-builder`; unit `store-builder.spec` (`storeStepErrors`) | pass |
| Gian hàng đang hiện → "Lưu thay đổi" đủ bước vẫn `published`; thiếu hotline → 400 | int `store-builder`; contract `local-business.int.spec` (sửa ở `05fa16f5`) | pass |
| URL media không phải của chủ / chưa PUT / sai MIME/cỡ → 400; `.exe` đổi tên `.pdf` ở hồ sơ năng lực → `FILE_REJECTED` | int `store-builder`, `upload-safety.spec` | pass |
| 10k gian hàng × 30 ngày lượt xem → EXPLAIN dùng PK `(store_id, day)`, không Seq Scan | int `store-dashboard › EXPLAIN` | pass |
| Portal: đi 5 bước, thêm media + hotline, Xuất bản → toast đúng câu, chi tiết hiện đủ khối thật; thiếu bước 1 → toast lỗi bước 1 | e2e `stores.spec` | pass |
| Dashboard: sửa gian hàng đang hiện đủ 5 bước → "Lưu thay đổi" → vẫn "Đang hiển thị"; Admin ẩn → biến mất khỏi Khám phá, hiện lại | e2e `stores.spec` | pass |
| Parity Gian hàng của tôi (trình tạo, dashboard) + chi tiết ≤ 3% ở 1440 + 390 | parity P-105 → P-109 | pass (P-110 `unreachable`, C-01) |

## Test (số thật, máy dev)

- `pnpm lint` / `pnpm typecheck` / `pnpm depcheck`: xanh (0 lỗi; cảnh báo `no-img-element` có từ trước, không thuộc TIP này).
- Unit: shared, server 225, portal 389, admin 460, integrations, ui — tất cả pass (6/6 package task xanh).
- `test:int`: server **163 file, 1496 / 1496** (sau khi sửa test hợp đồng ở `05fa16f5` — trước khi sửa: 3 fail, 2 trong số đó là bot test cũ không liên quan, flaky dưới tải, rerun riêng pass; 1 là hồi quy thật của TIP này, đã sửa); db **18 file, 58 / 58**.
- `pnpm build`: server (tsdown), portal (MSW), admin (MSW) đều thành công.
- e2e MSW behavior toàn bộ (bản build cuối, cổng 3027/3029): **319 pass / 1 fail / 4 skip** (15,6 phút) — fail duy nhất `affiliate-agents-responsive.spec.ts` (hẹn giờ 5s chờ đổi URL, không liên quan gian hàng); rerun riêng: **2/2 pass** → xác nhận flaky dưới tải song song, không phải hồi quy. `stores.spec.ts` (3 test) pass trong cả lần chạy đầy đủ và lần chạy riêng.

## EXPLAIN (≥ 10k dòng)

`store-dashboard.service` — lượt xem 7 ngày + 7 ngày trước trên bản sao tạm theo schema đã triển khai (10.000 gian hàng × 30 ngày = 300.000 dòng `store_daily_views`): truy vấn `WHERE store_id = $1 AND day >= $2` dùng PK `(store_id, day)` → **Index Only Scan**, không `Seq Scan`; thời gian thực thi dưới 1 ms.

## Parity (MSW, ngưỡng 3%, prototype v4.2)

| Màn | 1440 | 390 |
|---|---|---|
| P-105 Khám phá (mặc định) | 0,10% | 0,14% |
| P-106 Khám phá · lọc Thủy sản | 0,00% | 0,00% |
| P-107 Khám phá · không có kết quả | 0,06% | 0,85% |
| P-108 Chi tiết gian hàng | 2,50% | 0,26% |
| P-109 Gian hàng của tôi · dashboard (lời chào, scoped) | 0,00% | 0,00% |
| P-110 chưa đóng phí | `unreachable` (C-01, như P-87) |

Tổng `ui-parity/results.md`: **437 / 440** ảnh đạt (không đổi so với 709 — 3 ngoại lệ còn lại vẫn là D-91).

## Soát luật cứng

1. File trong trần (FE ≤ 400 dòng / hàm ≤ 80: `store-wizard.tsx` 131, `step-profile.tsx` 163 lớn nhất; `StepCerts`/`StepItems` tách form+list để vào trần hàm; BE: service/controller TIP-710 trong `apps/server` ≤ 600, đã kiểm ở phiên trước khi commit).
2. Không `any`; mọi payload mới (`storeUpsertSchema` + `storeBuilderFields`, dashboard schema) parse zod trong `packages/shared`.
3. depcheck sạch (2033 + 904 module, 0 vi phạm biên).
4. Phân quyền theo permission key, không theo tên vai trò (giữ nguyên từ trước, không đổi ở TIP này).
5. Không query trong vòng lặp; lượt xem theo ngày dùng PK `(store_id, day)` seek thẳng (EXPLAIN trên).
6. Đổi trạng thái gian hàng (xuất bản/lưu khi đang hiện) có điều kiện qua hàm transition domain, không cập nhật vô điều kiện.
7. Hiệu ứng phụ quan trọng (mở trial → tạo gian hàng Nháp) qua outbox `membership_fee.trial_started` cùng transaction.
9. Tiền không chạm ở TIP này; thời gian `store_daily_views.day` lưu dạng ngày VN, hiển thị theo giờ Việt Nam.
12. Không biến env mới; không secret.
13. Test ở file riêng (`*.int.spec.ts`, `*.spec.ts`, `e2e/behavior`, `e2e/parity`).
14. Commit theo đường dẫn cụ thể (không `git add -A`); `git status --short` sạch trước khi báo DONE.

## Quyết định phát sinh trong phiên (Q-V42-710)

1. FULL-AUDIT S5 A (đếm media) được dùng làm trần số lượng vì D-114 chỉ chốt dung lượng, không chốt số lượng.
2. Tiêu đề trang theo prototype: Nháp "Tạo gian hàng địa phương" / nút cuối "Xuất bản gian hàng"; đang hiện "Chỉnh sửa gian hàng" / nút cuối "Lưu thay đổi".
3. Dashboard chỉ số thật (lượt xem, SP, nhu cầu mở); bỏ hẳn "Khách quan tâm" / "Lịch hẹn" / "Lượt liên hệ" / "Tỷ lệ chuyển đổi" / "Hoạt động gần đây" của prototype vì không có nguồn dữ liệu thật — đo parity P-109 chỉ scope phần chào đầu trang (`capture`), không so các khối đã bỏ.
4. Rà soát logic prototype (`wzOn`, `editMode`, `dashMode`): xác nhận màn sửa một trang cũ (`editMode`) là nhánh gần như không bao giờ chạm tới khi `isEd` đúng — app chỉ cần 2 chế độ `dashboard` | `wizard(create|edit)`, xác nhận đúng qua parity pass.
5. Hồ sơ gian hàng có 2 biến thể hero ở prototype (`isSvc` / `isEquip`); gian hàng sản phẩm/dịch vụ (trường hợp duy nhất có dữ liệu) không có khối "Thông tin liên hệ" riêng trong nhánh `isSvc` — mở rộng `DetailContact` (REQ-510) sẵn có để nhận thêm trường, không tạo khối mới.
6. `ImageUploadKind = Exclude<UploadKind, FileUploadKind>` tách riêng kind ảnh khỏi kind tệp (`store-video`, `store-doc`) — admin `upload-image.ts` dùng type này để tránh lỗi build khi `UploadKind` có thêm kind không phải ảnh.
7. **Không có nút "Gỡ xuống" (tự gỡ khỏi Khám phá) ở đâu trong UI mới** — rà soát danh sách nút chân trang TIP ghi rõ, không có mục này; khớp nghĩa đen "không gỡ khỏi Khám phá" của D-114 S8 B. `unpublishMyStore` gỡ khỏi `api.ts` portal vì không còn nơi gọi (endpoint server giữ nguyên, vẫn kiểm trực tiếp qua `fetch` thô trong test cũ).
8. Chi tiết gian hàng: prototype xếp các khối mới theo 2 cột; giữ 1 cột (dưới Giới thiệu/Sản phẩm) để không co hẹp khung Giới thiệu đã đo khớp trước đó — đo bằng e2e cho các khối mới, **chưa đo parity khung nhìn đầy đủ theo từng bước trình tạo** (lệch tích luỹ theo chiều cao khi thử 2 cột gây tụt parity P-108/P-109 ở lần đo đầu, đã phục hồi 1 cột). Việc đo parity riêng từng bước trình tạo để lại cho TIP sau nếu owner cần.

## Chưa làm / ghi chú

- PR chưa tạo (không có gh / token) — đã có compare link.
- Đo parity riêng từng bước trình tạo (B1 → B5) — để lại, Q-V42-710-8.
- Khối "Dự án OPC" trong gian hàng (TIP-V42-711) không thuộc phạm vi TIP này.
