# V46-801 — Portal exemption checkpoint (PARTIAL)

## Phạm vi

- Sidebar và Hồ sơ → Gói & thanh toán hiển thị **Miễn phí · GĐ Vùng** khi trạng thái hiện hành được `isFeeExempt` xác định miễn phí.
- Không dùng hạn phí cũ làm hạn miễn phí, không countdown hoặc gợi ý gia hạn/đóng phí ở hai vị trí này. Không sửa dữ liệu hạn phí trong phiên.
- Giữ Xem bảng giá, lịch sử phí thực thu và khoản Gói Gọi vốn riêng biệt. Thu hồi về pending_payment lập tức trả lại nút thanh toán khi phiên cập nhật.
- Thêm hai khóa dịch cho đủ 10 bộ ngôn ngữ, không bỏ kiểm tra D-65.

## Bằng chứng và giới hạn

- Đã mở prototype thật bằng Chromium: đăng nhập An và Bảo. Bảo là m3/GĐ Vùng nhưng sidebar prototype vẫn yêu cầu phí trong khi onboarding đánh dấu hoàn thành. Q-V46-801-7 ghi việc ưu tiên D-120/REQ-616, không sửa baseline hoặc gắn PASS cho ảnh chưa so.
- `plan-badge.spec.tsx`: 6 test, gồm hạn null/quá khứ/gần/tương lai, Xem bảng giá còn hoạt động, thu hồi và hồi quy gia hạn tài khoản thường.
- `billing-tab.spec.tsx`: 5 test, gồm hạn null/quá khứ/tương lai, không làm mất hạn gốc, thu hồi, lịch sử phí và Gói Gọi vốn vẫn hiện đúng khoản chờ thanh toán.
- Focused component **11/11 passed**; D-65 messages **145/145 passed**. Lần root test đầu phát hiện thiếu bản dịch: đã bổ sung đủ bản dịch, không nới assertion.
- Git source: `33a412db`; correction test public facade: `db955433`. Root `lint`, `typecheck`, `test`, `depcheck` đều exit 0 sau sửa. Unit **1977 passed + 2 existing S3 skipped**, trong đó Portal 403; chi tiết ở progress. Không dùng unit test để chứng minh native browser, mail relay hoặc parity.

## Còn thiếu — vẫn ở V46-801

1. Admin cấu hình ba vùng + MSW/persistence và seed ba GĐ Vùng.
2. Payment guard đã bổ sung ở `02e912ec` (xem dưới); còn chứng minh bằng browser MSW/native với cùng assertion.
3. P9 bộ lọc/phân loại phí Admin, P16 mail template, P17 quyền; mail outbox→fake provider→link browser.
4. Full test:int/build/e2e MSW và native cùng assertion, parity 1440/390 ≤3%, lưu metrics EXPLAIN đầy đủ.

Không thay DB, `.env`, provider hoặc tiến trình HOLD ở checkpoint này. Không báo TIP-DONE, không sang V46-802.

## Payment guard checkpoint — `02e912ec`, `fdfd707b`

- Bảng giá giữ đủ ba nút: gói hiện hành bị vô hiệu với nhãn miễn phí; Gói Gọi vốn vẫn đăng ký có thu phí riêng. Không đổi giá cấu hình hoặc đưa hằng số giá vào code chạy thật.
- `useMembership` cung cấp exemption từ cùng cổng shared. Direct `/membership/pay` dựng bảng giá ngay thay vì thông tin ngân hàng, dùng replace URL; mọi đường `toPay` bị chặn khi miễn.
- Xác nhận CK bị chặn ở hook; bổ nhiệm lúc chờ kết thúc waiting mà không tạo toast “đã nhận tiền”, không ghi đè session từ hạn snapshot. Vẫn kiểm hồi quy webhook kích hoạt thật. Trạng thái trong session đủ chặn lúc GET membership đầu chưa xong.
- Backend `transfer-confirm` khóa dòng phí trong transaction, kiểm exemption trước khi ghi consent; trạng thái từ DB hiện hành thắng token cũ. MSW trả cùng 409, không lên lịch webhook giả.
- Native `membership.int.spec.ts`: **5/5 passed**, bao gồm case mới không consent/đổi phí. Unit mới: PlanCards 4, paywall hook 4, transfer-confirm hook 6, MSW handler 1 = **15**. Root **1992 passed + 2 existing S3 skips** (Portal 418); lint/typecheck/depcheck pass. Không nới assertion hoặc thêm retry/timeout.
- Full build **3/3 tasks successful**, exit 0: server + Portal + Admin. Frontend dùng `NEXT_DIST_DIR=.next-v46-msw-build`, mocking msw; output riêng được loại khỏi Git qua local exclude, không đè build frontend HOLD hoặc sửa `.env`. Không restart API/socket/worker; build không chứng minh listener đang chạy code mới.
- Full integration lần đầu phát hiện seed test còn đếm 53 grants trong khi D-120 thêm `affiliate.gdv`. `fdfd707b` cập nhật tổng chính xác 54 và kiểm riêng **chỉ** role admin có grant này; không dùng `>=` hoặc bỏ kiểm tra. Rerun đã kết thúc exit 0: DB **125/125**, 26 files; server **1750/1750**, 186 files, tổng **1875** integration cases. Xem Admin checkpoint cho cổng unit/build mới nhất.
- Đã mở bảng giá prototype thật bằng Chromium với Bảo; giữ sai khác cần thiết theo Q-V46-801-7. Chưa có ảnh so app hoặc % parity.
