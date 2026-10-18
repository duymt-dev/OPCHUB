# TIP-V2-204: Admin FE — ẩn menu theo quyền, chế độ chỉ xem, xem thử, tab TK quản trị & Vai trò, đổi MK lần đầu + 2FA (§21, §22.2)

## HEADER
- TIP-ID: TIP-V2-204 · Project: OPCHUB · Module: apps/admin (auth, shell, settings, members) + packages/shared · Priority: P0 · Depends on: TIP-V2-203 · Estimated: XL
- **Files touched:**
  - `apps/admin/src/lib/auth-store.ts` (modify: `me: AdminMe`, `preview: { roleId, roleName, permissions } | null`), `apps/admin/src/lib/session.ts`, `apps/admin/src/lib/api-client.ts` (modify: refresh `/admin/auth/refresh`; bắt `VIEW_ONLY`, `PASSWORD_CHANGE_REQUIRED`, `TWO_FACTOR_SETUP_REQUIRED`)
  - `apps/portal/src/features/auth/components/login-screen.tsx` (modify: bỏ `systemRole !== 'member'` và `a.role === 'admin'`, dùng mã `WRONG_PORTAL` — BUG-042)
  - `apps/admin/src/lib/permissions.ts` (create: `useCan(key)`, `useMenuAccess(menu)` → `{ visible, readOnly }`, tính theo `preview ?? me`)
  - `apps/admin/src/features/auth/api.ts`, `components/login-screen.tsx`, `components/auth-gate.tsx` (modify: login `/admin/auth/login`, bỏ `systemRole === 'member'`, bỏ so `a.role === 'admin'` ở TK dùng thử (BUG-042) — dùng `tone` từ fixture)
  - `apps/admin/src/features/auth/components/{first-password-screen,two-factor-setup,totp-step}.tsx` (create), `apps/admin/src/app/(public)/first-password/page.tsx`, `apps/admin/src/app/(public)/two-factor/page.tsx` (create)
  - `apps/admin/src/features/shell/nav.ts`, `components/admin-shell.tsx`, `hooks/use-nav-badges.ts` (modify: nav theo `ADMIN_MENUS`, gom nhóm như prototype `AG`; thêm mục Affiliate trỏ `/affiliate` khi TIP-V2-404 có route)
  - `apps/admin/src/features/shell/components/{view-only-banner,preview-banner}.tsx` (create), `apps/admin/src/features/shell/hooks/use-view-only-guard.ts` (create: chặn click nút thao tác khi `readOnly`, toast "Vai trò {role} chỉ có quyền xem mục này")
  - `apps/admin/src/features/settings/types.ts`, `components/settings-nav.tsx`, `components/settings-screen.tsx`, `hooks/use-settings-route.ts` (modify: lọc tab theo khoá `settings.*`)
  - `apps/admin/src/features/settings/components/admins-tab.tsx`, `hooks/use-admins.ts`, `components/roles-tab.tsx`, `hooks/use-roles.ts`, `model.ts`, `model.spec.ts`, `api.ts` (modify — chuyển API sang `/admin/admin-accounts`, `/admin/admin-roles`)
  - `apps/admin/src/features/settings/components/{admin-create-drawer,admin-row-actions,role-matrix,role-form,role-preview-select}.tsx` (create — tách để giữ ≤ 250 dòng/file), `components/sso-tab.tsx` (modify: nhãn "Bắt buộc 2FA cho quản trị viên")
  - `apps/admin/src/features/members/components/{member-table,member-grid,member-profile}.tsx`, `hooks/{use-members-screen,use-member-actions,use-confirm-requests}.ts`, `types.ts`, `api.ts` (modify: cột "Vai trò khi đăng ký" chỉ đọc, bỏ `setRole`)
  - `apps/admin/src/features/*/components/*-screen.tsx` mỗi menu (modify 1–2 dòng: bọc `ViewOnlyBanner` + `useViewOnlyGuard`)
  - `apps/admin/messages/vi/{auth,common,settings,members}.json` (modify, chỉ thêm khoá; giữ `.wire-lock`)
  - `apps/admin/src/mocks/handlers/{auth,settings,admin-system,members}.ts`, `packages/shared/src/mock-data/domains/{settings-log,admin-members}.ts`, `packages/shared/src/mock-data/auth.ts` (modify: MSW theo API mới + 6 TK prototype ver2)
  - `packages/shared/src/permissions.ts` (modify: xoá alias `LEGACY_*` còn lại), `packages/shared/src/api-domains/{admin-members,settings-admin}.ts` (modify: bỏ `systemRole`, `MANAGED_ROLES`, `ADMIN_ROLES`, `adminInviteSchema`)
  - Server dọn (modify/delete): `apps/server/src/modules/settings/controllers/roles.controller.ts`, `services/{role-permissions,admin-accounts}.service.ts` (delete route 410 đã đánh dấu ở 203), `modules/account/controllers/admin-users.controller.ts` (bỏ `PATCH :id/role`)
  - Test: `e2e/behavior/admin-rbac.spec.ts` (create), `e2e/behavior/{a-01-login,admin-settings,admin-members}.spec.ts` (modify), `apps/admin/src/lib/permissions.spec.ts` (create), `apps/admin/src/mocks/settings-handlers.spec.ts` (modify), `e2e/parity/scenarios/admin-settings.ts` (modify: kịch bản tab TK quản trị/Vai trò ver2)
