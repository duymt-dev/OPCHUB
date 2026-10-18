# TIP-V2-103: Làm sạch rich text và chuỗi người dùng ở server, giữ biến email (NA-27, BUG-020, TD-017)

## HEADER
- TIP-ID: TIP-V2-103 · Project: OPCHUB · Module: common/html + common/http + các controller ghi nội dung · Priority: P0 · Depends on: — · Estimated: M (8h)
- **Files touched:**
  - `apps/server/src/common/html/sanitize.ts` + `sanitize.spec.ts` (modify: `ALLOWED_URI_REGEXP` http/https/mailto/biến email; thêm `toPlainText`, `looksLikeMarkup`)
  - `apps/server/src/common/html/sanitize-input.ts` + `sanitize-input.spec.ts` (create: duyệt object sau zod, rich theo đường dẫn, plain cho chuỗi còn lại, bỏ qua khoá nhạy cảm)
  - `apps/server/src/common/http/zod.ts` (modify: `ZodBody(schema, opts?: { rich?: readonly string[]; raw?: boolean })`)
  - Controller khai báo trường rich: `apps/server/src/modules/event/controllers/admin-events.controller.ts` (`description`), `project/controllers/projects.controller.ts` (`description`), `project/controllers/admin-projects.controller.ts` (`note`), `marketing/controllers/campaigns.controller.ts` (`body`), `service/controllers/services.controller.ts` (`note`), `service/controllers/admin-service-requests.controller.ts` (`body`), `membership-fee/controllers/dev-bank.controller.ts` (`raw: true`)
  - `apps/server/src/modules/chat/services/message.service.ts` (modify: `send` qua socket → `toPlainText(body)`)
  - `apps/server/src/modules/marketing/services/campaign-sender.service.ts` (modify: thay biến `{{ten}} {{email}} {{nhom}} {{link_dang_nhap}}` lúc gửi, giá trị escape)
  - `packages/shared/src/api-domains/marketing.ts` (modify — chỉ thêm `MAIL_VARIABLES`); `apps/admin/src/features/marketing/types.ts` (modify: `MAIL_VARS` lấy từ shared)
  - Backfill: `apps/server/src/common/html/html-backfill.service.ts` (create), `apps/server/src/worker/processors/html-backfill.processor.ts` (create), `apps/server/src/worker/worker-app.module.ts` (modify — chỉ thêm dòng)
  - FE hiển thị rich bằng `SafeHtml`: `apps/portal/src/features/events/components/event-detail-modal.tsx`, `apps/admin/src/features/requests/components/request-info.tsx` (`note`), `apps/portal/src/features/projects/components/mine-screen.tsx` + `apps/admin/src/features/projects/components/review-body.tsx` (`reviewNote`)
  - Test: `apps/server/test/common/sanitize.int.spec.ts` (create), `apps/server/test/marketing/campaigns.int.spec.ts` (modify: thêm test biến)
- **Parallel-safe with:** TIP-V2-101, 102, 104, 105, 107, 108, 109, 110, 112. `sequential, shares message.service.ts with TIP-V2-111`. `sequential, shares campaign-sender.service.ts + campaigns.controller.ts with TIP-V2-114`. `sequential, shares mine-screen.tsx / review-body.tsx with TIP-V2-113`. `shares worker-app.module.ts with TIP-V2-102` (chỉ thêm dòng, giữ `.wire-lock`).
- **Phase / nhánh:** V2-P1, `feature/V2-P1-foundation-fixes` (nhánh con `feature/V2-P1-103-richtext-sanitize`)

## CONTEXT
- Đặc tả §8.29 NA-27: lọc thẻ/thuộc tính ngoài danh sách cho phép, bỏ script; liên kết chỉ http/https/mailto; **biến email (`{{ten}}`, …) giữ nguyên**; áp dụng ở backend. Prototype dùng 4 biến: `{{ten}}`, `{{email}}`, `{{nhom}}`, `{{link_dang_nhap}}` (`apps/admin/src/features/marketing/types.ts:37`).
- Audit: BUGS.md BUG-020 (`POST /projects/:id/comments` lưu nguyên `<script>…<img onerror>`), TECH-DEBT TD-017; `work/screens.jsonl` (`xss-comment`).
- Đã có: `common/html/sanitize.ts` (DOMPurify + jsdom, allowlist trùng `packages/ui/src/safe-html/safe-html.tsx`) — chỉ gọi ở `project-write.service.ts:103`, `campaign.service.ts:70`, `service-admin.service.ts:193`. Chưa lọc: bình luận dự án, mô tả sự kiện, ghi chú phiếu YC, ghi chú duyệt dự án, tin chat, ghi chú quan tâm/trao đổi, hồ sơ.
- Hiện hiển thị sai: mô tả sự kiện (RichTextField) render `{e.description}` thành chữ có thẻ; ghi chú YC (`request-info.tsx:35`), `reviewNote` tương tự.
- `campaign-sender.service.ts › personalize` chưa thay biến nào (mail gửi ra còn nguyên `{{ten}}`).

