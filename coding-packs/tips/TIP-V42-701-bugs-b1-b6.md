# TIP-V42-701: Sửa lỗi B1 → B6 (rà soát v4.2)

## HEADER
- TIP-ID: TIP-V42-701
- Project: OPCHUB
- Module: affiliate, project (Gọi vốn), membership-fee (đối soát), integrations (bank-webhook, storage), chat, moderation, uploads, Portal chat
- Priority: P0
- Depends on: none (đầu chuỗi GOAL-V4.2)
- Estimated: M
- REQ / D: REQ-615, D-117 (kèm D-77, D-98, D-105, D-106)
- **Files touched:**
  - B1: `apps/server/src/modules/affiliate/repositories/affiliate-write.repository.ts` (modify)
  - B2: `apps/server/src/modules/project/domain/fundraising-status.ts`, `project/repositories/fundraising.repository.ts`, `project/services/fundraising.service.ts` (modify)
  - B3: `packages/integrations/src/bank-webhook/content.ts` + `.spec.ts`, `membership-fee/ports.ts`, `membership-fee/index.ts`, `membership-fee/services/reconcile.service.ts`, `project/services/fundraising-review.service.ts` (modify)
  - B4: `chat/repositories/message.repository.ts`, `chat/services/{message,persona-message}.service.ts`, `chat/services/persona-turn-publisher.ts`, `moderation/services/keyword-filter.service.ts` (modify)
  - B5: `packages/shared/src/api-domains/upload-safety.ts` + `.spec.ts` (create), `api-domains/index.ts`, `shared/src/errors.ts`, `server/src/common/errors/app-error.ts`, `integrations/src/storage/{types,fake.provider,local.provider,s3.provider}.ts`, `uploads/image-ref.service.ts` + `.spec.ts` (modify)
  - B6: `uploads/private-file-url.service.ts` (create), `uploads/{index,uploads.module,local-uploads.controller}.ts`, `chat/services/room.service.ts`, `chat/controllers/messages.controller.ts`, `shared/api-domains/chat-room.ts`, `shared/mock-data/domains/chat-ops.ts`, Portal `features/chat/{api.ts,hooks/use-file-download.ts (create),components/{message-body,info-panel}.tsx}`, `mocks/handlers/chat.ts`, `messages/*/chat.json` (thêm 1 khoá)
  - Test: `apps/server/test/project/fundraising-v42-fixes.int.spec.ts`, `test/moderation/keyword-pre-publish.int.spec.ts` (create); `test/bot/persona-publication.int.spec.ts`, `test/chat/chat-rest.int.spec.ts`, `test/contract/chat.int.spec.ts`, `test/uploads/storage.helper.ts`, `e2e/behavior/chat.spec.ts` (modify)
- **Parallel-safe with:** sequential — đầu chuỗi GOAL-V4.2; V42-704 / 706 / 709 đụng cùng file sau.

## CONTEXT
- Bằng chứng file:dòng: `coding-packs/audit/SPEC-V4.2-FULL-AUDIT.md` › "Lỗi thật đã xác minh".
- Giá vẫn đọc từ `FUNDRAISING_PLAN` (Cấu hình bảng giá thay ở V42-703).

## APPLICABLE STANDARDS
- [security/security](../standards/security/security.md) — upload kind, chặn file thực thi, GET ký ngắn hạn
- [realtime/socket-chat](../standards/realtime/socket-chat.md) — S-08 kiểm từ khoá trước khi phát
- [integrations/adapters](../standards/integrations/adapters.md) — storage chỉ qua adapter
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md) — cổng giữa domain (FundraisingPaymentPort)
- [testing/testing](../standards/testing/testing.md)

## TASK
Sửa 6 lỗi xác minh khi rà soát v4.2, mỗi lỗi có test tái hiện.

## SPECIFICATIONS
1. **B1** đổi % đại lý chỉ tính lại hoa hồng `source='membership'`; khoản Gọi vốn giữ % (BR-GV-06).
2. **B2** (D-106) mua Gói Gọi vốn khi khoản trước còn hạn → 409 (bỏ mua sớm 14 ngày); dự án đã từng được duyệt → khoản mới giá `renewAmount`.
3. **B3** (D-105) nội dung `OPCHUB TVxxxxxx 0xxx GVxxxxxx` → ưu tiên GV, Mã TV phải là chủ khoản; TV khác chủ → không khớp, lý do "`TV…` không phải chủ Gói Gọi vốn `GV…`". Nhiều mã cùng loại vẫn mơ hồ.
4. **B4** (D-77) kiểm từ khoá đồng bộ (Aho-Corasick in-memory) **trước** INSERT: trúng → `hidden_at = now()` ngay khi lưu, phòng chỉ nhận dòng ẩn rỗng; hook sau commit vẫn enqueue `moderation.keywordHit` với nội dung gốc (tạo ca + tính vi phạm). Tin bot trúng từ khoá không phát `message.new`.
5. **B5** tệp chat: đuôi thực thi ở bất kỳ đoạn tên, đuôi lệch MIME, hoặc byte đầu lệch chữ ký MIME / là chữ ký thực thi (MZ, ELF, Mach-O, `#!`) → xoá object, **422 `FILE_REJECTED`**.
6. **B6** (D-98, V-15) khoá `chat-file/`, `chat-image/` không tải công khai: API trả `presignGet` ≤ 5 phút sau `assertRead` (lịch sử, gửi tin, File); `GET /messages/:id/attachment` cấp link mới; GET local không chữ ký → 404. Portal bấm Tải về → xin link mới rồi mở.

## ACCEPTANCE CRITERIA
- Given đại lý có hoa hồng phí TV + Gọi vốn When Admin đổi % Then chỉ khoản phí TV đổi (int `fundraising-v42-fixes`).
- Given khoản Gọi vốn còn hạn 5 ngày When mua lại Then 409; Given đã hết hạn Then khoản mới = `renewAmount`.
- Given CK `OPCHUB TV.. 0.. GV..` đúng chủ Then khoản → `pending_review`; TV người khác Then unmatched, khoản giữ `pending_payment`.
- Given tin chứa từ khoá When gửi Then DB `hidden_at` có giá trị, sự kiện phòng không chứa nguyên văn, job kiểm duyệt được enqueue (int `keyword-pre-publish`).
- Given tệp `hoa-don.pdf.exe` hoặc nội dung MZ khai PDF When gửi tin Then 422, object bị xoá, không có tin (int `chat-rest`).
- Given tin có tệp When người ngoài nhóm xin link Then 403; URL công khai không chữ ký Then 404; thành viên bấm Tải về Then gọi `/messages/:id/attachment` 200 (e2e `chat.spec`).

## CONSTRAINTS
- DO NOT: query DB trong vòng lặp ký URL (ký thuần tính toán); viết lại điều kiện phí.
- SKIP: nút File chia sẻ theo nhóm (V42-709), giới hạn 20 MB (V42-709), bucket S3 production (ghi báo cáo).

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng Files touched
- [ ] Mỗi AC có test, ghi kết quả thật
- [ ] lint, typecheck, test, test:int, depcheck, build, e2e chat
- [ ] Luật 7 (transition có điều kiện), luật 11 (storage qua adapter), S-08 (không truy vấn DB khi kiểm từ khoá)
