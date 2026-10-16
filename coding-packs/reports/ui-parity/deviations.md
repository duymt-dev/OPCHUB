# UI parity — lệch có chủ đích

> Mỗi dòng chờ PM duyệt. Lệch không ảnh hưởng % parity vẫn ghi để L1/L2 biết.

| # | Màn | Prototype | App mới | Lý do |
|---|---|---|---|---|
| DV-01 | A-01 | Đăng nhập admin và user trên cùng một màn, cùng một trang | Hai app tách origin (`portal` :3000, `admin` :3001); mỗi app có `/login` riêng, tài khoản sai cổng báo "Tài khoản này đăng nhập ở cổng khác" | AGENTS.md + routing-auth.md: Portal và Admin là hai app; giao diện màn đăng nhập giữ nguyên |
| DV-02 | A-01 | Ô nhập là `<input>` tự vẽ | `antd` `Input` với prefix/suffix, override chiều cao 40, padding 0 12, khoảng cách icon 10 | ui-parity.md: dùng Ant Design thật, chỉnh token |
| DV-03 | A-01 | Ô "Ghi nhớ đăng nhập" là checkbox gốc của trình duyệt (`accent-color`) | `antd` `Checkbox` (ô vuông bo 3px, màu primary) | Như DV-02; lệch vài pixel, trong ngưỡng |
| DV-04 | A-01 | Placeholder màu mặc định của Chromium | Token `colorTextPlaceholder = #757575` cho khớp | Giữ giống prototype thay vì màu placeholder mặc định của antd |
| DV-05 | D-01 | Số liệu Tổng quan nhảy theo bộ mô phỏng 3 giây/lần | Số tĩnh từ `features/overview/data.ts`; khi có backend thay bằng `GET /v1/admin/overview` | Không mô phỏng ngẫu nhiên trong component (ui-parity.md: giả lập đặt trong MSW) |
| DV-06 | D-01 | Nút thu gọn sidebar hoạt động (248 → 76px) | Nút có, chưa thu gọn | Ngoài phạm vi L0; làm ở L2 cùng trạng thái D-xx tương ứng |
| DV-07 | Shell | Popover thông báo, ngôn ngữ, menu người dùng mở được | Nút có, chưa mở popover | Ngoài phạm vi L0; mỗi popover là một dòng trong `screens.md` |
