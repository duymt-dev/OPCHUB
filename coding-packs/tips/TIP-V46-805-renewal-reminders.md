# TIP-V46-805: Admin › Cài đặt › Nhắc gia hạn — mốc 30 / 7 / 1, kênh Email + Thông báo, gửi tay, cột Lần gửi

## HEADER

- TIP-ID: TIP-V46-805
- Project: OPCHUB
- Module: membership-fee (job nhắc, gửi tay, danh sách sắp hết hạn), settings (`app_settings.renewal`), mail (mẫu nhắc gia hạn), notification (consumer sẵn có), Admin › Cài đặt
- Priority: P1
- Depends on: TIP-V46-801 (trạng thái `regional_director`); chạy sau 804 theo thứ tự GOAL (`dev` `8deb0dd8`)
- Estimated: M
- REQ / D: REQ-620, REQ-204 (đổi mốc) · BR-471 → BR-474, TC-471, TC-472 · D-125 (ẩn Zalo), D-57 (job 08:00, mỗi mốc ≤ 1 lần), D-113 (trial), D-120 (bỏ qua GĐ Vùng), D-123 (`OPCHUB …`), **D-134** (parity tham khảo)
- **Files touched:**
  - DB
    - `packages/db/prisma/migrations/20261108090000_v46_renewal_reminders/migration.sql` + `down.sql` (create): chỉ **data + index**, không đổi bảng:
      - đổi mã mốc trong `fee_reminders` (`T-30` → `D30`, `T-7` → `D7`, `T-0` → `D1`, `T+3` bỏ: giữ dòng cũ, không còn sinh)
      - `INSERT app_settings('renewal', …) ON CONFLICT DO NOTHING`
      - index `fee_reminders (user_id, sent_at DESC)` cho cột "Lần gửi"
    - `packages/db/seed/catalog.ts` (modify: `APP_SETTINGS.renewal`), `packages/db/seed/demo/settings.ts` (dùng `DEMO_SETTINGS`, modify nếu khác catalog)
  - Shared
    - `packages/shared/src/api-domains/renewal.ts` (create): `renewalSettingsSchema`, `renewalSettingsPatchSchema`, `renewalRowSchema`, `renewalListSchema`, `renewalSendSchema`, `renewalSendResultSchema`; `api-domains/index.ts` (modify: 1 dòng)
    - `packages/shared/src/membership/renewal-milestone.ts` + `.spec.ts` (create): hàm thuần `RENEWAL_MILESTONES`, `renewalMilestoneOf(validUntil, now, enabled, sent)`, `nextRenewalMilestone(daysLeft, enabled)`
    - `packages/shared/src/mock-data/domains/renewal.ts` (create), `mock-data/domains/index.ts` (modify)
  - Server
    - `apps/server/src/modules/settings/app-settings.service.ts` (modify: `SettingKey` thêm `'renewal'`, getter `renewal()`)
    - `apps/server/src/modules/membership-fee/domain/fee-reminder.ts` (modify: mốc mới, bỏ T+3; giữ API `daysLeft`)
    - `apps/server/src/modules/membership-fee/repositories/fee-reminder.repository.ts` (modify: loại `regional_director`, `pending_payment`, `expired`; thêm `plan`, `memberCode`, `phone`)
    - `apps/server/src/modules/membership-fee/repositories/renewal.repository.ts` (create): danh sách "Sắp hết hạn trong 30 ngày" + lần gửi gần nhất (keyset), lấy theo `userIds`
    - `apps/server/src/modules/membership-fee/services/fee-scheduler.service.ts` (modify: đọc cấu hình, kênh, mốc mới)
    - `apps/server/src/modules/membership-fee/services/renewal.service.ts` (create): đọc / lưu cấu hình (audit), danh sách, gửi tay
    - `apps/server/src/modules/membership-fee/controllers/admin-renewal.controller.ts` (create): `GET/PATCH /v1/admin/settings/renewal`, `GET /v1/admin/renewal/members`, `POST /v1/admin/renewal/send`
    - `apps/server/src/modules/membership-fee/membership-fee-core.module.ts` (modify: provider + controller)
    - `apps/server/src/modules/mail/templates-fee.ts` (modify: thêm `renewalMail(kind D30 | D7 | D1, …)` có QR ở mốc D1), `mail/index.ts` (modify: export)
    - `apps/server/src/modules/notification/services/notification-events.handler.ts` (modify: `feeReminded` dùng `title` của payload nếu có)
    - `packages/shared/src/outbox/events.ts` (modify: `membership_fee.reminded.items[]` thêm `title?` — default giữ câu cũ)
    - `apps/server/src/worker/schedules.ts` (modify: chỉ sửa chú thích mốc)
  - Admin
    - `apps/admin/src/features/settings/types.ts` (modify: tab `renewal`, `TAB_KEY.renewal = 'settings.mail'`)
    - `apps/admin/src/features/settings/components/settings-screen.tsx` (modify: 1 case), `settings-nav.tsx` (không đổi nếu đọc khoá i18n)
    - `apps/admin/src/features/settings/components/renewal-tab.tsx`, `renewal-config.tsx`, `renewal-table.tsx`, `renewal.module.css` (create)
    - `apps/admin/src/features/settings/hooks/use-renewal.ts` (create), `api.ts` (modify: 4 hàm)
    - `apps/admin/src/mocks/handlers/settings.ts` (modify: 4 handler), `apps/admin/messages/vi/settings.json` (modify: thêm `tabs.renewal`, `tabSub.renewal`, khối `renewal.*`)
    - `apps/admin/messages/vi/marketing.json` (modify: `fee_reminder` → "Nhắc gia hạn")
  - Test
    - `packages/shared/src/membership/renewal-milestone.spec.ts`, `packages/shared/src/api-domains/renewal.spec.ts` (create)
    - `apps/server/test/membership-fee/fee-reminders.int.spec.ts` (modify: mốc 30 / 7 / 1, kênh, bỏ GĐ Vùng), `renewal-admin.int.spec.ts` (create), `apps/server/test/settings/settings-admin.int.spec.ts` (modify nếu dùng chung audit)
    - `apps/server/src/modules/mail/email-layout.spec.ts` (modify: mẫu mới)
    - `apps/admin/src/features/settings/components/renewal-tab.spec.tsx` (create)
    - `e2e/behavior/admin-renewal.spec.ts` (create); `e2e/parity/scenarios/admin-settings.ts` (modify: thêm `D-V46-RENEW`)
  - Tài liệu
    - `coding-packs/01-REQUIREMENTS-MATRIX.md` **không sửa** (D-57 đổi mốc ghi ở completion + câu hỏi)
    - `coding-packs/standards/global/domain-glossary.md` (thêm dòng), `coding-packs/reports/V4.6-progress.md` (dòng #5), `coding-packs/reports/ui-parity/{screens,questions}.md`, `coding-packs/reports/TIP-V46-805-completion.md` (create)
- **Parallel-safe with:** sequential.
  - Chia `admin/features/settings/**`, `messages/vi/settings.json`, `mocks/handlers/settings.ts`, `e2e/parity/scenarios/admin-settings.ts` với V46-806, V46-807, V46-811 → chạy lần lượt 805 → 806 → 807 → 811.
  - Chia `modules/membership-fee/**` với V46-806 (đối soát) → 806 sau 805.
  - Chia `packages/shared/src/outbox/events.ts` với mọi TIP thêm event → chỉ thêm dòng.

## CONTEXT

- Working dir: `D:\CODING\OPCHUB\CODING`. Nhánh `feature/TIP-V46-805-renewal-reminders` tách từ `dev` `8deb0dd8`.
- **DB:** 801 → 804 chạy trên `opchub_v46_801_dev` / `opchub_v46_801_test` + Redis `127.0.0.1:6381` (owner duyệt). Builder hỏi owner DB đích trước khi `migrate deploy` / int / e2e server / seed. Không reset DB native, không tắt tiến trình HOLD.
- Delta `coding-packs/audit/SPEC-V4.6-DELTA.md` **P11**: Admin › Cài đặt › Nhắc gia hạn (mới) — mốc 30 / 7 / 1, kênh (≥ 1), gửi tay từng người / tất cả, cột Lần gửi (BR-471 → 474). D-125: **ẩn kênh Zalo** (chưa có ZNS, giữ OQ-11).
- Đặc tả `docs/spec/dac-ta.html` §33:
  - BR-471: 30 ngày (email nhắc sớm), 7 ngày (email + thông báo), 1 ngày (nhắc lần cuối kèm QR); mỗi mốc bật / tắt riêng
  - BR-472: phải bật ≥ 1 kênh; mỗi TV mỗi mốc 1 lần
  - BR-473: gửi tay từng người / tất cả trong "Sắp hết hạn 30 ngày"; cột Lần gửi = lần gần nhất
  - BR-474: Gói Cá nhân, Gói Doanh nghiệp (kể cả sau 3 tháng miễn phí); không GĐ Vùng đương nhiệm
  - TC-471: tắt cả kênh → "Bật ít nhất 1 kênh gửi", không gửi. TC-472: gửi 1 TV → Lần gửi cập nhật, email vào lịch sử nhãn "Nhắc gia hạn", TV nhận thông báo
- Prototype `docs/spec/index.html` v4.6:
  - Markup `stRenew` dòng ~4982 → 4993
  - Logic dòng ~6522 → 6527 (`RC`, `RR`, `sendR`, `renew.miles`, `renew.chans`)
  - Tab Cài đặt `['renew','Nhắc gia hạn','30 · 7 · 1 ngày trước hạn']` dòng ~6346; quyền xem tab `need.renew = 'mail'` → khoá `settings.mail`
  - Nhật ký mail: `kind 'renew'` hiển thị "Nhắc gia hạn" (dòng ~5472)
- Code hiện tại (đọc trước):
  - `apps/server/src/modules/membership-fee/services/fee-scheduler.service.ts`: job 08:00 VN (`schedules.ts › fee-status-daily`), `sweep` rồi `remind` theo mốc **T-30 / T-7 / T-0 / T+3** (D-57), lô 500, `claim` qua PK `fee_reminders(user_id, valid_until, milestone)`, mail `fee_reminder` + outbox `membership_fee.reminded` → `NotificationEventsHandler.feeReminded` (thông báo chuông)
  - `apps/server/src/modules/membership-fee/domain/fee-reminder.ts`: `dueMilestone` (mốc muộn nhất chưa gửi, trial chỉ T-7 / T-0 — D-113)
  - `apps/server/src/modules/membership-fee/repositories/fee-reminder.repository.ts`: `candidates` (`status IN ('trial','active','expiring','expired')`, index partial `membership_fees_remind`)
  - `apps/server/src/modules/membership-fee/services/admin-fees.service.ts › remind` (nhắc tay ở Phí thành viên, đã loại `regional_director`, audit `fee.remind`, **không** ghi `fee_reminders`)
  - `apps/server/src/modules/mail/templates-fee.ts` (`feeReminderMail`, `feeReminderLine`), `apps/server/src/common/integrations/bank-transfer.ts` (`bankTransferOf` → VietQR EMVCo tại chỗ, D-96)
  - `apps/server/src/modules/settings/{app-settings.service,services/settings-admin.service}.ts` (cache Redis 60 giây + `save` có audit)
  - `apps/admin/src/features/settings/{types.ts,components/settings-screen.tsx,components/settings-nav.tsx}`

## APPLICABLE STANDARDS

- [backend/nestjs-modules](../standards/backend/nestjs-modules.md): nhắc gia hạn thuộc domain membership-fee; cấu hình đọc qua `AppSettingsService` (global); mail qua `MailService.requestMany` trong cùng transaction; thông báo qua outbox
- [backend/queues-workers](../standards/backend/queues-workers.md): job 08:00 có sẵn, chạy lại không gửi trùng (PK `fee_reminders`), lô + keyset
- [backend/api-conventions](../standards/backend/api-conventions.md): `/v1/admin/settings/renewal`, `/v1/admin/renewal/*`, envelope chuẩn, keyset danh sách
- [backend/auth-rbac](../standards/backend/auth-rbac.md): xem / sửa cấu hình + gửi tay = `settings.mail` (prototype `need.renew = 'mail'`)
- [database/query-indexing](../standards/database/query-indexing.md) · [database/prisma-migrations](../standards/database/prisma-migrations.md): migration data + index, có `down.sql`
- [frontend/data-state](../standards/frontend/data-state.md) · [frontend/antd-ui](../standards/frontend/antd-ui.md) · [frontend/ui-parity](../standards/frontend/ui-parity.md) (D-134: parity tham khảo, lệch giao diện thật phải sửa)
- [testing/testing](../standards/testing/testing.md) · [global/code-structure](../standards/global/code-structure.md) · [global/domain-glossary](../standards/global/domain-glossary.md)

## TASK

Thêm tab **Admin › Cài đặt › Nhắc gia hạn** theo prototype:

- Bật / tắt 3 mốc (30 / 7 / 1 ngày trước hạn) và 2 kênh: Email, Thông báo trong hệ thống. Kênh Zalo ẩn theo D-125.
- Danh sách "Sắp hết hạn trong 30 ngày" có cột **Lần gửi**, nút "Gửi nhắc" từng người và nút "Gửi nhắc tất cả".
- Đổi job nhắc 08:00 hiện có sang các mốc này, đọc cấu hình từ tab. Mỗi thành viên mỗi mốc chỉ nhận 1 lần. Bỏ qua GĐ Vùng đương nhiệm và tài khoản không có gói Cá nhân / Doanh nghiệp đang chạy.
- Mốc 1 ngày gửi kèm mã QR chuyển khoản `OPCHUB …`.

## SPECIFICATIONS

### Cấu hình (`app_settings.renewal`)

1. Dạng `{ milestones: { d30: boolean, d7: boolean, d1: boolean }, channels: { email: boolean, app: boolean } }`. Mặc định cả 5 bật (migration + seed). Đọc qua `AppSettingsService.renewal()` (cache 60 giây như các key khác).
2. **Zalo** không có trong schema, API và UI (D-125). Prototype có ô "Zalo ZNS" và mô tả mốc 7 ngày ghi "Email + Zalo + thông báo trong hệ thống". App hiện mô tả mốc 7 ngày là "Email + thông báo trong hệ thống", ghi **Q-V46-805-1**.
3. `PATCH /v1/admin/settings/renewal`:
   - Body nhận một phần của cấu hình.
   - Sau khi gộp mà **mọi kênh tắt** → vẫn lưu (prototype cho tắt), nhưng job không gửi và UI hiện cảnh báo (SPEC 9).
   - Audit `settings.renewal` có diff, rồi invalidate cache.
   - Nút "Lưu cấu hình" gửi **cả** cấu hình. Gạt công tắc chỉ đổi state cục bộ, như prototype (`renewCfg` đổi ngay, "Lưu cấu hình" chỉ flash) → ghi **Q-V46-805-2**.

### Mốc và đối tượng (BR-471, BR-474, D-120, D-113)

4. Mốc theo **ngày lịch VN** còn lại `d = daysLeft(validUntil, now)` (hàm hiện có):
   - `D30`: 7 < d ≤ 30
   - `D7`: 1 < d ≤ 7
   - `D1`: d = 1 (ngày trước ngày hết hạn)

   Job chọn **mốc muộn nhất đã tới mà chưa gửi và đang bật**. Job lỡ ngày vẫn bù, không gửi dồn (giữ nguyên tắc `dueMilestone`). `d ≤ 0` thì không nhắc tự động nữa.
5. Đối tượng: `membership_fees.status IN ('trial','active','expiring')` + `plan IN ('personal','business')`, user `active`, không xoá, không phải nhà đầu tư.
   - **Loại** `regional_director` (D-120 / BR-474), `pending_payment`, `expired`.
   - Trial (3 tháng miễn phí, D-113) **có** nhắc, dùng câu "3 tháng miễn phí … kết thúc ngày …" như hiện tại.
   - Mốc trial theo BR-474 "kể cả sau 3 tháng miễn phí" áp đủ 30 / 7 / 1 khi bật. Thay quy tắc D-113 "trial chỉ T-7 / T-0" → ghi **Q-V46-805-3**.
6. **Đổi D-57 / NA-04**: bỏ T-0 và T+3 tự động, thay bằng 30 / 7 / 1. Trạng thái `expiring` / `expired` của `sweep` giữ nguyên. Ghi rõ trong completion; owner xác nhận ở **Q-V46-805-4**.
7. Mã mốc lưu `fee_reminders.milestone` là `D30` | `D7` | `D1`. Migration đổi `T-30` → `D30`, `T-7` → `D7`, `T-0` → `D1` cho dòng cũ để không gửi lại cùng kỳ. Dòng `T+3` giữ nguyên để làm lịch sử.

### Kênh (BR-472)

8. Mỗi mốc gửi qua **mọi kênh đang bật**:
   - Email: `MailService.requestMany`, kind `fee_reminder` (nhật ký mail hiển thị "Nhắc gia hạn")
   - Thông báo trong hệ thống: outbox `membership_fee.reminded` → consumer hiện có. Tiêu đề "Gói thành viên sắp hết hạn", nội dung "{Gói} hết hạn ngày {dd/mm/yyyy}. Gia hạn để không bị gián đoạn.", link `/membership/pay`
9. Mọi kênh tắt → job **không claim mốc** (để bật lại vẫn gửi), log mức info. Gửi tay trả lỗi 422 "Bật ít nhất 1 kênh gửi" (TC-471). Mọi mốc tắt → job không gửi; gửi tay vẫn được.
10. Mẫu email (`renewalMail`):
    - Tiêu đề `[OPC Hub] {Gói} của bạn sẽ hết hạn sau {d} ngày` (prototype `sendR`)
    - D30: kèm quyền lợi khi gia hạn (1 đoạn ngắn có sẵn ở mẫu cũ)
    - D7: câu nhắc
    - D1: "nhắc lần cuối" + **QR VietQR** cùng số tiền gói và nội dung `OPCHUB <Mã TV> <SĐT>` (D-123, `bankTransferOf`) + thông tin tài khoản nhận. QR đưa vào mail dạng ảnh PNG sinh tại server (data URI hoặc CID), **không gọi dịch vụ ngoài** (D-96). Nếu thư viện mail hiện có không hỗ trợ ảnh nhúng → ghi chuỗi VietQR + STK / nội dung dạng chữ và ghi completion; **không** thêm dependency khi chưa hỏi owner.
11. Trial dùng câu trial hiện có (`feeReminderLine(..., trial = true)`), tiêu đề "Sắp hết 3 tháng miễn phí OPC Hub".

### Danh sách "Sắp hết hạn trong 30 ngày" + Lần gửi (BR-473)

12. `GET /v1/admin/renewal/members?cursor&limit=20` trả về:
    - `total`
    - `items[]`: `userId`, `name`, `email`, `plan` (Gói Cá nhân / Doanh nghiệp), `validUntil`, `daysLeft`, `nextMilestone` ("30 ngày" / "7 ngày" / "1 ngày", tính bằng `nextRenewalMilestone`), `lastSentAt | null`
    - `nextCursor`

    Đối tượng theo SPEC 5, `0 < daysLeft ≤ 30`, sort `valid_until ASC, user_id`. Dùng deferred join + keyset.
13. **Lần gửi** = `max(fee_reminders.sent_at)` của người đó (cả job lẫn gửi tay, mọi kỳ), hiển thị "Đã gửi {x phút / giờ / ngày trước}" (xanh) hoặc "Chưa gửi" (xám) như prototype `_ago`.
14. Gửi tay `POST /v1/admin/renewal/send { userIds: string[] (1..500) } | { all: true }`:
    - Chọn đối tượng theo SPEC 5 trong cửa sổ 30 ngày; `all` = toàn bộ danh sách (lô 500 trong service).
    - Mốc gửi = `nextMilestone` hiện tại của từng người. Ghi `fee_reminders` với **mã gửi tay riêng** `M:<yyyy-mm-dd VN>`, để "Lần gửi" cập nhật mà không chặn mốc tự động. Admin gửi được nhiều lần; ngày nào gửi rồi trong cùng ngày VN thì ghi đè `sent_at`.
    - Kênh theo cấu hình. Mail + outbox + `fee_reminders` + audit `fee.renewal_send` (số người, kênh, mốc) trong **một transaction**.
    - Trả `{ sent, channels: ('email' | 'app')[] }`. UI toast "Đã gửi nhắc gia hạn tới {n} thành viên qua {Email, thông báo}" (prototype).
15. Nhắc tay hiện có ở **Phí thành viên** (`admin-fees.service.ts › remind`) giữ nguyên hành vi (D-57 / NA-04, mọi trạng thái kể cả `pending_payment`), không dùng cấu hình kênh — SKIP.

### Admin UI (prototype; D-134)

16. Tab "Nhắc gia hạn" trong Cài đặt:
    - Phụ đề nav "30 · 7 · 1 ngày trước hạn". Vị trí: sau "Cấu hình bảng giá", trước "Tài khoản quản trị" (theo thứ tự prototype; tab 806 / 811 chèn sau).
    - Hiện khi có `settings.mail`.
17. Bố cục:
    1. Tiêu đề "Nhắc gia hạn tự động", mô tả "Hệ thống tự gửi nhắc theo các mốc trước ngày hết hạn gói. Giữ chân thành viên sau 3 tháng miễn phí.", nút "Lưu cấu hình"
    2. Hai khung cạnh nhau (390: xếp dọc):
       - "Mốc gửi nhắc": 3 dòng tên + mô tả + công tắc
         - "30 ngày trước hạn" / "Email nhắc sớm, kèm quyền lợi khi gia hạn"
         - "7 ngày trước hạn" / "Email + thông báo trong hệ thống"
         - "1 ngày trước hạn" / "Nhắc lần cuối, kèm mã QR chuyển khoản"
       - "Kênh gửi": "Email (Brevo)", "Thông báo trong hệ thống"
    3. Dòng "Sắp hết hạn trong 30 ngày · {n} thành viên" + nút "Gửi nhắc tất cả"
    4. Bảng: cột Thành viên (tên + email) / Gói / Hết hạn ("dd/mm/yyyy" + "Còn N ngày", đỏ khi ≤ 7, cam khi > 7) / Mốc kế tiếp / Lần gửi / nút "Gửi nhắc"; phân trang keyset "Xem thêm" nếu > 20
18. Mọi kênh đang tắt → bấm gửi báo toast "Bật ít nhất 1 kênh gửi", không gọi API gửi (server vẫn chặn, SPEC 9).
19. Không có `settings.mail` → không thấy tab; gọi API → 403.

### Validation

- `renewalSettingsPatchSchema`: object một phần, chỉ boolean, `strict()` (key lạ → 422).
- `renewalSendSchema`: `userIds` 1..500 chuỗi không rỗng, không trùng; hoặc `{ all: true }`; không nhận cả hai.
- Response parse bằng schema ở `@opchub/shared` cả server lẫn MSW.

### Error Handling

| Trường hợp | Kết quả |
|---|---|
| Gửi khi mọi kênh tắt | 422 `RENEWAL_NO_CHANNEL` "Bật ít nhất 1 kênh gửi" |
| `userIds` có người ngoài đối tượng (GĐ Vùng, quá 30 ngày, nhà đầu tư) | bỏ qua người đó; `sent` chỉ đếm người hợp lệ; tất cả không hợp lệ → 200 `sent: 0` |
| Thiếu quyền `settings.mail` | 403 |
| Job chạy lại / hai worker song song | không gửi trùng (PK `fee_reminders` + `claim ON CONFLICT`) |
| SMTP lỗi | mail ở trạng thái `failed` theo luồng mail hiện có; `fee_reminders` vẫn ghi (như hiện tại), không retry gửi lại cùng mốc |
| Cấu hình thiếu trong DB | migration tạo; nếu vẫn thiếu → lỗi rõ như các key khác (`Thiếu app_settings.renewal`) |

## ACCEPTANCE CRITERIA

- **Mốc** Given hạn 31/12/2026 (VN), mọi mốc + kênh bật When job 08:00 ngày 01/12 (d = 30), 24/12 (d = 7), 30/12 (d = 1), 31/12 (d = 0) Then gửi `D30`, `D7`, `D1`, không gửi ngày 31/12; chạy lại cùng ngày không gửi thêm; job lỡ 24 → 26/12 vẫn gửi `D7` một lần (unit `renewal-milestone.spec.ts`; int `fee-reminders.int.spec.ts` › `milestones 30 7 1`).
- **Mốc tắt** Given `d7 = false` When ngày 24/12 Then không gửi; ngày 30/12 gửi `D1` (int `fee-reminders` › `disabled milestone`).
- **Kênh** Given chỉ bật Thông báo Then không có mail `fee_reminder`, có 1 outbox `membership_fee.reminded` với title "Gói thành viên sắp hết hạn"; chỉ bật Email thì ngược lại; tắt cả hai → không claim, bật lại hôm sau vẫn gửi (int `fee-reminders` › `channels`).
- **Đối tượng (BR-474)** Given GĐ Vùng đương nhiệm (`regional_director`), `pending_payment`, `expired`, nhà đầu tư, TK bị khoá Then không nhắc và không có trong danh sách; trial còn 30 ngày → có nhắc câu trial (int `fee-reminders` › `audience`; `renewal-admin.int.spec.ts` › `list audience`).
- **Migration** Given `fee_reminders` có `T-7` cho kỳ hiện tại Then sau migration là `D7` và job không gửi lại `D7` kỳ đó; `T+3` giữ nguyên (int `renewal-admin` › `milestone migration`, chạy SQL trên DB test).
- **Mốc 1 ngày có QR** Given mốc `D1`, gói Cá nhân Then mail có QR / chuỗi VietQR đúng số tiền gói và nội dung `OPCHUB <Mã TV> <SĐT>` (unit `email-layout.spec.ts` › `renewal D1 qr`).
- **TC-471** Given tắt cả 2 kênh When "Gửi nhắc tất cả" Then toast "Bật ít nhất 1 kênh gửi", không có request gửi; gọi API trực tiếp → 422 (unit `renewal-tab.spec.tsx`; int `renewal-admin` › `no channel`).
- **TC-472** Given 1 TV còn 12 ngày When "Gửi nhắc" Then:
  - cột Lần gửi đổi "Đã gửi vài giây trước"
  - nhật ký mail có 1 thư nhãn "Nhắc gia hạn"
  - TV có 1 thông báo
  - audit `fee.renewal_send`
  - gửi lại lần 2 cùng ngày được, `sent_at` cập nhật
  - mốc tự động `D7` của kỳ đó vẫn gửi đúng ngày

  Test: int `renewal-admin` › `manual send`; e2e `admin-renewal.spec.ts` › `send one`.
- **Gửi tất cả** Given 25 người trong cửa sổ Then `sent = 25`, toast đúng câu, một transaction (int `renewal-admin` › `send all`).
- **Cấu hình** Given Admin tắt "30 ngày" và bấm "Lưu cấu hình" Then `PATCH` lưu, audit `settings.renewal` có diff, tải lại trang giữ trạng thái; người không có `settings.mail` không thấy tab và nhận 403 (int `renewal-admin` › `settings audit and permission`; e2e `admin-renewal` › `save config`).
- **Danh sách** Given 45 người trong cửa sổ Then trang đầu 20 dòng sort hạn gần nhất, "Còn N ngày" đỏ khi ≤ 7, "Mốc kế tiếp" đúng, "Xem thêm" tải 20 tiếp; EXPLAIN không Seq Scan trên ≥ 10k `membership_fees` (int `renewal-admin` › `list keyset`).
- **Không Zalo** Given mở tab Then không có chữ "Zalo" ở UI / API (unit `renewal-tab.spec.tsx`).
- **Parity (D-134, tham khảo)** `D-V46-RENEW` ở 1440 + 390: ghi % và nguyên nhân phần > 3% (dữ liệu / D-125 ẩn Zalo / giao diện thật); lệch giao diện thật phải sửa. D-66 → D-75 không có lệch giao diện mới do thêm tab.

## CONSTRAINTS

- DO NOT:
  - kênh Zalo / ZNS dưới mọi dạng (D-125); Web Push thật
  - nhắc GĐ Vùng đương nhiệm (BR-474, D-120); viết lại điều kiện phí ngoài các chỗ hiện có (V-11)
  - query trong vòng lặp; gửi mail ngoài transaction claim
  - gọi dịch vụ QR / ngân hàng ngoài; thêm dependency khi chưa hỏi owner
  - đổi bảng `fee_reminders` / `membership_fees` (chỉ data + index)
  - đổi hành vi nhắc tay ở Phí thành viên
  - `any`, `@ts-ignore`, `console.*`; mask / nới assertion / sửa ảnh baseline (D-134)
- REUSE:
  - `FeeSchedulerService` + `FeeReminderRepository.claim`, `daysLeft`, `MailService.requestMany`, outbox `membership_fee.reminded` + `NotificationEventsHandler.feeReminded`
  - `bankTransferOf`, `transferContentOf` (D-123), `feeReminderLine` (câu trial)
  - `AppSettingsService` (cache), mẫu `SettingsAdminService.save` (audit + invalidate)
  - `Switch` (`features/settings/components/switch.tsx`), `use-rel-time.ts`, `use-settings-mutation.ts`, bảng `@opchub/ui`
- SKIP:
  - Zalo ZNS (OQ-11, VM-462); Web Push (VM-463, 811)
  - Nhắc Gói Gọi vốn (luồng V4-610 riêng)
  - Đối soát ngân hàng (806); nhật ký thao tác Admin toàn phủ (807)

## Câu hỏi ghi sẵn (`reports/ui-parity/questions.md` › V4.6, chọn phương án an toàn, không chặn)

- **Q-V46-805-1**: Prototype ghi mốc 7 ngày "Email + Zalo + thông báo" và có kênh "Zalo ZNS". App ẩn Zalo (D-125), mô tả còn "Email + thông báo trong hệ thống".
- **Q-V46-805-2**: Prototype gạt công tắc là đổi ngay. App gạt chỉ đổi trên màn, bấm "Lưu cấu hình" mới lưu (có audit), như các tab Cài đặt khác.
- **Q-V46-805-3**: BR-474 "kể cả sau 3 tháng miễn phí" → trial nhắc đủ 30 / 7 / 1 như gói trả phí, thay quy tắc D-113 "trial chỉ T-7 / ngày hết".
- **Q-V46-805-4**: §33 thay mốc D-57 (T-30 / T-7 / T-0 / T+3) bằng 30 / 7 / 1: bỏ nhắc ngày hết hạn và 3 ngày sau hạn. Ai đã hết hạn vẫn bị popup bắt buộc (D-28) và Admin nhắc tay ở Phí thành viên.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-805-renewal-reminders`; chỉ sửa file trong **Files touched** (thêm ngoài danh sách → ghi lý do)
- [ ] Hỏi owner DB đích trước khi `migrate deploy` / int / e2e server / seed; migration `--create-only` rồi viết SQL data + index, có `down.sql`
- [ ] Đo baseline `dev` trước (int, e2e MSW, parity D-66 → D-75) để tách lỗi cũ / mới
- [ ] Mỗi AC có test đúng tên, ghi PASS / FAIL thật từng cái
- [ ] Chạy và dán tóm tắt output thật: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`; `pnpm e2e` MSW không tụt; e2e server cho `admin-renewal.spec.ts`
- [ ] Parity (D-134): đo `D-V46-RENEW` 1440 + 390, ghi % + nguyên nhân; sửa hết lệch giao diện thật; không mask / nới
- [ ] EXPLAIN danh sách 30 ngày + `candidates` mới trên ≥ 10k `membership_fees`, dán completion
- [ ] Luật BUILDER-HANDOFF liên quan:
  - **Luật 8**: claim `fee_reminders` + mail + outbox (+ audit khi gửi tay) **một transaction**; job idempotent
  - **Luật 10**: lưu cấu hình và gửi tay ghi `audit_logs`
  - **Luật 11 / D-125**: không Zalo, không Web Push, QR sinh tại server (không gọi ngoài)
  - **D-120 / BR-474**: loại `regional_director`; **D-123**: nội dung CK `OPCHUB …`
- [ ] File ≤ trần (BE 600, FE 400); không `any` / `@ts-ignore` / `console.*`
- [ ] Glossary: "Nhắc gia hạn", "Mốc nhắc (D30 / D7 / D1)", "Lần gửi"
- [ ] Ghi Q-V46-805-1 → 4; cập nhật `V4.6-progress.md` dòng #5
- [ ] Sau khi đo: chạy lại seed demo (native HOLD); không tắt tiến trình HOLD
- [ ] Commit theo bước `git commit -- <paths>` (cấm `git add -A`); `git status --short` sạch; push; PR `base: dev`, không tự merge; completion report có **git commit SHA**, PR, số test thật, parity (tham khảo) từng màn, EXPLAIN, soát luật cứng 1–14, phần chưa làm
- [ ] KHÔNG báo DONE nếu còn gate đỏ (lint / type / unit / int / e2e / depcheck / build); parity theo D-134 không chặn nhưng phải có nguyên nhân

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ (ID, module, priority, depends 801, estimate M, REQ / D)
- [x] Context: DB đích, delta P11, BR-471 → 474, TC-471 / 472, dòng prototype, code nhắc phí hiện có
- [x] Task rõ phạm vi + SKIP (Zalo, Web Push, Gọi vốn, 806 / 807)
- [x] Business rules đánh số 1 → 19, validation, bảng lỗi
- [x] AC Given / When / Then có tên test: mốc, mốc tắt, kênh, đối tượng, migration mốc, QR, TC-471, TC-472, gửi tất cả, cấu hình + quyền, danh sách keyset, không Zalo, parity D-134
- [x] Constraints DO NOT / REUSE / SKIP
- [x] Applicable Standards từ `standards/README.md`
- [x] Files touched mức file; Parallel-safe: sequential với 806 / 807 / 811
- [x] BUILDER-CHECKLIST trích luật 8 / 10 / 11, D-120 / D-123 / D-125
- ⚠️ Gap:
  - Đổi mốc D-57 (bỏ T-0 / T+3) và mốc trial D-113 theo §33 là thay đổi hành vi đang chạy → Q-V46-805-3 / 4 cần owner xác nhận khi review.
  - QR nhúng trong mail có thể cần thư viện sinh ảnh PNG (repo chưa có); TIP cho phép dự phòng dạng chữ, cấm thêm dependency khi chưa hỏi.
