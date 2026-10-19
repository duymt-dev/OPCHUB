# TIP-V2-102 — Ảnh qua storage, giới hạn body thống nhất (completion)

> V2-P1, nhánh `feature/V2-P1-foundation-fixes`. NA-26, BUG-002, BUG-003, BUG-037, TD-014, TD-015, CR-09. Không đổi schema Prisma.
> Commit: `4931f59` (server + shared + infra), `2e29f35` (FE + e2e + sửa CORP ảnh local).

## Đã làm
- **Shared**: `UPLOAD_KINDS` thêm `group-cover`, `persona-avatar`, `platform-logo`; trường ảnh (`coverUrl` nhóm/sự kiện/dự án, `avatarUrl` persona/đội ngũ, `logoUrl`) → `z.string().max(2000)`; mã lỗi `PAYLOAD_TOO_LARGE` (413).
- **Giới hạn body (TD-015)**: `common/http/body-limits.ts` (`JSON_LIMIT 768kb`, `FORM_LIMIT 64kb`); `bootstrap-http.ts` gọi `useBodyParser` (Nest bỏ parser mặc định 100kb, `rawBody` giữ nguyên cho webhook ngân hàng). nginx giữ `client_max_body_size 1m`, thêm `error_page 413 = @too_large` trả envelope JSON. Bảng mã lỗi `api-conventions.md` thêm 413.
- **Filter (BUG-003)**: `entity.too.large` / status 413 → 413 `PAYLOAD_TOO_LARGE`; `entity.parse.failed` → 400 `VALIDATION_ERROR` "Dữ liệu gửi lên không đúng định dạng JSON" (không `fields`); cả hai log `warn`. Vì Nest đổi mọi `SyntaxError` thành `BadRequestException(message thô)` trước khi tới filter, thêm middleware lỗi `common/http/body-parser-errors.ts` đứng ngay sau parser để giữ `type`.
- **ImageRefService**: bỏ nhánh data URL (→ 400 `fields[{path}]`), gửi lại đúng URL đang lưu vẫn qua nhánh `current`. Gắn (ngoài transaction) cho `GroupAdminService` (create/update, `group-cover`, URL hiện tại qua `GroupAdminRepository.coverOf`), `BotCatalogService` (persona create/update, `persona-avatar`), `SettingsAdminService.patchGeneral` (`platform-logo`, chỉ khi patch có `logoUrl`). Module import `UploadsCoreModule`.
- **Backfill (TD-014)**: `MediaBackfillService.run()` — 5 cột + `app_settings.general.logoUrl`, keyset theo id lô 50, `storage.put('${kind}/system/<uuid>.<ext>')` ngoài transaction, `UPDATE … WHERE id = $1 AND <cột> = $old`; data URL hỏng / sai MIME / > 5 MB → NULL + warn. `MediaBackfillProcessor` (worker) chạy một lần lúc bootstrap (`void … .catch(log)`), logo đổi → `invalidate('general')`.
- **FE**: `packages/ui` thêm `compressImage` / `fitWithin` / `validateImageFile` (canvas → WebP, không có thì JPEG, 0,85; bìa 1600px, avatar/logo/persona 512px) và hook `useImageUpload` (xem trước `URL.createObjectURL`, lỗi → trả ảnh cũ, `uploading` khoá nút Lưu). `apps/{admin,portal}/src/lib/upload-image.ts` (nén → presign → PUT → `publicUrl`). Admin: form sự kiện, nhóm, persona, logo bỏ `readAsDataURL`. Portal: ảnh bìa + ảnh đội ngũ dự án qua `useProjectImages`, `uploadAvatar` gọi lib; xoá `read-image.ts`. Copy lỗi ảnh đổi thành "PNG, JPG hoặc WebP, tối đa 5 MB" (logo trước đây ghi SVG/2 MB — SVG không thuộc NA-26).
- **MSW Admin**: `mocks/handlers/uploads.ts` (presign/PUT/GET như Portal).
- **Ngoài danh sách file TIP (cần để AC "hiển thị ảnh" đạt trên server thật)**: `local-uploads.controller.ts` GET đặt `Cross-Origin-Resource-Policy: cross-origin` — helmet mặc định `same-origin` làm Admin (origin 3201) không hiển thị được ảnh có URL gốc Portal (3200). Chỉ ảnh hưởng provider local (dev/e2e); S3/MinIO không qua controller này.

