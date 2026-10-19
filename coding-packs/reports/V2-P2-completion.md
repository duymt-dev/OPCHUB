# V2-P2 — Tài khoản quản trị & phân quyền §21 + SEC-R01 → R03 (completion)

> GOAL V2-BUILD, Pha 2. Nhánh `feature/V2-P2-admin-rbac`, merge vào `main`. 4 TIP (TIP-V2-201 → 204).

## TIP và commit báo cáo

| TIP | Nội dung | Nợ / lỗi đóng | Báo cáo |
|---|---|---|---|
| 201 | `admin_users` tách khỏi `users`, 25 khoá §21, 5 vai trò hệ thống + ma trận §21.2, 6 TK `stAdmins` | REQ-322, 324, 325 (D-52) | `a2d1e91` |
| 202 | Đăng nhập Admin qua `admin_users` (realm admin), đổi MK lần đầu, 2FA TOTP, khoá / thu hồi / đổi vai trò TK quản trị | BUG-015, TD-016, REQ-201, 215, 217, 323, 328, 351–353 | `5729a03` |
| 203 | Guard 25 khoá theo vai trò, `VIEW_ONLY`, quyền hiệu lực ngay (Redis), xoá vai trò tự tạo | BUG-035, REQ-228, 324, 325, 327 | `950b961` |
| 204 | Admin FE: ẩn menu, chỉ xem, xem thử, tab TK quản trị + ma trận, đổi MK lần đầu, 2FA; bỏ khoá D-20 + `role_permissions` | BUG-042, TD-026, REQ-321, 326, 327, 329, 352 | commit báo cáo 204 |

Migration (agent chính tạo, áp `opchub_dev` + `opchub_test`): `20261019080000_admin_accounts`,
`20261019100000_admin_users_moved`, `20261019130000_drop_role_permissions`.

Lựa chọn tạm chờ PM: V2Q-112 → V2Q-133 (`reports/V2-questions.md`).

## BUG / nợ của pha

| Mã | Mức | Trạng thái | Test |
|---|---|---|---|
| BUG-015 (2FA Admin chết, "Bắt buộc 2FA" không tác dụng) | S2 | Đóng (202 + 204) | int `admin-auth` REQ-352 ×2; e2e `admin-rbac` REQ-352 (thiết lập TOTP thật, cột "Đã bật") |
| BUG-035 (khoá `m.role`, `p.edit` không ai kiểm) | S3 | Đóng (203 + 204: khoá D-20 xoá hẳn) | int `rbac-matrix` 648 ca REQ-325; audit C5 0 nợ |
| BUG-042 (FE so tên vai trò) | S4 | Đóng (204) | `grep -rE "systemRole|role === '" apps/admin/src apps/portal/src` chỉ còn mock thành viên; audit C5 154/154 |
| TD-016 (TOTP mã chết) | Cao | Đóng (202) | như BUG-015 |
| TD-026 (key chết, FE so tên vai trò) | Thấp | Đóng (203/204) | như BUG-035/042 |

## Cổng kiểm (19/10/2026)

| Lệnh | Kết quả |
|---|---|
| `pnpm lint` / `pnpm typecheck` | 8/8 · 8/8 |
| `pnpm depcheck` | no dependency violations (601 modules) |
| Int server (`opchub_test`) | 75 file, **1002/1002** |
| Int db | 13/13 |
| Unit server / shared / admin / portal / ui | 92 / 85 / 154 / 113 / 35 |
| e2e behavior MSW | **163/163** |
| e2e behavior server (`opchub_dev`) | **162/163** + ca lỗi (`events.spec.ts:38`, portal, flaky từ P1) chạy lại 3 lần đạt 18/18 |
| Audit cơ học | C1 **15/15** · C2 17/17 · C3 80/80 · C4 26/29 · C5 **154/154** · C6 126/142 |
| Audit e2e trên server (`pnpm --filter @opchub/e2e run audit`) | 226/226 bước; **UAT 30/31 đạt** — UAT-14 (persona tự phản hồi, BUG-008) thuộc Pha 5 như P1 |

Môi trường e2e/audit server: stack riêng của agent chính (API 4020, socket 4021, Portal 3280, Admin 3282,
`.next-server-v2b`), `seed` + `seed:demo` + `flush:dev-cache` trước khi chạy. Không đụng cổng 3000/3001/3100.

## Còn lại / chuyển pha sau

- **C4** (không đổi từ P1): NĐT "Đang trao đổi → Đã kết nối" mỏ neo audit chưa theo `INVESTOR_TRANSITIONS`; hội
  thoại bot → Pha 5.
- **C6**: biến dev/e2e không có trong `infra/env/*.example` — cố ý (S4).
- **Parity**: màn Cài đặt đạt ở 1440 (D-69 0,33%, D-73 1,24%, D-74 2,90%, D-80 0,70%); 390 lệch theo DV-G6a-1 (2 tab
  D-33). D-61/D-63 (Dịch vụ) 3,27 / 3,06% do prototype ver2 đổi trạng thái phiếu → TIP-V2-302/307 (V2Q-133).
- Nút "Bật xác thực 2 lớp" trong menu avatar (2FA tự nguyện) — Pha 3.
