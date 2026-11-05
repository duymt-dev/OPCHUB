# TIP-V46-806: Admin › Cài đặt › Đối soát ngân hàng — webhook, khóa bí mật, tự kích hoạt, giao dịch gần đây, Gán / Ghi nhận thiếu

## HEADER

- TIP-ID: TIP-V46-806
- Project: OPCHUB
- Module: membership-fee (đối soát: cấu hình, khóa webhook, danh sách giao dịch, gán / ghi nhận thiếu), integrations/bank-webhook (khóa động), settings (`app_settings.bank`), Admin › Cài đặt
- Priority: P1
- Depends on: none về nghiệp vụ; chạy sau 805 theo thứ tự GOAL (`dev` `1378ed85`)
- Estimated: M
- REQ / D: REQ-621 · BR-481 → BR-484, TC-481, TC-482 · D-123 (`OPCHUB …`), D-104 (khớp đúng số tiền), D-81 / OQ-17 / D-125 (adapter hiện có, fake provider), D-105 (Gọi vốn), D-96, D-134 (parity tham khảo)
- **Files touched:**
  - DB
    - `packages/db/prisma/schema/membership-fee.prisma` (modify): enum `PaymentMatchStatus` thêm `short` (Thiếu tiền đã ghi nhận); `PaymentTransaction` thêm `shortNote String? @map("short_note")`, `shortBy String? @map("short_by")`
    - `packages/db/prisma/schema/settings.prisma` (modify): model `BankWebhookKey` (`id Int @id @default(1)`, `keyEnc Bytes`, `hint String` (4 ký tự cuối), `rotatedBy String?`, `rotatedAt`) — mã hoá như `SmtpConfig.keyEnc`
    - `packages/db/prisma/migrations/20261109090000_v46_bank_reconcile/migration.sql` + `down.sql` (create): enum value, 2 cột, bảng khóa, `INSERT app_settings('bank', {"autoActivate": true}) ON CONFLICT DO NOTHING`, index `payment_transactions (received_at DESC, id DESC)` (danh sách mọi trạng thái)
    - `packages/db/seed/catalog.ts` (modify: `APP_SETTINGS.bank`), `packages/db/seed/demo/settings.ts` (modify nếu dùng `DEMO_SETTINGS` riêng), `packages/db/seed/demo/payment-transactions.ts` (create) + `seed/demo/index.ts` (modify: 1 import + 1 lời gọi) — 5 giao dịch mẫu đủ 4 trạng thái, nội dung **`OPCHUB …`**
  - Shared
    - `packages/shared/src/api-domains/bank-reconcile.ts` (create): `bankSettingsSchema`, `bankSettingsPatchSchema`, `bankTxnStatusSchema` (`matched | manual | unmatched | short`), `bankTxnRowSchema`, `bankTxnPageSchema`, `bankKeyRotateResultSchema`, `bankShortSchema`, `bankTestResultSchema`; `api-domains/index.ts` (modify: 1 dòng)
    - `packages/shared/src/mock-data/domains/bank-reconcile.ts` (create), `mock-data/domains/index.ts` (modify)
  - Integrations
    - `packages/integrations/src/bank-webhook/types.ts` (modify): `verify(rawBody, headers, secret?)` — provider dùng khóa truyền vào nếu có, ngược lại khóa env (giữ tương thích)
    - `packages/integrations/src/bank-webhook/fake.provider.ts`, `sepay.provider.ts` (modify theo chữ ký mới); `.spec.ts` liên quan (modify)
  - Server
    - `apps/server/src/modules/settings/app-settings.service.ts` (modify: `SettingKey` thêm `'bank'`, getter `bank()`)
    - `apps/server/src/modules/membership-fee/repositories/bank-key.repository.ts` (create): đọc / xoay khóa (SecretBox)
    - `apps/server/src/modules/membership-fee/services/bank-key.service.ts` (create): khóa hiện hành có cache Redis ngắn (60 giây, chỉ giá trị đã mã hoá + hint; giải mã trong bộ nhớ), `rotate(actor)`
    - `apps/server/src/modules/membership-fee/services/reconcile.service.ts` (modify): `ingestWebhook` verify bằng khóa hiện hành; `match` đọc `autoActivate`, tắt → để `unmatched` + lý do "Chờ Admin xác nhận (tự kích hoạt tắt)"; ghi lý do "thiếu tiền" có mã để phân loại
    - `apps/server/src/modules/membership-fee/services/bank-reconcile-admin.service.ts` (create): cấu hình, danh sách, ghi nhận thiếu, kiểm tra kết nối, xuất CSV
    - `apps/server/src/modules/membership-fee/repositories/payment-transaction.repository.ts` (modify): `page(cursor, limit)` mọi trạng thái (deferred join tên thành viên), `markShort(tx, id, actor, note)` có điều kiện `WHERE match_status = 'unmatched'`, `counts()`
    - `apps/server/src/modules/membership-fee/controllers/admin-bank-reconcile.controller.ts` (create): xem SPEC 13
    - `apps/server/src/modules/membership-fee/membership-fee-core.module.ts` (modify: provider + controller)
    - `apps/server/src/common/config/env.schema.ts` (modify): `API_PUBLIC_URL` (url, default `http://localhost:4000`) để hiển thị Webhook URL; `apps/server/.env.example` (modify: 1 dòng)
  - Admin
    - `apps/admin/src/features/settings/types.ts` (modify: tab `bank`, `TAB_KEY.bank = 'settings.general'`)
    - `apps/admin/src/features/settings/components/settings-screen.tsx` (modify: 1 case)
    - `apps/admin/src/features/settings/components/bank-tab.tsx`, `bank-config.tsx`, `bank-key-field.tsx`, `bank-txn-table.tsx`, `bank-short-dialog.tsx`, `bank.module.css` (create)
    - `apps/admin/src/features/settings/hooks/use-bank-reconcile.ts` (create), `api.ts` (modify: hàm mới)
    - `apps/admin/src/mocks/handlers/settings.ts` (modify: handler mới), `apps/admin/messages/vi/settings.json` (modify: `tabs.bank`, `tabSub.bank`, khối `bank.*`)
  - Test
    - `packages/shared/src/api-domains/bank-reconcile.spec.ts` (create)
    - `apps/server/test/membership-fee/bank-reconcile-admin.int.spec.ts` (create), `reconcile.int.spec.ts`, `reconcile-v42.int.spec.ts` (modify: tự kích hoạt bật / tắt, khóa xoay)
    - `apps/admin/src/features/settings/components/bank-tab.spec.tsx` (create)
    - `e2e/behavior/admin-bank-reconcile.spec.ts` (create); `e2e/parity/scenarios/admin-settings.ts` (modify: thêm `D-V46-BANK`)
  - Tài liệu
    - `coding-packs/standards/global/domain-glossary.md`, `coding-packs/reports/V4.6-progress.md` (dòng #6), `coding-packs/reports/ui-parity/{screens,questions}.md`, `coding-packs/reports/TIP-V46-806-completion.md` (create)
- **Parallel-safe with:** sequential.
  - Chia `admin/features/settings/**`, `messages/vi/settings.json`, `mocks/handlers/settings.ts`, `e2e/parity/scenarios/admin-settings.ts`, `settings/app-settings.service.ts` với V46-805 (đã merge), V46-807, V46-811 → 807, 811 chạy sau.
  - Chia `modules/membership-fee/**`, `membership-fee.prisma` với V46-805 (đã merge).
  - Chia `apps/server/src/common/config/env.schema.ts` với mọi TIP thêm env → chỉ thêm dòng.

## CONTEXT

- Working dir: `D:\CODING\OPCHUB\CODING`. Nhánh `feature/TIP-V46-806-bank-reconcile-settings` tách từ `dev` `1378ed85`.
- **DB:** 801 → 805 chạy trên `opchub_v46_801_dev` / `opchub_v46_801_test` + Redis `127.0.0.1:6381` (owner duyệt). Builder hỏi owner DB đích trước khi `migrate deploy` / int / e2e server / seed. Không reset DB native, không tắt tiến trình HOLD.
- Delta `coding-packs/audit/SPEC-V4.6-DELTA.md` **P12**: Admin › Cài đặt › Đối soát ngân hàng (mới) — webhook URL, khóa bí mật + tạo lại, bật / tắt tự kích hoạt, cú pháp, giao dịch gần đây 4 trạng thái, Gán, Ghi nhận thiếu. D-123: cú pháp hiển thị **`OPCHUB …`** dù prototype / §33 ghi `OPC <SĐT> <GÓI>`. D-81 / D-125: không tích hợp cổng mới, dùng adapter `bank-webhook` hiện có (fake / SePay).
- Đặc tả `docs/spec/dac-ta.html` §33:
  - BR-481: 4 trạng thái giao dịch — Đã khớp · tự kích hoạt / Gán thủ công / Không khớp nội dung / Thiếu tiền
  - BR-482: tự kích hoạt bật → khớp nội dung và đủ tiền thì kích hoạt ngay; tắt → mọi giao dịch chờ Admin xác nhận
  - BR-483: không khớp → Admin gán cho thành viên gợi ý; thiếu tiền → Admin ghi nhận thiếu, không kích hoạt tự động
  - BR-484: webhook chỉ nhận yêu cầu có khóa bí mật hợp lệ; Admin tạo lại khóa khi cần
  - TC-481: giao dịch đúng cú pháp, tự kích hoạt bật → Đã khớp, gói kích hoạt, nhật ký ghi thao tác
  - TC-482: không khớp → Admin bấm Gán → Gán thủ công
- Prototype `docs/spec/index.html` v4.6:
  - Markup `stBank` dòng ~4994 → 5015
  - Logic dòng ~6528 → 6536 (`BC`, `T0`, `BS`, `bank.provs`, `hook`, `test`, `regen`, `sim`, `tx`, `okN / badN`, `csv`)
  - Tab Cài đặt `['bank','Đối soát ngân hàng','Webhook · tự kích hoạt']`, quyền xem `need.bank = 'cfg'` → `settings.general`
- Code hiện tại (đọc trước):
  - `apps/server/src/modules/membership-fee/services/reconcile.service.ts`: webhook (HMAC) → `upsert` idempotent `(provider, bank_txn_id)` → job `reconcile.match` → `parsePaymentContent` (`OPCHUB [Mã TV] [SĐT] [GV?]`, D-104 / D-105) → `MembershipFeeService.activate` (đúng số tiền, D-104) hoặc Gói Gọi vốn; lỗi → `noteUnmatched` (lý do trong `raw._unmatchedReason`)
  - `apps/server/src/modules/membership-fee/services/fee-transactions.service.ts`: hàng đợi `unmatched` + khớp tay (`match`, `matchFundraising`, audit `fee.match_transaction`) — màn Admin › Phí thành viên › Giao dịch cần đối soát (`features/fees/components/fee-transactions-screen.tsx`, `match-dialog.tsx`)
  - `apps/server/src/modules/membership-fee/controllers/{bank-webhook,dev-bank}.controller.ts`, `packages/integrations/src/bank-webhook/{types,signature,fake.provider,sepay.provider,content}.ts`
  - `apps/server/src/common/integrations/integrations.module.ts` (`BANK`, khóa từ env `BANK_WEBHOOK_SECRET`), `apps/server/src/common/crypto/secret-box.ts` (AES-256-GCM)
  - `apps/server/src/modules/settings/app-settings.service.ts`, mẫu tab 805 `features/settings/components/renewal-*.tsx`

## APPLICABLE STANDARDS

- [security/security](../standards/security/security.md): webhook HMAC so sánh hằng thời gian; khóa lưu mã hoá (SecretBox); **không** trả / log khóa đầy đủ trừ đúng một lần sau khi tạo lại; audit xoay khóa
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md): đối soát thuộc membership-fee; Gọi vốn qua `FUNDRAISING_PAYMENT_PORT` có sẵn; kích hoạt + audit trong một transaction
- [integrations/adapters](../standards/integrations/adapters.md): dịch vụ ngoài chỉ qua `packages/integrations`, fake provider trong test (luật 11)
- [backend/api-conventions](../standards/backend/api-conventions.md) · [backend/auth-rbac](../standards/backend/auth-rbac.md): cấu hình / khóa = `settings.general`; gán / ghi nhận thiếu = `fees.action` (cùng quyền khớp tay hiện có)
- [database/query-indexing](../standards/database/query-indexing.md) · [database/prisma-migrations](../standards/database/prisma-migrations.md)
- [frontend/data-state](../standards/frontend/data-state.md) · [frontend/antd-ui](../standards/frontend/antd-ui.md) · [frontend/ui-parity](../standards/frontend/ui-parity.md) (D-134)
- [testing/testing](../standards/testing/testing.md) · [global/code-structure](../standards/global/code-structure.md) · [global/domain-glossary](../standards/global/domain-glossary.md)

