# TIP-V2-113: Bản sửa dự án chờ duyệt (D-18, REQ-106) + chốt cạnh §9 + UX nhỏ Admin

## HEADER
- TIP-ID: TIP-V2-113 · Project: OPCHUB · Module: project, event, service, packages/ui, admin (shell, 6 màn có xác nhận) · Priority: P1 · Depends on: TIP-V2-109 (trường liên hệ dự án), TIP-V2-102 (ảnh dự án qua storage), TIP-V2-103 (sanitize mô tả), TIP-V2-106 (lỗi tại ô form dự án) · Estimated: XL (16h)
- **Files touched:**
  - **Bản sửa dự án**: `packages/db/prisma/schema/project.prisma` (modify: model `ProjectRevision`, enum `ProjectRevisionStatus`) + migration (**agent chính tạo, `--create-only` + review SQL**: UQ partial 1 bản sửa mở/dự án)
  - `apps/server/src/modules/project/domain/project-status.ts` (modify: `OWNER_EDITABLE`, `ownerSaveStatus()`, `REVISION_TRANSITIONS`) · `domain/project-status.spec.ts` (create)
  - `apps/server/src/modules/project/repositories/project-revision.repository.ts` (create) · `services/project-revision.service.ts` (create: tạo/sửa bản sửa, áp bản sửa khi duyệt) · `services/project-write.service.ts` (modify: nhánh `published` → bản sửa) · `services/project-admin.service.ts` (modify: `review` áp/huỷ bản sửa) · `repositories/project-admin.repository.ts` (modify: hàng Chờ duyệt gồm bản sửa, `counts`) · `project-core.module.ts` (đăng ký provider)
  - `packages/shared/src/api-domains/project-admin.ts` (modify: `adminProjectSchema.revision: {...}|null`) · `project-portal.ts` (modify: `projectCardSchema.revision: { status, reviewNote }|null`)
  - `apps/portal/src/features/projects/components/mine-screen.tsx`, `project-form.tsx` (modify: nhãn "Đang hiển thị · Bản sửa chờ duyệt", sửa dự án Bị từ chối → ẩn nút sửa) · `apps/portal/messages/vi/projects.json` (thêm khoá)
  - `apps/admin/src/features/projects/components/review-drawer.tsx`, `review-body.tsx`, `project-table.tsx` (modify: nhãn "Bản sửa") · `model.ts` (`drawerActions`) · `apps/admin/messages/vi/projects.json` (thêm khoá)
  - MSW: `packages/shared/src/mock-data/domains/ops-project-portal.ts` (`saveProject`), `project-admin.ts` (`transitionProject`) (modify, cùng luật)
  - **BUG-038**: `apps/server/src/modules/project/services/project-read.service.ts` (modify: bỏ `GALLERY`, `UPDATES`, highlights cố định) · `apps/portal/src/features/projects/components/detail-tabs.tsx` (modify: ẩn khối rỗng)
  - **BUG-041**: `apps/server/src/modules/event/domain/registration.state.ts` (create) + `.spec.ts` · `event/repositories/event.repository.ts` (modify: dùng hàm transition) · `packages/shared/src/api-domains/services.ts`, `services-admin.ts` (modify: bỏ `done`) · `packages/db/prisma/schema/service.prisma` (modify enum) + migration (`UPDATE … SET status='won' WHERE status='done'` rồi đổi enum — agent chính tạo) · `apps/server/src/modules/service/service.mapper.ts` (`STATUS_LABEL.won = 'Thành công'`) · `apps/admin/src/features/requests/{types.ts,model.ts,model.spec.ts}` + `apps/admin/messages/vi/requests.json` (modify) · `packages/shared/src/mock-data/domains/services-admin.ts` (modify) · `apps/server/test/audit/c4-transitions.audit.ts` (modify mỏ neo)
  - **BUG-027**: `packages/ui/src/app-shell/{sidebar.tsx,app-shell.tsx,use-sidebar-mini.ts,app-shell.module.css}` (modify theo nguyên nhân tái hiện được) · `apps/admin/src/features/shell/components/admin-shell.tsx` (thêm `'expand'` vào `SHELL_KEYS`) · `apps/admin/messages/vi/common.json` (thêm `shell.expand`)
  - **BUG-043**: `packages/ui/src/rich-text-field/link-dialog.tsx` (create) · `rich-text-field-impl.tsx` (modify: bỏ `window.prompt`)
  - **BUG-044 / TD-030**: `packages/ui/src/confirm-dialog/{confirm-dialog.tsx,confirm-dialog.module.css,index.ts}` (create) · `packages/ui/src/index.ts` (thêm 1 dòng) · delete `apps/admin/src/features/{members,requests,settings,groups,marketing,projects}/components/confirm-dialog.tsx` + `members|requests|settings/components/confirm-dialog.module.css` · modify nơi import: `members/components/{member-dialogs,member-drawer}.tsx`, `members/hooks/use-confirm-requests.ts`, `requests/components/{requests-screen,catalog-tab}.tsx`, `settings/components/settings-screen.tsx`, `groups/components/{groups-screen,moderation-panel}.tsx`, `marketing/components/marketing-screen.tsx`, `projects/components/projects-screen.tsx`
  - Test: `apps/server/test/project/{projects,admin-projects}.int.spec.ts`, `apps/server/test/event/{events,admin-events}.int.spec.ts`, `apps/server/test/service/service.int.spec.ts` (modify); `packages/ui/src/ui.spec.tsx` (modify); `e2e/behavior/{projects,admin-projects,admin-requests,admin-members}.spec.ts` (modify), `e2e/behavior/admin-shell.spec.ts` (create)
