# SPEC v4.6 delta: v4.2 → v4.6 (scan 30/10/2026)

> Nguồn: gói `docs/ver 4.3/` (README ghi v4.6 · 29/10/2026; `dac-ta.html` ghi v4.6 · 28/10/2026) owner gửi.
> Đã chép đè vào `docs/spec/` (`dac-ta.html`, `index.html`, `README.md`) rồi xoá `docs/ver 4.3/`.
> `assets/`, `support.js`, `doc-page.js`, `mau-bao-cao/` giống hệt bản cũ (so byte). PDF giữ nguyên.
>
> So với: `docs/spec/*` trên `dev` `a04ebf1f` (gói v4.2) và code trên `dev`.
>
> **Chưa có D-xx cho gói này.** D-93 (prototype thắng khi lệch, thay đổi backend / lớn hỏi owner
> trước) vẫn áp dụng: mọi mục "Backend" dưới đây chờ owner chốt Q-V4.6-x, chưa làm.

## 1. Tài liệu thay đổi gì

Đặc tả thêm 4 mục (§30 → §33); §1–29 không đổi nội dung, chỉ đổi tiêu đề / số phiên bản.

| Mục | Nội dung | Ghi chú |
|---|---|---|
| §30 (v4.3) | Chia sẻ doanh thu 3 năm, 3 bên Media Soft / GĐ Vùng / Trưởng nhóm: năm 1 50/30/20, năm 2–3 70/20/10, từ năm 4 không ghi nhận. CS-01 → CS-06 | Tự ghi thay §29 (Gọi vốn 93/5/2, hoa hồng Gọi vốn 10%). **Bị §31 thay** |
| §31 (v4.4) | Media Soft **chỉ chia với GĐ Vùng**: 50 → 40 → 30 → 20% (tối thiểu 20%, không giới hạn năm). Công thức `max(min, y1 − giảm × (y − 1))`, 3 thông số cấu hình. CS-11 → CS-15: chỉ khách qua link affiliate (cookie 30 ngày, lần giới thiệu đầu); affiliate gán GĐ Vùng theo tỉnh; chi trả cuối tháng từng GĐ Vùng; **bỏ chi trả trực tiếp cho affiliate** | Thay §30 |
| §32 (v4.5) | Bổ nhiệm / thu hồi GĐ Vùng (QT-32): chỉ từ thành viên đã đăng ký, không gửi mật khẩu; trạng thái phí mới **"Miễn phí · GĐ Vùng"**; thu hồi → về phí thực tế / Chờ thanh toán. GDV-R01 → R08, quyền "Bổ nhiệm / thu hồi GĐ Vùng", API `POST/PATCH/DELETE /admin/gdv`, email EM-GDV1/2, AT-GDV01 → 07 | Bổ sung §31.4 |
| §33 (v4.6) | Nhóm 1 sửa lỗi (BR-461 → 465), nhóm 2 doanh thu (BR-471 → 480), nhóm 3 quản trị (BR-481 → 486), nhóm 4 trải nghiệm (BR-491 → 495), TC-461 → 494, VM-461 → 465 | Mới nhất |

Thứ tự hiệu lực theo README mới: **§33 > §32 > §31 > (§30 bị thay) > §29 > §28 > §27 > §1–26**.

## 2. Prototype `index.html` thay đổi (+475 / −73 dòng)

