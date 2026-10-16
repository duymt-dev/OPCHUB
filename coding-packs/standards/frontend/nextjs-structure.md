# Next.js structure

## Thư mục

```
apps/portal/src/
  app/
    (auth)/login/page.tsx
    (portal)/chat/[roomId]/page.tsx
    layout.tsx
  features/
    chat/
      components/   message-list.tsx, composer.tsx, room-info-drawer.tsx
      hooks/        use-room-messages.ts, use-send-message.ts
      api.ts        hàm gọi API + query keys
      types.ts
  lib/              api-client.ts, socket.ts, query-client.ts, logger.ts
  messages/vi.json
```

- `page.tsx` chỉ ghép feature component, ≤ 80 dòng.
- Component > 150 dòng thì tách. File trần 400 dòng.
- Một feature không import nội bộ của feature khác; dùng chung thì đưa lên `packages/ui` hoặc `lib/`.

## Server vs client component

- Trang công khai (đăng nhập, điều khoản) là server component.
- Màn hình tương tác trong Portal/Admin là client component. Đặt `'use client'` ở component lá, không ở layout gốc.
- Không fetch dữ liệu có token trong server component; token chỉ nằm ở client.

## Dữ liệu

- Server state **chỉ** qua TanStack Query. Query key qua factory mỗi feature: `chatKeys.messages(roomId)`.
- UI state cục bộ: `useState`/`useReducer`. Store toàn cục chỉ có Zustand cho session và kết nối socket; muốn thêm store khác phải hỏi.
- Một `api-client` duy nhất mỗi app:
  - 401 → gọi refresh một lần rồi thử lại; vẫn lỗi thì về trang đăng nhập.
  - 402 → mở paywall modal.
  - 400 `fields` → đổ vào lỗi từng trường của form.
  - Lỗi khác → toast kèm `requestId`.
- Socket: một instance mỗi tab qua hook `useSocket`; event cập nhật cache TanStack Query (`setQueryData`), không giữ bản sao dữ liệu riêng.

## Validation

- Form dùng chung zod schema với backend (`@opchub/shared`). Rule nghiệp vụ thật nằm ở backend; frontend chỉ validate để báo lỗi sớm.

## i18n

- Mọi chuỗi hiển thị qua `next-intl` (`messages/vi.json`), kể cả nhãn trạng thái. Không viết cứng tiếng Việt trong component.
- Ngày giờ hiển thị `Asia/Ho_Chi_Minh`, tiền `Intl.NumberFormat('vi-VN')` + "đ".
