# Testing

## Loại test và vị trí

| Loại | Công cụ | Vị trí | Dùng cho |
|---|---|---|---|
| Unit | Vitest | `*.spec.ts` cạnh file nguồn | Hàm thuần: state machine, tính hạn phí, parse nội dung CK, permission, sanitize |
| Integration | Vitest + Postgres/Redis test thật | `apps/api/test/**/*.int.spec.ts` | Endpoint, repository, guard, job |
| E2E | Playwright | `e2e/uat/*.spec.ts` | Kịch bản UAT-01 → UAT-31 |
| Tải | k6 | `infra/k6/*.js` | §14.2: đăng ký 200/phút, 5.000 socket 50 tin/giây, Admin 100 phiên |

Không viết test dài inline trong file production.

## Bắt buộc phải có test

- Mọi transition trạng thái: cả hợp lệ lẫn bị chặn.
- Mọi guard và permission key: có quyền thì qua, thiếu quyền thì 403/404.
- Paywall: `pending_payment`/`expired` → 402; tài khoản investor chỉ vào được route cho phép.
- Tiền và đối soát: parse nội dung CK nhiều biến thể (thiếu khoảng trắng, chữ thường, thừa ký tự), đủ/thiếu/thừa tiền, webhook gửi trùng, poll và webhook cùng một giao dịch.
- Idempotency: `clientMsgId`, `Idempotency-Key`, job chạy 2 lần.
- Mỗi rule BR-xx mà TIP hiện thực.

## Quy ước

- Tên test E2E bắt đầu bằng mã UAT: `test('UAT-07 bấm nền khi chưa thanh toán thì popup giữ nguyên', ...)`.
- Tên test khác mô tả hành vi: `it('từ chối chuyển published → draft')`.
- Repository và integration test chạy trên DB thật (schema riêng cho test), **không mock Prisma**.
- Mock chỉ ở biên dịch vụ ngoài, dùng fake provider trong `packages/integrations`.
- Không phụ thuộc thứ tự chạy, không phụ thuộc giờ thật: dùng fake timer / truyền `now`.
- Dữ liệu test tạo bằng factory, không dùng seed demo.

## Done

`pnpm lint && pnpm typecheck && pnpm test` pass. TIP có UAT thì chạy e2e liên quan. Ghi kết quả (số test, pass/fail) vào Completion Report.
