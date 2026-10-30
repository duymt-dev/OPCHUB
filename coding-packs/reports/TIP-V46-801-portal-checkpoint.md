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
2. Bảng giá `PlanPanel`/`PlanCards` vẫn cho gói hiện hành vào luồng gia hạn; phải hiển thị trạng thái miễn và chặn thao tác phí thành viên, giữ Gói Gọi vốn. Kiểm cả direct `/membership/pay` và bổ nhiệm khi hộp chuyển khoản đang mở. Hai vị trí sửa ở checkpoint này không chứng minh phần đó.
3. P9 bộ lọc/phân loại phí Admin, P16 mail template, P17 quyền; mail outbox→fake provider→link browser.
4. Full test:int/build/e2e MSW và native cùng assertion, parity 1440/390 ≤3%, lưu metrics EXPLAIN đầy đủ.

Không thay DB, `.env`, provider hoặc tiến trình HOLD ở checkpoint này. Không báo TIP-DONE, không sang V46-802.