## TASK

Thêm tab **Admin › Cài đặt › Đối soát ngân hàng** theo prototype, nối vào luồng đối soát hiện có:

- Webhook URL, khóa bí mật lưu mã hoá. "Tạo lại" xoay khóa và hiện khóa mới đúng một lần.
- Công tắc **Tự kích hoạt khi khớp** (BR-482), tài khoản nhận và cú pháp **`OPCHUB <Mã TV> <SĐT>`** (D-123).
- Bảng **Giao dịch gần đây** với 4 trạng thái: Đã khớp · tự kích hoạt / Gán thủ công / Không khớp nội dung / Thiếu tiền. Có nút "Gán cho …" (tái dùng khớp tay hiện có), nút "Ghi nhận thiếu" và "Xuất CSV".
- "Kiểm tra kết nối" và "Mô phỏng giao dịch đến" chỉ chạy với fake provider ngoài production.
- Không tích hợp cổng ngân hàng mới.

## SPECIFICATIONS

### Cấu hình và khóa (BR-482, BR-484)

1. `app_settings.bank = { autoActivate: boolean }`, mặc định `true` (migration + seed), đọc qua `AppSettingsService.bank()` (cache 60 giây).
2. "Cổng nhận giao dịch":
   - Hiển thị **chỉ đọc** cổng đang chạy theo env `BANK_PROVIDER` (`fake` → "Giả lập (dev)", `sepay` → "SePay").
   - Không cho chọn Casso / Vietcombank API như prototype (D-81 / D-125 / OQ-17: chưa có adapter). Ghi **Q-V46-806-1**.
