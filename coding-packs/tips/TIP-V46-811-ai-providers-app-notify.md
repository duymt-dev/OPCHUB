# TIP-V46-811: Admin › Cài đặt › AI Provider (nhiều nhà cung cấp, phân bổ, hạn mức, nhật ký, ẩn PII) + Ứng dụng & thông báo

## HEADER

- TIP-ID: TIP-V46-811
- Project: OPCHUB
- Module: llm-config (nhiều nhà cung cấp, định tuyến theo chức năng, dự phòng, ngân sách, nhật ký gọi), integrations/llm (usage, temperature, ẩn PII), bot (gọi theo chức năng), settings (`app_settings.app`), system (dọn nhật ký 90 ngày), Admin › Cài đặt
- Priority: P2
- Depends on: none về nghiệp vụ; chạy sau 810 theo thứ tự GOAL (`dev` `a99a6de4`)
- Estimated: L
- REQ / D: REQ-628, REQ-629 · BR-492, BR-493, VM-463 · D-124 (ẩn dòng "Trợ lý OPC Hub (widget)"), D-125 (Ứng dụng & thông báo chỉ lưu cấu hình, không Web Push thật), D-92 (không có Trợ lý), D-99 / D-103 / ADR-0008 (AI cấu hình trong Admin, không fake ở runtime, stub HTTP khi test), OQ-22 (key Media Soft do Admin tự nhập), D-89 / D-95 (prototype thắng, nút làm theo nghiệp vụ), D-134 (parity tham khảo) · **Q-V46-811-1 → 7** (cuối file, phương án mặc định chờ owner chốt)
- **Files touched:**
  - DB
    - `packages/db/prisma/schema/llm-config.prisma` (modify): model `LlmProvider` (`llm_providers`), `LlmCall` (`llm_calls`), `LlmUsageMonth` (`llm_usage_months`); giữ `LlmConfig` (không dùng nữa, xem SPEC 4)
    - `packages/db/prisma/migrations/20261113090000_v46_ai_providers/{migration,down}.sql` (create): 3 bảng, 6 dòng nhà cung cấp, chuyển dữ liệu từ `llm_configs`, `INSERT app_settings('ai', …)`, `INSERT app_settings('app', …)` (`ON CONFLICT DO NOTHING`), index
    - `packages/db/seed/catalog.ts` (modify: `APP_SETTINGS.ai`, `APP_SETTINGS.app`), `packages/db/seed/demo/*` (modify nếu seed đang tạo `llm_configs`)
  - Shared
    - `packages/shared/src/api-domains/ai-providers.ts` (create): `AI_PROVIDER_IDS` (`claude | openai | gemini | deepseek | usgate | custom`), `AI_PURPOSES` (`bot | script | content | mod`), `AI_PROVIDER_CATALOG` (tên, chữ đầu, URL mặc định, danh sách model, gợi ý key, chỗ lấy key — SPEC 1), `aiSettingsSchema`, `aiSettingsUpdateSchema`, `aiVerifySchema`, `aiVerifyResultSchema`, `aiSettingsResponseSchema`; `api-domains/index.ts` (modify: 1 dòng)
    - `packages/shared/src/api-domains/llm-config.ts` (modify: đánh dấu `@deprecated`, giữ export cho test cũ đến khi xoá; hoặc delete nếu không còn import — ghi completion)
    - `packages/shared/src/api-domains/app-notify.ts` (create): `APP_PUSH_KINDS` (`msg | need | renew | event | store`), `appNotifySettingsSchema`, `appNotifyPatchSchema`; `api-domains/index.ts` (modify)
    - `packages/shared/src/integrations/llm.ts` (modify): `llmLocalConfigSchema` thêm `temperature` 0..1 (tùy chọn); `llmCompletionSchema` đọc `usage.prompt_tokens / completion_tokens` (tùy chọn)
    - `packages/shared/src/ai/mask-pii.ts` (create): `maskPii(text)` (SPEC 12); export ở `packages/shared/src/index.ts` (modify: 1 dòng)
    - `packages/shared/src/mock-data/domains/ai-providers.ts`, `app-notify.ts` (create); `mock-data/domains/index.ts` (modify)
  - Integrations
    - `packages/integrations/src/llm/local.provider.ts` (modify): gửi `temperature`; tùy chọn `onUsage(usage, latencyMs)`; tùy chọn `transform(text)` áp vào mọi `content` trước khi gửi
    - `packages/integrations/src/llm/types.ts` (modify: `LlmUsage`), `local.spec.ts` (modify)
  - Server (`modules/llm-config`)
    - `apps/server/src/modules/llm-config/repositories/ai-provider.repository.ts`, `ai-call.repository.ts` (create)
    - `apps/server/src/modules/llm-config/services/ai-settings.service.ts` (create): đọc / lưu cấu hình, kiểm tra kết nối, audit
    - `apps/server/src/modules/llm-config/services/ai-router.service.ts` (create): chọn nhà cung cấp theo chức năng, dự phòng, ngân sách, ghi nhật ký (SPEC 7 → 11)
    - `apps/server/src/modules/llm-config/services/ai-budget.service.ts` (create): chi phí tháng (Redis + `llm_usage_months`)
    - `apps/server/src/modules/llm-config/llm-runtime.service.ts` (modify): thành lớp mỏng `forPurpose(purpose): LlmProvider` gọi `AiRouterService`; giữ rate limit 60 / phút
    - `apps/server/src/modules/llm-config/llm-config-cache.ts` (modify): cache theo `llm_providers` + `app_settings.ai`, kênh xoá cache giữ `llm:config:changed`
    - `apps/server/src/modules/llm-config/llm-config.controller.ts` (modify → thay route, SPEC 5), `llm-config.service.ts` (delete hoặc rút gọn còn facade — ghi completion), `llm-config-core.module.ts` (modify: provider mới, token `LLM_ROUTER`)
    - `apps/server/src/modules/llm-config/index.ts` (modify: export `LLM_ROUTER`, `type AiPurpose`)
    - `apps/server/src/common/integrations/llm-provider.ts` (modify: ngoài test trả router; test vẫn chọn fake / local theo `BOT_LLM_PROVIDER`)
  - Server (bot — chỉ đổi chỗ lấy LLM)
    - `apps/server/src/modules/bot/services/bot-turn-draft.service.ts` (modify: `router.forPurpose('bot')`)
    - `apps/server/src/modules/bot/bulk/bot-bulk-generation.service.ts` (modify: `router.forPurpose('script')`)
    - `apps/server/src/modules/bot/bot-core.module.ts` (modify nếu cần inject token mới)
  - Server (settings / system)
    - `apps/server/src/modules/settings/app-settings.service.ts` (modify: `SettingKey` thêm `'ai' | 'app'`, getter `ai()`, `app()`)
    - `apps/server/src/modules/settings/services/app-notify.service.ts`, `controllers/admin-app-notify.controller.ts` (create), `settings-http.module.ts` (modify)
    - `apps/server/src/modules/system/housekeeping.service.ts` (modify: bước `aiCalls` xoá `llm_calls` > 90 ngày theo lô), `apps/server/src/modules/system/system.module.ts` (modify: import `LlmConfigCoreModule`)
  - Admin
    - `apps/admin/src/features/settings/types.ts` (modify: `SETTINGS_TABS` chuyển `llm` lên sau `smtp`, thêm `app` sau `bank`; `TAB_KEY.app = 'settings.general'`; `TAB_ICON.app`)
    - `apps/admin/src/features/settings/components/settings-screen.tsx` (modify: 1 case `app`), `settings-nav.tsx` (modify nếu dòng phụ tab cần số "N nhà cung cấp đang bật")
    - `apps/admin/src/features/settings/components/llm-tab.tsx`, `llm-fields.tsx`, `llm.module.css` (delete) → `ai/ai-tab.tsx`, `ai/ai-provider-grid.tsx`, `ai/ai-provider-detail.tsx`, `ai/ai-allocation.tsx`, `ai/ai-limits.tsx`, `ai/ai.module.css` (create)
    - `apps/admin/src/features/settings/components/app-notify-tab.tsx`, `app-notify.module.css` (create)
    - `apps/admin/src/features/settings/ai-api.ts` (create, thay `llm-api.ts` — delete), `app-notify-api.ts` (create)
    - `apps/admin/src/features/settings/hooks/use-ai-settings.ts` (create, thay `use-llm-config.ts` — delete), `use-app-notify.ts` (create)
    - `apps/admin/src/mocks/handlers/llm-config.ts` (delete) → `ai-providers.ts`, `app-notify.ts` (create), `mocks/handlers/index.ts` (modify)
    - `apps/admin/messages/vi/settings.json` (modify: `tabs.llm` → "AI Provider", `tabSub.llm`, `tabs.app`, `tabSub.app`, khối `ai.*`, `app.*`; xoá khối `llm.*`)
  - Test
    - `packages/shared/src/api-domains/ai-providers.spec.ts`, `app-notify.spec.ts`, `packages/shared/src/ai/mask-pii.spec.ts` (create)
    - `apps/server/test/settings/ai-settings.int.spec.ts`, `ai-router.int.spec.ts`, `app-notify.int.spec.ts` (create)
    - `apps/server/test/settings/llm-config.int.spec.ts`, `llm-runtime.int.spec.ts` (modify → chuyển sang API mới, giữ ý kiểm: key không lộ, không fake ở runtime, rate limit)
    - `apps/server/test/system/housekeeping.int.spec.ts` (modify: bước `aiCalls`), `apps/server/test/audit/admin-audit-manifest.ts` (modify: route mới / bỏ route cũ)
    - `apps/server/test/bot/*` (modify chỉ khi phải đổi cách dựng cấu hình AI trong factory — giữ nguyên assertion)
    - `apps/admin/src/features/settings/components/ai/ai-tab.spec.tsx`, `app-notify-tab.spec.tsx` (create)
    - `e2e/behavior/llm-config.spec.ts` (modify → `ai-providers.spec.ts`), `e2e/behavior/app-notify.spec.ts` (create), `e2e/behavior/admin-price-config.spec.ts` (modify: thứ tự tab mới, giữ assertion khác)
    - `e2e/llm/*` (modify: cấu hình nhà cung cấp `custom` qua API mới cho lượt `@live`)
    - `e2e/parity/scenarios/admin-settings.ts` (modify: `D-V46-AI`, `D-V46-APP`)
  - Tài liệu
    - `docs/adr/0009-multi-ai-providers.md` (create): thay phần "một cấu hình" của ADR-0008, giữ phần còn lại
    - `coding-packs/reports/V4.6-progress.md` (dòng #11), `coding-packs/reports/ui-parity/{screens,questions,results}.md` + `results.json`, `coding-packs/reports/TIP-V46-811-completion.md`, `coding-packs/reports/TIP-V46-811-query-plans.md` (create), `coding-packs/standards/global/domain-glossary.md` ("AI Provider", "Phân bổ theo chức năng", "Nhà cung cấp dự phòng", "Ngân sách AI tháng")
- **Parallel-safe with:** sequential.
  - Chia `admin/features/settings/**`, `messages/vi/settings.json`, `mocks/handlers/index.ts`, `e2e/parity/scenarios/admin-settings.ts`, `settings/app-settings.service.ts` với V46-805 / 806 / 807 (đã merge).
  - Chia `apps/server/test/audit/admin-audit-manifest.ts` với 807 (đã merge) và mọi TIP thêm route Admin.
  - Chia `modules/bot/**` (2 file) — không TIP v4.6 nào khác đụng.
  - V46-812 (parity + nghiệm thu) chạy sau.

## CONTEXT

- Working dir: `D:\CODING\OPCHUB\CODING`. Nhánh `feature/TIP-V46-811-ai-providers-app-notify` tách từ `dev` `a99a6de4`.
- **DB:** 801 → 810 chạy trên `opchub_v46_801_dev` / `opchub_v46_801_test` + Redis `127.0.0.1:6381` (owner duyệt). Builder hỏi owner DB đích trước khi `migrate deploy` / int / e2e server / seed. Không reset DB native, không tắt tiến trình HOLD.
- Delta `SPEC-V4.6-DELTA.md`:
  - **P13**: Nhà cung cấp AI — nhiều nhà cung cấp (Media Soft, OpenAI-compatible tùy chỉnh), kiểm tra kết nối, phân bổ theo chức năng + dự phòng, max tokens, ngân sách tháng, cảnh báo %, nhật ký gọi AI 90 ngày, ẩn PII; code hiện là `llm-tab` một cấu hình.
  - **P14**: Ứng dụng & thông báo — bật PWA, 5 loại thông báo đẩy, gửi thử (BR-492, 493); Backend lớn (Web Push, VM-463) → D-125 chỉ lưu cấu hình.
- Đặc tả §33.4: BR-492 Admin bật / tắt cho phép cài OPC Hub lên màn hình chính; BR-493 5 loại thông báo đẩy bật / tắt riêng, có nút gửi thử; VM-463 dịch vụ đẩy chưa chọn. §33 không có quy tắc chi tiết cho AI Provider — **prototype là nguồn** (D-89).
- **Prototype `docs/spec/index.html` v4.6 — AI Provider** (markup 4859 → 4920, JS `_aiCfgV` 6309 → 6342):
  - **Tab**: `['ai','AI Provider','{N} nhà cung cấp đang bật']`, thứ 6, ngay sau "Gửi email (SMTP)".
  - **Thẻ 1 "Nhà cung cấp AI"**:
    - dòng phụ: "Kết nối API của các nhà cung cấp mô hình AI. Mỗi chức năng (bot, kịch bản, trợ lý…) chọn nhà cung cấp riêng ở mục bên dưới."
    - bộ đếm "{on} / 6 đang bật"
    - lưới 6 thẻ cố định, không thêm / xóa:

      | id | Tên | URL | Model | Gợi ý key | Chỗ lấy key |
      |---|---|---|---|---|---|
      | claude | Anthropic Claude | `https://api.anthropic.com/v1` | claude-sonnet-4-5, claude-opus-4-1, claude-haiku-4-5 | `sk-ant-…` | console.anthropic.com › API Keys |
      | openai | OpenAI | `https://api.openai.com/v1` | gpt-4.1, gpt-4.1-mini, gpt-4o | `sk-…` | platform.openai.com › API keys |
      | gemini | Google Gemini | `https://generativelanguage.googleapis.com/v1beta` | gemini-2.5-pro, gemini-2.5-flash | `AIza…` | aistudio.google.com › Get API key |
      | deepseek | DeepSeek | `https://api.deepseek.com/v1` | deepseek-chat, deepseek-reasoner | `sk-…` | platform.deepseek.com › API keys |
      | usgate | USGate (AI Gateway) | `https://gateway.usgate.vn/v1` | auto, claude-sonnet-4-5, gpt-4.1-mini, gemini-2.5-flash | `usg_…` | Media Soft cấp · tương thích OpenAI |
      | custom | Tùy chỉnh (OpenAI-compatible) | (trống) | tự nhập (placeholder "vd. llama-3.1-70b") | API key | Máy chủ tự host / nhà cung cấp khác |

    - mỗi thẻ: chữ đầu màu, tên, chấm trạng thái, "{trạng thái} · {model}" hoặc "Đang tắt · —"; trạng thái ok "Kết nối tốt" `#52C41A`, err "Lỗi kết nối" `#FF4D4F`, none "Chưa kiểm tra" `#BFBFBF`
  - **Chi tiết nhà cung cấp đang chọn**:
    - "Lấy API key tại: {chỗ lấy key}"
    - công tắc "Bật kết nối" (toast "Đã bật / Đã tắt {tên}")
    - "API key" (ô mật khẩu, nút "Hiện" / "Ẩn", dưới hiện key che chỉ để 4 ký tự cuối)
    - "Mô hình mặc định" (select; custom là ô chữ), "Base URL (endpoint)" (placeholder `https://…/v1`)
    - chân: "{trạng thái} · Kiểm tra lần cuối {t}" / "Chưa kiểm tra kết nối"
    - ghi chú "API key được mã hóa khi lưu trên máy chủ và chỉ hiển thị 4 ký tự cuối. Không chia sẻ key cho thành viên."
    - "Kiểm tra kết nối" ("Đang kiểm tra…"): key trống → "Vui lòng nhập API key"; thành công "{tên} · kết nối thành công ({model})"; lỗi "Không kết nối được {tên} · kiểm tra API key"
  - **Thẻ "Phân bổ theo chức năng"**:
    - dòng phụ: "Chỉ chọn được nhà cung cấp đang bật. Khi nhà cung cấp chính lỗi, hệ thống tự chuyển sang nhà cung cấp dự phòng."
    - mỗi dòng: nhãn + mô tả + 1 select ("— Không dùng —" + nhà cung cấp đang bật):
      - bot "Bot tương tác tự động" / "Trả lời từng tin trong nhóm cộng đồng" [claude]
      - script "AI tạo kịch bản hội thoại" / "Sinh kịch bản hàng loạt, không trùng lặp" [claude]
      - ~~assist "Trợ lý OPC Hub (widget)"~~ — **ẩn (D-124)**
      - content "Soạn nội dung" / "Gợi ý mô tả gian hàng, dự án, email" [claude]
      - mod "Kiểm duyệt tin nhạy cảm" / "Phân loại tin vi phạm trước khi ẩn" [usgate]
    - dòng cuối "Nhà cung cấp dự phòng" / "Dùng khi nhà cung cấp chính hết hạn mức hoặc lỗi" [usgate]
  - **Thẻ "Tham số & hạn mức"**:
    - "Temperature (0–1)" 0.7, "Max tokens / phản hồi" 1024, "Ngân sách tháng (đ)" 5000000, "Cảnh báo khi đạt (%)" 80
    - "Chi phí AI tháng {MM/YYYY}" "{đã dùng} / {ngân sách} · {pct}%", thanh `#FA8C16` khi ≥ cảnh báo, ngược lại `#1677FF`
    - chữ "Hết ngân sách: tạm dừng bot tự động, các chức năng khác chuyển sang nhà cung cấp dự phòng."
    - công tắc "Lưu nhật ký gọi AI" / "Ghi chức năng, mô hình, số token, chi phí; lưu 90 ngày" (bật)
    - công tắc "Ẩn thông tin cá nhân trước khi gửi" / "Che số điện thoại, email, số tài khoản trong nội dung gửi cho AI" (bật)
    - nút "Lưu cấu hình": không có nhà cung cấp nào bật → "Cần bật ít nhất 1 nhà cung cấp AI"; thành công "Đã lưu cấu hình AI Provider" + nhật ký Admin
  - Prototype **không có**: bảng nhật ký gọi AI, giá theo token, công thức chi phí (chi phí tháng là số cứng 3.180.000đ), cảnh báo ngoài màu thanh.
- **Prototype — Ứng dụng & thông báo** (markup 5018 → 5023, JS 6537 → 6539):
  - Tab `['app','Ứng dụng & thông báo','PWA · thông báo đẩy']` sau "Đối soát ngân hàng", quyền `need.app = 'cfg'` → `settings.general`.
  - Tiêu đề "Ứng dụng di động & thông báo đẩy", dòng phụ "OPC Hub chạy như ứng dụng (PWA) trên điện thoại: cài lên màn hình chính, nhận thông báo đẩy, không cần tải từ kho ứng dụng."
  - Nút "Gửi thông báo thử" (trắng) + "Lưu cấu hình" (xanh).
  - Dòng PWA (icon điện thoại 44px nền `#E6F4FF`): "Cho phép cài ứng dụng OPC Hub" / bật "Đang bật · thành viên cài được OPC Hub lên màn hình chính", tắt "Đang tắt".
  - Khối "Loại thông báo đẩy":

    | key | Nhãn | Mô tả | Mặc định |
    |---|---|---|---|
    | msg | Tin nhắn mới trong nhóm | Khi có người nhắc tên hoặc trả lời | bật |
    | need | Nhu cầu phù hợp với gian hàng | AI gợi ý khi có nhu cầu mới cùng ngành / cùng tỉnh | bật |
    | renew | Nhắc gia hạn gói | Theo mốc 30 · 7 · 1 ngày | bật |
    | event | Sự kiện sắp diễn ra | Trước 1 ngày và 1 giờ | bật |
    | store | Lượt xem & liên hệ gian hàng | Tổng hợp hằng ngày | **tắt** |

  - "Lưu cấu hình" → toast "Đã lưu cấu hình ứng dụng & thông báo"; "Gửi thông báo thử" → thêm thông báo trong chuông "Thông báo thử từ OPC Hub" / "Thông báo đẩy đang hoạt động trên thiết bị của bạn." + toast "Đã gửi thông báo đẩy thử". Không có manifest / service worker / xin quyền thông báo.
- Code hiện tại (đọc trước):
  - **ADR-0008**: bảng `llm_configs` 1 dòng (`base_url`, `model`, `key_enc` SecretBox, `max_tokens` 16..1024, `timeout_ms`, `enabled`), không fake ở runtime, test bằng stub HTTP, rate limit 60 / phút, cache + pub/sub `llm:config:changed`.
  - **Server**:
    - `modules/llm-config/` gồm `llm-config.controller.ts` (`GET/PUT /admin/settings/llm`, `POST …/verify`, `settings.general`), `llm-config.service.ts` (khóa advisory 712001, key trống giữ key cũ, audit `llm.update` / `llm.verify`), `llm-config-cache.ts`, `llm-runtime.service.ts` (`IntegrationError('Chưa cấu hình AI')`), `llm-config-core.module.ts` (`@Global`, token `LLM`)
    - `common/integrations/llm-provider.ts`: ngoài test → runtime
  - **Chỗ gọi AI (chỉ bot)**:
    - `bot/services/bot-turn-draft.service.ts:40` `generateTurn` → chức năng **bot**
    - `bot/bulk/bot-bulk-generation.service.ts:22` `complete(…, {maxTokens:1024})` → chức năng **script**
    - Chưa có chỗ nào dùng **content** / **mod**.
  - **Adapter**:
    - `packages/integrations/src/llm/local.provider.ts`: OpenAI-compatible `POST {base}/chat/completions`, không gửi `temperature`, `llmCompletionSchema` bỏ qua `usage`
    - `LlmProvider { complete, generateTurn }` trả chuỗi
  - **Admin**: `features/settings/components/llm-tab.tsx` + `llm-fields.tsx` (tab "Cấu hình AI"), `llm-api.ts`, `hooks/use-llm-config.ts`, MSW `mocks/handlers/llm-config.ts`, `messages/vi/settings.json › llm.*`.
  - **Tab Cài đặt** (`types.ts`): `general, categories, roles, welcome-mail, smtp, price, renewal, bank, admins, audit-log, sso, languages, llm`.
  - **`app_settings`**: `AppSettingsService` (`SettingKey`, cache 60 giây; thiếu dòng → lỗi "chạy seed bắt buộc"); mẫu ghi 805 `renewal.service.ts:34-56` (khóa dòng, merge, audit diff, invalidate).
  - **Nhật ký / PII**: chưa có bảng gọi AI; chỉ có `maskEmail` (marketing) và redact log pino.
  - **Dọn dẹp**: `system/housekeeping.service.ts` (02:00, từng bước độc lập); mẫu xóa theo lô `account/repositories/refresh-token.repository.ts:77-86`.
  - **Thông báo**: bảng `notifications` dùng chung cho thành viên và TK quản trị (D-52); `NotificationService.notify(items)` export ở `modules/notification/index.ts`; chuông Admin `GET /notifications`.
  - **Portal**: không có manifest / service worker / Web Push.

## APPLICABLE STANDARDS

- [integrations/adapters](../standards/integrations/adapters.md): mọi nhà cung cấp qua adapter OpenAI-compatible `local.provider.ts`; test chỉ dùng stub HTTP (luật 11, D-103); không SDK mới
- [security/security](../standards/security/security.md): key mã hóa SecretBox, không trả / log / audit key; ẩn PII trước khi gửi; URL chỉ https (hoặc http loopback) như `llmLocalConfigSchema`
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md): bot lấy LLM qua token export của llm-config, không đọc bảng `llm_*`; housekeeping gọi service export
- [backend/api-conventions](../standards/backend/api-conventions.md) · [backend/auth-rbac](../standards/backend/auth-rbac.md): `settings.general` cho cả 2 tab
- [database/prisma-migrations](../standards/database/prisma-migrations.md) · [database/query-indexing](../standards/database/query-indexing.md): chuyển dữ liệu `llm_configs` trong migration, `down.sql`; nhật ký index `(created_at)` để dọn, xóa theo lô
- [frontend/data-state](../standards/frontend/data-state.md) · [frontend/antd-ui](../standards/frontend/antd-ui.md) · [frontend/ui-parity](../standards/frontend/ui-parity.md) (D-134)
- [testing/testing](../standards/testing/testing.md) · [global/code-structure](../standards/global/code-structure.md) · [global/domain-glossary](../standards/global/domain-glossary.md)

