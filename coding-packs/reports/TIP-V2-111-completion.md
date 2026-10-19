# TIP-V2-111: Tệp/ảnh chat thật qua presign, ảnh bìa + avatar thật, `/community?join=` (completion)

> V2-P1, nhánh `feature/V2-P1-foundation-fixes`. BUG-010 · BUG-011 · BUG-026 · TD-011 · TD-013 (DEMO_FILE) · D-36 ·
> QT-05 · QT-06 · NA-26. TIP không đổi schema, **không cần migration**. V2Q mới: V2Q-97 → V2Q-101.
> Commit: `8d4ebeb` (shared contract + MSW domains + server + int test), `7a3888a` (Portal + Admin + ui),
> `5f463c7` (e2e + harness parity) + commit báo cáo này.

## Đã làm
- **Hợp đồng (shared)**: `api-domains/uploads.ts` mới — `UPLOAD_KINDS` thêm `chat-image`, `chat-file`;
  `presignRequestSchema` discriminated theo `kind` (ảnh PNG/JPEG/WEBP ≤ 5 MB; `chat-file` thêm PDF, DOCX, XLSX,
  PPTX, ZIP, TXT ≤ 10 MB — V2Q-97); hằng MIME/hạn mức + `formatFileSize`, `cleanFileName`, `fileExtLabel` dùng chung
  server/FE/MSW. `profile.ts` chỉ còn ghi chú trỏ sang (re-export qua `index.ts`). `attachmentSchema` thêm
  `url`, `bytes`, `contentType` (optional cho tin cũ); `sendMessageSchema` bắt buộc `attachment.url` khi
  `kind file|image` (lỗi gắn `attachment`). `roomFileSchema.url`. `groupItemSchema` / `eventItemSchema` thêm
  `coverUrl: string|null`, `avatars: string[] ≤ 4` (`GroupDetail`, `AdminEvent` dùng lại — V2Q-100).
  `chatGroupSchema.thumbUrl` nullable, bỏ `coverUrl` trùng (lấy từ `groupItemSchema`).
- **Server**: `UploadsService.presign` sinh khoá `${kind}/${userId}/<uuid>.<ext theo MIME>`, kind `chat-*` kiểm phí
  (D-57, Redis → claim). `ImageRefService.resolveFile` (BUG-010): tiền tố `publicUrl('')`, khoá `chat-*/<userId>/`,
  `head()` tồn tại, `bytes` = `head().size`, MIME/hạn mức theo kind → đính kèm chuẩn hoá (V2Q-98).
  `MessageService.send` gọi nó NGOÀI transaction (luật 9), idempotent `clientMsgId` giữ nguyên (S-12);
  `ChatCoreModule` import `UploadsCoreModule` (socket + api dùng chung). `GET /rooms/:id/files` trả `url`.
  Local storage: trần PUT 10 MB, tệp `chat-file/` trả `Content-Disposition: attachment`.
  Xoá `chat/domain/group-image.ts`; `/me/chat` `thumbUrl` = `groups.cover_url`.
  `GroupRepository.avatarsOf` / `EventRepository.avatarsOf`: **một** `$queryRaw` cho cả trang
  (`unnest(ids) CROSS JOIN LATERAL (… ORDER BY created_at DESC LIMIT 4)`, seek `group_members(group_id,status,…)` /
  `event_registrations(event_id,status,created_at)`), chỉ TK active có `avatar_url`. Áp cho `/groups`,
  `/admin/groups`, `/events`, `/admin/events`.
