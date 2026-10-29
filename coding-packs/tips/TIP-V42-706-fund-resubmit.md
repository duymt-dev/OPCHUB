# TIP-V42-706: Gọi vốn — gia hạn `fund.r` chỉ khi hết hạn; bị từ chối → bổ sung hồ sơ → duyệt lại (không thu lần hai)

## HEADER
- TIP-ID: TIP-V42-706
- Project: OPCHUB
- Module: project (Gọi vốn), notification, Portal fundraising / projects, MSW
- Priority: P1
- Depends on: TIP-V42-705 (nhánh chưa merge → xếp chồng)
- Estimated: M
- REQ / D: REQ-611, D-106, D-113 (F6), §27.5b (rejected → "chủ dự án bổ sung hồ sơ"; "Không hoàn lại kể cả khi bị từ chối; Admin hỗ trợ hoàn tất
  hồ sơ để duyệt lại"), BR-GV-01
- **Files touched:**
  - Shared: `api-domains/fundraising.ts` (`reviewNote` trong `fundraisingSchema`), mock-data `domains/fundraising.ts` (D-106 chỉ khi hết hạn,
    từ chối chặn mua lại, `resubmitMockFundraising`, cầu cookie theo `rev`)
  - Server: `project/domain/fundraising-status.ts` (bước `resubmit: rejected → pending_review`), `repositories/fundraising.repository.ts`
    (`reviewNote` trong select, `latest`), `services/fundraising.service.ts` (`start` chặn khoản bị từ chối; `resubmit`),
    `controllers/fundraising.controller.ts` (`POST /me/fundraisings/:id/resubmit`), `notification/services/fundraising-notify.handler.ts`
    (id thông báo theo lần thẩm định)
  - Portal: `features/fundraising/{api.ts, index.ts, components/fund-rejected.tsx (create), hooks/use-resubmit-fundraising.ts (create)}`,
    `features/projects/{components/mine-screen.tsx, components/fundraising-host.tsx, model.ts}`, `mocks/handlers/fundraising.ts`,
    `messages/*/projects.json`
  - Test: `apps/server/test/project/fundraising-resubmit.int.spec.ts` (create), `apps/portal/src/mocks/fundraising-handlers.spec.ts`,
    e2e `behavior/fundraising.spec.ts`
- **Parallel-safe with:** sequential — chồng trên 705 (cùng `fundraising.service.ts`, popup Gọi vốn).

## CONTEXT
- D-106 đã làm ở V42-701 (server: còn hạn → 409, hết hạn → giá `fund.r`); MSW còn luật cũ D-82 (mua sớm khi còn ≤ 14 ngày) → sửa cho khớp server.
- Hiện tại khoản bị từ chối là trạng thái cuối: chủ dự án chỉ có thể mua khoản mới (trả tiền lần hai) — trái D-113 / §27.5b.
- Prototype v4.2 `_fundDecide`: từ chối → `fundSt = 'rejected'`, thông báo "Gói Gọi vốn bị từ chối: {dự án} · Admin sẽ liên hệ để hoàn tất hồ sơ.";
  không có nút gửi lại (D-113 bổ sung nghiệp vụ, D-95: nút prototype không có vẫn làm đúng nghiệp vụ).

## APPLICABLE STANDARDS
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md) — transition qua domain, cập nhật có điều kiện
- [frontend/data-state](../standards/frontend/data-state.md)
- [testing/testing](../standards/testing/testing.md)

## SPECIFICATIONS
### Business Rules
1. Bước mới `resubmit: { from: 'rejected', to: 'pending_review' }` — cập nhật có điều kiện (luật 7); giữ nguyên `amount`, `code`, `paidAt`,
   `paymentTransactionId` (không thu lần hai, không tạo khoản mới, hoa hồng chỉ ghi khi duyệt như cũ).
2. `POST /me/fundraisings/:id/resubmit` (chủ khoản, dự án chưa xoá): rejected → pending_review, trả `Fundraising`. Không phải chủ / không có → 404;
   không ở trạng thái bị từ chối → 409. Idempotency-Key bắt buộc (như transfer-confirm).
3. `POST /projects/:id/fundraising`: khoản gần nhất (không legacy) của dự án đang **bị từ chối** → 409 "Gói Gọi vốn bị từ chối · bổ sung hồ sơ dự án
   rồi gửi duyệt lại" (không mở khoản thu tiền mới).
4. `fundraisingSchema.reviewNote` (ghi chú Admin khi thẩm định; null nếu không có) để chủ dự án đọc lý do.
5. Thông báo thẩm định: id theo từng lần (`fundraising:{decision}:{id}:{reviewedAt}`) — lần từ chối thứ hai vẫn tới chủ dự án.
6. Portal › Dự án của tôi: dòng dự án có khoản bị từ chối → khung đỏ "Gói Gọi vốn bị từ chối" (+ lý do nếu có), hướng dẫn "Sửa dự án để bổ sung hồ sơ,
   rồi gửi duyệt lại — không thu phí lần hai", nút "Gửi duyệt lại Gọi vốn" → toast "Đã gửi lại hồ sơ Gọi vốn · chờ Admin thẩm định".
   Popup Gọi vốn: dự án bị từ chối không nằm trong danh sách chọn; gửi dự án (sửa) có gọi vốn khi khoản đang bị từ chối không mở popup thanh toán.
7. Admin: khoản gửi lại hiện lại chip "Gọi vốn · chờ duyệt" + Duyệt / Từ chối (không đổi UI).

### Validation
- Param `id` chuỗi; body rỗng; header `Idempotency-Key`.

### Error Handling
- 404 / 409 như trên; Portal toast thông điệp server.

## ACCEPTANCE CRITERIA
- Given khoản bị từ chối When chủ gửi lại Then `pending_review`, cùng mã GV + số tiền, không có khoản mới; gửi lại lần nữa → 409; người khác → 404 (int).
- Given khoản bị từ chối When chủ mở thanh toán dự án đó Then 409, không tạo khoản (int).
- Given khoản gửi lại When Admin từ chối lần hai Then chủ nhận thêm một thông báo (int); duyệt → `active` + hoa hồng (int).
- Given khoản đang gọi vốn còn ≤ 14 ngày When mở thanh toán (MSW) Then 409 như server (D-106) (unit MSW).
- Given Admin từ chối When chủ mở Dự án của tôi → "Gửi duyệt lại Gọi vốn" Then toast + Admin thấy lại "Gọi vốn · chờ duyệt" (e2e MSW).

## CONSTRAINTS
- DO NOT: thu tiền lần hai, tạo khoản mới khi bị từ chối, hằng số giá.
- REUSE: `repo.step`, `IdempotencyService`, cầu cookie `opchub-mock-gv`.
- SKIP: lý do bắt buộc khi Admin từ chối Gọi vốn (prototype làm ngay, không hỏi lý do — giữ).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng Files touched; mỗi AC có test, ghi số thật
- [ ] Đổi trạng thái chỉ qua `FUNDRAISING_TRANSITIONS` + `WHERE status = from` (luật 7)
- [ ] FE ≤ 400 dòng / file; không import nội bộ feature khác (depcheck)
