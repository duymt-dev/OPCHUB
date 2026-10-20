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
