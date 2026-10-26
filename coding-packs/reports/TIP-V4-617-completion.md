# TIP-V4-617 — Auth theo prototype v4 (D-89) — completion

- Nhánh `feature/TIP-V4-617-auth-v4` từ `dev` (`79e96b28`).
- PR: base `dev` (link ở mô tả PR).
- Commit:
  - `05d1077f` màn đăng nhập / quên mật khẩu / chọn loại v4 + D-89 vào Decisions Log + file TIP;
  - `0d468425` form đăng ký v4, API đăng ký / SSO nhận vai trò, MST, nhóm tùy chọn, lỗi tại ô kiểu v4;
  - `bb9c15ba` e2e hành vi + kịch bản parity theo v4;
  - commit báo cáo (completion, deviations, questions, results) — SHA ở mô tả PR.
- REQ / D: **D-89** (mới, thay phần nút SSO của D-64), Q-V4-615-1, Q-V4-607-1, Q-V4-601-3 chốt theo D-89.

## Đã làm

1. **D-89** ghi vào Decisions Log (`01-REQUIREMENTS-MATRIX.md`): giao diện theo prototype v4 hoàn toàn; tiền / quyền / kiểm duyệt giữ D-xx.
2. **Khung Auth v4** (`packages/ui/src/auth`), dùng chung Portal + Admin:
   - ảnh nền `login-bg-v11.png` toàn trang, hero 4 giá trị, chân trang 13 cờ + EU;
   - thẻ kính mờ, ô 50px có icon, "Đăng nhập →", "Hoặc tiếp tục với", chỉ Google, "Chưa có tài khoản? Đăng ký tham gia";
   - nút ngôn ngữ trên ảnh, link "Cần hỗ trợ? Liên hệ".
   - Bỏ khối số liệu cũ (`login-hero`, `use-public-stats`); `/public/stats` giữ nguyên ở server (không còn FE gọi).
3. **SSO chỉ Google** (D-89): `LOGIN_SSO_IDS = ['google']`; `/public/settings` chỉ trả Google; `SSO_IDS` giữ cho liên kết / cấu hình cũ.
4. **Form đăng ký v4**:
   - Cá nhân: họ tên, SĐT, email, mã giới thiệu, mật khẩu (thanh độ mạnh), đồng ý.
   - DN: "NGƯỜI ĐẠI DIỆN" họ tên *, chức vụ, SĐT, email công ty *, mã giới thiệu, mật khẩu *, đồng ý.
   - Vai trò / MST / tên DN / ngành / quy mô / nhóm khai báo ở popup sau đăng nhập (V4-607).
   - API: `registerPersonalSchema`, `registerBusinessSchema`, `ssoCompleteSchema` nhận các trường đó tùy chọn; DN bắt buộc `representative` ("Vui lòng nhập họ tên người đại diện"). Server bỏ kiểm "ít nhất 1 nhóm" lúc đăng ký; DN không MST → chưa tạo `business_profiles`, popup khai báo upsert (đã có).
   - MSW: hồ sơ DN tạo khi khai báo, `verification` theo D-40 (MST tra được + tên khớp).
5. **Lỗi tại ô (BUG-022) kiểu v4** — đổi chung `packages/ui/src/form-errors`:
   - giữ `aria-invalid`, `aria-describedby`, toast lỗi đầu, focus ô đầu;
   - chữ lỗi dưới ô chỉ cho trình đọc màn hình (prototype chỉ toast), focus không cuộn trang;
   - mã giới thiệu vẫn hiện chữ lỗi dưới ô như prototype (`rgRefErr`).
6. **Giữ vị trí cuộn** giữa các màn Auth (`KEEP_SCROLL`, `keepAnchor`) như prototype một trang; rời Auth vào app thì về đầu trang (`leaveAuth`).
7. **i18n**: chữ v4 cho 10 ngôn ngữ Portal + Admin vi (`hero.*`, `login.*`, `register.errRep`, `register.headChoose`).

## Parity (MSW, ngưỡng 3%, không mask thêm)

`PARITY_IDS='A-*,P-0*,P-100,P-101,P-102'`:

| Màn | 1440 | 390 |
|---|---|---|
| A-01 | 0,16% | 0,32% |
| A-02 | 0,19% | 0,40% |
| A-03 | 0,16% | 0,33% |
| A-04 | 0,20% | 0,33% |
| A-06 | 0,30% | 1,03% |
| A-08 | 0,16% | 0,35% |
| A-10 | 0,07% | 0,17% |
| A-12 | 0,08% | 0,18% |
| A-16 | 0,07% | 0,00% |
| A-17 | 0,13% | 0,27% |
| A-18 | 0,11% | 0,25% |
| A-20 | 0,11% | 0,33% |
| A-21 | 0,14% | 0,28% |
| A-22 | 0,14% | 0,20% |
| A-23 | 0,14% | 0,28% |
| A-25 | 0,07% | 0,15% |
| A-26 | 0,12% | 0,32% |
| A-27 | 0,07% | 0,19% |
| A-28 | 0,16% | 0,34% |
| A-29 | 0,23% | 0,40% |
| A-31 | 0,13% | 0,32% |
| A-32 | 0,11% | 0,25% |
| P-100 | 0,16% | 0,15% |
| P-101 | 0,14% | 0,16% |
| P-102 | 0,26% | 2,05% |
| P-07 / P-08 / P-09 | 0,17–0,18% | 0,28–0,31% |

- Không đo được (lý do trong `results.md`): A-05, A-07 (prototype v4 lỗi: không dịch), A-09 / A-13 / A-14 / A-15 / A-19 (trạng thái đã bỏ theo D-89), A-11, A-24, A-30.
- Còn đỏ, ngoài phạm vi TIP: P-01 Dashboard 72 / 75% (TIP-V4-618), P-05 mail chào mừng 4,52 / 4,71% (DV-V4-607-2, TIP-V4-618).
- DV-V4-615-1, DV-V4-607-1, DV-V2-403-1 ghi "đã sửa" trong `deviations.md`.

## Test (số thật)

- `pnpm turbo run lint typecheck test` (5 gói + e2e lint): 22/22 task thành công.
- `pnpm depcheck`: 0 vi phạm (853 module).
- Build MSW Portal + Admin: thành công.
- Unit mới: `packages/shared/.../registration/register-v4.spec.ts` (2), `register-validation.spec.ts` (3), `register-handlers.spec.ts` (sửa); shared 395 → pass, portal 395 + auth pass.
- Int: `test/account/register-v4.int.spec.ts` (3 mới), `register.int`, `declaration.int`, `sso.int` — 36/36 pass (lần chạy riêng). Toàn bộ `test:int` (Postgres + Redis thật, opchub_test): **142 file / 1389 test pass**.
- e2e behavior MSW toàn bộ: 303 passed, 1 failed, 4 skipped (14,4 phút); lỗi duy nhất `projects.spec` P-61 (form SSO không còn chọn nhóm) đã sửa → chạy lại `projects` + `profile`: 21/21 pass. Nhóm auth (12 file): 68/68 pass.
- e2e:server: chưa chạy trong TIP này (để TIP-V4-624 chạy toàn bộ).

## Chưa làm / ghi chú

- Đổi lỗi tại ô áp dụng mọi form: các DV cùng loại (DV-V2-307-14 D-29 / P-74, DV-V4-601-2 / DV-V4-605-2 P-81 / P-82) đo lại ở TIP-V4-623.
- `GET /public/stats` không còn FE dùng; giữ API (không xóa trong TIP UI).
- Không động tới API / socket / worker đang chạy trên máy (native HOLD).
