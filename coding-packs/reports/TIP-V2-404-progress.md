# TIP-V2-404 - completion handoff (declared debt)

> Chỉ đạo mới của user ngày 20/10/2026: hoàn tất Affiliate/Pha 4 rồi dừng.
> Tiếp tục đầy đủ tích hợp/native/parity/audit/report/merge P4; không triển khai
> Pha 5 bot. Chưa dừng ngay vì Affiliate chưa nghiệm thu xong. Goal gốc vẫn giữ
> lịch sử; khi P4 thực sự hoàn tất thì thực hiện yêu cầu dừng, không coi P5 đã xong.

## Final functional verification - 21 October 2026

Main integration **cb66075** is merged/pushed; see the completion receipt.
Native demo/cache restored for acceptance after the lock test; services retained.

Native **221/221 (17.1m)** and MSW **221/221 (5.2m)** full behavior pass.
Additional direct native manual-collection AT-LK01/02 passes 1/1; final-source
native lock passes 1/1. Units 835 + 2 existing skips; lint/typecheck/depcheck pass.
Latest in-scope UAT 30/30. See `TIP-V2-404-completion.md` and
`V2-P4-completion.md` for acceptance/debt and integration receipt. Native HOLD
is explicitly requested: retain Portal 3280/Admin 3282 and their backend stack.
No P5. Older IN-PROGRESS statements below are historical checkpoints, not the
current result. Raw failed runs and visual/audit debt are retained.

## Native 52/52, MSW 52/52 and final-audit follow-up - latest

Affiliate/RBAC on 694d2e3 passes **52/52 native (4.6m)** and **52/52 MSW
(1.8m)**, same assertions, including all AT-AF/AT-RB and CSV + its audit row.
Full audit e6dc3cd completes **251/251 invocations**, not a zero-finding PASS:
raw UAT 29/31, four S2 and nineteen S3 findings. **877a461** corrects paid
outsider/sender preconditions and reads delivered welcome mail after DB HTML
purge. Native follow-ups record D-15/hide/fee-expired OK and UAT-29 now DAT;
latest UAT **30/31 = 30/30 in scope**, UAT-14 bot remains P5/excluded.

New audit helpers use shared zod contracts through an explicit workspace dev
dependency. Gate **22/22**, 20 cached/2 executed; repo units **835 + 2 skips**.
Six native CSS-highlight rechecks remain red despite completed invocations;
clock-poll experiment reverted. Cosmetic debt is user-approved, not pixel PASS.
Other S3 audit-path/cooldown/map-placeholder findings remain reasoned follow-ups.
Full **native behavior regression passes 221/221 (17.1m)** on 877a461;
full MSW regression is running. Reports/main merge remain pending. See [final-audit checkpoint](V2-P4-final-audit-checkpoint.md) and
[follow-ups](../audit/V2-P4-AUDIT-FOLLOWUPS.md). No P5 implementation.

## Native runtime / concurrent refresh - latest checkpoint

Corrected stale native build selection and opened five service panes in this
Herdr tab. Full native twice stopped at 20 pass / 1 fail / 31 not run; the second
exposed a genuine cross-tab rotating-cookie refresh race, not cosmetic debt.
Source **1eaebae** serializes Admin refresh through Web Locks, keeping backend
reuse detection, per-tab single-flight and simultaneous reload assertions.
Four new units; **835 + 2 existing skips**, gate **22/22** (19 cached/3 executed),
depcheck and final Admin MSW/native builds pass. Native concurrency repeated
**3/3 executions of one case**. Full committed 52-case native rerun is running;
no full native/MSW/audit/UAT completion claimed yet. See
[V2-P4-native-browser-checkpoint](V2-P4-native-browser-checkpoint.md). No P5.

## User-approved cosmetic debt - 2026-10-21

User accepts remaining UI differences as technical debt to prioritize P4 closure.
See [seven measured debts](../audit/V2-P4-UI-TECH-DEBT.md). Raw parity remains
27/34 with seven FAIL, not relabeled PASS. Cosmetic visual-registration follow-up
is deferred; functional/permission/money/accessibility/native/UAT gates are not.
Uncommitted policy pixel experiment was withdrawn with its red geometry probes;
production source remains f394dc5, behavior f91f499 (52 MSW cases). Prior pending
visual-approval statements below describe the state before this new decision.
Native integration/final seeded audits are being rerun; no P5.

## Popup layout / keyboard paint - latest checkpoint

Production **f394dc5**, strict browser readiness **f91f499**, both pushed.
Feature-local popup now has a full-row anchor, 180px width, status dots and
readable disabled current state with trailing check. Only guarded cancellation
opens the existing reason dialog; no restore/direct payout/permission changes.

Gate **22/22** (19 cached/3 executed), **831 units + 2 existing skips**;
nine menu units included. Final test-only gate 22/22 (20 cached/2 executed).
Depcheck and separate final Admin MSW/native builds pass. Full committed
Affiliate/RBAC MSW **52/52**; two 360/390 keyboard cases also repeated three
times (**6 executions**, not six additional cases). Initial strict width 0/2
and first full 51/52 paint-race failure are retained, not counted as green.

Fresh parity on unchanged production UI **f394dc5: 27/34**, same seven failures.
Cancelled-menu mobile improves **5.1425% -> 4.7331%**, still FAIL. Two desktop
menus slightly worsen within threshold; not all images improve. Native browser,
remaining inventory, final seeded audits/UAT/reports/main merge remain open.
See [popup layout checkpoint](TIP-V2-404-popup-layout-checkpoint.md). No P5.

## Bộ lọc / menu mở — checkpoint mới nhất

Đăng ký **`2f4f2b1`**, readiness **`33ac56d` / `b2913fb` / `c353134`** đã
commit/push. Thêm sáu trạng thái so ảnh: ba bộ lọc và menu ghi nhận/đã chi/đã hủy.
Hai ca hành vi 1440/390 kiểm số dòng/tổng, phí, URL và F5; full MSW **52/52**,
không cộng hai ca chạy riêng lần nữa. Unit vẫn **828 + 2 existing skips**;
forced gate **22/22**, các lần sửa readiness sau chạy gate 22/22 có cache rõ ràng.

Phát hiện ảnh menu xanh giả: `settle()` dời chuột làm prototype đóng menu;
popup AntD còn opacity 0 do clock/rAF đang dừng. Không dùng kết quả đó để nghiệm
thu. Hook trước chụp nay mở/kiểm menu sau settle, tick clock rồi bắt buộc opacity
1 và nằm trong viewport; filter phải hiện nền xanh đúng trạng thái. Giữ nguyên
threshold, mọi assertion tiền/quyền và dữ liệu; không sửa production để ép ảnh.

Kết quả cuối đủ cùng SHA **`c353134`: 27/34**. Nhóm cũ **17/22 không đổi**;
12 ảnh mới đạt **10/12**, không phải cải thiện 17 ảnh thành 27 ảnh trên cùng mẫu.
Ngoài năm ảnh fail cũ, hai ảnh mới của khoản đã hủy mobile còn lệch
**5,2758% / 5,1425%** (danh sách/menu). Cả bảy vẫn OPEN, không waiver. Native
browser, audit cuối/UAT/report/merge P4 còn mở; không triển khai P5. Xem
[commission states checkpoint](TIP-V2-404-commission-states-checkpoint.md).

## Status menu / mobile parity — checkpoint trước

Source **`cbf9eaa`** đã commit/push. Paid/cancelled trước đây mất menu và vùng
thao tác mobile bị co lại. Component riêng nay cho xem ba trạng thái ở mọi dòng;
chỉ recorded được mở dialog hủy có lý do, không trả tiền trực tiếp hay khôi phục
khoản terminal. Giữ permission key/preview/revocation và guard ở cha/backend.

Forced gate **22/22**, **828 unit + 2 existing skips**, depcheck và hai build
Admin MSW/native pass. Full Affiliate/RBAC MSW **50/50**, gồm hai ca mới 360/390
kiểm menu/disabled/không ghi khi đóng dialog/F5. Không phải native browser.
Parity trên cùng source, đủ 22 ảnh: **17/22**. Chọn hoa hồng mobile giảm
**5,5311% → 2,4252%**; desktop **1,2932%**. Hai mươi ảnh khác không đổi;
năm ảnh fail còn mở, không waiver. Native browser/audit cuối/UAT/report/merge P4
chưa xong. Xem [status menu checkpoint](TIP-V2-404-status-menu-checkpoint.md).

## Transition audit / fixture — checkpoint trước

