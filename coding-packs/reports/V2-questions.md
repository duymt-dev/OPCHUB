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
| V2Q-28 | P2 / 201 | Tên 25 khoá | `<menu>.view` / `<menu>.action` + `groups.moderate`, `affiliate.payout`, `settings.general|mail|admins|log`; thứ tự theo `ADM_PERMS` prototype. Mọi TIP dùng đúng tên này | §21.2, V2Q-04 |
| V2Q-29 | P2 / 201 | TK quản trị cũ trong `users` sau khi chuyển bảng | Giữ id; dòng `users` soft-delete + email `<id>@moved.invalid` (giữ FK audit/tin nhắn) | D-52 |
| V2Q-30 | P2 / 201 | Thông báo cho TK quản trị (@nhắc phiếu YC) | Bỏ FK `notifications.user_id → users`; id có thể là thành viên hoặc quản trị | NA-22 |
| V2Q-31 | P2 / 201 | Mật khẩu tạm trong email đăng nhập TK quản trị ↔ D-47 | Gửi mật khẩu tạm theo RB-R02 + prototype (D-49 ưu tiên ver2); bắt buộc đổi lần đầu (SEC-R01). D-47 chỉ còn áp cho mail chào mừng thành viên | RB-R02, SEC-R01 |
| V2Q-32 | P2 / 202 | Email thành viên đăng nhập Admin | Sai MK → 401; đúng MK → 403 `WRONG_PORTAL` | RB-R03 |
| V2Q-33 | P2 / 202 | Quên mật khẩu cho TK quản trị | Không có; Super Admin đặt lại MK tạm | §21 không có |
| V2Q-34 | P2 / 202 | Thứ tự bước bắt buộc | Đổi MK lần đầu → thiết lập 2FA (nếu bắt buộc); trước khi xong phiên chỉ gọi được các route đó | SEC-R01/R02 |
| V2Q-35 | P2 / 203–204 | NA-28 làm mới menu khi quyền đổi | Server áp ngay ở request sau (cache Redis); FE refetch `/admin/me` khi đổi menu và khi nhận 403 `VIEW_ONLY`/`FORBIDDEN` | NA-28 |
| V2Q-36 | P2 / 203 | Quyền Marketing (§21.2 không có menu Marketing) | Gắn vào `settings.mail` | D-33 |
| V2Q-37 | P2 / 203 | Tải file xuất | Người tạo job, hoặc người có quyền `.action` của menu nguồn | NA-14 |
| V2Q-38 | P2 / 204 | Xem thử vai trò | Chỉ FE, không lưu qua reload; chặn mọi thao tác ghi khi đang xem thử | RB-R09 |
| V2Q-39 | P2 / 204 | Tab SSO, Ngôn ngữ (không có ở prototype ver2) | Giữ, nằm dưới `settings.general` | D-33 |
| V2Q-40 | P2 / 204 | QR 2FA | Dùng thư viện QR có sẵn trong repo; không có thì hiện secret + otpauth URL, ghi report (không thêm dependency khi chưa có lý do) | SEC-R02 |
| V2Q-41 | P5 / 501 | Giãn cách bot | Ngẫu nhiên 30 s – 5 phút, tôn trọng `delayMinutes` của kịch bản nếu < 5 phút; kịch bản không có `runAt` chỉ chạy bằng "Chạy ngay" | NA-08 |
| V2Q-42 | P5 / 501 | Persona ngoài giờ / kịch bản tắt giữa chừng | Bỏ lượt đó, hội thoại tiếp tục; kịch bản tắt → hội thoại dừng tại chỗ | NA-08 |
| V2Q-43 | P5 / 502 | Bot trả lời thành viên | 1 trả lời / tin thành viên, cooldown 2 phút / phòng, không trả lời tin persona; "Ẩn tin bot" đặt `hidden_at` mọi tin mô phỏng (tuỳ chọn theo nhóm) | QT-07, UAT-14 |
| V2Q-44 | P5 / 502 | Nhãn "Thành viên mô phỏng" | Chỉ ở Dashboard, mặc định tắt, không bao giờ hiện trong chat Portal | D-48 |
| V2Q-45 | P1 / 109 | BUG-016 liên hệ chủ dự án (NĐ 13) | Thêm `contact_email` / `contact_phone` công khai riêng cho dự án, điền sẵn từ hồ sơ khi tạo mới, chủ dự án sửa được; bỏ địa chỉ; dự án cũ để trống | QT-09, §15 |
| V2Q-46 | P1 / 109 | BUG-021 nút "Nhắn tin" | Bỏ; dùng Email / Zalo / Gọi theo QT-09 (SRS-3.6 không có chat 1-1) | QT-09 |
| V2Q-47 | P1 / 109 | Xuất đồng bộ 4 chỗ | Giữ đồng bộ, audit cùng transaction; link tải 1 giờ, mỗi lần lấy link ghi audit | NA-14 |
| V2Q-48 | P1 / 113 | Bản sửa dự án (D-18) | Bảng `project_revisions`; Bị từ chối là trạng thái cuối (§9); từ chối bản sửa thì giữ bản đang hiển thị | REQ-106, §9 |
| V2Q-49 | P1 / 113 | BUG-041 cạnh ngoài §9 | Sự kiện: giữ Đã hủy → Đã đăng ký (NA-23) và bỏ check-in (audit). Phiếu YC: bỏ `done`, gộp vào Thành công (§9) | §9, NA-23 |
| V2Q-50 | P1 / 113 | Tab chi tiết dự án | Cập nhật = mốc thật; Điểm nổi bật rỗng thì ẩn; Thư viện ảnh = ảnh bìa + ảnh đội ngũ; không thêm ô nhập mới | BUG-038 |
| V2Q-51 | P1 / 111 | Tệp chat | Whitelist pdf, docx, xlsx, pptx, zip, txt; ≤ 10 MB; ảnh ≤ 5 MB | §1.x upload |
| V2Q-52 | P1 / 112 | Đổi email | OTP gửi email mới; báo email cũ bằng loại thư `account` mới; thu hồi phiên khác | BUG-030 |
| V2Q-53 | P1 / 113 | BUG-027 sidebar | Viết e2e tái hiện trước; không tái hiện được thì ghi bằng chứng, không sửa mò | BUG-027 |
| V2Q-54 | P1 / 114 | NA-05 hạn mức | Giữ 20 suất/ngày cho OTP; chiến dịch dời 08:00 hôm sau; thử lại 1 + 3 lần; huỷ nhận chỉ chặn thư chiến dịch | NA-05 |
| V2Q-55 | P1 / 115 | Lint `e2e/audit` | Đo lại: 16 lỗi (không phải 11), sửa hết | TD-032 |
| V2Q-56 | P1 / 105 | Màn đặt lại mật khẩu (prototype không có) | Tiêu đề "Đặt lại mật khẩu", nút "Cập nhật mật khẩu", theo khuôn màn Quên mật khẩu | QT-02 |
| V2Q-57 | P1 / 105 | Hạn link đặt lại: QT-02 15 phút ↔ prototype 30 phút | 15 phút (đặc tả > prototype); sửa copy | QT-02 |
| V2Q-58 | P1 / 105 | Link thông báo phí đã kích hoạt | `/dashboard` (Portal không có `/membership`) | BUG-023 |
| V2Q-59 | P1 / 105 | Trang `/huong-dan` | Trang tĩnh tối thiểu theo các bước §6; nội dung đầy đủ chờ PM | BUG-023 |
| V2Q-60 | P1 / 104 | Nhóm làm chủ của TK bị khoá chuyển cho ai | Super Admin active cũ nhất; sau TIP-V2-201 dùng TK Super Admin trong `admin_users` (cùng id) | D-55 |
| V2Q-61 | P1 / 104 | Ẩn dự án của TK bị khoá | Lọc `owner.status = active` khi truy vấn; không đổi `projects.status` (mở khoá tự hiện lại) | NA-16, D-55 |
| V2Q-62 | P1 / 107 | Ai gửi vào luồng nhà đầu tư | Admin ↔ nhà đầu tư; chủ dự án không gửi (prototype); NĐT trả lời không tạo thông báo cho Admin (§12 không yêu cầu), Admin thấy qua badge | IV-R01/R02 |
| V2Q-63 | P1 / 108 | Chuyển thiếu tiền | Không tự kích hoạt (NA-03); kế toán vẫn khớp tay được, bắt buộc lý do + audit (QĐ-01) | NA-03, QĐ-01 |
| V2Q-64 | P1 / 102 | Giới hạn body | JSON 768kb, form 64kb; ảnh đi presign nên không qua body | TD-015 |
| V2Q-65 | P1 / 103 | Biến `{{nhom}}` trong mail | Nhóm đầu tiên của người nhận | NA-27 |
| V2Q-66 | P1 / 103 | Phạm vi làm sạch chuỗi thường + `target` của link | Mọi `ZodBody` (trừ `raw`) bỏ thẻ HTML cho chuỗi không khai báo rich (kể cả kịch bản bot, lời chào mail chào mừng, tên, ghi chú); `{{nhom}}` = nhóm `member` tham gia sớm nhất; `<a target>` chỉ giữ `_blank` | NA-27, security.md |
| V2Q-67 | P1 / 104 | Admin (chưa có socket) phát hiện bị thu hồi phiên | REST: 403 đúng thông điệp khoá → `/login?reason=locked`; 401 → refresh ra TK `member` → `/login?reason=role_changed`; MSW mô phỏng khoá bằng cookie `opchub-mock-locked` (request kế tiếp nhận 403 như guard). `user.locked` replay sau khi đã mở khoá không chuyển nhóm (chỉ TK còn `locked`) | NA-16, NA-28, D-55 |
| V2Q-68 | P1 / 105 | Mật khẩu yếu ở màn đặt lại có làm mất link không | Không: server kiểm độ mạnh TRƯỚC khi `GETDEL` token → báo tại ô, sửa rồi gửi lại được; link chỉ mất khi đặt lại thành công | QT-02 |
| V2Q-69 | P1 / 105 | Mở `/requests?code=` khi phiếu không nằm trong lọc/trang hiện tại | Đặt `q=<code>`, `status=all`, `page=1` rồi mở drawer; Admin AuthGate giữ cả query trong `next` để link thông báo sống qua bước đăng nhập | BUG-023 |
| V2Q-70 | P1 / 105 | MSW đặt lại mật khẩu cho TK nào | Portal → TK thành viên demo, Admin → TK quản trị demo (D-62); link đã dùng ghi cookie `opchub-mock-reset-used` (như GETDEL); mật khẩu mới có hiệu lực tới khi tải lại MSW | QT-02, D-63 |
| V2Q-71 | P1 / 107 | Lời nhắn kèm "Quan tâm đầu tư" có vào luồng trao đổi không | Không: lời nhắn nằm ở `investor_interests.message` (Admin thấy ở "Dự án đã quan tâm", chủ dự án thấy ở danh sách NĐT); luồng mới trống như prototype ("Admin OPC Hub sẽ phản hồi…"). Seed demo bỏ tin mở đầu `<id>-m0`, giữ 2 tin mẫu của Nguyễn Hoàng Nam. Dữ liệu cũ đã chuyển qua migration giữ nguyên | IV-R02, prototype P-71 |
| V2Q-72 | P1 / 107 | MSW: Portal và Admin là hai CSDL giả, UAT-20 cần chung dữ liệu | Cầu cookie `opchub-mock-iv` (cùng host, khác cổng → chung `document.cookie`): quan tâm + tin trao đổi vừa ghi chép vào cookie, app kia gộp ở request kế tiếp; tin Admin gộp vào Portal sinh thông báo `invest`. Chỉ cho MSW/e2e, không ảnh hưởng server | D-63, UAT-20 |
| V2Q-73 | P1 / 107 | Người gửi trong luồng & khoá gom MSW | Server: `from_investor` → tên NĐT; tác giả là TK quản trị (`system_role <> member`) hoặc không còn → "Admin OPC Hub"; tác giả `member` khác (tin cũ chủ dự án đã chuyển) → họ tên. MSW gom NĐT theo tên (trước: tên\|tổ chức) cho khớp server gom theo người. Đổi trạng thái tiến: tổng hợp đổi có điều kiện `from`, quan tâm còn ở bước trước được kéo lên `to` (không bao giờ lùi) | IV-R02, §9, NA-11 |
| V2Q-74 | P1 / 110 | Thứ tự `fields` server khi phiếu sai nhiều chỗ; SĐT/email ở server | Zod kiểm trường gốc trước (tên ≥ 2, SĐT `^[+0-9 ().-]{9,}$` ≤ 20 ký tự — trước đây min 6, email), chỉ khi qua mới chạy luật theo đối tượng theo đúng thứ tự FE: tên DN → loại hình → MST → quy mô → chức vụ → nghề nghiệp → tỉnh → nhu cầu. `fields[0]` vì vậy trùng lỗi đầu của form; message tiếng Việt lấy chung `SERVICE_REQUEST_ERRORS` (khớp `services.json › error.*`) | QT-11, UAT-21, api-conventions |
| V2Q-75 | P1 / 110 | `details` khoá lạ / giá trị rỗng | Server + MSW bỏ khoá ngoài `SERVICE_DETAIL_LABELS` và giá trị chỉ có khoảng trắng trước khi lưu (`normalizeServiceDetails`); phiếu đã lưu trước TIP giữ nguyên `details` (không migrate; seed demo không có `details`) | QT-11, security (không tin client) |
| V2Q-76 | P1 / 110 | Parity P-79 → P-83 không chạy được | Prototype SRS-3.6 đã thay popup Gói dịch vụ bằng bản V4 (không còn chữ "Chương trình & dịch vụ khác") → kịch bản parity hết hạn ngay cả ở HEAD trước TIP; thuộc TIP-V2-302. TIP này chỉ bổ sung bước điền quy mô/chức vụ vào kịch bản P-83 | TIP-V2-302, ui-parity |
