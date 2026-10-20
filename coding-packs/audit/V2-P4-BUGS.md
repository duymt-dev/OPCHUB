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

### MSW-404-06 · S3 · CLOSED · Relay chờ ping khi clock parity đang dừng

- Đo D-84 trên bridge mới bị timeout 120 giây ở đăng nhập, chưa tạo ảnh để so.
  Ping đầu tiên chạy trước iframe hydrate; các ping tiếp theo dùng interval 100ms,
  không chạy khi harness giữ clock đứng yên. Không coi timeout này là pixel diff.
- Source `8635d63`: iframe gửi referrer ở mức origin; host thông báo ready ngay
  sau khi cài listener, chỉ tới origin HTTP(S) cùng hostname của parent từ referrer.
  Không gửi state/credential trong ready; nhận state vẫn qua source/origin guard,
  MessageChannel và Web Lock cũ. Không đổi clock hay nới ngưỡng parity để né lỗi.
- Sáu unit kiểm ready sau listener, exact target origin, cleanup và năm referrer
  không hợp lệ. Browser `affiliate-frozen-clock.spec.ts` giữ clock đứng yên toàn
  bộ login/Admin/F5/Portal/F5, pass trong focused MSW 3/3.
- Chạy lại D-84/D-85 đã đi tới so ảnh: 1/4 pass, ba pixel diff vẫn fail như trước.
  Finding này đóng lỗi khởi động relay, **không đóng UI-404-03** hay nghiệm thu P4.

### MSW-404-05 · S3 · CLOSED · Welcome mail đã lấy hiện lại sau F5

- Mở rộng AT-AF02: bank của thành viên mới vẫn đúng sau reload, nhưng thao tác
  logout timeout vì popup welcome xuất hiện lại, mask chặn nút menu. Trace chỉ
  rõ pointer bị mask intercept; không nới timeout/force click để làm test xanh.
- `takeWelcomeMail` dùng Set ở module, mất consumed marker khi tải lại runtime.
  Source `13ea4ed`: WeakMap theo MockDb + consumed metadata trong shared ledger;
  parser nhận ledger cũ không có metadata mà không xóa financial rows.
- Hai unit + AT-AF02 F5 assertion popup count=0, sau đó logout/đổi owner và đọc
  commission đều pass trong bộ focused MSW **5/5** và hồi quy chốt SHA **33/33**.
  Full unit **714 + 2 skipped**.
- Chỉ kết luận lỗi backend giả MSW đã sửa. Native dùng mail controller riêng;
  chưa coi browser native trên source mới đã được kiểm. Khác BUG-045 (cache cũ
  qua đổi danh tính), không mở lại/đóng thay lỗi đó. Xem evidence payout-browser.

### MSW-404-04 · CLOSED · Bearer cũ của Admin bị khóa vẫn đọc/ghi Affiliate

- Refresh MSW đã từ chối account locked, nhưng guard Affiliate chỉ kiểm kết quả
  `mockAdminMeOf`; hàm này vẫn trả profile/quyền của account đã khóa. Do đó một
  bearer `mock.<id>` có sẵn có thể vượt guard dù tài khoản không còn active.
- Source `ea4c189` kiểm account hiện hành phải active ở guard chung trước đọc,
  parse body và tác động tài chính. Không dựa vào tên vai trò, không lưu quyền
  trong cookie. Mở khóa dùng lại account/quyền hiện hành.
- `affiliate-authorization.spec.ts`: **14/14** pass, đủ 7 read + 7 write/export
  endpoint; kiểm đọc trước khóa, 401 sau khóa, đọc lại sau mở khóa. Write bị từ
  chối không đổi referral/payout/policy hoặc thêm audit. Full forced unit **686
  passed + 2 existing skipped**, lint/typecheck/depcheck pass.
- Finding chỉ áp dụng backend giả MSW. Không coi đây là bằng chứng cho kiểm
  khóa tài khoản/native hoặc bridge Portal–Admin; các gate P4 đó còn mở.

### UI-404-03 · S3 · OPEN · Admin Affiliate chưa đạt parity ver2

- `6ee0fc3`: Đại lý chuyển sang card trên mobile 360/390, kiểm đủ mọi cột trong
  viewport, chọn/bỏ chọn, đối soát/F5 và empty state. Full 39/39 MSW, 743 unit
  pass + 2 existing skips; parity vẫn 8/14. Default agents 16,58%/20,66%, filtered
  HAOPC 1,14%/6,99% — không tuyên bố mọi ảnh cải thiện. Bank/period fields API
  còn thiếu (V2Q-178), không fake, N+1 hoặc lọc bỏ đại lý tự động. UI-404-03 OPEN.

