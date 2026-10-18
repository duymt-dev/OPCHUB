# TIP-V2-111: Tệp/ảnh chat thật qua presign, ảnh bìa + avatar thật, `/community?join=` (QT-06, QT-05, D-36)

## HEADER
- TIP-ID: TIP-V2-111 · Project: OPCHUB · Module: chat, uploads, community, event (Portal + Admin + ui) · Priority: P1 · Depends on: **TIP-V2-102** (media-storage: ảnh bìa nhóm/sự kiện lưu storage, bỏ data URL, giới hạn body) · Estimated: L (12h)
- **Files touched:**
  - `packages/shared/src/api-domains/profile.ts` (modify: `UPLOAD_KINDS` thêm `chat-file`, `chat-image`, `group-cover`; `presignRequestSchema` → MIME theo kind — nếu 102 đã tách presign sang file riêng thì sửa ở file đó)
  - `packages/shared/src/api-domains/chat.ts` (modify: `attachmentSchema` thêm `url: string`, `bytes: number`, `contentType: string` — giữ `name/size/ext`, `url` optional cho tin cũ)
  - `apps/server/src/modules/uploads/uploads.service.ts`, `image-ref.service.ts` (modify: hằng MIME/size theo kind; thêm `resolveFile` kiểm `head`)
  - `apps/server/src/modules/chat/services/message.service.ts` (modify `send`: kiểm attachment qua `ImageRefService.resolveFile` NGOÀI transaction) · `chat-core.module.ts` (import `UploadsCoreModule`)
  - `apps/server/src/modules/chat/domain/group-image.ts` (delete) · `services/chat-overview.service.ts` (modify: `coverUrl`/`thumbUrl` từ `groups.cover_url`, null → ảnh mặc định tự host)
  - `apps/server/src/modules/community/domain/group.mapper.ts`, `repositories/group.repository.ts`, `services/group.service.ts` (modify: `coverUrl` + `memberAvatars` ≤ 4)
  - `apps/server/src/modules/event/domain/event.mapper.ts`, `repositories/event.repository.ts`, `services/event.service.ts` (modify: `coverUrl` + `attendeeAvatars` ≤ 4)
  - `packages/shared/src/api-domains/groups.ts`, `events.ts` (modify: `groupItemSchema` + `eventItemSchema` thêm `coverUrl: string|null`, `avatars: string[]`) · `chat-room.ts` (`coverUrl`, `thumbUrl` → nullable)
  - `apps/portal/src/features/chat/components/composer.tsx` (modify: bỏ `DEMO_FILE/DEMO_IMAGE`, `<input type=file>` ẩn), `hooks/use-attachment-upload.ts` (create), `components/message-body.tsx` (modify: ảnh `<img>`, tệp `<a href download>`), `api.ts` (thêm `presignUpload`)
  - `apps/portal/src/features/community/media.ts` (delete) · `components/community-card.tsx`, `join-summary.tsx` (modify) · `hooks/use-community-params.ts` (thêm `join`), `components/community-screen.tsx` (mở `JoinModal` theo `?join=`)
  - `apps/portal/src/features/events/media.ts` (delete) · `components/event-parts.tsx` (modify)
  - `apps/admin/src/features/events/media.ts` (delete) · `components/event-grid.tsx` (modify) · `apps/admin/src/features/groups/components/group-grid.tsx` (modify)
  - `packages/ui/src/group-card/group-media.ts` (modify: bỏ Unsplash/picsum, còn `groupCoverSrc(custom)` → ảnh mặc định `/images/cover-default.svg`) · `packages/ui/src/group-card/group-cover.tsx` (modify comment fallback)
  - `apps/portal/public/images/cover-default.svg`, `apps/admin/public/images/cover-default.svg` (create)
  - `apps/admin/src/features/investors/components/tags.tsx` (modify: bỏ `eslint-disable` D-36 nếu ảnh đã là URL storage)
  - MSW: `packages/shared/src/mock-data/domains/chat-ops.ts`, `community.ts`, `content.ts` (modify: trả `coverUrl`/`avatars` từ dữ liệu mock tự host hoặc null), `apps/portal/src/mocks/handlers/profile.ts` (presign kind mới)
  - Test: `apps/server/test/chat/chat-rest.int.spec.ts`, `apps/server/test/account/profile.int.spec.ts` (presign), `apps/server/test/community/groups.int.spec.ts`, `apps/server/test/event/events.int.spec.ts` (modify); `e2e/behavior/chat.spec.ts`, `community.spec.ts`, `events.spec.ts` (modify)
- **Parallel-safe with:** TIP-V2-101, 103, 104, 105, 107, 108, 110, 112, 114. `sequential, shares uploads/* + profile.ts (UPLOAD_KINDS) + group-admin/event-admin schema with TIP-V2-102` (102 trước) · `sequential, shares message.service.ts with TIP-V2-109` (109 trước) · `community-card.tsx`/`events` có thể đụng TIP-V2-106 (form/hydration) — rebase.
- **Phase / nhánh:** V2-P1, `feature/V2-P1-foundation-fixes`

