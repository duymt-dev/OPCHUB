# TIP-V46-815: Kiểm AI bằng key thật (B2, chạy tay)

## HEADER

- TIP-ID: TIP-V46-815
- Project: OPCHUB
- Module: e2e `@live` (`e2e/llm`), adapter AI `packages/integrations/src/llm` (chỉ sửa khi lệch chuẩn OpenAI)
- Priority: P2
- Depends on: V46-814 (đã merge). `dev` = `7ceb26d7`.
- Estimated: S–M
- REQ / D:
  - **D-137** (B2: chạy tay, không commit key, không CI)
  - ADR-0008 / ADR-0009 (AI cấu hình ở Admin, adapter OpenAI-compatible, không SDK)
  - REQ-628
  - D-136 › Q-V46-811-2 (mọi nhà cung cấp qua endpoint tương thích OpenAI)
  - **Q-V46-815-1 → 4** (cuối file)
- **Files touched:**
  - `e2e/llm/provider-matrix.spec.ts` (create): kiểm từng nhà cung cấp đang bật bằng API "Kiểm tra kết nối" + một lượt trả lời bot thật
  - `e2e/llm/provider-matrix.ts` (create): helper đăng nhập Admin, đọc / đổi phân bổ `use.bot`, khôi phục cấu hình
  - `e2e/playwright.llm.config.ts` (modify: thêm project `provider-matrix`; giữ project `real-provider`)
  - Chỉ khi phát hiện lệch tương thích:
    - `packages/integrations/src/llm/local.provider.ts` (modify)
    - `packages/integrations/src/llm/local.spec.ts` (modify: ca stub tái hiện đúng phản hồi lệch)
    - `packages/shared/src/integrations/llm.ts` (modify: schema phản hồi)
    - `packages/shared/src/api-domains/ai-providers.ts` (modify: URL / model mặc định trong `AI_PROVIDER_CATALOG`)
  - Báo cáo:
    - `coding-packs/reports/TIP-V46-815-completion.md` (create)
    - `coding-packs/reports/TIP-V46-815-live-matrix.md` (create: bảng kết quả, **không** key / prompt / nội dung trả lời đầy đủ)
    - `coding-packs/reports/V4.6-progress.md` (dòng #15), `coding-packs/plans/V4.6-DEBT.md` (B2), `coding-packs/reports/ui-parity/questions.md` (mục TIP-V46-815)
- **Parallel-safe with:** sequential.
  - Nằm sau 814 và trước 816.
  - Dùng chung runtime native riêng với 816. Không chạy song song vì đổi cấu hình AI trên DB dev.

## CONTEXT

- Working dir: `D:\CODING\OPCHUB\CODING`. Nhánh `feature/TIP-V46-815-live-ai-check` tách từ `dev` `7ceb26d7`.
- **Runtime:**
  - Dùng runtime native riêng đã được owner duyệt ở 812 / 814: `opchub_v46_812_dev`, Redis 6381 DB3, API / socket 4310 / 4311, Portal / Admin 3710 / 3711, wrapper `test-results/v46-812-native-run.cjs` (git-ignored).
  - Máy đã khởi động lại ngày 07/11 nên runtime có thể đang tắt. Builder hỏi owner trước khi bật lại hoặc seed.
  - Không đụng Postgres native / Redis 6379; không đụng tiến trình HOLD gốc.
- **Hạ tầng `@live` đang có:**
  - `e2e/playwright.llm.config.ts`: chỉ chạy khi gọi tường minh, `workers: 1`, `retries: 0`, `maxFailures: 1`, `timeout: 420000`, `globalSetup: './llm/global-setup.ts'` (bắt buộc `E2E_TARGET=server`, kiểm health API / Admin / Portal).
  - `e2e/llm/native-real-provider.spec.ts`: 2 test (REQ-208 mở đầu tự động, UAT-14 trả lời thành viên thật) chạy với **nhà cung cấp đang được phân bổ cho bot** trong DB. Receipt chỉ ghi SHA-256 + độ dài nội dung.
- **Adapter** (`local.provider.ts`):
  - Gọi `POST {baseUrl}/chat/completions` với body `{ model, messages, temperature?, stream: false, max_tokens }`, `redirect: 'error'`.
  - `llmCompletionSchema` bắt buộc `choices[].message.content` là chuỗi và `finish_reason === 'stop'`; `usage.prompt_tokens / completion_tokens` không bắt buộc.
  - Lỗi HTTP 429 / 5xx được coi là thử lại được.
- **Danh mục 811** (`AI_PROVIDER_CATALOG`):

  | Nhà cung cấp | URL |
  |---|---|
  | Claude | `https://api.anthropic.com/v1` |
  | OpenAI | `https://api.openai.com/v1` |
  | Gemini | `https://generativelanguage.googleapis.com/v1beta/openai` |
  | DeepSeek | `https://api.deepseek.com/v1` |
  | USGate | `https://gateway.usgate.vn/v1` |
  | Tùy chỉnh | (trống) |

  Model mặc định theo prototype. Các endpoint này chưa từng được gọi bằng key thật.
- **Rủi ro tương thích đã biết** (phải kiểm, không đoán):
  - **`finish_reason`:** nhà cung cấp có thể trả `length` / `end_turn` / `STOP` thay vì `stop`.
  - **DeepSeek `deepseek-reasoner`:** có thể trả thêm `reasoning_content`, `content` rỗng khi hết token.
  - **Anthropic:** endpoint tương thích OpenAI có thể yêu cầu header khác / không nhận `temperature` > 1 (ta dùng 0..1).
  - **Gemini:** URL `…/openai` nối thêm `/chat/completions`.
  - **Model mặc định:** có thể đã cũ / không có quyền với key.
- Admin › Cài đặt › AI Provider (811): nhập key (mã hóa, chỉ hiện 4 ký tự cuối), "Kiểm tra kết nối" gọi `POST /v1/admin/settings/ai/providers/:id/verify` (trả `{ ok, message }`, lưu `status`, `checked_at`, audit `llm.verify`). Không có nút xóa key.

## APPLICABLE STANDARDS

- [integrations/adapters](../standards/integrations/adapters.md): chỉ sửa trong adapter OpenAI-compatible; không SDK; không fake ở runtime; ca lệch phải có test stub tái hiện.
- [security/security](../standards/security/security.md): không ghi key vào file / log / commit / báo cáo / trace / ảnh chụp; không lưu nội dung prompt / trả lời đầy đủ.
- [testing/testing](../standards/testing/testing.md): `@live` tách khỏi CI; ghi PASS / FAIL thật; không retry.
- [global/git-workflow](../standards/global/git-workflow.md).

## PHẠM VI THỰC TẾ (owner, 07/11/2026)

- Owner có **một** key: **9router** (router tương thích OpenAI), model **`ag/gemini-3.6-flash-low`**.
- Kiểm qua nhà cung cấp **"Tùy chỉnh (OpenAI-compatible)"** (`custom`):
  - owner nhập Base URL của 9router + key + model `ag/gemini-3.6-flash-low` ở Admin › Cài đặt › AI Provider (runtime dev riêng)
  - Base URL phải là `https://…`, hoặc `http://localhost` / `127.0.0.1` nếu 9router chạy trên máy này (`llmLocalConfigSchema`)
  - model có dấu `/` hợp lệ (chuỗi 1..200)
- Đã kiểm sẵn (07/11/2026, không dùng key): 9router chạy trên máy dev ở `0.0.0.0:20128`; `GET /v1/models` 200 (59 model, có `ag/gemini-3.6-flash-low`); `POST /v1/chat/completions` không key → 401 `invalid_api_key` kiểu OpenAI; không redirect. **Base URL = `http://localhost:20128/v1`** (loopback, `http` hợp lệ).
- Model có `capabilities.reasoning` → dễ trả `finish_reason = length` khi `max_tokens` thấp (≤ 256 theo Q-V46-815-2). Nếu gặp, ghi đúng như lệch tương thích (SPEC 9 → 10, Q-V46-815-4 mặc định vẫn coi là lỗi); không tự nâng `max_tokens` vượt 256.
- Claude / OpenAI / Gemini / DeepSeek / USGate: **chưa kiểm (không có key)**, ghi vào ma trận.
- Đủ điều kiện DONE khi `custom` (9router) có kết quả thật (PASS, hoặc FAIL có nguyên nhân + xử lý theo SPEC 9 → 10). Không bắt buộc 5 nhà cung cấp còn lại.
- Nếu 9router trả lệch chuẩn (ví dụ `finish_reason` khác `stop`, thiếu `usage`, model id lạ) → SPEC 9 → 10. **Không** đổi `AI_PROVIDER_CATALOG` vì 9router không phải nhà cung cấp trong danh mục.

## TASK

Kiểm từng nhà cung cấp AI mà owner cấp key bằng gọi thật, chạy tay, không vào CI:

1. Gọi "Kiểm tra kết nối" thật.
2. Chạy một lượt bot trả lời thật qua đường runtime của ứng dụng.
3. Ghi model, độ trễ, `usage` và lỗi tương thích nếu có.

Phát hiện lệch chuẩn OpenAI thì sửa adapter / schema / danh mục trong phạm vi ADR-0009, kèm test stub tái hiện.

## SPECIFICATIONS

### Chuẩn bị (owner + builder)

1. **Key do owner nhập trực tiếp ở màn Admin › Cài đặt › AI Provider của runtime native riêng** (Q-V46-815-1).
   - Builder **không** nhận key qua chat, file, biến môi trường hay lệnh.
   - Nhà cung cấp không có key → ghi "chưa kiểm (không có key)".
2. Trước khi chạy:
   - Builder chụp lại cấu hình AI hiện tại qua `GET /v1/admin/settings/ai` (chỉ phần không bí mật: `enabled`, `model`, `baseUrl`, `use`, `fallback`, tham số).
   - Chạy xong khôi phục về đúng cấu hình đó, trừ key: không có API xóa key, nên chỉ tắt `enabled` (Q-V46-815-3).

### Ma trận kiểm (`provider-matrix.spec.ts`, project `provider-matrix`)

3. **Phạm vi:** nhà cung cấp có `hasKey = true` và `enabled = true`.
4. **Bước 1 — kết nối:** `POST …/providers/:id/verify` với key đã lưu. Ghi:
   - `ok`, `message`
   - thời gian phản hồi (đo ở test)
   - model đang cấu hình
5. **Bước 2 — lượt bot thật:**
   - Đặt `use.bot = <id>`, `fallback = ''` qua `PUT /v1/admin/settings/ai`, để lỗi không bị che bởi nhà cung cấp dự phòng.
   - Chạy luồng UAT-14 thu gọn: thành viên hỏi trong `c1`, chờ thread `reply` `done`, bài trả lời hiện ở Portal.
   - Dùng lại helper `bot-participants` / `settings-session`.
   - Ghi: `status`, độ dài, SHA-256 nội dung, `llm_calls` mới nhất của nhà cung cấp đó (`model`, `prompt_tokens`, `completion_tokens`, `latency_ms`, `status`), đọc qua API / DB dev chỉ lấy metadata.
6. **Giới hạn chi phí** (Q-V46-815-2):
   - mỗi nhà cung cấp tối đa **3 lời gọi** (1 verify + 1 bot + 1 lần chạy lại nếu sửa adapter)
   - `maxTokens` cấu hình **≤ 256** trong lúc kiểm
   - `budget` giữ nguyên
7. **Thứ tự:** từng nhà cung cấp một, `workers: 1`, `retries: 0`. Một nhà cung cấp lỗi **không** dừng cả ma trận: mỗi nhà cung cấp là một `test`, bỏ `maxFailures: 1` riêng cho project này.
8. **Hai test cũ** `native-real-provider.spec.ts` chạy thêm một lần với nhà cung cấp owner chọn làm chính (mặc định nhà cung cấp đầu tiên PASS ma trận) để xác nhận luồng REQ-208 / UAT-14 vẫn đúng.

### Sửa lệch tương thích (chỉ khi có)

9. Mỗi lệch:
   - ghi phản hồi lỗi đã lược bí mật (status, `finish_reason`, cấu trúc JSON, không nội dung)
   - viết ca stub trong `local.spec.ts` tái hiện đúng cấu trúc đó (đỏ)
   - sửa adapter / schema (xanh)
   - chạy lại nhà cung cấp đó (lời gọi thứ 3)
10. Được phép:
    - nhận `finish_reason` `length` khi có `content` không rỗng **chỉ nếu** owner đồng ý (Q-V46-815-4); mặc định vẫn coi là lỗi "Invalid or incomplete LLM response"
    - bỏ qua trường lạ (`reasoning_content`)
    - đổi URL / model mặc định trong danh mục khi nhà cung cấp đã đổi

    Không được: thêm SDK, header riêng của từng hãng ngoài chuẩn OpenAI (nếu bắt buộc thì ghi Q, dừng nhà cung cấp đó), retry ngầm, fallback giả.
11. Mọi sửa chạy `pnpm --filter @opchub/integrations test`, `pnpm --filter @opchub/shared test`, `pnpm lint && pnpm typecheck`, và int AI (`apps/server/test/settings/ai-*.int.spec.ts`).

### Báo cáo

12. `TIP-V46-815-live-matrix.md`: bảng `| Nhà cung cấp | Model | Verify (ok / thông báo / ms) | Bot (status / độ dài / SHA-256) | Token vào / ra | Độ trễ | Lệch tương thích | Kết luận |`.
    - **Không** key, 4 ký tự cuối, prompt, nội dung trả lời.
    - Ghi ngày giờ chạy, SHA code.
13. Completion ghi:
    - nhà cung cấp chưa kiểm + lý do
    - số lời gọi thật đã dùng
    - thay đổi code (nếu có)
    - cấu hình đã khôi phục

### Validation

- `rg` trên diff và thư mục báo cáo: không có chuỗi key (kiểm theo tiền tố `sk-`, `sk-ant-`, `AIza`, `usg_`) và không có `authorization`. Chép kết quả.
- Trace / video / ảnh Playwright của project `provider-matrix` **tắt** (`trace: 'off'`, `video: 'off'`, `screenshot: 'off'`), vì request có header key. Thư mục kết quả không commit.

### Error Handling

| Trường hợp | Xử lý |
|---|---|
| Không nhà cung cấp nào có key | Ghi NOT RUN toàn bộ; TIP không DONE (B2 chưa làm được), báo owner |
| Verify 401 / 403 | Ghi "key sai / không quyền", không sửa code |
| Verify 404 model | Thử model khác trong danh mục của nhà cung cấp (vẫn trong 3 lời gọi); nếu danh mục cũ → sửa danh mục |
| 429 / hết hạn mức | Ghi, không chạy lại ngay |
| Phản hồi lệch schema | SPEC 9 → 10 |
| Bắt buộc header riêng hãng | Ghi Q, dừng nhà cung cấp đó |

## ACCEPTANCE CRITERIA

- **Ma trận** Given owner đã nhập key cho ít nhất 1 nhà cung cấp When chạy `cd e2e && pnpm exec playwright test -c playwright.llm.config.ts --project provider-matrix` Then mỗi nhà cung cấp có key có một kết quả PASS / FAIL thật với lý do trong `TIP-V46-815-live-matrix.md`. Test: `provider-matrix.spec.ts` › `B2 <id> verify and real bot reply`.
- **Luồng bot** Given nhà cung cấp chính đã PASS When chạy project `real-provider` Then 2 test REQ-208 / UAT-14 PASS (receipt chỉ có SHA-256 + độ dài).
- **Lệch tương thích** (nếu có) Given phản hồi lệch đã ghi Then `local.spec.ts` có ca tái hiện (đỏ trước sửa, xanh sau). Nhà cung cấp đó chạy lại PASS, hoặc có Q ghi lý do dừng.
- **Bí mật** `rg` không thấy key / `authorization` trong diff, báo cáo, `test-results` được nhắc tới; trace / video / ảnh tắt.
- **Khôi phục** Given cấu hình chụp trước khi chạy Then sau khi chạy `GET /v1/admin/settings/ai` khớp phần không bí mật (trừ `enabled` theo Q-V46-815-3).
- **Không hồi quy** (chỉ khi có sửa code): `pnpm lint && pnpm typecheck && pnpm test` + int `settings/ai-*` xanh. Không sửa code thì ghi "không đổi code ứng dụng".

## CONSTRAINTS

- DO NOT:
  - nhận / ghi key qua chat, file, env, lệnh, log, ảnh, trace
  - chạy `@live` trong CI hoặc trong `pnpm e2e` thường
  - thêm SDK / header riêng hãng / retry / fallback giả
  - lưu nội dung prompt / trả lời đầy đủ vào báo cáo
  - đổi cấu hình AI production
  - vượt 3 lời gọi / nhà cung cấp
  - đụng DB native / HOLD gốc; tự merge PR
- REUSE:
  - `playwright.llm.config.ts`, `llm/global-setup.ts`, `llm/settings-session.ts`, `behavior/helpers/bot-participants.ts`
  - `aiSettingsResponseSchema` / `aiSettingsUpdateSchema`
  - mẫu receipt SHA-256 trong `native-real-provider.spec.ts`
- SKIP:
  - B3 → B18 (D-137)
  - kiểm Soạn nội dung / Kiểm duyệt (chưa có chức năng dùng)
  - đo chất lượng câu trả lời
  - thêm nút xóa key (B-backlog)

## Câu hỏi — **đã chốt theo mặc định** (owner, 07/11/2026; ghi `questions.md` › TIP-V46-815)

- **Q-V46-815-1 Nhập key ở đâu.**
  - **Mặc định:** bạn tự nhập ở Admin › Cài đặt › AI Provider trên runtime dev riêng (`opchub_v46_812_dev`). Key được mã hóa trong DB đó.
  - Builder không bao giờ thấy key.
  - Bạn cho biết nhà cung cấp nào có key.
- **Q-V46-815-2 Giới hạn chi phí.**
  - **Mặc định:** tối đa 3 lời gọi cho mỗi nhà cung cấp, mỗi lời gọi ≤ 256 token đầu ra. Tổng chi phí dự kiến không đáng kể.
- **Q-V46-815-3 Dọn sau khi kiểm.**
  - **Mặc định:** tắt các nhà cung cấp đã bật để kiểm, khôi phục phân bổ cũ.
  - Key vẫn nằm mã hóa trong DB dev, vì chưa có nút xóa key. Nếu bạn muốn xóa hẳn: xóa DB dev hoặc nhập đè key giả.
- **Q-V46-815-4 Câu trả lời bị cắt do hết token (`finish_reason = length`).**
  - **Mặc định:** vẫn coi là lỗi như hiện nay, không nhận câu trả lời cụt.
  - Phương án khác: nhận nếu có nội dung.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-815-live-ai-check`; chỉ sửa file trong **Files touched**.
- [ ] Hỏi owner: bật runtime native riêng; owner tự nhập key ở Admin và báo danh sách nhà cung cấp có key. **Không** nhận key.
- [ ] Chụp cấu hình AI trước; khôi phục sau; ghi completion.
- [ ] Chạy project `provider-matrix` (trace / video / ảnh tắt) + `real-provider`. Ghi PASS / FAIL thật từng nhà cung cấp, số lời gọi đã dùng.
- [ ] Lệch tương thích → stub đỏ → sửa → xanh → chạy lại; hoặc Q + dừng.
- [ ] `rg` bí mật trên diff + báo cáo; chép kết quả.
- [ ] Luật BUILDER-HANDOFF liên quan:
  - **Luật 11 / ADR-0008 / 0009:** chỉ adapter OpenAI-compatible, không SDK, không fake ở runtime
  - **Luật 12 / bảo mật:** không secret trong repo / log / báo cáo / trace
  - **D-137:** `@live` chạy tay, không CI
- [ ] Có sửa code: `pnpm lint && pnpm typecheck && pnpm test` + int `settings/ai-*` xanh, chép output.
- [ ] Ghi Q-V46-815-1 → 4 vào `questions.md`; cập nhật `V4.6-progress.md` dòng #15, `V4.6-DEBT.md` B2.
- [ ] Commit `git commit -- <paths>` (cấm `git add -A`); `git status --short` sạch; push; PR `base: dev`; không tự merge. Completion có **git commit SHA**.
- [ ] KHÔNG báo DONE nếu `custom` (9router, `ag/gemini-3.6-flash-low`) chưa có kết quả thật.

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ; Files touched mức file, phần sửa adapter là có điều kiện
- [x] Context: runtime riêng (máy vừa khởi động lại), hạ tầng `@live` sẵn có, adapter / schema, danh mục URL, rủi ro tương thích cụ thể
- [x] SPEC 1 → 13: chuẩn bị, ma trận, giới hạn chi phí, quy trình sửa lệch, báo cáo; validation bí mật; bảng lỗi
- [x] AC có lệnh chạy + tên test
- [x] Constraints: trích bảo mật / luật 11 / 12 / D-137
- [x] Parallel: sequential giữa 814 và 816
- ⚠️ Gap:
  - Chỉ có key 9router (`custom`); 5 nhà cung cấp trong danh mục chưa kiểm, endpoint của họ vẫn chưa xác minh bằng key thật — giữ là nợ, ghi completion.
  - Endpoint tương thích OpenAI của Anthropic có thể đòi điều kiện ngoài chuẩn; nếu vậy dừng ở Q, không thêm header / SDK.
