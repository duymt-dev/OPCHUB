# TIP-V2-107: Trao đổi nhà đầu tư một luồng hai phía + thông báo, chuyển trạng thái có điều kiện (IV-R01…R03, NA-11, BUG-006, BUG-007, TD-024 phần NĐT)

## HEADER
- TIP-ID: TIP-V2-107 · Project: OPCHUB · Module: investor + notification (loại `invest`) + Portal dự án + Admin Nhà đầu tư · Priority: P0 · Depends on: TIP-V2-101 (outbox tin cậy) · Estimated: L (12h)
- **Files touched:**
  - DB: `packages/db/prisma/schema/investor.prisma` (modify: `InvestorAdminNote` → `InvestorComment` `@@map("investor_comments")`, thêm `interestId String? @map("interest_id")`; xoá `InvestorThreadMessage`); `packages/db/prisma/migrations/<ts>_investor_single_thread/migration.sql` — **migration do agent chính tạo, `--create-only` + review SQL**
  - Seed: `packages/db/seed/demo/investor.ts`, `packages/db/seed/demo/reset.ts` (modify: bảng mới)
  - Shared: `packages/shared/src/outbox/events.ts` (modify — chỉ thêm `investor.admin_replied`), `packages/shared/src/api-domains/settings.ts` (modify: `NOTIFICATION_TYPES` thêm `'invest'`), `packages/shared/src/api-domains/investors-admin.ts` (modify: `INVESTOR_TRANSITIONS`, bỏ comment Q-G5c-3), `packages/ui/src/app-shell/notification-bell.tsx` (modify: `NotificationKind` + `KIND.invest`)
  - Server investor: `apps/server/src/modules/investor/domain/interest-status.ts` + `interest-status.spec.ts` (create), `repositories/interest.repository.ts`, `repositories/investor-admin.repository.ts`, `services/interest.service.ts`, `services/investor-admin.service.ts` (modify), `services/investor-notify.handler.ts` (create), `investor-core.module.ts`, `index.ts` (modify: import `NotificationCoreModule`, export handler)
  - Worker: `apps/server/src/worker/processors/investor.processor.ts` (create), `apps/server/src/worker/worker-app.module.ts` (modify — chỉ thêm `InvestorCoreModule`, `InvestorProcessor`)
  - Portal: `apps/portal/src/features/projects/components/funding-box.tsx` (modify: luồng chung, nhận diện người gửi theo `fromInvestor`), `apps/portal/messages/vi/projects.json` (không đổi khoá — xác nhận copy)
  - Admin: `apps/admin/src/features/investors/components/investor-drawer.tsx` (modify: khoá bước lùi), `apps/admin/src/features/investors/model.ts` + `model.spec.ts` (modify: `canStep`)
  - MSW: `packages/shared/src/mock-data/domains/investors-admin.ts`, `ops-content.ts` (modify: `myThreads`/`postThreadMessage`/`addInvestorComment` dùng chung một kho bình luận theo nhà đầu tư; `setInvestorStatus` có điều kiện 409), `packages/shared/src/mock-data/domains/store.ts` (modify: bỏ `threadMessages`), `apps/admin/src/mocks/g5c-handlers.spec.ts`, `apps/portal/src/mocks/domain-handlers.spec.ts` (modify)
  - Test: `apps/server/test/investor/investors.int.spec.ts` (modify), `apps/server/test/investor/investor-thread.int.spec.ts` (create), `apps/server/test/contract/investor.int.spec.ts` (modify nếu shape đổi), `e2e/behavior/admin-investors.spec.ts` (modify), `e2e/behavior/investor-thread.spec.ts` (create)
- **Parallel-safe with:** TIP-V2-102, 103, 105, 110, 111, 112, 114. `sequential, after TIP-V2-101`. `sequential, shares outbox/events.ts + worker-app.module.ts with TIP-V2-104` (chỉ thêm dòng, giữ `.wire-lock`). `sequential, shares use-investors.ts with TIP-V2-106` (107 không sửa `use-investors.ts`; 106 sửa toast). `sequential, shares investor-admin.service.ts with TIP-V2-109` (109 sửa audit export dòng 156).
- **Phase / nhánh:** V2-P1, `feature/V2-P1-foundation-fixes` (nhánh con `feature/V2-P1-107-investor-thread`)