3. "Webhook URL" = `${API_PUBLIC_URL}/v1/webhooks/bank` (route hiện có), có nút "Sao chép".
4. **Khóa bí mật**:
   - Bảng `bank_webhook_keys` (1 dòng) lưu `key_enc` (SecretBox) + `hint` (4 ký tự cuối).
   - Chưa có dòng → khóa hiện hành là env `BANK_WEBHOOK_SECRET` (tương thích dev / test / provider đang chạy); hint lấy 4 ký tự cuối của env.
   - Ô hiển thị `sk_live_••••••••••••{hint}`.
   - "Tạo lại" (`POST /v1/admin/settings/bank/key`) thực hiện:
     - xác nhận bằng Modal "Khóa cũ ngừng hoạt động ngay. Cập nhật khóa mới trên cổng {cổng}."
     - sinh 32 byte ngẫu nhiên (`base64url`), lưu mã hoá, audit `bank.key_rotate` (chỉ hint, **không** khóa)
     - trả khóa **một lần** trong response; UI hiện hộp "Sao chép khóa mới", đóng lại thì không xem lại được
     - toast "Đã tạo khóa bí mật mới · cập nhật lại trên cổng {cổng}"
5. Webhook (`ReconcileService.ingestWebhook`) verify bằng **khóa hiện hành** (`BankKeyService.current()`): cache Redis 60 giây giữ bản đã mã hoá; xoay khóa thì xoá cache ngay. Sai khóa → 401 như hiện tại.
   - Không có thời gian ân hạn cho khóa cũ → ghi **Q-V46-806-2**.
   - Quét bù (`poll`) không dùng khóa webhook, giữ nguyên.
