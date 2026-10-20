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

## Checkpoint freshness — source `e277598` (IN-PROGRESS)

- Khi auth đã xác nhận phí active/expiring nhưng Affiliate vẫn locked/paused,
  query thử lại mỗi 2 giây trong tab hiện; dừng ngay khi active hoặc lỗi. Không
  polling preview chưa đóng phí hay đại lý expired. Đây là xử lý khoảng trễ giữa
  consumer xác nhận phí và consumer tạo/kích hoạt đại lý, không tự tạo đại lý ở FE.
- Cache thống kê thêm ngày Việt Nam: tab để mở qua nửa đêm tự lấy thống kê mới
  (gồm cửa sổ click 30 ngày và chuyển tháng), không gọi API mỗi phút.
- Thêm 7 hook test dùng fake clock: locked → active, paused → active, chưa đóng
  không poll, đổi trạng thái phí đổi query, lỗi ban đầu/lỗi sau retry không lặp,
  expired không poll, qua tháng theo giờ Việt Nam lấy cache key mới.
- Gate force lint/typecheck/test lần lượt 8/8, 8/8, 6/6 task, tất cả exit 0;
  tổng 577 passed, 2 skipped hiện hữu; riêng Portal 154/154 trong 33 file.
  `pnpm depcheck` cả hai đồ thị exit 0; Prettier và diff check pass.
- Log đã chuẩn hóa/lọc dòng nhạy cảm:
  [`evidence/v2-403/freshness/`](evidence/v2-403/freshness/).
- Chưa chạy lại build/E2E/parity cho commit này; không dùng kết quả checkpoint
  trước để tuyên bố đã kiểm end-to-end race outbox. AT-AF02 và seed/parity còn lại
  vẫn phải làm. Không bật thêm dịch vụ native ở checkpoint freshness.

## Checkpoint AF0 — source `64630db` (IN-PROGRESS)

Đã tạo dataset dùng chung sáu chủ mã AF0 (có HAOPC), 51 khách riêng biệt, click,
hoa hồng và snapshot chi trả. Native tạo user + kỳ phí thật, quan hệ referral và
commission đầy đủ; mọi khách đã đóng phí cũng có đại lý tự động theo AF-R01.
Không làm giả tổng chỉ còn sáu đại lý: pack có 62 đại lý, 64 dòng phí hiện hành,
62 kỳ phí và 51 hoa hồng. Base tám thành viên vẫn độc lập.

- Native: `pnpm --filter @opchub/db seed:demo --affiliate`; `seedDemo` option
  `affiliate` chạy trong cùng transaction reset/seed. Không thêm migration/env.
- MSW: cookie demo chỉ được handler MSW đọc để nạp cùng fixture; không có nhánh
  trong UI hoặc backend production. Chủ mã AF0 đăng nhập bằng tài khoản demo.
- E2E chọn tiền điều kiện qua option `affiliateDemo`; parity P-97/98 khai báo
  dataset bằng metadata. Cùng assertion ở cả hai chế độ, không nhánh nới kiểm tra.
- Demo policy trở về 20%/30 ngày sau mỗi reset, kể cả test trước đã sửa. Seed
  bắt buộc/production vẫn giữ cấu hình Admin, không bị thay đổi bởi sửa này.
- V2Q-173 ghi rõ AF0 thiếu user/kỳ phí và xung đột chronology. Pack mở rộng không
  giấu user bằng xóa mềm để ép số lượng; mốc bắt đầu chủ mã đặt trước khách đầu
  tiên. Cần xử lý minh bạch chênh ngày/số dòng khi dựng Admin, chưa duyệt deviation.

### Kiểm chứng mới

| Gate / suite | Kết quả |
|---|---|
| Force lint / typecheck | 8/8 task mỗi lệnh, exit 0, không cache |
| Force unit | 6/6 task, 586 passed, 2 skipped hiện hữu; Portal 157/157, shared 96/96 |
| `pnpm depcheck` | hai đồ thị pass, exit 0 |
| DB `test:int` | 18/18 trong 3 file trên opchub_test, gồm 4 test scenario mới |
| Portal MSW / native builds | cả hai exit 0 |
| Affiliate E2E MSW | 9/9, exit 0 |
| Affiliate E2E native | 9/9, exit 0 |
| Prettier 22 source path / diff check | PASS |

Hai E2E mới chứng minh bảng lịch sử/snapshot có dữ liệu và tài khoản HAOPC phân
trang tháng 09 (7 khách), F5 vẫn trang 2, đổi tháng quay về trang 1. Không gọi
đây là AT-AF02 đầy đủ: đăng ký → đóng phí → chủ mã thấy khách mới vẫn chưa chạy.
Các lượt lint đầu bắt lỗi function dài và response JSON chưa parse; đã tách hàm,
parse bằng schema và chạy lại toàn bộ gate xanh, không tắt rule.

### Parity sau đồng bộ dữ liệu: vẫn fail

