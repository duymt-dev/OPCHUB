# TIP-V46-822: Hồ sơ quản trị viên & Đổi mật khẩu cá nhân Admin (Admin Profile & Change Password)

## HEADER

- TIP-ID: TIP-V46-822
- Project: OPCHUB
- Module: `apps/server/src/modules/admin-account`, `apps/server/src/modules/uploads`, `apps/admin/src/features/profile`, `apps/admin/src/features/shell`, `packages/shared`
- Priority: **P1** (Cung cấp màn hình cá nhân cho nhân sự quản trị nội bộ tự cập nhật thông tin và bảo mật tài khoản)
- Depends on: TIP-V46-821 (hoặc độc lập với các nghiệp vụ tài chính/vùng).
- Estimated: **M** (Backend 2 endpoints + frontend route `/profile` + avatar sync topbar)
- REQ / D:
  - **RB-R02 / RB-R03** (Tài khoản quản trị tách biệt hoàn toàn với thành viên, không dùng User Portal, chỉ đăng nhập Admin Dashboard)
  - **D-52** (Bảng `admin_users`, `admin_roles`, `admin_role_permissions`; phân quyền RBAC)
  - **D-89** (`admin_users.avatar_url`: ảnh đại diện cho quản trị viên, null fallback về chữ cái đầu)
  - **SEC-R01** (Mật khẩu quản trị ≥ 8 ký tự, có chữ hoa và chữ số, xác nhận khớp)
  - **NA-26** (Dọn rác hình ảnh thay thế qua `StorageGc`, bảo vệ ảnh đang dùng trong `MediaGcService.stillReferenced`)
- **Files touched:**
  - `packages/shared/src/api/admin-auth.ts` (modify: mở rộng `adminMeSchema` với `avatarUrl` và `phone`; thêm `adminUpdateProfileSchema` và `adminChangePasswordSchema`)
  - `packages/shared/src/mock-data/domains/admin-rbac.ts` (modify: cập nhật `mockAdminMeOf` trả về `phone`, `avatarUrl`)
  - `apps/server/src/modules/admin-account/repositories/admin-user.repository.ts` (modify: thêm `phone: true`, `avatarUrl: true` vào `ADMIN_SESSION_SELECT`; thêm `updateProfile` và `updatePassword`)
  - `apps/server/src/modules/admin-account/services/admin-session.service.ts` (modify: map `phone` và `avatarUrl` vào `me()`)
  - `apps/server/src/modules/admin-account/services/admin-auth.service.ts` (modify: thêm phương thức `updateProfile` và `changePassword`)
  - `apps/server/src/modules/admin-account/controllers/admin-auth.controller.ts` (modify: thêm `PATCH admin/auth/me` và `POST admin/auth/change-password`)
  - `apps/server/src/modules/uploads/media-gc.service.ts` (modify: bổ sung `UNION ALL SELECT avatar_url FROM admin_users` vào `stillReferenced`)
  - `apps/admin/src/features/shell/components/admin-shell.tsx` (modify: truyền `avatarUrl: me.avatarUrl ?? undefined` và `onProfile={() => router.push('/profile')}` vào `AppShell`)
  - `apps/admin/src/app/(admin)/profile/page.tsx` (create: Route trang `/profile`)
  - `apps/admin/src/features/profile/components/admin-profile-screen.tsx` (create: Màn hình Profile Admin)
  - `apps/admin/src/features/profile/components/profile.module.css` (create: CSS module giao diện Profile)
  - `apps/admin/src/features/profile/hooks/use-admin-profile.ts` (create: Hook quản lý form state, mutation TanStack Query, cập nhật session store)
  - `apps/admin/src/features/profile/api.ts` (create: API client cho profile update & change password)
  - `apps/admin/src/mocks/handlers/admin-profile.ts` (create: MSW handlers mô phỏng API profile)
  - `apps/admin/src/mocks/handlers/index.ts` (modify: nạp `adminProfileHandlers`)
  - `apps/admin/messages/vi/common.json` (modify: bổ sung chuỗi dịch cho màn hình profile cá nhân)
  - `apps/server/test/admin-account/admin-profile.int.spec.ts` (create: kiểm thử tích hợp backend cho update profile & change password)
  - `apps/admin/src/features/profile/admin-profile.spec.tsx` (create: kiểm thử unit component profile)
