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

## Còn phải làm tại checkpoint referral (lịch sử, không phải DONE TIP-403)

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

## Checkpoint màn Affiliate — source `bdbca39` (IN-PROGRESS)

Đã commit/push màn Portal `/affiliate`: preview khi chưa đóng phí, cảnh báo tạm
dừng, hero/chia sẻ, năm thẻ thống kê, form ngân hàng, hai tab lịch sử, lọc tháng
và phân trang theo URL, bảng desktop và thẻ mobile. Menu đã nối; chỉ đúng route
`/affiliate` được miễn overlay bắt buộc để xem preview. Không miễn paywall route khác.

Form ngân hàng kiểm tra dữ liệu, chuẩn hóa tên chủ tài khoản, giữ draft khi lỗi,
khóa thao tác khi gửi và invalidation sau PUT. Màn đọc API thật qua shared schema.
Trong MSW, fake backend lưu ngân hàng theo user và fake session để kiểm F5; không
lưu credential native ở frontend. AuthGate dùng cùng luồng refresh ở hai chế độ.
Không thêm dependency, migration hoặc đổi nghiệp vụ backend ở checkpoint này.

### Kiểm chứng màn Affiliate

| Kiểm cuối | Kết quả |
|---|---|
| `pnpm exec turbo run lint --force` | exit 0, 8/8 task, không cache |
| `pnpm exec turbo run typecheck --force` | exit 0, 8/8 task, không cache |
| `pnpm exec turbo run test --force` | exit 0, 6/6 task; 570 passed, 2 skipped hiện hữu |
| Portal unit trong root suite | 147/147, 32 file; thêm 17 test so checkpoint trước |
| `pnpm depcheck` | exit 0, cả hai đồ thị |
| Build Portal MSW và native | cả hai exit 0 |
| Affiliate E2E sau thay đổi mobile cuối | 7/7 MSW và 7/7 native |
| Auth + Referral + Affiliate regression | 21/21 mỗi chế độ, trước thay đổi trình bày mobile cuối |
| Prettier 47 source path + diff check trước source commit | PASS |

Không cộng 7 test Affiliate vào 21 test regression vì chúng trùng nhau. Hai lượt
regression ban đầu mỗi lượt 20/21: MSW timeout UAT-11 reset password, native timeout
D30 chờ groups sau đóng phí. Test cô lập rồi chạy lại cả suite đều pass, không đổi
assertion/source giữa các lần đó. Chưa chứng minh nguyên nhân timeout; giữ log lỗi
và theo dõi ở audit cuối pha. Không đưa trace chứa dữ liệu phiên vào repo.

### Parity P-97/98: chưa đạt, không phải deviation được duyệt

| Màn / viewport | MSW | Native |
|---|---:|---:|
| P-97 / 1440 | 4,8496% | 3,2547% |
| P-97 / 390 | 24,4834% | 24,4841% |
| P-98 / 1440 | 2,5108% | 2,5476% |
| P-98 / 390 | 23,3489% | 23,3497% |

Mỗi chế độ 1/4 ảnh đạt, 3/4 fail (exit 1). Không tăng ngưỡng 3%, không mask dữ liệu,
không coi toàn bộ parity PASS. Seed/mock hiện chỉ có đại lý cơ bản, thiếu AF0:
khách giới thiệu, lịch sử chi trả, clicks và mã HAOPC. Cần đồng bộ dữ liệu đúng
nghiệp vụ rồi đo lại, tiếp tục chỉnh layout còn lệch; không quy toàn bộ sai số cho seed.

Đã sửa readiness của phép đo: route loading cần network idle và tiến clock 1000ms
trước chờ text. Lượt timeout cũ được giữ. Harness hai target dùng chung thư mục raw
results nên các lượt cuối chạy tuần tự MSW rồi native; không lấy lượt chồng lấn làm
bằng chứng. Raw parity ghi HEAD `208c47e` lúc đo working tree; source đo sau cùng
được commit thành `bdbca39`, không phải UI đã tồn tại ở commit cũ.

Log UTF-8/LF đã lọc dòng nhạy cảm và JSON riêng mỗi target ở
[`evidence/v2-403/portal-screen/`](evidence/v2-403/portal-screen/).
Sau checkpoint đã đối chiếu PID, creation time, command line và listener với
metadata sở hữu: tắt API/socket/Admin còn sống; Portal/worker đã không còn.
Chỉ listener prototype 4800/PID 5228 có sẵn được giữ nguyên. Không dừng DB/Redis,
không xóa dữ liệu, không đụng cổng bảo vệ.

### Việc còn lại hiện tại

- Seed AF0/native/MSW nhất quán, HAOPC, lịch sử có dữ liệu và pagination; đo lại parity.
- AT-AF02 đăng ký → đóng phí → chủ mã thấy khách; trạng thái paused/AT-AF05,
  lần đầu chưa có ngân hàng; kiểm tra race tạo đại lý qua outbox sau đóng phí.
- TIP-404 Admin, AT-AF01..06, D-84/85; audit và completion report Pha 4 rồi merge.
- Pha 5 và nghiệm thu toàn goal chưa hoàn tất. Đây không phải TIP-403-DONE.