| Màn / viewport | MSW | Native |
|---|---:|---:|
| P-97 / 1440 | 3,151148% | 9,978595% |
| P-97 / 390 | 7,192227% | 7,192922% |
| P-98 / 1440 | 7,620830% | 15,289285% |
| P-98 / 390 | 10,267185% | 10,267954% |

Mỗi chế độ 0/4 đạt, exit 1; không tăng ngưỡng hay che vùng lệch. Dữ liệu đã lấp
được khoảng trống mobile nhưng làm lộ layout bảng có dữ liệu: native còn phân
trang AntD nội bộ bên cạnh pager riêng, và payout hiện pager ngay khi chỉ một
trang (prototype không có). Cần kiểm CSS/DOM thực tế trước sửa; chưa chứng minh
nguyên nhân khác biệt CSS giữa hai build. Hero mobile có cột 310px trong app so
với 320px trên prototype; offset header và chiều cao lịch sử cũng cần chỉnh.
Không bỏ privacy masking để khớp tên đầy đủ trong prototype.

Ảnh, JSON và log đã chuẩn hóa/lọc nhạy cảm:
[`evidence/v2-403/af0-fixtures/`](evidence/v2-403/af0-fixtures/).
Raw SHA `69b60f2` là HEAD lúc đo working tree; source sau cùng là `64630db`.
MSW/native parity chạy tuần tự, không dùng kết quả raw chồng lấn. Probe geometry
tạm thời đã xóa, không tính là acceptance test.

Sau kiểm đã tắt đúng API/socket/worker/Admin do lượt này bật, xác nhận PID + giờ
tạo + command line và cổng; Portal Playwright đã tự dừng. Giữ nguyên prototype
4800/PID 5228, DB/Redis và dữ liệu. Worker PID 688 có sẵn trước lượt này không có
bằng chứng sở hữu nên giữ nguyên, không kill. Không đụng các cổng bảo vệ.

Chưa chốt TIP-403: còn sửa parity, AT-AF02 toàn luồng, paused/AT-AF05 và bank lần
đầu. TIP-404, audit/merge Pha 4, Pha 5 và nghiệm thu toàn goal vẫn còn nguyên.

## Checkpoint layout/parity — source `949ddd1` (TIP vẫn IN-PROGRESS)

**P-97/98 nay đạt trên cả MSW và native**, cùng dữ liệu AF0, hai viewport,
threshold 3% giữ nguyên. Không mask, không đổi assertion theo target.

- `AdminTable` có option `pagination={false}`: không dựng pager AntD khi feature
  dùng pager URL riêng. Mặc định của mọi feature khác giữ nguyên, có test hồi quy.
- Affiliate dùng option đó thay vì CSS giấu pagination. Payout chỉ hiện pager
  ngoài khi có hơn một trang; referrals giữ điều khiển trang như prototype.
- Selector bảng được scope thêm wrapper để thắng style AntD cùng mức ưu tiên
  vốn phụ thuộc thứ tự inject CSS; cả native và MSW đã được đo trên build mới.
- Tách khoảng cách header/content, chỉnh cột hero, bank header và kích thước thẻ
  mobile theo geometry đo thực. Màn nhỏ dưới 376px vẫn có fallback cột co giãn.
- `StatusTag` cho phép line box 22px (badge Affiliate cao 24px có viền), mặc định
  20px của feature khác không đổi. Không dùng CSS `!important` ghi đè inline tag.
- Giữ tên khách đã che và snapshot ngân hàng từ API, không ép dữ liệu nhạy cảm
  trở lại dạng không che chỉ để giảm pixel diff.

| Parity cuối | MSW | Native |
|---|---:|---:|
| P-97 / 1440 | 0,869271% | 0,900872% |
| P-97 / 390 | 0,774784% | 0,776675% |
| P-98 / 1440 | 0,836806% | 0,873920% |
| P-98 / 390 | 2,447735% | 2,449875% |

Mỗi target 4/4 pass, exit 0. Chỉ nói PASS cho tám ảnh này, không tuyên bố toàn bộ
registry hoặc toàn goal đã đạt. Diff cũ của các ảnh đã đạt được gỡ theo quy tắc
chỉ lưu diff fail/deviation. Prototype gốc vẫn chụp lại qua thao tác trình duyệt.

### Gate và hồi quy

- Force lint/typecheck: 8/8 task mỗi lệnh, không cache, exit 0.
- Force unit: 6/6 task, **590 passed, 2 skipped hiện hữu**; UI 43/43, thêm bốn
  test cho pager và line box (default lẫn opt-in). Không cộng integration cũ.
- Depcheck hai đồ thị pass; Prettier và `git diff --check` pass.
- Build Portal MSW và native đều exit 0.
- Affiliate E2E **9/9 MSW + 9/9 native**, thêm assertion DOM không còn AntD pager
  và không hiện pager nhận tiền khi chỉ hai kỳ trong một trang.
- Geometry probe tạm thời đã xóa; số test probe không cộng vào acceptance.