C4 **`1477383`**, env docs **`a88b561`**, fixture **`bc03c9f`** đã commit/push.
C4 thêm sáu cạnh hợp lệ và hai invariant Affiliate, bắt buộc có implementation,
HTTP/worker và test native hợp lệ/bị chặn; chín unit kiểm bộ audit không báo xanh
khi thiếu nguồn. Hai test terminal-referral mới không cho mở lại void/converted.
Lượt chạy lại phát hiện mã thành viên fixture trùng khi clock cố định; đã chuyển
identity sang UUID, giữ DB/constraint/clock/assertion. Hai process chạy riêng đều
**2/2**, full native Affiliate/contract **57/57 trong 24 file**; không cộng lặp.

Forced gate **22/22**, **822 unit + 2 existing skips**, hai depcheck graph pass.
Static C1–C6: **25/0, 25/0, 88/0, 36/1, 173/0, 138/4** (đạt/finding).
C4 còn một finding bot P5 ngoài scope; C6 sửa 12 mục tài liệu, bốn S4 giữ hoãn
có lý do (ba placeholder Sentry và một tham chiếu DATABASE_URL runtime ở DB).
Không suppress audit, sửa ledger/API/permission hoặc seed để ép xanh.

Chưa chạy browser/đo pixel mới: MSW gần nhất **48/48**, parity **16/22** với sáu
ảnh fail. Native browser/inventory/CSV audit, seeded final audits, UAT, report và
merge P4 còn mở. Xem [checkpoint](V2-P4-transition-audit-checkpoint.md), evidence
lưu cả lỗi fixture trước sửa. Hoàn tất Affiliate/P4 rồi dừng, không làm P5.

## Dialog mobile / audit C5 — checkpoint trước

Test **`4949a41`**, audit **`ca6b368`** đã commit/push. Bốn ca 360/390 kiểm
hủy/đặt %: dữ liệu sai hoặc đóng dialog không ghi API; xác nhận đúng thì F5 giữ
kết quả. Tám PNG thật đã lưu/kiểm bằng mắt, là evidence SRS-only, không giả làm
ảnh prototype. Thêm unit cho 409/retry, mất quyền và pending của bulk-rate.

Latest forced gate **22/22**, **813 unit + 2 existing skips**, depcheck pass;
full MSW **48/48**. Native guard/contract subset mới **7/7**, không phải browser.
Sửa bộ audit đọc decorator theo AST thay vì chỉ đọc phía trên `@Get/@Post`:
C5 hết 15 báo nhầm, nay **173 đạt / 0 finding**. Audit vẫn chưa PASS toàn bộ:
C4 có finding P5 và chưa liệt kê Affiliate; C6 còn 16 finding tài liệu env.
Không làm bot P5. Chưa đo parity mới: nhóm gần nhất vẫn **16/22** trên `2a589cb`.
Native browser, các state còn thiếu, audit cuối/report/merge P4 còn mở. Xem
[dialog checkpoint](TIP-V2-404-dialog-mobile-checkpoint.md) và
[audit preflight](V2-P4-audit-preflight.md).

## Chọn hàng / rỗng — checkpoint trước

Source **`4ab2b73` / `a853ba9` / `2a589cb`** đã commit/push. Bổ sung bốn trạng
thái chọn/rỗng, kiểm có dòng trước khi lọc để tránh empty test pass giả. Sửa bố
cục bulk bar và nền hàng chọn, giữ checkbox/count, đặt %, hủy và CSV.
Forced gates **22/22**, **804 unit + 2 skips**, depcheck, hai build Admin và
full MSW **44/44** pass. Inventory Admin đã ghi rõ các trạng thái còn thiếu.

Đo rộng hơn: **16/22** ảnh đạt (baseline mới trước sửa **14/22**); nhóm cũ vẫn
**11/14**. Đại lý được chọn đạt cả hai cỡ; hoa hồng chọn đạt desktop, mobile
**5,53%** còn fail và tăng nhẹ. Hai empty mobile **7,72% / 6,50%** cũng chưa đạt,
cộng ba ảnh fail cũ thành sáu ảnh. Không waive hay bỏ empty hint để ép ảnh xanh.
Native browser/audit/nghiệm thu/report/merge P4 còn mở. Xem
[list-state checkpoint](TIP-V2-404-list-states-checkpoint.md).

## Ví dụ tiền chính sách — checkpoint trước

API **`986930c`**, UI **`e1cb2f7`** đã commit/push: ví dụ tiền lấy từ server
theo tỷ lệ đang nhập, không tự tính ở FE; bỏ response cũ/sai tỷ lệ, không gửi
query khi tỷ lệ sai hoặc thiếu quyền. API native **55/55**, forced gate **22/22**,
**804 unit + 2 existing skips**, depcheck và Portal/Admin MSW + Admin native build
pass. Full MSW **44/44**, gồm response/caption 25% và F5 ở cả 360/390.

Parity vẫn **11/14**: policy desktop **2,40%** đạt; mobile **16,60%** còn fail
và **tăng** so với 13,73% trước đó. Không bỏ terms hay sửa dữ liệu 62 đại lý
để ép ảnh xanh. Native browser, inventory đầy đủ, audit/report/merge P4 còn mở.
Xem [policy preview checkpoint](TIP-V2-404-policy-preview-checkpoint.md).

## Chính sách — checkpoint trước

Follow-up **`7c36279`** đã sửa lỗi API 400 chỉ hiện toast: lỗi nay gắn đúng ô,
giữ bản nháp để gửi lại. Ba case tái hiện fail trước sửa, pass sau sửa; forced
gate **22/22**, **776 unit + 2 existing skips**, depcheck, hai build Admin và
full MSW **44/44** pass. Đây không phải browser/native 400 proof hay số đo
parity mới; ba ảnh fail ở checkpoint `822a9cb` bên dưới vẫn chưa đóng.

Source **`b58f863` + `822a9cb`**, đã commit/push. Bố cục/copy quy tắc theo ver2;
giữ điều khoản chỉnh sửa được, kiểm lỗi tại ô và F5 đủ ba trường. Forced gate
**22/22**, **773 unit + 2 existing skips**, depcheck và hai build Admin pass.
Full Affiliate/RBAC MSW **44/44**; parity **11/14**, policy desktop **2,37%**
đã đạt nhưng mobile **13,73%** còn fail, cùng hai ảnh đại lý mặc định.
Không tự duyệt deviation hay tính ví dụ tiền tại FE. Native browser, inventory
đầy đủ, audit/report/merge P4 vẫn chưa xong. Xem
[policy checkpoint](TIP-V2-404-policy-checkpoint.md).

## Khách hàng mobile — checkpoint trước

Source **`3932bbf`**, đã commit/push: tab đang chọn hiện trọn nhãn + tổng khách,
pager mobile giữ cả range/page buttons/size selector, ngày và header khớp ver2.
Không đổi API, tiền, seed hay ẩn điều khiển. Forced gate **22/22**, **765 unit
passed + 2 existing skips**, depcheck và Admin MSW/native build pass.

Hai case mobile 360/390 kiểm đủ điều khiển, size → page 2 → F5 và đổi tab đều pass;
full Affiliate/RBAC MSW **42/42**. Parity mới **10/14**: customer desktop/mobile
**1,80%/1,94%** đã đạt, không nới threshold/mask. Bốn ảnh còn fail thuộc đại lý
mặc định và chính sách. Native browser/audit/report/merge P4 vẫn chưa xong.
Xem [customer mobile checkpoint](TIP-V2-404-customer-mobile-checkpoint.md).

## UI ngân hàng / hoa hồng theo kỳ — checkpoint trước

Source UI **`10a3c71`**, test readiness **`fc642f6`**, đã commit/push. Đại lý dùng
bank/lifetime/period từ TIP-402B; chọn tháng/Tất cả và F5 giữ URL, không lấy số dư
chưa chi thay tổng tháng hoặc tính tiền tại FE. Mobile giữ đủ cột, CSV và size.

Forced gate **22/22**, **758 unit passed + 2 existing skips**, depcheck và hai
build Admin MSW/native pass. Full MSW đầu **39/40**, AT-AF02 mất dòng sau F5;
thêm assertion URL đã commit trước/sau F5 (không bỏ assertion tiền/dữ liệu), sáu
focused repeat pass, full trên commit chốt **40/40 pass**. Không kết luận nguyên
nhân lỗi cũ chỉ từ ba trace rerun pass; log lỗi vẫn giữ.

Parity mới **9/14**: HAOPC mobile **1,97%** đã đạt, desktop **1,09%**. Đại lý mặc
định lại tăng **24,14%/27,69%**, không nói tất cả ảnh cải thiện; dữ liệu 62 đại lý
thật so với sáu dòng prototype vẫn khác. Policy và customer mobile còn fail.
Native browser/audit/trace cuối/report/merge P4 chưa xong; không làm P5. Xem
[agent presentation checkpoint](TIP-V2-404-agent-presentation-checkpoint.md).

