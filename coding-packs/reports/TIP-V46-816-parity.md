# TIP-V46-816 — parity D-134 / D-137

Đo lại **6 ảnh/lane**, không coi các dòng lịch sử khác là đã kiểm lại trong 816.
Nguồn app: `584742ea` (các commit sau chỉ thêm test/báo cáo). Không sửa prototype,
mask ảnh, nới ngưỡng hoặc bỏ assertion.

| Màn | Viewport | MSW | Native | Phân loại |
|---|---:|---:|---:|---|
| P-89 Thông tin cá nhân | 1440 | 1,99% | 2,07% | Dưới 3%; thêm tab Thông báo theo D-137 |
| P-89 | 390 | 0,31% | 0,37% | Dưới 3%; D-137 + dữ liệu |
| P-93 Bảo mật | 1440 | 1,75% | 1,84% | Dưới 3%; D-137 + dữ liệu |
| P-93 | 390 | 0,34% | 0,37% | Dưới 3%; D-137 + dữ liệu |
| D-V46-APP | 1440 | 12,40% | 12,39% | **Tham khảo D-137/B16/dữ liệu**, không phải lỗi chức năng |
| D-V46-APP | 390 | 8,06% | 8,05% | **Tham khảo D-137/B16/dữ liệu**, không phải lỗi chức năng |

Hai lệnh parity đều trả exit **1** vì assertion pixel 3% ở D-V46-APP. Mỗi lane có
8 test pass (gồm helper của harness), 2 assertion pixel vượt ngưỡng; **không ghi thành PASS giả**.
Theo D-134, đây là phép đo tham khảo, không chặn DONE sau khi phân loại và kiểm ảnh.

## Đối chiếu ảnh

- App có thêm khối **Thiết bị này**, trạng thái quyền và nút đăng ký theo SPEC16/D-137;
  prototype không có khối này. Bảng loại thông báo vì vậy dịch xuống: không kéo ngược
  bảng để che phần bổ sung đã được owner yêu cầu.
- Khác sắp xếp/menu Cài đặt đã có thuộc B16, owner D-137 cho để sau; không mở rộng 816.
- Badge thông báo, số provider và dữ liệu native khác seed prototype; không sửa dữ liệu
  hay ledger để ép số giống ảnh. Cờ quốc gia giữ quyết định owner trước đó.
- Builder đã kiểm ảnh desktop/mobile; không phát hiện lệch bố cục mới ngoài phần bổ sung
  được duyệt. Ảnh tab mới không có đối chiếu prototype; native 390 đo doc/body width=390.
- Owner tiếp tục review cặp ảnh trên PR #98; không tự coi đó là owner đã duyệt ảnh.

### Cặp ảnh D-V46-APP

| Lane | 1440 | 390 |
|---|---|---|
| MSW | [prototype](ui-parity/v46-816/msw/D-V46-APP-1440.proto.png) · [app](ui-parity/v46-816/msw/D-V46-APP-1440.app.png) | [prototype](ui-parity/v46-816/msw/D-V46-APP-390.proto.png) · [app](ui-parity/v46-816/msw/D-V46-APP-390.app.png) |
| Native | [prototype](ui-parity/v46-816/native/D-V46-APP-1440.proto.png) · [app](ui-parity/v46-816/native/D-V46-APP-1440.app.png) | [prototype](ui-parity/v46-816/native/D-V46-APP-390.proto.png) · [app](ui-parity/v46-816/native/D-V46-APP-390.app.png) |

Tab mới: [native 1440](ui-parity/v46-816/native/Profile-push-1440.png),
[native 390](ui-parity/v46-816/native/Profile-push-390.png). Chụp trạng thái trình duyệt
chưa cho phép; không đăng ký dịch vụ đẩy thật để lấy ảnh. Trạng thái bật được kiểm bằng
browser protocol fixture và native API/outbox/BullMQ/HTTP stub trong E2E 8/8.
