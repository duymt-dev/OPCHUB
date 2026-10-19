# Testing

Chuẩn theo D-63 (bài học audit W1: TD-032 → TD-035). Đặc tả là chuẩn, prototype không phải chuẩn.

## Luật (vi phạm thì không được báo DONE)

1. **Truy vết.** Mỗi REQ / AT / UAT / BUG mà TIP chạm có ít nhất một test mang mã trong tên:
   `it('REQ-214 xuất CSV thành viên có BOM')`, `test('UAT-21 …')`, `it('BUG-019 …')`,
   `test('D-63 TD-033 nhật ký hiện thao tác vừa làm')`. TEST-GAPS §6
   (`coding-packs/audit/W1/TEST-GAPS.md`) là bảng truy vết sống: TIP cập nhật dòng của mình.
2. **Test âm ở server.** Mỗi endpoint ghi mới có int test cho: thiếu quyền → 403, sai trạng thái
   → 409, input sai → 400 kèm `fields`, **body quá cỡ → 413** (không được 500), id lạ → 404.
   Mỗi transition: cả cạnh hợp lệ lẫn cạnh bị chặn.
3. **Consumer outbox và job định kỳ.** Mỗi loại sự kiện trong `packages/shared/src/outbox/events.ts`
   có int test: ghi outbox trong transaction → relay → handler → hiệu ứng (mail / notification /
   socket); chạy lại cùng sự kiện → không trùng. Job định kỳ (nhắc phí, bot tick, scheduler sự
   kiện, dọn dữ liệu) có test truyền `now`.
4. **Link trong mail.** Mail có link (OTP, đặt lại mật khẩu, chào mừng, huỷ nhận, thông báo) có e2e
   đọc thư từ FakeMail rồi mở link tới màn đích. Server dev/test ghi thư ra `FAKE_MAIL_DIR`, e2e đọc
   qua `e2e/server/mailbox.ts` (`lastMailTo`, `linkFrom`). Ví dụ: `e2e/behavior/auth-flows.spec.ts`
   (đặt lại mật khẩu, TD-035).
5. **E2E hai chế độ, cùng assertion.** Mọi `e2e/behavior/*.spec.ts` chạy cả MSW lẫn server thật
   (`E2E_TARGET=server`) với **cùng một assertion**.
   - Được rẽ `onServer` **chỉ để dựng tiền điều kiện** (gọi API thật: `simulateTransfer`, `payFee`,
     `setGroupOwner`, `closeRegistration`, đọc mailbox…). Nhánh MSW tương ứng dựng cùng trạng thái
     (cookie / handler giả).
   - **Cấm** bỏ hoặc nới assertion theo chế độ: không `if (!onServer) expect(…)`, không regex thay
     số chỉ cho một bên, không đổi giá trị kỳ vọng theo chế độ.
   - MSW khác server → **sửa MSW (và seed demo) theo server**; server là chuẩn, không sửa test cho
     khớp mock. Dữ liệu phụ thuộc lượt chạy trước (ví dụ nhật ký 500 dòng mới nhất) → assert trên
     thao tác vừa làm trong chính test.
6. **Bộ audit hồi quy.** `pnpm audit:regression` (ngoài gate CI, cần server dev đang chạy) chạy
   `apps/server/test/audit` (6 kiểm cơ học) và `e2e/audit` (Playwright) trước khi chốt pha. Finding
   mới ghi vào `coding-packs/audit/` hoặc BUGS.

## Loại test và vị trí

| Loại | Công cụ | Vị trí | Dùng cho |
|---|---|---|---|
| Unit | Vitest | `*.spec.ts` cạnh file nguồn | Hàm thuần: state machine, hạn phí, parse nội dung CK, permission, sanitize, mock MSW |
| Integration | Vitest + Postgres/Redis test thật | `apps/server/test/**/*.int.spec.ts` | Endpoint, repository, guard, job, consumer outbox |
| E2E hành vi | Playwright | `e2e/behavior/*.spec.ts` | REQ / UAT / BUG, chạy MSW + server |
| Parity | Playwright | `e2e/parity` | So ảnh prototype ([ui-parity](../frontend/ui-parity.md)) |
| Audit | tsx + Playwright | `apps/server/test/audit`, `e2e/audit` | `pnpm audit:regression`, ngoài gate |
| Tải | k6 | `infra/k6/*.js` | §15.2: đăng ký 200/phút, 5.000 socket 50 tin/giây, Admin 100 phiên |

Không viết test dài inline trong file production.

## Bắt buộc phải có test (ngoài 6 luật trên)

- Mọi guard và permission key: có quyền thì qua, thiếu quyền thì 403/404.
- Paywall: `pending_payment` / `expired` → 402; tài khoản investor chỉ vào được route cho phép.
- Tiền và đối soát: parse nội dung CK nhiều biến thể, đủ/thiếu/thừa tiền, webhook gửi trùng, poll
  và webhook cùng một giao dịch.
- Idempotency: `clientMsgId`, `Idempotency-Key`, job chạy 2 lần.
- Mỗi rule BR-xx mà TIP hiện thực.

## Quy ước

- Repository và integration test chạy trên DB thật (schema riêng cho test), **không mock Prisma**.
- Mock chỉ ở biên dịch vụ ngoài, dùng fake provider trong `packages/integrations`.
- Không phụ thuộc thứ tự chạy, không phụ thuộc giờ thật: fake timer / truyền `now`.
- Int test tạo dữ liệu bằng factory. E2E dùng seed demo chung cho cả hai chế độ (fixture
  `e2e/server/test.ts` reset `seed:demo` trước mỗi test server; MSW dựng lại CSDL giả mỗi trang).

## Done

`pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` pass; chạy e2e liên quan ở **cả hai**
chế độ. Ghi số test thật (pass/fail từng lệnh) vào Completion Report.
