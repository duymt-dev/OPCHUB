# TIP-V2-102: Ảnh qua storage (presign), giới hạn body thống nhất, 413/400 thay 500 (NA-26, BUG-002, 003, 037, TD-014, 015, CR-09)

## HEADER
- TIP-ID: TIP-V2-102 · Project: OPCHUB · Module: uploads + common/http + FE ảnh · Priority: P0 · Depends on: — · Estimated: L (12h)
- **Files touched:**
  - Shared: `packages/shared/src/api-domains/profile.ts` (modify: `UPLOAD_KINDS` thêm `group-cover`, `persona-avatar`, `platform-logo`), `group-admin.ts`, `event-admin.ts`, `settings-admin.ts`, `bot.ts`, `project-portal.ts` (modify: trường ảnh `coverUrl` / `logoUrl` / `avatarUrl` → `z.string().max(2000)`), `packages/shared/src/errors.ts` (modify: thêm `PAYLOAD_TOO_LARGE`)
  - Server common: `apps/server/src/common/http/body-limits.ts` (create), `apps/server/src/common/http/bootstrap-http.ts` (modify: `useBodyParser('json'|'urlencoded', { limit })`), `apps/server/src/common/filters/http-exception.filter.ts` + `.spec.ts` (modify: nhận lỗi body-parser), `apps/server/src/common/errors/app-error.ts` (modify: `HTTP_STATUS.PAYLOAD_TOO_LARGE = 413`)
  - Uploads: `apps/server/src/modules/uploads/image-ref.service.ts` + `.spec.ts` (modify: bỏ nhận data URL), `media-backfill.service.ts` + `media-backfill.spec.ts` (create), `uploads.module.ts`, `index.ts` (modify: export)
  - Domain dùng ảnh: `apps/server/src/modules/community/services/group-admin.service.ts` + `community-core.module.ts` (import `UploadsCoreModule`); `apps/server/src/modules/bot/services/bot-catalog.service.ts` + `bot.module.ts`; `apps/server/src/modules/settings/services/settings-admin.service.ts` + `settings-http.module.ts`
  - Worker: `apps/server/src/worker/processors/media-backfill.processor.ts` (create), `apps/server/src/worker/worker-app.module.ts` (modify — chỉ thêm dòng)
  - Infra: `infra/nginx/snippets/opchub-backend.conf` (modify: `error_page 413` trả JSON envelope)
  - Standards: `coding-packs/standards/backend/api-conventions.md` (modify: thêm dòng 413 `PAYLOAD_TOO_LARGE` vào bảng mã lỗi)
  - FE dùng chung: `packages/ui/src/upload-image/compress-image.ts` + `compress-image.spec.ts` (create), `packages/ui/src/index.ts` (modify — chỉ thêm dòng export)
  - Admin: `apps/admin/src/lib/upload-image.ts` (create: presign + PUT), `features/events/components/event-form.tsx`, `features/groups/components/group-form.tsx`, `features/settings/components/logo-picker.tsx`, `features/bots/components/persona-photo.tsx` (modify: bỏ `readAsDataURL`), `apps/admin/src/mocks/handlers/uploads.ts` (create), `apps/admin/src/mocks/handlers/index.ts` (modify — thêm dòng)
  - Portal: `apps/portal/src/lib/upload-image.ts` (create), `features/profile/api.ts` (modify: `uploadAvatar` gọi lib), `features/projects/components/form-basic.tsx`, `form-team.tsx` (modify), `features/projects/components/read-image.ts` (delete)
  - Test: `apps/server/test/common/body-limit.int.spec.ts`, `apps/server/test/uploads/media-refs.int.spec.ts`, `apps/server/test/uploads/media-backfill.int.spec.ts` (create); `apps/server/test/common/error-envelope.int.spec.ts` (modify); `e2e/behavior/admin-events.spec.ts`, `e2e/behavior/projects.spec.ts` (modify: thêm test ảnh 300KB)