## CONTEXT
- Đặc tả: QT-06 (gửi tin, file), UP-03 (panel thông tin: file), §8.28 NA-26 (JPG/PNG/WebP ≤ 5 MB, qua storage), QT-05 bước 1 (tham gia nhóm), §15 (upload kiểm MIME, 5MB), D-36 (tự host ảnh trước go-live).
- Audit W1: BUG-010 (CR-05), BUG-011 (CR-22, CR-25), BUG-026 (CR-46), TD-011, TD-013 (phần `DEMO_FILE`).
- Mẫu upload: `apps/portal/src/features/profile/api.ts:59-77` (`uploadAvatar`: presign → PUT → publicUrl); server kiểm khoá `${kind}/${userId}/…` + `head()` ở `uploads/image-ref.service.ts`.
- `rail-with-preview.tsx:28` đẩy `/community?join=<id>`; `useCommunityParams` không có `join`.
- Card nhóm/sự kiện Portal + lưới Admin lấy ảnh theo id (Unsplash/picsum/randomuser), bỏ qua `coverUrl`; API Portal `/groups`, `/events` chưa trả `coverUrl`.

## APPLICABLE STANDARDS
[security](../standards/security/security.md) › Upload · [adapters](../standards/integrations/adapters.md) (storage) · [socket-chat](../standards/realtime/socket-chat.md) (S-12 idempotent) · [query-indexing](../standards/database/query-indexing.md) (avatars 1 query) · [nextjs-structure](../standards/frontend/nextjs-structure.md) · [ui-parity](../standards/frontend/ui-parity.md)

## TASK
Nút tệp/ảnh trong composer mở hộp chọn tệp thật, tải lên storage qua presign rồi gửi tin `file|image` có URL; server chỉ nhận tệp do chính người gửi tải lên. Mọi card nhóm/sự kiện ở Portal, Admin, rail chat dùng `coverUrl` của API và avatar thành viên/người tham dự thật; bỏ ảnh Unsplash/picsum/randomuser trong code app. `/community?join=<id>` mở form tham gia nhóm đó.

## SPECIFICATIONS
### Business Rules
1. **Presign theo kind**: `chat-image` → `image/png|jpeg|webp` ≤ 5 MB; `chat-file` → thêm `application/pdf`, `application/vnd.openxmlformats-officedocument.{wordprocessingml.document,spreadsheetml.sheet,presentationml.presentation}`, `application/zip`, `text/plain` ≤ 10 MB (**giá trị chọn theo prototype "Ke-hoach-Q4.pdf"; ghi câu hỏi**). Khoá `chat-file/<userId>/<uuid>.<ext>` do server sinh (security.md). Presign cần phí (khác avatar).
2. **Gửi tin** (`POST /rooms/:id/messages`, WS `message.send`): `kind file|image` bắt buộc `attachment.url`; server `resolveFile({userId, kind, url})` kiểm: tiền tố `publicUrl('')`, khoá `chat-*/<userId>/`, `head()` tồn tại, `size` = `bytes` ±0 và ≤ hạn mức, MIME khớp whitelist → lưu `attachment` = `{ name (≤120, bỏ ký tự điều khiển), ext, size (định dạng "640 KB"), bytes, contentType, url }`. Sai → 400 `VALIDATION_ERROR path attachment`. Gọi `head()` ngoài transaction (luật 9). Idempotent `clientMsgId` giữ nguyên.
3. **Hiển thị**: `image` → `<img src={url} loading=lazy>` (bấm mở tab mới); `file` → thẻ tên + dung lượng + link "Tải về" (`href=url`, `download`, `rel=noopener`). Tin cũ thiếu `url` → hiện như cũ, không có link. Panel "File" (`GET /rooms/:id/files`) trả thêm `url`.
4. **Composer**: nút tệp → `accept` theo whitelist `chat-file`; nút ảnh → `image/*` (lọc whitelist); kiểm cỡ/MIME ở FE trước khi presign (toast "Tệp tối đa 10 MB" / "Ảnh phải là PNG/JPEG/WEBP, tối đa 5MB"); đang tải → nút disabled + chỉ báo; lỗi PUT → toast, không gửi tin.
5. **Ảnh bìa**: `/groups`, `/events`, `/me/chat` trả `coverUrl` = cột DB (null → FE dùng `/images/cover-default.svg` tự host). `groupCoverSrc(custom)` không còn tham số id. Admin lưới nhóm/sự kiện dùng `coverUrl` của item.
6. **Avatar thật**: `avatars` ≤ 4 URL `users.avatar_url` khác null — nhóm: thành viên `member` mới nhất; sự kiện: người `registered|attended` mới nhất. **Một query cho cả trang** (`LATERAL (… ORDER BY created_at DESC LIMIT 4)` theo danh sách id, dùng index `group_members(group_id, status, …)` / `event_registrations(event_id, status, created_at)` đã có). Không có ảnh → không vẽ (bỏ mặt người mẫu).
7. **BUG-026**: `useCommunityParams` thêm `join: z.string().optional().catch(undefined)`; màn Cộng đồng khi dữ liệu nhóm tải xong và có `join` → `actions.handlers.onJoin(group)` một lần, đóng modal thì xoá `join` khỏi URL (`update({ join: undefined })`). Nhóm không tồn tại / đã tham gia → bỏ qua `join`, không lỗi.