- Rà thêm năm trạng thái: editor cá nhân đã đổi từ modal về inline; badge tổng
  lịch sử sửa 13 → 14, không thay statistic 13 khách hiệu lực; trang chi tiết 8
  dòng, receipt hai dòng giữ bank/amount/date do API trả. Đây sửa sai UI cũ,
  không phải thay đổi nghiệp vụ để khớp ảnh. Customer desktop 1,82%, mobile
  4,92% ở lượt dirty-source gần nhất; mặc định/edit đạt. Agent/policy vẫn còn
  gap, chưa tự duyệt deviation. Chi tiết và log ở
  `../reports/TIP-V2-404-states-checkpoint.md`. Mục này tiếp tục OPEN.
- Source UI `5894b5b`, test follow-up `5a4349c`: full MSW **37/37 pass** sau khi
  trace phát hiện test bấm input radio ẩn của AntD. Test bấm label hiển thị,
  không force và giữ mọi assertion. Parity committed-source **8/14**, sáu
  ảnh còn fail; không dùng test hành vi pass để đóng gap hình ảnh/native.

- **Mới nhất, source `94b60c0`:** D-84 desktop/mobile **1,4234% / 1,1162%**,
  D-85 **0,7973% / 1,7664%**. Bốn ảnh mặc định đã đạt trên đúng commit, không
  đổi threshold/mask; wrapper checkbox AntD cao 22px thay vì 16px là nguyên
  nhân hàng mobile dư 3px. Tên/count tab lấy API, size control vẫn giữ nguyên.
  725 unit + 2 existing skipped, MSW 36/36, native integration 44/44 và cả hai
  native build pass. **Vẫn OPEN cho phạm vi còn lại**: parity các tab/dialog và
  browser native chưa đủ; không suy rộng bốn ảnh thành mọi trạng thái Affiliate.
  Xem `../reports/TIP-V2-404-parity-checkpoint.md` và evidence/geometry/.
- Lịch sử `4ea72de`: D-84 desktop **3,4931%**, mobile **4,1351%**;
  D-85 desktop **1,3799%**, mobile **4,2046%**. Vẫn chỉ **1/4 pass**. Wrapper
  search trước đó tràn tới x=395,203 dù inner input/root có vẻ vừa viewport;
  giới hạn toolbar theo card đã đưa ảnh mobile về đúng 390px và giảm diff từ
  5,3564%. Test nay kiểm outer compact wrapper, không chỉ input bị shell clip.
  Forced gates 720 unit + 2 existing skipped và MSW 36/36 pass không thay parity.
  Các số checkpoint cũ dưới đây chỉ là lịch sử; tab/dialog/native còn phải kiểm.
- Checkpoint `9d3e34f`/`6437a46` bổ sung policy hint thực, caption/count lấy API
  và chỉnh mobile. Forced 672 unit + 2 existing skipped, MSW 16/16 pass. Finding
  vẫn **OPEN**: lượt parity trước commit chỉ D-85 desktop đạt; native và các
  tab/dialog còn thiếu. Xem progress/evidence admin-summary cho lượt chốt SHA;
  các số `c7cb493` bên dưới là lịch sử, không phải số đo source mới.
- Bật lại D-84/D-85 phát hiện mobile bảng không thành thẻ, chi tiết stat xếp
  một cột/card rời khác prototype; D-84 mobile raw diff ban đầu 52.38%.
- Source `c7cb493` sửa card/toolbar/column/menu/mobile commission cards và detail
  responsive, giữ trường tiền/trạng thái/permission. 7 unit mới + full 660 unit,
  MSW behavior 16/16 và hai build pass, nhưng không dùng chúng thay parity.
- Đo lại đúng source sau commit: D-84 desktop **4.230858%**, mobile **4.582076%**;
  D-85 desktop **1.466281%**, mobile **6.956654%**. Chỉ D-85 desktop đạt ≤3%.
- **OPEN:** còn 3 raw screen fail, caption/copy/header và tab/dialog chưa đủ.
  Không mask, không nâng threshold, không đánh dấu skip hoặc waiver tự duyệt.
  Xem `../reports/evidence/v2-404/admin-layout/` và report parity/results.

### UI-404-02 · S3 · Thiếu điều khiển đổi cỡ trang Affiliate Admin

- E2E tìm `Số dòng mỗi trang` timeout; source AdminTable mặc định
  `showSizeChanger=false` trong khi màn Affiliate chưa có pager riêng.
  URL/model/API nhận size nhưng người dùng không đổi được bằng UI.
- Sửa source `034bd00`: pager feature riêng tái sử dụng packages/ui/Pagination
  cho cả bốn bảng; tắt pager AntD cũ, reset page 1 khi đổi size, hỗ trợ read-only.
- Ba unit pass; browser pagination sang trang 2, đổi size 20, reset trang 1 và
  F5 giữ size pass trong MSW regression 16/16. Native build pass.
- **FIXED trên source/MSW; native browser và parity còn chờ nghiệm thu.**
  Không dùng finding này để tuyên bố toàn REQ-312/TIP-404/P4 đã hoàn thành.
  Evidence: `../reports/evidence/v2-404/admin-operations/`.

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
