# TIP-V2-113: Bản sửa dự án chờ duyệt + chốt cạnh §9 + UX nhỏ Admin (completion)

> V2-P1, nhánh `feature/V2-P1-foundation-fixes`. REQ-106 · D-18 · BUG-033 · BUG-038 · BUG-041 · BUG-027 · BUG-043 ·
> BUG-044 / TD-030 · EV-R05 · NA-23 · LK-08. Migration do agent chính tạo + áp (`cd62366`, seed `5217d76`) — TIP
> **không cần thêm migration**. V2Q mới: V2Q-102 → V2Q-106.
> Commit: `11aa976` (ui: ConfirmDialog / LinkDialog / sidebar), `e88f5ce` (phiếu YC bỏ `done`), `cd97dc6` (đăng ký sự
> kiện qua bảng trạng thái), `72a44be` (server + shared: bản sửa dự án, BUG-033, BUG-038), `4652f91` (Portal + Admin +
> MSW + e2e) + commit báo cáo này.

## Đã làm
- **Bản sửa dự án (REQ-106, D-18, BUG-033)**
  - `domain/project-status.ts`: `OWNER_EDITABLE` bỏ `rejected`; `ownerSaveStatus(cur, submit)` (Nháp/Cần chỉnh sửa →
    gửi ? Chờ duyệt : giữ; Chờ duyệt giữ Chờ duyệt; Đang hiển thị → bản sửa; còn lại null → 409);
    `REVISION_TRANSITIONS`, `REVISION_OPEN`, `revisionSaveStatus`.
  - `domain/project-revision.data.ts`: zod `revisionDataSchema` cho `project_revisions.data` (đúng `prepare`: ảnh đã
    `resolve`, mô tả sanitize, đội, gọi vốn, nhóm chia sẻ; tiền số nguyên), chuyển đổi ↔ `Prepared`, overlay form sửa,
    DTO bản sửa cho Admin.
  - `repositories/project-revision.repository.ts`: `upsertOpen` = một câu `INSERT … ON CONFLICT (project_id) WHERE
    status IN (…)` trên UQ partial (sửa lần 2 cập nhật cùng bản, an toàn song song); `transition` có điều kiện
    `WHERE id AND status = from`; `latestOf` 1 query cho cả trang; `countPending`; `approvedDates` (≤ 5, 1 query).
  - `services/project-revision.service.ts`: lưu bản sửa (khoá dòng dự án `FOR UPDATE`, chỉ khi còn `published`),
    gắn `revision` cho "Dự án của tôi" / form sửa, `review` trong tx của Admin: approve → bản sửa `approved` +
    `decided_at` → `applyContent` (`WHERE status IN (published, hidden)`) + `writeChildren` (dời từ service sang
    `ProjectWriteRepository`, reuse); request_changes / reject → bản sửa đổi trạng thái + note, dự án giữ nguyên;
    audit `project.revision_approve|request_changes|reject` cùng tx.
  - `project-write.service.ts` (174 dòng): nhánh `published` → bản sửa; nhánh khác ghi `projects` với
    `WHERE status = <trạng thái vừa đọc>`. `project-admin.service.ts`: thử bản sửa trước rồi mới `REVIEW_TRANSITIONS`;
    `counts.pending_review` cộng bản sửa chờ duyệt; danh sách/chi tiết gắn `revision`. `project-admin.repository.page`:
    tab Chờ duyệt = `status = pending_review` ∪ có bản sửa chờ duyệt (vẫn deferred join).
  - `GET /projects/:id` (công khai) không đọc bản sửa (`revision: null`); `GET /me/projects/:id` trả nội dung bản sửa mở.
  - Shared: `projectCardSchema.revision: { status, reviewNote } | null` (default null), `adminProjectSchema.revision`
    (nội dung bản sửa, không diff), `PROJECT_REVISION_STATUS`.
- **BUG-038**: `ProjectReadService` bỏ `GALLERY`/`UPDATES`/highlights cố định → `highlights: []`, `gallery = coverUrl ?
  [coverUrl] : []`, `updates` = Cập nhật được duyệt (≤ 5) → Xuất bản trên OPC Hub → Tạo dự án. `detail-tabs.tsx` ẩn khối
  rỗng. MSW cùng luật.
- **BUG-041**: `event/domain/registration.state.ts` (bảng cạnh: §9 `registered → attended|cancelled`, mở rộng có lý do
  `cancelled → registered` (NA-23, còn mở + chưa tới giờ), `attended → registered` (bỏ check-in nhầm, trước khi kết
  thúc); chặn `attended → cancelled`, `cancelled → attended`). `event.repository` đổi trạng thái qua `registrationEdge`;
  huỷ khi đã tham dự → 409. Phiếu YC: bỏ `done` khỏi `SERVICE_REQUEST_STATUSES` / `SERVICE_REQUEST_TRANSITIONS`
  (`won → []`), nhãn `won` = "Thành công" (server, MSW, Admin, Portal); MSW map `done` của prototype → `won`. Hết 3 lỗi
  typecheck ở `service-admin.service.ts`. Mỏ neo `c4-transitions.audit.ts` cập nhật.