## TASK

Thay tab "Cấu hình AI" một cấu hình bằng tab **AI Provider** theo prototype v4.6:

- **Nhà cung cấp**: 6 nhà cung cấp cố định, mỗi cái có key mã hóa, model, base URL và nút kiểm tra kết nối.
- **Phân bổ**: mỗi chức năng (bot, kịch bản, soạn nội dung, kiểm duyệt; **ẩn Trợ lý**) chọn một nhà cung cấp; có nhà cung cấp dự phòng chung.
- **Tham số & hạn mức**: temperature, max tokens, ngân sách tháng (đ) và ngưỡng cảnh báo.
- **Nhật ký gọi AI** lưu 90 ngày; **ẩn PII** trước khi gửi.

Runtime định tuyến từng lời gọi của bot theo chức năng, chuyển sang dự phòng khi lỗi, và dừng bot khi hết ngân sách.

Thêm tab **Ứng dụng & thông báo** chỉ lưu cấu hình (D-125):

- bật / tắt PWA và 5 loại thông báo đẩy;
- "Gửi thông báo thử" tạo thông báo trong chuông của chính Admin.

Không làm Web Push / manifest.

## SPECIFICATIONS

### Nhà cung cấp

1. **Danh mục** `AI_PROVIDER_CATALOG` trong shared (tên, chữ đầu, URL mặc định, model, gợi ý key, chỗ lấy key) đúng bảng prototype ở CONTEXT.
   - Tất cả gọi qua adapter **OpenAI-compatible** sẵn có (**Q-V46-811-2**).
   - URL mặc định dùng endpoint tương thích OpenAI:
     - Gemini `https://generativelanguage.googleapis.com/v1beta/openai`
     - Claude `https://api.anthropic.com/v1`
     - các nhà cung cấp còn lại như prototype
   - Admin sửa được URL.
