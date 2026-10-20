# TIP-V2-404 — IN-PROGRESS

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
