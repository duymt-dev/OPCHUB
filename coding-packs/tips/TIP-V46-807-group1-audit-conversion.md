# TIP-V46-807: Nhóm 1 + minh bạch — chat đã đọc, ẩn hoa hồng 0đ, tự mở khóa, nhật ký Admin + CSV, chuyển đổi theo vùng, copy trang đăng nhập

## HEADER

- TIP-ID: TIP-V46-807
- Project: OPCHUB
- Module: chat (Portal đếm đã đọc), affiliate (hoa hồng 0đ), account (tự mở khóa — chỉ test), settings (Nhật ký hoạt động + CSV), export (kind `audit`), reporting (chuyển đổi theo vùng), shared/permissions (nhãn), ui/auth + portal/admin auth (copy trang chào)
- Priority: P1
- Depends on: 801 (GĐ Vùng: tên GĐ Vùng ở bảng chuyển đổi), 803 (hoa hồng tham khảo); chạy sau 806 theo thứ tự GOAL (`dev` `a7f6e42f`)
- Estimated: L
- REQ / D: REQ-622 (BR-461, BR-463, BR-465), REQ-623 (BR-475 → 477, VM-464), REQ-624 (BR-485, BR-486), REQ-630 (copy trang chào) · D-127, D-128 (vùng theo nhóm tỉnh sớm nhất), D-132 (3) (nhãn `affiliate.payout`), D-134 (parity tham khảo), D-65 (Portal 10 bộ ngôn ngữ), D-89 (prototype thắng) · **Q-V46-807-1 → 5** (xem cuối file, phương án mặc định chờ owner chốt)
- **Files touched:**
  - **BR-461 — Chat đếm đã đọc (Portal)**
    - `apps/portal/src/features/chat/hooks/use-mark-read.ts` (create): quyết định khi nào gọi `markRead` (SPEC 1 → 4)
    - `apps/portal/src/features/chat/components/chat-screen.tsx` (modify): thay effect `markRead` hiện tại bằng `useMarkRead`
    - `apps/portal/src/lib/chat-unread.ts` (modify): `clearRoomUnread` đặt `byRoom[roomId] = 0` kể cả khi khóa chưa có (đang bỏ qua → `unread` vẫn > 0 theo `r.unread`)
    - `apps/portal/src/features/chat/hooks/use-room-actions.ts` (modify nếu cần: `onSettled` thay `onSuccess`, không retry)
    - Test: `apps/portal/src/features/chat/hooks/use-mark-read.spec.tsx` (create), `e2e/behavior/portal-chat-read.spec.ts` (create)
  - **BR-463 — Ẩn hoa hồng 0đ**
    - `packages/db/prisma/migrations/20261110090000_v46_commission_positive/{migration,down}.sql` (create): `ALTER TABLE commissions ADD CONSTRAINT commissions_amount_positive CHECK (amount > 0) NOT VALID` (khoản 0đ cũ giữ nguyên, khoản mới bị chặn)
    - `apps/server/src/modules/affiliate/repositories/commission-visible.sql.ts` (create): một mảnh SQL `c.amount > 0` dùng chung
    - `apps/server/src/modules/affiliate/repositories/{commission-admin.query,commission-admin.repository,affiliate-admin.repository,affiliate-history.query,me-affiliate.repository,me-affiliate.query,referral-rows.query}.ts` (modify): mọi danh sách / tổng / đếm / tháng thêm mảnh trên
    - `apps/server/src/modules/affiliate/repositories/affiliate-write.repository.ts` (modify): đổi % không ghi `amount` về 0 (`AND round(list_amount * rate / 100.0) > 0`)
    - `packages/shared/src/mock-data/domains/affiliate*.ts` (modify các file đọc danh sách / tổng hoa hồng): lọc `amount > 0` như server
    - Test: `apps/server/test/affiliate/zero-commission-hidden.int.spec.ts` (create)
  - **BR-465 — Tự mở khóa (đã có ở V4-612, chỉ bổ sung test)**
    - `apps/server/test/account/auto-unlock.int.spec.ts` (create)
  - **BR-485 / 486 — Nhật ký hoạt động + CSV**
    - `packages/shared/src/api-domains/settings-admin.ts` (modify): `auditLogPageQuerySchema` (`cursor?`, `limit` 1..100, mặc định 50), `auditLogPageSchema` (`items`, `nextCursor`)
    - `packages/shared/src/api-domains/export.ts` (modify): thêm `z.object({ kind: z.literal('audit') })` vào `exportParamsSchema`
    - `apps/server/src/modules/settings/services/audit-log.service.ts` (modify): `page(query, now)` keyset `(created_at DESC, id DESC)` trong 90 ngày; giữ tên người thao tác như hiện tại
    - `apps/server/src/modules/settings/services/audit-log-export.service.ts` (create): đăng ký builder `audit` vào `ExportBuilders` lúc `onModuleInit`, đọc lô 500 theo keyset
    - `apps/server/src/modules/settings/controllers/roles.controller.ts` (modify): `GET admin/audit-logs?cursor&limit`, `POST admin/audit-logs/export` (202, `settings.log`, audit `export.audit`)
    - `apps/server/src/modules/settings/settings-http.module.ts` hoặc module core settings (modify: import `ExportCoreModule`; provider mới); module được worker nạp (modify 1 dòng nếu builder chưa có trong worker — ghi completion)
    - `apps/server/src/modules/export/export.service.ts` (modify): `build()` dùng builder đã đăng ký cho mọi kind không phải `users` / `group_members` (thay nhánh riêng `report`)
    - `apps/server/test/audit/admin-audit-manifest.ts` (create): bảng `Controller.method → action audit | { exempt: lý do }` cho **mọi** route Admin ghi (POST / PUT / PATCH / DELETE có `@RequireAdmin`)
    - `apps/server/test/audit/admin-audit-coverage.spec.ts` (create): quét AST controller, mọi route Admin ghi phải có trong manifest; action trong manifest phải xuất hiện dạng chuỗi trong `apps/server/src`
    - Service thiếu audit mà manifest phát hiện (modify từng file, ghi danh sách vào completion)
    - Admin: `apps/admin/src/features/settings/components/audit-log-tab.tsx` (modify: nút "Xuất CSV", "Xem thêm"), `audit-log.module.css` (modify), `hooks/use-audit-log.ts` (create: `useInfiniteQuery` + xuất qua `lib/use-export-job.ts`), `api.ts` (modify: `fetchAuditLog(cursor)`, `exportAuditLog()`), `apps/admin/messages/vi/settings.json` (modify: `log.headingSub`, `log.export`, `log.more`)
    - MSW: `apps/admin/src/mocks/handlers/settings.ts` (modify: phân trang + `POST /admin/audit-logs/export`), `packages/shared/src/mock-data/domains/audit-store.ts` (modify nếu cần trang)
    - Test: `apps/server/test/settings/audit-log-page.int.spec.ts` (create), `apps/admin/src/features/settings/components/audit-log-tab.spec.tsx` (create), `e2e/behavior/admin-audit-log.spec.ts` (create)
  - **BR-475 → 477 — Chuyển đổi miễn phí → trả phí theo vùng**
    - `packages/shared/src/api-domains/overview.ts` (modify): `conversionRowSchema`, `adminConversionSchema`
    - `apps/server/src/modules/reporting/conversion.repository.ts` (create): 1 câu SQL tổng hợp (SPEC 15)
    - `apps/server/src/modules/reporting/conversion.service.ts` (create): cache Redis 60 giây, tính %, dựng CSV
    - `apps/server/src/modules/reporting/conversion.controller.ts` (create): `GET admin/overview/conversion`, `POST admin/overview/conversion/export` (`overview.view`)
    - `apps/server/src/modules/reporting/reporting.module.ts` (modify: provider + controller)
    - Admin: `apps/admin/src/features/overview/components/conversion-table.tsx` + `conversion.module.css` (create), `hooks/use-conversion.ts` (create), `data.ts` (modify: hàm fetch + export), `components/overview-screen.tsx` (modify: 1 dòng), `apps/admin/messages/vi/overview.json` (modify: khối `conversion.*`)
    - MSW: `packages/shared/src/mock-data/domains/overview-conversion.ts` (create, tính từ kho phí giả + GĐ Vùng giả), `apps/admin/src/mocks/handlers/shell.ts` (modify: 2 handler)
    - Test: `apps/server/test/reporting/conversion.int.spec.ts` (create), `apps/admin/src/features/overview/components/conversion-table.spec.tsx` (create), `e2e/behavior/admin-overview.spec.ts` (modify: thêm case bảng + CSV)
  - **D-132 (3) — Nhãn quyền**
    - `packages/shared/src/permissions.ts` (modify): `affiliate.payout` label → `'Chi trả GĐ Vùng'`; `permissions.spec.ts` (modify nếu khẳng định nhãn)
  - **REQ-630 — Copy trang đăng nhập / chào (P1)**
    - `packages/ui/src/auth/types.ts`, `auth-hero.tsx`, `auth-hero.module.css` (modify): tiêu đề 2 dòng (dòng 2 chỉ phần nhấn màu), mỗi khối giá trị có **tiêu đề + mô tả**
    - `apps/portal/src/features/auth/components/auth-frame.tsx`, `apps/admin/src/features/auth/components/auth-frame.tsx` (modify)
    - `apps/portal/messages/{vi,en,zh,id,th,ms,fil,km,lo,my}/auth.json` (modify: khối `hero`), `apps/admin/messages/vi/auth.json` (modify: khối `hero`)
    - Test: `packages/ui/src/auth/auth-hero.spec.tsx` (create), `e2e/behavior/a-01-login.spec.ts` (modify: kiểm copy mới)
  - **Parity / tài liệu**
    - `e2e/parity/scenarios/admin.ts` (modify nếu cần cuộn tới bảng chuyển đổi ở `D-01`), `e2e/parity/scenarios/admin-settings.ts` (modify nếu `D-75` cần chờ nút "Xuất CSV")
    - `coding-packs/reports/V4.6-progress.md` (dòng #7), `coding-packs/reports/ui-parity/{screens,questions,results}.md` + `results.json`, `coding-packs/reports/TIP-V46-807-completion.md`, `coding-packs/reports/TIP-V46-807-query-plans.md` (create), `coding-packs/standards/global/domain-glossary.md` (thêm "Tỷ lệ chuyển đổi", "Nhật ký hoạt động")
- **Parallel-safe with:** sequential.
  - Chia `admin/features/settings/**`, `messages/vi/settings.json`, `mocks/handlers/settings.ts`, `e2e/parity/scenarios/admin-settings.ts` với V46-805 / 806 (đã merge) và V46-811 → 811 chạy sau.
  - Chia `packages/shared/src/permissions.ts` với 801 (đã merge).
  - Chia `admin/features/shell/**`, `mocks/handlers/shell.ts` với V46-808 (topbar tìm kiếm) → 808 chạy sau.
  - Chia `apps/server/src/modules/affiliate/**` với 803 / 804 (đã merge).

## CONTEXT

- Working dir: `D:\CODING\OPCHUB\CODING`. Nhánh code `feature/TIP-V46-807-group1-audit-conversion` tách từ `dev` `a7f6e42f`.
- **DB:** 801 → 806 chạy trên `opchub_v46_801_dev` / `opchub_v46_801_test` + Redis `127.0.0.1:6381` (owner duyệt). Builder hỏi owner DB đích trước khi `migrate deploy` / int / e2e server / seed. Không reset DB native, không tắt tiến trình HOLD.
- Delta `coding-packs/audit/SPEC-V4.6-DELTA.md`:
  - **P1**: trang đăng nhập — "CỘNG ĐỒNG DOANH NGHIỆP MỘT NGƯỜI" (bỏ "· QUỐC TẾ"), slogan "Liên kết chuỗi cung ứng, mở rộng thị trường", 4 khối giá trị mới
  - **P10**: Admin › Tổng quan — bảng "Chuyển đổi miễn phí → trả phí theo vùng" + Xuất CSV
  - **P15**: Nhật ký hoạt động — ghi mọi thao tác thành công, 90 ngày, Xuất CSV
  - §3 nhóm 1: BR-461, BR-463, BR-465 (BR-462 đã làm ở 801)
- Đặc tả `docs/spec/dac-ta.html` §33:
  - BR-461: đếm tin đã đọc chỉ chạy khi đổi phòng hoặc có tin mới; không cập nhật trạng thái lặp vô hạn. TC-461: chuyển phòng nhiều lần không treo, đếm đúng
  - BR-463: TK miễn phí (GĐ Vùng, 3 tháng đầu) và giao dịch 0đ không tạo hoa hồng; **khoản 0đ cũ bị ẩn**
  - BR-465: TK khóa do vi phạm tự mở khi hết hạn; kiểm định kỳ + mỗi lần đăng nhập (D-127: không cần chu kỳ 15 giây)
  - BR-475: Tỷ lệ = Đã trả phí / (Đã trả phí + Hết hạn chưa trả); đang dùng thử không tính vào mẫu số
  - BR-476: gom theo vùng của tỉnh đăng ký (Bắc · Trung · Nam), kèm tên GĐ Vùng; dòng Toàn quốc là tổng; màu ≥ 80% xanh lá, ≥ 70% xanh, còn lại cam
  - BR-477: Xuất CSV UTF-8 BOM
  - BR-485: tự ghi mọi thao tác thành công của quản trị viên (khóa, duyệt, chi trả, gán, đổi cấu hình): người, thao tác, nhóm chức năng, thời gian; lưu 90 ngày; Xuất CSV
  - BR-486: Xuất CSV có ở Chuyển đổi theo vùng, Đối soát ngân hàng, Nhật ký hoạt động, Thành viên nhóm cộng đồng
  - VM-464: số liệu chuyển đổi trong prototype là mẫu; bản phát triển tính từ bảng phí thành viên
- Prototype `docs/spec/index.html` v4.6:
  - Đăng nhập dòng 125 → 128 (`data-m="authVals"`, lưới `repeat(auto-fit,minmax(210px,1fr))`, gap `16px 24px`; mobile `repeat(2,…)`); icon tròn 54px, tiêu đề 15px/600, mô tả 13px/400
  - Tổng quan: bảng chuyển đổi dòng ~2832 → 2838, logic ~6543 (`CV`, `gn`, `pc`, màu, `_csv('chuyen-doi-theo-vung', …)`)
  - Nhật ký: markup dòng ~5027, CSV `ops.logCsv` → `_csv('nhat-ky-hoat-dong', [['Người thực hiện','Thao tác','Nhóm','Thời gian'], …])`
  - Vai trò: `['affiliate','Affiliate','Chi trả hoa hồng']` (D-132 (3) đổi thành "Chi trả GĐ Vùng")
- Code hiện tại (đọc trước):
  - **Chat**: `chat-screen.tsx:70-74` effect `if (!roomId || unread <= 0) return; clearRoomUnread(…); markRead(roomId)`.
    - `unread` lấy từ `use-room-view.ts:19` (`useChatUnread().byRoom[id] ?? r.unread`).
    - `lib/chat-unread.ts`:
      - `clearRoomUnread` bỏ qua khi `byRoom[roomId]` chưa có
      - `unread.bump` bỏ qua tin của phòng đang mở
      - MSW poll 3 giây
    - Server `UnreadService.markRead` đánh dấu tới tin mới nhất lúc gọi, không phát socket.
    - **Lỗ hổng:** tin mới đến phòng đang mở không bao giờ được đánh dấu đọc trên server. Lần refetch sau (poll / reconnect / đổi phòng) hiện lại số chưa đọc, rồi gọi `markRead` lại. Trong lúc `markRead` chạy, poll trả số cũ thì effect gọi lần nữa.
  - **Hoa hồng**:
    - Tạo đã chặn 0đ: `affiliate-lifecycle.handler.ts:53,63,65` và `fundraising-commission.handler.ts:28,41,43`; trial / GĐ Vùng không phát `confirmed`.
    - DB `commissions_amount_check CHECK (amount >= 0)` vẫn cho 0.
    - Không query đọc nào lọc `amount > 0`.
    - Sổ chia sẻ GĐ Vùng có dòng `director_amount = 0` **theo thiết kế** (vùng trống, 0%) — **không** phải hoa hồng, không đụng.
  - **Tự mở khóa**:
    - `auth.service.ts:119-125` `assertUnlocked` → `AccountLockService.unlockIfExpired`
    - job `moderation-auto-unlock` mỗi 5 phút (`worker/schedules.ts:59-65`) → `sweepExpired`
    - `setStatusTx` ghi outbox `user.unlocked` + audit `user.unlock` (actor null)
    - Test `test/moderation/violations.int.spec.ts:164-196` thiếu kiểm audit và đường refresh.
  - **Nhật ký**:
    - `AuditService.log / logMany` gọi tay trong transaction, không có interceptor.
    - `audit_logs` chỉ ghi thêm (trigger chặn UPDATE / DELETE / TRUNCATE).
    - `test/system/audit-retention.int.spec.ts` khẳng định giữ ≥ 12 tháng (NA-13, REQ-213).
    - `AuditLogService.recent` 90 ngày, tối đa 500 dòng, không phân trang.
    - Tab `audit-log-tab.tsx` không có CSV.
    - Phủ: ~120 route Admin ghi trên 36 controller; khảo sát mẫu đều có audit, trừ:
      - `POST bank/test` (chỉ đọc)
      - `2fa/setup` (sinh secret tạm)
      - `refresh`, `totp/verify` (phiên đăng nhập)
  - **Xuất CSV**:
    - `common/http/csv.ts` (`toCsv` có BOM)
    - đồng bộ `{filename, csv}`: Đối soát ngân hàng (806, `doi-soat-ngan-hang.csv`)
    - bất đồng bộ `export_jobs` + `ExportBuilders` (đăng ký theo kind; `report` đã dùng): Thành viên nhóm (`group_members`, đã có modal + file `opchub-thanh-vien-nhom-YYYYMMDD.csv`)
  - **Tổng quan**:
    - `reporting/overview.controller.ts` (`overview.view`), `overview.service.ts` (cache `admin:overview` 60 giây)
    - FE `features/overview` poll 3 giây
  - **Vùng / GĐ Vùng**:
    - `reporting/regional/earliest-group.sql.ts` (D-128: nhóm tỉnh tham gia sớm nhất, nhóm ngành → tỉnh cha)
    - `regional_directors(region PK, user_id?)`
    - mẫu join tên `regional-projection.repository.ts:46-47`
  - **Phí**:
    - `membership_fees` 1-1 users, `status` ∈ `trial | pending_payment | active | expiring | expired | regional_director`
    - `pending_payment` là dữ liệu cũ (D-116)
    - `PAID_FEE_STATUS = ['active','expiring']`
  - **Trang chào**:
    - `packages/ui/src/auth/auth-hero.tsx` (giá trị = 2 dòng chữ, không có mô tả)
    - `apps/{portal,admin}/messages/vi/auth.json` `hero.*` vẫn copy v4.2
    - Portal có 9 bộ dịch, `messages.spec.ts` bắt đủ khóa + không giống tiếng Việt (D-65)

## APPLICABLE STANDARDS

- [realtime/socket-chat](../standards/realtime/socket-chat.md): S-01 → S-12; không tạo vòng gọi REST theo sự kiện socket; không query theo người nhận
- [frontend/data-state](../standards/frontend/data-state.md): TanStack Query, optimistic update, `useInfiniteQuery` cho "Xem thêm"
- [backend/nestjs-modules](../standards/backend/nestjs-modules.md): reporting là ngoại lệ đọc chéo domain đã duyệt; export đăng ký builder theo kind (không phụ thuộc ngược)
- [backend/api-conventions](../standards/backend/api-conventions.md) · [backend/auth-rbac](../standards/backend/auth-rbac.md): `overview.view`, `settings.log`; permission key, không tên vai trò
- [database/query-indexing](../standards/database/query-indexing.md) · [database/prisma-migrations](../standards/database/prisma-migrations.md): keyset, 1 query tổng hợp, `NOT VALID` constraint, `down.sql`
- [security/security](../standards/security/security.md): CSV chặn công thức (ô bắt đầu `= + - @ \t \r` → thêm `'`), xuất dữ liệu ghi audit (luật 10)
- [frontend/antd-ui](../standards/frontend/antd-ui.md) · [frontend/ui-parity](../standards/frontend/ui-parity.md) (D-134) · [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md)
- [testing/testing](../standards/testing/testing.md) · [global/code-structure](../standards/global/code-structure.md) · [global/domain-glossary](../standards/global/domain-glossary.md)

## TASK

Làm 5 mảng việc nhỏ của §33 nhóm 1 và nhóm 3:

1. **Chat Portal** chỉ đánh dấu đã đọc khi đổi phòng hoặc có tin mới, không gọi lặp (BR-461).
2. **Hoa hồng 0đ**:
   - ẩn khoản 0đ cũ khỏi mọi danh sách / tổng / CSV Admin và Portal;
   - DB chặn khoản 0đ mới (BR-463).
3. **Tự mở khóa** đã có; chỉ bổ sung test cho audit và đường refresh (BR-465).
4. **Nhật ký hoạt động**:
   - phân trang;
   - Xuất CSV;
   - bảng kiểm tra tự động bảo đảm mọi route Admin ghi đều có audit (BR-485);
   - đủ 4 màn có CSV (BR-486).
5. **Tổng quan và nhãn**:
   - bảng **Chuyển đổi miễn phí → trả phí theo vùng** ở Tổng quan, có Xuất CSV (BR-475 → 477);
   - đổi nhãn quyền `affiliate.payout` thành "Chi trả GĐ Vùng" (D-132 (3));
   - copy trang đăng nhập / chào theo prototype v4.6 (P1).

## SPECIFICATIONS

### BR-461 — Đếm đã đọc (Portal)

1. `useMarkRead({ roomId, unread, latestId })`, trong đó `latestId` là id tin mới nhất **của người khác** trong danh sách đang tải của phòng mở.
2. Gọi `markRead(roomId)` khi và chỉ khi:
   - (a) **Đổi phòng**: `roomId` đổi và `unread > 0`.
   - (b) **Có tin mới**: phòng đang mở nhận `message.new` từ người khác (`latestId` đổi sau lần đánh dấu trước), kể cả khi `unread` = 0.
   - Khóa chống lặp = `${roomId}|${latestId ?? ''}`: cùng khóa thì không gọi lại, dù `unread` refetch về số cũ > 0.
3. Chống gọi chồng:
   - đang có lời gọi chưa xong → không gọi thêm, nhớ khóa mới nhất và chỉ gọi lại **một lần** khi lời gọi trước xong, nếu khóa đã đổi;
   - gom tin dồn dập bằng debounce 300 ms (chỉ cho trường hợp (b)).
4. Trước khi gọi API: `clearRoomUnread(qc, gid, roomId)` đặt `byRoom[roomId] = 0` (kể cả khi khóa chưa có) và trừ đúng phần đó ở `byGroup`.
   - Lỗi API: không thử lại tự động; invalidate `chatUnreadKey` một lần (`onSettled`) để số hiển thị đúng với server.
   - Không vòng lặp, vì khóa không đổi nên không gọi lại.
5. Không đổi server (`/rooms/:id/read`), không đổi socket event, không thêm query theo người nhận (S-xx).

### BR-463 — Hoa hồng 0đ

6. Migration `commissions_amount_positive CHECK (amount > 0) NOT VALID`:
   - **không** validate dữ liệu cũ, không xóa / sửa khoản cũ;
   - `down.sql` drop constraint.
   - Hai handler tạo hoa hồng giữ guard hiện có.
   - `affiliate-write.repository` (đổi %) không cập nhật dòng nào nếu số tiền mới ra 0 (giữ số cũ); có test.
7. Mọi query **đọc** hoa hồng thêm `c.amount > 0` qua `commission-visible.sql.ts` (Prisma.sql) hoặc `amount: { gt: 0 }`:
   - Admin › Affiliate › Hoa hồng: trang, đếm, `summary` (doanh thu, phải chi, đã chi, đếm theo gói), CSV `hoa-hong-affiliate.csv`
   - Admin › Đại lý: tổng theo đại lý, theo tháng, lịch sử khách
   - Portal › Affiliate: `stats` (kể cả `paidCount` → % chuyển đổi), tháng, danh sách giới thiệu (`referralIds`: nhánh `commissions` lọc 0đ)
     - Nếu khách **chỉ** có khoản 0đ thì dòng referral của khách hiện như "chưa phát sinh" (điều kiện `NOT EXISTS` cũng xét `amount > 0`).
   - Chi trả / payouts chỉ cộng khoản > 0. Khoản 0đ đã `paid` cũ vẫn ở DB, không hiện.
8. **Không** áp vào sổ chia sẻ GĐ Vùng (`regional_shares`, dòng 0% / vùng trống là thiết kế 802, Q-V46-802-5) và Vùng của tôi. Ghi rõ trong completion.
9. Index:
   - không thêm index mới nếu EXPLAIN trên ≥ 10k `commissions` (≥ 5% là 0đ) vẫn dùng index hiện có;
   - nếu thành Seq Scan → partial index `WHERE amount > 0` trong cùng migration, ghi lý do.

### BR-465 — Tự mở khóa (test)

10. Không đổi code nếu test dưới đây PASS. Test `auto-unlock.int.spec.ts`:
    - (a) Login sau `locked_until` → 200, `status='active'`, 1 audit `user.unlock` có `actor_id IS NULL`, 1 outbox `user.unlocked`.
    - (b) `POST /auth/refresh` với refresh token cấp trước khi khóa → trả lời đúng theo luồng hiện tại khi lock đã hết hạn và đã mở.
      - Nếu luồng khóa đã thu hồi refresh token thì khẳng định 401 và ghi vào completion.
    - (c) `sweepExpired` mở đúng các khóa hết hạn, giữ khóa thủ công chưa hết hạn và khóa không thời hạn.
    - (d) Chạy `sweepExpired` hai lần → audit / outbox không nhân đôi.

### BR-485 / 486 — Nhật ký hoạt động

11. **Phủ audit**:
    - `admin-audit-manifest.ts` liệt kê mọi method có `@RequireAdmin` + `@Post/@Put/@Patch/@Delete` trong `apps/server/src/modules/**/controllers/*.ts`.
    - Mỗi method ánh xạ tới chuỗi action audit nó ghi (vd `fee.match_transaction`), hoặc `{ exempt: '<lý do>' }`. Chỉ được miễn khi:
      - thao tác không đổi dữ liệu nghiệp vụ (kiểm tra kết nối, xem trước);
      - thao tác phiên của chính tài khoản quản trị (refresh, xác minh TOTP, sinh secret 2FA chưa bật).
    - `admin-audit-coverage.spec.ts` (Vitest, không DB) FAIL khi:
      - (a) route mới chưa có trong manifest;
      - (b) manifest trỏ tới route không còn;
      - (c) chuỗi action không xuất hiện trong `apps/server/src` (ngoài thư mục test).
    - Mẫu duyệt AST: tái dùng `methodDecoratorMap` ở `test/audit/controller-decorators.audit.ts`.
    - Route thiếu audit thật → thêm `audit.log` trong **cùng transaction** của service đó (luật 10), action dạng `<domain>.<verb>`, tag hợp lệ trong `AUDIT_TAGS`. Ghi danh sách vào completion.
12. **Lưu giữ** (**Q-V46-807-1**, mặc định):
    - màn hình và CSV chỉ lấy **90 ngày** gần nhất;
    - DB giữ ≥ 12 tháng theo NA-13 / REQ-213, **không** xóa, **không** nới trigger;
    - `audit-retention.int.spec.ts` giữ nguyên.
    - Dòng phụ đổi theo prototype: "Tự động ghi mọi thao tác của quản trị viên (khóa, duyệt, chi trả, đổi cấu hình…) trong 90 ngày."
13. **Danh sách**:
    - `GET /v1/admin/audit-logs?cursor&limit` (`settings.log`), keyset `(created_at DESC, id DESC)`, `createdAt >= now − 90 ngày`, trả `{ items, nextCursor }`;
    - mặc định 50 / trang; nút "Xem thêm" dưới danh sách (prototype không phân trang — thêm nút nhỏ, ghi D-134 loại D-xx / giao diện nếu lệch);
    - tên người thao tác lấy một lần cho cả trang như hiện tại (không N+1).
14. **Xuất CSV**:
    - Nút "Xuất CSV" (prototype: dưới tiêu đề, căn trái) → `POST /v1/admin/audit-logs/export` (`settings.log`, 202):
      - tạo `export_jobs` kind `audit`;
      - audit `export.audit` (tag `settings`, summary "xuất nhật ký hoạt động 90 ngày") trong cùng transaction;
      - FE dùng `lib/use-export-job.ts` (poll, tải link).
    - Builder:
      - keyset lô 500, 90 ngày tính tại lúc chạy job;
      - cột **Người thực hiện, Thao tác, Nhóm, Thời gian** (Nhóm = nhãn tag tiếng Việt như màn; Thời gian = `dd/mm/yyyy HH:mm` giờ VN — **Q-V46-807-4**);
      - tên file tải `nhat-ky-hoat-dong.csv`;
      - `toCsv` (BOM), ô chặn công thức.
15. **4 màn CSV (BR-486)**:
    - Chuyển đổi theo vùng (SPEC 18, mới)
    - Nhật ký hoạt động (SPEC 14, mới)
    - Đối soát ngân hàng (806, có sẵn)
    - Thành viên nhóm cộng đồng (có sẵn)
    - Hai màn có sẵn chỉ cần e2e khẳng định nút + file có BOM, **không** sửa.

### BR-475 → 477 — Chuyển đổi theo vùng (Tổng quan)

16. **Tập tính** (**Q-V46-807-3**, mặc định): `membership_fees f JOIN users u` với `u.deleted_at IS NULL AND u.account_type <> 'investor'`.
    - **Đang dùng thử** = `f.status = 'trial'`
    - **Đã trả phí** = `f.status IN ('active','expiring')` (`PAID_FEE_STATUS`)
    - **Hết hạn chưa trả** = `f.status IN ('expired','pending_payment')`
    - `regional_director` không tính (miễn phí theo chức vụ)
    - Tỷ lệ = `round(paid * 100 / (paid + expired))`, mẫu số 0 → 0 (giống `pc` prototype)
17. **Vùng** (**Q-V46-807-2**, mặc định):
    - Vùng = nhóm tỉnh tham gia sớm nhất theo **D-128** (`earliestRegionalGroup`, cùng định nghĩa với gán affiliate cho GĐ Vùng).
    - TV chưa thuộc nhóm tỉnh nào chỉ được cộng vào dòng **Toàn quốc**, không có dòng riêng.
    - Dòng Toàn quốc = tổng **mọi** TV trong tập SPEC 16.
    - 1 câu SQL: `LEFT JOIN LATERAL (earliestRegionalGroup(u.id))` + `count(*) FILTER (…)` + `GROUP BY ROLLUP` hoặc tính tổng trong service từ cùng kết quả, cộng thêm nhóm `region IS NULL`. Không query trong vòng lặp.
    - Tên GĐ Vùng: `LEFT JOIN regional_directors r ON r.region = … LEFT JOIN users d ON d.id = r.user_id`; trống → "Chưa bổ nhiệm".
18. **API**:
    - `GET /v1/admin/overview/conversion` (`overview.view`) → `{ rows: [{ region, label, directorName | null, trial, paid, expired, ratePct }], total: { trial, paid, expired, ratePct } }`. Cache Redis `admin:overview:conversion` 60 giây.
      - Endpoint riêng, **không** gộp vào `/admin/overview` (đang poll 3 giây).
      - FE `staleTime` 60 giây, không poll.
    - `POST /v1/admin/overview/conversion/export` (`overview.view`) → `{ filename: 'chuyen-doi-theo-vung.csv', csv }`, đồng bộ như 806:
      - cột **Vùng, GĐ Vùng, Đang dùng thử, Đã trả phí, Hết hạn chưa trả, Tỷ lệ chuyển đổi** (vd `"82%"`);
      - 3 dòng vùng như prototype (không dòng Toàn quốc);
      - audit `report.conversion_export` (tag `report`).
19. **UI** (khối thứ 4 trong `overview-screen`, rộng 100%, sau Tăng trưởng thành viên như prototype):
    - Tiêu đề "Chuyển đổi miễn phí → trả phí theo vùng" (16px/600).
    - Dòng phụ "Tỷ lệ = Đã trả phí / (Đã trả phí + Hết hạn chưa trả) · thành viên sau 3 tháng miễn phí".
    - Nút "Xuất CSV".
    - Bảng `min-width: 720px` (cuộn ngang trên 390), cột:
      - Vùng
      - GĐ Vùng
      - Đang dùng thử (phải)
      - Đã trả phí (phải)
      - Hết hạn chưa trả (phải)
      - Tỷ lệ chuyển đổi (rộng 220px): thanh 6px nền `#F0F0F0` + % đậm
    - Màu theo BR-476 (`#52C41A` ≥ 80, `#1677FF` ≥ 70, còn lại `#FA8C16`).
    - Dòng "Toàn quốc" đậm, nền `#FAFAFA`, ô GĐ Vùng trống.
    - Số `vi-VN`.
    - Nhãn vùng theo prototype: "Miền Bắc", "Miền Trung", "Miền Nam" (D-89; màn GĐ Vùng vẫn dùng `REGIONAL_LABELS`).
    - Toast sau xuất: "Đã xuất 3 dòng – chuyen-doi-theo-vung.csv".
20. MSW `mockConversion()` tính từ kho phí giả + GĐ Vùng giả theo cùng công thức, không hằng số.

### D-132 (3) — Nhãn quyền

21. `ADMIN_PERMISSIONS` `affiliate.payout` → label **"Chi trả GĐ Vùng"**. Không đổi key, không đổi gán vai trò mặc định.
    - Cài đặt › Vai trò & phân quyền hiện nhãn mới.
    - Parity `D-69` lệch prototype ghi loại **D-132**.

### REQ-630 — Copy trang đăng nhập / chào (P1)

22. `AuthHeroCopy`:
    - `headlineLead` (dòng 1, trắng) + `headlineAccent` (dòng 2, màu nhấn `#0A47C2`, có `text-shadow` như prototype); bỏ `headlinePre`;
    - `values: { icon, title, desc }[]`.
23. Chuỗi tiếng Việt (Portal + Admin `vi/auth.json`), đúng prototype dòng 125 → 128:
    - eyebrow: "CỘNG ĐỒNG DOANH NGHIỆP MỘT NGƯỜI"
    - headlineLead: "Kết nối năng lực địa phương"
    - headlineAccent: "Liên kết chuỗi cung ứng, mở rộng thị trường"
    - sub: "Học tập và chuyển đổi sang mô hình OPC, kết nối cộng đồng và chuyên gia, phát triển dự án, liên kết cung cầu, tìm kiếm khách hàng và đưa sản phẩm, dịch vụ, giải pháp địa phương ra thị trường quốc tế."
    - learn: "Học tập và chuyển đổi OPC" / "Trang bị kiến thức, kỹ năng và công cụ để phát triển doanh nghiệp một người."
    - people: "Kết nối cộng đồng và chuyên gia" / "Kết nối cá nhân, doanh nghiệp, chuyên gia và đối tác."
    - supply: "Liên kết chuỗi cung ứng địa phương" / "Kết nối nguồn cung, nhu cầu, sản phẩm, dịch vụ và cơ hội hợp tác."
    - globe: "Mở rộng thị trường quốc tế" / "Tìm kiếm khách hàng, đối tác và cơ hội kinh doanh xuyên biên giới."
    - `tagline`, `copyright`, tiêu đề / mô tả form giữ nguyên (prototype v4.6 không đổi).
24. 9 bộ dịch Portal (`en zh id th ms fil km lo my`) dịch khối `hero` mới theo D-65 (AI dịch, giữ khóa / biến). `messages.spec.ts` phải PASS. Admin chỉ `vi`.
25. CSS khối giá trị:
    - lưới `repeat(auto-fit, minmax(210px, 1fr))`, gap `16px 24px`, mobile 2 cột như prototype;
    - icon tròn 54px nền trắng;
    - tiêu đề 15px/600 `#fff`, mô tả 13px/400 `rgba(255,255,255,0.92)`.

### Validation

- `auditLogPageQuerySchema`: `cursor` chuỗi base64url của `{at,id}` (parse zod; sai → 400), `limit` 1..100.
- Export params parse bằng `exportParamsSchema` (worker).
- Response mọi endpoint mới parse bằng schema `@opchub/shared` ở server test + MSW.

### Error Handling

| Trường hợp | Kết quả |
|---|---|
| Thiếu `settings.log` khi xem / xuất nhật ký | 403 |
| Thiếu `overview.view` khi xem / xuất chuyển đổi | 403 |
| Cursor nhật ký sai | 400 `VALIDATION_ERROR` |
| Job xuất nhật ký lỗi | `export_jobs.status = failed`, FE toast lỗi như màn Thành viên |
| `markRead` lỗi mạng / 403 | không thử lại; refetch số chưa đọc một lần; không vòng lặp |
| Ghi hoa hồng 0đ (lỗi logic tương lai) | DB từ chối (constraint), handler log cảnh báo, outbox thử lại theo cơ chế hiện có → ghi completion nếu gặp |

## ACCEPTANCE CRITERIA

- **TC-461 chuyển phòng** Given TV ở nhóm có 3 phòng, mỗi phòng 2 tin chưa đọc When chuyển qua lại 10 lần Then:
  - mỗi lần vào phòng còn chưa đọc gọi `POST /rooms/:id/read` **đúng 1 lần**; phòng đã đọc không gọi;
  - tổng lời gọi ≤ số lần vào phòng có chưa đọc;
  - badge về 0, UI không treo.

  Test: unit `use-mark-read.spec.tsx` › `room switch`; e2e `portal-chat-read.spec.ts` › `TC-461 switch rooms`.
- **BR-461 tin mới** Given đang mở phòng A When người khác gửi 5 tin trong 1 giây Then gọi `markRead` ≤ 2 lần (debounce + 1 lần bù); poll / refetch trả số cũ > 0 trong lúc chờ không gây thêm lời gọi; đổi sang phòng B rồi về A không hiện lại chưa đọc (unit `use-mark-read.spec.tsx` › `new message while open`, › `stale refetch`).
- **BR-461 tin của mình** Given đang mở phòng When chính TV gửi tin Then không gọi `markRead` (unit).
- **BR-461 lỗi** Given API trả 403 When vào phòng Then gọi 1 lần, không gọi lại khi re-render, `chatUnreadKey` refetch 1 lần (unit).
- **BR-463 ẩn 0đ** Given 1 đại lý có 3 khoản (200.000đ recorded, 0đ recorded cũ, 0đ paid cũ — chèn bằng SQL bỏ qua constraint `NOT VALID`) Then:
  - Admin › Hoa hồng: 1 dòng; `count = 1`; `summary` không đổi so với chỉ có khoản 200.000đ; CSV 1 dòng;
  - tổng đại lý / tháng chỉ tính 200.000đ;
  - Portal `stats.paidCount`, tháng, danh sách giới thiệu không có dòng 0đ;
  - khách chỉ có khoản 0đ hiện "chưa phát sinh".

  Test: int `zero-commission-hidden.int.spec.ts` › `admin list`, › `portal`, › `csv`.
- **BR-463 chặn mới** Given migration đã chạy When `INSERT commissions … amount = 0` Then lỗi constraint; khoản 0đ cũ vẫn còn trong DB; đổi % làm số tiền về 0 thì không cập nhật (int `zero-commission-hidden` › `constraint`, › `rate change`).
- **BR-463 không đụng sổ GĐ Vùng** Given dòng `regional_shares` 0% Then `GET /v1/me/gdv` và Admin › GĐ Vùng vẫn hiện như trước (không hồi quy `share-ledger`, `my-region` int).
- **BR-465** test (a) → (d) ở SPEC 10 PASS (int `auto-unlock.int.spec.ts`).
- **BR-485 phủ** `admin-audit-coverage.spec.ts` PASS:
  - mọi route Admin ghi có trong manifest;
  - thêm thử 1 route giả trong fixture test → FAIL (test âm trong cùng spec);
  - completion liệt kê route miễn + lý do và route đã bổ sung audit.
- **BR-485 danh sách** Given 120 audit trong 90 ngày + 5 dòng 100 ngày trước Then:
  - trang 1 có 50 dòng mới nhất, "Xem thêm" tải tiếp, tổng 120;
  - không có dòng > 90 ngày;
  - EXPLAIN dùng `audit_logs (created_at DESC, id DESC)` trên ≥ 10k dòng.

  Test: int `audit-log-page.int.spec.ts`.
- **BR-485 CSV** When Admin bấm "Xuất CSV" Then:
  - job `audit` xong;
  - file `nhat-ky-hoat-dong.csv` có BOM, header `Người thực hiện,Thao tác,Nhóm,Thời gian`, 120 dòng, thời gian giờ VN;
  - ô bắt đầu `=` được thêm `'`;
  - audit `export.audit`;
  - Giảng viên (không `settings.log`) 403.

  Test: int `audit-log-page` › `export`; e2e `admin-audit-log.spec.ts`.
- **BR-485 lưu giữ** `audit-retention.int.spec.ts` vẫn PASS (theo Q-V46-807-1 mặc định).
- **BR-475 → 476** Given fixture: Bắc trial 4 / paid 8 / expired 2; Trung paid 7 / expired 3; Nam paid 1 / expired 1; 2 TV không nhóm tỉnh (paid 1, expired 1); 1 GĐ Vùng `regional_director`; 1 nhà đầu tư; 1 TV đã xóa Then:
  - Bắc 80% xanh lá, có tên GĐ Vùng;
  - Trung 70% xanh;
  - Nam 50% cam, "Chưa bổ nhiệm" nếu trống;
  - Toàn quốc trial 4 / paid 17 / expired 7 = 71%;
  - GĐ Vùng / nhà đầu tư / đã xóa không tính.

  Test: int `conversion.int.spec.ts` › `rates`; unit `conversion-table.spec.tsx` › `colors`.
- **BR-475 hiệu năng** EXPLAIN (ANALYZE, BUFFERS) câu tổng hợp trên ≥ 10k users + ≥ 10k `group_members` dán vào `TIP-V46-807-query-plans.md`. Dùng index `group_members (user_id, status)` cho LATERAL, không Seq Scan lặp. Cache 60 giây: gọi 2 lần chỉ chạy SQL 1 lần (int `conversion` › `cache`).
- **BR-477** When "Xuất CSV" Then:
  - response `chuyen-doi-theo-vung.csv`, BOM, header đúng 6 cột, 3 dòng vùng, tỷ lệ dạng `"80%"`;
  - audit `report.conversion_export`;
  - Kế toán không có `overview.view` → 403 (int + e2e `admin-overview.spec.ts` › `conversion csv`).
- **BR-486** e2e: 4 màn đều có nút "Xuất CSV" / "Xuất DS" và file tải có BOM (`admin-overview`, `admin-audit-log`, `admin-bank-reconcile` có sẵn, `admin-groups` có sẵn — chỉ thêm khẳng định nếu thiếu).
- **D-132 (3)** Given Cài đặt › Vai trò & phân quyền Then dòng quyền Affiliate hiện "Chi trả GĐ Vùng", không còn "Chi trả hoa hồng" (unit `permissions.spec.ts` + e2e `admin-rbac.spec.ts` khẳng định chữ).
- **P1 copy** Given mở `/login` Portal và Admin Then:
  - có "CỘNG ĐỒNG DOANH NGHIỆP MỘT NGƯỜI" (không "· QUỐC TẾ");
  - có "Liên kết chuỗi cung ứng, mở rộng thị trường";
  - có 4 tiêu đề + 4 mô tả đúng SPEC 23;
  - footer giữ "Kết nối địa phương · Kiến tạo chuỗi cung ứng quốc tế";
  - đổi ngôn ngữ `en` hiện bản dịch, không còn khóa thô.

  Test: e2e `a-01-login.spec.ts`; unit `auth-hero.spec.tsx`; `messages.spec.ts` PASS.
- **Không hồi quy**: `chat-rest.int.spec.ts`, `violations.int.spec.ts`, `audit-retention.int.spec.ts`, `share-ledger`, `my-region`, affiliate int, `overview.int.spec.ts`, e2e MSW không tụt so với `dev`.
- **Parity (D-134, tham khảo)**: đo ở 1440 + 390, ghi % và nguyên nhân phần > 3% (dữ liệu / D-xx / giao diện thật); lệch giao diện thật phải sửa.
  - `A-01` Đăng nhập (P1)
  - `D-01` Tổng quan có bảng chuyển đổi (P10)
  - `D-75` Nhật ký hoạt động (P15)
  - `D-69` Vai trò (D-132 (3))

## CONSTRAINTS

- DO NOT:
  - xóa / sửa khoản hoa hồng 0đ cũ trong DB; `VALIDATE CONSTRAINT`; áp lọc 0đ vào `regional_shares`
  - xóa `audit_logs`, nới trigger chỉ ghi thêm, sửa `audit-retention.int.spec.ts` khi Q-V46-807-1 chưa chốt khác mặc định
  - thêm interceptor audit tự động (audit phải cùng transaction với thay đổi — luật 10); log / CSV chứa secret
  - gộp số chuyển đổi vào `/admin/overview` (poll 3 giây); hằng số số liệu trong code / MSW (VM-464)
  - đổi server chat / socket event; thêm vòng `markRead` theo mỗi `unread.bump`
  - đổi key quyền `affiliate.payout` hay gán vai trò mặc định
  - đổi `tagline` / `copyright` / form đăng nhập (prototype không đổi)
  - `any`, `@ts-ignore`, `console.*`; query trong vòng lặp; `select *`; sửa `.env` thật; mask / nới assertion (D-134)
- REUSE:
  - `earliestRegionalGroup` (D-128), mẫu join tên GĐ Vùng `regional-projection.repository.ts`, `PAID_FEE_STATUS`
  - `toCsv` / `csvCell` (`common/http/csv.ts`), hàm chặn công thức của `bank-csv.service.ts` (chuyển thành helper dùng chung trong `common/http/csv.ts` nếu cần, 1 export)
  - `ExportBuilders` + `export_jobs` + `lib/use-export-job.ts`; `AuditService`; `methodDecoratorMap`
  - `AccountLockService`, `setStatusTx` (không sửa)
  - `clearRoomUnread`, `chatUnreadKey`, `useRoomActions`
  - `AuthHero` / `AuthFrame` của `packages/ui`
- SKIP:
  - BR-462 (đã làm ở 801), BR-464 (801), chu kỳ 15 giây cho tự mở khóa (D-127)
  - Bộ lọc nhật ký theo người / nhóm / ngày (prototype không có)
  - Xóa audit sau 90 ngày (chờ Q-V46-807-1)
  - Đổi nhãn vùng ở các màn GĐ Vùng
  - Dịch Admin sang ngôn ngữ khác (D-65 chỉ Portal)

## Câu hỏi chờ owner chốt (phương án mặc định đã ghi trong SPEC; builder dùng mặc định nếu owner chưa trả lời, ghi completion)

- **Q-V46-807-1 Lưu giữ nhật ký.** BR-485 ghi "lưu 90 ngày", nhưng NA-13 / REQ-213 ghi "giữ tối thiểu 12 tháng, không cho xóa"; DB có trigger chặn xóa và test khẳng định điều này.
  - **Mặc định:** màn + CSV hiện 90 ngày; DB vẫn giữ ≥ 12 tháng.
  - Phương án khác: xóa thật sau 90 ngày, cần migration nới trigger + job dọn + sửa test REQ-213.
- **Q-V46-807-2 Vùng của thành viên** cho bảng chuyển đổi ("tỉnh đăng ký").
  - **Mặc định:** nhóm tỉnh tham gia sớm nhất (D-128), giống cách gán affiliate cho GĐ Vùng; TV chưa vào nhóm tỉnh chỉ tính ở Toàn quốc.
  - Phương án khác: tỉnh trong hồ sơ doanh nghiệp (chỉ TK doanh nghiệp có).
- **Q-V46-807-3 Tập tính tỷ lệ.**
  - **Mặc định:** Đã trả = Đang hiệu lực + Sắp hết hạn; Hết hạn chưa trả = Hết hạn + Chờ thanh toán (dữ liệu cũ); không tính GĐ Vùng đương nhiệm, nhà đầu tư, TK đã xóa; TK bị khóa vẫn tính.
- **Q-V46-807-4 Cột Thời gian trong CSV nhật ký.**
  - **Mặc định:** ngày giờ tuyệt đối `dd/mm/yyyy HH:mm` (giờ VN), vì prototype ghi chữ tương đối ("2 giờ trước"), mở Excel không dùng được.
- **Q-V46-807-5 Phạm vi ẩn 0đ.**
  - **Mặc định:** mọi danh sách / tổng / đếm / CSV hoa hồng ở Admin + Portal; không áp vào sổ chia sẻ GĐ Vùng (dòng 0% là thiết kế 802); DB chặn khoản 0đ mới bằng constraint `NOT VALID`.

Ghi 5 câu vào `reports/ui-parity/questions.md` › V4.6 (dạng "mặc định, chờ owner").

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)