### Validation / Error Handling
- zod: `attachmentSchema` (shared) + `presignRequestSchema` discriminated theo `kind`; MSW parse cùng schema.
- `head()` null → 400 "Tệp chưa được tải lên".

### Data / Migration
- Không đổi bảng (`messages.attachment` là jsonb; `groups.cover_url`, `events.cover_url` có sẵn). Không migration.

## ACCEPTANCE CRITERIA
- Given thành viên chọn `bao-cao.pdf` 300 KB, When gửi, Then tin `file` có link tải đúng tệp trên storage; người khác trong phòng tải được (BUG-010, QT-06).
- Given gửi `attachment.url` là khoá của người khác / chưa PUT / MIME `image/svg+xml`, Then 400, không có tin (BUG-010, §15 upload).
- Given ảnh 6 MB, When chọn ở nút ảnh, Then toast lỗi, không gọi presign (NA-26).
- Given Admin đặt ảnh bìa nhóm c1 (qua TIP-V2-102), When mở Portal Cộng đồng, rail chat, Admin lưới nhóm, Then cả ba hiện đúng ảnh đó; grep `unsplash|picsum|randomuser` trong `apps/*/src` + `packages/ui/src` (ngoài mocks/fixtures) = 0 (BUG-011, TD-011, D-36).
- Given nhóm có 3 thành viên có avatar, Then card hiện đúng 3 avatar đó (BUG-011).
- Given vào `/community?join=c6` (nhóm cần duyệt, chưa tham gia), Then modal tham gia nhóm c6 mở; đóng → URL bỏ `join` (BUG-026, QT-05).

## TESTS BẮT BUỘC
- `apps/server/test/chat/chat-rest.int.spec.ts`: `BUG-010 QT-06 gửi tệp đã tải lên → tin file có url`, test âm `BUG-010 tệp của người khác / chưa tải / sai MIME → 400`.
- `apps/server/test/account/profile.int.spec.ts`: `REQ-226 presign chat-file pdf ≤10MB; svg → 400`.
- `apps/server/test/community/groups.int.spec.ts`, `apps/server/test/event/events.int.spec.ts`: `BUG-011 danh sách trả coverUrl + avatars ≤4 thật` (+ đếm query: 1 query avatars cho cả trang).
- `e2e/behavior/chat.spec.ts`: `BUG-010 QT-06 đính kèm tệp thật qua hộp chọn tệp` (`setInputFiles`, msw + server).
- `e2e/behavior/community.spec.ts`: `BUG-026 QT-05 /community?join= mở form tham gia`.
- `e2e/behavior/events.spec.ts` / `community.spec.ts`: `BUG-011 card dùng coverUrl API`.

## CONSTRAINTS
- DO NOT: API nhận file (chỉ presign PUT); dùng tên tệp người dùng làm khoá; truy vấn avatar theo từng nhóm/sự kiện (N+1); để ảnh ngoài (CDN bên thứ ba) trong code app; đổi parity baseline (TIP-V2-307 làm).
- REUSE: `uploadAvatar` pattern, `ImageRefService`, `StorageProvider.head/publicUrl`, `GroupCover`/`AvatarStack` của `packages/ui`.
- SKIP: nén/thumbnail ảnh (NA-26 bước 3 — TIP-V2-102 nếu có), quét virus, dọn tệp mồ côi (TIP-V2-306), `flagcdn` (CR-25: ghi nợ, không trong phạm vi).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 6 (S-12 idempotent, không query DB theo từng người nhận), luật 5 (không query trong vòng lặp), luật 11 (storage qua adapter, dev dùng fake/local provider), luật 1 (`composer.tsx` ≤ 250 dòng: tách hook upload).
- [ ] File dùng chung (`packages/ui/index.ts`, `messages/vi/*.json`) chỉ thêm dòng, giữ `.wire-lock`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`; `pnpm test:int`; e2e msw + `e2e:server` (cùng assertion).
- [ ] `git commit -- <paths>`, `git status --short` sạch, báo `TIP-V2-111-DONE <sha> — <N> test passed`; report `coding-packs/reports/TIP-V2-111-completion.md`.