- **Parallel-safe with:** Sequential, tiếp nối TIP-V46-821.

## CONTEXT

- **Working dir**: `D:\CODING\OPCHUB\CODING`
- **Thực trạng**:
  - Prototype `docs/spec/index.html` dòng 7166 chỉ có nút menu `umProfile` trỏ sang User Portal (`pTab: 'profile'`). Do luật RB-R03 cấm tài khoản quản trị đăng nhập User Portal, Admin Dashboard chưa có trang hồ sơ riêng.
  - Bảng cơ sở dữ liệu `admin_users` đã có sẵn các cột `name`, `email`, `phone`, `avatar_url`, `password_hash`, `totp_secret_enc`, `status`.
  - Schema `adminMeSchema` hiện tại đang thiếu `avatarUrl` và `phone`, khiến topbar `AppShell` của Admin không hiển thị được ảnh đại diện (chỉ hiện chữ "QT" nền tím) và menu thả xuống chưa có nút chuyển tới `/profile`.
  - Quản trị viên sau khi đổi mật khẩu lần đầu (ở màn `/first-password`) hiện chưa có chỗ để chủ động đổi mật khẩu định kỳ trong phiên làm việc.
- **Mẫu tham chiếu**:
  - Quản lý phiên admin: `apps/server/src/modules/admin-account/services/admin-auth.service.ts`
  - Upload avatar & GC: `apps/server/src/modules/uploads/media-gc.service.ts`
  - Giao diện Admin: `packages/ui/src/app-shell/topbar.tsx`, `packages/ui/src/app-shell/user-menu.tsx`

## APPLICABLE STANDARDS

- [backend/api-conventions](../standards/backend/api-conventions.md) — chuẩn response envelope, mã lỗi AppError, status HTTP
- [backend/auth-rbac](../standards/backend/auth-rbac.md) — xác thực phiên Admin qua `@CurrentUser() user: AccessClaims`, cấm kiểm tra tên vai trò
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md) — service, repository, outbox & audit log
- [database/query-indexing](../standards/database/query-indexing.md) — chỉ select cột cần trong `ADMIN_SESSION_SELECT`
- [frontend/antd-ui](../standards/frontend/antd-ui.md) — AntD token, cấu trúc thẻ Card, responsive
- [frontend/data-state](../standards/frontend/data-state.md) — TanStack Query mutation, cập nhật optimistic hoặc làm mới store session
- [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md) — tổ chức feature folder `apps/admin/src/features/profile`
- [frontend/routing-auth](../standards/frontend/routing-auth.md) — bảo vệ route `(admin)`, không lưu token ở localStorage
- [global/code-structure](../standards/global/code-structure.md) — trần dòng code (BE 400, FE 250), TypeScript strict không `any`
- [security/security](../standards/security/security.md) — mật khẩu băm bằng Argon2, kiểm tra mật khẩu mạnh, sanitize dữ liệu, bảo vệ GC
- [testing/testing](../standards/testing/testing.md) — test tích hợp server và MSW handler ở frontend

## TASK

1. Mở rộng `adminMeSchema` và các endpoint backend để hỗ trợ quản trị viên xem và cập nhật hồ sơ cá nhân (`name`, `phone`, `avatarUrl`) và đổi mật khẩu trong phiên làm việc.
2. Cập nhật `MediaGcService` để bảo vệ ảnh avatar của `admin_users` không bị bộ dọn rác quét nhầm.
3. Tạo trang `/profile` trong Admin Dashboard với 3 khối chức năng: Thông tin cá nhân, Đổi mật khẩu, Thông tin bảo mật & vai trò.
4. Nối liên kết `onProfile` và hiển thị ảnh đại diện `avatarUrl` lên Admin Topbar / User Menu.

