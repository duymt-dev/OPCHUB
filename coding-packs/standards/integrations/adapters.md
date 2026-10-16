# Integration adapters

Mọi dịch vụ ngoài chỉ được gọi qua adapter trong `packages/integrations`. Domain code không import SDK hay gọi HTTP tới nhà cung cấp.

## Cấu trúc

```
packages/integrations/src/
  bank-webhook/   types.ts  sepay.provider.ts  fake.provider.ts
  tax-lookup/     types.ts  esgoo.provider.ts  vietqr.provider.ts  fake.provider.ts
  phone-otp/      types.ts  zalo-zns.provider.ts (sau)  fake.provider.ts
  mail/           types.ts  smtp.provider.ts  fake.provider.ts
  storage/        types.ts  s3.provider.ts
  llm/            types.ts  anthropic.provider.ts (sau)  fake.provider.ts
```

- `types.ts` khai báo interface + zod schema cho dữ liệu trả về. Domain chỉ phụ thuộc interface.
- Chọn provider qua env (`BANK_PROVIDER=sepay|fake`). Dev và test mặc định `fake`.

## Interface chính

| Adapter | Hàm | Ghi chú |
|---|---|---|
| `BankWebhookProvider` | `verify(rawBody, headers)`, `parse(rawBody) → BankTxn`, `listSince(time) → BankTxn[]` | `listSince` dùng cho quét bù 2 phút |
| `TaxLookupProvider` | `lookup(taxCode) → { name, address, representative?, industries[], status } \| null` | Chuỗi ESGOO → VietQR (D-17), cache Redis 30 ngày, lỗi thì trả `null` để người dùng nhập tay |
| `PhoneOtpProvider` | `send(phone, code)` | Zalo ZNS, làm sau (D-25) |
| `MailProvider` | `send({ to, subject, html, attachments })` | Chỉ gọi từ worker `mail` |
| `StorageProvider` | `presignPut`, `presignGet`, `head`, `delete` | MinIO |

## Rule

- Timeout mặc định 5 giây; retry có backoff chỉ cho lỗi mạng/5xx; không retry 4xx.
- Lỗi của provider bọc thành lỗi chung (`IntegrationError` có `provider`, `retryable`), không để lỗi SDK lan ra domain.
- Dữ liệu trả về luôn parse bằng zod; dữ liệu lạ thì coi như lỗi.
- Không log secret, header chữ ký, nội dung đầy đủ.
- Fake provider phải đủ dùng để demo và test: `FakeBank` có endpoint dev để giả lập tiền về; `FakeMail` ghi vào `mail_logs` và cho xem qua Mailpit ở dev.
- Đổi nhà cung cấp chỉ được phép thêm file provider mới + đổi env, không sửa domain.