- **Parallel-safe with:** sequential sau 203; song song được với TIP-V2-301…306 trừ file `messages/vi/*.json` (chỉ thêm dòng, giữ `.wire-lock`); TIP-V2-307 chạy sau TIP này
- **Phase / nhánh:** V2-P2, `feature/V2-P2-admin-rbac`

## CONTEXT
- Đọc: §21.1 RB-R01, R06, R07, R09; §21.6 AT-RB02, 03, 06; §22.2 SEC-R01/R02 + luồng SEC-01; D-52, D-62; BUG-042, TD-026; [ui-parity](../standards/frontend/ui-parity.md).
- Prototype ver2 `docs/spec/index.html`: nav `AG`/`SUBL` + `canMenu`, `stTabs` (lọc tab bằng `need={general:'cfg',cats:'cfg',roles:'adm',admins:'adm',mail:'mail',smtp:'mail',log:'log'}`), dải chỉ xem "Chế độ chỉ xem — vai trò **X** không có quyền thao tác trong mục này.", `roGuard` (regex nhãn nút thao tác, `data-ro-ok` cho nút được phép), dải cam "Đang xem thử Admin với vai trò **X** — chỉ hiện các menu vai trò này được phép." + nút Thoát xem thử, select "Xem thử với vai trò…" ở tab Vai trò, bảng TK quản trị (cột Bảo mật 2FA "Đã bật/Chưa bật", select vai trò, Khóa/Mở khóa, Thu hồi, "Chủ sở hữu"), drawer "Tạo tài khoản quản trị", màn "Đổi mật khẩu lần đầu".
- Hiện trạng: `ADMIN_NAV` gán 14 khoá cũ; `admin-shell.tsx:41` `hasPermission(me.systemRole, …)`; `login-screen.tsx:52,66-70` so tên vai trò; `member-table.tsx:87-98` select vai trò hệ thống; tab `admins`/`roles` gọi `/admin/admins`, `/admin/roles/permissions`.

## APPLICABLE STANDARDS
[nextjs-structure](../standards/frontend/nextjs-structure.md) · [routing-auth](../standards/frontend/routing-auth.md) · [data-state](../standards/frontend/data-state.md) · [antd-ui](../standards/frontend/antd-ui.md) · [ui-parity](../standards/frontend/ui-parity.md) · [code-structure](../standards/global/code-structure.md)

## TASK
Đưa phân quyền §21 lên Admin FE: menu và tab Cài đặt hiện theo 25 khoá, dải "Chế độ chỉ xem" chặn nút thao tác, Super Admin xem thử theo vai trò, tab "Tài khoản quản trị" + "Vai trò & phân quyền" đúng prototype ver2, màn đổi mật khẩu lần đầu và thiết lập 2FA; bỏ mọi so tên vai trò (BUG-042) và cột đổi quyền trên menu Thành viên.