2. **Bảng `llm_providers`**: 6 dòng cố định, PK `id` theo `AI_PROVIDER_IDS`.
   - Cột: `enabled` (mặc định `false`), `base_url`, `model`, `key_enc Bytes?`, `status` (`none | ok | err`, mặc định `none`), `checked_at`, `price_in`, `price_out` (đ / 1 triệu token, số nguyên ≥ 0, mặc định 0 — **Q-V46-811-1**), `updated_at`.
   - `CHECK (enabled = false OR (base_url <> '' AND model <> '' AND key_enc IS NOT NULL))`.
3. **Key**:
   - SecretBox như ADR-0008; API chỉ trả `hasKey` + `keyLast4`.
   - Key trống khi lưu → giữ key cũ. Có nút "Xóa key" không? Prototype không có → **không có**.
   - Sửa key ở FE → trạng thái hiển thị về "Chưa kiểm tra" (chưa lưu).
4. **Chuyển dữ liệu cũ** (migration):
   - `llm_configs` có dòng có key → chép `base_url`, `model`, `key_enc`, `enabled` vào `llm_providers.custom`; `app_settings.ai.use.bot = use.script = 'custom'`; `max_tokens` → `ai.maxTokens`; `timeout_ms` → `ai.timeoutMs`.
   - Không có thì mọi nhà cung cấp tắt, `use` theo mặc định prototype, `fallback` = `usgate`.
   - `llm_configs` **giữ nguyên, không đọc nữa** (xóa ở TIP sau; `down.sql` xóa 3 bảng mới + 2 key `app_settings`).

