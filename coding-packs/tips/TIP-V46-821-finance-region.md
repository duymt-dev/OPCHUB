# TIP-V46-821: Tài chính & vùng — tài khoản nhận GĐ Vùng, tự thu hồi khi khóa, QR trong mail, nhắc Gọi vốn, logger Portal, affiliate của vùng (B7 + B8 + B9 + B10)

## HEADER

- TIP-ID: TIP-V46-821
- Project: OPCHUB
- Module: `apps/server/src/modules/regional-director`, `account` (lock effects), `mail`, `membership-fee` (nhắc gia hạn), `project` (Gọi vốn), `reporting/regional`; Admin `features/affiliate/regional`; Portal `features/affiliate`, `lib`
- Priority: **P1** (có sửa lỗi tiền: GĐ Vùng mới thừa hưởng tài khoản nhận của người cũ)
- Depends on: V46-820 (đã vào `dev`). D-139. **TIP cuối của đợt** — sau khi merge mới mở PR release `dev` → `main` (D-139).
- Estimated: L (5 phần, builder tách commit: P0 sửa tài khoản nhận → B8 → B9 → B7 → B10)
- REQ / D:
  - **D-139** (821 = B7 + B8 + B9 + B10)
  - D-119 → D-122, D-129 (chia doanh thu GĐ Vùng), D-120 / GDV-R01 → R08 (bổ nhiệm / thu hồi, phí BR-462, khoản trước thu hồi vẫn chi GDV-R05), D-55 (khóa không khôi phục khi mở)
  - Q-V46-801-6 (thay mặc định "không tự thu hồi"), Q-V46-802-2 / 802-4
  - D-96 (VietQR sinh tại server), D-123 (nội dung `OPCHUB …`), D-82 / D-106 (nhắc Gói Gọi vốn; giá gia hạn chỉ sau khi hết hạn), BR-GV-04
  - NR-R01 ("Hệ thống không có chức năng hoàn phí")
  - **Q-V46-821-1 → 10** (cuối file)
