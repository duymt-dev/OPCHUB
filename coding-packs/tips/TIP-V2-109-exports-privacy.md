# TIP-V2-109: Xuất dữ liệu + quyền riêng tư liên hệ dự án (NA-14, BR-13, QT-09)

## HEADER
- TIP-ID: TIP-V2-109 · Project: OPCHUB · Module: export, chat, investor, event, membership-fee, service, project · Priority: P1 · Depends on: — (dùng `OutboxService`, `AuditService` hiện có) · Estimated: L (10h)
- **Files touched:**
  - `apps/server/src/modules/export/export.service.ts`, `export.controller.ts` (modify: audit khi trả link, TTL 1 giờ)
  - `packages/shared/src/api-domains/export.ts` (modify: comment TTL, thêm `expiresInSec`)
  - `apps/admin/src/lib/use-export-job.ts` (create: hook poll `GET /admin/exports/:id` → tải) · `apps/admin/src/features/members/hooks/use-member-actions.ts`, `apps/admin/src/features/members/api.ts` (modify) · `apps/admin/messages/vi/members.json` (chỉ thêm khoá)
  - `apps/admin/src/mocks/handlers/admin-members.ts` (modify: `GET /admin/exports/:id` + `GET /exports/:id.csv` giả)
  - `apps/server/src/modules/chat/services/message.service.ts` (modify: audit ghim khi người ghim dùng quyền `c.mod`)
  - `apps/server/src/modules/investor/services/investor-admin.service.ts`, `apps/server/src/modules/event/services/event-registrants.service.ts`, `apps/server/src/modules/membership-fee/services/admin-fees.service.ts`, `apps/server/src/modules/service/services/service-admin.service.ts` (modify: đọc dữ liệu xuất + audit trong CÙNG transaction)
  - `packages/db/prisma/schema/project.prisma` (modify: `contactEmail`, `contactPhone` nullable) + migration (**agent chính tạo, `--create-only` + review SQL**)
  - `apps/server/src/modules/project/repositories/project.repository.ts` (modify `viewerContext`: bỏ email/SĐT/địa chỉ của `users`), `repositories/project-write.repository.ts` (`ProjectWrite` thêm 2 trường), `services/project-write.service.ts` (prepare), `services/project-read.service.ts`
  - `packages/shared/src/api-domains/project-portal.ts` (modify: `contact` → `{ email: string|null, phone: string|null }`; `projectSaveSchema` thêm `contactEmail`, `contactPhone`)
  - `apps/portal/src/features/projects/components/detail-hero.tsx`, `detail-side.tsx` (modify), `components/form-contact.tsx` (create), `components/project-form.tsx`, `model.ts`, `types.ts` (modify) · `apps/portal/messages/vi/projects.json` (thêm/bỏ khoá)
  - `packages/shared/src/mock-data/domains/ops-project-portal.ts` (modify `contactOf` → đọc trường dự án)
  - Test: `apps/server/test/export/export.int.spec.ts`, `apps/server/test/chat/chat-rest.int.spec.ts`, `apps/server/test/project/projects.int.spec.ts` (modify); `apps/server/test/common/sync-export-audit.int.spec.ts` (create); `e2e/behavior/admin-members.spec.ts`, `e2e/behavior/projects.spec.ts` (modify)
- **Parallel-safe with:** TIP-V2-101, 105, 106, 107, 108, 110, 112, 114. `sequential, shares message.service.ts with TIP-V2-111` (109 trước) · `sequential, shares project.prisma + project-write.service.ts + project-portal.ts + project-form.tsx with TIP-V2-113 và (có thể) 102/103` (109 trước 113) · `project.repository.ts` có thể đụng TIP-V2-104 (ẩn dự án TK khoá) — rebase cẩn thận.
- **Phase / nhánh:** V2-P1, `feature/V2-P1-foundation-fixes`

