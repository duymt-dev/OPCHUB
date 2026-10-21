# TIP-V2-117: Tra cứu MST thật qua DLPL API (dulieuphapluat.vn) khi đăng ký

## HEADER
- TIP-ID: TIP-V2-117 · Project: OPCHUB · Module: integrations (tax-lookup) + server config
- Depends on: None (nền `dev` @ `224d07c`) · Priority: P1 · Estimated: S (3–4h)
- Nhánh: `feature/TIP-V2-117-tax-lookup-dlpl` tách từ `dev`, PR vào `dev`
- REQ / D / OQ: REQ-001 (đăng ký, bước thông tin doanh nghiệp), D-17 (bị thay), **D-65 (mới)**
- **Files touched:**
  - `packages/integrations/src/tax-lookup/dlpl.provider.ts` (create)
  - `packages/integrations/src/tax-lookup/dlpl.provider.spec.ts` (create)
  - `packages/integrations/src/tax-lookup/__fixtures__/dlpl-businesses.json` (create: response mẫu thật, xem bước 0)
  - `packages/integrations/src/tax-lookup/index.ts` (modify: thêm 1 dòng export)
  - `packages/integrations/src/tax-lookup/types.ts` (modify: chỉ sửa comment D-17 → D-65)
  - `apps/server/src/common/config/env.schema.ts` (+ `env.schema.spec.ts` nếu có) (modify: `DLPL_API_KEY`, `DLPL_BASE_URL`)
  - `apps/server/src/common/integrations/integrations.module.ts` (modify: hàm `tax()`)
  - `apps/server/.env.example`, `infra/env/server.env.example`, `infra/GO-LIVE-CHECKLIST.md` (modify)
- **Parallel-safe with:** mọi TIP không đụng `env.schema.ts` / `integrations.module.ts`.

## CONTEXT
- Hiện trạng (đã kiểm 21/10/2026):
  - `env.schema.ts:77` có `TAX_LOOKUP_PROVIDER` mặc định `fake`. `apps/server/.env.example` và `infra/env/server.env.example` đều để `fake`, nên **production hiện chưa gọi API thật nào**: form đăng ký nhận dữ liệu giả từ `FakeTaxProvider`.
  - `integrations.module.ts:70` `tax()`: nếu là `chain` thì dùng `ChainTaxProvider([Esgoo, Vietqr])`.
  - `BizLookupService` (`apps/server/src/modules/account/services/biz-lookup.service.ts`) cache Redis 30 ngày, cache cả kết quả "không thấy". Portal gọi `GET /biz/lookup` qua `use-tax-lookup.ts`. **Không cần sửa** service và Portal.
  - `fetchJson` (`packages/integrations/src/http.ts`): timeout 5s, retry khi lỗi mạng/5xx, gặp 4xx thì ném `IntegrationError(retryable=false)` ngay. Chain bắt lỗi rồi chuyển sang nguồn sau.