### API (`settings.general`)

5. Route mới thay `/admin/settings/llm`:
   - `GET /v1/admin/settings/ai` → `aiSettingsResponseSchema`:

     ```ts
     {
       providers: [{ id, enabled, baseUrl, model, hasKey, keyLast4, status, checkedAt, priceIn, priceOut }],
       use: { bot, script, content, mod },
       fallback,
       temperature, maxTokens, budget, warnPct, log, pii,
       spend: { month, cost, pct },
     }
     ```

   - `PUT /v1/admin/settings/ai` (nút "Lưu cấu hình"): toàn bộ cấu hình, `providers[].key?` (trống = giữ).
     - Kiểm:
       - có ≥ 1 nhà cung cấp bật, ngược lại 409 "Cần bật ít nhất 1 nhà cung cấp AI";
       - bật mà thiếu key / URL / model → 409 "{tên}: thiếu API key / Base URL / mô hình";
       - `use.*` và `fallback` chỉ là `''` hoặc id nhà cung cấp **đang bật**, ngược lại 400;
       - `fallback` khác `use.*` được phép trùng.
     - Một transaction, khóa advisory như cũ (712001). Audit `llm.update`: diff không chứa key, chỉ `keyChanged: [id]`. Xóa cache.
   - `POST /v1/admin/settings/ai/providers/:id/verify` body `{ key?, baseUrl, model }`:
     - key trống → dùng key đã lưu; cả hai trống → 400 "Vui lòng nhập API key";
     - gọi `complete('Reply with OK.', { maxTokens: 16 })` qua adapter với timeout cấu hình;
     - ghi `status` + `checked_at` vào dòng nhà cung cấp (kể cả khi cấu hình chưa lưu), audit `llm.verify`;
     - trả `{ ok, message }`, **không** lộ lỗi thô.
   - Route `/admin/settings/llm*` cũ: **xóa**; cập nhật manifest audit 807 + test liên quan.