6. Công tắc "Tự kích hoạt khi khớp" lưu ngay khi gạt, như prototype (`togAuto`); audit `settings.bank`. Dòng phụ:
   - bật: "Bật · khớp nội dung và đủ số tiền sẽ kích hoạt ngay"
   - tắt: "Tắt · mọi giao dịch chờ Admin xác nhận"
7. Khung thông tin (chỉ đọc, từ env có sẵn):
   - "Tài khoản nhận": `{BANK_NAME} · {BANK_ACCOUNT_NO}`
   - "Chủ tài khoản": `BANK_ACCOUNT_NAME`
   - "Cú pháp nội dung": **`OPCHUB <Mã TV> <SĐT>`** (D-123; Gói Gọi vốn thêm `GV…` theo D-105, ghi trong tooltip)
   - "Khớp / cần xử lý": `matched` / (`unmatched` + `short` chưa xử lý) đếm bằng `counts()` một query

### Tự kích hoạt (BR-482, TC-481)

8. Bật: luồng hiện có giữ nguyên. Khớp nội dung + đúng số tiền → `matched`, kích hoạt phí (hoặc Gói Gọi vốn chờ thẩm định), outbox như cũ.
   - Thêm audit hệ thống `fee.auto_activate` (actor `system`, entity `payment_transaction`) để "nhật ký ghi thao tác" (TC-481).
   - Nếu `AuditService` chưa nhận actor hệ thống → dùng mẫu audit hệ thống đang có ở job khác, ghi completion.