## Contract ngân hàng / tổng theo kỳ — TIP-402B (checkpoint trước)

Source **`79f7073`** đã commit/push: list API có bank hiện tại, lifetime và period
tách biệt; giữ nguyên nghĩa các field cũ, không đổi mutation/ledger/permission.
Đọc bank sau deferred join, thêm tối đa một aggregate theo batch ID khi chọn
tháng, không N+1. MSW dùng cùng schema bắt buộc, không bịa số liệu ở component.

Đã đạt **48/48 integration native** (20 file, gồm contract 14 endpoint và EXPLAIN
10k), **748 unit + 2 existing skips**, full **39/39 MSW**; fresh Portal/Admin MSW
và server build pass, forced lint/typecheck/test và depcheck pass. Đây chưa phải
E2E native. TIP-404 còn phải dùng field mới để dựng bank/tổng kỳ đúng ver2;
parity, audit/native acceptance và merge P4 chưa xong. Xem
[TIP-402B report](TIP-V2-402B-completion.md).

Fresh parity trên đúng `79f7073` vẫn **8/14**, sáu ảnh fail, không nới threshold
hay mask. Field mới đã có dữ liệu nhưng UI chưa dùng chúng, nên không coi
contract API hoàn thành là hình ảnh đã đạt.

## Tab Đại lý dạng thẻ — IN-PROGRESS

Source đã commit/push **`6ee0fc3`**: mobile 360/390 hiển thị đủ các cột thay vì
bị cắt trong bảng ngang; chọn/bỏ chọn, đối soát, F5 và empty state đều kiểm thật.
Không đổi API/seed, không truy vấn detail từng dòng hay tính tiền ở FE. Đã tách
identity/bulk bar, giữ lifecycle/permission/CSV và size picker.

Forced gates 22/22, **743 unit passed + 2 existing skips**, depcheck, MSW/native
Admin build pass; full **39/39 MSW pass**. Parity group vẫn **8/14**, sáu ảnh fail:
Đại lý mặc định 16,58%/20,66%; tìm HAOPC 1,14%/6,99%. Card đúng dạng và không
cắt dữ liệu không đồng nghĩa đã đạt pixel; thiếu bank/period fields ghi V2Q-178,
không tự thêm API trái constraint TIP-404. Xem
[agent card checkpoint](TIP-V2-404-agent-cards-checkpoint.md). P4 chưa DONE.

## Bổ sung trạng thái Admin — IN-PROGRESS

Đã mở thêm năm trạng thái parity riêng (10 ảnh), phát hiện và sửa editor tỷ lệ
cá nhân phải inline, badge khách phải dùng tổng lịch sử 14 thay vì statistic 13,
và mặc định trang chi tiết phải 8 dòng. Giữ nguyên size picker, permission và số
tiền/lịch sử API. Lượt đo gần nhất trước commit: 7/8 ảnh default/detail/edit/history
đạt; customer mobile còn 4,92%, không gọi là toàn bộ parity pass. Các tab đại lý và
chính sách cũng còn gap; xem [state checkpoint](TIP-V2-404-states-checkpoint.md).

Source đã commit/push **`5894b5b`**: 739 unit passed + 2 existing skips, forced
lint/typecheck và depcheck pass, MSW/native Admin build pass. Bộ MSW đầu **36/37**
do test chọn input ẩn của AntD; trace xác định đúng nguyên nhân. Follow-up
**`5a4349c`** bấm label đang hiển thị, vẫn kiểm checked/URL/tiền/chọn/F5, không
force-click: focused 1/1, sau đó **37/37 MSW pass** trên source đã commit/push.
Parity committed-source **8/14**, vẫn giữ sáu ảnh diff fail; chưa DONE P4.

## Geometry chốt trên `94b60c0` — IN-PROGRESS

- D-84/D-85 mặc định desktop/mobile **4/4 đạt**, lần lượt **1,4234% / 1,1162% /
  0,7973% / 1,7664%**; không mask, đổi threshold hay tự duyệt deviation.
- **725 unit passed + 2 existing skipped**, forced lint/typecheck 8/8, depcheck
  pass; **36/36 MSW** trên đúng source đã commit/push. Focused 8/8 đã nằm trong
  bộ 36, không cộng trùng. Native integration Affiliate **44/44, 18 file** chạy
  lại trên opchub_test:5432/Redis 2; không phải browser native.
- Fresh Portal/Admin native build pass. Chưa khởi động native/browser mới;
  các tab/dialog chưa có đủ parity, audit hồi quy và merge vẫn phải hoàn tất.
- Chi tiết đo DOM, sửa wrapper checkbox/toolbar/detail, các lượt fail và bằng
  chứng tại [parity checkpoint](TIP-V2-404-parity-checkpoint.md). P4 chưa DONE;
  chỉ dừng khi Affiliate/P4 nghiệm thu xong, không triển khai P5.

## Gia hạn và relay khi clock đứng yên — IN-PROGRESS

- Source `8d04869`: AT-AF04 đăng ký khách qua HAOPC, trả phí lần đầu, kiểm Admin
  có một khoản 150.000đ rồi chuyển khoản gia hạn qua UI. Chờ API trả hạn mới,
  kiểm status active, hạn tăng sang năm kế tiếp và modal tự đóng; Admin reload
  vẫn một khoản, chủ mã Portal/F5 vẫn một khách/150.000đ. Không suy ra gia hạn
  thành công chỉ từ việc không thấy khoản mới. Cùng assertion MSW/native; chỉ
  nguồn bank event dùng helper FakeBank có sẵn ở native.
- Lượt focused MSW gia hạn + responsive **2/2 pass**. Forced lint/typecheck 8/8,
  test 6/6 (**714 passed + 2 existing skipped**), depcheck hai đồ thị pass.
  Đây không phải bằng chứng browser native mới.
- Đo parity trên bridge phát hiện lỗi handshake: khi clock dừng, ping đầu tiên
  có thể đến trước iframe hydrate và interval không chạy. D-84 timeout ở login,
  chưa có ảnh để so. Dừng lượt đó sau một test timeout, không gọi là 4 pixel fail.
- Source `8635d63` sửa MSW-404-06 bằng ready message sau khi host cài listener,
  exact parent origin từ referrer đã kiểm cùng hostname/HTTP(S), không wildcard
  hay truyền credential. Sáu unit mới và browser frozen-clock giữ nguyên clock
  qua Admin/Portal/F5 pass; focused ba ca **3/3**. Forced gates pass với **720 unit
  passed + 2 existing skipped**. Fresh Portal/Admin MSW builds pass.
- Sau sửa relay, D-84/D-85 lại đo được ảnh, không tăng threshold/mask: D-84
  desktop **3,4931%**, mobile **5,3564%**; D-85 desktop **1,3799%**, mobile
  **4,2046%**. Chỉ **1/4 pass**; UI-404-03 vẫn OPEN. Report lúc đo ghi base
  `8d04869`; thay đổi chưa commit lúc đó chỉ sửa readiness, chưa đổi hình ảnh.
- Đo DOM thật chỉ ra wrapper compact của search rộng **362,203px**, bắt đầu
  x=33 nên tràn tới x=395,203 trên viewport 390. Inner input vẫn nằm trong
  viewport và root bị clip nên assertion cũ không bắt được wrapper tràn.
  Source `4ea72de` chốt width toolbar theo card và đổi test sang kiểm compact
  wrapper; không dùng root scrollWidth/inner input làm bằng chứng duy nhất.
  Net revenue căn phải theo hàng tab prototype, không đổi số tiền/API.
- Lượt hồi quy 36 test đầu bị dừng: thao tác build nhầm vào dist đang được
  browser dùng có thể làm assets không còn nhất quán. Không dùng 23 ca đã pass
  trước đó để tuyên bố suite pass; log giữ lại. Đã dừng build và suite, kiểm
  listener tắt rồi fresh build Admin để chạy lại từ đầu.
- Lượt fresh tiếp theo: **34/36**, AT-AF01 timeout 5s ở redirect `/r/HAOPC`
  và cross-app chọn checkbox lúc query debounce còn placeholder. Lượt có trace
  sau đó AT-AF01 pass nguyên assertion; cross-app dừng ở assertion mới chờ sai
  một dòng khách, **35/36**. AF0 có hai khách cùng tên Kiều Văn Sơn, khác đại lý
  (c16/c35), không phải một khách được tạo hoa hồng hai lần. Sửa test chờ đủ hai
  dòng kết quả lọc rồi mới chọn đúng cặp khách/đại lý; không nới timeout hay skip.
  Focused cross-app + compact wrapper **2/2 pass**; forced lint/typecheck/test/
  depcheck pass, **720 unit passed + 2 existing skipped**. AT-AF01 không đổi code
  để che timeout; nguyên nhân timing lần đầu chưa đủ bằng chứng để kết luận đã sửa.