- Tài liệu DLPL API (https://api.dulieuphapluat.vn/tai-lieu, trang bộ dữ liệu `businesses`):
  - Base `https://api.dulieuphapluat.vn/v1`. Gửi key qua header `Authorization: Bearer <key>` (hoặc `X-Api-Key`). **Cấm truyền key qua query string**: server bên đó sẽ từ chối.
  - `GET /v1/businesses?tax_code=<MST>&per_page=1`: cần gói **Starter+**. Chủ nhà xác nhận key đang ở gói Starter+.
  - Trường gói Free/Starter trả ở danh sách: `id, tax_code, name, name_short, address, status_id (int), cert_date, main_industry_code, industry_codes (json), industries (json), updated_at`. **Không có người đại diện.**
  - Response chung: `{ success: true, data: [...], meta: {...} }`; lỗi trả `{ success: false, code, message }`. Mã lỗi: 401 `unauthorized`; 403 `plan_required` / `ip_not_allowed` / `account_restricted`; 422 `invalid_request`; 429 `rate_limited` / `quota_exceeded`; 503 `search_unavailable`.
  - Hạn mức tính theo tài khoản. Mỗi request dữ liệu tính 1 lượt, kể cả 404. Kiểm hạn mức qua `GET /v1/me` (không tính lượt).
  - Tài liệu **không có JSON mẫu** cho `businesses`, và chưa rõ `industries` là mảng chuỗi hay mảng object. Vì vậy bước 0 là bắt buộc.

## APPLICABLE STANDARDS
[integrations / adapter](../standards/README.md) (luật cứng #11) · [testing](../standards/testing/testing.md) · [global/tooling](../standards/global/tooling.md) (env + zod, luật #12)

## TASK
Thêm `DlplTaxProvider` và đặt nó làm nguồn đầu chuỗi: **DLPL → ESGOO → VietQR** (D-65). Thêm biến env cho key. Khi thiếu key thì bỏ DLPL khỏi chuỗi và ghi warn. Cập nhật env example và checklist go-live để production chuyển `TAX_LOOKUP_PROVIDER=chain`.

## SPECIFICATIONS
### 0. Lấy response thật (trước khi code)
- Dùng key thật đặt trong biến môi trường shell, **không ghi key vào file trong repo**:
  `curl -s -H "Authorization: Bearer $DLPL_API_KEY" https://api.dulieuphapluat.vn/v1/me` để xác nhận gói và hạn mức (không tính lượt).
  `curl -s -H "Authorization: Bearer $DLPL_API_KEY" "https://api.dulieuphapluat.vn/v1/businesses?tax_code=0100109106&per_page=1"` (dùng một MST công khai bất kỳ).
- Lưu body vào `__fixtures__/dlpl-businesses.json`. Dữ liệu doanh nghiệp là công khai; xoá header `X-Request-Id` nếu có lẫn vào. Ghi hình dạng thật của `industries` / `industry_codes` vào báo cáo.
- Nếu `/v1/me` không phải Starter+, hoặc `businesses` trả 403 thì **dừng, báo BLOCKED**.

### 1. `dlpl.provider.ts`
- `constructor(opts: { apiKey: string; baseUrl?: string } & Pick<HttpOptions, 'fetchImpl'>)`, với `name = 'dlpl'`.
- URL: `${baseUrl}/businesses?tax_code=${encodeURIComponent(taxCode)}&per_page=1`. Header: `Authorization: Bearer ${apiKey}` và `Accept: application/json`, truyền qua `init.headers` của `fetchJson`.
- Schema zod viết theo fixture thật. Mọi trường tuỳ chọn để `.optional()`/`.nullable()`, object để `.passthrough()`. `industries` phải nhận được cả dạng chuỗi lẫn dạng `{ code, name }`; chọn dạng cụ thể theo kết quả bước 0.
- Ánh xạ sang `TaxInfo`:
  - Chọn phần tử có `tax_code === taxCode`. Không có phần tử nào (hoặc `data` rỗng) thì trả `null`.
  - `taxCode ← tax_code`, `name ← name`, `address ← address ?? ''`, `representative ← null` (D-65: để trống, người dùng tự nhập).
  - `industries`: ngành chính (`main_industry_code`) xếp **đầu mảng**, còn lại theo thứ tự nguồn trả. Mỗi phần tử có dạng `"<mã> – <tên>"`, cùng dạng ESGOO, để `toBizLookup` tách `mainIndustry` / `otherIndustries` không phải đổi. Thiếu tên thì chỉ ghi mã.
  - `status ← null`: `BizLookup` không dùng trường này, và không gọi thêm `/business-statuses` cho tốn lượt.
- `success: false` hoặc HTTP 4xx thì để `fetchJson` ném `IntegrationError`; chain sẽ chuyển sang ESGOO. **Không** tự nuốt lỗi thành `null`, nếu không `BizLookupService` sẽ cache "không thấy" 30 ngày dù chỉ là hết lượt.
- **Không log key**. Không đưa URL kèm header vào message lỗi.

### 2. Env (`env.schema.ts`)
- `DLPL_API_KEY: z.string().min(20).optional()`, có comment: D-65, gói Starter+, chỉ gửi bằng header.
- `DLPL_BASE_URL: z.string().url().default('https://api.dulieuphapluat.vn/v1')`.
- Không đổi default `TAX_LOOKUP_PROVIDER` (vẫn `fake` để dev/test không gọi mạng).

### 3. `integrations.module.ts` → `tax(env)`
- `chain`: `[...(env.DLPL_API_KEY ? [new DlplTaxProvider({ apiKey, baseUrl })] : []), new EsgooTaxProvider(), new VietqrTaxProvider()]`.
- `chain` mà thiếu key: `logger.warn('DLPL_API_KEY trống — tra MST chỉ dùng ESGOO/VietQR')` một lần lúc khởi tạo, **không** chặn khởi động.

### 4. Env example + checklist
- `apps/server/.env.example`, `infra/env/server.env.example`: thêm `DLPL_API_KEY=` (để trống) kèm comment. Riêng `infra/env/server.env.example` đổi sang `TAX_LOOKUP_PROVIDER=chain`.
- `GO-LIVE-CHECKLIST.md` L3-07: ghi nguồn chốt DLPL → ESGOO → VietQR, cần `DLPL_API_KEY` và nên bật allowlist IP VPS cho key (Starter+ hỗ trợ). Theo dõi hạn mức qua `GET /v1/me`.

## ACCEPTANCE CRITERIA
- Given `TAX_LOOKUP_PROVIDER=chain` + key hợp lệ, When Portal gọi `GET /biz/lookup?tax=<MST có thật>`, Then trả `companyName`, `mainIndustry` từ DLPL và `representative = ''` (D-65).
- Given DLPL trả 429 `quota_exceeded` / 403 / 5xx / timeout, Then chain chuyển sang ESGOO rồi VietQR, Redis **không** cache "none" vì lỗi DLPL.
- Given DLPL trả `data: []`, Then provider trả `null`, chain thử ESGOO tiếp.
- Given `chain` không có key, Then server vẫn khởi động, có 1 log warn, chuỗi chỉ còn ESGOO → VietQR.
- Given grep repo, Then không có giá trị key thật nào (`dlpl_live_`) bị commit.

## TESTS BẮT BUỘC
- `dlpl.provider.spec.ts` (fetch giả, giống `chain.spec.ts`, không gọi mạng):
  - `D-65 map fixture thật → TaxInfo, ngành chính đứng đầu, representative null`
  - `D-65 gửi Authorization Bearer, không có key trong URL`
  - `D-65 data rỗng → null`
  - `D-65 429 quota_exceeded → ném IntegrationError (không trả null)`
  - `D-65 chain: DLPL 403 → dùng ESGOO`
- `env.schema.spec.ts` (nếu file đã có): `DLPL_API_KEY` tuỳ chọn; `DLPL_BASE_URL` có default.
- Chạy `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`.
- Smoke thủ công (ghi vào báo cáo, không đưa vào CI): server dev đặt `TAX_LOOKUP_PROVIDER=chain` và key thật, gọi `GET /biz/lookup` cho 1 MST, ghi `X-Quota-Remaining` trước/sau.

## OUT OF SCOPE
- Không sửa `BizLookupService`, Portal form, cache TTL.
- Không gọi `/business-industries` (tốn thêm lượt) hay `/businesses/{id}` (trường chi tiết cần Pro+).
- Không đổi D-17 cho ESGOO/VietQR ngoài thứ tự.

## REPORT
`coding-packs/reports/TIP-V2-117-completion.md`: SHA, hình dạng `industries` thật, số test thật, kết quả smoke + hạn mức còn lại.