### Định tuyến lúc chạy (`AiRouterService`)

6. `LLM_ROUTER.forPurpose(purpose)` trả `LlmProvider`:
   - bot `generateTurn` → `forPurpose('bot')`
   - bulk `complete` → `forPurpose('script')`
   - `content`, `mod` chưa có chỗ gọi (**Q-V46-811-3**); router vẫn hỗ trợ.
7. **Chọn**:
   - `use[purpose]` rỗng → `IntegrationError('Chức năng chưa chọn nhà cung cấp AI', false)`.
   - Nhà cung cấp chính tắt / thiếu key → dùng `fallback` nếu hợp lệ.
   - Không có ai → `IntegrationError('Chưa cấu hình AI', false)` như ADR-0008 (không fake).
8. **Dự phòng khi lỗi**: nhà cung cấp chính ném `IntegrationError` **retryable** (mạng, timeout, 429, 5xx) → thử **một lần** với `fallback` (nếu khác nhà cung cấp chính và bật).
   - Lỗi không retryable (key sai, 400, nội dung không hợp lệ) **không** chuyển dự phòng, ném tiếp.
   - Không thử lại vòng.
9. **Ngân sách** (đ, tháng theo giờ VN):
   - `cost = round(prompt_tokens × price_in / 1e6 + completion_tokens × price_out / 1e6)`;
   - giá 0 hoặc không có `usage` → cost 0 (vẫn ghi token nếu có).
   - Chi phí tháng: `llm_usage_months (month PK 'YYYY-MM', cost, prompt_tokens, completion_tokens, calls)`, cập nhật bằng `INSERT … ON CONFLICT DO UPDATE SET cost = cost + $c` trong cùng lời gọi ghi nhật ký; đọc qua Redis `llm:spend:{month}` 60 giây.
   - **Hết ngân sách** (`budget > 0` và chi phí tháng ≥ `budget`; **Q-V46-811-4** mặc định theo chữ prototype):
     - `bot` → `IntegrationError('Hết ngân sách AI tháng', false)`, bot không trả lời (job bot xử lý như lỗi không retryable hiện có);
     - chức năng khác → dùng `fallback`, vẫn cộng chi phí.
     - `budget = 0` = không giới hạn.
   - **Cảnh báo**: chỉ màu thanh như prototype (không gửi thông báo — Q-V46-811-4).
10. **Tham số** chung cho mọi lời gọi:
    - `temperature` 0..1 (1 chữ số thập phân) gửi trong body;
    - `maxTokens` 16..1024 (giữ trần ADR-0008; bulk vẫn xin 1024 → `min(1024, maxTokens)`);
    - `timeoutMs` giữ giá trị cũ (mặc định 60000), không hiện trên màn (prototype không có).
    - Rate limit 60 / phút giữ nguyên (đếm mọi chức năng).
11. **Nhật ký gọi AI** `llm_calls`:
    - Cột: `id`, `created_at`, `purpose`, `provider`, `model`, `prompt_tokens`, `completion_tokens`, `cost`, `latency_ms`, `status` (`ok | error | fallback`), `error_code` (ngắn).
    - **Không** lưu nội dung prompt / câu trả lời.
    - Ghi khi `ai.log = true` (1 dòng / lần gọi mạng, gồm cả lượt dự phòng). `llm_usage_months` **luôn** cập nhật (cần cho ngân sách) kể cả khi tắt nhật ký.
    - Index `(created_at)`.
    - Housekeeping bước `aiCalls`: xóa `created_at < now − 90 ngày` theo lô 5.000.
    - Không có màn xem nhật ký (prototype không có — **Q-V46-811-5**).
12. **Ẩn PII** `maskPii(text)` (bật mặc định), áp cho **mọi** `content` gửi đi (system + user, cả JSON context của bot) qua `transform` của adapter. Thay:
    - email → `[email]`
    - SĐT Việt Nam (`(\+84|0)` + 9 số, cho phép dấu cách / chấm / gạch giữa nhóm) → `[SĐT]`
    - dãy 9–19 chữ số còn lại (số tài khoản / thẻ) → `[STK]`

    Không đụng mã TV (`TV` + 6 số). Có unit test từng mẫu.

### Giao diện AI Provider

13. Tab **"AI Provider"** (đổi nhãn từ "Cấu hình AI"):
    - dòng phụ tab "{N} nhà cung cấp đang bật" (N từ dữ liệu đã lưu);
    - vị trí ngay sau "Gửi email (SMTP)" như prototype; URL giữ `?tab=llm`.
14. Bố cục / chữ / màu đúng prototype ở CONTEXT:
    - thẻ lưới 6 nhà cung cấp (bấm chọn), chi tiết nhà cung cấp đang chọn, "Phân bổ theo chức năng" (4 dòng, **không** có dòng Trợ lý), "Tham số & hạn mức", một nút "Lưu cấu hình";
    - thêm 2 ô "Giá vào / Giá ra (đ / 1 triệu token)" trong chi tiết nhà cung cấp, dưới "Base URL" (**Q-V46-811-1**, lệch prototype — ghi D-xx);
    - sửa trên màn là bản nháp; công tắc "Bật kết nối" hiện toast như prototype nhưng chỉ lưu khi bấm "Lưu cấu hình";
    - rời tab khi có thay đổi chưa lưu → hỏi xác nhận (mẫu các tab Cài đặt khác nếu có; không có thì SKIP, ghi completion);
    - select phân bổ chỉ liệt kê nhà cung cấp **đang bật trong bản nháp**; tắt một nhà cung cấp đang được chọn → select về "— Không dùng —" và hiện viền cảnh báo.
15. "Chi phí AI tháng {MM/YYYY}" lấy `spend` từ API (số thật, không cứng): `pct = min(100, round(cost × 100 / budget))`, `budget = 0` → ẩn thanh, hiện "Không giới hạn".

