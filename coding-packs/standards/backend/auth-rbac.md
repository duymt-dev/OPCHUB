# Auth & RBAC

## Token

- Access JWT 15 phút, giữ trong bộ nhớ client, gửi qua `Authorization: Bearer`.
- Refresh token 7 ngày, cookie `httpOnly; Secure; SameSite=Lax; Path=/v1/auth/refresh`, **xoay vòng mỗi lần dùng**. Phát hiện dùng lại token cũ thì thu hồi cả chuỗi.
- Claim: `sub`, `accountType`, `systemRole`, `permVersion`, `membershipFee: { status, validUntil }`, `mustChangePassword`.
- Khóa tài khoản / đặt lại mật khẩu / đổi quyền: thu hồi refresh token, tăng version trong Redis, ngắt socket qua room `user:{id}`.

## Mật khẩu, OTP

- Mật khẩu: `argon2id`. Không bao giờ gửi mật khẩu qua email (D-10).
- OTP email 6 số, TTL 10 phút. Lưu **hash** trong Redis, so sánh timing-safe, tối đa 5 lần nhập sai mỗi mã, gửi lại tối đa 3 lần/15 phút.
- Khóa đăng nhập 15 phút sau 5 lần sai.
- Link đặt lại mật khẩu: token ngẫu nhiên 32 byte, lưu hash, TTL 15 phút, tối đa 3 lần/giờ.
- Admin bắt buộc TOTP (`otplib`).

## Thứ tự guard

```
JwtAuthGuard → AccountStatusGuard → MembershipFeeGuard → PermissionGuard → GroupRoleGuard
```

| Decorator | Ý nghĩa |
|---|---|
| `@Public()` | Bỏ qua auth (login, register, webhook có guard HMAC riêng) |
| `@RequiresMembershipFee()` | Phí phải **usable** = `trial` / `active` / `expiring` còn hạn (BR-TRIAL-05, D-94), nếu không trả 402. Mặc định bật cho mọi route Portal, trừ: phí thành viên, gửi phiếu YC, hồ sơ, đăng xuất |
| `@AllowAccountTypes('investor')` | Tài khoản Nhà đầu tư (D-14) bỏ qua paywall nhưng **chỉ** vào được route có decorator này: xem dự án, gửi quan tâm, luồng trao đổi |
| `@RequirePermission('m.edit')` | Kiểm permission key |
| `@RequireGroupRole('owner')` | Quyền ngữ cảnh theo `groupId` trong route |

`MembershipFeeGuard` đọc trạng thái từ claim và Redis (S-03), **không query DB**.

**Một hàm duy nhất** quyết định "đã kích hoạt" (`isFeeUsable` trong `packages/shared`, V-11): guard REST, xác thực socket, presign upload, lọc Khám phá (gian hàng / nhu cầu / dự án), onboarding và FE đều gọi hàm này. Không viết lại điều kiện `status IN (...)` ở chỗ khác; SQL lọc theo phí dùng cùng tập trạng thái do hàm này công bố. Gói Gọi vốn **không** miễn phí kể cả khi `trial` (BR-TRIAL-03).

## Permission key (D-20)

Đặt trong `packages/shared/permissions.ts`; FE và BE dùng chung:

```
m.view m.edit m.role  c.create c.room c.mod  p.edit p.pub  e.edit e.reg n.edit  s.cfg s.role s.log
```

- `super_admin` có mọi quyền và không bị chỉnh.
- Quyền của `admin`, `moderator`, `member` lưu trong DB, chỉnh trong Cài đặt; chỉ người có `s.role` được sửa. Mặc định lấy theo prototype.
- **Code chỉ check permission key**, không bao giờ `if (role === 'admin')`.
- Chủ nhóm / điều phối viên nhóm là vai trò theo `group_members.group_role`, kiểm bằng `GroupRoleGuard`, độc lập với `systemRole`.

## Lan truyền trạng thái (D-15)

- Hết phí: mất quyền tương tác (chat, đăng dự án, đăng ký sự kiện); dữ liệu giữ nguyên.
- Bị khóa: dự án chuyển `hidden`; nhóm họ làm chủ thì yêu cầu chờ duyệt chuyển cho Admin; tin cũ giữ nguyên.