## CONTEXT
- Đặc tả: §8.16 NA-14 (link ký 1 giờ, "Tải file; ghi audit_log"), BR-13, QT-09 bước 6 ("liên hệ Email/Zalo/Gọi"), §15 NĐ 13/2023. REQ-214.
- Audit W1: BUG-013 (CR-11), BUG-017 (CR-28), BUG-039 (CR-29, CR-30), BUG-016 (CR-31, DV-B63-1), BUG-021 (CR-10, Q-G3b-3).
- Mẫu: job xuất + audit cùng tx ở `account/controllers/admin-users.controller.ts:128-150`; FE tải blob ở `apps/admin/src/features/groups/hooks/use-export.ts:20`. Hiện `GET /admin/exports/:id` không ai gọi.
- Hiện `ProjectDetail.contact` lấy thẳng `users.email`, `users.phone`, `business_profiles.address` của chủ dự án (`project.repository.ts:150-172`).

## APPLICABLE STANDARDS
[security](../standards/security/security.md) (dữ liệu cá nhân) · [nestjs-modules](../standards/backend/nestjs-modules.md) (audit cùng tx) · [prisma-migrations](../standards/database/prisma-migrations.md) · [data-state](../standards/frontend/data-state.md) · [testing](../standards/testing/testing.md)

## TASK
Đóng luồng xuất dữ liệu theo NA-14: Admin tải được file xuất thành viên, mỗi lần nhận link tải ghi audit, xuất đồng bộ ghi audit cùng transaction, Admin ghim tin có audit. Chi tiết dự án thôi lộ email/SĐT/địa chỉ cá nhân của chủ dự án; chỉ hiện kênh liên hệ chủ dự án tự công khai, nút "Nhắn tin" thay bằng Email/Zalo/Gọi.

## SPECIFICATIONS
### Business Rules
1. **NA-14 link 1 giờ**: `URL_TTL_SEC = 3600`; `exportStatusSchema` thêm `expiresInSec: number|null`.
2. **BUG-017**: `GET /admin/exports/:id` khi `status = done` và còn hạn → trong một `$transaction` ghi `audit_logs` `export.download` (entity `export`, entityId = jobId, tag `member`, summary "tải file xuất <kind> (<rowCount> dòng)", ip) rồi trả `url`. `queued|running|failed` không ghi. Controller nhận `@Req()` để lấy ip. Chỉ người tạo xem (giữ 404 cho người khác).
3. **BUG-013**: Admin Thành viên › Xuất: `POST /admin/users/export` → hook `useExportJob(jobId)` poll 1,5 giây (tối đa 60 giây) → `done` thì mở `url` (thẻ `<a download>`), toast "Đã xuất {n} thành viên"; `failed`/quá hạn chờ → toast lỗi có lý do. Hook đặt ở `apps/admin/src/lib/` để nhóm xuất (B43) dùng lại sau.
4. **BUG-039 ghim**: `MessageService.pin` — người gọi không phải chủ nhóm nhưng qua được nhờ `c.mod` (`access.isAdminViewer`) → `audit.log(tx)` cùng tx với `setPin`: action `chat.pin` / `chat.unpin`, entity `message`, tag `moderation`. Chủ nhóm ghim: không ghi (thao tác thành viên).
5. **BUG-039 xuất đồng bộ**: 4 service (`investor-admin`, `event-registrants`, `admin-fees`, `service-admin`) đọc dữ liệu xuất bằng `tx` và ghi audit trong CÙNG `$transaction`; lỗi audit → không trả CSV (500). Không đổi định dạng file, không đổi endpoint.
6. **BUG-016 (chọn theo QT-09 + NĐ 13)**: thêm `projects.contact_email`, `projects.contact_phone` (nullable). Form dự án có khối "Liên hệ công khai" (Email, SĐT Zalo/Gọi), điền sẵn từ hồ sơ chủ dự án khi tạo mới, chủ dự án xoá được. API chi tiết chỉ trả 2 trường này; **không** trả email/SĐT tài khoản, **bỏ** địa chỉ. Dự án cũ: migration để NULL (không tự công khai dữ liệu cũ). Admin vẫn xem email chủ dự án ở Admin.
7. **BUG-021**: bỏ nút "Nhắn tin" + `messageToast`; `OwnerCard` hiện 3 nút Email (`mailto:`), Zalo (`https://zalo.me/<số>`), Gọi (`tel:`) — chỉ nút có dữ liệu; không có kênh nào → dòng "Chủ dự án chưa công khai thông tin liên hệ". `Contacts` ở hero bỏ cột Địa chỉ.

### Validation
- `contactEmail`: email hợp lệ hoặc rỗng → null; `contactPhone`: `^[+0-9 ().-]{9,}$` hoặc rỗng → null (zod ở `project-portal.ts`).

