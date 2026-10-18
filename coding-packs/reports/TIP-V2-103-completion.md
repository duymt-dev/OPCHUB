# TIP-V2-103 — Làm sạch rich text và chuỗi người dùng ở server, giữ biến email (completion)

> V2-P1, nhánh `feature/V2-P1-foundation-fixes`. NA-27 / REQ-227, BUG-020, TD-017. Không đổi schema Prisma, không thêm dependency.
> Commit: `14e6a3a` (server + shared), `1cd0189` (FE + MSW + e2e), commit report này.

## Đã làm
- **`common/html/sanitize.ts`**: `sanitizeRichHtml` giữ allowlist cũ, thêm `ALLOWED_URI_REGEXP = /^(?:https?:|mailto:|\{\{[a-z_]+\}\}$)/i`; hook `afterSanitizeAttributes` đặt `rel="noopener noreferrer"` cho mọi `<a>`, `target` chỉ giữ `_blank`. `looksLikeMarkup`, `toPlainText` (DOMPurify `ALLOWED_TAGS: []`, `KEEP_CONTENT`, `RETURN_DOM_FRAGMENT` → `textContent`; lặp tới ổn định để idempotent, VD `&lt;b&gt;`). Server không nạp lib DOM nên khai kiểu node tối thiểu trong file (lint `no-unsafe-*`).
- **`common/html/sanitize-input.ts`**: `sanitizeInput(value, { rich })` duyệt object/array sau zod, đường dẫn rich dạng `lines.*.body`; bỏ qua khoá `/(password|token|code|otp|secret|key|signature|url|href|email)$/i`. `parseClean(schema, raw, opts)`: parse → làm sạch → có đổi thì parse lại bằng chính schema; lỗi ở trường vừa bị làm sạch → 400 `VALIDATION_ERROR` `fields[{path, message:'Nội dung không hợp lệ'}]`.
- **`ZodBody(schema, { rich?, raw? })`** gọi `parseClean` mặc định cho body (query/params không đổi). Khai báo rich: sự kiện `description`, dự án `description`, duyệt dự án `note`, chiến dịch `body`, phiếu YC `note`, bình luận YC Admin `body`; dev-bank `raw: true`. Các lời gọi `sanitizeRichHtml` sẵn trong service giữ nguyên (2 lớp).
- **Chat**: `MessageService.send` dùng `parseClean(sendMessageSchema, input)` → REST + socket đều text thuần; chỉ có `<script>` → 400 (socket: ack `VALIDATION_ERROR`).
- **Biến mail**: `packages/shared` thêm `MAIL_VARIABLES`; Admin `MAIL_VARS = MAIL_VARIABLES`. `marketing/domain/personalize.ts` thay `{{ten}} {{email}} {{nhom}} {{link_dang_nhap}}` (giá trị `esc()`, biến lạ giữ). `CampaignSenderService` lấy `{{nhom}}` bằng `AudienceRepository.firstGroups` — 1 query/lô (`DISTINCT ON (user_id)`, nhóm `member` tham gia sớm nhất), `{{link_dang_nhap}} = ${PORTAL_URL}/login`.
- **Backfill (TD-017)**: `common/html/html-backfill.service.ts` — 9 cột (rich: `projects.description_html`, `projects.review_note`, `events.description`, `service_requests.note`, `service_request_comments.body`, `campaigns.body_html`; plain: `project_comments.body`, `messages.body`, `investor_interests.message`). Keyset theo khoá chính (`service_requests` dùng `code`), lô 200, chỉ đọc ô `LIKE '%<%'`; mỗi lô một `UPDATE … FROM unnest(...) WHERE key = k AND col = old` (không query trong vòng lặp). Log tổng số dòng đổi. `worker/processors/html-backfill.processor.ts` chạy lúc bootstrap, không chặn; `worker-app.module.ts` chỉ thêm dòng.
- **FE**: `SafeHtml` cho mô tả sự kiện (Portal `event-detail-modal`), ghi chú phiếu YC (Admin `request-info`), `reviewNote` (Portal `mine-screen`, Admin `review-body`; CSS `.noteBody` inline để giữ "Nhãn: nội dung").
- **MSW Portal**: `mocks/handlers/plain-text.ts` (bỏ thẻ như server bằng `DOMParser`, rỗng → 400 `fields[{path:'body'}]`) áp vào `POST /projects/:id/comments`.
- Ghi chú bảng TIP: tên bảng thật là `service_request_comments` (TIP ghi `service_comments`).