- **Portal**: `hooks/use-attachment-upload.ts` (kiểm MIME/cỡ trước presign → `presignUpload` (api.ts) → PUT → gửi
  tin; lỗi → toast, không gửi), `composer.tsx` bỏ `DEMO_FILE/DEMO_IMAGE`, `FileInput` ẩn (`accept` theo
  whitelist) trong `composer-parts.tsx`; đang tải → nút đính kèm disabled + "Đang tải lên…". `message-body.tsx`:
  ảnh `<img loading=lazy>` bấm mở tab mới; tệp có link "Tải về" (`download`, `rel=noopener noreferrer`); tin cũ
  không `url` hiện như cũ. Panel File có link. Bỏ `community/media.ts`, `events/media.ts`: card/hero/modal dùng
  `coverUrl` + `avatars` của API (`groupCoverSrc(custom)` → `/images/cover-default.svg`); rail chat dùng `thumbUrl`.
  BUG-026: `useCommunityParams.join`, `hooks/use-join-param.ts` mở `JoinModal` một lần mỗi giá trị `join`, đóng
  form → `update({ join: undefined })`; nhóm đã tham gia/chờ duyệt/không tồn tại → bỏ `join` (V2Q-101).
  `chat.json` chỉ thêm 5 khoá `composer.*`.
- **Admin**: bỏ `events/media.ts`; lưới nhóm/sự kiện dùng `coverUrl` của item + ảnh mặc định tự host; avatar sự kiện
  từ `avatars` (≤ 3 như prototype). `tags.tsx` giữ `eslint-disable no-img-element` (rule còn bật, URL storage động)
  nhưng sửa lý do — không còn D-36.
- **ui**: `group-media.ts` chỉ còn `COVER_DEFAULT_SRC` + `groupCoverSrc(custom)`; `GroupCover` fallback mặc định ảnh tự
  host; `AvatarStack` rỗng → không vẽ.
- **MSW**: `chat-seed.groupImage` bỏ; `/me/chat` `thumbUrl = coverUrl` nhóm (null); nhóm/sự kiện mock `coverUrl` null,
  Admin lưu ảnh bìa → ghi lên dòng nhóm/sự kiện nên Portal + rail + lưới Admin cùng thấy; `avatars` mock = chân dung
  mẫu D_P theo thứ tự như prototype (V2Q-99). Gửi tin file/image chỉ nhận URL `/uploads/chat-*-…` do MSW presign,
  chuẩn hoá tên/đuôi/cỡ như server; `MockResult` thêm 400 `VALIDATION_ERROR`. Handler presign Portal/Admin parse
  cùng `presignRequestSchema` (không phải sửa handler).
- **Harness parity**: `stabilize.ts` chặn thêm `picsum.photos` như các host ảnh ngoài khác (ui-parity.md).

## Test (số thật)
- `pnpm lint` 8/8 task, 0 error (warning `<img>` có sẵn). `pnpm depcheck`: no dependency violations (562 modules).
- `pnpm typecheck`: 7/8 xanh; **`@opchub/server` lỗi có sẵn ở `service/services/service-admin.service.ts`**
  (`'done'` không còn trong enum Prisma sau migration TIP-113; file không thuộc TIP này, không sửa). Ngoài file đó
  0 lỗi.
- `pnpm test`: server 85, shared 83, portal 113, admin 139, ui 30, integrations 25 + 2 skip — tất cả pass. Mới:
  `image-ref.service.spec` `BUG-010 QT-06 tệp của chính mình đã PUT → chuẩn hoá…`, `BUG-010 tệp người khác / sai
  kind / chưa PUT / svg / quá 10MB / lệch bytes → 400`; shared `uploads.spec` `REQ-226 presign theo kind…`,
  `BUG-010 tin file/image bắt buộc attachment.url`; portal `use-attachment-upload.spec` `NA-26 ảnh 6 MB…`,
  `BUG-010 tệp: pdf 300 KB nhận…`.
- Int server (opchub_test): **323/323** (70 file). Mới: chat-rest `BUG-010 QT-06 gửi tệp đã tải lên → tin file có
  url; người khác trong phòng tải được`, `BUG-010 tệp của người khác / chưa tải / sai MIME / thiếu url → 400, không
  có tin`; profile `REQ-226 presign chat-file pdf ≤10MB; svg → 400; chưa đóng phí → 402`; groups + events
  `BUG-011 danh sách trả coverUrl + avatars ≤4 thật (1 query avatars cho cả trang)` (spy `$queryRaw`). Contract
  chat + test lịch sử cũ đổi sang tải tệp thật qua storage tạm.
