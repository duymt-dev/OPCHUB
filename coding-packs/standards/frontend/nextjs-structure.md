# Next.js structure

Next.js 16 App Router, React 19. Áp dụng cho `apps/portal` và `apps/admin`.

## Thư mục

```
apps/portal/
  src/
    app/
      (public)/login/page.tsx  register/…  forgot-password/…  terms/page.tsx
      (portal)/layout.tsx              shell: header, sidebar, PaywallGate, SocketProvider
      (portal)/dashboard/page.tsx
      (portal)/chat/[groupId]/[roomId]/page.tsx
      (portal)/events/  projects/  community/  profile/  notifications/
      layout.tsx                       html, AntdRegistry, Providers
      error.tsx  not-found.tsx  global-error.tsx
    features/
      chat/
        components/   message-list.tsx  composer.tsx  room-info-drawer.tsx
        hooks/        use-room-messages.ts  use-send-message.ts  use-room-socket.ts
        api.ts        hàm gọi API + query key factory
        types.ts
        index.ts      public API của feature
    lib/              api-client.ts  socket.ts  query-client.ts  auth-store.ts  logger.ts  env.ts
    providers/        app-providers.tsx  (QueryClient, ConfigProvider, IntlProvider, auth)
    i18n/             request.ts
  messages/vi/        common.json  auth.json  chat.json  events.json  …  (tách theo feature)
  proxy.ts            (Next 16, thay cho middleware.ts) — xem routing-auth
  next.config.ts
```

`apps/admin` cùng cấu trúc; route group `(admin)`.

## Rule

- `page.tsx` ≤ 80 dòng: đọc params/searchParams, ghép component của feature. Không chứa logic.
- `layout.tsx` không fetch dữ liệu người dùng.
- Component > 150 dòng thì tách. Trần 400.
- Feature chỉ import feature khác qua `index.ts`. Dùng chung nhiều nơi thì đưa lên `packages/ui` hoặc `lib/`.
- Mỗi route segment có `loading.tsx` khi trang tải dữ liệu; segment có rủi ro lỗi riêng thì có `error.tsx`.

## Server vs client component

- Trang công khai (`(public)`) là server component; form bên trong là client component lá.
- Vùng `(portal)`/`(admin)` cần token nên dữ liệu tải ở client (TanStack Query). Không fetch dữ liệu cá nhân trong server component.
- `'use client'` đặt ở component lá hoặc provider, không đặt ở `layout.tsx` gốc.
- Ant Design 6 dùng `@ant-design/nextjs-registry` (`AntdRegistry`) trong layout gốc để SSR style không nháy.
- Không dùng Server Actions cho nghiệp vụ: mọi ghi dữ liệu đi qua REST API của `apps/server` để có một chỗ kiểm quyền, audit, rate-limit.

## Hiệu năng

- Import nặng (Tiptap, charts, bản đồ, emoji picker) dùng `next/dynamic` với `ssr: false` và skeleton.
- Ảnh qua `next/image`, khai báo `remotePatterns` cho MinIO/Cloudflare.
- Import icon theo từng icon từ `@ant-design/icons`, không import cả gói.
- Danh sách dài (chat, thành viên) dùng virtual list (`react-virtuoso`).
- Ngân sách: First Load JS mỗi route ≤ 250 KB gzip; kiểm bằng `@next/bundle-analyzer` khi thêm thư viện lớn.

## Env

- Biến client phải có tiền tố `NEXT_PUBLIC_` và **không chứa secret**.
- Đọc env qua `lib/env.ts` (zod parse lúc build), không dùng `process.env` rải rác.

## i18n

- `next-intl`, locale mặc định `vi`, không có prefix URL (chỉ một ngôn ngữ ở MVP).
- Mọi chuỗi hiển thị qua `useTranslations('<feature>')`, kể cả nhãn trạng thái và thông báo lỗi. Không viết cứng tiếng Việt trong component.
- Ngày giờ qua `useFormatter` / dayjs với timezone `Asia/Ho_Chi_Minh`; tiền `Intl.NumberFormat('vi-VN')` + "đ".

## SEO, metadata

- Mỗi trang công khai export `metadata` (title, description, Open Graph).
- Vùng đăng nhập và Admin: `robots: { index: false }`. Admin chặn toàn bộ bằng `robots.txt`.

## Tham chiếu prototype

Trước khi làm một màn hình, mở `docs/spec/index.html` đúng màn đó (đăng nhập bằng tài khoản demo trong `docs/spec/README.md`), bám layout, thứ tự trường, câu chữ, trạng thái rỗng. Ghi lệch (nếu có lý do) vào Completion Report.
