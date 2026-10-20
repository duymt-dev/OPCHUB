# TIP-V2-403 — tiến độ, chưa hoàn tất

## Checkpoint: đăng ký / link referral

- Nhánh `feature/V2-P4-affiliate`, tiếp nối TIP-402 (`ed73b06`).
- Code checkpoint đã commit/push: `ff6f4f1`; nhãn audit Admin: `684ab4a`.
- Đã thêm referral vào form cá nhân, doanh nghiệp và hoàn tất SSO; URL ưu tiên
  cookie cho giá trị ban đầu, sau đó người dùng vẫn sửa/xóa được.
- Kiểm mã debounce 400 ms, kiểm lại khi email đổi, chặn submit khi đang kiểm/lỗi,
  bỏ phản hồi cũ, hiển thị lỗi server tại trường `referralCode`.
- `/r/[code]` ghi click, lấy TTL từ chính sách backend, lưu cookie root SameSite=Lax
  (Secure khi HTTPS), chuyển sang đăng ký. Mã sai định dạng không ghi cookie.
- Lựa chọn thủ công được giữ qua OAuth bằng cookie; bỏ chọn xóa cookie cũ;
  tác vụ OAuth đã hủy không được ghi đè cookie hoặc điều hướng muộn.
- MSW dùng shared domain riêng, reset theo MockDb; đăng ký/SSO kiểm mã trước khi
  gắn referral; click có dedup; không gắn người chưa kích hoạt OTP.
- Tách subview/hook SSO mới, không dồn logic vào screen.
- Sửa layout thực: ô MST giãn hết vùng còn lại, chiều cao nhãn Quy mô theo
  prototype, dấu chọn/tên nhóm thành hai flex item với khoảng cách đúng.
- A-31/32 được bật lại, không nới ngưỡng 3% hoặc thay assertion theo target.

## Phát hiện tích hợp

- Admin thiếu nhãn cho audit tag `affiliate` mới từ TIP-402; bổ sung đúng một
  khóa `settings.log.tag.affiliate`, không thay nghiệp vụ Admin.
- Turbo task lint/typecheck/test hiện chưa khai báo phụ thuộc xuyên package;
  cache có thể bỏ sót thay đổi shared. Checkpoint này chạy lại bằng `--force`,
  không sử dụng kết quả cached để tuyên bố kiểm chứng source mới.
- Không sửa cấu hình Turbo ngoài phạm vi TIP; các gate chốt pha tiếp tục force.

## Còn phải làm (không được coi checkpoint này là DONE TIP-403)

- Màn `/affiliate`: locked/paused, hero, ngân hàng, chia sẻ, thống kê, hai tab,
  bộ lọc và phân trang theo URL, menu và paywall exception.
- Đồng bộ fixture AF0/native seed (gồm HAOPC), lịch sử khách/chi trả và kịch bản
  đăng ký → đóng phí → chủ mã thấy khách; hiện seed chỉ có đại lý cơ bản.
- AT-AF02 end-to-end đầy đủ, AT-AF05, locked/bank/tab/paging MSW + native.
- P-97/98, parity `/affiliate`, toàn bộ audit hồi quy trước chốt Pha 4.
- TIP-404 Admin, report P4/merge main; Pha 5 và nghiệm thu toàn goal chưa làm.

## Kiểm chứng checkpoint

| Lệnh / bộ kiểm cuối | Kết quả |
|---|---|
| `pnpm exec turbo run lint --force` | exit 0, 8/8 task, không cache; cảnh báo img hiện hữu |
| `pnpm exec turbo run typecheck --force` | exit 0, 8/8 task, không cache |
| `pnpm exec turbo run test --force` | exit 0, 6/6 task; 553 passed, 2 integration-provider test skipped hiện hữu |
| `pnpm depcheck` | exit 0, cả hai đồ thị không vi phạm |
| Portal unit riêng trong root suite | 130/130, 26 file; 16 test mới referral/MSW |
| Build Portal `.next-msw-v2` + `.next-server` | cả hai exit 0 |
| E2E `affiliate-portal.spec.ts auth-flows.spec.ts` MSW | 18/18 passed, exit 0 |
| Cùng hai file, cùng assertion trên native | 18/18 passed, exit 0 |
| Parity A-12…20, A-31/32 — MSW | 18/22 dưới 3%; 4 fail A-17/A-20, exit 1 |
| Cùng 22 ảnh trên native | 18/22 dưới 3%; cùng 4 fail A-17/A-20, exit 1 |
| Prettier source + `git diff --check` | PASS |

Sau khi kiểm xong đã tắt API/socket/worker do phiên này tạo sau khi đối chiếu
PID + thời điểm tạo + vai trò command line (và cổng với API/socket). Next do
Playwright quản lý đã tự dừng; chỉ listener prototype 4800/PID 5228 có sẵn được
giữ nguyên. Không xóa dữ liệu PostgreSQL/Redis hoặc đụng cổng được bảo vệ.

A-31 MSW: 0,089% desktop / 0,179% mobile; native: 0,096% / 0,197%.
A-32 MSW: 0,080% / 0,151%; native: 0,087% / 0,169%.
A-12…15 nay đều dưới 3%; không thay câu pháp lý bắt buộc NR-R01/R02.
A-17 MSW: 11,139% / 18,378%, native: 11,145% / 18,395%.
A-20 MSW: 9,562% / 16,958%, native: 9,568% / 16,975% vì lỗi tại từng ô —
ghi `DV-V2-403-1`. Không gọi kết quả raw này là toàn bộ parity PASS.

Native E2E lần đầu 15/18: ba test đọc mail không có `FAKE_MAIL_DIR` trong env
Playwright. Nạp đúng thư mục FakeMail đang cấu hình, chạy lại đầy đủ **18/18**;
không sửa/nới assertion, không thay provider. Log lỗi cấu hình vẫn được giữ.

Raw logs đã chuẩn hóa UTF-8/LF và redacted dòng có mẫu nhạy cảm:
[`evidence/v2-403/`](evidence/v2-403/), gồm kết quả MSW/native riêng và
`checkpoint.json` ghi command exit/count/source. Kết quả đo trước commit là
working tree sau cùng được commit ở `ff6f4f1`; `sha=ed73b06` trong raw parity
là HEAD lúc đo, **không phải** tuyên bố source sạch ở commit cũ đã có UI này.
Không chạy lại 1165 integration backend ở checkpoint frontend; kết quả TIP-402
không bị cộng thành test của TIP-403. Audit chốt pha và nghiệm thu toàn goal
vẫn còn phải chạy.