- **Chốt trên source đã commit/push `4ea72de`: MSW 36/36 pass**, gồm toàn bộ
  Affiliate Portal/Admin operations/cross-origin/RBAC và ba test mới. Bao gồm
  focused 2/2 và 3/3, không cộng chúng thành test độc lập. Fresh build Admin cuối
  hoàn tất trước suite; không build/đổi source trong lúc suite chốt đang chạy.
- Parity đo nối tiếp sau suite, trên chính `4ea72de`: D-84 desktop **3,4931%**,
  mobile **4,1351%** (giảm từ 5,3564%; ảnh trở về đúng **390×3101**, không còn
  rộng 395px); D-85 desktop **1,3799%**, mobile **4,2046%**. Vẫn **1/4 pass**,
  ba raw diff cần sửa. Không nâng threshold 3%, không mask/skip/tự duyệt waiver.
- Lint/typecheck forced **8/8**, unit forced **6/6 / 720 passed + 2 existing
  skipped**, depcheck hai đồ thị pass; E2E lint/typecheck chạy lại sau khi chốt
  assertion hai khách cùng tên. Không có build/browser native mới trong lượt này.

Evidence tại [`evidence/v2-404/renewal-browser/`](evidence/v2-404/renewal-browser/).
P4 vẫn cần browser native/CSV audit, parity đạt ngưỡng, audit hồi quy, report
hoàn tất và merge main. Xong Affiliate/P4 sẽ dừng, không chạy P5.

## Payout, ghi đồng thời và first fee — source `13ea4ed`, IN-PROGRESS

Turn trước là **progress**: transport `769ee53`, evidence `6446806` đã push.
Turn này bổ sung tiền điều kiện và kiểm các nhánh tài chính còn thiếu, không
coi 18/13 test cũ hoặc một checkpoint nhỏ là hoàn tất P4.

- Thêm opt-in `--affiliate-payout` / fixture `affiliatePayout`: chuyển **đồng bộ**
  lịch sử first fee của Kiều Văn Sơn/c16 sang 11/09/2026, gồm user, fee, period,
  affiliate tự sinh, referral và commission; bỏ live bank của HAOPC nhưng giữ
  nguyên paid bank snapshots. AF0 thường và baseline tám người không đổi.
  Không mở chi trả tháng hiện tại, không đổi trạng thái production để test qua.
- Native seed helper chỉ update PK/unique key, không query trong loop hoặc tạo
  index/migration. **2/2** test Postgres mới pass; chạy lại cả seed-demo/AF0 và
  payout pack **15/15** (bao gồm hai test mới), ba file, trên **opchub_test:5432**. Preflight kiểm đúng
  database trước migration runner, không chạm dữ liệu opchub_dev.
- Browser **AT-AF01** riêng kiểm first fee tạo đúng một đại lý Tự động, Admin
  tìm được theo email và F5 vẫn một dòng. **AT-AF02** giữ luồng bank đầu tiên,
  bổ sung F5 và Admin thấy đúng một commission 150.000đ rồi chủ mã cũng thấy.
- Hai Admin tab chuẩn bị thay đổi trên HAOPC và KHOAOPC rồi bấm Lưu đồng thời:
  cả hai trả 200, F5 giữ 31% và 33%, Portal chủ mã cũng thấy rate mới. Không
  dùng hai tab trong cùng runtime hoặc Node Map chung để thay kiểm hai page.
- **AT-AF06**: Kế toán mở kỳ 09/2026, thiếu STK trả 409; Portal bổ sung bank rồi
  retry **cùng dialog/cùng Idempotency-Key** trả 200, đúng 1 khoản/150.000đ.
  F5 không còn nút trả lại kỳ đó; kỳ 10/2026 còn 600.000đ nhưng không có nút
  chi sớm. Portal thấy receipt mới/BIDV, receipt cũ/ACB giữ nguyên; đổi live bank
  lần nữa và F5 vẫn giữ bank trên receipt đã trả.
- **AT-AF05** riêng: đại lý expired vẫn sửa bank ở Portal, Kế toán chi được
  khoản recorded tháng cũ; Portal reload thấy receipt 150.000đ. Không chỉ kiểm
  nút enabled rồi suy ra backend đã thanh toán.

### Lỗi thật phát hiện khi mở rộng luồng F5

Lượt đầu payout/concurrency pass nhưng lifecycle timeout. Trace chứng minh
`button[data-m=me]` bị mask của popup **Đã gửi email chào mừng** chặn sau F5;
không phải DB/đăng nhập hỏng. Backend MSW giữ welcomeSeen trong Set ở module,
runtime mới lại phát mail đã lấy. Không force click/đóng popup lần hai trong test.

Sửa bằng state một-lần theo MockDb, đưa metadata consumed vào ledger. Restore
giữ metadata; `resetMockDb` vẫn tách test. Ledger v1 cũ thiếu metadata được nhận
với danh sách rỗng, **không xóa dữ liệu tài chính**. Hai unit kiểm reset/restore,
người dùng khác và đọc ledger cũ; lifecycle bắt buộc F5 không có popup trước
logout. Finding MSW-404-05 trong BUGS; BUG-045 cache đổi tài khoản vẫn là lỗi
khác, không gộp nhầm. Lượt diagnostic fail được lưu, không giấu bằng lượt rerun.

### Gate trên nội dung source chốt

- Forced lint/typecheck: **8/8** task mỗi lệnh, exit 0.
- Forced unit: **714 passed + 2 existing skipped**, **6/6** task; shared 129.
- Depcheck: hai đồ thị pass. Fresh Portal/Admin MSW build pass.
- Focused browser MSW: **5/5 pass**, gồm AT-AF01/02/05/06 + concurrent writes.
- Chạy lại trên đúng source đã commit/push `13ea4ed`: toàn bộ Affiliate Portal,
  Admin operations, cross-origin và RBAC **33/33 pass**, exit 0, 2.2 phút;
  đã bao gồm năm case focused, không cộng thành 38 test riêng. Bộ này không
  phải toàn UAT-01…31 hoặc audit E2E/native. Focused unit cuối cùng **10/10**.
- Native fixture regression: **15/15 pass**, không phải browser native.
- Chưa chạy build/browser native mới, chưa đo lại parity trên checkpoint này.

Evidence tại [`evidence/v2-404/payout-browser/`](evidence/v2-404/payout-browser/).
AT-AF04 renewal browser, native tất cả case mới/CSV audit, parity ba ảnh và đủ
tab/dialog, audit hồi quy C1–C6/E2E, report404/P4 và merge main vẫn còn phải làm.
Không P5; goal vẫn active và P4 chưa DONE.

## Transport hai origin MSW — source `769ee53`, IN-PROGRESS

Turn trước là **progress**: snapshot `c72520c`/evidence `24429dd` đã push, 703
unit pass. Turn này đã nối transport, không chỉ báo lại kế hoạch hoặc đếm unit.

- Portal và Admin MSW chạy handler thông thường dưới một lease: iframe relay
  tại origin Portal, Web Lock chung giữa app/tab, localStorage lưu snapshot
  đầy đủ; chỉ trả response thành công sau commit ack. Schema zod kiểm cả
  postMessage và snapshot; lỗi quota/corruption trả lỗi, không xóa/cắt ledger.
- Browser entry tách khỏi barrel domain Node (`./mock-affiliate-browser`),
  tránh kéo DOM type vào db/server. Không dependency mới, không sửa SQL/API
  nghiệp vụ, không chuyển MSW sang gọi native. Native route có guard notFound
  theo mode; **chưa kiểm 404 bằng browser native**.
- Admin MSW phải build với NEXT_PUBLIC_PORTAL_URL đúng Portal origin cùng host;
  ghi chú trong `.env.example`. Relay không nhận credential/grant/role.
- Fake bank webhook nay giữ due-time trong snapshot và xử lý dưới lease,
  không còn mất timer khi F5 ở browser. Nhánh timer Node/unit cũ vẫn giữ nguyên.
  Bank GET không nạp sessionStorage cũ đè lên STK mới của shared ledger.
- **Browser hai origin đã pass**: Portal đổi bank → Admin detail thấy bank mới;
  Admin đổi rate 31%, F5 cả hai vẫn giữ; policy 45 ngày xuất hiện ở Portal;
  lịch sử paid giữ ACB cũ dù live bank đổi BIDV; Admin hủy Kiều Văn Sơn bắt buộc
  lý do → Portal hiển thị Đã hủy kèm đúng tooltip lý do. Test không có nhánh
  onServer làm yếu assertion; native chạy cùng test vẫn đang chờ.