## Test (số thật)
- Unit server: **57/57** (thêm 2 case filter, sửa case data URL `image-ref.service.spec.ts`).
- Unit `packages/ui`: **25/25** (mới `compress-image.spec.ts` 3 test: giới hạn cạnh + tỉ lệ, GIF/6 MB, jsdom trả tệp gốc). Portal **88/88**, Admin **117/117**, shared **73/73**.
- Int mới: `common/body-limit.int.spec.ts` 4 test (BUG-003 1,5 MB → 413 + không log error; JSON hỏng → 400; BUG-037 100.000 "ệ" → 201; BUG-002 sự kiện ảnh 300 KB → 201, DB lưu URL storage). `uploads/media-refs.int.spec.ts` 9 test (nhóm/sự kiện/persona/logo: data URL → 400, URL của mình → lưu, khoá người khác / URL ngoài → 400, Admin khác gửi lại URL cũ không kiểm lại; dự án: data URL → 400, bìa + đội ngũ 1,5 MB → 201, khoá người khác → 400). `uploads/media-backfill.int.spec.ts` 2 test (6 vị trí → storage, lần 2 không ghi; hỏng → NULL). `error-envelope.int.spec.ts` +1 test. Dùng `LocalStorageProvider` thư mục tạm.
- **Toàn bộ int server: 63 file, 253/253** (gồm webhook ngân hàng dùng `rawBody`).
- `pnpm lint` xanh (chỉ warning `<img>` có sẵn — TD-027), `pnpm typecheck` xanh, `pnpm depcheck` không vi phạm.
- `c3-body-limit.audit.ts`: **Đạt 79 · Không đạt 0**; hết mục filter 500 và hết dòng "FE gửi ảnh dạng data URL".
- E2E MSW (build riêng `.next-102`, cổng 3110/3111): `admin-events` + `projects` **15/15**; liên quan `admin-groups`, `admin-bots`, `admin-settings`, `profile` **24/24**.
- E2E server thật (api/socket/worker build riêng cổng 4100/4101, `STORAGE_PROVIDER=local`, Next `.next-server-102` cổng 3210/3211, `opchub_dev` + `seed:demo`): 6 spec trên **39/39** (sau khi sửa CORP; trước đó test ảnh sự kiện fail vì ảnh không hiển thị ở Admin).

## Backfill trên `opchub_dev`
- Đếm trước khi chạy: **0** data URL ở cả 6 vị trí (groups, events, projects, project_members, personas, logo) — seed demo không có ảnh data URL. Worker mới đã khởi động trên `opchub_dev` → backfill chạy, chuyển **0 dòng**. Hành vi chuyển đổi được chứng minh bằng int test.

## Việc cho agent chính
- Không cần migration. Nếu muốn chặn hồi quy ở DB: `CHECK (… NOT LIKE 'data:%') NOT VALID` cho 5 cột — chỉ sau khi backfill xong trên staging (TIP Data/Migration).
- nginx: cấu hình mới cần `nginx -t` trên VPS khi deploy (chưa kiểm được ở máy dev Windows).
- Production S3/MinIO: bucket ảnh công khai phải cho phép trình duyệt Admin/Portal đọc (CORS/CORP của bucket) — ngoài phạm vi code.

## Chưa làm (SKIP theo TIP)
- Ảnh chat, ảnh bìa nhóm/sự kiện ở Portal (TIP-V2-111), dọn ảnh cũ bị thay (NA-13, TIP-V2-306), `next/image` (TD-027), cắt tỉ lệ ảnh (NA-26 nói "cắt tỉ lệ" — TIP chỉ yêu cầu nén giữ tỉ lệ).