- **Parallel-safe with:** TIP-V2-101, 104, 105, 107, 108, 110, 112, 114. `sequential, shares project.prisma + project-write.service.ts + project-portal.ts + project-form.tsx with TIP-V2-109/102/103/106` (làm sau cả 4) · `packages/ui/src/index.ts` + `group-card` đụng TIP-V2-111 (chỉ thêm dòng) · `requests` (services.ts) đụng TIP-V2-110 (110 trước) · `event.repository.ts` đụng TIP-V2-111 (avatars) — rebase.
- **Phase / nhánh:** V2-P1, `feature/V2-P1-foundation-fixes`

## CONTEXT
- Đặc tả: §9 máy trạng thái (Dự án: Nháp → Chờ duyệt → Đang hiển thị ⇄ Đã ẩn | Cần chỉnh sửa → Chờ duyệt | Bị từ chối — **Bị từ chối không có cạnh ra**; Đăng ký sự kiện: Đã đăng ký → Đã tham dự | Đã hủy; Phiếu YC: Mới → Đang tư vấn → Đã báo giá → Thành công | Từ chối → mở lại), §22.1 EV-R05, §8.25 NA-23 ("Hủy đăng ký trả lại chỗ"), QT-09, BR-08, UP-04 (Đăng ký / Hủy), LK-05, LK-08.
- REQ-106 + D-18: sửa dự án đã duyệt (bất kỳ trường nào) → bản sửa Chờ duyệt; bản đang hiển thị giữ nguyên tới khi bản sửa được duyệt.
- Audit W1: BUG-033 (M4 #3, `project-status.ts:22`), BUG-038 (CR-26, Q-B32-1), BUG-027 (CR-47, DV-06), BUG-043, BUG-044 (CR-48, TD-030), BUG-041 (M4 #4 #5). Hiện có **6** bản `confirm-dialog.tsx` (không phải 3).
- Mẫu: transition có điều kiện `ProjectAdminRepository.transition`; ghi con dự án `ProjectWriteService.writeChildren`; dialog `packages/ui/src/modal/modal.tsx`.

## APPLICABLE STANDARDS
[nestjs-modules](../standards/backend/nestjs-modules.md) (transition domain, audit) · [prisma-migrations](../standards/database/prisma-migrations.md) · [query-indexing](../standards/database/query-indexing.md) · [code-structure](../standards/global/code-structure.md) · [antd-ui](../standards/frontend/antd-ui.md) · [ui-parity](../standards/frontend/ui-parity.md) · [domain-glossary](../standards/global/domain-glossary.md)

## TASK
Chủ dự án sửa dự án Đang hiển thị → tạo bản sửa Chờ duyệt, bản công khai không đổi tới khi Admin duyệt; Bị từ chối là trạng thái cuối. Chốt các cạnh ngoài §9 của đăng ký sự kiện và phiếu YC; bỏ nội dung cố định ở tab chi tiết dự án. Sửa nút thu gọn sidebar Admin, thay `prompt()` bằng hộp nhập liên kết, gom 6 hộp xác nhận về `packages/ui`.

## SPECIFICATIONS
### Business Rules — Dự án (BUG-033, REQ-106, D-18)
1. `OWNER_EDITABLE = ['draft','needs_changes','pending_review','published']` (bỏ `rejected`: §9 không có cạnh ra; FE ẩn nút Sửa, hiện lý do từ chối). `hidden` vẫn 409.
2. `ownerSaveStatus(cur, submit)`: `draft` → submit ? `pending_review` : `draft`; `needs_changes` → submit ? `pending_review` : `needs_changes`; `pending_review` → giữ `pending_review` (Lưu nháp không lùi về Nháp — cạnh không có trong §9); `published` → **không đổi `projects`**, ghi `project_revisions`.
3. `project_revisions`: `id, project_id FK, data jsonb` (đúng `ProjectSave` đã qua `prepare`: ảnh đã `resolve`, mô tả đã sanitize, team, funding, shares), `status draft|pending_review|needs_changes|rejected|approved`, `review_note`, `created_by`, `created_at`, `updated_at`, `decided_at`. UQ partial `(project_id) WHERE status IN ('draft','pending_review','needs_changes')` — mỗi dự án tối đa 1 bản sửa mở. Index `(status, created_at DESC, id)` cho hàng duyệt.
4. Sửa dự án `published`: upsert bản sửa mở (`submit` → `pending_review`, không → `draft`); `GET /me/projects/:id` trả nội dung bản sửa mở (nếu có) để form sửa tiếp. `GET /projects/:id` (công khai) luôn đọc `projects` (bản đang hiển thị).
5. Admin › Dự án tab Chờ duyệt = dự án `pending_review` ∪ dự án có bản sửa `pending_review` (deferred join, nhãn "Bản sửa"). `POST /admin/projects/:id/review` khi có bản sửa chờ duyệt: `approve` → trong 1 tx áp `data` vào `projects` + con (reuse `writeChildren`), bản sửa → `approved`, `decided_at`; `request_changes` → bản sửa `needs_changes` + note; `reject` → bản sửa `rejected` + note, **dự án vẫn `published`**. Mọi bước `WHERE status = <from>` + audit (`project.revision_approve|request_changes|reject`). Không có bản sửa → giữ `REVIEW_TRANSITIONS` hiện tại.
6. `counts.pending_review` cộng số bản sửa chờ duyệt. Portal "Dự án của tôi": `revision.status` → nhãn "Đang hiển thị · Bản sửa chờ duyệt / cần chỉnh sửa / bị từ chối" + note.
### Business Rules — BUG-041 (chốt theo §9 + EV-R05 + NA-23)
7. **Đăng ký sự kiện** `domain/registration.state.ts`: cạnh §9 `registered → attended` (EV-R05 check-in, từng người / tất cả), `registered → cancelled`. Giữ 2 cạnh mở rộng có lý do, khai báo rõ trong bảng: `cancelled → registered` (NA-23 "trả lại chỗ" + UP-04 Đăng ký/Hủy; cùng dòng PK) chỉ khi đăng ký còn mở và chưa tới giờ; `attended → registered` (Admin bỏ check-in nhầm, có audit `event.check_in_undo`) chỉ trước khi sự kiện kết thúc. Bị chặn: `attended → cancelled`, `cancelled → attended` (409/bỏ qua) — có test.
8. **Phiếu YC**: bỏ trạng thái `done` (§9 dừng ở Thành công; glossary `won` = "Thành công"; LK-08 "Hoàn tất" ≙ Thành công). `SERVICE_REQUEST_TRANSITIONS`: `new → consulting|lost`, `consulting → quoted|lost`, `quoted → won|lost`, `lost → consulting`, `won → []`. Dữ liệu cũ `done` → `won`. Nhãn Admin `won` = "Thành công".
### Business Rules — UX
9. **BUG-038**: `ProjectDetail.highlights = []`, `gallery = coverUrl ? [coverUrl] : []`, `updates` = mốc thật: "Tạo dự án" (`createdAt`), "Xuất bản trên OPC Hub" (`publishedAt`), "Cập nhật được duyệt" (mỗi `project_revisions.approved.decided_at`, tối đa 5, 1 query). FE ẩn khối "Điểm nổi bật"/"Hình ảnh sản phẩm" khi rỗng.
10. **BUG-027**: viết e2e Admin trước để tái hiện (bấm "Thu gọn sidebar" → `aside` 76px, `localStorage opc-sb-mini = 1`, tải lại vẫn thu gọn, "Mở rộng sidebar" → 248px). Sửa đúng nguyên nhân tìm được (thiếu `labels.expand`, CSS/hydration của `useSidebarMini`, v.v.); ghi nguyên nhân vào report. Không tái hiện được thì giữ test, ghi "không tái hiện" + bằng chứng.
11. **BUG-043**: nút "Liên kết" mở `LinkDialog` (Modal `packages/ui`, ô URL + nút Chèn/Huỷ, Enter = Chèn, Esc = Huỷ); URL phải `^https?://`, sai → chữ lỗi tại ô; có vùng chọn đang là link → điền sẵn + nút "Gỡ liên kết".
12. **BUG-044**: `ConfirmDialog` dùng chung ở `packages/ui`: props `{ req: { title, body, okLabel, cancelLabel, danger? , onOk } | null, busy?, onClose }`, `role="alertdialog"`, 420px, không motion (parity), Esc/bấm nền huỷ. Thay 6 bản cục bộ; giữ nguyên chữ và kích thước để parity ≤ 3%.

### Data / Migration
- `project_revisions` (+ enum) và đổi enum `service_request_status` bỏ `done`: migration do agent chính tạo, `--create-only` + review SQL (UPDATE dữ liệu trước khi đổi type; UQ partial viết tay).

## ACCEPTANCE CRITERIA
- Given dự án `published`, When chủ dự án sửa tên + gửi duyệt, Then `GET /projects/:id` vẫn tên cũ, status `published`; Admin thấy dòng "Bản sửa" ở Chờ duyệt (REQ-106, D-18, BUG-033).
- When Admin duyệt bản sửa, Then tên mới hiển thị, bản sửa `approved`, audit `project.revision_approve`; từ chối → dự án vẫn hiển thị bản cũ, chủ dự án thấy lý do (REQ-106).
- Given dự án `rejected`, When `PATCH /projects/:id`, Then 409; `pending_review` lưu nháp → vẫn `pending_review` (BUG-033, §9).
- Given sửa bản sửa lần 2 khi bản 1 còn mở, Then cập nhật cùng bản (không tạo bản thứ 2) (D-18).
- Given đăng ký `attended`, When thành viên huỷ, Then 409; `cancelled` → check-in bị bỏ qua (BUG-041, EV-R05).
- Given phiếu `won`, When chuyển `done`, Then 400/409; không còn nhãn "Hoàn thành" (BUG-041, §9).
- Hai dự án khác nhau mở chi tiết → tab Cập nhật khác nhau, không còn "Ra mắt phiên bản 2.0" (BUG-038).
- Admin: thu gọn sidebar 76px, nhớ sau tải lại (BUG-027); rich text không gọi `window.prompt` (BUG-043); grep `confirm-dialog.tsx` trong `apps/admin/src` = 0 (BUG-044).

## TESTS BẮT BUỘC
- `apps/server/src/modules/project/domain/project-status.spec.ts`: `BUG-033 §9 ownerSaveStatus mọi trạng thái; rejected/hidden không sửa`.
- `apps/server/test/project/projects.int.spec.ts`: `REQ-106 D-18 sửa dự án đang hiển thị tạo bản sửa, bản công khai giữ nguyên`, `REQ-106 một bản sửa mở/dự án`, test âm `BUG-033 sửa dự án Bị từ chối → 409`; `BUG-038 tab cập nhật theo mốc thật`.
- `apps/server/test/project/admin-projects.int.spec.ts`: `REQ-106 duyệt bản sửa áp nội dung + audit`, `REQ-106 từ chối bản sửa giữ bản đang hiển thị`, `counts gồm bản sửa`, `republish`/`request_changes` hợp lệ (nợ M4 #6 #7).
- `apps/server/src/modules/event/domain/registration.state.spec.ts` + `apps/server/test/event/events.int.spec.ts`: `BUG-041 EV-R05 attended → cancelled bị chặn`, `BUG-041 NA-23 đăng ký lại sau huỷ khi còn chỗ`.
- `apps/server/test/service/service.int.spec.ts`: `BUG-041 §9 phiếu YC không còn done; quoted → won; lost → consulting` (nợ M4 #9 #10 #11).
- `packages/ui/src/ui.spec.tsx`: `BUG-044 ConfirmDialog Esc/nền huỷ, busy khoá nút`, `BUG-043 LinkDialog từ chối URL không http(s)`.
- `e2e/behavior/admin-shell.spec.ts`: `BUG-027 thu gọn sidebar Admin 76px, nhớ sau tải lại`; `e2e/behavior/projects.spec.ts` + `admin-projects.spec.ts`: `REQ-106 bản sửa chờ duyệt → duyệt → hiển thị bản mới` (msw + server cùng assertion).

## CONSTRAINTS
- DO NOT: chuyển dự án `published` về `pending_review`/`draft` khi sửa; tạo cạnh `rejected → *`; dùng `window.prompt|confirm|alert`; đổi chữ/kích thước hộp xác nhận (parity); đọc bản sửa ở API công khai.
- REUSE: `ProjectWriteService.prepare/writeChildren`, `ImageRefService`, `sanitizeDescription`, `Modal` của `packages/ui`, `AuditService.logMany`.
- SKIP: thêm trường nhập highlights/gallery vào form (ghi câu hỏi), diff trực quan bản sửa ở Admin (chỉ hiện nội dung bản sửa), cập nhật baseline parity (TIP-V2-307).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 7 (transition qua hàm domain + `WHERE status = <from>`), luật 10 (audit cùng tx), luật 5 (hàng duyệt deferred join, mốc cập nhật 1 query), luật 1 (`project-write.service.ts` 175 dòng — logic bản sửa ở `project-revision.service.ts`).
- [ ] `packages/ui/src/index.ts`, `messages/vi/*.json` chỉ thêm dòng, giữ `.wire-lock`; chạy `pnpm parity` các màn có hộp xác nhận (≤ 3%).
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`; `pnpm test:int`; e2e msw + `e2e:server`.
- [ ] `git commit -- <paths>`, `git status --short` sạch, báo `TIP-V2-113-DONE <sha> — <N> test passed`; report `coding-packs/reports/TIP-V2-113-completion.md`.