| Gate | Kết quả trên nội dung source chốt |
|---|---|
| Fresh Portal + Admin MSW builds | exit 0 cả hai |
| Fresh Portal + Admin native builds | exit 0 cả hai; không thay thế browser native |
| Focused snapshot/relay/webhook unit | 23 passed, 3 file |
| Forced lint/typecheck | 8/8 task mỗi lệnh, exit 0 |
| Forced unit | **709 passed + 2 existing skipped**, 6/6 task |
| Depcheck | hai đồ thị pass |
| Admin operations/RBAC + cross-origin + lifecycle browser MSW | **18/18**, exit 0 |
| Portal Affiliate toàn bộ + cross-origin browser MSW | **13/13**, exit 0 |

Hai browser suite có overlap, **không cộng thành 31 test độc lập**. Sáu unit
mới kiểm lease commit/load/abort, corruption, quota, invalid command và fake
webhook qua reset, ngoài 17 snapshot test đã có. WebServer có dòng lỗi wrapper
khi Playwright teardown nhưng command exit 0 và các test đều pass; không giấu
log. Chưa dùng các kết quả này để đóng toàn bộ bridge/AT-AF/P4.

### Gate còn mở

- Browser payout/receipt và ghi đồng thời nhiều tab, first fee mới xuất hiện ở
  Admin, renewal/no-extra và đủ AT-AF01…06 hai target chưa được chứng minh đủ.
- Native browser financial flows/CSV audit; parity ba ảnh fail và đủ tab/dialog;
  audit C1–C6/E2E, completion report404/P4, merge main vẫn phải hoàn tất.
- Không triển khai P5. Goal vẫn active; Affiliate chưa nghiệm thu xong nên chưa
  dừng hoặc báo DONE. Evidence checkpoint tại
  [`evidence/v2-404/cross-origin-bridge/`](evidence/v2-404/cross-origin-bridge/).

## Lớp state cho bridge MSW — source `c72520c`, IN-PROGRESS

Turn trước là **progress**: `ea4c189` sửa guard account locked, `8108d35` lưu
evidence, build hai target và browser MSW pass. Turn này xây lớp lưu/khôi phục
state tài chính, không đổi mục tiêu thành chỉ cần unit pass.

- Module riêng `shared/mock-data/domains/affiliate-persistence/`, có zod schema
  versioned trong shared, capture deep-clone và restore parse toàn bộ trước khi
  sửa state. Không copy credential/role/grant hoặc đưa state vào component UI.
- Gồm phí/đại lý/referral, policy, clicks/dedup, payouts, receipt idempotency,
  snapshot ngân hàng từng khoản paid, Affiliate notices/audit/settings log và
  sequence counter. Capture đóng băng lịch sử paid trước đổi STK hiện hành.
- Restore không chạy lại payout/cancel/rate hoặc phát thông báo/audit lần hai;
  chỉ thay dữ liệu Affiliate, giữ audit/settings/notices của domain khác.
- Phát hiện thêm điều kiện tích hợp: sau restore vào runtime mới, middleware
  AF0 có thể seed lần nữa vì WeakSet theo MockDb đã mất. Snapshot nay giữ marker
  seed; regression gọi lại middleware rồi kiểm vẫn 64 phí/62 đại lý/51 referral.
- 17 focused test pass: JSON round-trip toàn bộ AF0 vượt 3800 ký tự không cắt,
  first fee/auto-agent/referral/renewal, bank/rate lịch sử và retry payout không
  thêm audit, lý do hủy, paused, missing bank rồi bổ sung STK, click dedup,
  base-pack độc lập, key idempotency 200 ký tự, payload sai bị từ chối nguyên khối và không alias object.
- Forced gates trên nội dung source chốt: lint/typecheck **8/8** mỗi lệnh, full
  unit **703 passed + 2 existing skipped**, **6/6** task (shared 118, Portal 163,
  Admin 243, server 111, UI 43, integrations 25); depcheck cả hai đồ thị pass.
  Kiểm thêm key idempotency tối đa đã phát hiện composite receipt key dài hơn
  200 ký tự; schema không áp trần ID vào key ghép làm mất receipt hợp lệ.
- Evidence tại [`evidence/v2-404/financial-snapshot/`](evidence/v2-404/financial-snapshot/).
  Không chạy lại build/browser/parity ở checkpoint này; số browser/build của
  `ea4c189` và parity của `6437a46` phía dưới vẫn là bằng chứng lịch sử, không
  tự gắn chúng thành lượt chạy trên source mới.
- **Chưa nối browser transport.** Reset runtime trong unit không chứng minh
  Portal/Admin khác origin đã đồng bộ; chưa dùng để đóng AT-AF01…06, LK-10,
  parity hoặc completion P4. Fake webhook hẹn giờ và độ bền qua F5/tab còn phải
  được tích hợp/kiểm trong bước transport, không bỏ khỏi scope.

## Kiểm khóa phiên mock + fresh native build — source `ea4c189`

Turn trước là **progress**: source `6437a46` và evidence `66a406f` đã commit/push;
parity đúng SHA chứng minh còn ba ảnh fail. Không coi là wait hoặc DONE P4.

- Rà đường đồng bộ MSW phát hiện guard Affiliate cho bearer cũ vượt qua khi
  account bị khóa. `mockAdminMeOf` vẫn trả profile của account locked, khác với
  helper refresh đã kiểm active. Đã thêm kiểm trạng thái hiện hành ở guard chung.
- 14 regression API kiểm đủ bảy route đọc và bảy route ghi/xuất: 401 khi đã khóa,
  đọc lại được sau mở khóa; write bị chặn không đổi tiền/referral/payout/policy,
  không phát sinh audit. Chi tiết finding **MSW-404-04 CLOSED** trong BUGS.
- Forced lint/typecheck **8/8** mỗi lệnh, full unit **686 passed + 2 existing
  skipped** (Admin 243), **6/6** task; cả hai đồ thị depcheck pass.
- Fresh Admin **native build pass**, gồm các UI policy/count/caption đã chốt.
  Build không đồng nghĩa browser native đã được nghiệm thu; chưa chạy native
  browser financial flows ở checkpoint này.
- Fresh MSW Admin build và **16/16** browser Affiliate operations/Admin/RBAC
  pass trên source đã commit `ea4c189`. Không đổi assertion theo target hoặc
  nới quyền để qua test. Logs đã lọc secret và manifest source tại
  [`evidence/v2-404/locked-session/`](evidence/v2-404/locked-session/).

### Kết quả rà bridge — vẫn OPEN, không tuyên bố đã đồng bộ

- Portal/Admin khởi tạo worker và mock store riêng. Hai file investor bridge
  dùng cookie chung host; `investorBridgeCookie` bỏ comment cũ khi quá 3800 ký tự,
  còn service bridge bỏ request cũ. Không tái sử dụng cách bỏ dữ liệu này cho
  commission/payout hoặc ngầm nối MSW sang API native.
- Chỉ copy số dư hoặc bank là chưa đủ: phải giữ fee/đại lý tự sinh/referral,
  policy/rate/cancel, receipt idempotency và snapshot ngân hàng lịch sử sau reload.
  `affiliateAdminState` giữ snapshot/receipt trong WeakMap riêng; bỏ qua chúng sẽ
  có nguy cơ làm sai lịch sử dù thống kê hiện tại trông đúng.
- Portal còn bank sessionStorage riêng và fake webhook hẹn giờ ngoài request.
  Khi làm bridge phải kiểm cả bank sau reload và fee/webhook không bị ghi đè bởi
  state app kia. Chưa chọn/triển khai một transport mới trong checkpoint này.
- Node test dùng chung module **không** chứng minh hai browser origin đồng bộ.
  Bridge, AT-AF01…06 hai target, ba raw parity và các tab/dialog, audit hồi quy,
  completion report/merge P4 vẫn là gate bắt buộc. Không triển khai P5.

## Checkpoint tiếp tục — source `9d3e34f`, `6437a46`

Pha 4 vẫn **IN-PROGRESS**, goal đã kiểm là **active**. Không gọi pause/complete
ở checkpoint này. Pause không phải bằng chứng nghiệm thu; giữ yêu cầu hoàn tất
Affiliate rồi dừng, không triển khai P5.

- `9d3e34f`: chi tiết đại lý đọc số ngày ghi nhận từ API policy, không hardcode
  30 ngày; thiếu dữ liệu thì không bịa giá trị. Tháng recorded có nhãn chưa chi
  trả riêng, không thay trạng thái commission hoặc điều kiện chi trả. Thêm kiểm
  policy invalidate 45→17 ngày và assertion browser sau lưu chính sách.