### Ứng dụng & thông báo (D-125)

16. `app_settings.app = { pwa: true, push: { msg: true, need: true, renew: true, event: true, store: false } }` (migration + seed).
17. API (`settings.general`):
    - `GET /v1/admin/settings/app`
    - `PATCH /v1/admin/settings/app` body `appNotifyPatchSchema` (strict, merge một phần) → khóa dòng, merge, audit `settings.app` (diff), xóa cache (mẫu 805)
    - `POST /v1/admin/settings/app/test` → `NotificationService.notify([{ userId: admin.id, type: 'system', title: 'Thông báo thử từ OPC Hub', body: 'Thông báo đẩy đang hoạt động trên thiết bị của bạn.' }])` vào chuông Admin, **không** Web Push; audit `settings.app_test`; trả 201
18. **UI** tab "Ứng dụng & thông báo" (dòng phụ "PWA · thông báo đẩy"), sau "Đối soát ngân hàng", đúng chữ / bố cục prototype:
    - công tắc là bản nháp, "Lưu cấu hình" → PATCH → toast "Đã lưu cấu hình ứng dụng & thông báo";
    - "Gửi thông báo thử" → POST → toast "Đã gửi thông báo đẩy thử", chuông Admin có thông báo mới;
    - không bắt "ít nhất 1 loại" (prototype không bắt).
19. Cấu hình **không có tác dụng** ở Portal trong TIP này (**Q-V46-811-6**): không manifest, không service worker, không gửi đẩy; thông báo trong app hiện có không đổi. Ghi rõ dòng nhỏ dưới tiêu đề? Prototype không có → **không thêm chữ**; ghi completion + glossary.

### Validation

- `aiSettingsUpdateSchema`:
  - `temperature` number 0..1, bước 0.1
  - `maxTokens` int 16..1024
  - `budget` int 0..1e12 (đ)
  - `warnPct` int 1..100
  - `priceIn` / `priceOut` int 0..1e9
  - `baseUrl` theo `llmLocalConfigSchema` (https / loopback, không credentials)
  - `model` 1..200
  - `key` ≤ 500, trim
  - `use` / `fallback` ∈ `'' | AI_PROVIDER_IDS`
  - `use` **không** có khóa `assist`
  - `strict`
- `appNotifyPatchSchema`: `{ pwa?: boolean, push?: Partial<Record<AppPushKind, boolean>> }.strict()`.
- Response parse bằng schema shared ở server test, MSW, FE.

### Error Handling

| Trường hợp | Kết quả |
|---|---|
| Lưu khi không nhà cung cấp nào bật | 409 "Cần bật ít nhất 1 nhà cung cấp AI" |
| Bật nhà cung cấp thiếu key / URL / model | 409 "{tên}: thiếu …" |
| `use` / `fallback` trỏ nhà cung cấp tắt | 400 |
| Kiểm tra kết nối lỗi | 200 `{ ok: false, message: "Không kết nối được {tên} · kiểm tra API key" }`, `status = err` |
| Kiểm tra khi chưa có key | 400 "Vui lòng nhập API key" |
| Chạy bot khi chức năng chưa chọn / chưa cấu hình | `IntegrationError` không retryable; bot không trả lời (hành vi ADR-0008) |
| Hết ngân sách | bot dừng; script dùng dự phòng |
| Nhà cung cấp chính lỗi mạng / 429 / 5xx | thử 1 lần dự phòng; nhật ký `status = fallback` |
| `DATA_ENC_KEY` đổi, không giải mã được key | nhà cung cấp coi như thiếu key; log lỗi (không log key) |
| Thiếu `settings.general` | 403 cả 2 tab |

## ACCEPTANCE CRITERIA

- **Chuyển dữ liệu** Given `llm_configs` có cấu hình đang bật When migrate Then `llm_providers.custom` bật với cùng URL / model / key (giải mã được), `use.bot = use.script = 'custom'`, bot vẫn trả lời qua stub như trước (int `ai-settings.int.spec.ts` › `migrate llm_configs`).
- **Lưu / key** Given Admin bật Claude với key `sk-ant-…` When Lưu Then:
  - GET chỉ có `hasKey`, `keyLast4`;
  - audit `llm.update` không chứa key;
  - lưu lại với key trống giữ key cũ;
  - bật OpenAI thiếu key → 409;
  - tắt hết → 409 "Cần bật ít nhất 1 nhà cung cấp AI".

  Test: int `› save`.
- **Kiểm tra kết nối** Given stub HTTP trả OK When "Kiểm tra kết nối" Then toast "{tên} · kết nối thành công ({model})", thẻ "Kết nối tốt", `checked_at` lưu. Stub 401 → "Không kết nối được {tên} · kiểm tra API key", "Lỗi kết nối" (int `› verify`; unit `ai-tab.spec.tsx`; e2e `ai-providers.spec.ts` › `verify`).
- **D-124** Then thẻ "Phân bổ theo chức năng" có đúng 4 dòng Bot / Kịch bản / Soạn nội dung / Kiểm duyệt + dòng dự phòng, **không** có "Trợ lý OPC Hub (widget)"; API từ chối khóa `use.assist` (unit + int).
- **Định tuyến** Given `use.bot = claude`, `use.script = usgate` (stub riêng) When bot trả lời và chạy AI tạo kịch bản Then lời gọi đi đúng stub; `llm_calls` có `purpose` đúng (int `ai-router.int.spec.ts` › `route by purpose`).
- **Dự phòng** Given stub chính trả 503 When bot gọi Then thử stub dự phòng 1 lần, thành công; `llm_calls` 2 dòng (`error`, `fallback`). Stub chính trả 401 → **không** dự phòng, bot lỗi (int `› fallback`).
- **Ngân sách** Given giá vào 10.000đ / ra 30.000đ mỗi 1 triệu token, stub trả `usage` 1.000 / 500 Then `cost` = 25đ / lời gọi; `llm_usage_months` cộng đúng.
  - `budget` = 50đ, sau 2 lời gọi: bot → lỗi "Hết ngân sách AI tháng"; script → đi dự phòng.
  - `budget = 0` → không giới hạn.

  Test: int `› budget`.
- **Nhật ký** Given `log = false` Then không ghi `llm_calls` nhưng `llm_usage_months` vẫn cộng; `llm_calls` không có cột nội dung; housekeeping xóa dòng > 90 ngày, giữ dòng 89 ngày (int `› log`, `housekeeping.int.spec.ts` › `aiCalls`).
- **Ẩn PII** (unit `mask-pii.spec.ts`):
  - `0912 345 678`, `+84912345678`, `a.b@x.vn`, `1203132809` bị thay;
  - `TV000123` giữ nguyên.

  Int: `pii = true` → body gửi tới stub không chứa SĐT / email trong lịch sử phòng; `pii = false` → giữ nguyên.