Log/JSON đã chuẩn hóa UTF-8/LF và lọc dòng nhạy cảm:
[`evidence/v2-403/layout-parity/`](evidence/v2-403/layout-parity/).
Raw MSW ghi HEAD `eaa1cc4` lúc đo working tree; source được commit `949ddd1`.
Native parity chạy sau source commit và ghi đúng `949ddd1`; source UI hai target
là cùng phiên bản, không có source edit sau các gate cuối.

Đã tắt API/socket/worker/Admin thuộc lượt này sau kiểm PID + creation time +
command line/cổng. Portal Playwright tự dừng; prototype 4800/PID 5228 và worker
có sẵn không thuộc lượt này giữ nguyên; không dừng DB/Redis hoặc xóa dữ liệu.

**Chưa DONE TIP-403**: còn AT-AF02 đăng ký → đóng phí → chủ mã thấy khách mới,
paused/AT-AF05, lần đầu khai ngân hàng và rà đủ acceptance. TIP-404 + audit/merge
Pha 4, Pha 5 và nghiệm thu toàn goal vẫn chưa hoàn tất.

## Checkpoint lifecycle — source `f821b0e` + `32f6112`

Đã bổ sung và chạy thật các luồng trước đó còn thiếu:

- AT-AF02: mở HAOPC → đăng ký/OTP → fake bank xác nhận phí → tự có Affiliate →
  khai STK lần đầu, tên được chuẩn hóa, banner biến mất → đăng xuất SPA → chủ mã
  đăng nhập thấy khách mới và hoa hồng 150.000đ. Không reload để né lỗi cache.
- AT-AF05: mã của đại lý hết hạn bị chặn trước request đăng ký/OTP; đại lý vẫn
  xem lịch sử, sửa ngân hàng cho khoản cũ. Payout cũ giữ snapshot ACB, không bị
  thay bằng ngân hàng vừa sửa. Native fixture có kỳ phí 365 ngày hợp lệ.
- BUG-045: QueryClient bị giữ qua đổi danh tính; thêm boundary clear cache đồng
  bộ khi `me.id` đổi, giữ cache khi refresh cùng tài khoản, chặn response muộn.
  Bốn unit và luồng hai tài khoản nói trên pass; finding riêng đã đóng.
- Sao chép link/mã: kiểm clipboard thật và toast; thêm accessible name tiếng
  Việt cho hai nút, icon chỉ trang trí. Hai unit kiểm thành công và lỗi quyền.
- Fake webhook nhận thời điểm thanh toán thực thay vì mốc seed; hai unit kiểm
  ranh giới tháng Việt Nam và gia hạn nối tiếp. Không đổi nghiệp vụ backend.

### Bằng chứng hiện tại, chưa tuyên bố toàn bộ regression xanh

- Forced lint/typecheck: 8/8 task mỗi lệnh; forced unit: 6/6 task,
  **599 passed, 2 skipped hiện hữu**. Depcheck cả hai đồ thị pass.
- DB integration **19/19**, ba file, 28 migration không còn pending.
- Build Portal MSW/native exit 0.
- Native cuối trên `32f6112`: **26/26** hành vi pass, gồm 12 Affiliate và 14
  auth regression; parity P-97/98 **4/4** pass ở hai viewport.
- MSW lượt cuối đầu tiên: **25/26**, toàn bộ 12 Affiliate pass; UAT-11 timeout
  ở lần đăng nhập thứ hai sau đổi mật khẩu. Đang tái hiện có trace, không bỏ
  assertion hoặc đổi kỳ vọng theo target. Chưa có nguyên nhân được chứng minh.
- MSW selected parity: **22/26**, P-97/98 4/4 pass. Bốn raw fail A-17/A-20 ở
  desktop/mobile thuộc deviation đã ghi `DV-V2-403-1` (field error theo SRS).
  Không tuyên bố toàn bộ parity PASS.

Log gate/build/hành vi/parity đã chuẩn hóa UTF-8/LF và lọc dòng nhạy cảm:
[`evidence/v2-403/acceptance/`](evidence/v2-403/acceptance/).
Trace chứa dữ liệu phiên chỉ giữ ngoài repo. Các checkpoint phía trên là lịch
sử; số liệu ở mục này mới hơn. Chưa viết completion report cho TIP-403 khi lỗi
hồi quy MSW chưa được đánh giá xong. TIP-404, audit/merge P4 và P5 còn nguyên.

### Kết luận sau các lượt chạy tiếp theo

Cùng source, không sửa test/timeout/assertion: full MSW có trace **26/26**;
full MSW không trace lặp hai lần **52/52** (26 case duy nhất); UAT-11 riêng
**3/3 + 12/12**. Native cuối vẫn 26/26. Giữ log fail trước đó và cảnh báo
intermittency, không tuyên bố đã sửa nguyên nhân flake; kiểm tiếp ở audit P4/P5.
Các acceptance Portal đã được kiểm đủ, xem [completion](TIP-V2-403-completion.md).
TIP-404, audit/merge P4 và P5 chưa hoàn thành; không đánh dấu toàn goal DONE.