## SPECIFICATIONS
### Business Rules
1. **RB-R06 ẩn menu**: menu hiện khi vai trò có ≥ 1 khoá của menu; nhóm cha (Thành viên, Cộng đồng, Nội dung) chỉ hiện con có quyền. Vào URL menu không có quyền → trang 403 nội bộ "Bạn không có quyền xem mục này" + về mục đầu tiên được phép. Tab Cài đặt: Chung + Danh mục lĩnh vực ← `settings.general`; Email chào mừng + SMTP ← `settings.mail`; TK quản trị + Vai trò ← `settings.admins`; Nhật ký ← `settings.log`; SSO + Ngôn ngữ (D-33, ngoài prototype) ← `settings.general`.
2. **RB-R07 chỉ xem**: có `.view` mà thiếu mọi khoá thao tác của menu → dải vàng đầu trang; mọi nút tạo/sửa/xoá/khoá/gán/xuất/duyệt/chi trả/lưu… bị chặn bằng `useViewOnlyGuard` (bắt click capture trong vùng nội dung, nút tìm/lọc/phân trang/xem chi tiết đánh `data-ro-ok`) và toast đúng câu. Menu có nhiều khoá thao tác (Nhóm: `groups.action`, `groups.moderate`; Affiliate: `action`, `payout`) → chặn theo từng nút, dùng `useCan(key)` để disable. Server trả `VIEW_ONLY` → toast cùng câu (lưới an toàn).
3. **RB-R09 xem thử**: chỉ vai trò có `settings.admins` (thực tế Super Admin) thấy select "Xem thử với vai trò…". Chọn → `preview` trong store (không gọi server), nav + tab + chỉ xem tính theo quyền vai trò xem thử, dải cam + "Thoát xem thử" (`data-ro-ok`). Trong khi xem thử, mọi thao tác ghi cũng bị chặn ở FE (tránh Super Admin ghi thật dưới danh nghĩa vai trò khác). Không lưu qua tải lại trang.
4. **RB-R01, AT-RB06**: bảng/thẻ/hồ sơ thành viên: bỏ cột và select "Quyền hệ thống"; thêm cột "Vai trò khi đăng ký" (dữ liệu `persona` hiện có), chỉ đọc. Xoá `setRole`, `memberRoleUpdateSchema`.
5. **Tab Tài khoản quản trị** (RB-R02, R04, R08, SEC-R02): cột Họ tên + email, Vai trò (select vai trò không phải Super Admin; Super Admin hiện nhãn), Bảo mật 2FA (Đã bật/Chưa bật), Đăng nhập gần nhất / "Đã khóa", thao tác Khóa/Mở khóa, Thu hồi (xác nhận), "Chủ sở hữu" cho Super Admin. Nút "+ Tạo tài khoản quản trị" mở drawer: họ tên*, SĐT, email nội bộ*, vai trò* (thẻ chọn kèm mô tả), mật khẩu tạm* (nút sinh ngẫu nhiên), lỗi trùng email hiển thị tại ô (AT-RB01).
6. **Tab Vai trò & phân quyền** (RB-R04, R05, NA-28): danh sách vai trò (tên, mô tả, số TK), ma trận 25 dòng × vai trò, nhóm theo 11 menu, cột Super Admin khoá cứng ✓; "+ Thêm vai trò" (tên, mô tả); xoá vai trò tự tạo (409 → toast "…đổi vai trò các tài khoản trước", AT-RB05); Lưu hỏi xác nhận, sau lưu invalidate `/admin/me` (quyền áp ngay cho chính người lưu). Phiên khác nhận `permissions.changed` (nếu 203 chọn socket) hoặc refetch `/admin/me` mỗi lần chuyển menu (staleTime 0 cho query `me`).
7. **Đổi MK lần đầu** (SEC-R01, AT-SEC01): login trả `me.mustChangePassword` → `/first-password`; form MK mới + nhập lại, kiểm FE cùng luật server (≥ 8, chữ hoa, chữ số, khác MK tạm, khớp), lỗi server hiển thị tại ô. API trả `PASSWORD_CHANGE_REQUIRED` ở bất kỳ đâu → chuyển về màn này.
8. **2FA** (SEC-R02, D-27): login trả `mfaToken` → bước nhập 6 số (theo modal OTP đăng ký). `me.twoFactorRequired` → `/two-factor`: hiện QR (render từ `otpauthUrl` bằng thư viện QR sẵn có trong repo; nếu chưa có thì hiện chuỗi secret + ghi report, không thêm dependency khi chưa hỏi), nhập mã bật. Đã đăng nhập: nút "Bật 2FA" ở hồ sơ admin (dropdown avatar) dùng cùng component.
9. **BUG-042**: không còn `systemRole`, `role === 'admin'`, `'super_admin'` trong `apps/admin/src` và `apps/portal/src` (Portal: lỗi `WRONG_PORTAL` từ server thay cho `systemRole !== 'member'`).

### UI
- Theo prototype ver2, ngưỡng parity ≤ 3%; FE ≤ 250 dòng/file (trần 400), screen chỉ orchestrator.

