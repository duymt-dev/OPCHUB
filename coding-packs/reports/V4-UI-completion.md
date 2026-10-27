# V4-UI — UI khớp prototype v4 (D-89) — nghiệm thu (TIP-V4-617 → 624)

- Chuỗi TIP (mỗi TIP một nhánh, xếp chồng, chưa merge):
  - 617 Auth;
  - 618 Shell / avatar / Chat / Hồ sơ;
  - 619 Cộng đồng 90 nhóm;
  - 620 Dự án OPC;
  - 621 Tổng quan "Luồng hệ thống";
  - 622 Cài đặt / Bot / Sự kiện / danh mục;
  - 623 Affiliate + các màn 3–5%;
  - 624 đo lại toàn bộ + nghiệm thu (nhánh `feature/TIP-V4-624-acceptance`).
- Completion từng TIP: `coding-packs/reports/TIP-V4-617-completion.md` … `TIP-V4-623-completion.md`.
- PR: **chưa tạo được**: `gh` chưa đăng nhập, agent không được dùng token của owner. Mọi nhánh đã push. Payload REST cho 617 → 623 nằm ở `.v4tmp/pr/` (ngoài repo). Owner chạy `GH_TOKEN=<token> bash /d/CODING/OPCHUB/.v4tmp/pr/create-prs.sh`.

## Chạy toàn bộ (số thật, 27/10/2026)

| Bộ | Kết quả |
|---|---|
| `pnpm turbo run lint typecheck test` (shared, admin, ui, server, db, portal) | 17 / 17 task |
| `pnpm depcheck` | 0 vi phạm (860 module, 3875 phụ thuộc) |
| `apps/server test:int` toàn bộ | **146 file / 1398 / 1398 test** |
| `packages/db test:int` | **16 file / 51 / 51 test** |
| e2e MSW toàn bộ (`--project=behavior`, build MSW tại HEAD 623, cổng 3020 / 3021) | **312 passed · 0 failed · 4 skipped** (14,2 phút). 4 skip là `tax-lookup-dlpl` (stub chỉ có ở server / `@live`). |
| e2e:server toàn bộ (`--project behavior`, API + socket bản build tại HEAD chạy riêng cổng 4100 / 4101 trên `opchub_dev`, không đụng API HOLD 4000 / 4001) | lần 1: 291 passed · 16 failed · 9 skipped (1,0 giờ); lần 2 (16 test lỗi): 46 passed · 4 failed; lần 3 sau khi sửa: **29 / 29** (`profile` + `projects`) và **2 / 2** (`chat`) |
| Parity toàn bộ (`--project=parity`, MSW) | **419 / 444 ảnh đạt**, 25 ảnh > 3% (bảng dưới). Lượt toàn bộ tại `9d7587d3`: 416 pass / 28 fail / 76 skip (10,9 phút). 2 ảnh fail đo lại riêng đều đạt: A-01 @390 (lượt chạy toàn bộ dùng Portal do Playwright tự bật, trang đăng nhập lần đầu chưa có ảnh nền và nút Google; chạy với Portal / Admin bật sẵn thì 3 lượt liền A-01 → A-03 đạt 0,16 – 0,40%), D-74 @390 1,67%. Lượt ở HEAD 623: 413 pass / 31 fail. |

### e2e:server — 16 lỗi lần 1, phân loại

- **12 lỗi do môi trường của lượt đo, không phải code**:
  - API riêng 4100 nạp `PORTAL_URL` / `ADMIN_URL` = 3220 / 3222 từ `.env`, trong khi Playwright server chạy 3200 / 3201. Link đặt lại mật khẩu và link ảnh / tệp tải lên trỏ sang cổng không có ai nghe (`ERR_CONNECTION_REFUSED`).
  - Thiếu stub DLPL (`TAX_LOOKUP_PROVIDER=dlpl`).
  - Cách sửa: chạy lại API / socket với cổng đúng, chỉ bằng biến môi trường của tiến trình, không sửa `.env`. Toàn bộ pass lại, không đổi test.
- **2 lỗi code thật, đã sửa ở `11e34cc4`**:
  - Hồ sơ → Bảo mật: sau khi đổi mật khẩu, bấm "Đăng xuất" thiết bị khác trả 401. Đổi mật khẩu tăng perm version nên access token cũ hết hiệu lực, và client không refresh với `/auth/*`. Sửa: lấy phiên mới ngay sau khi đổi mật khẩu.
  - Test "Nổi bật" của Dự án gắn cứng "OPC Hub Mobile". Trên server, "Mới nhất" xếp theo `published_at`, khác MSW xếp theo thứ tự mảng. Test đổi sang kiểm luật prototype: 2 thẻ đầu "Nổi bật", thẻ thứ 3 không có. Không nới assertion.