## Test (số thật)
- Unit server: **72/72** (mới: `sanitize.spec.ts` 9, `sanitize-input.spec.ts` 6, `personalize.spec.ts` 2). `pnpm test` toàn repo: server 72, shared 73, ui 25, integrations 22 (+2 skip), portal 88, admin 117 — tất cả xanh.
- Int mới `test/common/sanitize.int.spec.ts` **7/7**: BUG-020 bình luận bỏ script; chỉ script → 400; mô tả sự kiện giữ thẻ; ghi chú YC + ghi chú duyệt; chat REST + socket; mật khẩu `Ab<b>12345` đăng ký → đăng nhập lại được; TD-017 backfill 9 cột, lần 2 trả `{}` (0 dòng).
- `campaigns.int.spec.ts` +1: **6/6** (`REQ-227 giữ {{ten}} khi lưu, thay + escape khi gửi`: tên "Nguyễn <An>" → `Chào Nguyễn &lt;An&gt;`, `href="<PORTAL_URL>/login"`).
- **Toàn bộ int server: 64 file, 261/261.**
- `pnpm lint` xanh, `pnpm typecheck` xanh, `pnpm depcheck` không vi phạm.
- E2E MSW (build riêng `.next-103`, cổng 3110/3111): **toàn bộ behavior 118/118** (lượt chạy 10 spec trước đó có 1 lần `events.spec` "lọc chip" fail do tải song song, chạy lại 3 lần đều xanh — không liên quan thay đổi).
- E2E server thật (api/socket/worker build riêng `dist-103` cổng 4100/4101, `STORAGE_PROVIDER=local`, Next `.next-server-103` cổng 3210/3211, `opchub_dev` + `seed:demo`): 10 spec (`projects, events, admin-requests, admin-projects, admin-marketing, admin-events, chat, services, auth-flows, profile`) **60/60**. Lần chạy đầu 5 fail vì `reuseExistingServer` dính tiến trình Next cũ trên 3210/3211 (bản trước 102); dừng rồi start đúng build → xanh. Đã dọn hết tiến trình/thư mục build tạm.
- Có sửa sau e2e: thiếu khoảng trắng giữa nhãn "Ghi chú lần duyệt trước:" và nội dung khi chuyển sang `SafeHtml` (admin-projects) — đã thêm `{' '}`.

## Backfill trên `opchub_dev`
- Đếm trước: 9 cột có **0** ô chứa `<script` / `onerror=` / `javascript:`; chỉ `service_request_comments.body` có 2 ô chứa `<` (HTML hợp lệ từ RichEditor). Worker build mới khởi động → log `Làm sạch HTML dữ liệu cũ (TD-017) total: 0` — **0 dòng sửa**. Hành vi sửa chứng minh bằng int test.

## V2Q
- V2Q-66: phạm vi làm sạch chuỗi thường áp mọi `ZodBody` (kịch bản bot, lời chào mail chào mừng, tên…), `{{nhom}}` = nhóm `member` tham gia sớm nhất, `target` chỉ `_blank`.

## Việc cho agent chính
- Không cần migration.
- `security.md` dòng 8 còn ghi `sanitize-html` + ảnh MinIO; thực tế dùng DOMPurify, allowlist không có `<img>` — nên sửa standards (ngoài phạm vi TIP).
- Nội dung bot/persona (`messages` của persona, TIP-V2-501) cũng đi qua backfill `messages.body` (plain) — phù hợp vì chat là text thuần.

## Chưa làm (SKIP theo TIP)
- Nút "Liên kết" dùng `prompt()` (BUG-043, TIP-V2-113); link huỷ đăng ký + hàng đợi mail (TIP-V2-114); sanitize nội dung LLM (TIP-V2-501).
