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
| `apps/server test:int` toàn bộ | Lượt cuối sau D-91 (`bf02c7c7`): **1406 / 1407**, 1 lỗi thật ở `register.int.spec` — mail chào mừng 5A có dòng "Mật khẩu" cả khi người dùng đăng ký không đặt mật khẩu (Q-B11-1). Sửa code ở `1baef234` (dòng "Mật khẩu" chỉ khi có mật khẩu), không đổi assertion; chạy lại `test/account` + `contract/mail` + `onboarding`: **13 file / 101 / 101**. Lượt sau D-90: 147 file / 1407 / 1407. Lượt trước D-90 sửa test: 1405 pass / 2 fail ở `onboarding.int.spec` — test tìm TK vừa tạo ở trang đầu `size=50`, nay TK mới (mã lớn) xếp cuối; sửa test lọc theo email duy nhất (`q=`), không nới assertion. Lượt đầu V4-624: 146 file / 1398. |
| `packages/db test:int` | **16 file / 51 / 51 test** |
| e2e MSW toàn bộ (`--project=behavior`, build MSW sau D-91, cổng 3020 / 3021) | **313 passed · 0 failed · 4 skipped** (lượt trước ở `5882b260` cũng 313 / 0 / 4) (13,8 phút; lượt đầu ở HEAD 623: 312 / 0 / 4). 4 skip là `tax-lookup-dlpl` (stub chỉ có ở server / `@live`). |
| e2e:server toàn bộ (`--project behavior`, API + socket bản build tại HEAD chạy riêng cổng 4100 / 4101 trên `opchub_dev`, không đụng API HOLD 4000 / 4001) | lần 1: 291 passed · 16 failed · 9 skipped (1,0 giờ); lần 2 (16 test lỗi): 46 passed · 4 failed; lần 3 sau khi sửa: **29 / 29** (`profile` + `projects`) và **2 / 2** (`chat`) |
| Parity toàn bộ (`--project=parity`, MSW) | Lượt cuối tại `bf02c7c7` (sau D-91): **438 / 442 ảnh đạt**, 4 ảnh > 3% (D-84-AFF 1440 / 390, P-104 @390, P-40 @390) — owner chấp nhận ngoại lệ 27/10/2026. D-32 (2 ảnh) đánh dấu unreachable theo D-91 (3). Trước D-91: 432 / 444, 12 ảnh > 3%. Sau D-90 (`f7663fa2`) đo lại 15 màn Thành viên: 28 / 28 đạt (0,00 – 1,72%). Trước D-90: 419 / 444, 25 ảnh > 3%. Lượt toàn bộ tại `9d7587d3`: 416 pass / 28 fail / 76 skip (10,9 phút). 2 ảnh fail đo lại riêng đều đạt: A-01 @390 (lượt chạy toàn bộ dùng Portal do Playwright tự bật, trang đăng nhập lần đầu chưa có ảnh nền và nút Google; chạy với Portal / Admin bật sẵn thì 3 lượt liền A-01 → A-03 đạt 0,16 – 0,40%), D-74 @390 1,67%. Lượt ở HEAD 623: 413 pass / 31 fail. |

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

## Màn còn > 3% sau D-91: 4 ảnh — owner chấp nhận ngoại lệ (27/10/2026, "xác nhận và chấp nhận")

| Màn | 1440 / 390 | Lý do |
|---|---|---|
| D-84-AFF | 24,12 / 29,36% | AF-R01: 62 đại lý tự tạo thật; demo 6 đại lý trái luật → Q-V4-624-1 chốt (c) |
| P-104 @390 | 15,94% | D-31 / BR-04, giữ theo D-91 (6) |
| P-40 @390 | 4,31% | D-71 / D-56, giữ theo D-91 (7) |

D-91 (owner "1A 2A 3A 4A 5A 6B 7B") đã làm:

| Commit | Nội dung |
|---|---|
| `20dbd9db` | (2) D-84-POL: ô "Điều khoản chương trình" vào hộp thoại "Sửa điều khoản", ô chính sách cao 36px như prototype |
| `fae77176` | (4) D-41 @390: thao tác khẩn cấp Bot vào menu ⋯ góc thẻ; luồng xong hiện "Đã đăng" |
| `04d2be66`, `1baef234` | (5) D-70 / P-05: mail chào mừng có khối URL đăng nhập + tên đăng nhập; dòng "Mật khẩu: Do bạn tự đặt" chỉ khi người dùng đã đặt; không bao giờ gửi mật khẩu (D-47) |
| `1c128939` | (3) D-32: nút xem chat của prototype không làm gì → unreachable |

## Lịch sử: 12 ảnh > 3% trước D-91 (owner chốt giữ 27/10/2026, "1A, còn lại giữ hết" → D-90)