## SPECIFICATIONS

### 1. Business Rules
- **BR-ADM-01 (Phạm vi tự cập nhật)**: Quản trị viên chỉ được cập nhật thông tin của chính mình (`user.sub` từ access token). Không được phép cập nhật thông tin của tài khoản khác qua endpoint này.
- **BR-ADM-02 (Email & Vai trò chỉ đọc)**:
  - `email` do Super Admin cấp khi tạo tài khoản, là định danh nội bộ duy nhất, **không cho phép tự đổi**.
  - `roleName` và quyền hạn do Super Admin phân quyền tại Cài đặt hệ thống, **không cho phép tự đổi**.
- **BR-ADM-03 (Ảnh đại diện & GC)**:
  - Ảnh đại diện có thể tải lên từ thiết bị (JPG/PNG/WebP ≤ 5MB) hoặc gỡ bỏ (đưa về `null`).
  - Khi cập nhật ảnh mới thay thế ảnh cũ, URL ảnh cũ phải được ghi nhận vào `StorageGc` với lý do `admin-avatar-replaced`.
  - `stillReferenced` trong `MediaGcService` phải thêm điều kiện kiểm tra tồn tại trong `admin_users.avatar_url`.
- **BR-ADM-04 (Quy tắc đổi mật khẩu cá nhân)**:
  - Bắt buộc nhập mật khẩu hiện tại (`currentPassword`) và phải khớp với băm Argon2 trong DB.
  - Mật khẩu mới (`newPassword`) phải tuân thủ chuẩn `isStrongAdminPassword` (tối thiểu 8 ký tự, có ít nhất 1 chữ hoa và 1 chữ số).
  - Mật khẩu mới phải khác mật khẩu hiện tại.
  - Xác nhận mật khẩu (`confirmPassword`) phải khớp chính xác với mật khẩu mới.
  - Khi đổi mật khẩu thành công:
    - Tăng `perm_version` của tài khoản để vô hiệu hóa tất cả các refreshToken khác của tài khoản đó (chống chiếm quyền phiên cũ).
    - Cấp lại refresh token và access token mới cho phiên hiện tại.
    - Ghi nhận Audit Log: action `admin_account.change_password`, diễn giải "đổi mật khẩu quản trị cá nhân".

### 2. Validation & DTO Contracts

#### A. Cập nhật `packages/shared/src/api/admin-auth.ts`:
```typescript
export const adminUpdateProfileSchema = z.object({
  name: z.string().trim().min(2, 'Họ tên tối thiểu 2 ký tự').max(100, 'Họ tên tối đa 100 ký tự'),
  phone: z.string().trim().nullable().optional(),
  avatarUrl: z.string().url('URL ảnh không hợp lệ').nullable().optional(),
});
export type AdminUpdateProfileRequest = z.infer<typeof adminUpdateProfileSchema>;

export const adminChangePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Vui lòng nhập mật khẩu hiện tại'),
  newPassword: z.string().min(ADMIN_PASSWORD_MIN, `Mật khẩu mới tối thiểu ${ADMIN_PASSWORD_MIN} ký tự`).max(128),
  confirmPassword: z.string().min(1, 'Vui lòng xác nhận mật khẩu mới'),
});
export type AdminChangePasswordRequest = z.infer<typeof adminChangePasswordSchema>;
```

#### B. Mở rộng `adminMeSchema`:
```typescript
export const adminMeSchema = z.object({
  id: z.string(),
  name: z.string(),
  email: z.string(),
  phone: z.string().nullable().default(null),
  avatarUrl: z.string().nullable().default(null),
  roleId: z.string().nullable(),
  roleName: z.string().nullable(),
  isSuperAdmin: z.boolean(),
  permissions: z.array(z.string()),
  mustChangePassword: z.boolean(),
  twoFactor: z.boolean(),
  twoFactorRequired: z.boolean(),
});
```

### 3. Backend Endpoints

