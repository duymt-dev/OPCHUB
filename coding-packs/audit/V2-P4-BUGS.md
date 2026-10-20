# V2-P4 — Findings phát sinh khi kiểm Affiliate

## BUG-045 · S2 · Cache server-state của tài khoản trước còn sau đăng xuất

- **Phát hiện:** AT-AF02, trên MSW. Đăng ký khách qua HAOPC, đóng phí, khai STK,
  đăng xuất rồi đăng nhập Lê Thu Hà trong cùng tab bằng điều hướng SPA.
- **Thực tế trước sửa:** hộp chào mừng mở lại với tên Lê Thu Hà nhưng email/nội dung
  của khách vừa đăng xuất. Mask của hộp chặn thao tác Affiliate, test timeout.
  Provider giữ cùng QueryClient; các key `me`/welcome/affiliate không có identity
  boundary. Không suy diễn rằng backend đã trả dữ liệu sai người.
- **Mong đợi:** AU-09 yêu cầu xóa query cache khi đăng xuất; chuyển danh tính không
  được dùng dữ liệu riêng của người trước. Refresh cùng danh tính không mất cache.
- **Sửa:** `providers/session-query-boundary.tsx` đăng ký subscription đồng bộ vào
  auth store, clear QueryClient khi `me.id` đổi. AppProviders chỉ nối component.
  Query đang chạy của người cũ bị loại; response muộn không ghi vào cache mới.
- **Regression:** bốn test `session-query-boundary.spec.ts`; AT-AF02/BUG-045 cùng
  assertion trên MSW/native, đi hết đến khách mới + hoa hồng 150.000đ của HAOPC.
- **Trạng thái:** CLOSED, source `f821b0e`, bổ sung `32f6112`. Bốn unit pass;
  AT-AF02 pass trong lượt MSW 25/26 và native 26/26. Lỗi còn lại của lượt MSW
  thuộc UAT-11 đăng nhập sau đổi mật khẩu, không phải luồng đổi danh tính này.
  Log tại `../reports/evidence/v2-403/acceptance/`; không suy rộng thành DONE Pha 4.

## Ghi chú kiểm thử

### MSW-404-01 · CLOSED · Admin F5 luôn về đăng nhập

- E2E `admin-affiliate.spec.ts` xác nhận URL/search trước reload nhưng sau F5
  rơi về login. Chỉ là gap của backend/gate MSW; không tuyên bố native refresh lỗi.
- Source trước sửa: `/admin/auth/refresh` trả 401 cố định; AuthGate/SetupGate
  khởi tạo `tried=true` khi MSW nên không thử khôi phục phiên.
- Sửa `7c12a6f`: fake session cookie chỉ chứa account id, grant đọc mới từ backend,
  logout clear, account unknown/locked không khôi phục. Hai gate refresh đồng nhất
  native/MSW. Không lưu access/refresh credential thực hoặc permission vào cookie.
- Bằng chứng: 3 unit fake session + 4 unit gate; E2E F5 vẫn giữ assertion search/
  ba kết quả AF0 và dòng theo cặp khách/đại lý, pass trong MSW suite 25/25.
  Xem `../reports/evidence/v2-404/msw-checkpoint/`. Chưa dùng để chốt toàn TIP-404.

- Clipboard E2E tìm nút theo nhãn tiếng Việt đã phát hiện icon AntD thêm `copy`
  vào accessible name. Thêm nhãn hành động và đánh dấu icon trang trí; unit giữ
  truy vấn tên chính xác (regex neo hai đầu), không nới assertion theo target.
- Mock webhook trước đây dùng mốc seed cho `paidAt`, có thể trước lúc khách đăng
  ký. Webhook nay truyền thời điểm thực; unit kiểm qua ranh giới tháng Việt Nam
  và gia hạn nối tiếp. Không thay timestamp seed tĩnh của các fixture khác.
- Dataset paused là tiền điều kiện riêng: kỳ phí một năm kết thúc 19/10/2026,
  bao phủ mọi khoản cũ của HAOPC. Native integration xác nhận quan hệ/ngày; không
  sửa luật chuyển trạng thái sản phẩm hoặc thêm endpoint dev để bỏ qua guard.