- **Portal**: "Dự án của tôi" nhãn "Đang hiển thị · Bản sửa chờ duyệt / cần chỉnh sửa / bị từ chối" + lý do (`mineView`
  trong `model.ts`), ẩn nút "Chỉnh sửa" với Bị từ chối / Đã ẩn; toast riêng khi gửi/lưu bản sửa.
- **Admin**: nhãn "Bản sửa" cạnh trạng thái (lưới, bảng, drawer), dòng ở tab Chờ duyệt (`inTab`, `tabCounts`), nút "Xem
  & duyệt", drawer hiện nội dung bản sửa (`reviewView`), `drawerActions(status, pendingRevision)`.
- **BUG-027 / BUG-043 / BUG-044** (commit `11aa976`):
  - BUG-027 **nguyên nhân tái hiện được**: `AdminShell` không truyền `labels.expand` → khi thu gọn nút vẫn là "Thu gọn
    sidebar", không có "Mở rộng sidebar" (spec mới timeout đúng chỗ đó trước khi sửa; 76px + `opc-sb-mini=1` + nhớ sau
    tải lại vốn đã đúng). Sửa: `expand` bắt buộc trong `ShellLabels` (thiếu → lỗi type), bỏ fallback trong `sidebar.tsx`,
    `'expand'` vào `SHELL_KEYS`, `shell.expand` trong `common.json`. Portal đã truyền nên không lỗi.
  - BUG-043: `rich-text-field/link-dialog.tsx` (Modal packages/ui, Enter = Chèn, Esc = Huỷ, `^https?://` lỗi tại ô,
    vùng chọn là link → điền sẵn + "Gỡ liên kết") + `editor-link-dialog.tsx`; không còn `window.prompt`.
  - BUG-044: `packages/ui/src/confirm-dialog/` (`role="alertdialog"`, 420px, không motion, Esc/nền huỷ, `busy` khoá
    nút); xoá 6 `confirm-dialog.tsx` + 3 `.module.css` ở Admin. `grep confirm-dialog.tsx apps/admin/src` = 0. Hộp xác
    nhận nhóm trước là `role=dialog` có × → nay alertdialog chung (e2e admin-groups đổi locator).

## Test (số thật)
- `pnpm lint`: 8/8 task, 0 error (warning `<img>` có sẵn: portal 7, admin 5). `pnpm typecheck`: **8/8 xanh**.
  `pnpm depcheck`: no dependency violations (569 modules).
- `pnpm test`: server 91, shared 83, portal 113, admin 140, ui 35, integrations 25 + 2 skip — tất cả pass. Mới:
  `project-status.spec` `BUG-033 §9 ownerSaveStatus mọi trạng thái; rejected/hidden không sửa`, `REQ-106 bản sửa…`;
  `registration.state.spec` 4 test BUG-041 (EV-R05 chặn, NA-23 đăng ký lại, bỏ check-in); admin `model.spec`
  `REQ-106 bản sửa Chờ duyệt…`, `BUG-041 nút theo máy trạng thái SRS §9…`; shared `project-portal.spec`
  `REQ-106 D-18 MSW…`; ui `confirm-dialog.spec` (BUG-044 ×3) + `link-dialog.spec` (BUG-043 ×2) — đặt file riêng
  cạnh component thay vì `ui.spec.tsx`.
- Int server (opchub_test): **335/335** (70 file). Mới: projects `REQ-106 D-18 sửa dự án đang hiển thị tạo bản sửa, bản
  công khai giữ nguyên`, `REQ-106 một bản sửa mở/dự án`, `BUG-033 sửa dự án Bị từ chối → 409; Chờ duyệt lưu nháp vẫn
  Chờ duyệt`, `BUG-038 tab cập nhật theo mốc thật`; admin-projects `REQ-106 duyệt bản sửa áp nội dung + audit; counts
  gồm bản sửa`, `REQ-106 từ chối bản sửa giữ bản đang hiển thị`, `REQ-106 yêu cầu chỉnh sửa bản sửa…`,
  `request_changes / republish hợp lệ (nợ M4 #6 #7)`; events `BUG-041 EV-R05 attended → cancelled bị chặn`,
  `BUG-041 NA-23 đăng ký lại sau huỷ khi còn chỗ…`; admin-events `BUG-041 EV-R05 cancelled → attended bị bỏ qua…`;
  service `BUG-041 §9 phiếu YC không còn done; quoted → won; lost → consulting`.
- Kiểm cơ học `c4-transitions.audit.ts`: cạnh Đăng ký sự kiện + Phiếu YC có impl/test hợp lệ/test bị chặn; mục EXTRA
  `OWNER_EDITABLE gồm 'rejected'` và `won: ['done']` không còn khớp.