## APPLICABLE STANDARDS
[security](../standards/security/security.md) (XSS: lọc lúc ghi, render qua `SafeHtml`; chat là text thuần) · [api-conventions](../standards/backend/api-conventions.md) · [nestjs-modules](../standards/backend/nestjs-modules.md) · [testing](../standards/testing/testing.md)

## TASK
Đặt lớp làm sạch ở biên server: trường rich text (khai báo theo controller) lọc theo allowlist, mọi chuỗi người dùng khác bỏ thẻ HTML; biến email được giữ và được thay khi gửi chiến dịch. Làm sạch dữ liệu bẩn đã lưu.

## SPECIFICATIONS
### Business Rules
1. **Rich (NA-27)** `sanitizeRichHtml`: giữ allowlist hiện có (`p br b strong i em u s h3 ul ol li blockquote a`, attr `href target rel`); `ALLOWED_URI_REGEXP = /^(?:https?:|mailto:|\{\{[a-z_]+\}\}$)/i`; `<a>` có `href` ngoài danh sách → bỏ `href`, giữ chữ; mọi `<a>` thêm `rel="noopener noreferrer"`. Biến `{{ten}}` trong chữ và trong `href` giữ nguyên byte-by-byte.
2. **Plain** `toPlainText(s)`: chỉ xử lý khi `looksLikeMarkup(s)` (`/<\/?[a-z][a-z0-9-]*[\s>/]|<!--/i`); khi đó parse bằng DOMPurify (`RETURN_DOM_FRAGMENT`, `ALLOWED_TAGS: []`, `KEEP_CONTENT: true`) rồi lấy `textContent`, nội dung `script/style` bị bỏ. Chuỗi không giống markup (`"2 < 3"`, `"a<b"`, `"R&D"`) giữ nguyên — không escape entity khi lưu (React tự escape khi hiển thị).
3. **Biên chung** `sanitizeInput(value, { rich })`: duyệt object/array sau khi zod parse; chuỗi có đường dẫn ∈ `rich` (dạng `description`, `lines.*.body`) → rule 1; chuỗi khác → rule 2; **bỏ qua** khoá khớp `/(password|token|code|otp|secret|key|signature)$/i` và khoá kết thúc `Url|url|href|email` (đã có zod kiểm định dạng). `ZodBody(schema, opts)` gọi `sanitizeInput` mặc định; `raw: true` tắt (chỉ dev-bank, webhook đọc `rawBody` không qua ZodBody).
4. Đường không qua REST: `MessageService.send` (socket `message.send`) áp rule 2 cho `body` trước khi insert. Tin chat **không** nhận HTML (security.md).
5. Giữ các lời gọi `sanitizeRichHtml` sẵn có trong service (idempotent, phòng thủ hai lớp).
6. **Thay biến khi gửi** (`personalize`): `{{ten}}` = họ tên, `{{email}}` = email, `{{nhom}}` = tên nhóm đầu tiên của người nhận hoặc chuỗi rỗng, `{{link_dang_nhap}}` = `${PORTAL_URL}/login`; giá trị qua `esc()` (`mail/templates.ts`); biến lạ giữ nguyên. Lấy dữ liệu theo lô người nhận đang có (không query mỗi người).
7. **Dữ liệu cũ** `HtmlBackfillService.run()` (worker khởi động, không chặn bootstrap): duyệt keyset theo id, lô 200, các cột: rich — `projects.description_html`, `events.description`, `service_requests.note`, `service_comments.body`, `campaigns.body_html`, `projects.review_note`; plain — `project_comments.body`, `messages.body`, `investor_interests.message`. `UPDATE … WHERE id = $1 AND <col> = $old` chỉ khi kết quả khác bản gốc. Ghi log số dòng đổi.
8. FE: mô tả sự kiện (Portal), ghi chú phiếu YC (Admin), `reviewNote` (Portal + Admin) render bằng `<SafeHtml>`; không đổi chỗ đang render text thuần.

### Validation / Error Handling
- Làm sạch không đổi mã lỗi: nếu sau làm sạch trường bắt buộc rỗng (VD bình luận chỉ có `<script>`) → service trả 400 `VALIDATION_ERROR` `fields[{path:'body', message:'Nội dung không hợp lệ'}]` (kiểm ở `sanitizeInput` khi chuỗi gốc không rỗng mà kết quả rỗng và schema gốc có `min(1)` — đơn giản hoá: `ZodBody` parse lại kết quả bằng chính schema sau khi làm sạch).