9. Tắt: job `match` **không kích hoạt**, giữ `unmatched`, ghi lý do "Chờ Admin xác nhận (tự kích hoạt tắt)" kèm gợi ý thành viên (Mã TV đọc được). Admin xác nhận qua nút "Gán cho {tên gợi ý}" (SPEC 11).
   - Bật lại không tự xử lý lại các giao dịch đang chờ → ghi **Q-V46-806-3**.

### Trạng thái và thao tác (BR-481, BR-483, TC-482)

10. Ánh xạ trạng thái hiển thị:
    - `matched` → "Đã khớp · tự kích hoạt" (xanh)
    - `manual` → "Gán thủ công" (xanh dương)
    - `unmatched` có lý do số tiền nhỏ hơn giá gói → **"Thiếu tiền"** (cam). Phân loại bằng mã lý do `short_amount` ghi cùng `_unmatchedReason`; lý do cũ dạng chữ "Số tiền nhỏ hơn phí thành viên" cũng tính là thiếu tiền.
    - `unmatched` khác → "Không khớp nội dung" (đỏ)
    - `short` → "Thiếu tiền · đã ghi nhận" (cam nhạt, không còn nút)
    - `ignored` không hiện ở bảng này
11. Nút trên dòng:
    - "Không khớp" → "Gán cho {gợi ý | thành viên}". Mở `MatchDialog` hiện có của màn Phí thành viên (chọn thành viên / Gói Gọi vốn, lý do bắt buộc), gọi API khớp tay hiện có `POST /v1/admin/fees/transactions/:id/match` → `manual` + kích hoạt + audit `fee.match_transaction`.
    - Gợi ý = thành viên có Mã TV trong nội dung, hoặc theo SĐT trong nội dung (`localPhone`).
    - Luật cứng 3: feature FE không import nội bộ feature khác. Nếu barrel `features/fees/index.ts` được phép import (depcheck PASS) → export `MatchDialog` qua barrel (1 dòng, thêm `features/fees/index.ts` vào Files touched). Nếu không → dựng hộp chọn thành viên tối giản trong `bank-*` gọi cùng API. **Không** chuyển `MatchDialog` sang `packages/ui`. Ghi lựa chọn vào completion.
12. "Thiếu tiền" → "Ghi nhận thiếu":
    - Mở `bank-short-dialog` (ghi chú bắt buộc ≤ 500).
    - `POST /v1/admin/settings/bank/transactions/:id/short` → `UPDATE … SET match_status = 'short', short_note, short_by WHERE id = $1 AND match_status = 'unmatched'`, audit `fee.short_record`.
    - **Không kích hoạt phí** (BR-483). Kích hoạt tay sau đó vẫn qua Phí thành viên › Thu tay như hiện tại → ghi **Q-V46-806-4**.
13. API (`/v1/admin/settings/bank/*`):
    - `GET /bank` (`settings.general`): cấu hình + cổng + webhook URL + hint + thông tin tài khoản + counts
    - `PATCH /bank` (`settings.general`): `{ autoActivate }`
    - `POST /bank/key` (`settings.general`): xoay khóa
    - `POST /bank/test` (`settings.general`): kiểm tra kết nối (SPEC 15)
    - `POST /bank/simulate` (`settings.general`): mô phỏng (SPEC 15)
    - `GET /bank/transactions?cursor&limit=20` (`fees.view` **hoặc** `settings.general`)
    - `POST /bank/transactions/:id/short` (`fees.action`)
    - `POST /bank/export` (`fees.action`): CSV, audit `fee.bank_export` (luật 10)
14. Danh sách giao dịch gần đây:
    - Keyset `(received_at DESC, id DESC)`, 20 / trang, "Xem thêm"
    - Cột: Thời gian (VN, `dd/mm/yyyy HH:mm`) / Số tiền / Nội dung chuyển khoản / Thành viên (tên người đã khớp, hoặc "—") / Trạng thái / thao tác
    - Tên thành viên lấy bằng deferred join `users` theo `matched_user_id`, không N+1

### Kiểm tra kết nối và mô phỏng

