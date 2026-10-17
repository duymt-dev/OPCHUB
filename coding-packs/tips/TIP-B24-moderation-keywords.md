# TIP-B24: Kiểm duyệt — báo cáo tin, từ khoá, Admin xử lý

## HEADER
- TIP-ID: TIP-B24 · Module: moderation · Priority: P0 · Depends on: TIP-B23 · Estimated: L (10h)
- **Files touched:**
  - `apps/server/src/modules/moderation/{index.ts,moderation-core.module.ts}` (create)
  - `apps/server/src/modules/moderation/domain/{aho-corasick.ts,report.mapper.ts}` (+ spec) (create)
  - `apps/server/src/modules/moderation/repositories/{report.repository.ts,keyword.repository.ts}` (create)
  - `apps/server/src/modules/moderation/services/{report.service.ts,keyword-filter.service.ts,admin-reports.service.ts,admin-keywords.service.ts}` (create)
  - `apps/server/src/modules/moderation/controllers/{message-report.controller.ts,admin-reports.controller.ts,admin-keywords.controller.ts}` (create)
  - `apps/server/src/worker/processors/moderation.processor.ts`, `worker/worker-app.module.ts` (create/modify)
  - `apps/server/test/moderation/*.int.spec.ts` (create)
- **Parallel-safe with:** TIP-B25 (khác module). `sequential, shares api-app.module.ts with TIP-B20`.

## CONTEXT
- Hợp đồng `reportMessageSchema`, `reportSchema`, `reportQuerySchema`, `reportActionSchema`, `keywordSchema`, `keywordListSchema`. Migration `c4f419f`:
  `reports` = ca mở theo (tin, nguồn), `message_flags` = lượt báo của từng người. D-43 người báo ẩn danh với chủ nhóm.

## SPECIFICATIONS
1. `POST /messages/:id/report {reason, note?}` 201: tin của mình → 403; đã báo → 409 "Bạn đã báo cáo tin này" (PK `message_flags`); upsert ca `source=report` mở
   (`reporter_count+1`). `reportedByMe` của B23 đọc `message_flags`.
2. Từ khoá: Aho-Corasick in-memory, nạp lúc khởi động, reload khi nhận pub/sub `moderation:keywords`. Gửi tin khớp → enqueue job `moderation.keyword` (không chặn tin) → worker tạo ca `source=auto`, `hit`.
3. Admin (`c.mod`): `GET /admin/reports?status&source&page&size(10)` mới trước; `POST /admin/reports/:id/action` `open → resolved` có điều kiện (0 dòng → 409 "Báo cáo đã được xử lý");
   `hide` → `messages.hidden_at` + emit `message.updated`; `warn` → thông báo; `lock` → khoá TK qua đường `AdminUsers` (port) + outbox; audit.
4. Từ khoá CRUD (`c.mod`): 201 trả full list, trùng (citext) → 409 "Từ khóa đã có", xoá không có → 404; publish reload; audit.

## ACCEPTANCE CRITERIA
- Báo cáo 2 lần → 409; 2 người báo → 1 ca `reporterCount 2`.
- Tin chứa "vay nóng" → sau worker có ca `auto` với `hit`.
- Action `hide` → tin không còn trong lịch sử Portal; action lần 2 → 409.

## CONSTRAINTS
- DO NOT: chặn đường gửi tin bằng query; lộ người báo cho Portal.

## ⚠️ BUILDER-CHECKLIST
- [ ] AC int test; audit; gate; commit; SHA
