# TIP-B10: `packages/integrations` — adapter mail, bank-webhook, tax-lookup, storage, llm

## HEADER
- TIP-ID: TIP-B10 · Project: OPCHUB · Module: integrations · Priority: P0 · Depends on: TIP-B01 · Estimated: L (10h)
- **Files touched:**
  - `packages/integrations/{package.json,tsconfig.json,eslint.config.js,vitest.config.ts}` (create)
  - `packages/integrations/src/index.ts`, `src/errors.ts`, `src/http.ts` (create)
  - `src/mail/{types.ts,smtp.provider.ts,fake.provider.ts,index.ts}` (create)
  - `src/bank-webhook/{types.ts,sepay.provider.ts,fake.provider.ts,content.ts,content.spec.ts,index.ts}` (create)
  - `src/tax-lookup/{types.ts,esgoo.provider.ts,vietqr.provider.ts,chain.ts,fake.provider.ts,index.ts}` (create)
  - `src/storage/{types.ts,s3.provider.ts,index.ts}` (create)
  - `src/llm/{types.ts,fake.provider.ts,index.ts}` (create)
  - `src/*/*.spec.ts` (create), `pnpm-workspace.yaml` (modify — catalog `nodemailer`, `@aws-sdk/*`)
- **Parallel-safe with:** TIP-B13. Sequential, shares `pnpm-workspace.yaml` with TIP-B11.

## CONTEXT
- `standards/integrations/adapters.md` (cấu trúc, interface, rule), ADR-0007 (S3 RustFS), D-07 (SePay), D-17 (ESGOO → VietQR), D-41 (đối soát theo Mã TV).
- Package thuần TS (không Nest). Server bọc thành provider Nest ở TIP dùng (B11/B14/B30/B41).

## APPLICABLE STANDARDS
- [integrations/adapters](../standards/integrations/adapters.md) · [security/security](../standards/security/security.md) (HMAC timingSafeEqual) · [testing/testing](../standards/testing/testing.md)

## TASK
Hiện thực interface + provider thật + fake cho mail, bank webhook, tra MST, storage S3, llm. Domain chỉ phụ thuộc interface;
chọn provider bằng env (`*_PROVIDER=fake|…`, dev/test mặc định fake).

## SPECIFICATIONS
1. `IntegrationError { provider, retryable, cause }`; HTTP: timeout 5s, retry backoff chỉ lỗi mạng/5xx (tối đa 2), không retry 4xx.
2. Dữ liệu trả về parse zod; lạ → `IntegrationError(retryable=false)`.
3. `BankWebhookProvider`: `verify(rawBody, headers)` (HMAC-SHA256 hex, `timingSafeEqual`), `parse(rawBody) → BankTxn[]`, `listSince(date)`.
   `FakeBankProvider` giữ giao dịch trong bộ nhớ + `push(txn)` cho endpoint dev; ký bằng secret env.
4. `content.ts` (hàm thuần): `extractMemberCode(content)` tìm `TV\d{6}` không phân biệt hoa thường, chịu thiếu khoảng trắng,
   ký tự thừa (`OPCHUBTV000123`, `opchub tv000123 0912…`, `CK TV 000123` → không khớp vì có khoảng giữa? — **khớp `TV\s?\d{6}`**).
5. `TaxLookupProvider.lookup(taxCode)` → `{ name, address, representative, industries[], status } | null`; chain ESGOO → VietQR, lỗi → null.
6. `MailProvider.send({to, subject, html, text?, attachments?}) → { messageId }`; Fake ghi vào mảng `sent` (worker ghi `mail_logs`).
7. `StorageProvider`: `presignPut(key, contentType, size, ttl)`, `presignGet(key, ttl)`, `head(key) → {size, contentType} | null`, `delete(key)`;
   S3 path-style, endpoint env.
8. `LlmProvider.complete(prompt) → string`; chỉ fake (Anthropic sau, D-04).

## ACCEPTANCE CRITERIA
- Given body + chữ ký HMAC đúng When `verify` Then true; sai 1 ký tự Then false (không ném).
- Given nội dung CK biến thể (chữ thường, dính chữ, thừa SĐT, thừa ký tự) When `extractMemberCode` Then `TV000123`; không có mã Then null.
- Given ESGOO lỗi 500 When `lookup` Then thử VietQR; cả hai lỗi Then null.
- Given RustFS local When `presignPut` rồi PUT 1 file nhỏ rồi `head` Then size khớp (int test, bỏ qua nếu thiếu `S3_ENDPOINT`).

## CONSTRAINTS
- DO NOT: import Nest/Prisma; log secret/chữ ký/nội dung CK đầy đủ; gọi provider thật trong test.
- SKIP: phone-otp (D-25), Anthropic provider.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng *Files touched*; AC có test; `pnpm --filter @opchub/integrations lint typecheck test` xanh
- [ ] Rule AGENTS 11: dịch vụ ngoài chỉ qua adapter; fake đủ demo
- [ ] Rule security: HMAC `timingSafeEqual`, không log secret
- [ ] Commit đường dẫn cụ thể; git sạch; SHA