15. Hai nút ở đầu tab:
    - **"Kiểm tra kết nối"**: gọi `bank.listSince(now − 10 phút)` qua adapter. Thành công → toast "Đã kết nối {cổng} · nhận được {n} giao dịch thử"; lỗi → toast lỗi. Fake luôn thành công; test không gọi SePay thật.
    - **"Mô phỏng giao dịch đến"**: chỉ khi `BANK_PROVIDER = fake` và không phải production (ngược lại ẩn nút, API trả 404). Đi đúng đường `DevBankController.simulate` hiện có, body mẫu `OPCHUB <Mã TV demo> <SĐT> ` + số tiền gói Cá nhân hiện hành. Toast theo prototype:
      - tự kích hoạt bật: "Đã nhận {số tiền} · khớp OPCHUB … → tự kích hoạt {Gói} cho {tên}"
      - tắt: "Đã nhận {số tiền} · chờ Admin xác nhận"

### Validation

- `bankSettingsPatchSchema`: `{ autoActivate: boolean }` `strict()`.
- `bankShortSchema`: `{ note: string 1..500 }`.
- Cursor danh sách parse zod; `limit` 1..50.
- Response parse bằng schema `@opchub/shared` ở server và MSW.

### Error Handling

| Trường hợp | Kết quả |
|---|---|
| Webhook sai / thiếu chữ ký, hoặc dùng khóa cũ sau khi xoay | 401, không lưu giao dịch |
| Ghi nhận thiếu / gán cho giao dịch đã xử lý | 409 "Giao dịch không còn ở trạng thái chưa khớp" |
| Mô phỏng ở production hoặc provider thật | 404 |
| Kiểm tra kết nối lỗi adapter | 502 `INTEGRATION_ERROR` có thông điệp ngắn; không lộ token |
| Thiếu quyền | 403 |
| `DATA_ENC_KEY` sai khi giải mã khóa | 500 + log lỗi (không log khóa); webhook trả 401 |

## ACCEPTANCE CRITERIA

- **TC-481** Given tự kích hoạt bật, TV `TV000123` Gói Cá nhân giá hiện hành When webhook ký đúng với nội dung `OPCHUB TV000123 0912345678`, đúng số tiền Then:
  - dòng "Đã khớp · tự kích hoạt"
  - phí kích hoạt
  - audit `fee.auto_activate`
  - `counts.matched` tăng 1

  Test: int `bank-reconcile-admin.int.spec.ts` › `TC-481 auto activate`.
- **BR-482 tắt** Given tự kích hoạt tắt When cùng giao dịch Then giữ "Không khớp nội dung" với lý do "Chờ Admin xác nhận", phí **không** đổi; Admin "Gán cho Nguyễn …" → "Gán thủ công", phí kích hoạt, audit `fee.match_transaction` (int `bank-reconcile-admin` › `auto off waits admin`).
- **TC-482** Given nội dung `chuyen tien phi thanh vien` Then "Không khớp nội dung"; Admin bấm Gán, chọn thành viên, nhập lý do → "Gán thủ công" (e2e `admin-bank-reconcile.spec.ts` › `assign unmatched`; int).
- **Thiếu tiền** Given `OPCHUB TV000123 …` với 1.000.000 < giá 1.200.000 Then "Thiếu tiền"; "Ghi nhận thiếu" + ghi chú → "Thiếu tiền · đã ghi nhận", phí không kích hoạt, audit `fee.short_record`; ghi nhận lần 2 → 409 (int `bank-reconcile-admin` › `short record`).
- **BR-484 xoay khóa** Given khóa env When Admin "Tạo lại" Then response có khóa mới đúng một lần, `GET /bank` chỉ có hint; webhook ký bằng khóa cũ → 401, ký bằng khóa mới → 200; audit `bank.key_rotate` không chứa khóa; log không chứa khóa (int `bank-reconcile-admin` › `key rotation`).
- **Cú pháp D-123** Given mở tab Then dòng "Cú pháp nội dung" là `OPCHUB <Mã TV> <SĐT>`, không có `OPC <SĐT> <GÓI>`; seed / MSW chỉ dùng nội dung `OPCHUB …` (unit `bank-tab.spec.tsx`).
- **Cổng** Given `BANK_PROVIDER=fake` Then cổng "Giả lập (dev)" chỉ đọc, không có Casso / Vietcombank API để chọn (unit `bank-tab.spec.tsx`).
- **Kiểm tra / mô phỏng** Given fake provider ngoài production When "Mô phỏng giao dịch đến" Then 1 giao dịch mới đầu bảng, toast đúng câu theo trạng thái tự kích hoạt; production → nút ẩn, API 404; "Kiểm tra kết nối" toast "Đã kết nối …" (int + e2e `admin-bank-reconcile` › `simulate`).
- **Quyền** Given Kế toán (`fees.*`, không `settings.general`) Then không thấy tab Cài đặt › Đối soát ngân hàng nhưng gọi được danh sách / gán / ghi nhận thiếu qua API; Quản trị viên có `settings.general` thấy tab; Giảng viên 403 cả hai nhóm (int `bank-reconcile-admin` › `permissions`). Ghi **Q-V46-806-5**.
- **Danh sách** Given 45 giao dịch đủ 4 trạng thái Then trang đầu 20 dòng mới nhất, đúng nhãn / màu, "Xem thêm" tải tiếp, tên thành viên đúng, EXPLAIN dùng index `(received_at DESC, id DESC)` không Seq Scan trên ≥ 10k dòng (int `bank-reconcile-admin` › `list keyset`).
- **CSV** Given 5 giao dịch Then "Xuất CSV" tải `doi-soat-ngan-hang.csv` cột Thời gian / Số tiền / Nội dung / Thành viên / Trạng thái, audit `fee.bank_export` (int + e2e).
- **Không hồi quy** `reconcile.int.spec.ts`, `reconcile-v42.int.spec.ts`, màn Phí thành viên › Giao dịch cần đối soát vẫn PASS.
- **Parity (D-134, tham khảo)** `D-V46-BANK` ở 1440 + 390: ghi % và nguyên nhân phần > 3% (dữ liệu / D-123 cú pháp / D-81 cổng chỉ đọc / giao diện thật); lệch giao diện thật phải sửa.