- **2 lỗi của lượt 1 do bộ lọc file sai** (`--project behavior <files>` nuốt tên file): chạy lại đúng cú pháp thì pass.
- 9 skip: như V4-P5. Gồm `@live` DLPL thật, và các test thay bằng int có bằng chứng trong `V4-acceptance.md`.

## Màn còn > 3% (25 ảnh) — mọi dòng có lý do trong `ui-parity/deviations.md`

| Màn | 1440 / 390 | Lý do (D-xx / Q) |
|---|---|---|
| D-07 @390, D-10 @390, D-11, D-12 @1440, D-13 @390, D-14 @390, D-82 @390, D-89 @1440, D-96, D-97 (Thành viên) | 3,07 – 5,33% | Chỉ lệch thứ tự dòng. Server sắp `created_at DESC` (Q-B62-18 đã chốt). Thứ tự prototype không suy ra được từ trường nào: TK mới lên đầu, nhưng 8 TK mẫu theo mã TV tăng dần với ngày đăng ký lộn xộn. Khớp = sửa ngày / mã demo (làm giả). Q-V4-623-1 chờ owner. |
| D-84-AFF | 24,12 / 29,36% | 62 đại lý tự tạo thật (AF-R01) so với 6 dòng prototype. Không làm giả. |
| D-84-POL @390 | 13,48% | Ô "Điều khoản chương trình" bắt buộc theo SRS §20.6 / §20.7. |
| D-32 | 54,46 / 85,56% | DV-G4c-1: trình xem chat chỉ đọc. |
| D-41 @390 | 5,58% | D-50 (bot không hàng chờ duyệt) / REQ-141 (tắt khẩn cấp). |
| D-70 | 16,33 / 15,56% | D-47: không gửi mật khẩu tạm qua email. |
| P-05 | 4,52 / 4,71% | D-30 / D-47: mail không có mật khẩu tạm. |
| P-104 @390 | 15,94% | D-31 / BR-04: mã CK 6 số dùng để đối soát tiền. |
| P-40 @390 | 4,31% | D-71 (bỏ duyệt tham gia), D-56 ("Giảng viên"). |

**Điều kiện dừng của goal chưa đạt đủ**: còn 25 ảnh > 3%. Không ảnh nào thuộc loại "unreachable", nên không được đổi trạng thái. Cách giải từng ảnh:

- **Owner đổi D-xx / Q về nghiệp vụ tiền, bảo mật hoặc dữ liệu thật**: D-47, D-50, D-31, AF-R01, SRS §20.6, Q-B62-18. Agent không tự đổi.

## Sửa thêm ở TIP-V4-624 (sau lượt đo đầu)

| Commit | Nội dung | Số mới (1440 / 390) |
|---|---|---|
| `0940865b` | P-105 Khám phá Gian hàng: lượt xem (`stores.view_count`, chủ tự xem không tính, sort "Xem nhiều"), tim theo từng người (`store_favorites`, `PUT /stores/:id/favorite`), "Nổi bật" do Admin gắn (`PUT /admin/stores/:id/featured`, quyền `stores.action`, audit), tag loại hình. Migration `20261027170000_v4_store_views_featured_fav` (đã áp `opchub_test` + `opchub_dev`, seed:demo chạy lại). Int `store-engagement` 3 / 3, e2e `stores` + `needs`. | 0,10 / 0,14 (trước 3,64 / 0,82) |
| `9d7587d3` | D-85-CUS @390: tiêu đề lưới khách hàng 38px như prototype, ẩn hàng đo 1px của bảng, gạch chân tab đè viền. e2e Affiliate 14 / 14 (kiểm thêm chiều cao tiêu đề + vị trí dòng đầu). | 1,52 / 1,32 (trước 1,71 / 5,50) |

## Dữ liệu demo

- Đã áp 7 migration V4 vào `opchub_dev` (`prisma migrate deploy`, chỉ thêm cột / bảng / index):
  - `20261027090000_v4_industry_groups`
  - `20261027120000_v4_project_explore`
  - `20261027130000_v4_project_milestones`
  - `20261027140000_v4_overview_paid`
  - `20261027150000_v4_admin_avatar`
  - `20261027160000_v4_admin_stores_created`
  - `20261027170000_v4_store_views_featured_fav`
- `seed:demo` chạy lại (globalSetup của e2e:server) trên `opchub_dev`. Cache Redis dev (db 1) được xoá.
- API / socket / worker HOLD (4000 / 4001) **không bị tắt**. Chúng vẫn chạy bản build 26/10, chưa có code V4-617 → 624. Owner khởi động lại theo `e2e/server/README.md` khi muốn dùng code mới. Bản build mới nằm ở `apps/server/dist/v4/` (gitignored).

## Chưa làm

- Tạo PR 617 → 624: chờ token của owner.
- Chờ owner chốt: Q-V4-622-1 / -2 / -3, Q-V4-623-1, Q-V4-620-3 (Q-V4-623-2 / -3 đã làm ở V4-624).
