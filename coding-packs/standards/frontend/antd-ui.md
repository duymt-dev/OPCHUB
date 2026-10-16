# Ant Design UI

## Theme

- `ConfigProvider` dùng chung ở `packages/ui/theme`: primary `#1677FF`, nền `#F5F5F5`, chữ `#14171F`, font hệ thống + Noto Sans, `locale = vi_VN`, dayjs `vi`.
- Chỉ dùng Ant Design 5 (+ `@ant-design/pro-components` cho Admin, `@ant-design/charts`). Không thêm thư viện UI khác, không Tailwind.
- Style riêng dùng token AntD hoặc CSS Modules. Không viết inline style dài; không hardcode màu ngoài token.

## Layout và tham chiếu

- Bám layout, thứ tự trường, câu chữ trong prototype `deploy/index.html`. Không copy code của prototype.
- Admin: sidebar 1 cấp 10 mục, thu gọn được, badge số chờ duyệt. Portal: responsive từ 360px, không tràn ngang.

## Component dùng chung (`packages/ui`) — bắt buộc dùng, không tự viết lại

| Component | Rule |
|---|---|
| `AdminTable` | Phân trang theo BR-12; "Chọn tất cả" chỉ chọn trang hiện tại; lọc làm trang hiện tại vượt tổng thì tự lùi trang; dưới 768px hiển thị dạng thẻ; slot cho thanh thao tác hàng loạt + nút xuất CSV |
| `PaywallModal` | `closable={false}`, `maskClosable={false}`, `keyboard={false}`; bấm ra ngoài thì hiện nhắc; vẫn cho Tư vấn và Đăng xuất; đóng khi nhận `membership.updated` |
| `RichEditor` | Tiptap, có mention. Chỉ dùng cho sự kiện, dự án, email chào mừng, bình luận nội bộ |
| `SafeHtml` | Cách **duy nhất** để render HTML từ server. Cấm `dangerouslySetInnerHTML` ở chỗ khác |
| `StatusTag` | Màu và nhãn trạng thái lấy từ một bảng map theo enum |
| `UploadImage` | Lấy presigned URL, kiểm loại file và ≤ 5MB ở client trước khi upload |

## Form

- AntD `Form` + validator từ zod schema dùng chung.
- Lỗi 400 từ server hiển thị đúng trường (`form.setFields`).
- Nút submit có trạng thái loading, chặn bấm hai lần.

## Trạng thái màn hình

Mọi list và chi tiết phải có đủ: đang tải (Skeleton), rỗng (Empty có hướng dẫn), lỗi (có nút thử lại).

## Accessibility (WCAG 2.1 AA)

- Input có label; nút chỉ có icon phải có `aria-label`.
- Không truyền tải thông tin chỉ bằng màu.
- Dùng được bằng bàn phím; modal giữ focus bên trong.

## Ảnh

`next/image` với domain MinIO/Cloudflare trong config; ảnh đại diện có fallback chữ cái đầu.