## CONSTRAINTS

- DO NOT:
  - tích hợp Casso / Vietcombank API / cổng mới; gọi SePay thật trong test (D-81, luật 11)
  - hiển thị / dùng cú pháp `OPC <SĐT> <GÓI>` (D-123)
  - lưu khóa dạng rõ; trả khóa ngoài response "Tạo lại"; log / audit khóa
  - kích hoạt phí khi "Ghi nhận thiếu"; nới quy tắc đúng số tiền D-104 cho tự khớp
  - đổi luồng khớp tay / Gọi vốn hiện có (chỉ gọi lại)
  - query trong vòng lặp; select `*`
  - `any`, `@ts-ignore`, `console.*`; sửa `.env` thật; mask / nới assertion (D-134)
- REUSE:
  - `ReconcileService`, `PaymentTransactionRepository` (`findUnmatched`, `markMatched`, `noteUnmatched`), `FeeTransactionsService.match / matchFundraising`, `MatchDialog`
  - `verifySignature`, `FakeBankProvider.sign / push`, `DevBankController.simulate`
  - `SecretBox`, `AppSettingsService` (cache), `AuditService`, `extractMemberCode`, `localPhone`, `transferContentOf`
  - `Switch`, `use-settings-mutation.ts`, mẫu tab 805
- SKIP:
  - Chọn cổng Casso / Vietcombank API (VM-461); thời gian ân hạn khóa cũ
  - Xử lý lại giao dịch chờ khi bật lại tự kích hoạt
  - Nhật ký thao tác Admin toàn phủ (807)

## Câu hỏi ghi sẵn (`reports/ui-parity/questions.md` › V4.6, chọn phương án an toàn, không chặn)