- e2e MSW (build riêng `.next-111`, Portal 3360 / Admin 3361 / proto 4850): chat + community + events 24/24;
  **toàn bộ behavior 145/146** — 1 fail `events.spec › lọc chip + tìm ghi vào URL` (flaky đã biết từ TIP-103/106/110,
  chạy lại tuần tự `--repeat-each=6` 6/6 xanh). Mới: `BUG-010 QT-06 đính kèm tệp thật qua hộp chọn tệp → link tải
  đúng tệp` (`setInputFiles`, ảnh 6 MB không gọi presign, tải lại đúng 300 KB), `BUG-026 QT-05 /community?join= mở
  form tham gia; đóng → URL bỏ join` (`--repeat-each=8` 8/8), `BUG-011 card dùng coverUrl API` (community + events).
  Test cũ `gửi chữ / file / ảnh` đổi thành gửi ảnh thật.
- Grep `unsplash|picsum|randomuser` trong `apps/*/src` + `packages/ui/src` (ngoài mocks): chỉ còn
  `apps/server/src/modules/project/*` (ảnh bìa mặc định + gallery dự án — ngoài phạm vi TIP, xem dưới).
- **Parity** (31 màn × 2): 40 đạt / 20 vượt 3 %. Các màn TIP đụng mà ảnh bìa/avatar khớp: P-17…P-22, P-25…P-31,
  P-46…P-50, P-53, D-23, D-24, D-30 đạt (ví dụ P-17 0,65 % / 0,43 %, D-23 đạt). Vượt ngưỡng do prototype SRS-3.6
  (`9e3720e`, sau baseline `46bcf57`) đã đổi bố cục, KHÔNG do ảnh: D-42/D-44/D-45 (~44 %, prototype thêm hero "Sự
  kiện tiếp theo"), D-32 (prototype mở trình xem chat), P-52/P-54 @1440 (modal chi tiết dịch dòng), P-23/P-24
  @390 (modal tham gia thêm dòng điều khoản), D-48/D-49 @1440 (đã vượt trước TIP — TIP-V2-106). Không đổi baseline
  (TIP-V2-307). File kết quả parity tái sinh không commit.

## e2e server: CHƯA chạy
Theo brief không dựng/dừng api 4000 / socket 4001 / Next 3220/3222, không `seed:demo` opchub_dev. **Cần agent chính**:
restart api + socket (`MessageService` cần `ImageRefService`; presign `chat-*`), rebuild Portal + Admin chế độ server,
rồi `cd e2e && pnpm exec playwright test -c playwright.server.config.ts behavior/chat.spec.ts
behavior/community.spec.ts behavior/events.spec.ts behavior/admin-groups.spec.ts behavior/admin-events.spec.ts`.
Server phải dùng `STORAGE_PROVIDER=local` (hoặc S3 thật) để PUT tệp chat; e2e BUG-010 tải lại tệp bằng `fetch(href)`
nên cần GET `/v1/uploads/*` (local) hoặc bucket đọc công khai + CORS.

## Ngoài phạm vi / ghi chú
- SKIP theo TIP: nén/thumbnail ảnh chat, quét virus, dọn tệp mồ côi (TIP-V2-306), `flagcdn` (CR-25).
- Còn Unsplash ở server dự án (`project.mapper.ts` ảnh bìa mặc định, `project-read.service.ts` gallery) — không nằm
  trong Files touched; cần TIP sau để đạt grep = 0 hoàn toàn cho `apps/*/src`.
- `packages/db/seed/demo/service.ts` hiện `M` từ trước (không phải của TIP này), không commit.
- Nginx `opchub-s3` đã `client_max_body_size 10m` — đủ cho tệp chat 10 MB, comment cũ ghi 5MB.
