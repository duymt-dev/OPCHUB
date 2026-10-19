# TIP-V2-109: Xuất dữ liệu + quyền riêng tư liên hệ dự án (completion)

> V2-P1, nhánh `feature/V2-P1-foundation-fixes`. BUG-013, BUG-016, BUG-017, BUG-021, BUG-039 · NA-14, BR-13, QT-09, REQ-214.
> Migration `Project.contactEmail` / `contactPhone` do agent chính tạo (`37a6731`), đã áp opchub_dev + opchub_test. TIP không đổi schema.
> V2Q mới: V2Q-81 → V2Q-84. Lệch parity có chủ đích: DV-V2-109-1 (chờ PM duyệt).
> Commit: `9c89f8d` (server: xuất + audit + ghim), `695f52d` (liên hệ dự án: shared, server, Portal, mock, seed, e2e),
> `091f72d` (Admin xuất CSV + MSW + e2e) + commit báo cáo này.

## Đã làm
- **NA-14 / BUG-017**: `ExportService.status(actorId, id, ip)` — job `done` còn hạn → `$transaction` ghi `export.download`
  (entity `export`, entityId = jobId, tag `member`, summary `tải file xuất <kind> (<n> dòng)`, ip) **commit xong** mới
  presign `URL_TTL_SEC = 3600`. `queued|running|failed|hết hạn` → không ghi, `url = null`. Controller nhận `@Req()`.
  Người khác vẫn 404. `exportStatusSchema` thêm `expiresInSec: number|null`, comment TTL 1 giờ.
- **BUG-039 xuất đồng bộ**: investor, event registrants, fees, service requests đọc dữ liệu bằng `tx` + audit trong
  CÙNG `$transaction` (repo nhận `db` tuỳ chọn: `InvestorAdminRepository.all/items`, `EventRepository.registrants`,
  `AdminFeesRepository.byUserIds`; service-requests đọc `tx.serviceRequest`). Audit lỗi → 500, không có CSV. Không đổi
  định dạng file / endpoint; phần dựng CSV tách thành hàm cuối file.
- **BUG-039 ghim**: `ChatAccessService.pinAuthority` → `owner | admin | null`; `MessageService.pin(user, id, pinned, ip)`
  ghi `chat.pin` / `chat.unpin` (entity `message`, tag `moderation`) cùng tx với `setPin` chỉ khi người ghim KHÔNG phải
  chủ nhóm mà qua nhờ `c.mod` (V2Q-84). REST truyền ip; socket giữ chữ ký cũ (ip null).
- **BUG-013**: `apps/admin/src/lib/use-export-job.ts` — `waitForExport` (poll 1,5 s, tối đa 60 s; lỗi mạng thử tiếp; 4xx
  dừng giữ lý do server, vd 404 "Không tìm thấy yêu cầu xuất"), `downloadUrl` (blob → `<a download>`, khác origin →
  `<a href download>`, V2Q-83), `useExportJob`. Thành viên: `use-member-export.ts` → toast "Đã xuất {n} thành viên",
  lỗi/quá hạn → toast có lý do. MSW: `GET /admin/exports/:id` (running → done + url), `GET /exports/:id.csv` dựng CSV
  từ thành viên mock. `members.json` chỉ thêm 3 khoá.
- **BUG-016**: `viewerContext` chỉ đọc `projects.contact_email/contact_phone` (không còn `users`, `business_profiles`).
  `ProjectDetail.contact = { email: string|null, phone: string|null }`. `projectSaveSchema` thêm `contactEmail`
  (email hợp lệ hoặc rỗng → null), `contactPhone` (`^[+0-9 ().-]{9,}$`, ≤ 20, rỗng → null). `ProjectWrite` + `prepare`
  ghi 2 cột. Admin vẫn xem email chủ dự án ở Admin (không đổi).