| # | Màn | Thay đổi | Code hiện tại | Loại |
|---|---|---|---|---|
| P1 | Đăng nhập / trang chào | Tiêu đề "CỘNG ĐỒNG DOANH NGHIỆP MỘT NGƯỜI" (bỏ "· QUỐC TẾ"), slogan "Liên kết chuỗi cung ứng, mở rộng thị trường", 4 khối giá trị mới | Copy v4.2 | UI nhỏ |
| P2 | Topbar Portal + Admin | Ô **tìm kiếm chung** (BR-491): Gian hàng / Nhu cầu / Dự án / Nhóm (+ Thành viên ở Admin), 4 kết quả/nhóm, Enter/Esc | Ô tìm cục bộ (`602e7c5e`) | Backend vừa (API search) |
| P3 | Dashboard Portal | Thẻ "Nhu cầu phù hợp với gian hàng của bạn" (BR-478 → 480): điểm ngành +50 / tỉnh +30 / từ khóa +7 (≤ 20), ≥ 30 điểm, top 3, trần 98% | Không có | Backend vừa |
| P4 | Gian hàng của tôi | Khối "Trang công khai" `/g/<slug>` (BR-494): bật/tắt Google, tiêu đề, mô tả ≤ 160, sao chép link, xem như khách | Không có | **Backend + FE lớn** (route công khai, SEO, slug) |
| P5 | Portal › Affiliate | Tab **"Vùng của tôi"** cho GĐ Vùng (chỉ xem): doanh thu vùng, phần GĐV theo năm của khách, affiliate trong vùng, lịch sử chi trả; banner GĐ Vùng; nhãn affiliate gọn (BR-495) | Không có | **Backend lớn** |
| P6 | Admin › Affiliate › GĐ Vùng / Cấu hình GĐ Vùng (mới) | Bổ nhiệm / thu hồi, chọn thành viên, vùng, tỉnh (bấm chọn), tài khoản nhận, lịch sử; khoản ghi nhận, "Phải chi cuối tháng", nút Chi trả từng GĐ Vùng | Không có | **Backend lớn** (bảng GĐ Vùng, sổ chia sẻ, kỳ chi) |
| P7 | Admin › Affiliate › Chính sách | Bảng "Quy tắc chia sẻ Media Soft ↔ GĐ Vùng" (GĐV năm 1, giảm / năm, mức tối thiểu), phần GĐV theo từng gói năm 1 → từ năm 4 | % hoa hồng affiliate (D-70, D-110) | **Đổi nghiệp vụ** |
| P8 | Admin › Affiliate › Hoa hồng | Cột "Thuộc vùng (theo tỉnh)", "Xem đối soát", "GĐ Vùng chi"; **bỏ nút chi trả trực tiếp** | Chi trả từng đại lý | **Đổi nghiệp vụ** |
| P9 | Admin › Phí thành viên | Trạng thái "Miễn phí · GĐ Vùng" | Không có | Backend (enum + máy trạng thái §32.3) |
| P10 | Admin › Tổng quan | Bảng "Chuyển đổi miễn phí → trả phí theo vùng" (BR-475 → 477) + Xuất CSV | Không có | Backend nhỏ (tổng hợp) |
| P11 | Admin › Cài đặt › Nhắc gia hạn (mới) | Mốc 30 / 7 / 1 ngày, kênh Email / Zalo / Thông báo (≥ 1 kênh), gửi tay từng người / tất cả, cột Lần gửi (BR-471 → 474) | Không có | **Backend lớn** (job, Zalo ZNS = adapter mới) |
| P12 | Admin › Cài đặt › Đối soát ngân hàng (mới) | Webhook URL, khóa bí mật + tạo lại, bật/tắt tự kích hoạt, cú pháp **`OPC <SĐT> <GÓI>`**, giao dịch gần đây (Đã khớp / Gán thủ công / Không khớp / Thiếu tiền), Gán, Ghi nhận thiếu (BR-481 → 484) | Có `bank-webhook` + đối soát theo D-104 (`OPCHUB …`) | Backend vừa; **cú pháp xung đột** (§4) |
| P13 | Admin › Cài đặt › Nhà cung cấp AI | Nhiều nhà cung cấp (Media Soft, OpenAI-compatible tùy chỉnh), kiểm tra kết nối, phân bổ theo chức năng + dự phòng, max tokens, ngân sách tháng, cảnh báo %, nhật ký gọi AI 90 ngày, ẩn PII | `llm-tab` một cấu hình | Backend vừa |
| P14 | Admin › Cài đặt › Ứng dụng & thông báo (mới) | Bật PWA, 5 loại thông báo đẩy, gửi thử (BR-492, 493) | Không có | **Backend lớn** (Web Push, VM-463) |
| P15 | Admin › Nhật ký hoạt động | Ghi mọi thao tác thành công (người, thao tác, nhóm, thời gian), 90 ngày, Xuất CSV (BR-485, 486) | Có `audit_logs` | Kiểm lại phủ + màn + CSV |
| P16 | Admin › Marketing › Email | 2 mẫu "Thông báo bổ nhiệm / thu hồi GĐ Vùng" (EM-GDV1/2, BR-464) | Không có | Theo P6 |
| P17 | Cài đặt › Vai trò & phân quyền | Quyền "Bổ nhiệm / thu hồi GĐ Vùng (miễn phí thành viên)"; Kế toán / Giảng viên / Biên tập chỉ xem | Không có | Backend nhỏ (permission key) |
| — | Seed | 3 GĐ Vùng thử nghiệm (`bao.tran@solobooks.vn`, `hai.lm@mediasoft.vn`, `ha.pt@mediasoft.vn`), giao dịch mẫu | — | Theo P6 |