- **Temperature / max tokens** Then body gửi stub có `temperature: 0.7`, `max_tokens ≤ maxTokens` (int).
- **App & thông báo** Given mặc định Then PWA bật, 4 loại bật, "Lượt xem & liên hệ gian hàng" tắt.
  - Gạt + "Lưu cấu hình" → toast "Đã lưu cấu hình ứng dụng & thông báo", F5 giữ, audit `settings.app`.
  - "Gửi thông báo thử" → chuông Admin có "Thông báo thử từ OPC Hub", toast "Đã gửi thông báo đẩy thử", không gọi dịch vụ ngoài.

  Test: int `app-notify.int.spec.ts`; unit; e2e `app-notify.spec.ts`.
- **Quyền** Given vai trò không có `settings.general` Then không thấy 2 tab, API 403 (int).
- **Tab** Then thứ tự tab: Chung, Danh mục lĩnh vực, Vai trò & phân quyền, Email chào mừng, Gửi email (SMTP), **AI Provider**, Cấu hình bảng giá, Nhắc gia hạn, Đối soát ngân hàng, **Ứng dụng & thông báo**, Tài khoản quản trị, Nhật ký hoạt động, (SSO, Ngôn ngữ — ngoài prototype, giữ cuối) (e2e `admin-price-config.spec.ts` cập nhật thứ tự).
- **Không hồi quy**: toàn bộ `apps/server/test/bot/*`, `bot-replies.spec.ts`, `bot-bulk-*.spec.ts`, `llm-runtime` (không fake ở runtime, rate limit 60 / phút), e2e MSW không tụt so với `dev`; `@live` (`e2e/llm/*`) chạy lại với nhà cung cấp `custom` nếu có key — không có thì ghi "chưa chạy".
- **Parity (D-134, tham khảo)**: `D-V46-AI`, `D-V46-APP` ở 1440 + 390. Ghi % + nguyên nhân phần > 3%:
  - dữ liệu: nhà cung cấp seed tắt, chi phí thật;
  - D-124: không có dòng Trợ lý;
  - Q-V46-811-1: ô giá.

  Lệch giao diện thật phải sửa.

## CONSTRAINTS

- DO NOT:
  - thêm SDK nhà cung cấp; gọi API thật trong test (chỉ stub HTTP, luật 11)
  - rơi về provider fake ở runtime (ADR-0008)
  - lưu / trả / log / audit key rõ; lưu nội dung prompt / câu trả lời vào nhật ký
  - hiện dòng "Trợ lý OPC Hub (widget)" hoặc nhận `use.assist` (D-124)
  - làm Web Push, service worker, manifest PWA, xin quyền thông báo, gửi email / Zalo khi "Gửi thông báo thử" (D-125)
  - cho bot đọc bảng `llm_*`; query trong vòng lặp; `select *`
  - xóa bảng `llm_configs` trong TIP này
  - `any`, `@ts-ignore`, `console.*`; sửa `.env` thật; mask / nới assertion (D-134)
- REUSE:
  - `LocalLlmProvider`, `llmLocalConfigSchema`, `SecretBox`, `LlmConfigCache` (pub/sub), khóa advisory 712001, rate limit Redis hiện có
  - `AppSettingsService` + mẫu ghi `renewal.service.ts`, `NotificationService.notify`
  - mẫu xóa theo lô `refresh-token.repository.ts`, `HousekeepingService` từng bước
  - `Switch`, `use-settings-mutation.ts`, `maskEmail` (tham khảo cho `maskPii`)
- SKIP:
  - Màn xem / lọc / xuất nhật ký gọi AI (Q-V46-811-5)
  - Thông báo / email khi chạm ngưỡng cảnh báo hoặc hết ngân sách (Q-V46-811-4)
  - Dùng AI cho Soạn nội dung / Kiểm duyệt (chưa có chức năng)
  - Web Push / PWA thật (VM-463, D-125); áp cấu hình loại thông báo vào thông báo trong app
  - Chọn model theo từng chức năng (prototype chỉ chọn nhà cung cấp)
  - Xóa `llm_configs`, bỏ `BOT_LLM_PROVIDER` khỏi test

## Câu hỏi chờ owner chốt (phương án mặc định đã ghi trong SPEC; builder dùng mặc định nếu owner chưa trả lời, ghi completion)

- **Q-V46-811-1 Tính chi phí cho ngân sách tháng.** Prototype có ô ngân sách (đ) nhưng không có giá token, và chi phí là số cứng.
  - **Mặc định:** thêm 2 ô "Giá vào / Giá ra (đ / 1 triệu token)" cho từng nhà cung cấp, mặc định 0 (= không tính tiền).
  - Phương án khác: ngân sách tính theo số token thay vì tiền.
- **Q-V46-811-2 Claude / Gemini / DeepSeek gọi thế nào.** Adapter hiện chỉ có chuẩn OpenAI.
  - **Mặc định:** mọi nhà cung cấp gọi qua endpoint tương thích OpenAI của họ. Gemini đổi URL mặc định thành `…/v1beta/openai` (khác prototype). Không thêm SDK.
- **Q-V46-811-3 Dòng "Soạn nội dung" và "Kiểm duyệt tin nhạy cảm".** Hiện chưa có chức năng nào gọi AI cho 2 việc này.
  - **Mặc định:** vẫn hiện và lưu như prototype; chưa có tác dụng cho đến khi có chức năng.
- **Q-V46-811-4 Hết ngân sách và cảnh báo.**
  - **Mặc định:** theo chữ prototype — hết ngân sách thì bot dừng, kịch bản AI chuyển sang dự phòng (vẫn tính tiền); cảnh báo chỉ là thanh đổi màu cam, không gửi thông báo.
- **Q-V46-811-5 Xem nhật ký gọi AI.** Prototype chỉ có công tắc.
  - **Mặc định:** lưu DB 90 ngày, chưa có màn xem.
- **Q-V46-811-6 Cấu hình PWA / thông báo đẩy.** D-125 chỉ lưu cấu hình.
  - **Mặc định:** chưa ảnh hưởng gì ở Portal; "Gửi thông báo thử" chỉ tạo thông báo trong chuông của Admin đang bấm.
- **Q-V46-811-7 Lưu cấu hình AI.** Prototype đổi ngay khi gạt, chỉ toast lúc Lưu.
  - **Mặc định:** sửa là bản nháp, chỉ lưu khi bấm "Lưu cấu hình" (cả 2 tab), tránh tắt nhầm AI đang chạy.

Ghi 7 câu vào `reports/ui-parity/questions.md` › V4.6 (dạng "mặc định, chờ owner").

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-811-ai-providers-app-notify`; chỉ sửa file trong **Files touched** (thêm ngoài danh sách → ghi lý do)
- [ ] Hỏi owner DB đích trước khi `migrate deploy` / int / e2e server / seed; migration `--create-only` rồi sửa SQL (chuyển `llm_configs`), có `down.sql`; thử migrate trên bản sao có `llm_configs` đang bật
- [ ] Viết `docs/adr/0009-multi-ai-providers.md` (đổi kiến trúc so với ADR-0008)
- [ ] Đo baseline `dev` trước (int bot + settings, e2e MSW, `llm-config.spec.ts`, `bot-*`) để tách lỗi cũ / mới
- [ ] Mỗi AC có test đúng tên, ghi PASS / FAIL thật từng cái
- [ ] Chạy và dán tóm tắt output thật: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`; `pnpm e2e` MSW không tụt; e2e server cho `ai-providers.spec.ts`, `app-notify.spec.ts`, `bot-replies.spec.ts`; `@live` nếu có key (không có → ghi "chưa chạy")
- [ ] EXPLAIN xóa `llm_calls` theo lô + cập nhật `llm_usage_months` → `TIP-V46-811-query-plans.md`
- [ ] Parity (D-134): `D-V46-AI`, `D-V46-APP` 1440 + 390, ghi % + nguyên nhân; sửa hết lệch giao diện thật
- [ ] Luật BUILDER-HANDOFF liên quan:
  - **Luật 11 / ADR-0008**: mọi nhà cung cấp qua adapter OpenAI-compatible; test chỉ stub HTTP; không fake ở runtime
  - **Luật 12 / bảo mật**: key SecretBox, không trả / log / audit key; ẩn PII trước khi gửi; nhật ký không lưu nội dung
  - **Luật 10**: lưu cấu hình AI, kiểm tra kết nối, lưu cấu hình app, gửi thử đều ghi `audit_logs`
  - **D-124 / D-125**: không dòng Trợ lý; không Web Push / manifest
  - **Luật 9**: ngân sách / giá / chi phí là số nguyên VND; tháng theo `Asia/Ho_Chi_Minh`