- **Portal**: `form-contact.tsx` khối "Liên hệ công khai" (Email, SĐT Zalo/Gọi) — tạo mới điền sẵn từ `GET /me` (cùng
  khoá cache màn Hồ sơ, `select` → email + SĐT kèm mã nước), xoá được; kiểm cả khi lưu nháp, lỗi tại ô. Chi tiết:
  `detail-contact.tsx` (nút hero, dải liên hệ không còn Địa chỉ, thẻ chủ dự án Email/Zalo/Gọi; không kênh nào → "Chủ dự
  án chưa công khai thông tin liên hệ"). Bỏ nút "Nhắn tin" + `messageToast`, khoá `address`. Hàm thuần ở
  `contact-model.ts` (`validateContact`, `contactLinks`). Kích thước: `detail-hero.tsx` 141 → 83, `detail-side.tsx`
  180 → 173, `model.ts` 270.
- **Mock + seed (V2Q-81)**: `contactOf` chuyển sang `project-store.ts`; dự án mẫu công khai email + SĐT mẫu của
  prototype (không địa chỉ); `saveProject` mock lưu 2 trường. `seed/demo/project.ts` ghi cùng giá trị (cần agent chính
  chạy lại `seed:demo` để e2e server có liên hệ cho SoloBooks).

## Test (số thật)
- `pnpm lint` 8/8 (chỉ warning `<img>` có sẵn); `pnpm typecheck` 8/8; `pnpm depcheck`: no dependency violations.
- `pnpm test`: server 76/76, shared 76/76, portal 109/109, admin 137/137, ui 30/30, integrations 25 + 2 skip. Mới:
  admin `use-export-job.spec.ts` (`REQ-214 BUG-013 waitForExport…` 4 ca: done, failed, lỗi mạng → timeout sau 41 lần
  hỏi, 404 dừng); portal `contact-model.spec.ts`, `detail-contact.spec.tsx` (`BUG-016 BUG-021 QT-09 …`).
- Int server (opchub_test): **297/297** (68 file). Mới/sửa: `export.int.spec.ts` (`REQ-214 NA-14 tải file ghi audit
  export.download mỗi lần trả url`, `REQ-214 link ký 3600 giây`, `REQ-214 job chưa xong không ghi audit`);
  `common/sync-export-audit.int.spec.ts` (`BUG-039 BR-13 xuất CSV đồng bộ: audit cùng transaction` — 4 endpoint: repo
  đọc bằng chính `tx` audit nhận, audit ném lỗi → 500 không có CSV; **đã thử với code trước TIP: FAIL**);
  `chat-rest.int.spec.ts` (`BUG-039 BR-13 c.mod ghim tin ghi audit; chủ nhóm ghim không ghi`); `projects.int.spec.ts`
  (`BUG-016 QT-09 chi tiết dự án không lộ email/SĐT/địa chỉ TK` — kiểm cả body thô, `BUG-016 contactPhone sai định
  dạng → 400; rỗng → null`, ca chi tiết cũ sửa thành liên hệ công khai).
- e2e MSW (build riêng `.next-server-109`, Portal 3330 / Admin 3331 / proto 4820): spec liên quan 22/22; **toàn bộ
  behavior 138 passed, 0 failed**. Mới: `admin-members` `REQ-214 BUG-013 xuất CSV thành viên tải được file` (3 người →
  file .csv 4 dòng có tên 3 người + toast "Đã xuất 3 thành viên"); `projects` `BUG-021 QT-09 liên hệ chủ dự án
  Email/Zalo/Gọi, không còn Nhắn tin` (href mailto/zalo/tel, không nút "Nhắn tin", không "Địa chỉ"), `BUG-016 QT-09 form
  có Liên hệ công khai…` (điền sẵn email hồ sơ, SĐT sai → lỗi tại ô, xoá trống lưu được). Không nhánh `onServer`.
- **Parity** (so bản HEAD `b37db1a` build trong worktree tạm, cùng prototype; 46 ảnh P-6x, P-7x, D-07…D-10):
  HEAD: 40 đạt, lệch sẵn D-07/D-09/D-10 @390, P-74 @390 (không do TIP). Bản TIP thêm lệch ở chi tiết dự án P-62…P-69,
  P-71, P-72: 3,5–4,9% @1440, 9,0–11,9% @390 — do bỏ Địa chỉ + đổi "Nhắn tin" thành 3 nút (yêu cầu của TIP) →
  DV-V2-109-1 ghi vào `deviations.md`, chờ PM duyệt. Form (P-73…P-77) và Thành viên không đổi. Không commit file kết quả
  parity (đã `git checkout` + `git clean`).

## e2e server: CHƯA chạy
Theo brief, không dựng/dừng api 4000 / Next 3200/3201/3220/3222, không `seed:demo` trên opchub_dev. **Cần agent chính**:
`seed:demo` (dự án mẫu có liên hệ công khai), rebuild Portal + Admin chế độ server, chạy
`e2e:server behavior/admin-members.spec.ts behavior/projects.spec.ts` (worker phải chạy để job xuất `done`; link tải là
`/v1/uploads/exports/<id>.csv` của LocalStorage).

## Ngoài phạm vi / ghi chú
- Xuất thành viên nhóm (B43) vẫn dựng file ở trình duyệt; hook `useExportJob` sẵn để chuyển (V2Q-83).
- Socket `message.pin` không có ip (audit ghi ip null).
- Tiến trình đã tạo và đã dừng: `next start` 3330 (PID 25444), 3331 (10220), proto 4820 (33996); lượt baseline 3330
  (31028), 3331 (5704), 4820 (16692). Các cổng đã trống. Còn thư mục `D:/opchub-local/v2/wt-109-base` (worktree tạm đã
  `git worktree prune`; vài `.node` native bị khoá, xoá tay khi không còn tiến trình giữ). Thư mục build
  `apps/*/.next-server-109` nằm trong `.gitignore`.
