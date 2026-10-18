# GOAL V2-BUILD — Câu hỏi và lựa chọn tạm

> Chỗ mơ hồ gặp khi làm V2. Theo GOAL: **chọn theo SRS-3.6, ghi lại ở đây, không hỏi giữa chừng.** PM / Chủ nhà đọc và đổi nếu cần.
> Cột "Chọn" là hành vi đang được code. Đổi lựa chọn thì sửa dòng này + mở TIP sửa.

| # | Pha / TIP | Câu hỏi | Chọn | Nguồn |
|---|---|---|---|---|
| V2Q-01 | P0 | Thuế TNCN trên hoa hồng affiliate: hệ thống có cần khấu trừ / xuất chứng từ không? | Không khấu trừ trong hệ thống; số tiền hoa hồng là số chi trả; báo cáo CSV đủ để kế toán xử lý ngoài | §20 không nhắc thuế |
| V2Q-02 | P0 | Câu chữ "không hoàn lại" và điều khoản: bản pháp lý chính thức? | Dùng nguyên câu chữ prototype ver2; lưu phiên bản điều khoản + thời điểm đồng ý (REQ-013) để thay câu chữ không mất vết | NR-R02, D-58 |
| V2Q-03 | P0 | Giá niêm yết 200.000đ/tháng (V4) vs 2.400.000đ/năm (SRS cũ) | Hiển thị theo V4 (D-58) | §23.5 |
| V2Q-04 | P4 / 402 | §21.2 có 3 dòng quyền Affiliate (Xem / Sửa % + hủy / Chi trả) nhưng D-52 ghi `<menu>.view` / `<menu>.action` | 25 khoá = 25 dòng §21.2; menu có > 2 dòng dùng khoá riêng (vd `affiliate.payout`). Tên chốt theo TIP-V2-201 | §21.2 |
| V2Q-05 | P4 / 401 | Hoa hồng tính trên số tiền nào? | `membership_fees.amount` (600.000), không theo số tiền CK thực | AF-R06 |
| V2Q-06 | P4 / 401 | "Đại lý tạm dừng lúc khách đóng phí" xét theo gì? | `paused` **hoặc** `valid_until` < thời điểm xác nhận (không phụ thuộc giờ chạy job) | AF-R07, D-57 |
| V2Q-07 | P4 / 402 | Chi trả tháng khi nào? | Chỉ tháng đã kết thúc (giờ VN) | AF-R09 |
| V2Q-08 | P4 / 402 | Đổi % áp cho khoản nào? | % riêng đại lý: tính lại mọi khoản Đã ghi nhận của đại lý; % mặc định Chính sách: chỉ đại lý mới | AF-R08 |
| V2Q-09 | P4 / 401 | Cách sinh mã | Theo `mkCode` prototype: từ cuối tên bỏ dấu ≤ 6 ký tự + `OPC` + 2 số; trùng thì sinh lại / thêm số | AF-R01 |
| V2Q-10 | P4 / 402 | Ghi nhận click | Chỉ khi đại lý active; chống trùng IP + mã / giờ; cookie `opc_ref` theo `cookie_days`; ưu tiên `?ref=` > cookie > nhập tay | AF-R03 |
| V2Q-11 | P4 / 401 | Thành viên đã đóng phí trước khi có module | Backfill tạo đại lý một lần (idempotent) | AF-R01 |
| V2Q-12 | P4 / 403 | Đại lý Tạm dừng thấy gì ở Portal? | Vẫn thấy link, mã, thống kê + dải cảnh báo gia hạn | AF-R07 |
| V2Q-13 | P4 / 403 | Chia sẻ Zalo | `https://zalo.me/share?url=` tab mới | §20.6 |
| V2Q-14 | P4 / 404 | e2e AT-AF05 cần làm phí hết hạn trên server | Helper e2e cập nhật `valid_until` qua SQL trên DB test (không thêm endpoint production) | AT-AF05 |
| V2Q-15 | P4 / 402 | Trang Affiliate khi chưa đóng phí | `/affiliate` + `GET /me/affiliate` không bị paywall chặn để hiện khung AF-R02 | AF-R02, NA-02 |
| V2Q-16 | P3 / 302 | Ô đồng ý ở form DN của prototype ver2 thiếu cụm "không hoàn lại" | Thêm cụm này cho đúng NR-R02 (đặc tả > prototype) | NR-R02 |
| V2Q-17 | P3 / 302 | Ngưỡng chữ nhỏ nhất khi popup V4 tự thu nhỏ (KT-04) | Làm theo prototype, không chặn tỉ lệ dưới; ghi DV | §23.6 KT-04 |
| V2Q-18 | P3 / 302 | `FEATURE_SERVICES` | Bật mặc định (D-51); flag chỉ còn là công tắc khẩn cấp | D-51 |
| V2Q-19 | P3 / 301 | Lỡ job nhắc phí / quá hạn lâu | Mỗi lượt gửi mốc muộn nhất chưa gửi; quá hạn > 10 ngày ngừng nhắc tự động; `pending_payment` chỉ nhắc tay; gia hạn → chu kỳ nhắc mới theo `valid_until` | NA-04 |
| V2Q-20 | P3 / 303 | "Tạo link Meet", "đã diễn ra", đóng tay | Mở `meet.google.com/new` (D-59); đã diễn ra theo `ends_at` (thiếu → `starts_at + 2h`); Admin đóng tay thì scheduler không mở lại | EV-R01, NA-23 |
| V2Q-21 | P3 / 304 | Form nhóm prototype ver2 vẫn ghi "Thêm điều phối viên" | Đổi thành "Thêm giảng viên" (D-56); Giảng viên trong nhóm không duyệt yêu cầu, không ghim | GR-R01/02 |
| V2Q-22 | P3 / 304 | NA-18 gợi ý nhóm "theo tỉnh" nhưng form không có ô tỉnh | Gợi ý theo vai trò như prototype, không thêm ô | NA-18 |
| V2Q-23 | P3 / 305 | Khối Dashboard chưa có nguồn thật (quốc gia, phiên, thảo luận nổi bật) | Dựng từ dữ liệu thật nếu có; không có → trạng thái rỗng; cấm số giả | NA-24 |
| V2Q-24 | P3 / 306 | NA-06 "MST đã có TK → báo trùng" ↔ OQ-12 (cho nhiều người cùng MST) | **Theo NA-06** (ưu tiên ver2): MST đã gắn TK doanh nghiệp → báo trùng, gợi ý Đăng nhập; OQ-12 coi như đã thay | NA-06, D-49 |
| V2Q-25 | P3 / 306 | NA-13 giữ audit ≥ 12 tháng nhưng màn Nhật ký chỉ đọc 90 ngày / 500 dòng | Giữ dữ liệu ≥ 12 tháng; màn Nhật ký thêm lọc khoảng ngày trong 12 tháng (phân trang server) | NA-13 |
| V2Q-26 | P3 / 306 | Form DN có cần chọn lĩnh vực từ danh mục (NA-20)? | Không; ngành nghề lấy từ MST như prototype | NA-20 |
| V2Q-27 | P3 / 3xx | Tên khoá quyền dùng trong TIP P3 | Builder dùng đúng tên khoá TIP-V2-201 chốt (khuôn `<menu>.view` / `<menu>.action` + khoá riêng cho dòng thứ 3) | D-52 |