- [ ] File ≤ trần (BE 600, FE 400); không `any` / `@ts-ignore` / `console.*`
- [ ] Ghi Q-V46-811-1 → 7 vào `questions.md`; cập nhật `V4.6-progress.md` dòng #11; glossary
- [ ] Sau khi đo: chạy lại seed demo (native HOLD); không tắt tiến trình HOLD
- [ ] Commit theo bước `git commit -- <paths>` (cấm `git add -A`); `git status --short` sạch; push; PR `base: dev`, không tự merge; completion report có **git commit SHA**, PR, số test thật, parity (tham khảo), EXPLAIN, soát luật cứng 1–14, phần chưa làm
- [ ] KHÔNG báo DONE nếu còn gate đỏ (lint / type / unit / int / e2e / depcheck / build); parity theo D-134 không chặn nhưng phải có nguyên nhân

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ (ID, module, priority P2, depends, estimate L, REQ / D)
- [x] Context: DB đích, delta P13 / P14, BR-492 / 493, VM-463, prototype 2 màn đủ chữ / số đo / mặc định, code hiện tại (ADR-0008, 3 chỗ gọi AI, adapter, tab, `app_settings`, housekeeping, notification)
- [x] Task rõ + SKIP (màn nhật ký, cảnh báo gửi tin, content / mod, Web Push, model theo chức năng, xóa `llm_configs`)
- [x] Business rules đánh số 1 → 19, validation, bảng lỗi
- [x] AC Given / When / Then có tên test: chuyển dữ liệu, lưu / key, kiểm tra kết nối, D-124, định tuyến, dự phòng, ngân sách, nhật ký, PII, tham số, app & thông báo, quyền, thứ tự tab, không hồi quy, parity
- [x] Constraints DO NOT / REUSE / SKIP
- [x] Applicable Standards từ `standards/README.md`
- [x] Files touched mức file; Parallel-safe: sequential (settings đã merge 805 → 807; trước 812)
- [x] BUILDER-CHECKLIST trích luật 9 / 10 / 11 / 12, ADR-0008, D-124 / D-125
- ⚠️ Gap:
  - TIP lớn: đổi mô hình AI từ 1 cấu hình sang 6 nhà cung cấp, kèm migration dữ liệu và ADR mới. Nếu vượt phạm vi một PR, builder có thể tách thành 2 commit lớn (server + Admin) trong cùng nhánh, không tách TIP.
  - Endpoint tương thích OpenAI của Claude / Gemini mới chỉ dựa trên tài liệu của họ, chưa kiểm bằng key thật. `@live` chỉ chạy được khi owner cấp key.
  - Danh sách model lấy từ prototype có thể cũ. Admin chọn trong danh sách, riêng "Tùy chỉnh" gõ tự do. Thêm model mới phải sửa `AI_PROVIDER_CATALOG`.
  - Q-V46-811-1 → 7 chưa chốt. Mặc định giữ an toàn: không fake, không lộ key / nội dung, giá 0 = không chặn bot.

## Execution refinements (builder,06/11/2026)

- Owner explicitly confirmed private801 DB pair, Memurai6381 and private810→811 rolling restart. Native original DBs/Redis6379 are not targets.
- ai-provider-catalog.ts separates immutable catalog from contracts. aiKeyLast4 redacts an entire credential of length≤4 rather than disclose it in the last-four label.
- ai-config-cache.ts owns multi-provider snapshot/decryption; legacy llm-config-cache/service files are1-line compatibility facades, never read llm_configs. Runtime always reads a repeatable configuration revision so missed pub/sub cannot preserve a disabled key.
- Ai provider repository writes six records in one parameterized statement. Call repository exports exact production retention/upsert SQL for plan tests; bigint aggregate money/tokens/calls follow database standard.
- Added ai-migration.int.spec.ts and ai-plans.int.spec.ts separately, plus helpers/ai-config.ts and additive HTTP stub usage/503/429 modes; existing worker assertions retained.
- AI provider fields/key subview and AppNotifyPwa are extracted to independent components/types to preserve80-line function and400-line FE caps.
- settings/index.ts no longer exports HTTP bootstrap; api/api-app.module.ts imports SettingsHttpModule directly. This removes the newly exposed settings→notification→mail→settings cycle without forwardRef or internal service imports across domains.
- Existing MSW llm-config-handlers.spec.ts migrates its security/permission/retention assertions to the new contract rather than deleting coverage. Old /llm handlers/UI API/hooks are removed; old shared schema remains deprecated for imports.
- e2e/llm/settings-session.ts provides identical API-backed prerequisites to both modes. Bulk provider setup migrates endpoint/contracts; disabling test generation clears allocation while retaining an unused enabled provider, as the new API forbids all-off.
- Native original AI/App settings are backed up in an ignored local fixture (encrypted bytes only), to restore after native browser tests. Native bot regression will use an actual local HTTP stub through the development runtime router, not fake runtime or changed assertions.
- W1/TEST-GAPS.md receives an additive REQ628/629 traceability entry; no historic finding status changed.

- Canonical API provider ordering matches the six-card catalog in both modes; physical fallback requests also consume the shared60/min counter. New fallback tests assert no extra network request once the shared ceiling is exhausted.

- Final native evidence refinements: ai-call.repository.ts + schema/llm-config.prisma use the shared UUIDv7 client default (no SQL migration rewrite). mask-pii.ts/spec.ts preserve complete resource UUIDs rather than masking numeric UUID tails as bank accounts.
- ai-migration.int.spec.ts additionally sends an actual HTTP request with the migrated/decrypted key, exact URL/model. e2e/llm/reply-provider-setup.ts supplies a native-only HTTP prerequisite after demoReset; bot-replies.spec.ts retains every original assertion/timeout and closes the stub in finally. No fake development runtime.
- Catalog visual correction follows the inspected prototype USGate blue #0958D9 and custom + / #595959. No prototype implementation code copied.

- Final paired mobile capture found two remaining layout issues: provider count belongs below the intro, and verify action below its status. ai-tab.tsx/ai.module.css use mobile-only grid areas/footer stacking; desktop and all assertions unchanged. AI UI2/2, root lint/type and both Admin builds pass before committing.
