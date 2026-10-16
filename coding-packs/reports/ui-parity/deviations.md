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
| DV-08 | A-08, A-09 | Bấm SSO: toast "Đang chuyển hướng…", 0,9 giây sau đặt `screen=portal` rồi bị guard đẩy về login | Toast giống prototype; 0,9 giây sau chuyển tới provider (MSW: `/sso/callback`). Email mới → form "Hoàn tất đăng ký" (loại TK, SĐT, nhóm), bỏ OTP, vào `/community` | D-45. Ảnh parity chụp lúc toast đang hiện nên không ảnh hưởng % (A-08 0,11/0,35%, A-09 0,11/0,35%) |
| DV-09 | A-24 | Kích hoạt OTP xong quay về màn đăng nhập; mail chào mừng gửi mật khẩu tạm | Xác thực OTP trả phiên đăng nhập, vào thẳng `/community`; không gửi mật khẩu tạm | D-30. Không so ảnh được (khác màn đích) — kiểm bằng `e2e/behavior/auth-flows.spec.ts` |
| DV-10 | A-11 | Lối vào: admin tắt "Cho phép tự đăng ký" rồi đăng xuất, cùng một trang | Portal đọc `GET /v1/public/settings`; tắt → toast "Đăng ký mới đang tạm đóng", không sang `/register` | D-26 (hai app tách) nên prototype không có đường tái hiện ở app mới; kiểm bằng test hành vi (cookie mock `opchub-mock-reg-closed`) |
| DV-11 | A-30 | Panel SSO admin không có lối vào nên không tắt được SSO | Ẩn cả vạch "hoặc tiếp tục với" khi danh sách SSO rỗng | C-05; không chụp được trên prototype |
| DV-12 | A-01 → A-05 | Hộp "Tài khoản dùng thử" luôn hiện | Hiện khi `NEXT_PUBLIC_SHOW_DEMO_ACCOUNTS=on`; để trống thì theo chế độ API (MSW → hiện, API thật → ẩn) | D-35; xem Q-22. Ảnh parity chụp ở chế độ MSW nên hộp vẫn hiện |
| DV-13 | A-03 | Không khóa đăng nhập | Lỗi `RATE_LIMITED` hiện nguyên thông báo thời gian chờ của server; `403` → "Tài khoản đã bị khóa, liên hệ hỗ trợ" | D-44; prototype không có trạng thái này nên không có ảnh gốc |
| DV-14 | A-07 | Đổi ngôn ngữ chỉ đổi state trong trang | Cookie `NEXT_LOCALE` + `router.refresh()`; giữ qua tải lại. Ngoài tiếng Việt chỉ dịch các chuỗi mà prototype đã dịch (D-06) | A-07 đạt 0,11/0,35% |
| DV-15 | A-01 (Admin) | Tab "Đăng ký" và nút SSO dùng chung với user | Admin: "Đăng ký" báo đăng ký ở cổng thành viên; SSO báo admin đăng nhập bằng email + mật khẩu; có `/forgot-password` riêng | D-26; giao diện giữ nguyên |