- **Files touched:**
  - **P0 — Tài khoản nhận GĐ Vùng (lỗi tiền)**
    - `apps/server/src/modules/regional-director/services/regional-director.service.ts` (modify: `revokeWithin` xóa `bank_*` trên vùng sau khi chụp vào sự kiện thu hồi; `appoint` không mang tài khoản cũ)
    - `apps/server/src/modules/regional-director/repositories/regional-payout.repository.ts` (modify: `bank()` đọc tài khoản người nhận theo SPEC 3)
    - `packages/db/prisma/schema/regional-director.prisma` + migration `20261120090000_v46_regional_payee_bank/{migration,down}.sql` (create: bảng `regional_payee_banks (region, user_id, bank_name, bank_no, bank_holder, updated_by, updated_at)` PK `(region, user_id)`; dọn dữ liệu: vùng có `user_id IS NULL` → xóa `bank_*`)
    - `apps/server/src/modules/regional-director/services/regional-payee-bank.service.ts` (create) + route trong controller Admin GĐ Vùng hiện có (modify)
    - `packages/shared/src/api-domains/regional-directors.ts` (modify: schema tài khoản người nhận)
    - Admin: `apps/admin/src/features/affiliate/regional/components/regional-share-row.tsx` (modify: nút "Nhập tài khoản nhận" khi `noBank`), `regional-payee-bank-dialog.tsx` (create, dùng lại `regional-bank-fields.tsx`), hook + MSW tương ứng (modify)
  - **B8 — Tự thu hồi GĐ Vùng khi khóa / xóa TK**
    - `apps/server/src/modules/regional-director/services/regional-lock.effects.ts` (create: provider `LockEffects`)
    - `apps/server/src/modules/regional-director/regional-director-core.module.ts`, `index.ts` (modify: đăng ký vào `LockEffectsRegistry`)
    - `apps/server/src/modules/regional-director/services/regional-director.service.ts` (modify: `revokeBySystem(userIds, reason)` dùng lại `revokeWithin`)
    - `apps/server/src/worker/processors/account.processor.ts` (modify 1–2 dòng: `user.deleted` cũng gọi lock effects, nếu chưa)
    - `packages/shared/src/outbox/events.ts` (modify: `regional_director.revoked` thêm `reason?: 'manual' | 'locked' | 'deleted'`, mặc định `manual`)
    - `apps/server/src/modules/regional-director/services/regional-director-events.handler.ts` + `apps/server/src/modules/mail/templates-regional.ts` (modify: câu lý do trong mail / thông báo thu hồi)
  - **B9 — Bút toán đảo**: **không code** (SPEC 9).
  - **B7 — QR trong mail, nhắc Gọi vốn**
    - `apps/server/package.json` + `pnpm-lock.yaml` (modify: dependency `qrcode` + `@types/qrcode`, Q-V46-821-5)
    - `apps/server/src/common/integrations/vietqr-image.ts` (create: payload EMVCo → PNG)
    - `apps/server/src/modules/mail/qr-image.controller.ts` (create: `GET /v1/public/mail-qr/:token.png`) + nối module mail (modify)
    - `apps/server/src/modules/mail/mail-qr-token.ts` (create: ký / kiểm HMAC, hạn 30 ngày)
    - `apps/server/src/common/config/env.schema.ts`, `apps/server/.env.example`, `infra/env/server.env.example` (modify: `MAIL_QR_SECRET`)
    - `apps/server/src/modules/mail/templates-renewal.ts` (modify: ảnh QR + giữ dòng chữ dự phòng)
    - `apps/server/src/modules/membership-fee/services/renewal-delivery.service.ts` (modify: truyền URL ảnh)
    - `apps/server/src/modules/mail/templates-fundraising.ts` (modify: mail nhắc T-14 thêm số tiền gia hạn + ngày hết hạn; mail mới "Gói Gọi vốn đã hết hạn" có thông tin chuyển khoản + QR)
    - `apps/server/src/modules/project/services/fundraising-scheduler.service.ts` (modify: phát mail hết hạn một lần khi chuyển `expired`)
    - `packages/shared/src/api-domains/marketing.ts` (modify: mail kind `fundraising_expired`) + migration CHECK / enum mail kind nếu có ràng buộc (cùng migration 821)
  - **B10 — Logger Portal / Admin, affiliate của vùng**
    - `apps/portal/src/lib/logger.ts`, `apps/admin/src/lib/logger.ts` (create)
    - `apps/server/src/modules/system/client-log.controller.ts` (create: `POST /v1/client-logs`) + nối module (modify)
    - `packages/shared/src/api-domains/client-log.ts` (create)
    - `apps/portal/src/features/affiliate/hooks/use-my-region.ts` (modify: dùng `logger`)
    - `apps/portal/src/app/error.tsx` (modify: ghi lỗi qua `logger`)
    - `apps/server/src/modules/reporting/regional/my-region.queries.ts` (modify: truy vấn trang keyset)
    - `apps/server/src/modules/regional-director/controllers/me-regional.controller.ts` (modify: `GET /v1/me/gdv/affiliates?cursor`, `GET /v1/me/gdv/affiliates.csv`)
    - `apps/server/src/modules/regional-director/services/my-region.service.ts` (modify)
    - `packages/shared/src/api-domains/my-region.ts` (modify)
    - `apps/portal/src/features/affiliate/components/my-region-affiliates.tsx` (modify: "Xem thêm" + "Tải CSV"), hook `use-my-region-affiliates.ts` (create), `apps/portal/messages/*/affiliate.json` (modify, 10 ngôn ngữ), MSW (modify)
  - **Test**
    - `apps/server/test/regional-director/regional-payee-bank.int.spec.ts`, `regional-lock-revoke.int.spec.ts`, `my-region-affiliates.int.spec.ts` (create)
    - `apps/server/test/mail/mail-qr.int.spec.ts`, `apps/server/test/project/fundraising-expired-mail.int.spec.ts`, `apps/server/test/system/client-log.int.spec.ts` (create)
    - unit: `vietqr-image.spec.ts`, `mail-qr-token.spec.ts`, Portal `logger.spec.ts`, `my-region-affiliates.spec.tsx` (create / modify)
    - int hiện có `regional-director/*`, `renewal-*`, `fundraising-*` (modify khi đổi kỳ vọng)
  - **Báo cáo**
    - `coding-packs/reports/TIP-V46-821-completion.md`, `TIP-V46-821-query-plans.md` (create)
    - `coding-packs/reports/V4.6-progress.md` (dòng #20), `coding-packs/plans/V4.6-DEBT.md` (B7 → B10), `coding-packs/reports/ui-parity/questions.md` (mục TIP-V46-821)
- **Parallel-safe with:** sequential (TIP cuối đợt D-139).

## CONTEXT

- Working dir `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-821-finance-region` từ `dev` `714a1765`.
- **P0 — lỗi tiền (đã kiểm trong code 08/11/2026):**
  - Tài khoản nhận chỉ lưu trên vùng (`regional_directors.bank_*`), sửa qua PATCH `:region`.
  - `revokeWithin` (`regional-director.service.ts:107-147`) chụp `bank_*` vào `regional_director_events.bank_snapshot` nhưng **không xóa** `bank_*` khỏi vùng; `appoint` (`:34-72`) cũng không đặt lại.
  - `RegionalPayoutRepository.bank()` (`regional-payout.repository.ts:22-36`) trả `bank_*` của vùng khi `slot.userId === userId` → GĐ Vùng mới được chi vào **tài khoản của người cũ** nếu Admin chưa sửa.
  - GĐ Vùng đã thu hồi: tài khoản lấy từ lần chi gần nhất hoặc ảnh chụp lúc thu hồi; cả hai rỗng → 409 "chưa cập nhật tài khoản nhận" (`regional-payout.service.ts:70`), dòng hiện `noBank` (`regional-share-row.tsx:30`) mà **không có chỗ nhập** (Q-V46-802-2 hứa "Admin cập nhật thủ công ở lần sau" nhưng chưa làm).
- **B8:** khóa TK đi qua `admin-users.service.ts:83-139` (`setStatusTx`, cả moderation `violation.service.ts:56,93` và tự mở `account-lock.service.ts:44`) → outbox `user.locked` / `user.unlocked` → `user-lifecycle.handler.ts:28-35` → `LockEffectsRegistry` (port `LockEffects` `ports.ts:76-84`, idempotent; mẫu `community/services/group-lock.effects.ts`, không khôi phục khi mở — D-55). `user.deleted` (820, `user-deletion.service.ts:25`) hiện chỉ thu hồi phiên + xóa cache trang công khai. `users.locked_until` có giá trị = khóa tạm (moderation N ngày); `NULL` = khóa vô thời hạn. `regional_director_events.actor_id` / `actor_role` NOT NULL.
- **B9:** `regional_shares.status` chỉ `pending | paid`, CHECK số tiền ≥ 0; không có luồng hoàn phí (NR-R01, máy trạng thái phí không có đảo); affiliate `void` đã bỏ (D-110).
- **B7:**
  - Mail nhắc gia hạn D1 (`templates-renewal.ts:19-44`) chỉ có dòng chữ: ngân hàng, STK, chủ TK, `OPCHUB …`, chuỗi EMVCo thô. Không có thư viện QR phía server. Bộ gửi mail chỉ gửi `bodyHtml` (`mail-sender.service.ts:53-59`), Brevo không hỗ trợ ảnh CID, `bodyHtml` bị xóa sau khi gửi.
  - Gọi vốn: job `10 8 * * *` (`fundraising-scheduler.service.ts:31-111`) đã chuyển `expired` và **đã có** nhắc T-14 một lần (D-82) — mail một câu, không số tiền / chuyển khoản. D-106: chỉ gia hạn được **sau khi hết hạn**. Đặc tả / prototype không có quy tắc mốc nhắc Gọi vốn. Nội dung CK Gọi vốn `OPCHUB [Mã TV] [SĐT] GV[Mã DA]` (BR-GV-04, `fundraising.service.ts:53` dùng `bankTransferOf`).
- **B10:**
  - `reportError` là hàm toàn cục của trình duyệt, chỉ dùng ở `use-my-region.ts:11-16`; không gửi về server. Portal / Admin chưa có `lib/logger.ts` (chuẩn `nextjs-structure.md:25`, `code-structure.md:66`).
  - `GET /v1/me/gdv` (`my-region.queries.ts:17-25`) giới hạn 50 affiliate + `more = total − 50`; Portal hiện "+ {n} affiliate khác"; không trang / CSV. Prototype liệt kê hết, không CSV.

## APPLICABLE STANDARDS

- [backend/nestjs-modules](../standards/backend/nestjs-modules.md): transition có điều kiện, outbox, handler idempotent.
- [backend/auth-rbac](../standards/backend/auth-rbac.md): quyền Admin GĐ Vùng hiện có; endpoint `/me/gdv` chỉ cho GĐ Vùng đương nhiệm.
- [database/query-indexing](../standards/database/query-indexing.md): keyset, không query trong vòng lặp, EXPLAIN.
- [integrations/adapters](../standards/integrations/adapters.md): không dịch vụ ngoài (QR sinh tại server, D-96).
- [security/security](../standards/security/security.md): token ảnh QR ký HMAC có hạn; client log không PII; audit mọi thao tác Admin và xuất dữ liệu.
- [frontend/data-state](../standards/frontend/data-state.md), [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md), [testing/testing](../standards/testing/testing.md), [global/code-structure](../standards/global/code-structure.md), [global/tooling](../standards/global/tooling.md) (dependency mới phải ghi lý do), [global/git-workflow](../standards/global/git-workflow.md).

## TASK

1. **P0:** sửa lỗi GĐ Vùng mới thừa hưởng tài khoản nhận của người cũ; cho Admin nhập tài khoản nhận cho GĐ Vùng đã thu hồi còn khoản chờ chi.
2. **B8:** tự thu hồi GĐ Vùng khi TK bị khóa vô thời hạn hoặc bị xóa; khoản đã ghi vẫn chi theo GDV-R05.
3. **B9:** ghi nhận đóng — không có luồng hoàn phí nên không có bút toán đảo.
4. **B7:** ảnh QR VietQR trong mail nhắc gia hạn D1 (và mail Gọi vốn hết hạn); mail Gọi vốn có số tiền + thông tin chuyển khoản.
5. **B10:** logger client cho Portal / Admin gửi lỗi về server; trang + CSV danh sách affiliate của vùng cho GĐ Vùng.

## SPECIFICATIONS

### P0 — Tài khoản nhận GĐ Vùng

1. **Thu hồi:** trong cùng transaction `revokeWithin`, sau khi chụp `bank_snapshot` vào sự kiện thu hồi, ghi tài khoản đó vào `regional_payee_banks (region, user_id)` (upsert) rồi **xóa** `bank_name / bank_no / bank_holder` trên vùng. Bổ nhiệm người mới → vùng không có tài khoản cho tới khi Admin nhập (luồng sửa tài khoản vùng sẵn có); chi trả cho người mới bị chặn bằng 409 "chưa cập nhật tài khoản nhận" như hiện nay.
2. **Dọn dữ liệu cũ** (migration): vùng `user_id IS NULL` → xóa `bank_*`. Vùng đang có GĐ Vùng: **không đoán**; builder liệt kê (chỉ đếm, không in STK) các vùng có `bank_*` mà sự kiện bổ nhiệm gần nhất xảy ra sau một lần thu hồi có cùng `bank_snapshot` — ghi completion để owner kiểm tay (Q-V46-821-2). Không tự sửa tài khoản của GĐ Vùng đương nhiệm.
3. **Đọc tài khoản khi chi** (`bank()`): người nhận là GĐ Vùng đương nhiệm → `bank_*` của vùng; người nhận đã thu hồi → `regional_payee_banks (region, user_id)`, rơi về ảnh chụp lần chi gần nhất / sự kiện thu hồi như hiện nay. Không bao giờ dùng `bank_*` của vùng cho người khác `slot.user_id`.
4. **Admin nhập tài khoản cho người đã thu hồi:** `PUT /v1/admin/regional-directors/:region/payees/:userId/bank` (cùng quyền chi trả GĐ Vùng hiện có), body theo `regionalBankSchema`; chỉ khi người đó có khoản `pending` ở vùng đó hoặc là GĐ Vùng cũ của vùng. Upsert `regional_payee_banks`, audit `regional_director.payee_bank` (diff che STK còn 4 số cuối). Dòng khoản `noBank` có nút "Nhập tài khoản nhận" mở dialog dùng lại `regional-bank-fields.tsx`.

### B8 — Tự thu hồi khi khóa / xóa TK

5. `RegionalLockEffects.onLocked(userIds)`: chỉ xét người đang là GĐ Vùng và **khóa vô thời hạn** (`locked_until IS NULL` sau khi khóa, Q-V46-821-3); khóa tạm (moderation N ngày) **không** thu hồi. `user.deleted` luôn thu hồi. Gọi `revokeBySystem` → `revokeWithin` với tác nhân hệ thống: `actor_id = 'system'`, `actor_role = 'system'` (cột NOT NULL giữ nguyên; giá trị hệ thống ghi rõ trong code), `reason = 'locked' | 'deleted'`.
6. Hệ quả giống thu hồi tay: phí theo BR-462 (`RegionalFeeService.leave`), vùng trống → khoản mới 100% Media Soft (D-121), **khoản đã ghi trước thu hồi vẫn chi cho người đó** (GDV-R05, Q-V46-821-4), tài khoản nhận chuyển sang `regional_payee_banks` (SPEC 1), audit + outbox `regional_director.revoked { reason }`.
7. Idempotent: người không còn là GĐ Vùng → bỏ qua. Lỗi khóa hàng `NOWAIT` → để relay outbox thử lại (không nuốt lỗi).
8. **Mở khóa không khôi phục** vai trò (D-55, Q-V46-821-3); Admin bổ nhiệm lại nếu muốn (kiểm điều kiện bổ nhiệm như thường). Mail / thông báo thu hồi vẫn gửi, câu lý do: "do tài khoản bị khóa" / "do tài khoản đã bị xóa"; TK đã xóa → không gửi mail, chỉ ghi lịch sử.

### B9 — Bút toán đảo

9. **Không code.** Không có luồng hoàn phí sau đối soát (NR-R01, máy trạng thái phí không có đảo, affiliate `void` đã bỏ D-110) nên không phát sinh bút toán đảo. Ghi completion + `V4.6-DEBT.md` B9 = đóng (phần "UI nhập tài khoản nhận" làm ở P0). Khi nào có chức năng hoàn phí thì cần D-xx mới định nghĩa đảo (Q-V46-821-1).

### B7 — QR trong mail, nhắc Gọi vốn

10. **Ảnh QR:** thêm dependency `qrcode` (thuần JS, sinh PNG tại server, không gọi dịch vụ ngoài — D-96; Q-V46-821-5). `vietqr-image.ts` nhận payload EMVCo (đã có `vietQrPayload`) → PNG 320 × 320, mức sửa lỗi M.
11. **Phát ảnh bằng URL của chính hệ thống** (Q-V46-821-6): `GET /v1/public/mail-qr/:token.png`, `token` = base64url(payload rút gọn: loại `fee` | `fundraising`, id kỳ phí / gói, hạn) + HMAC-SHA256 bằng `MAIL_QR_SECRET` (env mới, zod bắt buộc ở production, ≥ 32 ký tự). Server kiểm chữ ký + hạn 30 ngày, **dựng lại** payload từ DB (số tiền / nội dung CK hiện hành), trả PNG `Cache-Control: private, max-age=86400`; sai / hết hạn / kỳ phí đã thanh toán → 404. Throttle 60 / phút / IP. Không lộ dữ liệu ngoài những gì đã có trong mail.
12. Mail nhắc gia hạn mốc D1: thêm `<img src="{PORTAL_URL hoặc API public}/v1/public/mail-qr/<token>.png" width="200" alt="Mã VietQR chuyển khoản">` phía trên khối chữ; **giữ nguyên** khối chữ (ngân hàng, STK, chủ TK, `OPCHUB …`) làm dự phòng khi ứng dụng mail chặn ảnh. Mốc D30 / D7 không đổi.
13. **Gọi vốn** (Q-V46-821-7): giữ nhắc T-14 hiện có, bổ sung vào mail: tên dự án, ngày hết hạn, giá gia hạn hiện hành và câu "Bạn có thể gia hạn sau khi gói hết hạn" (đúng D-106 — **không** kèm QR vì chưa thanh toán được). Khi job chuyển gói sang `expired`, gửi **một** mail mới `fundraising_expired` (chống trùng theo gói) gồm thông tin chuyển khoản đúng BR-GV-04 + ảnh QR + link màn gia hạn; kèm thông báo trong app. Không thêm mốc 30 / 7 / 1, không thêm cài đặt Admin hay dòng Gọi vốn ở danh sách "Sắp hết hạn".

### B10 — Logger client, affiliate của vùng

14. `lib/logger.ts` (Portal + Admin): `logger.error(scope, error, context?)` / `logger.warn(...)`: gọi `reportError` (giữ hành vi cũ) và gửi `navigator.sendBeacon('/v1/client-logs', …)`; tối đa 10 bản ghi / phút / tab (bộ đếm trong bộ nhớ). Payload: `{ app, scope, message (≤ 500), name, digest?, path (bỏ query), at }` — **không** stack đầy đủ, không body request, không dữ liệu người dùng (Q-V46-821-8). Thay `reportError` trong `use-my-region.ts`; `app/error.tsx` gọi `logger.error('app', error)`.
15. `POST /v1/client-logs` (`@Public`, throttle 20 / phút / IP, zod `.strict()`): ghi qua logger server mức `warn` với nhãn `client`, kèm `userId` nếu có phiên; trả 204. Không lưu DB. Không Sentry (Q-V46-821-8).
16. **Affiliate của vùng:** `GET /v1/me/gdv/affiliates?cursor&limit` (chỉ GĐ Vùng đương nhiệm của vùng), keyset theo đúng thứ tự đang hiển thị (+ `id`), 50 / trang; `GET /v1/me/gdv` giữ 50 dòng đầu + `more` như cũ. Portal: thay "+ {n} affiliate khác" bằng nút "Xem thêm ({n})" tải trang tiếp; nút "Tải CSV".
17. CSV `GET /v1/me/gdv/affiliates.csv`: cột như bảng đang hiển thị (họ tên, mã TV, tỉnh, các cột số liệu hiện có) — **không** SĐT / email (Q-V46-821-9); BOM + `csvSafeText`; lô keyset 1.000; giới hạn 20.000 dòng. Ghi `audit_logs` `regional.affiliates.export` (tác nhân là thành viên GĐ Vùng, tag `affiliate`). Giới hạn 24 tháng của bảng tháng giữ nguyên (Q-V46-821-10).

### Validation

- Mọi body / query / token mới parse zod trong `packages/shared`. `regionalBankSchema` sẵn có. Token QR: base64url, độ dài tối đa 512, kiểm HMAC thời gian hằng.
- `MAIL_QR_SECRET` trong `.env.example` + zod env (production bắt buộc).

### Error Handling

| Trường hợp | Xử lý |
|---|---|
| Chi trả GĐ Vùng mới chưa có tài khoản | 409 "chưa cập nhật tài khoản nhận" (hiện có) |
| Nhập tài khoản cho người không liên quan vùng | 404 |
| Thu hồi tự động gặp `NOWAIT` | Lỗi → relay outbox thử lại |
| Người bị khóa không còn là GĐ Vùng | Bỏ qua (idempotent) |
| Token QR sai / hết hạn / đã thanh toán | 404, không lộ lý do |
| Sinh PNG lỗi | Mail vẫn gửi với khối chữ dự phòng (ảnh không có), log warn |
| Client log vượt throttle / payload sai | 429 / 400, không ảnh hưởng người dùng |
| CSV vượt 20.000 dòng | Cắt + dòng cuối ghi chú "Đã cắt tại 20.000 dòng" |

## ACCEPTANCE CRITERIA

- **P0 tài khoản:** Given vùng Bắc có GĐ A với tài khoản X When Admin thu hồi A và bổ nhiệm B Then vùng không còn tài khoản; chi trả cho B → 409 tới khi Admin nhập tài khoản Y; khoản chờ của A vẫn chi vào X (từ `regional_payee_banks`). Test: `regional-payee-bank.int.spec.ts` › `new director never inherits previous payout account`.
- **Nhập tài khoản cho người đã thu hồi:** Given A thu hồi, không có ảnh chụp tài khoản, còn khoản `pending` When Admin nhập tài khoản Then chi trả thành công, audit `regional_director.payee_bank` che STK; người không liên quan → 404. Test: cùng file; unit dialog.
- **Tự thu hồi khi khóa:** Given A là GĐ Vùng When Admin khóa vô thời hạn Then A bị thu hồi (sự kiện `reason = locked`, tác nhân `system`), phí theo BR-462, khoản mới của vùng 100% Media Soft, khoản cũ vẫn chi; khóa tạm 7 ngày → không thu hồi; outbox giao lại → không lỗi, không thu hồi lần 2; mở khóa → không khôi phục. Test: `regional-lock-revoke.int.spec.ts`.
- **Tự thu hồi khi xóa TK:** `user.deleted` của GĐ Vùng → thu hồi `reason = deleted`, không gửi mail. Test: cùng file.
- **QR mail:** Given kỳ phí còn nợ When gửi nhắc D1 Then mail có `<img>` trỏ `/v1/public/mail-qr/<token>.png` + khối chữ; URL trả PNG giải mã ra đúng payload EMVCo hiện hành; token sửa 1 ký tự / hết hạn / kỳ đã trả → 404. Test: `mail-qr.int.spec.ts`; `vietqr-image.spec.ts`; `mail-qr-token.spec.ts`.
- **Gọi vốn:** Given gói còn 14 ngày Then mail nhắc có ngày hết hạn + giá gia hạn, không QR; When job chuyển `expired` Then đúng 1 mail `fundraising_expired` có nội dung CK `OPCHUB … GV…` + QR; chạy job lại không gửi thêm. Test: `fundraising-expired-mail.int.spec.ts`.
- **Logger:** Given lỗi tải `/me/gdv` When hook báo lỗi Then `reportError` được gọi và beacon gửi payload không có query / stack đầy đủ; > 10 lỗi / phút chỉ gửi 10. Server nhận hợp lệ → 204 + log `client`; payload thừa trường → 400. Test: `logger.spec.ts`; `client-log.int.spec.ts`.
- **Affiliate của vùng:** Given vùng có 130 affiliate Then trang đầu 50, "Xem thêm (80)" tải đủ 130 không trùng / sót; CSV 130 dòng + BOM, không SĐT / email, có audit; người không phải GĐ Vùng → 403. Test: `my-region-affiliates.int.spec.ts`; `my-region-affiliates.spec.tsx`.
- **Không hồi quy:** int `regional-director/*`, `regional-share*`, `renewal-*`, `fundraising-*`, `account lock` xanh.

## CONSTRAINTS

- DO NOT:
  - tự sửa tài khoản nhận của GĐ Vùng đương nhiệm khi dọn dữ liệu (chỉ báo cáo để owner kiểm)
  - đổi công thức chia / trạng thái `regional_shares`, thêm dòng âm, thêm luồng hoàn phí (B9 đóng)
  - thu hồi khi khóa tạm; khôi phục vai trò khi mở khóa (D-55)
  - gọi dịch vụ QR / ảnh ngoài (img.vietqr.io…), nhúng QR bằng data URI (bị nhiều ứng dụng mail chặn)
  - gửi QR thanh toán Gọi vốn trước khi gói hết hạn (D-106)
  - thêm Sentry / dịch vụ log ngoài; lưu client log vào DB; gửi PII trong client log hoặc CSV
  - query trong vòng lặp; vượt trần file; `console.*`
  - release `main` trước khi TIP này merge vào `dev` (D-139)
- REUSE: `revokeWithin`, `RegionalFeeService.leave`, `LockEffectsRegistry` + mẫu `group-lock.effects.ts`, `regionalBankSchema` + `regional-bank-fields.tsx`, `vietQrPayload` + `bankTransferOf`, `FundraisingSchedulerService`, `toCsv` / `csvSafeText`, audit + outbox.
- SKIP:
  - B6 (SePay / Casso / VCB thật), B17, B18, B2 còn lại
  - mốc nhắc Gọi vốn 30 / 7 / 1 + cài đặt Admin + danh sách "Sắp hết hạn" cho Gọi vốn
  - CID / tệp đính kèm trong mail
  - soát 9 bản dịch AI (việc tay)

## Câu hỏi — **đã chốt theo mặc định** (owner, 08/11/2026: "chốt mặc định hết"; ghi `questions.md` › TIP-V46-821)

- **Q-V46-821-1 Bút toán đảo (B9).** Mặc định: **đóng, không code** — hệ thống không có hoàn phí (NR-R01) nên không có gì để đảo.
- **Q-V46-821-2 Sửa lỗi tài khoản nhận.** Mặc định: thu hồi thì chuyển tài khoản sang người cũ và xóa khỏi vùng; GĐ Vùng mới phải được Admin nhập tài khoản trước khi chi. Dữ liệu đang có: chỉ báo cáo vùng nghi thừa hưởng để owner kiểm tay, không tự sửa.
- **Q-V46-821-3 Khóa nào thì tự thu hồi.** Mặc định: chỉ khóa **vô thời hạn** và xóa TK; khóa tạm (vi phạm N ngày) không thu hồi; mở khóa không khôi phục.
- **Q-V46-821-4 Khoản chờ chi của GĐ Vùng bị khóa.** Mặc định: vẫn chi theo GDV-R05 (đã phát sinh trước khi thu hồi).
- **Q-V46-821-5 Dependency mới `qrcode`.** Mặc định: đồng ý (thuần JS, sinh PNG tại server, không gọi API ngoài — D-96).
- **Q-V46-821-6 Cách đưa QR vào mail.** Mặc định: ảnh từ URL của hệ thống có chữ ký + hạn 30 ngày; luôn giữ khối chữ dự phòng.
- **Q-V46-821-7 Nhắc Gọi vốn.** Mặc định: giữ T-14 (thêm ngày hết hạn + giá), thêm mail "đã hết hạn" có QR; không thêm mốc / cài đặt.
- **Q-V46-821-8 Logger client.** Mặc định: logger mỏng gửi về server của mình, không Sentry, không PII, giới hạn tần suất.
- **Q-V46-821-9 CSV affiliate của vùng.** Mặc định: chỉ họ tên, mã TV, tỉnh và số liệu đang hiện; không SĐT / email; có ghi nhật ký xuất.
- **Q-V46-821-10 Giới hạn 24 tháng ở bảng tháng.** Mặc định: giữ nguyên.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-821-finance-region`; chỉ sửa file trong **Files touched** (ngoài danh sách ghi lý do).
- [ ] Làm **P0 trước** và commit riêng (sửa lỗi tiền), có test tái hiện đỏ trước khi sửa.
- [ ] Migration `--create-only`, sửa SQL tay, có `down.sql`; up → down → up trên DB test riêng owner duyệt; kiểm `TEST_DATABASE_URL` trỏ DB riêng trước khi chạy int.
- [ ] Báo cáo dọn dữ liệu P0: số vùng nghi thừa hưởng (không in STK).
- [ ] EXPLAIN: trang affiliate keyset, CSV lô, tìm GĐ Vùng theo nhiều `user_id` — ghi `TIP-V46-821-query-plans.md`.
- [ ] Mọi AC có test PASS, ghi tên test + kết quả từng cái.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`; e2e MSW không tụt; chép output thật.
- [ ] Luật liên quan:
  - **Luật 7:** thu hồi chỉ qua `revokeWithin` (cập nhật có điều kiện theo `version`)
  - **Luật 8:** tự thu hồi đi qua outbox / lock effects idempotent, cùng transaction với phí + sự kiện
  - **Luật 9 / 10:** tiền số nguyên VND; audit nhập tài khoản nhận + xuất CSV
  - **Luật 11 / 12:** QR sinh tại server, không API ngoài; `MAIL_QR_SECRET` chỉ trong env, có trong `.env.example` + zod
- [ ] Dependency `qrcode` ghi lý do trong completion (luật thêm dependency).
- [ ] Trần file BE 600 / FE 400; không `any` / `@ts-ignore` / `console.*`.
- [ ] Ghi Q-V46-821-1 → 10 vào `questions.md`; cập nhật `V4.6-progress.md` dòng #20, `V4.6-DEBT.md` B7 → B10.
- [ ] Commit `git commit -- <paths>` (cấm `git add -A`); `git status --short` sạch; push; PR `base: dev`; không tự merge. Completion có **git commit SHA**. Release `main` do owner quyết sau khi TIP này merge.

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ; Files touched mức file (route Admin GĐ Vùng nằm trong controller hiện có — builder ghi file thật)
- [x] Context có dòng code cho lỗi tài khoản nhận, luồng khóa, ledger, mail, Gọi vốn, logger, affiliate vùng
- [x] SPEC 1 → 17; validation; bảng lỗi
- [x] AC Given / When / Then có tên test
- [x] Constraints trích D-55 / D-96 / D-106 / D-120 / D-121 / NR-R01 / GDV-R05 / luật 7 → 12
- [x] Parallel: sequential, TIP cuối đợt D-139
- ⚠️ Gap:
  - P0 là lỗi tiền đang có trên production (từ release #93 / 801–803): nếu đã từng thu hồi rồi bổ nhiệm lại ở production, owner nên kiểm tài khoản nhận của GĐ Vùng hiện tại ngay, không chờ release.
  - Ảnh QR qua URL vẫn bị ứng dụng mail chặn ảnh mặc định ở một số nơi; khối chữ dự phòng luôn có.
  - Prototype / đặc tả không có quy tắc nhắc Gọi vốn, logger client, CSV vùng → phần thêm theo B7 / B10; owner duyệt ảnh trong PR (D-134).
