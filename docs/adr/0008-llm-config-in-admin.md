# ADR-0008: Cấu hình nhà cung cấp AI (LLM) trong Admin thay cho biến môi trường

- Status: Accepted
- Date: 2026-10-27

## Context

Bot dùng LLM qua adapter `packages/integrations/llm`. Hiện provider chọn bằng env
(`BOT_LLM_PROVIDER=fake|local`, `LLM_LOCAL_BASE`, `LLM_LOCAL_KEY`, `LLM_LOCAL_MODELS`) và mặc định `fake`.
D-99 (owner, 27/10/2026) yêu cầu bot trả lời tin thật, "không fake, set config trong admin thật": Admin
phải tự đặt và đổi endpoint, model, key mà không cần sửa file env trên VPS và khởi động lại dịch vụ.

## Decision

- Bảng `llm_configs` (một dòng, như `smtp_configs`): `base_url`, `model`, `key_enc` (AES-256-GCM qua
  `common/crypto/secret-box.ts`, khoá lấy từ env như SMTP), `max_tokens`, `timeout_ms`, `enabled`, `updated_at`.
- Admin › Cài đặt có mục cấu hình AI (quyền `settings.general`), nút "Kiểm tra kết nối". Mọi lần lưu ghi
  `audit_logs`. API không bao giờ trả lại key, chỉ trả cờ "đã đặt" và 4 ký tự cuối.
- Adapter đọc cấu hình lúc chạy (cache trong process, Admin lưu → phát sự kiện xoá cache). Chỉ hỗ trợ
  endpoint OpenAI-compatible (`local.provider.ts`); thêm nhà cung cấp khác = thêm file provider.
- Không có cấu hình hoặc `enabled = false` → bot tắt phần cần AI (trả lời từng tin, AI tạo hàng loạt) và
  Admin thấy trạng thái "Chưa cấu hình AI". **Không** tự rơi về provider fake ở dev hay production.
- Test tự động (unit / int / e2e) chạy với stub HTTP cục bộ trả lời theo kịch bản (D-103, luật 11);
  `@live` gọi thật khi có key. TIP-813 bỏ hoàn toàn lựa chọn provider bằng env;
  test có thể override tường minh `[LLM, new FakeLlmProvider()]` hoặc dùng stub HTTP cục bộ.
- Giới hạn chi phí và tải giữ ở worker: trần tin bot (S-11, D-112), giới hạn số request mỗi phút và timeout.

## Consequences

- Superseded storage: ADR-0009 / TIP-811 migrated configuration to `llm_providers`
  and `app_settings.ai`. TIP-813 drops the unused `llm_configs` table and compatibility
  aliases; its down migration recreates an empty table, not deleted configuration data.
  Runtime always uses Admin-configured providers in every NODE_ENV; no implicit fake fallback.

- Đổi khoá giải mã (env) làm mất key đã lưu; runbook xoay khoá phải nhập lại key SMTP và LLM.
- Dữ liệu tin nhắn gửi sang nhà cung cấp AI do Admin chọn; Admin chịu trách nhiệm chọn nhà cung cấp hợp pháp.
  Prompt chỉ gửi nội dung tin trong phòng và hồ sơ persona, không gửi email / SĐT thành viên.
- Thay quy ước "chọn provider qua env" ở `standards/integrations/adapters.md` cho riêng LLM.
