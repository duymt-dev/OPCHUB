# Routing & auth (frontend)

## Phiên đăng nhập

- Access token chỉ giữ trong bộ nhớ (`auth-store`, Zustand). Không `localStorage`/`sessionStorage`.
- Refresh token là cookie `httpOnly` do API đặt; frontend không đọc được.
- Khi tải app: gọi `POST /v1/auth/refresh` một lần để lấy access token + `me`. Trong lúc chờ hiện màn splash, không render nội dung bảo vệ.
- Hết hạn access token: `api-client` refresh **một lần dùng chung** (single-flight) cho mọi request đang chờ, rồi thử lại. Refresh lỗi → xóa store, về `/login?next=<path>`.
- Đăng xuất: gọi API, xóa store, `queryClient.clear()`, ngắt socket, đóng mọi modal (AU-09).
- Đồng bộ đăng xuất giữa các tab bằng `BroadcastChannel`.

## Bảo vệ route

| Lớp | Làm gì |
|---|---|
| `proxy.ts` | Chỉ chuyển hướng thô: không có cookie refresh mà vào `(portal)`/`(admin)` → `/login`. **Không** kiểm quyền ở đây |
| Layout `(portal)` / `(admin)` | `AuthGate`: chờ `me`; chưa đăng nhập → `/login`; `mustChangePassword` → `/change-password` |
| `PaywallGate` (portal) | `membershipFee.status` ∈ `pending_payment`/`expired` và không phải `investor` → hiện `PaywallModal`, không render nội dung trang |
| `RequirePermission` (admin) | Ẩn menu / nút theo permission key; vào thẳng URL không đủ quyền → trang 403 |

Ẩn trên giao diện chỉ để trải nghiệm tốt; **quyền thật luôn kiểm ở backend**.

## Tài khoản

- Portal và Admin là hai app, hai origin. Tài khoản admin không vào Portal và ngược lại (theo prototype).
- Admin bắt buộc bước TOTP sau mật khẩu.
- Tài khoản `investor` chỉ thấy menu Dự án, Hồ sơ, Thông báo.

## URL là nguồn sự thật cho bộ lọc

- Lọc, tìm kiếm, trang, tab của danh sách đặt trong `searchParams` (`?status=active&page=2`), đọc/ghi qua hook `useListParams` dùng chung. F5 và chia sẻ link phải giữ nguyên trạng thái.
- Modal chi tiết có thể mở bằng URL khi cần chia sẻ (sự kiện, dự án).

## Điều hướng sau hành động

- Đăng nhập xong quay về `next` (chỉ chấp nhận đường dẫn nội bộ bắt đầu bằng `/`).
- Thông báo bấm vào đi đúng nội dung (UP-08); link nằm trong payload `notification.link`.
