# TIP-V46-817: Vận hành AI — nhật ký gọi AI, Soạn nội dung / Kiểm duyệt bằng AI, ngân sách & model theo chức năng (B3 + B4 + B5)

## HEADER

- TIP-ID: TIP-V46-817
- Project: OPCHUB
- Module: `apps/server/src/modules/llm-config`, `moderation`, `local-business` / `project` / `marketing` (điểm gọi Soạn nội dung), Admin `features/settings/components/ai`, `features/groups`, Portal form gian hàng / dự án
- Priority: P2
- Depends on: V46-816 (đã lên production, release #99). D-138 (PR #101). Nhánh tách từ `docs/d-138-ai-ops`; rebase lên `dev` sau khi #101 merge.
- Estimated: L (3 phần, builder tách commit theo phần: B5 → B3 → B4)
- REQ / D:
  - **D-138** (817 = B3 + B4 + B5)
  - REQ-628; D-124 (không Trợ lý); D-136 › Q-V46-811-3 / 4 / 5 (thay bằng TIP này cho phần tương ứng)
  - ADR-0008 / ADR-0009 (AI cấu hình ở Admin, adapter OpenAI-compatible, không SDK)
  - D-137 B2 (không gọi AI thật trong CI)
  - **Q-V46-817-1 → 8** (cuối file)
- **Files touched:**
  - **DB**
    - `packages/db/prisma/schema/llm-config.prisma` (modify: `llm_calls.actor_realm`, `actor_id` nullable; `llm_usage_months.warned_at`, `exhausted_at`; `llm_reservations` hoặc cột giữ chỗ — xem SPEC 4)
    - `packages/db/prisma/migrations/20261117090000_v46_ai_ops/migration.sql` + `down.sql` (create: cột mới, index log `(purpose, created_at DESC, id)` và `(status, created_at DESC, id)` nếu EXPLAIN cần; sửa CHECK `status` thêm `'blocked'` nếu dùng)
  - **Shared**
    - `packages/shared/src/api-domains/ai-providers.ts` (modify: `aiSettingsSchema` thêm `models: { bot?, script?, content?, mod? }` tùy chọn; mặc định rỗng = dùng model của nhà cung cấp)
    - `packages/shared/src/api-domains/ai-provider-catalog.ts` (modify: cập nhật danh mục model, SPEC 6)
    - `packages/shared/src/api-domains/ai-calls.ts` (create: query lọc nhật ký, item, response trang keyset)
    - `packages/shared/src/api-domains/ai-compose.ts` (create: request / response Soạn nội dung)
    - `packages/shared/src/api-domains/export.ts` (modify: kind `ai_calls`)
    - `packages/shared/src/api-domains/index.ts` (modify: export)
    - spec tương ứng (`ai-providers.spec.ts` modify, `ai-calls.spec.ts`, `ai-compose.spec.ts` create)
  - **Server — llm-config**
    - `services/ai-budget.service.ts` (modify: giữ chỗ chi phí + cảnh báo ngưỡng)
    - `services/ai-budget-alert.service.ts` (create: thông báo Admin khi chạm ngưỡng / hết ngân sách, một lần mỗi tháng)
    - `services/ai-router.service.ts` (modify: model theo chức năng, giữ chỗ trước gọi, giải phóng / quyết toán sau gọi, ghi actor)
    - `repositories/ai-call.repository.ts` (modify: `page` keyset + bộ lọc, `exportRows` theo lô)
    - `services/ai-call-log.service.ts` (create)
    - `controllers/ai-calls.controller.ts` (create: `GET /v1/admin/settings/ai/calls`, `POST /v1/admin/settings/ai/calls/export`)
    - `services/ai-compose.service.ts` (create) + `controllers/ai-compose.controller.ts` (create: `POST /v1/ai/compose` cho TV, `POST /v1/admin/ai/compose` cho Admin)
    - `ai-config-cache.ts`, `llm-config-core.module.ts`, `llm-config-http.module.ts`, `index.ts` (modify: nối)
    - `apps/server/src/modules/export/export-builders.ts` đăng ký kind `ai_calls` (modify tối thiểu, hoặc đăng ký từ llm-config như mẫu `report`)
  - **Server — moderation (AI Kiểm duyệt)**
    - `services/ai-moderation.service.ts` (create: phân loại tin bằng AI, SPEC 8)
    - `services/report.service.ts` (modify: tạo ca `auto` từ kết quả AI, nguồn `hit = 'ai:<nhãn>'`)
    - `services/moderation-settings.service.ts` (modify: cờ `ai` trong `app_settings.moderation`)
    - `apps/server/src/worker/processors/moderation.processor.ts` (modify: job `aiClassify`)
    - `packages/shared/src/queues/queues.ts` (modify: `moderation.aiClassify { messageId }`)
    - điểm phát job: `apps/server/src/modules/chat/**` nơi đang gọi keyword filter sau gửi (modify 1–2 dòng, chỉ enqueue)
  - **Admin**
    - `apps/admin/src/features/settings/components/ai/ai-allocation.tsx` (modify: ô model theo chức năng)
    - `apps/admin/src/features/settings/components/ai/ai-limits.tsx` (modify: chữ cảnh báo, nút "Xem nhật ký")
    - `apps/admin/src/features/settings/components/ai/ai-call-log.tsx` (create: bảng nhật ký + bộ lọc + xuất)
    - `apps/admin/src/features/settings/components/ai/ai-call-filters.tsx` (create)
    - `apps/admin/src/features/settings/hooks/use-ai-calls.ts` (create: `useInfiniteQuery` keyset + `useExportJob`)
    - `apps/admin/src/features/groups/components/moderation-rules.tsx` (modify: công tắc "Dùng AI phân loại tin")
    - `apps/admin/src/features/groups/components/report-card.tsx` (modify: nhãn nguồn "AI")
    - `apps/admin/src/features/marketing/components/campaign-form-fields.tsx` (modify: nút "Gợi ý bằng AI")
    - `apps/admin/src/components/ai-suggest-button.tsx` hoặc trong `packages/ui` (create: nút dùng chung)
    - MSW handler + mock: `apps/admin/src/mocks/**` (modify)
  - **Portal**
    - `apps/portal/src/features/stores/components/dashboard/public-page-fields.tsx` (modify: nút "Gợi ý bằng AI" cho mô tả gian hàng)
    - `apps/portal/src/features/projects/components/form-basic.tsx` (modify: nút cho tóm tắt dự án)
    - `apps/portal/src/features/shell/components/ai-suggest-button.tsx` (create, hoặc dùng chung `packages/ui`)
    - `apps/portal/messages/*/` khóa mới (modify, đủ 10 ngôn ngữ như 816)
    - MSW handler (modify)
  - **Test**
    - `apps/server/test/settings/ai-budget-reserve.int.spec.ts`, `ai-budget-alert.int.spec.ts`, `ai-calls-log.int.spec.ts`, `ai-model-per-purpose.int.spec.ts` (create)
    - `apps/server/test/llm/ai-compose.int.spec.ts`, `apps/server/test/moderation/ai-moderation.int.spec.ts` (create)
    - unit: `ai-router.service.spec.ts` (modify), `ai-call-log.tsx` / `ai-allocation` spec (create / modify)
    - e2e MSW: `e2e/behavior/admin-ai-ops.spec.ts` (create: xem nhật ký + xuất + model theo chức năng + gợi ý AI)
  - **Báo cáo**
    - `coding-packs/reports/TIP-V46-817-completion.md`, `TIP-V46-817-query-plans.md` (create)
    - `coding-packs/reports/V4.6-progress.md` (dòng #17), `coding-packs/plans/V4.6-DEBT.md` (B3 / B4 / B5), `coding-packs/reports/ui-parity/questions.md` (mục TIP-V46-817)
- **Parallel-safe with:** sequential. TIP duy nhất của D-138.

## CONTEXT

- Working dir `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-817-ai-ops`.
- **Hiện trạng (khảo sát 08/11/2026 trên `dev` `1b52c1ac`):**
  - `llm_calls` (id uuid7, created_at, purpose, provider, model, prompt_tokens, completion_tokens, cost BigInt, latency_ms, status, error_code), index duy nhất `(created_at, id)`. Không có actor, không nội dung. CHECK `purpose IN ('bot','script','content','mod')`, `status IN ('ok','error','fallback')`. Purge 90 ngày ở `housekeeping.service.ts:44`.
  - `llm_usage_months (month PK, cost, prompt_tokens, completion_tokens, calls)`.
  - `AiRouterService.run` (`ai-router.service.ts:37-75`): kiểm ngân sách **trước** gọi (`spend >= budget`), hết thì `bot` dừng, chức năng khác chuyển dự phòng; chi phí tính **sau** gọi trong `record()`. **Không giữ chỗ** → gọi đồng thời có thể vượt ngân sách. `warnPct` lưu nhưng server không dùng.
  - Một model / nhà cung cấp (`llm_providers.model`). `AI_PROVIDER_CATALOG` có model cũ (claude-sonnet-4-5, gpt-4.1, gemini-2.5).
  - Chỉ `bot` (`bot-turn-draft.service.ts:40`) và `script` (`bot-bulk-generation.service.ts:23`) gọi AI. **Không ai gọi `content` / `mod`.**
  - Kiểm duyệt hiện tại: từ khóa Aho-Corasick (`keyword-filter.service.ts`), ẩn trước khi lưu, sau gửi enqueue `moderation.keywordHit` → `ReportService.keywordHit` tạo ca `auto` + vi phạm (CR-14).
  - Thông báo Admin: `NotificationService.notify({ realm: 'admin', type: 'system', id })` + `AdminDirectoryService.withPermission(key)` (mẫu `app-notify.service.ts:64-75`).
  - Xuất: module `export` (outbox, storage, link 1h, audit `export.download`), kind là discriminated union `exportParamsSchema`; FE `useExportJob`. Mẫu nhật ký phân trang: `audit-log-tab.tsx` + `use-audit-log.ts`.
- **Prototype** (`docs/spec/index.html` L4859–4919, `_aiCfgV` L6310–6342):
  - Phân bổ: "Soạn nội dung — Gợi ý mô tả gian hàng, dự án, email"; "Kiểm duyệt tin nhạy cảm — Phân loại tin vi phạm trước khi ẩn" (L6324).
  - Hạn mức: "Ngân sách tháng (đ)", "Cảnh báo khi đạt (%)" mặc định 80; thanh chuyển cam `#FA8C16` khi ≥ ngưỡng; "Hết ngân sách: tạm dừng bot tự động, các chức năng khác chuyển sang nhà cung cấp dự phòng." (L4911).
  - "Lưu nhật ký gọi AI — Ghi chức năng, mô hình, số token, chi phí; lưu 90 ngày" (L4913).
  - **Prototype không có**: màn xem nhật ký, nút xuất, nút gợi ý AI trong form, AI trong Kiểm duyệt (L3062–3091 chỉ từ khóa + báo cáo), thông báo ngưỡng. Đặc tả `dac-ta.html` không có BR / QT cho các phần này. → Giao diện mới dựng theo ngôn ngữ thiết kế Admin sẵn có (bảng nhật ký hoạt động, AntD), không có ảnh parity đối chiếu (D-134).
- TIP-811 SKIP (`TIP-V46-811-…md:396-402`) chính là phạm vi TIP này.

## APPLICABLE STANDARDS

- [backend/nestjs-modules](../standards/backend/nestjs-modules.md): module nghiệp vụ, outbox cho hiệu ứng phụ, transition có điều kiện.
- [backend/auth-rbac](../standards/backend/auth-rbac.md): permission key, không check tên vai trò.
- [database/query-indexing](../standards/database/query-indexing.md): index "bằng trước, khoảng / sort sau", keyset, không query trong vòng lặp; EXPLAIN.
- [integrations/adapters](../standards/integrations/adapters.md): chỉ adapter OpenAI-compatible; test dùng stub HTTP.
- [security/security](../standards/security/security.md): không lưu prompt / trả lời; che PII; audit mọi thao tác Admin kể cả xuất.
- [frontend/data-state](../standards/frontend/data-state.md), [frontend/antd-ui](../standards/frontend/antd-ui.md), [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md).
- [testing/testing](../standards/testing/testing.md), [global/code-structure](../standards/global/code-structure.md), [global/git-workflow](../standards/global/git-workflow.md).

## TASK

Hoàn thiện vận hành AI đã cấu hình ở 811:

1. **B5:** giữ chỗ chi phí cho lời gọi đang chạy để không vượt ngân sách; thông báo Admin khi chạm ngưỡng cảnh báo và khi hết ngân sách; chọn model theo từng chức năng; cập nhật danh mục model.
2. **B3:** màn xem / lọc / xuất nhật ký gọi AI (chỉ metadata).
3. **B4:** dùng AI cho **Soạn nội dung** (nút "Gợi ý bằng AI" ở mô tả gian hàng, tóm tắt dự án, nội dung email Marketing) và **Kiểm duyệt** (AI phân loại tin sau gửi, bổ sung cho từ khóa, Admin bật / tắt).

## SPECIFICATIONS

### B5 — Ngân sách, giữ chỗ, cảnh báo, model theo chức năng

1. **Giữ chỗ chi phí (reservation).** Trước mỗi lời gọi, router ước tính chi phí tối đa `est = ceil((promptTokensƯớc * priceIn + maxTokens * priceOut) / 1e6)` (ước token vào = độ dài ký tự / 3, làm tròn lên) và giữ chỗ nguyên tử trên Redis: `INCRBY llm:reserved:{month} est` trong Lua, từ chối nếu `spend + reserved + est > budget` (budget > 0). Sau gọi (thành công / lỗi) `DECRBY est` rồi ghi chi phí thật như hiện nay. Khóa giữ chỗ có TTL 15 phút, làm mới mỗi lần giữ, để rò rỉ khi tiến trình chết tự hết.
2. **Hết ngân sách** (kể cả do giữ chỗ): giữ đúng hành vi 811 / prototype — `bot` dừng ("Hết ngân sách AI tháng"); `script` / `content` / `mod` chuyển nhà cung cấp dự phòng (vẫn tính chi phí, vẫn giữ chỗ). Dự phòng cũng không đủ ngân sách → lỗi `budget_exhausted`, không gọi. Giá nhà cung cấp = 0 (D-136 mặc định) → `est = 0`, không chặn.
3. **Cảnh báo.** Sau khi ghi chi phí, nếu `spend >= budget * warnPct / 100` và `llm_usage_months.warned_at IS NULL` → `UPDATE … SET warned_at = now() WHERE month = $1 AND warned_at IS NULL RETURNING` (chỉ một tiến trình thắng) rồi phát outbox `ai.budget_warned { month, pct }`. Tương tự `exhausted_at` + `ai.budget_exhausted` khi `spend >= budget` hoặc lần đầu bị từ chối vì ngân sách. Handler gửi thông báo Admin `realm: 'admin'`, `type: 'system'`, `id` ổn định `ai-budget:{month}:{warn|exhausted}`, tới mọi Admin có `settings.general`; tiêu đề "Chi phí AI đã đạt {pct}% ngân sách tháng" / "Đã hết ngân sách AI tháng {MM/YYYY}", link Admin › Cài đặt › AI Provider. Không email (Q-V46-817-3). Đổi `budget` / `warnPct` lớn hơn → xóa `warned_at` / `exhausted_at` của tháng hiện tại trong cùng transaction `save` để cảnh báo lại được.
4. **Model theo chức năng.** `aiSettingsSchema.models` tùy chọn `{ bot?, script?, content?, mod? }` (chuỗi 1..200). Rỗng → model mặc định của nhà cung cấp. Có giá trị → dùng cho nhà cung cấp **chính** của chức năng đó; khi chuyển dự phòng dùng model mặc định của nhà cung cấp dự phòng (Q-V46-817-4). `llm_calls.model` ghi model thực dùng. Admin › Phân bổ: mỗi dòng thêm ô chọn model (gợi ý từ danh mục của nhà cung cấp, cho gõ tự do), mặc định "Mặc định của nhà cung cấp".
5. Giữ nguyên: khóa advisory 712001, ràng buộc nhà cung cấp bật, audit `llm.update`, cache `llm:config:changed`.
6. **Danh mục model** (`AI_PROVIDER_CATALOG`): builder kiểm trang tài liệu công khai của từng hãng lúc làm, cập nhật danh sách model gợi ý và model mặc định khi model cũ đã ngừng; ghi nguồn + ngày trong completion. **Không** đổi model đang lưu trong DB của khách (chỉ gợi ý). Không gọi API thật.

### B3 — Nhật ký gọi AI

7. **API** (quyền `settings.general`):
   - `GET /v1/admin/settings/ai/calls?from&to&purpose&provider&status&cursor&limit` — keyset `(created_at DESC, id DESC)`, `limit` 1..100 mặc định 50, khoảng thời gian tối đa 90 ngày (bằng thời hạn lưu), mặc định 7 ngày gần nhất theo giờ VN. Trả `{ items: [{ id, at, purpose, provider, model, promptTokens, completionTokens, cost, latencyMs, status, errorCode, actor? }], nextCursor, totals: { calls, cost, promptTokens, completionTokens } }`. `totals` theo bộ lọc, một truy vấn aggregate riêng.
   - `POST /v1/admin/settings/ai/calls/export` — cùng bộ lọc, 202 + job xuất CSV qua module `export` (kind `ai_calls`), lô 1.000 dòng keyset, cột: Thời gian (giờ VN), Chức năng, Nhà cung cấp, Mô hình, Token vào, Token ra, Chi phí (đ), Độ trễ (ms), Trạng thái, Mã lỗi. Audit `llm.calls.export` với bộ lọc (không dữ liệu cá nhân trong file, vẫn audit theo luật 10).
   - Xem nhật ký không audit (chỉ metadata, không dữ liệu cá nhân).
8. **Actor**: thêm `actor_realm` (`member` | `admin` | `system`) + `actor_id` nullable cho lời gọi Soạn nội dung (B4) để Admin thấy ai dùng; bot / script / mod ghi `system`. Danh sách chỉ hiện "Thành viên" / "Quản trị" / "Hệ thống" + mã rút gọn, không tên / email (Q-V46-817-5).
9. **Màn Admin** (trong tab AI Provider, card mới "Nhật ký gọi AI" dưới "Tham số & hạn mức", hoặc drawer mở từ nút "Xem nhật ký" — chọn theo kích thước file, ghi completion):
   - Bộ lọc: khoảng ngày, Chức năng (Bot / Kịch bản / Soạn nội dung / Kiểm duyệt), Nhà cung cấp, Trạng thái (Thành công / Lỗi / Dự phòng).
   - Dòng tổng: số lời gọi, tổng token vào / ra, tổng chi phí.
   - Bảng: Thời gian · Chức năng · Nhà cung cấp · Mô hình · Token vào / ra · Chi phí · Độ trễ · Trạng thái (Tag màu) · Mã lỗi. Cuộn tải thêm theo cursor như Nhật ký hoạt động.
   - Nút "Xuất CSV" dùng `useExportJob`, toast như các màn xuất khác.
   - "Lưu nhật ký gọi AI" đang tắt → card hiện chú thích "Đang tắt lưu nhật ký; chỉ có dữ liệu cũ (tối đa 90 ngày)".
10. Index: thêm index cho truy vấn có lọc `purpose` / `status` nếu EXPLAIN trên 200k dòng cho thấy Index Filter tốn; ghi EXPLAIN vào `TIP-V46-817-query-plans.md`. Aggregate tổng dùng cùng điều kiện khoảng thời gian (Index Scan theo `created_at`).

### B4 — Soạn nội dung & Kiểm duyệt bằng AI

11. **Soạn nội dung (`content`).** `POST /v1/ai/compose` (TV đăng nhập, `isFeeUsable` như các thao tác tạo nội dung) và `POST /v1/admin/ai/compose` (Admin có `settings.mail`):
    - Body `{ kind: 'store_description' | 'project_summary' | 'campaign_body', input: { … các trường đã nhập, đã zod, tổng ≤ 2.000 ký tự }, locale }`.
    - Prompt hệ thống cố định theo `kind` ở server (không nhận prompt tự do từ client), giới hạn độ dài đầu ra đúng ràng buộc của ô (tóm tắt dự án ≤ 160 ký tự, mô tả gian hàng theo maxLength hiện có, email ≤ 4.000), trả về văn bản thuần (strip HTML; email Marketing trả HTML an toàn qua sanitizer sẵn có của NA-27 nếu ô là rich text).
    - PII: luôn qua `maskPii` khi `settings.pii` bật (như router).
    - Giới hạn tần suất: mỗi người 10 lần / giờ (Redis), ngoài giới hạn toàn cục 60 / phút sẵn có (Q-V46-817-6). Vượt → 429 "Bạn đã dùng hết lượt gợi ý trong giờ này".
    - Không nhà cung cấp cho `content` (`— Không dùng —`) → endpoint trả 409 `not_configured`, FE ẩn nút (config trả cờ `compose: boolean` qua endpoint cấu hình công khai tối thiểu hoặc trong response hồ sơ — builder chọn chỗ ít đụng nhất, ghi completion).
    - FE: nút "Gợi ý bằng AI" cạnh ô; bấm → loading → hiện gợi ý trong popover "Dùng gợi ý" / "Bỏ qua"; **không tự ghi đè** nội dung người dùng đã nhập. Lỗi / hết ngân sách → toast "Chưa gợi ý được, vui lòng thử lại sau".
12. **Kiểm duyệt (`mod`).** Admin › Nhóm › Kiểm duyệt thêm công tắc "Dùng AI phân loại tin vi phạm" (`app_settings.moderation.ai`, mặc định **tắt**, audit `moderation.settings`).
    - Bật + có nhà cung cấp cho `mod`: sau khi tin **đã lưu và không trúng từ khóa**, enqueue `moderation.aiClassify { messageId }` (outbox / queue như `keywordHit`, không chặn gửi tin, S-08). Không phân loại tin của bot, Admin, tin hệ thống, tin đã ẩn, tin rỗng / chỉ tệp.
    - Worker gọi AI với prompt cố định, yêu cầu JSON `{ violate: boolean, label: 'spam'|'scam'|'harassment'|'adult'|'other', confidence: 0..1 }`, parse zod; lỗi parse / lỗi AI → bỏ qua (log mức warn, không tạo ca).
    - `violate && confidence >= 0.8` → tạo ca qua `ReportService` với `source = auto`, `hit = 'ai:<label>'`. **Không tự ẩn, không tính vi phạm, không khóa** — chỉ đưa vào hàng chờ "Tự động" để Admin xử lý (Q-V46-817-2). Admin bấm "Ẩn" / "Khóa" thì theo luồng CR-14 hiện có.
    - Chống trùng: một ca / tin (`report` theo `message_id` + nguồn như keyword); tin đã có ca thì bỏ qua.
    - Thẻ ca hiện nguồn "AI · {nhãn}" thay cho từ khóa.
    - Giới hạn chi phí: chỉ khi công tắc bật; mỗi tin tối đa 1 lời gọi; nội dung gửi AI cắt 1.000 ký tự, qua `maskPii`.
13. Mọi lời gọi B4 đi qua `LLM_ROUTER.forPurpose('content' | 'mod')` — dùng chung giữ chỗ, cảnh báo, dự phòng, nhật ký của B5 / B3. Không gọi adapter trực tiếp.

### Validation

- Mọi query / body mới parse zod trong `packages/shared`. `models.*` 1..200 ký tự; bộ lọc ngày ISO, `to - from ≤ 90 ngày`; `cursor` base64url của `(created_at, id)`.
- Đầu ra AI (compose / moderation) coi là dữ liệu không tin cậy: zod + strip / sanitize trước khi trả hoặc dùng.

### Error Handling

| Trường hợp | Xử lý |
|---|---|
| Hết ngân sách (bot) | Lỗi "Hết ngân sách AI tháng", bot dừng như 811; outbox `ai.budget_exhausted` một lần / tháng |
| Hết ngân sách (content / mod / script) | Chuyển dự phòng; dự phòng cũng không đủ → `budget_exhausted`; compose trả 503 thân thiện, moderation bỏ qua |
| Redis lỗi khi giữ chỗ | Fail-closed cho `bot` / `script` / `mod` (không gọi, log warn); compose trả 503 — không gọi AI khi không giữ chỗ được (Q-V46-817-7) |
| Chưa phân bổ nhà cung cấp | `not_configured`; compose 409; moderation không enqueue |
| AI trả JSON sai (moderation) | Bỏ qua, ghi `llm_calls.status = error`, `error_code = invalid_output` |
| Xuất > 90 ngày / bộ lọc sai | 400 theo mã lỗi chung |
| Vượt giới hạn tần suất compose | 429 |

## ACCEPTANCE CRITERIA

- **Giữ chỗ:** Given ngân sách còn đủ cho đúng 1 lời gọi ước tính When 5 lời gọi `content` đồng thời (stub HTTP chậm 500 ms) Then tối đa 1 lời gọi tới nhà cung cấp chính, phần còn lại chuyển dự phòng hoặc `budget_exhausted`; sau cùng `llm:reserved:{month}` = 0. Test: `ai-budget-reserve.int.spec.ts` › `concurrent calls cannot overshoot budget`.
- **Cảnh báo một lần:** Given `warnPct` 80, chi phí vượt 80% bởi 2 tiến trình đồng thời Then đúng 1 thông báo Admin `ai-budget:{month}:warn` cho mỗi Admin có `settings.general`; tăng ngân sách → cảnh báo lại được. Test: `ai-budget-alert.int.spec.ts`.
- **Hết ngân sách:** Given chi phí ≥ ngân sách When bot gọi Then lỗi "Hết ngân sách AI tháng", có đúng 1 thông báo `exhausted`; `content` chuyển dự phòng. Test: `ai-budget-alert.int.spec.ts` › `exhausted stops bot and notifies once`.
- **Model theo chức năng:** Given `models.content = 'm-x'` When gọi `content` qua nhà cung cấp chính Then request stub nhận `model = 'm-x'`, `llm_calls.model = 'm-x'`; khi rơi dự phòng dùng model mặc định của dự phòng. Test: `ai-model-per-purpose.int.spec.ts`.
- **Nhật ký:** Given 120 lời gọi đủ chức năng / trạng thái When lọc `purpose=content&status=error` Then đúng dòng, keyset trang 2 không trùng / sót, `totals` khớp; Admin thiếu `settings.general` → 403. Xuất CSV có BOM, đúng cột, audit `llm.calls.export`. Test: `ai-calls-log.int.spec.ts`; e2e MSW `admin-ai-ops.spec.ts` › `view filter and export AI call log`.
- **Không lộ nội dung:** Given compose với input có SĐT / email Then `llm_calls` không có nội dung; request stub nhận bản đã che (khi `pii` bật). Test: `ai-compose.int.spec.ts` › `masks pii and stores metadata only`.
- **Soạn nội dung:** Given `use.content` có nhà cung cấp When TV bấm "Gợi ý bằng AI" ở tóm tắt dự án Then nhận gợi ý ≤ 160 ký tự, ô chỉ đổi khi bấm "Dùng gợi ý"; lần thứ 11 trong giờ → 429; `use.content` rỗng → nút ẩn, API 409. Test: `ai-compose.int.spec.ts`; unit FE nút gợi ý.
- **Kiểm duyệt AI:** Given công tắc AI bật, stub trả `{ violate: true, label: 'scam', confidence: 0.9 }` When TV gửi tin không trúng từ khóa Then có 1 ca `auto` `hit = 'ai:scam'`, tin **không** bị ẩn, không có vi phạm; stub trả JSON sai → không ca; công tắc tắt → không gọi AI. Test: `ai-moderation.int.spec.ts`.
- **Danh mục:** `ai-providers.spec.ts` kiểm danh mục mới hợp lệ và mọi model mặc định nằm trong danh mục.
- **Không hồi quy:** `ai-router.int.spec.ts`, `ai-settings.int.spec.ts`, bot / script, keyword moderation hiện có xanh.

## CONSTRAINTS

- DO NOT:
  - lưu prompt / nội dung trả lời / nội dung tin vào `llm_calls`, log, báo cáo
  - để AI tự ẩn tin / tính vi phạm / khóa TK (Q-V46-817-2)
  - nhận prompt tự do từ client cho compose
  - gọi AI thật trong test / CI (D-137); thêm SDK hoặc dịch vụ trả phí
  - thêm lại dòng Trợ lý (D-124)
  - gửi email cảnh báo ngân sách (Q-V46-817-3)
  - đổi model đã lưu của nhà cung cấp khi cập nhật danh mục
  - check tên vai trò; query trong vòng lặp; vượt trần file (BE 600 / FE 400)
- REUSE: `AiRouterService` / `LLM_ROUTER.forPurpose`, `AiBudgetService`, `maskPii`, `NotificationService` + `AdminDirectoryService.withPermission`, module `export` + `useExportJob`, mẫu `audit-log-tab` / `use-audit-log`, `ReportService` (ca `auto`), sanitizer NA-27, `isFeeUsable`.
- SKIP:
  - AI cho email chào mừng / mô tả nhu cầu / sự kiện (chỉ 3 ô ở SPEC 11; thêm ô khác là việc sau)
  - kiểm duyệt AI cho bài viết / bình luận ngoài chat
  - dashboard biểu đồ chi phí theo ngày
  - 5 nhà cung cấp chưa có key (B2 còn lại)
  - B6 → B11, B13 → B18

## Câu hỏi chờ owner chốt (builder dùng mặc định nếu chưa có trả lời, ghi `questions.md` › TIP-V46-817)

- **Q-V46-817-1 Soạn nội dung ở những ô nào.**
  - **Mặc định:** 3 ô theo prototype "mô tả gian hàng, dự án, email": mô tả gian hàng (Portal), tóm tắt dự án (Portal), nội dung email Marketing (Admin).
  - Phương án khác: thêm mô tả nhu cầu, sự kiện, email chào mừng.
- **Q-V46-817-2 AI Kiểm duyệt có được tự ẩn tin không.**
  - **Mặc định:** **không**. AI chỉ tạo ca "Tự động · AI" để Admin xử lý; không ẩn, không tính vi phạm, không khóa. Tránh AI phạt nhầm thành viên.
  - Phương án khác: ẩn ngay như từ khóa khi độ tin cậy ≥ 0,9 (không tính vi phạm cho đến khi Admin xác nhận).
- **Q-V46-817-3 Kênh cảnh báo ngân sách.**
  - **Mặc định:** thông báo trong Admin (chuông + Web Push nếu Admin đã bật thiết bị), một lần mỗi mức mỗi tháng. Không email.
  - Phương án khác: thêm email tới Admin có `settings.general`.
- **Q-V46-817-4 Model theo chức năng khi chuyển dự phòng.**
  - **Mặc định:** dự phòng dùng model mặc định của nhà cung cấp dự phòng (model riêng của chức năng chỉ áp cho nhà cung cấp chính).
- **Q-V46-817-5 Nhật ký có hiện người dùng không.**
  - **Mặc định:** chỉ loại (Thành viên / Quản trị / Hệ thống) + mã rút gọn; không tên / email / SĐT trong màn và file xuất.
- **Q-V46-817-6 Giới hạn lượt Soạn nội dung.**
  - **Mặc định:** 10 lượt / người / giờ, cộng giới hạn chung 60 lời gọi / phút của hệ thống.
- **Q-V46-817-7 Redis lỗi khi giữ chỗ chi phí.**
  - **Mặc định:** không gọi AI (an toàn về chi phí); bot tạm dừng lượt đó, compose báo thử lại sau.
- **Q-V46-817-8 Kiểm duyệt AI bật mặc định?**
  - **Mặc định:** **tắt**; Admin tự bật ở Nhóm › Kiểm duyệt. Production chỉ tốn chi phí khi Admin bật và đã phân bổ nhà cung cấp cho "Kiểm duyệt tin nhạy cảm".

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-817-ai-ops` (rebase `dev` sau khi PR #101 merge); chỉ sửa file trong **Files touched** (ngoài danh sách phải ghi lý do trong completion).
- [ ] Migration `--create-only`, sửa SQL tay, có `down.sql`; chạy up → down → up trên DB test riêng đã được owner duyệt.
- [ ] Mọi AC có test PASS, ghi tên test + kết quả từng cái.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`; e2e MSW không tụt; chép output thật.
- [ ] EXPLAIN truy vấn nhật ký (lọc + keyset + totals) và xuất trong `TIP-V46-817-query-plans.md`.
- [ ] Luật liên quan:
  - **Luật 8:** cảnh báo ngân sách qua outbox trong cùng transaction với `warned_at` / `exhausted_at`
  - **Luật 10:** audit `llm.update`, `llm.calls.export`, `moderation.settings`
  - **Luật 11 / ADR-0009:** mọi lời gọi qua router + adapter OpenAI-compatible; test stub HTTP, không AI thật
  - **Luật 12 / bảo mật:** không prompt / nội dung trong log, nhật ký, báo cáo
- [ ] Trần file BE 600 / FE 400; không `any` / `@ts-ignore` / `console.*`.
- [ ] Ghi Q-V46-817-1 → 8 vào `questions.md`; cập nhật `V4.6-progress.md` dòng #17, `V4.6-DEBT.md` B3 / B4 / B5.
- [ ] Commit `git commit -- <paths>` (cấm `git add -A`); `git status --short` sạch; push; PR `base: dev`; không tự merge. Completion có **git commit SHA**.

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ; Files touched mức file (một số điểm nối chat / form cần builder xác nhận đúng file, đã ghi rõ)
- [x] Context: hiện trạng router / ngân sách / nhật ký / kiểm duyệt có dòng code; prototype có gì và không có gì
- [x] SPEC 1 → 13 chia B5 / B3 / B4; validation; bảng lỗi
- [x] AC Given / When / Then có tên test
- [x] Constraints trích D-124 / D-137 / luật 8 / 10 / 11 / 12
- [x] Parallel: sequential, TIP duy nhất của D-138
- ⚠️ Gap:
  - Prototype và đặc tả **không có** màn nhật ký, nút gợi ý AI, AI kiểm duyệt, thông báo ngân sách → giao diện dựng theo mẫu Admin sẵn có, không có ảnh parity đối chiếu; owner duyệt ảnh trong PR (D-134).
  - Ước token vào theo ký tự / 3 là xấp xỉ; giữ chỗ dùng `maxTokens` cho đầu ra nên luôn ước cao, có thể từ chối sớm khi còn rất ít ngân sách — chấp nhận.
  - Danh mục model phụ thuộc tài liệu hãng tại thời điểm làm.