- e2e MSW (build riêng `.next-113`, Portal 3370 / Admin 3371 / proto 4860): **toàn bộ behavior 150/150**. Mới:
  `admin-shell.spec` `BUG-027 thu gọn sidebar Admin 76px, nhớ sau tải lại`; projects `REQ-106 D-18 sửa dự án đang hiển
  thị → bản sửa chờ duyệt…`, `BUG-038 tab Tổng quan ẩn…`; admin-projects `REQ-106 bản sửa chờ duyệt → duyệt → hiển thị
  bản mới` (MSW dựng bản sửa bằng cookie, server gọi API — cùng assertion, V2Q-105). Phần UX (fork) chạy riêng
  `.next-113ui` 3372/3373: admin-shell/members/requests/settings/groups/marketing/projects + portal-shell 70/70.
- **Parity** (so baseline build HEAD `56e6c58` trước TIP, cùng harness):
  - P-60, P-61, P-73, P-77, D-51 → D-56: đạt ≤ 3 % cả 2 cỡ.
  - D-10/D-11/D-14 (hộp xác nhận thành viên): 390px 6,23/6,31/7,26 % — baseline 6,37/6,31/7,26 % → TIP không tăng
    (lệch có sẵn do danh sách thành viên @390, TIP-V2-109).
  - P-64/P-65: bằng baseline (3,59/9,71 %, 4,46/10,36 %) — deviation DV-V2-109-1.
  - **P-62/P-63 tăng do BUG-038** (bỏ khối mẫu + mốc cố định của prototype): P-62 4,39 → 6,25 % @1440, 10,81 → 36,01 %
    @390; P-63 3,51 → 3,43 % @1440, 9,51 → 15,42 % @390 — lệch có chủ đích, cần PM duyệt dòng deviation (V2Q-106).
  - Không đổi baseline (TIP-V2-307), file kết quả parity tái sinh không commit.

## e2e server: CHƯA chạy
Theo brief không dựng/dừng api 4000 / socket 4001 / Next 3220/3222, không `seed:demo` opchub_dev. **Cần agent chính**:
restart api + socket (module dự án thêm provider; đăng ký sự kiện; phiếu YC bỏ `done`), rebuild Portal + Admin chế độ
server, rồi `cd e2e && pnpm exec playwright test -c playwright.server.config.ts behavior/projects.spec.ts
behavior/admin-projects.spec.ts behavior/admin-requests.spec.ts behavior/events.spec.ts behavior/admin-events.spec.ts
behavior/admin-shell.spec.ts behavior/admin-members.spec.ts behavior/admin-groups.spec.ts behavior/admin-settings.spec.ts
behavior/admin-marketing.spec.ts`. Spec admin-projects REQ-106 trên server gọi `reviseProject('p10', …)` (TK
`an.nguyen@mediasoft.vn`, `PATCH /projects/p10`) — dữ liệu được fixture `seed:demo` reset trước mỗi test.

## Acceptance criteria
- Published → sửa tên + gửi: `GET /projects/:id` vẫn tên cũ, `published`; Admin thấy dòng "Bản sửa" ở Chờ duyệt — ĐẠT
  (int + e2e MSW).
- Duyệt bản sửa → tên mới, bản sửa `approved`, audit `project.revision_approve`; từ chối → bản cũ, chủ dự án thấy lý do —
  ĐẠT (int).
- `rejected` PATCH → 409; `pending_review` lưu nháp → vẫn `pending_review` — ĐẠT (int + unit).
- Sửa bản sửa lần 2 khi bản 1 còn mở → cùng bản — ĐẠT (int, MSW unit).
- Đăng ký `attended` huỷ → 409; `cancelled` → check-in bị bỏ qua — ĐẠT (int).
- Phiếu `won` → `done` → 400 (enum không còn `done`); không còn nhãn "Hoàn thành" — ĐẠT (int; grep `Hoàn thành` trong
  `apps/*/src`, mock, e2e = 0).
- Hai dự án → tab Cập nhật khác nhau, không còn "Ra mắt phiên bản 2.0" — ĐẠT (int + e2e MSW).
- Admin thu gọn sidebar 76px, nhớ sau tải lại; rich text không `window.prompt`; grep `confirm-dialog.tsx` trong
  `apps/admin/src` = 0 — ĐẠT (e2e MSW + grep).
- e2e server — CHƯA (xem trên).

## Ngoài phạm vi / ghi chú
- SKIP theo TIP: trường nhập highlights/gallery (V2Q-106), diff trực quan bản sửa ở Admin (V2Q-104), cập nhật baseline
  parity (TIP-V2-307).
- Index: hàng duyệt dùng `project_revisions (status, updated_at DESC)` của migration đã áp (TIP ghi `(status,
  created_at DESC, id)`); truy vấn hiện chỉ đếm / lọc `EXISTS` theo `project_id` + `status` nên đủ — không đề xuất
  migration thêm.
- `project.mapper.ts` còn ảnh bìa mặc định Unsplash (`DEFAULT_COVER`) — ngoài Files touched.
- `e2e/behavior/admin-shell.spec.ts` hiện `M` trong `git status` nhưng `git diff` rỗng (cache stat line ending) — bỏ qua.