## CONTEXT
- Đặc tả §22.4 IV-R01 (Admin › Nhà đầu tư › Chi tiết "Trao đổi với nhà đầu tư"; **mỗi lần Admin gửi** NĐT nhận thông báo in-app "OPC Hub đã phản hồi quan tâm đầu tư của bạn"), IV-R02 (Portal › chi tiết dự án đã gửi quan tâm: khối "Trao đổi với OPC Hub" **cùng luồng**, NĐT trả lời, Enter để gửi), IV-R03 (tin Admin đầu tiên: Đã gửi → Đang trao đổi); §8.13 NA-11 (gộp NĐT, tổng vốn = tổng các lần, Admin chốt Đã kết nối; dữ liệu `investor_interest`, `investor_comment`); QT-10 ("Luồng trao đổi dùng chung giữa Admin và nhà đầu tư"); §9 Đã gửi → Đang trao đổi → Đã kết nối; §12 "Admin trả lời nhà đầu tư → Nhà đầu tư, in-app, trên trang dự án"; AT-IV01; UAT-20; LK-07.
- Prototype: luồng khoá theo nhà đầu tư (`key = contact|org`), cùng một luồng hiện ở mọi dự án NĐT đã quan tâm; Admin gửi → `notify({type:'invest', title:'OPC Hub đã phản hồi quan tâm đầu tư của bạn', body: 90 ký tự đầu})`; Portal gửi → toast "Đã gửi tới Admin OPC Hub".
- Audit: BUG-006 (Admin ghi `investor_admin_notes` theo `investor_key`, Portal đọc `investor_thread_messages` theo id quan tâm → hai phía không thấy nhau), BUG-007 (`investor-admin.repository.ts:109-112` `updateMany({ where: { investorKey }, data: { status } })` lùi được connected → sent), TD-024/TD-025, M4 #1; `e2e/audit/uat-interaction.audit.ts:260`.
- Code: `investor-admin.service.ts:97-142` (setStatus, comments, comment), `interest.service.ts:96-147` (threads, send — chủ dự án trả lời cũng chuyển trạng thái), `interest.repository.ts:99-150`, `project-read.service.ts:125-130` (`myInterest.threadKey = id quan tâm`), Portal `funding-box.tsx:58-110` (so `senderName === me`). Mẫu thông báo: `NotificationService.notify` (`notification/services/notification.service.ts:72`).

## APPLICABLE STANDARDS
[nestjs-modules](../standards/backend/nestjs-modules.md) (luật 7 transition, luật 8 outbox) · [prisma-migrations](../standards/database/prisma-migrations.md) · [query-indexing](../standards/database/query-indexing.md) · [api-conventions](../standards/backend/api-conventions.md) (409 sai trạng thái) · [data-state](../standards/frontend/data-state.md) · [domain-glossary](../standards/global/domain-glossary.md) · [testing](../standards/testing/testing.md)

## TASK
Gộp hai mô hình thành **một luồng bình luận theo nhà đầu tư** (`investor_comments`, khoá `investor_key`) dùng chung cho Admin và Portal; mỗi tin Admin gửi tạo thông báo in-app cho NĐT qua outbox; tin Admin đầu tiên chuyển Đã gửi → Đang trao đổi; đổi trạng thái chỉ đi tiến theo §9 với cập nhật có điều kiện.