- **Parallel-safe with:** TIP-V2-101, 104, 105, 107, 108, 109, 114. `sequential, shares profile.ts (UPLOAD_KINDS) + image-ref.service.ts with TIP-V2-111` (111 sau 102). `sequential, shares infra/nginx/snippets/opchub-backend.conf with TIP-V2-112`. `sequential, shares event-form.tsx, group-form.tsx with TIP-V2-106` (106 sau 102). `shares form-basic.tsx with TIP-V2-113` nếu 113 sửa form dự án (113 sau 102).
- **Phase / nhánh:** V2-P1, `feature/V2-P1-foundation-fixes` (nhánh con `feature/V2-P1-102-media-storage`)

## CONTEXT
- Đặc tả §8.28 NA-26 (JPG/PNG/WebP ≤ 5 MB, nén, cắt tỉ lệ, sai → báo lỗi giữ ảnh cũ, ảnh cũ dọn theo NA-13); §14.2 mã lỗi; D-09 (MinIO/S3), D-36.
- Audit: BUGS.md BUG-002 (9 endpoint, body > 100 kB → 500), BUG-003 (`normalizeError` không nhận lỗi body-parser), BUG-037 (chiến dịch 100.000 ký tự > 100 kB); TECH-DEBT TD-014 (data URL trong DB), TD-015 (3 lớp giới hạn lệch); `work/code-review.md` CR-09; kiểm cơ học `apps/server/test/audit/c3-body-limit.audit.ts` (M3).
- Mẫu đã đúng: avatar thành viên `apps/portal/src/features/profile/api.ts › uploadAvatar` + `UploadsService.presign` + `ImageRefService.resolve` (kiểm khoá `${kind}/${userId}/`, `head()` size/MIME); event + project đã gọi `ImageRefService` nhưng vẫn nhận data URL (`image-ref.service.ts:9-10,35-38`).
- Chỗ còn data URL: `apps/admin/src/features/{events,groups}/components/*-form.tsx` (`readImage`), `settings/components/logo-picker.tsx:28-30`, `bots/components/persona-photo.tsx:29-32`, `apps/portal/src/features/projects/components/read-image.ts`. Server chưa kiểm ảnh: `group-admin.service.ts:95` (`coverUrl: input.coverUrl`), `bot-catalog.service.ts` (persona `avatarUrl`), `settings-admin.service.ts:74` (`logoUrl`).
- MSW Portal đã có presign/PUT/GET (`apps/portal/src/mocks/handlers/profile.ts:46-65`) — Admin làm tương tự.

## APPLICABLE STANDARDS
[security](../standards/security/security.md) (Upload: API không nhận file) · [api-conventions](../standards/backend/api-conventions.md) · [adapters](../standards/integrations/adapters.md) · [nestjs-modules](../standards/backend/nestjs-modules.md) · [antd-ui](../standards/frontend/antd-ui.md) · [data-state](../standards/frontend/data-state.md) · [testing](../standards/testing/testing.md)

## TASK
Mọi ảnh (bìa nhóm, bìa sự kiện, persona, logo, bìa dự án, ảnh đội ngũ) đi qua `POST /uploads/presign` + PUT thẳng storage, server chỉ nhận URL storage và kiểm `head()`. Thống nhất giới hạn zod / body-parser / nginx; lỗi quá cỡ trả 413, JSON hỏng trả 400. Chuyển dữ liệu data URL cũ sang storage.