## 3. Sửa lỗi nhóm 1 (§33.1) — đối chiếu code

| BR | Nội dung | Cần kiểm |
|---|---|---|
| BR-461 | Chat nhóm không treo: đếm đã đọc chỉ khi đổi phòng / có tin mới | Lỗi của prototype; kiểm hook đã đọc ở `RoomView` |
| BR-462 | Thu hồi GĐ Vùng giữ hạn phí cũ | Theo P6 |
| BR-463 | Không sinh hoa hồng 0đ (TK miễn phí, giao dịch 0đ); ẩn khoản 0đ cũ | Kiểm worker hoa hồng hiện tại |
| BR-465 | Tự mở khóa khi hết hạn khóa; kiểm 15 giây + mỗi lần đăng nhập | Code đã có khóa có hạn; 15 giây là cơ chế prototype — server nên kiểm lúc đăng nhập + job |

## 4. Mâu thuẫn cần owner chốt (Q-V4.6-x)

| Q | Nội dung | Ảnh hưởng |
|---|---|---|
| Q-V4.6-1 | **Mô hình chia sẻ §31** thay hoa hồng affiliate hiện hành (D-70, D-110, BR-AFF-REV, §29 Gọi vốn 10%): Media Soft chỉ chi cho GĐ Vùng, bỏ chi trả trực tiếp affiliate. Khoản hoa hồng affiliate đã ghi nhận / chờ chi xử lý thế nào? Có migration không? | Đổi nghiệp vụ tiền lớn |
| Q-V4.6-2 | Mỗi vùng **đúng 1** GĐ Vùng (prototype, §31.4) hay **tối thiểu 1** (GDV-R06)? | Ràng buộc DB |
| Q-V4.6-3 | Cú pháp CK đối soát ngân hàng **`OPC <SĐT> <GÓI>`** (§33.3, P12) khác D-104 / BR-PAY-REF **`OPCHUB …`** (§28.1). Theo cái nào? | Đối soát, VietQR, nội dung CK đã phát hành |
| Q-V4.6-4 | Phân bổ AI có dòng **"Trợ lý OPC Hub (widget)"** (P13) — D-92 đã bỏ Trợ lý. Giữ bỏ, chỉ ẩn dòng này? | Nhỏ |
| Q-V4.6-5 | Tích hợp ngoài: cổng đối soát (VM-461), Zalo ZNS (VM-462), Web Push (VM-463) — làm adapter + fake provider trước hay chờ hợp đồng? | Adapter mới trong `packages/integrations` |
| Q-V4.6-6 | Phạm vi & thứ tự các mục backend lớn: GĐ Vùng (P5 → P9, P16, P17), Nhắc gia hạn (P11), Trang công khai `/g/` (P4), Tìm kiếm chung (P2), Gợi ý nhu cầu (P3), Nhà cung cấp AI (P13), PWA (P14) | Mỗi mục một TIP |
| Q-V4.6-7 | "Năm của khách" tính từ **ngày giao dịch thực thu đầu tiên** (§30.2) — áp cho TK đã đóng phí trước v4.6 thế nào (backfill từ khoản đầu tiên đã đối soát?) | Migration dữ liệu |

## 5. Việc nhỏ làm được không cần chốt (theo D-93 / D-101)

- P1 copy trang đăng nhập / trang chào.
- P10 bảng chuyển đổi theo vùng (chỉ đọc, từ bảng phí thành viên — VM-464).
- BR-463 không tạo hoa hồng 0đ (nếu code đang tạo).

Parity: các màn P1 → P17 có baseline mới; kết quả `ui-parity/results.*` của các màn này hết hiệu
lực cho đến khi đo lại.