## SPECIFICATIONS
### Business Rules
1. **Một luồng (BUG-006, IV-R02)**: bảng `investor_comments(id, investor_key, interest_id NULL, author_id NULL, from_investor, body, created_at)`, index `(investor_key, created_at)`. Admin `GET/POST /admin/investors/:key/comments` và Portal `GET /me/investor-thread`, `POST /investor-thread/:key/messages` cùng đọc/ghi bảng này. `:key` ở Portal = **bất kỳ id quan tâm nào của chính người gọi** → server tra `investor_key`; không phải của mình → 404.
2. **Hợp đồng Portal giữ shape**: `GET /me/investor-thread` trả `items` gồm **một** phần tử cho người gọi (nếu có quan tâm): `key` = `investor_summaries.first_interest_id`, `projectId/projectName` = của quan tâm đầu tiên, `counterpartName` = "Admin OPC Hub", `messages` = toàn bộ luồng. `myInterest.threadKey` ở chi tiết dự án giữ nguyên (= id quan tâm của dự án đó — hợp lệ theo rule 1, không sửa `project-read.service.ts`); Portal `funding-box.tsx` lấy luồng là phần tử duy nhất của `/me/investor-thread` (không so `key === threadKey`), gửi tin bằng `threadKey` của dự án đang xem. `senderName`: NĐT → họ tên NĐT; Admin → "Admin OPC Hub"; tác giả khác (tin cũ chủ dự án đã chuyển) → họ tên tác giả.
3. **Ai được gửi**: NĐT (chủ của `investor_key`) và Admin (`p.pub`). Chủ dự án **không** còn gửi vào luồng (prototype: chủ dự án chỉ thấy danh sách NĐT quan tâm) → `POST` của người khác = 404.
4. **Thông báo (IV-R01, AT-IV01)**: `InvestorAdminService.comment` ghi bình luận + outbox `investor.admin_replied { investorKey, commentId }` cùng transaction. Consumer `InvestorNotifyHandler.adminReplied`: 1 query đọc `user_id` + `first_interest_id → project_id` + body → `NotificationService.notify([{ userId, type: 'invest', title: 'OPC Hub đã phản hồi quan tâm đầu tư của bạn', body: body ≤ 90 ký tự (bỏ thẻ), link: '/projects/<projectId>' }])`. Mỗi tin Admin = một thông báo. Tin NĐT không tạo thông báo (§12 không yêu cầu).
5. **Trạng thái (BUG-007, IV-R03, §9)** — `domain/interest-status.ts`: `INVESTOR_TRANSITIONS = { sent: ['in_discussion'], in_discussion: ['connected'], connected: [] }`, `canTransition(from, to)`. 
   - Tin Admin đầu tiên: `UPDATE investor_interests SET status='in_discussion' WHERE investor_key=$1 AND status='sent'` + đồng bộ `investor_summaries` có điều kiện (giữ `advanceSent`).
   - `PATCH /admin/investors/:key/status {status}`: đọc trạng thái tổng hợp hiện tại `from`; `!canTransition(from, to)` → 409 "Không thể chuyển trạng thái từ <nhãn from> sang <nhãn to>"; hợp lệ → `UPDATE … WHERE investor_key=$1 AND status=$from` cho interests + summary; summary cập nhật 0 dòng (bị đổi song song) → 409. Audit `investor.status` `diff {from,to}`.
6. **Admin UI**: drawer khoá các bước không hợp lệ theo `INVESTOR_TRANSITIONS` (nút lùi/nhảy cóc `disabled`, `aria-disabled`); 409 hiển thị thông điệp server (toast dùng `e.message` — phụ thuộc TIP-V2-106, nếu chưa có thì sửa tối thiểu trong drawer).
7. **Portal UI**: khối "Trao đổi với OPC Hub" hiện ở mọi dự án NĐT đã gửi quan tâm, cùng nội dung; bong bóng phải = `fromInvestor`, trái = Admin; Enter gửi, Shift+Enter xuống dòng; gửi xong toast "Đã gửi tới Admin OPC Hub". Thông báo `invest` bấm → `/projects/<id>`.
8. `commentCount` Admin = số dòng `investor_comments` của `investor_key` (subquery hiện có đổi tên bảng).

### Data / Migration (do agent chính tạo, `--create-only` + review SQL)
- `ALTER TABLE investor_admin_notes RENAME TO investor_comments;` đổi tên index/PK tương ứng; `ADD COLUMN interest_id text NULL`.
- Chuyển dữ liệu: `INSERT INTO investor_comments (id, investor_key, interest_id, author_id, from_investor, body, created_at) SELECT m.id, i.investor_key, i.id, m.author_id, m.from_investor, m.body, m.created_at FROM investor_thread_messages m JOIN investor_interests i ON i.id = m.thread_key ON CONFLICT (id) DO NOTHING;` rồi `DROP TABLE investor_thread_messages;`.
- Seed demo: tin mở đầu của NĐT (message của quan tâm) ghi vào `investor_comments` (`from_investor = true`, `interest_id`); giữ 2 bình luận mẫu của Nguyễn Hoàng Nam.

### Error Handling
- 404 key không tồn tại / không thuộc người gọi; 409 transition sai; 400 body rỗng (zod sẵn có).