| Màn | 1440 / 390 | Lý do (D-xx / Q) |
|---|---|---|
| D-84-AFF | 24,12 / 29,36% | 62 đại lý tự tạo thật (AF-R01) so với 6 dòng prototype. Không làm giả. |
| D-84-POL @390 | 13,48% | Ô "Điều khoản chương trình" bắt buộc theo SRS §20.6 / §20.7. |
| D-32 | 54,46 / 85,56% | DV-G4c-1: trình xem chat chỉ đọc. |
| D-41 @390 | 5,58% | D-50 (bot không hàng chờ duyệt) / REQ-141 (tắt khẩn cấp). |
| D-70 | 16,33 / 15,56% | D-47: không gửi mật khẩu tạm qua email. |
| P-05 | 4,52 / 4,71% | D-30 / D-47: mail không có mật khẩu tạm. |
| P-104 @390 | 15,94% | D-31 / BR-04: mã CK 6 số dùng để đối soát tiền. |
| P-40 @390 | 4,31% | D-71 (bỏ duyệt tham gia), D-56 ("Giảng viên"). |

**Điều kiện dừng (trước D-91):** 12 ảnh còn > 3% đều do quyết định nghiệp vụ tiền / bảo mật / quyền / dữ liệu thật (D-31, D-47, D-50, D-71 / D-56, AF-R01, SRS §20.6, DV-G4c-1) mà owner đã chốt **giữ** ngày 27/10/2026 (ghi ở D-90). Không còn DV nào chờ quyết định.

## Sửa thêm ở TIP-V4-624 (sau lượt đo đầu)

| Commit | Nội dung | Số mới (1440 / 390) |
|---|---|---|
| `0940865b` | P-105 Khám phá Gian hàng: lượt xem (`stores.view_count`, chủ tự xem không tính, sort "Xem nhiều"), tim theo từng người (`store_favorites`, `PUT /stores/:id/favorite`), "Nổi bật" do Admin gắn (`PUT /admin/stores/:id/featured`, quyền `stores.action`, audit), tag loại hình. Migration `20261027170000_v4_store_views_featured_fav` (đã áp `opchub_test` + `opchub_dev`, seed:demo chạy lại). Int `store-engagement` 3 / 3, e2e `stores` + `needs`. | 0,10 / 0,14 (trước 3,64 / 0,82) |
| `f7663fa2` | D-90 (owner chốt Q-V4-623-1 = A): Thành viên theo mã TV tăng dần như prototype. Server `ORDER BY member_code, id` + migration `20261027180000_v4_members_by_code` (index covering partial, đã áp `opchub_test` + `opchub_dev`), MSW cùng thứ tự. Int `test/account` + contract + export + admin-account 19 file / 881 test; e2e MSW Thành viên / RBAC / lọc / nhóm 34 / 34; e2e:server Thành viên + RBAC 21 / 21. | 10 màn Thành viên từ 3,07 – 5,33% → 0,00 – 1,72% |
| `9d7587d3` | D-85-CUS @390: tiêu đề lưới khách hàng 38px như prototype, ẩn hàng đo 1px của bảng, gạch chân tab đè viền. e2e Affiliate 14 / 14 (kiểm thêm chiều cao tiêu đề + vị trí dòng đầu). | 1,52 / 1,32 (trước 1,71 / 5,50) |

## Dữ liệu demo

- Đã áp 8 migration V4 vào `opchub_dev` (`prisma migrate deploy`, chỉ thêm cột / bảng / index):
  - `20261027090000_v4_industry_groups`
  - `20261027120000_v4_project_explore`
  - `20261027130000_v4_project_milestones`
  - `20261027140000_v4_overview_paid`
  - `20261027150000_v4_admin_avatar`
  - `20261027160000_v4_admin_stores_created`
  - `20261027170000_v4_store_views_featured_fav`
  - `20261027180000_v4_members_by_code`
- `seed:demo` chạy lại trên `opchub_dev` sau D-90 (27/10/2026, 1,7 giây) — Thành viên demo TV000001 → TV000008 = m1 → m8. Cache Redis dev (db 1) được xoá.
- API / socket / worker HOLD (4000 / 4001) **không bị tắt**. Chúng vẫn chạy bản build 26/10, chưa có code V4-617 → 624. Owner khởi động lại theo `e2e/server/README.md` khi muốn dùng code mới. Bản build mới nằm ở `apps/server/dist/v4/` (gitignored).

## Chưa làm

- Tạo PR 617 → 624: chờ token của owner.
- Owner đã chốt mọi câu hỏi còn treo (D-90, D-91, Q-V4-624-1 = c).
- e2e:server chưa chạy lại sau D-91 (lượt cuối trước D-90 / D-91, xem bảng trên). Q-V4-622-1 (lối vào SSO / Ngôn ngữ trên điện thoại) giữ như đã làm.