## ACCEPTANCE CRITERIA
- Given đăng nhập Kế toán, Then sidebar chỉ có Tổng quan, Thành viên, Phí thành viên, Dịch vụ, Affiliate, Cài đặt; Cài đặt chỉ có tab Nhật ký (AT-RB02, RB-R06).
- Given Giảng viên mở Thành viên, bấm Khóa / Xuất, Then dải "Chế độ chỉ xem" hiện, thao tác không chạy, toast "Vai trò Giảng viên chỉ có quyền xem mục này"; tìm kiếm/lọc/xem hồ sơ vẫn dùng được (AT-RB03, RB-R07).
- Given menu Thành viên, Then không có TK quản trị, cột "Vai trò khi đăng ký" chỉ đọc, không có select quyền (AT-RB06, RB-R01).
- Given Super Admin chọn "Xem thử với vai trò Biên tập nội dung", Then dải cam + sidebar theo vai trò đó; "Thoát xem thử" khôi phục (RB-R09).
- Given TK mới đăng nhập bằng MK tạm, Then bị đưa tới "Đổi mật khẩu lần đầu"; MK yếu/không khớp báo lỗi; hợp lệ → vào Tổng quan theo vai trò (AT-SEC01).
- Given "Bắt buộc 2FA cho quản trị viên" bật, TK chưa 2FA đăng nhập, Then màn thiết lập 2FA; bật xong cột "Bảo mật 2FA" = Đã bật (SEC-R02, BUG-015).
- Given khoá TK quản trị ở tab, When TK đó đăng nhập, Then "Tài khoản quản trị đã bị khóa" (AT-RB04 — FE).
- Given `grep -rE "systemRole|role === '" apps/admin/src apps/portal/src`, Then không còn kết quả ngoài mock thành viên (BUG-042, TD-026).

## TESTS BẮT BUỘC
- `e2e/behavior/admin-rbac.spec.ts` (chạy **cả msw và server**, không nhánh `onServer` làm yếu assertion — D-63): `AT-RB02 Kế toán thấy đúng menu và tab Nhật ký`, `AT-RB03 Giảng viên chỉ xem Thành viên`, `AT-RB04 TK quản trị bị khoá không đăng nhập được`, `AT-RB05 xoá vai trò đang dùng bị chặn`, `AT-RB06 menu Thành viên không có TK quản trị`, `AT-RB01 tạo TK bằng email thành viên báo lỗi tại ô`, `AT-SEC01 đổi mật khẩu lần đầu`, `REQ-329 xem thử vai trò`, `REQ-352 bắt buộc 2FA`, `REQ-228 Super Admin bỏ quyền → phiên Giảng viên mất menu không cần đăng nhập lại` (2 context).
- `e2e/behavior/admin-settings.spec.ts`, `admin-members.spec.ts`, `a-01-login.spec.ts`: cập nhật theo API/màn mới, giữ nguyên assertion còn hiệu lực.
- Unit `apps/admin/src/lib/permissions.spec.ts`: `REQ-326 menu visible/readOnly theo ma trận §21.2 cho 5 vai trò`; `apps/admin/src/features/settings/model.spec.ts`: ma trận diff/đếm thay đổi.
- Parity: chạy `PARITY_IDS` các màn Cài đặt + Thành viên, ≤ 3%.

## CONSTRAINTS
- DO NOT: so tên vai trò (luật 4); để logic quyền trong component (dùng `lib/permissions.ts`); import nội bộ feature khác (chỉ qua `index.ts`); copy code prototype.
- DO NOT lưu access token/preview vào localStorage.
- REUSE: `Switch`, `ConfirmDialog` sẵn có trong settings; `AppShell` của `@opchub/ui`; `useToast`.
- SKIP: màn Affiliate (TIP-V2-404) — chỉ đặt mục nav có điều kiện quyền.

## ⚠️ BUILDER-CHECKLIST
- [ ] FE ≤ 250 dòng/file (trần 400), screen là orchestrator; `pnpm depcheck`.
- [ ] Luật 4, 13; e2e chạy msw **và** server (`pnpm --filter @opchub/e2e e2e`, `e2e:server`) — cấm `onServer` làm yếu assertion.
- [ ] `messages/vi/*.json` chỉ thêm khoá, giữ `.wire-lock`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck` + parity màn đã sửa.
- [ ] `git commit -- <paths>`, `git status --short` sạch, `TIP-V2-204-DONE <sha>`, report `coding-packs/reports/TIP-V2-204-completion.md`; báo cáo pha `coding-packs/reports/V2-P2-completion.md` (AT-RB01→06, AT-SEC01).
