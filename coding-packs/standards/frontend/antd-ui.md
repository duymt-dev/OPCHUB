# Ant Design UI

## Theme

- `packages/ui/theme`: primary `#1677FF`, nền `#F5F5F5`, chữ `#14171F`, font hệ thống + Noto Sans, `locale = vi_VN`, dayjs `vi`.
- Bọc app bằng `AntdRegistry` + `ConfigProvider` + `App` (để dùng `App.useApp()` cho `message`, `modal`, `notification` — không gọi static `message.success`).
- Chỉ dùng Ant Design 6, `@ant-design/icons`, `@ant-design/charts`. **Không** `@ant-design/pro-components` (không hỗ trợ antd 6), không Tailwind, không thư viện UI khác.
- Style riêng dùng design token (`theme.useToken()`) hoặc CSS Modules. Không inline style dài, không hardcode màu ngoài token.

## Layout

- Bám prototype `docs/spec/index.html`. Không copy code.
- Admin: sidebar 1 cấp, thu gọn được (nhớ trạng thái), badge số chờ duyệt. Portal: responsive từ 360px, không tràn ngang.
- Breakpoint dùng `Grid.useBreakpoint()` của AntD, không tự viết media query trong JS.

## Component dùng chung (`packages/ui`) — bắt buộc dùng, không tự viết lại

| Component | Rule |
|---|---|
| `AppShell` | Layout Portal/Admin, header, menu, menu ảnh đại diện |
| `AdminTable` | Phân trang theo BR-12; "Chọn tất cả" chỉ trang hiện tại; lọc làm trang vượt tổng thì tự lùi; dưới 768px hiển thị dạng thẻ; slot thanh thao tác hàng loạt + xuất CSV; trạng thái đọc từ `useListParams` |
| `FilterBar` | Tìm kiếm debounce 300ms + bộ lọc, ghi vào URL |
| `PaywallModal` | `closable={false}`, `maskClosable={false}`, `keyboard={false}`; bấm ra ngoài thì hiện nhắc; vẫn cho Tư vấn và Đăng xuất |
| `RichEditor` | Tiptap (dynamic import), có mention. Dùng cho sự kiện, dự án, email chào mừng, bình luận nội bộ |
| `SafeHtml` | Cách **duy nhất** render HTML từ server |
| `StatusTag` | Màu + nhãn trạng thái từ một bảng map theo enum |
| `UploadImage` | Presigned URL, kiểm loại file và ≤ 5MB trước khi upload, có crop cho ảnh đại diện/ảnh bìa |
| `UserAvatar` | Ảnh hoặc chữ cái đầu |
| `EmptyState`, `ErrorState`, `PageSkeleton` | Trạng thái rỗng / lỗi / đang tải thống nhất |
| `ConfirmAction` | Bọc thao tác phá hủy bằng xác nhận |

Component mới dùng ở ≥ 2 feature thì đưa vào `packages/ui`.

## Trạng thái màn hình

Mọi list và chi tiết phải có đủ: đang tải (skeleton), rỗng (có hướng dẫn hành động), lỗi (nút thử lại), không có quyền.

## Accessibility (WCAG 2.1 AA, `jsx-a11y` kiểm)

- Input có label; nút chỉ có icon có `aria-label`.
- Không truyền tải thông tin chỉ bằng màu.
- Dùng được bằng bàn phím; modal giữ focus.
- Độ tương phản chữ ≥ 4.5:1 (token mặc định đạt; đổi màu thì kiểm lại).

## Ảnh

`next/image` với `remotePatterns` cho MinIO/Cloudflare; ảnh đại diện fallback chữ cái đầu; ảnh bìa có kích thước cố định để không nhảy layout.