## ACCEPTANCE CRITERIA
- Given bình luận `<script>alert(1)</script><img src=x onerror=alert(2)>Chào`, When `POST /projects/:id/comments`, Then DB lưu `Chào` (BUG-020, NA-27).
- Given bình luận chỉ `<script>alert(1)</script>`, Then 400 `fields[{path:'body'}]` (BUG-020).
- Given mô tả sự kiện `<p onclick=x>Hội thảo <b>AI</b></p><a href="javascript:alert(1)">x</a>`, Then lưu `<p>Hội thảo <b>AI</b></p><a rel="noopener noreferrer">x</a>`; Portal hiển thị **AI** in đậm, không lộ thẻ (NA-27).
- Given nội dung chiến dịch `<p>Chào {{ten}}</p><a href="{{link_dang_nhap}}">Vào</a>`, Then lưu giữ nguyên hai biến; mail gửi cho "Nguyễn <An>" chứa `Chào Nguyễn &lt;An&gt;` và `href="<PORTAL_URL>/login"` (NA-27).
- Given đăng ký với mật khẩu `Ab<b>12345`, Then đăng nhập lại bằng đúng chuỗi đó thành công (khoá bỏ qua).
- Given tin chat `2 < 3 và a<b`, Then lưu nguyên; tin `<b>đậm</b>` lưu `đậm` (security.md).
- Given DB có dữ liệu bẩn ở 9 cột, When backfill chạy 2 lần, Then không còn `<script` / `onerror=` / `javascript:`; lần 2 cập nhật 0 dòng (TD-017).

## TESTS BẮT BUỘC
- Unit `apps/server/src/common/html/sanitize.spec.ts`: `REQ-227 giữ biến email trong chữ và href`, `REQ-227 bỏ javascript: và data:`, `REQ-227 thêm rel noopener`, `toPlainText giữ "2 < 3" và "a<b"`, `toPlainText bỏ script kèm nội dung`.
- Unit `sanitize-input.spec.ts`: `rich theo đường dẫn lồng`, `bỏ qua password/token/url/email`, `mảng chuỗi`.
- Int `apps/server/test/common/sanitize.int.spec.ts`: `BUG-020 REQ-227 bình luận dự án bỏ script`, `BUG-020 bình luận chỉ có script → 400`, `REQ-227 mô tả sự kiện giữ thẻ cho phép`, `REQ-227 ghi chú phiếu YC + ghi chú duyệt dự án`, `REQ-227 tin chat REST + socket là text thuần`, `REQ-227 mật khẩu có ký tự < không bị đổi`, `TD-017 backfill idempotent`.
- Int `apps/server/test/marketing/campaigns.int.spec.ts`: `REQ-227 giữ {{ten}} khi lưu, thay + escape khi gửi`.
- E2E (msw + server, cùng assertion) `e2e/behavior/projects.spec.ts`: `BUG-020 REQ-227 góp ý có thẻ HTML hiển thị chữ thuần`. MSW handler bình luận mô phỏng cùng quy tắc (bỏ thẻ).

## CONSTRAINTS
- DO NOT: thêm thư viện sanitize mới (đã có `dompurify` + `jsdom` ở server); lọc lúc đọc thay cho lúc ghi; escape entity vào DB cho chuỗi thường; đổi hợp đồng zod (độ dài giữ nguyên); query trong vòng lặp ở backfill/gửi mail.
- REUSE: `sanitizeRichHtml`, `esc` (`mail/templates.ts`), `SafeHtml` (`packages/ui`), allowlist trùng `safe-html.tsx`.
- SKIP: nút "Liên kết" dùng `prompt()` (BUG-043, TIP-V2-113); link huỷ đăng ký + hàng đợi mail (TIP-V2-114); sanitize nội dung bot LLM (TIP-V2-501).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 2 (input ngoài vào qua zod — làm sạch chạy SAU zod), luật 5 (backfill theo lô, keyset), luật 13 (test file riêng), luật 1 (≤ 400 dòng BE tối ưu).
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`; `test:int` xanh; `pnpm e2e` (msw) + `pnpm e2e:server --project behavior` xanh.
- [ ] `git commit -- <paths>` (không `-A`), `git status --short` sạch; báo `TIP-V2-103-DONE <sha> — <N> test passed`; report `coding-packs/reports/TIP-V2-103-completion.md` (ghi số dòng backfill đã sửa trên `opchub_dev`).