- `6437a46`: số đếm trạng thái lấy total từ API phân trang hiện có (size 1),
  không lấy độ dài trang, không chia doanh thu cho một mức phí giả định. Caption
  khách chuyển đổi cộng recorded + paid, loại cancelled; thiếu một total thì
  không hiện số giả. Caption tỷ lệ chỉ định dạng phần trăm; tiền VND giữ nguyên
  số server trả. Lịch kỳ tới dùng ngày cuối tháng Việt Nam, có test ranh giới
  UTC+7 và năm nhuận; chưa kiểm UI tự đổi ngày khi để màn qua nửa đêm.
- Bổ sung badge bộ lọc, caption thống kê và chỉnh kích thước search/detail/pager
  mobile. Không ẩn dữ liệu tiền hoặc bỏ điều khiển phân trang để khớp ảnh.
- Ba lỗi lint require-await trong mock mới đã sửa bằng Promise.resolve/reject,
  không tắt rule. Forced lint/typecheck **8/8** mỗi lệnh; unit **672 passed + 2
  existing skipped** (Admin 229), **6/6** task; depcheck cả hai đồ thị pass.
- Fresh MSW Admin build và **16/16** behavior pass trên nội dung source này.
  Native browser và native build mới cho hai checkpoint này **chưa chạy**.
- Raw parity lượt trước commit: D-84 desktop **3.493088%**, mobile **5.356377%**;
  D-85 desktop **1.379861%**, mobile **4.204617%**. Vẫn chỉ **1/4 đạt**, chưa thể
  báo hoàn tất. Harness chạy lại đúng `6437a46` cho cùng số đo, **3 failed / 1
  passed**, exit 1; giữ nguyên ngưỡng 3%, không mask/skip/waiver tự duyệt.

Các gate còn thiếu vẫn gồm bridge MSW Portal–Admin, AT-AF01…06/native financial
flows, đủ parity tab/dialog, audit hồi quy, completion report và merge P4. Không
dùng unit/build/MSW behavior thay cho bằng chứng này. Evidence checkpoint tại
[`evidence/v2-404/admin-summary/`](evidence/v2-404/admin-summary/).

## UI parity mở lại + responsive — source `c7cb493`

Turn trước có tiến triển thực: source `034bd00`, gates/browser và evidence đã
commit/push. Turn này tiếp tục từ cây sạch `7f645c9`, không lặp báo tiến độ.

- Bật D-84/D-85 bằng scenario độc lập; file RBAC cũ chỉ re-export 1 dòng.
  Dataset AF0 ở cả MSW/native; D-84 đo mặc định, không lọc bớt 62 đại lý tự sinh.
  D-85 tìm HAOPC rồi mở chi tiết bằng thao tác UI. Full-page cả desktop/mobile,
  không mask/nới ngưỡng; normalize scroll ở cả hai phía sau điều hướng chi tiết
  vì prototype giữ scroll của danh sách dài làm lệch sticky header.
- Ảnh ban đầu chứng minh UI Admin chưa khớp: D-84 desktop 5.75%, mobile 52.38%,
  D-85 mobile 28.82%. Không suy diễn từ 16 behavior pass rằng UI đã đạt.
- Sửa cấu trúc card/header/toolbar, pager nằm trong card; commission có độ rộng
  cột và menu dấu ba chấm giữ aria-label; mobile chuyển thành thẻ đủ trường,
  không cắt/hide dữ liệu tài chính. Chỉ ẩn hàng đo kích thước rỗng của AntD.
- Chi tiết đại lý gom thành một card: identity/bank → stats (mobile 2 cột) →
  rate editor → monthly/customer table. Vẫn dùng dialog/permission guard cũ,
  cảnh báo paused/missing bank giữ nguyên; không đổi tiền/trạng thái/snapshot.
- Thêm nút CSV mặc định xuất toàn bộ tập lọc qua API, tách nhãn truy cập với
  CSV các ID chọn trong bulk bar. Ba unit kiểm filters/pending; bốn unit mới
  kiểm thứ tự nội dung detail/bank/warnings/permission/editor rate thực.
- CSS theo domain riêng, không tăng monolith/shared UI. Không dependency,
  migration hoặc sửa backend để phục vụ ảnh.

| Gate trên source chốt | Kết quả |
|---|---|
| Forced lint/typecheck | 8/8 task mỗi lệnh, exit 0 |
| Forced unit | **660 passed + 2 existing skipped**, 6/6 task; Admin 217 |
| Depcheck | hai đồ thị pass |
| Fresh Admin MSW + native builds | exit 0 cả hai |
| MSW behavior Affiliate operations/Admin/RBAC | **16/16**, exit 0 |

### Raw parity sau khi commit/push source

Đã chạy lại trên đúng `c7cb493`, không chỉ gắn SHA mới vào số đo cũ. Kết quả
trùng lượt trước commit; report sinh từ harness giữ đúng source SHA:

| Màn | 1440 | 390 |
|---|---:|---:|
| D-84 mặc định | **4.230858% FAIL** | **4.582076% FAIL** |
| D-85 chi tiết HAOPC | **1.466281% PASS** | **6.956654% FAIL** |

Parity **1/4 passed, 3/4 failed, command exit 1**. Chưa đạt ≤3%, không báo
DONE, không đánh dấu deviation được duyệt hay bỏ test fail. `results.json/md`
và ba ảnh diff fail được commit; log/manifest tại
[`evidence/v2-404/admin-layout/`](evidence/v2-404/admin-layout/).

### Còn phải làm đúng scope Affiliate

- Sửa ba raw parity còn fail và các trạng thái/tab/dialog chưa đo. Copy/caption
  thống kê, date-range demo, hint thời gian cookie trong detail còn thiếu so với
  prototype; không bịa count/policy hoặc hardcode 30 ngày để khớp ảnh.
- Dữ liệu SRS có đại lý tự sinh của mọi khách đã đóng phí (62 thay vì 6 ở demo
  prototype), tháng có paid + cancelled là mixed theo API, current month không
  được chi trả sớm. Không sửa các quy tắc này chỉ để giống prototype; cần ghi
  rõ sai khác nghiệp vụ trong audit/parity khi chốt, không coi là waiver sẵn có.
- Browser native chưa chạy cho checkpoint này; native build không thay thế E2E.
  Bridge tài chính Portal–Admin MSW, payout UI/CSV audit native, AT-AF01…06 hai
  phía, audit C1–C6/E2E, completion report và merge P4 vẫn mở. Không bắt đầu P5.

## Admin operations + pagination — source `034bd00`

- Test mới phát hiện thiếu điều khiển đổi cỡ trang: AdminTable mặc định ẩn
  size changer, dù URL/API đã nhận `size`. Thêm component riêng
  `AffiliatePagination`, tái sử dụng Pagination của packages/ui, nối vào cả
  Hoa hồng/Affiliate/tháng/khách hàng. Không sửa component shared, không giữ hai
  pager. Đổi size reset page 1; điều khiển đọc được trong chế độ chỉ xem.
- Ba unit mới kiểm size/reset, page không thay size, empty không hiện pager.
- Ba browser case mới ở `admin-affiliate-operations.spec.ts`, không có nhánh
  assertion theo target: chọn hai affiliate đặt 30%, khoản recorded thành
  180.000đ nhưng paid/cancelled giữ 25%/150.000đ và snapshot; đổi page/size/F5;
  CSV đúng hai dòng chọn, BOM/filename/số tiền, mở Nhật ký thấy export mới.
  Audit response phải có timestamp sau lúc thao tác để không lấy dòng cũ sống
  qua các lượt seed native làm bằng chứng.
- Test ban đầu chọn nhầm khách AF0 c18 cancelled làm paid; đối chiếu fixture
  sửa sang c19 paid, vẫn kiểm riêng c18 cancelled. Không đổi seed/trạng thái để
  làm test xanh. Danh sách có cả đại lý tự sinh của khách đóng phí, vì vậy dùng
  cỡ 100 để hai chủ đại lý cũ cùng hiện trên trang, không ẩn các đại lý hợp lệ.
- Lượt regression phát hiện click checkbox lúc còn placeholder trước debounce.
  Test hủy và CSV nay chờ đủ 9 dòng AF0 của Nguyễn Văn An rồi mới chọn; giữ
  nguyên kiểm bắt buộc lý do/hủy hai dòng, không thêm retry/force hoặc bỏ guard.

| Kiểm chứng | Kết quả |
|---|---|
| Forced lint/typecheck | 8/8 task mỗi lệnh, exit 0 |
| Forced unit | 6/6 task, **653 passed + 2 existing skipped**; Admin 210 |
| Depcheck | hai đồ thị pass |
| E2E lint/typecheck sau sửa fixture/đợi dữ liệu cuối | exit 0 cả hai |
| Fresh Admin MSW build (`NEXT_PUBLIC_API_MOCKING=msw`) | exit 0 |
| MSW browser, 1 worker | **16/16**: operations 3 + Admin Affiliate 4 + RBAC 9 |
| Fresh Admin native build (`off`, `.next-server`) | exit 0 |

