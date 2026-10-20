# TIP-V2-404 — IN-PROGRESS

> Chỉ đạo mới của user ngày 20/10/2026: hoàn tất Affiliate/Pha 4 rồi dừng.
> Tiếp tục đầy đủ tích hợp/native/parity/audit/report/merge P4; không triển khai
> Pha 5 bot. Chưa dừng ngay vì Affiliate chưa nghiệm thu xong. Goal gốc vẫn giữ
> lịch sử; khi P4 thực sự hoàn tất thì thực hiện yêu cầu dừng, không coi P5 đã xong.

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