1. **`PATCH /v1/admin/auth/me`**:
   - Guard: `@AdminSetupAllowed()` (hoặc JwtAdminGuard thông thường)
   - Body: `AdminUpdateProfileRequest`
   - Response: `AdminMe` (đã cập nhật)
2. **`POST /v1/admin/auth/change-password`**:
   - Guard: `@AdminSetupAllowed()`, Throttle limit 5 / 60s
   - Body: `AdminChangePasswordRequest`
   - Response: `AdminLoginResponse` (session mới) kèm cookie `opchub_art` mới

### 4. Giao diện Frontend (`apps/admin`)

- **Vị trí**: Trang `/profile` (`apps/admin/src/app/(admin)/profile/page.tsx`).
- **Layout**: Sử dụng thẻ Card tiêu chuẩn của hệ thống (như màn Cài đặt / Tổng quan):
  - **Khối 1: Thông tin cá nhân**:
    - Avatar 72px bo tròn: hiển thị ảnh thật nếu có `avatarUrl`, fallback về chữ viết tắt nền tím `#722ED1`.
    - Nút "Tải ảnh mới" (chọn tệp từ máy tính, tự gọi `POST /v1/uploads/avatar`, lấy URL điền vào form) và nút "Xóa ảnh" (nếu đã có avatar).
    - Ô nhập "Họ và tên" (bắt buộc).
    - Ô nhập "Email đăng nhập" (disabled, có chú thích "Email do quản trị viên cấp").
    - Ô nhập "Số điện thoại" (tuỳ chọn).
    - Nút "Lưu thông tin" (nút chính màu xanh `#1677FF`, có trạng thái loading).
  - **Khối 2: Đổi mật khẩu**:
    - Ô nhập "Mật khẩu hiện tại" (ẩn/hiện mắt mật khẩu).
    - Ô nhập "Mật khẩu mới" (kèm gợi ý yêu cầu ≥ 8 ký tự, có chữ hoa và chữ số).
    - Ô nhập "Xác nhận mật khẩu mới".
    - Nút "Cập nhật mật khẩu".
  - **Khối 3: Thông tin bảo mật & Vai trò**:
    - Vai trò hiện tại: Tag hiển thị tên vai trò (ví dụ: Super Admin, Quản trị viên).
    - Xác thực 2 lớp (2FA): Hiển thị trạng thái "Đã kích hoạt" hoặc "Chưa kích hoạt" (nếu chưa bật, có nút dẫn sang `/two-factor`).
- **Nối vào Admin Shell**:
  - Tại `apps/admin/src/features/shell/components/admin-shell.tsx`:
    - Truyền `avatarUrl: me.avatarUrl ?? undefined` vào thuộc tính `user` của `AppShell`.
    - Truyền `onProfile: () => router.push('/profile')` vào `AppShell`.

## ACCEPTANCE CRITERIA

- **AC-01 (Hiển thị thông tin)**:
  - *Given* quản trị viên đăng nhập vào hệ thống,
  - *When* bấm vào menu người dùng góc trên bên phải và chọn "Hồ sơ cá nhân",
  - *Then* trình duyệt chuyển hướng đến `/profile`, các trường Họ tên, Email, Số điện thoại và Vai trò hiển thị đúng thông tin của tài khoản.
- **AC-02 (Cập nhật thông tin cơ bản)**:
  - *Given* quản trị viên đang ở trang `/profile`,
  - *When* chỉnh sửa Họ tên thành "Trần Quản Trị" và bấm "Lưu thông tin",
  - *Then* hệ thống lưu thành công, thông báo toast hiển thị, Họ tên trên topbar và trong session store lập tức đổi thành "Trần Quản Trị".
- **AC-03 (Cập nhật ảnh đại diện)**:
  - *Given* quản trị viên tải lên file ảnh avatar mới,
  - *When* upload hoàn tất và bấm lưu,
  - *Then* ảnh đại diện mới hiển thị trên trang `/profile`, đồng thời avatar tròn trên topbar Admin Shell cũng lập tức hiển thị ảnh mới thay cho chữ viết tắt.