- **Q-V46-806-1**: Prototype cho chọn Casso / SePay / Vietcombank API. Chưa có adapter cho Casso và Vietcombank (VM-461, D-81) → app hiện cổng đang chạy ở dạng chỉ đọc.
- **Q-V46-806-2**: Xoay khóa có hiệu lực ngay, khóa cũ hỏng luôn, không có thời gian ân hạn. Admin phải cập nhật khóa trên cổng ngay sau khi tạo lại.
- **Q-V46-806-3**: Bật lại tự kích hoạt không tự xử lý lại các giao dịch đang chờ. Admin gán tay từng giao dịch.
- **Q-V46-806-4**: "Ghi nhận thiếu" chỉ đánh dấu và ghi chú, không kích hoạt. Muốn kích hoạt thì Admin Thu tay ở Phí thành viên.
- **Q-V46-806-5**: Tab nằm trong Cài đặt nên cần `settings.general` (prototype `need.bank = 'cfg'`). Kế toán (`fees.*`) không thấy tab, nhưng vẫn xử lý giao dịch ở Phí thành viên › Giao dịch cần đối soát.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-806-bank-reconcile-settings`; chỉ sửa file trong **Files touched** (thêm ngoài danh sách → ghi lý do)
- [ ] Hỏi owner DB đích trước khi `migrate deploy` / int / e2e server / seed; migration `--create-only` rồi sửa SQL, có `down.sql`
- [ ] Biến env mới `API_PUBLIC_URL` có trong `.env.example` + zod env schema (luật 12); không sửa `.env` thật
- [ ] Đo baseline `dev` trước (int đối soát, e2e MSW, parity Cài đặt) để tách lỗi cũ / mới
- [ ] Mỗi AC có test đúng tên, ghi PASS / FAIL thật từng cái
- [ ] Chạy và dán tóm tắt output thật: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`; `pnpm e2e` MSW không tụt; e2e server cho `admin-bank-reconcile.spec.ts`
- [ ] Parity (D-134): đo `D-V46-BANK` 1440 + 390, ghi % + nguyên nhân; sửa hết lệch giao diện thật
- [ ] EXPLAIN danh sách giao dịch + counts trên ≥ 10k `payment_transactions`, dán completion
- [ ] Luật BUILDER-HANDOFF liên quan:
  - **Luật 7 / 8**: đổi trạng thái giao dịch có điều kiện `WHERE match_status = 'unmatched'`; kích hoạt + audit + outbox một transaction
  - **Luật 10**: lưu cấu hình, xoay khóa, gán, ghi nhận thiếu, xuất CSV đều ghi `audit_logs`
  - **Luật 11 / 12**: chỉ adapter `bank-webhook`, fake trong test; khóa mã hoá SecretBox, không secret trong repo / log
  - **D-123**: cú pháp hiển thị và dữ liệu mẫu `OPCHUB …`; **D-104**: tự khớp đúng số tiền
- [ ] File ≤ trần (BE 600, FE 400); không `any` / `@ts-ignore` / `console.*`
- [ ] Glossary: "Đối soát ngân hàng", "Tự kích hoạt khi khớp", "Ghi nhận thiếu", "Khóa bí mật webhook"
- [ ] Ghi Q-V46-806-1 → 5; cập nhật `V4.6-progress.md` dòng #6
- [ ] Sau khi đo: chạy lại seed demo (native HOLD); không tắt tiến trình HOLD
- [ ] Commit theo bước `git commit -- <paths>` (cấm `git add -A`); `git status --short` sạch; push; PR `base: dev`, không tự merge; completion report có **git commit SHA**, PR, số test thật, parity (tham khảo), EXPLAIN, soát luật cứng 1–14, phần chưa làm
- [ ] KHÔNG báo DONE nếu còn gate đỏ (lint / type / unit / int / e2e / depcheck / build); parity theo D-134 không chặn nhưng phải có nguyên nhân

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ (ID, module, priority, depends, estimate M, REQ / D)
- [x] Context: DB đích, delta P12, BR-481 → 484, TC-481 / 482, dòng prototype, luồng đối soát hiện có
- [x] Task rõ phạm vi + SKIP (cổng mới, ân hạn khóa, 807)
- [x] Business rules đánh số 1 → 15, validation, bảng lỗi
- [x] AC Given / When / Then có tên test: TC-481, tự kích hoạt tắt, TC-482, thiếu tiền, xoay khóa, D-123, cổng, mô phỏng, quyền, danh sách keyset, CSV, không hồi quy, parity D-134
- [x] Constraints DO NOT / REUSE / SKIP
- [x] Applicable Standards từ `standards/README.md`
- [x] Files touched mức file; Parallel-safe: sequential với 807 / 811
- [x] BUILDER-CHECKLIST trích luật 7 / 8 / 10 / 11 / 12, D-104 / D-123
- ⚠️ Gap:
  - Dùng lại `MatchDialog` của feature `fees` có thể vướng ranh giới import FE (`depcheck`); TIP cho phương án dự phòng là hộp chọn tối giản gọi cùng API.
  - Xoay khóa đổi nguồn khóa từ env sang DB cho mọi provider. SePay thật cần cập nhật khóa trên cổng; chưa có tài khoản SePay (OQ-06) nên chỉ kiểm bằng fake.
  - Q-V46-806-1 → 5 là phương án an toàn tự chọn, cần owner xác nhận khi review.