## SPECIFICATIONS
### Business Rules
1. **NA-26 kiểu ảnh**: `group-cover`, `event-cover`, `project-cover`, `team-avatar`, `persona-avatar`, `platform-logo`, `avatar`; JPG/PNG/WebP, ≤ 5 MB (giữ `presignRequestSchema`). Client nén trước khi presign bằng `compressImage(file, { maxEdge })` (canvas → WebP/JPEG chất lượng 0,85; bìa `maxEdge 1600`, avatar/logo/persona `512`); sai định dạng / > 5 MB → báo lỗi tại ô, **giữ ảnh cũ** (không gọi `onChange`).
2. `ImageRefService.resolve`: bỏ nhánh `data:` → `VALIDATION_ERROR` `fields[{path}]` "Ảnh không hợp lệ". Giữ: gửi lại đúng URL đang lưu (`current`) thì không kiểm lại. Ảnh do Admin tải: khoá `${kind}/${actorId}/…`; sửa bản ghi do Admin khác tải giữ nguyên URL cũ → qua nhánh `current`.
3. Gắn `ImageRefService` (gọi NGOÀI transaction) cho: `GroupAdminService` (create/update `coverUrl`, kind `group-cover`), `BotCatalogService` (create/update persona `avatarUrl`, kind `persona-avatar`), `SettingsAdminService.patchGeneral` (`logoUrl`, kind `platform-logo`).
4. **Giới hạn thống nhất (TD-015)** — một nguồn `body-limits.ts`: `JSON_LIMIT = '768kb'`, `FORM_LIMIT = '64kb'`; nginx `client_max_body_size 1m` (giữ) > body-parser > payload zod lớn nhất (chiến dịch 100.000 ký tự tiếng Việt ≈ 300 kB UTF-8). Webhook ngân hàng vẫn đọc `rawBody` (giữ `rawBody: true` ở `main-api.ts`, kiểm lại bằng test webhook hiện có).
5. **Filter (BUG-003)**: lỗi có `type === 'entity.too.large'` (hoặc `status/statusCode === 413`) → 413 `PAYLOAD_TOO_LARGE` "Dữ liệu gửi lên quá lớn"; `type === 'entity.parse.failed'` → 400 `VALIDATION_ERROR` "Dữ liệu gửi lên không đúng định dạng JSON" (không `fields`); hai loại này log mức `warn`, không `error`.
6. nginx: `error_page 413 = @too_large;` + `location @too_large { default_type application/json; return 413 '{"error":{"code":"PAYLOAD_TOO_LARGE","message":"Dữ liệu gửi lên quá lớn"}}'; }` để client parse được envelope.
7. **Chuyển dữ liệu cũ** `MediaBackfillService.run()`: quét `groups.cover_url`, `events.cover_url`, `projects.cover_url`, `project_members.avatar_url`, `personas.avatar_url`, `app_settings['general'].logoUrl` có `LIKE 'data:%'` theo lô 50 (keyset theo id) → decode base64, kiểm MIME/size như rule 1, `storage.put('${kind}/system/<uuid>.<ext>')`, `UPDATE … WHERE id = $1 AND cover_url = $old` (có điều kiện, idempotent). Data URL hỏng → đặt `NULL` + log warn (ảnh mặc định NA-26 bước 5). Logo: `invalidate('general')` sau khi ghi. Gọi một lần lúc worker khởi động (`MediaBackfillProcessor.onApplicationBootstrap`, không chặn bootstrap: `void … .catch(log)`).
8. FE: `uploadImage(file, kind)` trong `apps/{admin,portal}/src/lib/upload-image.ts` (nén → presign → PUT → `publicUrl`); form chỉ giữ URL. Xem trước bằng `URL.createObjectURL` trong lúc tải. Nút Lưu khoá khi đang tải ảnh.

### Validation
- Zod trường ảnh: `z.string().max(2000).nullable()` (URL, không còn 2.000.000 / 2.800.000 / 7.000.000 ký tự). Server vẫn kiểm `head()` (rule 2).

### Data / Migration
- Không đổi schema Prisma. Chuyển dữ liệu bằng rule 7 (code, idempotent, chạy lại an toàn). Nếu agent chính muốn chặn hồi quy ở DB: migration do agent chính tạo, `--create-only` + review SQL, thêm `CHECK (cover_url NOT LIKE 'data:%') NOT VALID` cho 5 cột — chỉ sau khi backfill xong trên staging.

