# Data & state (frontend)

## Phân loại state

| Loại | Công cụ | Ví dụ |
|---|---|---|
| Server state | **TanStack Query** | danh sách nhóm, tin nhắn, hồ sơ |
| URL state | `searchParams` (`useListParams`) | bộ lọc, trang, tab |
| Form state | AntD `Form` | form đăng ký, form dự án |
| UI cục bộ | `useState` / `useReducer` | mở drawer, hover |
| Toàn cục phía client | **Zustand**, chỉ: `auth-store`, `socket-store` | token, trạng thái kết nối |

Không copy server state vào Zustand hay `useState`. Thêm store toàn cục mới phải hỏi.

## API client

- Một `api-client` mỗi app (`lib/api-client.ts`), bọc `fetch`:
  - gắn `Authorization`, `X-Request-Id`, `Idempotency-Key` khi được truyền;
  - parse response bằng zod schema của endpoint (`@opchub/shared`);
  - ném `ApiError { code, status, fields, requestId }`.
- Xử lý lỗi tập trung:

| Lỗi | Xử lý |
|---|---|
| 401 | refresh single-flight → thử lại → thất bại thì về login |
| 402 `MEMBERSHIP_REQUIRED` | mở `PaywallModal` |
| 403 | toast "không có quyền" (hoặc trang 403 nếu là trang) |
| 400 có `fields` | trả về cho form `setFields` |
| 409 | toast nội dung server trả |
| 429 | toast kèm thời gian chờ từ `Retry-After` |
| 5xx / mạng | toast chung kèm `requestId`, gửi Sentry |

## TanStack Query

- Mỗi feature có query key factory trong `api.ts`:
  ```ts
  export const projectKeys = {
    all: ['projects'] as const,
    list: (p: ProjectListParams) => [...projectKeys.all, 'list', p] as const,
    detail: (id: string) => [...projectKeys.all, 'detail', id] as const,
  };
  ```
- Component gọi hook của feature (`useProjects(params)`), không gọi `useQuery` trực tiếp với key tự chế.
- Mặc định: `staleTime` 30s, `retry` 1 (không retry 4xx), `refetchOnWindowFocus` tắt cho Admin.
- Danh sách có trang: `placeholderData: keepPreviousData` để không nháy.
- Chat, thông báo: `useInfiniteQuery` theo cursor.
- Sau mutation: `invalidateQueries` đúng key hẹp nhất. Optimistic update chỉ cho thao tác rẻ, đảo ngược được (react, ghim, đánh dấu đã đọc, gửi tin có `clientMsgId`).

## Socket → cache

- Một kết nối mỗi tab (`lib/socket.ts`), khởi tạo trong `SocketProvider` sau khi đăng nhập; đổi token thì kết nối lại.
- Event cập nhật cache bằng `queryClient.setQueryData` (vd. `message.new` chèn vào trang đầu của infinite query). Không giữ bản sao danh sách riêng.
- Hook `useRoomSocket(roomId)` lo `room.join`/`room.leave` theo vòng đời component.
- `membership.updated` → cập nhật `me` → `PaywallGate` tự đóng popup.
- Reconnect: tải bù tin theo [socket-chat](../realtime/socket-chat.md#reconnect-s-06).

## Form

- AntD `Form` + rule sinh từ zod schema dùng chung (helper `zodRule(schema.shape.phone)`).
- Submit: disable nút + loading; lỗi server đổ vào đúng trường.
- Form dài (đăng ký DN, dự án) chia bước hoặc section; giữ nháp bằng `localStorage` khi người dùng chưa gửi (không lưu mật khẩu).
- Hỏi xác nhận trước thao tác phá hủy (khóa, từ chối, xóa) bằng `Modal.confirm`.