### Error Handling
- Poll export lỗi mạng → thử tiếp tới hết 60 giây; 404 → toast "Không tìm thấy yêu cầu xuất".

### Data / Migration
- `ALTER TABLE projects ADD COLUMN contact_email citext NULL, ADD COLUMN contact_phone text NULL;` — migration do agent chính tạo, `--create-only` + review SQL. Không index (không lọc theo cột này).

## ACCEPTANCE CRITERIA
- Given Admin chọn 3 thành viên, When bấm Xuất, Then trình duyệt nhận file CSV 3 dòng (msw + server) (BUG-013, QT-12 bước 5).
- Given job `done`, When gọi `GET /admin/exports/:id` 2 lần, Then có 2 dòng `export.download`; job `queued` → 0 dòng; link hết hạn sau 3600 giây (BUG-017, NA-14, REQ-214).
- Given Admin `c.mod` không phải chủ nhóm, When ghim/bỏ ghim, Then có `chat.pin`/`chat.unpin` trong `audit_logs`; chủ nhóm ghim → không có (BUG-039).
- Given AuditService ném lỗi, When xuất CSV nhà đầu tư, Then 500 và không có body CSV (BUG-039, CR-30).
- Given dự án của TK có email/SĐT/địa chỉ, contact rỗng, When thành viên khác xem chi tiết, Then response không chứa email/SĐT/địa chỉ đó; UI hiện "chưa công khai" (BUG-016).
- Given chủ dự án lưu contactPhone, Then chi tiết có nút Zalo + Gọi, không có nút "Nhắn tin" (BUG-021, QT-09).

## TESTS BẮT BUỘC
- `apps/server/test/export/export.int.spec.ts`: `REQ-214 NA-14 tải file ghi audit export.download mỗi lần trả url`, `REQ-214 link ký 3600 giây`, `REQ-214 job chưa xong không ghi audit`.
- `apps/server/test/common/sync-export-audit.int.spec.ts`: `BUG-039 BR-13 xuất CSV đồng bộ: audit cùng transaction` (4 endpoint, spy audit ném lỗi → 500).
- `apps/server/test/chat/chat-rest.int.spec.ts`: `BUG-039 BR-13 c.mod ghim tin ghi audit; chủ nhóm ghim không ghi`.
- `apps/server/test/project/projects.int.spec.ts`: `BUG-016 QT-09 chi tiết dự án không lộ email/SĐT/địa chỉ TK`, test âm `contactPhone sai định dạng → 400`.
- `e2e/behavior/admin-members.spec.ts`: `REQ-214 BUG-013 xuất CSV thành viên tải được file` (msw + server, cùng assertion).
- `e2e/behavior/projects.spec.ts`: `BUG-021 QT-09 liên hệ chủ dự án Email/Zalo/Gọi, không còn Nhắn tin`.

## CONSTRAINTS
- DO NOT: trả dữ liệu `users` của chủ dự án ra Portal; gọi presign trong transaction (presign sau commit audit cũng được, nhưng audit phải commit trước khi trả url); đổi 4 export đồng bộ sang job (ghi câu hỏi).
- REUSE: `AuditService.log(tx)`, `ChatAccessService.isAdminViewer`, mẫu tải blob `groups/hooks/use-export.ts`.
- SKIP: chat 1-1 với chủ dự án (không có trong SRS-3.6); chuyển xuất nhóm thành viên sang tải từ job (ghi câu hỏi).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 10 (mọi thao tác Admin + xuất dữ liệu cá nhân ghi audit cùng tx), luật 2 (zod cho input mới), luật 1 (FE ≤ 250 dòng: `detail-hero.tsx` 141, `detail-side.tsx` 180 — tách `form-contact.tsx`).
- [ ] File dùng chung (`messages/vi/*.json`) chỉ thêm/bỏ khoá của mình, giữ `.wire-lock`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`; `pnpm test:int`; e2e msw + `e2e:server` (không thêm nhánh `onServer` làm yếu assertion — D-63).
- [ ] `git commit -- <paths>`, `git status --short` sạch, báo `TIP-V2-109-DONE <sha> — <N> test passed`; report `coding-packs/reports/TIP-V2-109-completion.md`.