- [ ] `pwd` = `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V46-807-group1-audit-conversion`; chỉ sửa file trong **Files touched** (thêm ngoài danh sách → ghi lý do)
- [ ] Hỏi owner DB đích trước khi `migrate deploy` / int / e2e server / seed; migration `--create-only` rồi sửa SQL, có `down.sql`
- [ ] Đo baseline `dev` trước (int affiliate / chat / reporting / settings, e2e MSW, parity A-01 / D-01 / D-69 / D-75) để tách lỗi cũ / mới
- [ ] Mỗi AC có test đúng tên, ghi PASS / FAIL thật từng cái
- [ ] Chạy và dán tóm tắt output thật: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck && pnpm build`; `pnpm e2e` MSW không tụt; e2e server cho `admin-audit-log`, `admin-overview` (conversion), `portal-chat-read`
- [ ] EXPLAIN (ANALYZE, BUFFERS) ≥ 10k dòng: danh sách hoa hồng có `amount > 0`, trang nhật ký, câu tổng hợp chuyển đổi → `TIP-V46-807-query-plans.md`
- [ ] Parity (D-134): đo A-01, D-01, D-69, D-75 ở 1440 + 390, ghi % + nguyên nhân; sửa hết lệch giao diện thật
- [ ] Luật BUILDER-HANDOFF liên quan:
  - **Luật 6 (S-01 → S-12)**: đánh dấu đã đọc không tạo vòng REST theo socket, không query theo người nhận
  - **Luật 10**: audit trong **cùng transaction**; xuất nhật ký / chuyển đổi đều ghi audit; manifest phủ mọi route Admin ghi
  - **Luật 5**: chuyển đổi 1 câu SQL (LATERAL + FILTER), nhật ký keyset, hoa hồng lọc trong SQL — không lọc trong JS sau khi đọc
  - **D-128 / D-132 (3) / D-119**: vùng theo nhóm tỉnh sớm nhất; nhãn "Chi trả GĐ Vùng"; không đụng sổ chia sẻ GĐ Vùng khi ẩn 0đ
- [ ] File ≤ trần (BE 600, FE 400); không `any` / `@ts-ignore` / `console.*`
- [ ] D-65: 9 bộ dịch Portal có khối `hero` mới; `messages.spec.ts` PASS
- [ ] Ghi Q-V46-807-1 → 5 vào `questions.md`; cập nhật `V4.6-progress.md` dòng #7; glossary
- [ ] Sau khi đo: chạy lại seed demo (native HOLD); không tắt tiến trình HOLD
- [ ] Commit theo bước `git commit -- <paths>` (cấm `git add -A`); `git status --short` sạch; push; PR `base: dev`, không tự merge; completion report có **git commit SHA**, PR, số test thật, parity (tham khảo), EXPLAIN, soát luật cứng 1–14, phần chưa làm
- [ ] KHÔNG báo DONE nếu còn gate đỏ (lint / type / unit / int / e2e / depcheck / build); parity theo D-134 không chặn nhưng phải có nguyên nhân

---

### Quality Gate — `/vibecode:tip`

- [x] Header đủ (ID, module, priority, depends 801 / 803, estimate L, REQ / D)
- [x] Context: DB đích, delta P1 / P10 / P15 + §3 nhóm 1, BR-461 → 486, dòng prototype, code hiện tại có file:line
- [x] Task rõ 5 mảng + SKIP (BR-462 / 464, chu kỳ 15 giây, bộ lọc nhật ký, xóa audit)
- [x] Business rules đánh số 1 → 25, validation, bảng lỗi
- [x] AC Given / When / Then có tên test: TC-461, tin mới, tin của mình, lỗi, ẩn 0đ, chặn mới, sổ GĐ Vùng, BR-465, phủ audit, danh sách, CSV nhật ký, lưu giữ, tỷ lệ / màu, hiệu năng, CSV chuyển đổi, BR-486, nhãn quyền, copy P1, không hồi quy, parity
- [x] Constraints DO NOT / REUSE / SKIP
- [x] Applicable Standards từ `standards/README.md`
- [x] Files touched mức file; Parallel-safe: sequential với 811 (settings), 808 (shell)
- [x] BUILDER-CHECKLIST trích luật 5 / 6 / 10, D-128 / D-132 / D-119
- ⚠️ Gap:
  - Q-V46-807-1 → 5 chưa chốt; TIP ghi phương án mặc định an toàn (không xóa dữ liệu, không đổi định nghĩa vùng).
  - Manifest audit dựa trên chuỗi action xuất hiện trong mã nguồn. Cách này bắt được route mới chưa phân loại, nhưng không chứng minh được service gọi audit ở mọi nhánh. Các nhánh lỗi / sớm vẫn dựa vào int test từng domain.
  - Bảng chuyển đổi dùng LATERAL trên toàn bộ users. Ở quy mô lớn cần đo EXPLAIN; cache 60 giây giảm tải nhưng không thay được việc đo.
  - Dịch 9 bộ ngôn ngữ do AI (D-65), người bản xứ soát sau.
## Execution file refinements (builder)

- Shared audit pagination/cursor/time schemas are isolated in `packages/shared/src/api-domains/audit-log-page.ts` (+ spec), exported by the API barrel instead of expanding settings-admin; no contract change beyond TIP.
- `settings/repositories/audit-log.repository.ts` owns keyset SQL; `settings/settings-audit.module.ts` registers API/worker export builders without making SettingsCore depend on ExportCore.
- `reporting/conversion.ts` owns pure row/rate assembly; `reporting/transparency-plan.int.spec.ts` covers the three runtime queries with deployed-index clones.
- `overview/components/conversion-grid.tsx` extracts the table from its orchestration component.
- Shared mock pagination, CSV formatting and conversion are split into `mock-data/domains/{audit-log-page,transparency-csv,overview-conversion}.ts`; Admin handlers split into `mocks/handlers/audit-log.ts`.
- Existing `affiliate-admin/{state,write}.ts` centralize positive-only mock reads and preserve amounts when a new rate rounds to zero. Portal converted zero-only referrals map back to pending without rewriting history.
- `common/http/csv.ts` exports existing Bank formula defence for the two new CSV builders; Bank only swaps its local helper for that export.
- `e2e/behavior/helpers/csv-download.ts` reads actual downloads for BOM assertions on all four required CSV screens; `admin-rbac.spec.ts` asserts the new label.
- Audit keysets preserve PostgreSQL microsecond cursor precision rather than truncating through JS Date; an integration case checks consecutive one-row pages.
- No new dependency, event, permission key, production timeout or test assertion relaxation.
- The accidental generated/compensating migration incident and owner-selected resolution must be recorded in completion before handoff.
- Owner additionally approved narrow isolation in `test/chat/chat-rest.int.spec.ts`: afterEach removes only that case's group IDs; no assertion, production API or100-item cap change. Full and isolated failure both reproduced before the repair.