- **AC-04 (Đổi mật khẩu thành công)**:
  - *Given* quản trị viên nhập đúng mật khẩu hiện tại và nhập mật khẩu mới hợp lệ (đáp ứng ≥ 8 ký tự, có chữ hoa và chữ số),
  - *When* bấm "Cập nhật mật khẩu",
  - *Then* mật khẩu được cập nhật thành công, form mật khẩu được làm trống, toast thông báo thành công và người dùng tiếp tục thao tác bình thường mà không bị văng phiên.
- **AC-05 (Bắt lỗi đổi mật khẩu)**:
  - *Given* quản trị viên nhập sai mật khẩu hiện tại, hoặc mật khẩu mới quá ngắn (< 8 ký tự), hoặc mật khẩu mới trùng mật khẩu hiện tại, hoặc xác nhận mật khẩu không khớp,
  - *When* bấm "Cập nhật mật khẩu",
  - *Then* hệ thống chặn lại và hiển thị thông báo lỗi tương ứng tại đúng trường vi phạm.
- **AC-06 (Bảo vệ Garbage Collection)**:
  - *Given* quản trị viên có `avatar_url` trong bảng `admin_users`,
  - *When* tiến trình `MediaGcService.sweep()` chạy quét các file rác,
  - *Then* URL ảnh avatar của quản trị viên được bảo vệ (vẫn được giữ lại, không bị xoá khỏi S3/MinIO).

## CONSTRAINTS

- **DO NOT**:
  - Không cho phép người dùng tự đổi `email` hoặc `roleId` qua form profile.
  - Không lưu mật khẩu dạng plain-text; bắt buộc hash bằng Argon2.
  - Không lưu thông tin phiên hay token ở `localStorage`.
  - Không vượt quá giới hạn dòng: component giao diện ≤ 250 dòng, service backend ≤ 400 dòng.
- **REUSE**:
  - Tái sử dụng component `UserAvatar` từ `@opchub/ui`.
  - Tái sử dụng `isStrongAdminPassword` từ `@opchub/shared/api`.
  - Tái sử dụng cơ chế upload ảnh `/v1/uploads/avatar` sẵn có.
- **SKIP**:
  - Không thêm phân quyền phức tạp cho trang cá nhân (mọi quản trị viên đăng nhập đều có quyền sửa hồ sơ của chính mình).
  - Không tạo bảng mới (tận dụng các cột đã có trên `admin_users`).

## BUILDER-CHECKLIST

- [ ] 1. Mở rộng `packages/shared/src/api/admin-auth.ts`: cập nhật `adminMeSchema`, thêm `adminUpdateProfileSchema` và `adminChangePasswordSchema`.
- [ ] 2. Cập nhật `mockAdminMeOf` trong `packages/shared/src/mock-data/domains/admin-rbac.ts`.
- [ ] 3. Mở rộng `ADMIN_SESSION_SELECT` trong `admin-user.repository.ts`, thêm hàm `updateProfile` và `updatePassword`.
- [ ] 4. Mở rộng `admin-session.service.ts` và `admin-auth.service.ts`: bổ sung logic cập nhật hồ sơ và đổi mật khẩu.
- [ ] 5. Bổ sung 2 route `PATCH me` và `POST change-password` trong `admin-auth.controller.ts`.
- [ ] 6. Cập nhật `media-gc.service.ts`: thêm `admin_users.avatar_url` vào `stillReferenced`.
- [ ] 7. Cập nhật `admin-shell.tsx`: truyền `avatarUrl` và `onProfile` vào `AppShell`.
- [ ] 8. Dựng trang `apps/admin/src/app/(admin)/profile/page.tsx` và component `AdminProfileScreen`.
- [ ] 9. Viết hook `useAdminProfile` và API client gọi backend.
- [ ] 10. Viết test tích hợp server `admin-profile.int.spec.ts` và unit test `admin-profile.spec.tsx`.
- [ ] 11. Chạy kiểm tra chất lượng toàn diện: `pnpm lint && pnpm typecheck && pnpm test`.
