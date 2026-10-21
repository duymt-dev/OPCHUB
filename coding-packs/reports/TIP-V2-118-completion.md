# TIP-V2-118 — Completion Report: Tra MST qua DLPL API (D-65)

- Nhánh: `feature/TIP-V2-118-tax-lookup-dlpl` (tách từ `dev` @ `435757d`), PR vào `dev`
- Trạng thái: **PARTIAL**. Code, unit, int và e2e (stub) đã xong. **Chưa đối chiếu với dữ liệu thật** vì key DLPL đang ở gói Free (xem mục 3).

## 1. Đã làm

| Commit | Nội dung |
|---|---|
| `2b22cd3` | `DlplTaxProvider` (`GET /v1/businesses?tax_code=`, key qua header Bearer, ngành chính lên đầu, `representative = null`, lỗi 4xx/5xx ném `IntegrationError`) + 6 unit test `D-65 …` |
| `d870236` | Env `DLPL_API_KEY` (≥ 20 ký tự, optional), `DLPL_BASE_URL`, `TAX_LOOKUP_PROVIDER` thêm `dlpl` (thiếu key → env lỗi). `chain` = DLPL → ESGOO → VietQR, thiếu key thì bỏ DLPL + warn. Cập nhật `.env.example`, `infra/env/server.env.example` (`chain`), GO-LIVE L3-07 |
| `fb0c82d` | Stub `e2e/server/dlpl-stub.ts` (webServer Playwright, cổng 4810), int `biz-lookup-dlpl.int.spec.ts` (4 test), e2e `tax-lookup-dlpl.spec.ts` (3 test stub + 1 `@live`) |
| `85b8da9` | `e2e/server/README.md`: env cho chế độ stub và cách chạy live |

Không sửa `BizLookupService`, Portal, cache TTL (đúng OUT OF SCOPE).

## 2. Kết quả kiểm (số lấy từ output)

| Cổng | Kết quả |
|---|---|
| `pnpm lint` / `typecheck` / `depcheck` / `build` | xanh |
| `pnpm test` (unit) | xanh: ui 45, admin 334, integrations 46 (+2 skip), server 132, shared 140, portal 163 |
| int của TIP (`biz-lookup-dlpl` + `register` + `sanitize`) | 22/22 xanh |
| `pnpm --filter @opchub/server test:int` (toàn bộ) | 1184 passed / **11 failed** (xem 4.1) |
| `@opchub/db test:int` | **2 failed** (xem 4.1) |
| e2e MSW `auth-flows` + `tax-lookup-dlpl` | 13 passed / 4 skipped (3 D-65 stub + 1 `@live`, chỉ chạy ở server) / **1 failed** (xem 4.2) |
| e2e MSW toàn bộ | **không chạy hết**: các test Admin timeout hàng loạt (xem 4.2) |
| e2e server với stub DLPL | **chưa chạy** |
| `@live` với key thật | **không chạy được** (gói Free) |
| `git grep dlpl_live_` | chỉ còn chuỗi ví dụ trong file GOAL, không lộ key |

File lớn nhất trong phạm vi TIP: `integrations.module.ts` 128 dòng, `env.schema.ts` 163 dòng. Tất cả đều dưới trần.

## 3. Bị chặn: key DLPL gói Free

- `GET /v1/me`: `plan.code = free`, 1000 lượt/tháng, 100 lượt/ngày, 10 lượt/phút.
- `GET /v1/businesses?tax_code=0100100079`: **403 `plan_required`**, "cần gói Starter trở lên". Vẫn bị trừ 1 lượt, còn 999.
- Hệ quả: fixture `__fixtures__/dlpl-businesses.json` **dựng theo tài liệu**, không phải response thật. Hình dạng `industries` (chuỗi hay object) chưa xác nhận. Provider nhận cả hai dạng.
- Chủ nhà chọn dùng nguồn miễn phí: production đặt `TAX_LOOKUP_PROVIDER=chain` và **để trống `DLPL_API_KEY`** → chuỗi ESGOO → VietQR. Nâng Starter thì chỉ cần điền key và chạy `@live` (README).

## 4. Lỗi ngoài phạm vi (không sửa, đề xuất TIP refine)

1. **DB `opchub_test` dùng chung bị lệch schema**: enum `bot_thread_status` = `scheduled,done,running`, trong khi migration trên `dev` là `pending,posted`. DB đã được chạy migration `20261021…bot_*` từ nhánh khác. Đây là nguyên nhân 11 test bot/contract/gate và seed `packages/db` đỏ. Khi chạy riêng, các file int của account mà nhánh này đụng tới đều xanh. Cần DB test riêng cho mỗi nhánh, hoặc reset trước khi chạy.
2. **e2e MSW Admin**: đăng nhập Admin không chuyển sang `/overview` (`a-01-login:46`, `auth-flows:322`), kéo theo mọi test Admin timeout 2 phút. Nhánh này **không sửa** `apps/admin`, `apps/portal`, `packages/shared`, `packages/ui` (diff = 0 file). Cần soát trên `dev` sau commit `a57e189` (SSO) / `47a31d3` (2FA tuỳ chọn).
3. **`esgoo.provider.ts` đọc sai tên trường**: ESGOO thật trả `mst, dc, daidien, tinhtrang`, code đọc `ma_so_thue, dia_chi, dai_dien, tinh_trang`. Kết quả là mất địa chỉ, người đại diện và tình trạng. ESGOO không có ngành nghề. Thử thật MST `0100100079` → tên đúng, `representative` null dù nguồn có. Ảnh hưởng trực tiếp khi production dùng nguồn miễn phí. Đề xuất sửa ngay (khoảng 10 dòng + 1 test).

## 5. Cách verify

```bash
pnpm --filter @opchub/integrations test -- tax-lookup        # unit D-65
cd apps/server && npx vitest run --project int test/account/biz-lookup-dlpl.int.spec.ts
# e2e server (stub): API với TAX_LOOKUP_PROVIDER=dlpl DLPL_BASE_URL=http://127.0.0.1:4810/v1 DLPL_API_KEY=e2e-stub-key-000000000000
cd e2e && pnpm e2e:server --project behavior -g "D-65"
```

## 6. Chưa làm

- e2e server toàn bộ với stub. Fixture thật + `@live` (cần gói Starter).
- Các lỗi ở mục 4.