## ACCEPTANCE CRITERIA
- Given NĐT đã gửi quan tâm dự án P, When Admin gửi bình luận ở Nhà đầu tư › Chi tiết, Then NĐT có thông báo "OPC Hub đã phản hồi quan tâm đầu tư của bạn" và thấy tin trong khối "Trao đổi với OPC Hub" ở trang P (AT-IV01, IV-R01, IV-R02, BUG-006).
- Given NĐT trả lời trên trang P, Then Admin thấy tin ở cùng luồng trong drawer (UAT-20, LK-07).
- Given NĐT quan tâm 2 dự án, Then luồng ở cả 2 trang dự án giống nhau, Admin thấy 1 dòng NĐT với tổng vốn cộng dồn (NA-11).
- Given trạng thái Đã gửi, When Admin gửi tin đầu tiên, Then Đang trao đổi; tin thứ hai không đổi trạng thái (IV-R03).
- Given Đã kết nối, When `PATCH status=sent`, Then 409, trạng thái giữ nguyên (BUG-007, §9); Given Đã gửi, When `status=connected`, Then 409; Given Đang trao đổi, When `connected`, Then 200 + audit `{from,to}`.
- Given chủ dự án hoặc người ngoài gửi vào luồng của NĐT, Then 404 (IV-R02).
- Given relay chạy lại `investor.admin_replied`, Then chấp nhận trùng thông báo theo quy ước `NotificationService` (không phải tiền) — ghi rõ trong test.

## TESTS BẮT BUỘC
- Unit `apps/server/src/modules/investor/domain/interest-status.spec.ts`: `BUG-007 §9 chỉ đi tiến sent→in_discussion→connected`, `chặn lùi và nhảy cóc`.
- Int `apps/server/test/investor/investor-thread.int.spec.ts`: `AT-IV01 REQ-371 Admin gửi → NĐT nhận thông báo invest + thấy tin ở /me/investor-thread`, `UAT-20 REQ-372 NĐT trả lời → Admin thấy cùng luồng`, `REQ-373 tin Admin đầu tiên → Đang trao đổi, tin sau không đổi`, `REQ-211 NĐT 2 dự án → một luồng, tổng vốn cộng`, `REQ-372 chủ dự án / người ngoài gửi → 404`.
- Int `apps/server/test/investor/investors.int.spec.ts`: sửa test "trao đổi: chủ dự án … trả lời" theo rule 3; thêm `BUG-007 PATCH lùi → 409, nhảy cóc → 409, tiến → 200 + audit diff`.
- Unit Admin `model.spec.ts`: `BUG-007 canStep khoá bước lùi`. MSW `g5c-handlers.spec.ts`: `BUG-007 MSW đổi trạng thái lùi → 409`; Portal `domain-handlers.spec.ts`: luồng chung.
- E2E (msw + server, cùng assertion — D-63): `admin-investors.spec.ts` sửa test drawer: sau "Đã kết nối" nút "Đã gửi" bị khoá (`BUG-007`); `investor-thread.spec.ts`: `IV-R02 thành viên gửi quan tâm → thấy khối Trao đổi với OPC Hub, gửi tin bằng Enter`; `UAT-20 AT-IV01 Admin gửi → thành viên thấy thông báo + tin` (hai app chung dữ liệu — xem Câu hỏi về chế độ MSW).

## CONSTRAINTS
- DO NOT: giữ hai bảng song song; query trong vòng lặp khi dựng danh sách/thông báo; `updateMany` không điều kiện trạng thái; cho chủ dự án ghi vào luồng NĐT; thêm nhánh `onServer` làm yếu assertion.
- REUSE: `InvestorSummary` (first_interest_id, status tổng hợp), `advanceSent`, `syncSummaryStatus`, `NotificationService.notify`, `AuditService.log`, `OutboxService.add`.
- SKIP: nút "Nhắn tin" chủ dự án (BUG-021, TIP-V2-109), thông báo cho Admin khi NĐT trả lời (không có trong §12 — ghi vào report), xuất CSV (giữ nguyên).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 7 (transition qua hàm domain + `WHERE status = <from>`), luật 8 (outbox `investor.admin_replied` cùng transaction), luật 10 (audit Admin), luật 9 (tiền BigInt → number an toàn, giữ nguyên).
- [ ] Shared file chỉ thêm dòng (`outbox/events.ts`, `worker-app.module.ts`, `NOTIFICATION_TYPES`), giữ `.wire-lock`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`; `test:int` xanh; `pnpm e2e` (msw) + `pnpm e2e:server --project behavior` xanh; chạy lại `e2e/audit/uat-interaction.audit.ts` mục UAT-20 → ĐẠT.
- [ ] `git commit -- <paths>` (không `-A`), `git status --short` sạch; báo `TIP-V2-107-DONE <sha> — <N> test passed`; report `coding-packs/reports/TIP-V2-107-completion.md`.