Build MSW đầu tiên dùng nhầm giá trị env `on` bị zod chặn; đã chạy lại với
enum đúng `msw`, không nới validation. Các lượt lỗi test trước sửa không tính
là pass. Log cuối tại [`evidence/v2-404/admin-operations/`](evidence/v2-404/admin-operations/).
Source đã commit/push ngay sau gates + browser pass. Native build xong sau đó;
**chưa chạy browser native** cho source này. Bridge hai app, payout UI, AT-AF,
parity D-84/85, audit C1–C6/E2E và report/merge P4 vẫn chưa hoàn tất.

## Native preflight trên source `7c12a6f` — 20/10/2026

- Revalidate: nhánh `feature/V2-P4-affiliate`, HEAD docs `5289428`, working tree
  sạch trước bước này. Turn hỏi tiến độ trước chỉ xác nhận trạng thái, chưa có
  tiến triển thực thi; turn này tiếp tục bằng build và DB test, không báo DONE.
- Build mới server (tsdown) và cả Portal/Admin production native vào
  `.next-server`, mocking off, API/socket dev 4020/4021: cả hai lệnh exit 0.
  Binary server mới đã có contract `paid`; không còn phải dùng binary trước 402A.
- `pnpm --filter @opchub/server test:int test/affiliate`: **44/44 tests,
  18/18 files**, exit 0, 76.67 giây. Đây là toàn thư mục integration Affiliate,
  gồm paid summary, payout/history, races, guards, referral và query plans;
  không phải toàn suite server hoặc browser native.
- Lệnh dựng phiên native có kiểm ownership/cleanup bị công cụ từ chối trước
  khi chạy. Không retry bằng đường vòng, không có runner/tiến trình nào được
  tạo bởi lệnh bị từ chối. Kiểm lại không có listener trên 4020/4021/3280/3282/4800.
  Vì thế **chưa có browser native mới**, không suy diễn từ build/test DB.
- Log build và DB test đã chuẩn hóa/redact tại
  [`evidence/v2-404/native-preflight/`](evidence/v2-404/native-preflight/).
- TEST-GAPS REQ-308/310/312 cập nhật **PARTIAL** theo bằng chứng UI/MSW đã có,
  bỏ nhãn TRỐNG lỗi thời cho 312 nhưng giữ nguyên các phần chưa chứng minh:
  native cùng assertion, bridge hai app, payout/CSV audit UI và parity D-84/85.

P4 vẫn IN-PROGRESS; không merge main, không triển khai P5, không coi request
dừng sau Affiliate là cho phép bỏ các tiêu chí nghiệm thu Affiliate.

## Checkpoint contract foundation — `257a29e`

Đã bắt đầu Admin Affiliate sau khi chốt Portal TIP-403. Nhánh vẫn là
`feature/V2-P4-affiliate`; chưa dựng xong UI, chưa báo DONE TIP-404.

- `features/affiliate/api.ts`: đủ hàm đọc summary/commissions/agents/detail/
  months/customers/policy; ghi cancel/rate/bulk-rate/payout/policy; hai endpoint
  CSV audited. Parse response qua shared zod và dùng API client chung.
- Query-key factory phân biệt danh sách, filter, detail, tab, policy; chung root
  để mutation sau này invalidate dữ liệu đúng phạm vi.
- Payout nhận idempotency key từ caller để retry cùng financial intent, không
  tự tạo key mới cho mỗi HTTP attempt, không gửi tổng tiền tính ở frontend.
- URL model cho tab, search, month, status, page/size và detail months/customers;
  invalid input về mặc định; query encode đúng, không chèn được filter từ search.
- Chỉ gate tháng đã kết thúc theo lịch Việt Nam, không tính lại tiền/số tổng.
- Types riêng; 12 unit trong hai file riêng, không nối logic vào monolith.

### Verification

| Lệnh | Kết quả |
|---|---|
| Focused Admin unit | 12/12, hai file |
| `pnpm exec turbo run lint --force` | exit 0, 8/8 tasks; cảnh báo img cũ |
| `pnpm exec turbo run typecheck --force` | exit 0, 8/8 tasks |
| `pnpm exec turbo run test --force` | exit 0, 6/6 tasks; 611 passed, 2 existing skipped |
| `pnpm depcheck` | exit 0, hai đồ thị |
| Prettier + `git diff --check` | pass |

Admin unit nay 170/170; Portal 163, shared 99, UI 43, server 111, integrations
25 passed + 2 skipped. Không cộng các lượt chạy lặp làm case mới.
Log: [`evidence/v2-404/foundation/`](evidence/v2-404/foundation/).

API unit ở checkpoint này chỉ chứng minh wiring đường dẫn/method/body/key/schema
và query isolation, không giả làm bằng chứng endpoint chạy native/MSW hoặc audit
log đã xuất hiện trên UI. Endpoint backend có integration từ TIP-402; chưa chạy
lại integration/E2E/build/parity cho source Admin mới này.

## Phát hiện khi đối chiếu ver2

`V2Q-174`: prototype có thẻ thứ tư **Đã chi trả**, và net revenue nằm ở hàng tab.
Shared summary hiện không có field paid; không lấy `netRevenue` gắn nhãn Đã chi
trả hoặc tự trừ tiền trong component. Cần xử lý contract gap trước nghiệm thu;
chưa sửa backend trong checkpoint TIP-404 này.

**Follow-up đã xử lý:** [TIP-V2-402A](TIP-V2-402A-completion.md), source `0a9fc8d`,
bổ sung `paid` từ cùng aggregate backend, 9/9 integration và 613 unit pass.
Contract gap paid đã đóng, không phải hoàn tất UI hoặc parity Admin TIP-404.

## Tiếp theo / chưa làm

1. Query/mutation hooks, selection, quyền `affiliate.view/action/payout` và preview.
2. Màn/tab/tables/dialogs/detail/policy theo layout prototype thực; menu/i18n/
   route wiring giữ `.wire-lock`. Loading/empty/error/no-permission đầy đủ.
3. Mock Admin cùng domain state với Portal, validation và audit đúng contract.
4. AT-AF01…06, Admin bulk cancel/rate/CSV, quyền Kế toán/Quản trị viên/Biên tập,
   payout snapshot/lý do hủy ở cả hai phía; MSW/native cùng assertion.
5. D-84/85 và các trạng thái mới, threshold 3%, không che lệch hoặc đổi dữ liệu
   để bỏ các đại lý tự sinh hợp lệ trong AF0 (V2Q-173).

P4 audit C1–C6/audit E2E/report/merge và toàn P5 vẫn thuộc goal, chưa hoàn tất.
Không bật thêm service trong checkpoint này; không có link preview ổn định.

## Checkpoint UI / guarded actions — source `5aed95d`

Đã dựng route Admin `/affiliate` và `/affiliate/:id`, menu theo đúng khoá view,
i18n riêng và các màn/component theo domain. Source đã commit/push; **TIP-404
vẫn IN-PROGRESS**, chưa có E2E/parity cho Admin mới.

- Ba tab Hoa hồng/Affiliate/Chính sách; query root/filter/count/detail riêng,
  chỉ fetch tab đang mở, số đếm tab lấy từ total không lọc của server (không dùng
  độ dài trang). Tab/search/month/status/page/size nằm trên URL.
- Tìm debounce 300ms; filter trạng thái cùng toolbar. Select tháng có 24 tháng
  lịch và luôn giữ tháng lịch sử đang chọn trên URL. Cần kiểm thêm nhu cầu chọn
  các kỳ cũ hơn qua UI khi nghiệm thu, không coi đây là danh mục tháng từ DB.
- Thẻ tiền hiển thị nguyên số API, gồm `paid` mới từ TIP-402A; net revenue ở
  hàng tab. Chưa đo parity, các caption/layout/copy còn phải đối chiếu trình duyệt.
- Bảng Hoa hồng/Đại lý, selection trang hiện tại, bulk hủy/đặt %/CSV; link sang
  chi tiết. Không có nút tạo đại lý/duyệt commission. Trang cuối bị rỗng sau thay
  đổi dữ liệu được đưa về trang thực cuối; placeholder cũ không được dùng để
  chọn/chạy thao tác tài chính.
- Chi tiết có thông tin/ngân hàng/rate/stats, tab tháng và khách; payout hiển thị
  bank snapshot cũ, cancellation reason có tooltip/accessibility text.