## ACCEPTANCE CRITERIA
- Given Admin chọn ảnh bìa PNG 300 KB, When tạo sự kiện / nhóm / persona / logo, Then lưu thành công, DB lưu URL storage (không `data:`), Portal/Admin hiển thị ảnh (BUG-002, NA-26, UAT-…).
- Given thành viên gửi dự án có ảnh bìa + ảnh đội ngũ 1,5 MB, Then 200/201, URL storage (BUG-002, CR-09).
- Given body JSON 1,5 MB, Then 413 `PAYLOAD_TOO_LARGE` đúng envelope, log không có mức error (BUG-003).
- Given JSON sai cú pháp, Then 400 `VALIDATION_ERROR` (BUG-003).
- Given chiến dịch 100.000 ký tự "ệ", Then 201 (BUG-037).
- Given `coverUrl` là data URL hoặc URL ngoài storage hoặc khoá của user khác, Then 400 `fields[{path:'coverUrl'}]` (NA-26).
- Given DB có data URL cũ ở 6 vị trí, When backfill chạy 2 lần, Then 0 dòng `LIKE 'data:%'`, object tồn tại trên storage, lần 2 không ghi gì (TD-014).
- Given chọn ảnh GIF hoặc 6 MB, Then báo lỗi tại ô, ảnh cũ giữ nguyên (NA-26).

## TESTS BẮT BUỘC
- Int `apps/server/test/common/body-limit.int.spec.ts`: `BUG-003 body 1,5MB → 413 PAYLOAD_TOO_LARGE`, `BUG-003 JSON hỏng → 400`, `BUG-037 REQ-226 chiến dịch 100.000 ký tự tiếng Việt → 201`, `BUG-002 sự kiện coverUrl storage 300KB ảnh → 201`.
- Int `apps/server/test/uploads/media-refs.int.spec.ts`: `REQ-226 nhóm|sự kiện|persona|logo|dự án: data URL → 400`, `REQ-226 URL storage của chính người gọi → lưu`, `REQ-226 khoá người khác → 400`, `REQ-226 gửi lại URL cũ không kiểm lại` (dùng `LocalStorageProvider` thư mục tạm).
- Int `apps/server/test/uploads/media-backfill.int.spec.ts`: `TD-014 backfill chuyển data URL → storage, idempotent`, `TD-014 data URL hỏng → NULL`.
- Unit `packages/ui/src/upload-image/compress-image.spec.ts` (giới hạn cạnh, giữ tỉ lệ); `http-exception.filter.spec.ts` thêm 2 case; `image-ref.service.spec.ts` sửa case data URL.
- E2E (chạy cả msw + server, cùng assertion): `admin-events.spec.ts` `BUG-002 REQ-226 tạo sự kiện với ảnh bìa 300KB → thấy ảnh trong lưới`; `projects.spec.ts` `BUG-002 REQ-226 dự án có ảnh bìa`. Ảnh sinh trong test bằng `Buffer` PNG (không thêm file nhị phân vào repo).

## CONSTRAINTS
- DO NOT: gọi storage trong transaction (luật 9 cũ / security.md); thêm thư viện xử lý ảnh phía server (sharp…) — nén ở client; nhận file qua API; tăng `client_max_body_size` vượt 1m; giữ fallback data URL.
- REUSE: `UploadsService.presign`, `ImageRefService`, `StorageProvider.put/head/publicUrl`, `UploadImage` (`packages/ui`), MSW presign của Portal làm mẫu.
- SKIP: ảnh đính kèm chat + ảnh bìa nhóm/sự kiện ở Portal bỏ qua `coverUrl` (TIP-V2-111), dọn ảnh cũ bị thay (NA-13, TIP-V2-306), `next/image` (TD-027).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 2 (zod mọi input), luật 11 (storage chỉ qua adapter), luật 12 (không env mới; nếu thêm phải vào `.env.example` + zod), luật 1 (FE ≤ 250 dòng tối ưu, page orchestrator).
- [ ] Shared file chỉ thêm dòng (`packages/ui/src/index.ts`, `mocks/handlers/index.ts`, `worker-app.module.ts`), giữ `.wire-lock`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`; `test:int` xanh; `pnpm e2e` (msw) + `pnpm e2e:server --project behavior` xanh; chạy lại `apps/server/test/audit/c3-body-limit.audit.ts` không còn mục 500.
- [ ] `git commit -- <paths>` (không `-A`), `git status --short` sạch; báo `TIP-V2-102-DONE <sha> — <N> test passed`; report `coding-packs/reports/TIP-V2-102-completion.md` (ghi số dòng data URL đã chuyển trên `opchub_dev`).