- Hộp hủy bắt buộc lý do; rate 1–50%; payout nhận số payable từ API và chỉ mở
  cho tháng đã kết thúc theo giờ VN. Không khóa nút do thiếu bank: để API 409
  và giữ intent/key cho retry. Backend vẫn quyết định mọi điều kiện chi trả.
- Hook mutation kiểm lại `affiliate.action`/`affiliate.payout`, kể cả dialog nằm
  trong portal DOM ngoài vùng read-only. Preview không ghi dù có đủ key; không
  kiểm tên vai trò. Mutation thành công mới toast/invalidate/đóng dialog; thất
  bại giữ form và lỗi server. Individual rate dùng PATCH, bulk dùng PUT.
- Chính sách có form/rules/validation và PUT API; CSV dùng endpoint đã audited,
  không dựng CSV từ một trang client. Ghi nhật ký qua UI vẫn phải E2E kiểm sau.
- Loading/error/empty/403 nối vào component chung; `.wire-lock` giữ lúc nối
  menu/messages và đã xóa sau wiring. Không thêm dependency/schema/migration.

### Evidence cuối checkpoint

| Gate | Kết quả |
|---|---|
| Forced lint | 8/8 tasks, exit 0 |
| Forced typecheck | 8/8 tasks, exit 0 |
| Forced unit | 6/6 tasks, **635 passed, 2 existing skipped**, exit 0 |
| Depcheck | hai đồ thị pass, exit 0 |
| Admin production build MSW/native | exit 0 cả hai, có route `/affiliate/[[...slug]]` |
| Prettier / diff check | pass |

Admin 192/192, tăng 22 case: query gating/count/tab/error (6), write permissions/
preview/retry/invalidation (6), dialog validation/conflict/key (4), stats/status
presentation (4), page reconciliation (2). Cộng với 12 API/model trước đó là
34 case Affiliate Admin, không phải 34 E2E. Các test API callback dùng mock,
không thay thế chứng cứ native hoặc MSW handler. Test dialog còn cảnh báo jsdom
không hỗ trợ pseudo-element getComputedStyle; test pass, không suppress assertion.

Log đã chuẩn hóa UTF-8/LF và lọc nhạy cảm:
[`evidence/v2-404/ui-checkpoint/`](evidence/v2-404/ui-checkpoint/).
Inventory source lấy từ Git, các file TS/TSX domain hiện tối đa 152 dòng.
Build/gate cuối chạy cùng source; chưa sửa source sau đó.

### Chưa nghiệm thu

1. Admin MSW handlers/domain operations và dữ liệu đồng bộ các flow Portal ↔
   Admin. Chưa có handler mới nên không tuyên bố UI MSW dùng được toàn luồng.
2. AT-AF01…06, quyền từng vai trò, bulk/CSV audit, payout/cancel hai phía trên
   MSW/native; chưa có browser evidence mới cho các màn Admin này.
3. Đo/sửa parity D-84/85 và trạng thái liên quan theo prototype đang chạy,
   không kết luận giống ≤3% từ việc build/unit pass.
4. Build lại server mới (TIP-402A có thêm paid summary) trước khi chạy native;
   không dùng binary daemon cũ thiếu field rồi nới response schema để né lỗi.
5. P4 audit/report/merge và P5 toàn bộ vẫn còn. Không mở preview/service trong
   checkpoint này; không để link port test đã tắt làm link bàn giao.

## Checkpoint MSW backend + browser regression — source `7c12a6f`

**TIP-404 vẫn IN-PROGRESS.** Đã bổ sung domain MSW và handlers Admin; chưa chốt
AT-AF01…06 xuyên hai app hoặc parity/native của Admin mới.

- Domain tách `affiliate-admin/{read,state,write,payout,csv,notice,validation}`;
  chính sách là module lá độc lập để tránh vòng import. Đồng bộ thành đại lý
  khi phí được ghi nhận, không tạo thêm commission lúc gia hạn.
- API đọc đủ summary (có paid), commissions, agents, detail, months, customers,
  policy; phân trang/search/status/tháng có dữ liệu AF0 51 commission/62 đại lý.
  Số người đã đóng phí được tạo đại lý đầy đủ, không giấu 51 khách tự sinh.
- Rate chỉ tính lại recorded, paid/cancelled bất biến; cancel bắt buộc lý do,
  id lạ không đổi một phần, retry không hủy/báo lại khoản đã hủy. Có audit/notice.
- Payout chỉ tháng đã kết thúc, thiếu bank 409 không đổi commission/audit;
  đại lý paused vẫn nhận khoản cũ. Receipt theo actor/id/month/key, retry trả
  cùng kết quả, bank snapshot theo commission không bị bank mới ghi đè.
- Policy cập nhật TTL và rate cho đại lý mới, không đổi % đã gán của đại lý cũ;
  resetMockDb loại policy/receipt/snapshot cũ. CSV đúng tên/header/BOM, xử lý
  formula injection và ghi action `affiliate.export` như native.
- Handler kiểm `affiliate.view/action/payout`, parse input qua shared zod, cùng
  demo cookie/paused precondition với Portal. Không thêm dependency/migration.

### Lỗi F5 đã được tìm và sửa, không bỏ assertion

E2E Admin mới ban đầu mất trang khi reload: mock refresh trả 401 cố định, đồng
thời AuthGate/SetupGate bỏ qua refresh riêng ở MSW. Thêm helper phiên giả chỉ
lưu account id (không lưu credential/permission), lấy lại grant mới từ mock
backend, clear khi logout, không khôi phục account lạ/locked. Hai gate nay đi
cùng lifecycle native/MSW. Ba unit session, bốn unit gate và E2E reload giữ
nguyên URL/search đều pass. Native auth/session implementation không thay đổi.

AF0 có ba khách cùng tên Đỗ Minh Tuấn (identity khác nhau): test giữ assertion
ba kết quả tìm kiếm và xác định dòng bằng cả tên khách + đại lý, không `.first()`
để che trùng. AT-RB02 bổ sung đúng menu Affiliate của Kế toán; test preview
Super Admin có 12 menu và vẫn kiểm khôi phục toàn bộ danh sách sau thoát preview.

### Gate / runtime evidence

| Bộ kiểm cuối | Kết quả |
|---|---|
| Forced lint/typecheck | mỗi lệnh 8/8 task, exit 0 |
| Forced unit | 6/6 task, **650 passed, 2 existing skipped** |
| Depcheck | hai đồ thị pass, không cycle/import violation |
| Portal/Admin MSW production builds | exit 0 cả hai |
| Selected MSW browser suite | **25/25**, exit 0: Admin Affiliate 4 + Portal Affiliate 12 + Admin RBAC 9 |

Admin unit 207, shared 101, Portal 163, server 111, UI 43, integrations 25 passed
+ 2 skipped. Thêm 15 case từ checkpoint UI: handler 8, session 3, gate 4.
Không cộng test chạy lặp hay node handler test thành E2E native.

Log/manifest: [`evidence/v2-404/msw-checkpoint/`](evidence/v2-404/msw-checkpoint/).
Portal build đã bao gồm shared source chốt; Admin build chạy lại sau sửa gate.
Gates cuối bao gồm source E2E mới. Không có source edit sau các gate cuối.
Playwright đã tự dừng các web server do nó mở; không giữ preview trên 3236/3238.

### Phần còn lại giữ nguyên scope goal

1. MSW Portal/Admin hiện có kho runtime riêng theo app. Node test dùng chung
   module không chứng minh browser hai origin đồng bộ. Cần bridge có test cho
   register/fee/bank/rate/cancel/payout/policy giữa hai app và reload; không dùng
   API native thay MSW chỉ để hai target cùng xanh.
2. Các case Admin mới đã có cùng assertion cho hai config nhưng **chưa chạy
   native**. Cần build lại server với paid summary và native Admin sau sửa gate,
   chạy AT-AF01…06/chi trả/CSV audit/khóa quyền thực trên Postgres dev.
3. D-84/85, các trạng thái/dialog và layout/caption/copy chưa đo parity Admin.
   Không tuyên bố đạt ≤3% từ build hoặc unit/browser behavior pass.
4. Còn audit C1–C6/audit E2E, report/merge P4, toàn P5 và nghiệm thu cuối.

### Ghi chú Git/environment

Sau đổi sandbox phát hiện hai loose ref local/origin của nhánh bị 41 byte zero.
Commit/object/reflog còn nguyên; index và source khớp `9a4ccc5`, `ls-remote`
xác nhận origin cùng SHA. Đã được duyệt phục hồi riêng hai ref, giữ backup ở
`.git/ref-recovery-20261020`; không reset/checkout source, không sửa index hay
viết lại lịch sử. Source checkpoint mới được commit/push sau khi test pass.
