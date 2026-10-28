# TIP-V42-711: Dự án OPC hiện ngay + Admin hậu kiểm, ẩn khi chủ hết hạn, đăng Dự án từ gian hàng (QT-ST-PJ)

## HEADER
- TIP-ID: TIP-V42-711
- Project: OPCHUB
- Module: project (server + Portal + Admin); local-business (stores — khối "Dự án OPC"); MSW
- Priority: P1
- Depends on: TIP-V42-710 (gian hàng, media, `isMine`); xếp chồng trên TIP-V42-710 (nhánh chưa merge)
- Estimated: L
- REQ / D: REQ-612, D-108, D-109; QT-ST-PJ, E2E-10, §27.3 (coding-packs/audit/SPEC-V4.2-FULL-AUDIT.md :116 → :126, :172)
- **Files touched:**
  - DB: migration `v42_project_store_link` — `projects.store_id` (nullable, FK → `stores.id`), `projects.province` (`default ''`); `packages/db/prisma/schema/project.prisma`; test `packages/db/test/migration-project-store-link.int.spec.ts`
  - Shared: `api-domains/projects.ts` (+`storeId`, `province` trên `projectItemSchema`/`projectUpsertSchema`/schema chi tiết; schema tạo-từ-gian-hàng), mock-data `domains/projects.ts` (status mặc định `published`, bỏ `pending_review` khi tạo mới)
  - Server: `project/services/project-write.service.ts` (bỏ ép `pending_review` khi `submit`, set `published` + `publishedAt` ngay, kèm kiểm `isFeeUsable`), `project/domain/project-status.ts` (`ownerSaveStatus`: sửa dự án đã `published` không còn tạo revision chờ duyệt — ghi đè trực tiếp), `project/repositories/project.repository.ts` (`visibleTo` + mọi nơi gọi thêm tham số `now`, lọc theo `isFeeUsable` kiểu BR-TRIAL-04 như `store-explore.repository.ts`), `project/repositories/project-write.repository.ts` (ghi `storeId`/`province` khi tạo), `local-business/controllers/store.controller.ts` (hoặc service) thêm field/endpoint trả danh sách dự án của gian hàng cho `StoreDetail`
  - Portal: `features/stores/components/detail-screen.tsx` (thêm `StoreProjects` sau `StoreNeeds`), `features/stores/components/store-projects.tsx` (create, theo mẫu `features/needs/components/store-needs.tsx`), `features/projects/` (form tạo nhận prefill từ gian hàng: `name`, `province`, `field→category`, `audience`, `storeId`), `messages/*/stores.json` (khối "Dự án OPC", "+ Đăng dự án OPC", trống)
  - Admin: không cần endpoint/trạng thái mới (dùng lại `hide`/`republish` đã có ở `project-admin.repository.ts`); chỉ cần xác nhận tab "Chờ duyệt" vẫn đúng khi hầu hết dự án mới vào `published` ngay
  - Test: int `project-write.int.spec.ts` (tạo → `published` ngay, không qua `pending_review`), `project-visibility.int.spec.ts` (BR-TRIAL-04: hết hạn → ẩn, đóng lại → hiện), `migration-project-store-link.int.spec.ts`; unit `project-status.spec.ts` (sửa dự án `published` không tạo revision); portal `store-projects.spec.ts`; e2e `behavior/projects.spec.ts` (bổ sung ca hiện ngay + ẩn khi hết hạn), `behavior/stores.spec.ts` (bổ sung khối Dự án OPC); parity ID mới cho khối "Dự án OPC" trong trang gian hàng
- **Parallel-safe with:** sequential — chồng trên 710 (dùng `StoreDetail.isMine`, `detail-screen.tsx`).

## CONTEXT
- D-108 (owner 27/10/2026, thay D-18): dự án **hiện ngay** khi chủ đã kích hoạt (trial hoặc còn phí — như prototype `isPaid(s)`, không phải Admin duyệt trước); vẫn vào danh sách Kiểm duyệt để Admin hậu kiểm (Ẩn / Từ chối); **sửa không cần duyệt lại**. Gói Gọi vốn (fundraising) vẫn phải Admin thẩm định riêng — không đổi.
- D-109 (owner 27/10/2026): dự án của TK hết hạn → **ẩn như gian hàng**: rời Khám phá, dữ liệu giữ, tự hiện lại sau khi đóng phí (BR-TRIAL-04, giống `store-explore.repository.ts`).
- QT-ST-PJ: `Project` chưa có `storeId`/`province`; trang gian hàng (prototype :2337, :2387) có khối "Dự án OPC" ngay sau khối "Đang cần" — chủ gian hàng (`isOwner`/`isMine`) thấy nút "+ Đăng dự án OPC", người khác thấy danh sách dự án của gian hàng đó; trống → "Chưa có dự án. Dự án OPC do doanh nghiệp đăng sẽ tự hiện tại đây và ở trang Dự án OPC."
- **Mâu thuẫn đã rà (ghi theo Q-V42-711-1)**: REQ-106 cũ ("sửa dự án đã xuất bản → bản sửa chờ duyệt, bản đang hiển thị giữ nguyên") trái với D-108 ("sửa không cần duyệt lại"). D-108 có số lớn hơn và là quyết định RRI gần nhất (27/10/2026) → **D-108 thắng**: bỏ hẳn luồng revision-chờ-duyệt cho sửa dự án đã `published` kể từ TIP này. Gói Gọi vốn không bị ảnh hưởng (thẩm định tài chính riêng, không qua trạng thái `ProjectStatus`).
- Trạng thái `ProjectStatus` hiện có (`draft | pending_review | published | hidden | needs_changes | rejected`) đủ dùng, **không thêm giá trị mới**: Admin hậu kiểm dùng lại cặp chuyển trạng thái `hide: published→hidden` / `republish: hidden→published` đã có ở `project-admin.repository.ts`/`project-status.ts` (`REVIEW_TRANSITIONS`).
- Mẫu BR-TRIAL-04 tham chiếu: `apps/server/src/modules/local-business/repositories/store-explore.repository.ts:29-36` (`visibleStore(now)` lọc `membershipFee.status IN usableFeeStatuses() AND validUntil > now`); áp cùng mẫu vào `project.repository.ts:visibleTo` (và các hàm gọi nó: `exploreWhere`, `findVisible`, `related`, `stats`, `featuredId`) — đều cần nhận `now: Date`.

## SPECIFICATIONS
### Business Rules
1. **Tạo dự án:** `project-write.service.ts` — khi `submit=true` và chủ **đang kích hoạt** (`isFeeUsable`, V-11), set `status: 'published'`, `publishedAt: now` ngay (không còn trạng thái trung gian `pending_review` khi tạo); khi `submit=false` giữ `draft`. Chủ **chưa** kích hoạt (hết hạn / chưa đóng phí) → 403 theo `MembershipFeeGuard` hiện có (giữ như store/need), không tạo được dự án (đúng `isPaid(s)` ở prototype).
2. **Sửa dự án đã `published`:** `project-status.ts` `ownerSaveStatus()` — bỏ nhánh tạo revision cho dự án `published`; ghi đè trực tiếp nội dung, giữ `status: 'published'`, không đổi `publishedAt`. Dự án `draft`/`needs_changes` khi submit → `published` thẳng (không qua `pending_review`), cùng kiểm `isFeeUsable` ở (1).
3. **Admin hậu kiểm (không đổi cơ chế, chỉ đổi điểm vào):** dự án `published` mới tạo vẫn vào được danh sách Kiểm duyệt qua chip "Đang hiển thị" (không còn tự động rơi vào "Chờ duyệt" — chip này giờ gần như trống, trừ khi dùng `reject` cho dự án `draft`/`needs_changes` cũ còn lại trước TIP này). Admin dùng `hide` (ẩn khỏi Khám phá, giữ dữ liệu) / `republish` như luồng đã có.
4. **BR-TRIAL-04 cho dự án (D-109):** `visibleTo(now)` thêm điều kiện chủ dự án có phí khả dụng (`usableFeeStatuses()` + `validUntil > now`), **ngoại trừ** chủ xem dự án của chính mình (`ownerId: userId`) — như cách store/need vẫn cho chủ thấy gian hàng/nhu cầu của mình dù hết hạn. Hết hạn → rời Khám phá + trang Dự án OPC công khai; đóng phí lại → tự hiện lại (không cần Admin).
5. **Khối "Dự án OPC" trong trang gian hàng:** `StoreDetail` trả thêm danh sách dự án (`storeId` khớp, còn hiển thị theo `visibleTo`) để Portal render khối ngay sau "Đang cần" (giống thứ tự prototype). `isMine=true` → nút "+ Đăng dự án OPC" mở form tạo dự án **prefill** từ gian hàng: `name` (gợi ý theo tên gian hàng, chủ sửa được), `province` (khoá theo gian hàng — D-109/QT-ST-PJ: dự án lưu `province` riêng, không suy từ `group`), `audience` (enum trùng `StoreAudience`/`ProjectAudience`), hạng mục (category) gợi ý từ `field` của gian hàng (chủ chọn lại nếu cần), `storeId` gắn cố định. Không có dự án → câu trống đúng prototype.
6. **`storeId`/`province` trên Project:** không bắt buộc — dự án tạo từ trang "Dự án của tôi" (không qua gian hàng) vẫn hợp lệ với `storeId: null`; khi đó `province` nhập tay (không khoá).

### Validation
- `projectUpsertSchema` mở rộng: `storeId: z.string().nullable()` (nếu có, phải là gian hàng của chính `userId`, kiểm ở service — 403 nếu không khớp chủ), `province: z.string().trim().max(80)`.
- Tạo dự án (submit) vẫn kiểm `isFeeUsable(owner)`; sai → 403 `FEE_REQUIRED`-kiểu (dùng mã lỗi hiện có của `MembershipFeeGuard`, không tạo mã mới).

### Error Handling
- `storeId` không phải gian hàng của chính chủ → 400/403 (service kiểm, không tin client); dự án không tồn tại/đã xoá → 404 (giữ như cũ); Admin `hide`/`republish` dự án không ở đúng trạng thái nguồn → 409 (giữ cơ chế `transition()` hiện có, không đổi).

## ACCEPTANCE CRITERIA
- Given TK DN đang trial/còn phí, chưa có dự án nào When tạo dự án và bấm "Đăng dự án OPC" (submit) Then dự án `published` ngay, `publishedAt` có giá trị, hiện trong Khám phá + trang Dự án OPC ngay, không qua trạng thái `pending_review` (int `project-write`).
- Given TK DN hết phí (hết trial, chưa đóng) When tạo dự án và submit Then 403, không tạo được (int `project-write`, giữ đúng `isFeeUsable`).
- Given dự án đã `published` When chủ sửa nội dung và lưu Then vẫn `published`, không sinh revision chờ duyệt, nội dung công khai đổi ngay (unit `project-status.spec`, int `project-write`).
- Given dự án `published` của chủ đang hiện When chủ hết phí (hết hạn, không gia hạn) Then dự án rời Khám phá + trang Dự án OPC công khai cho người khác, chủ vẫn thấy ở "Dự án của tôi"; đóng phí lại Then tự hiện lại, không cần Admin (int `project-visibility`).
- Given gian hàng có ≥ 1 dự án `published`/`storeId` khớp When mở trang chi tiết gian hàng Then khối "Dự án OPC" hiện đúng danh sách, đúng thứ tự sau "Đang cần"; gian hàng của chính chủ có nút "+ Đăng dự án OPC" mở form prefill tên/tỉnh/đối tượng/hạng mục từ gian hàng (e2e `stores.spec`).
- Given gian hàng chưa có dự án nào When mở trang chi tiết (chủ hoặc khách) Then câu trống đúng prototype, không có ảnh/khung giả (e2e `stores.spec`).
- Given Admin mở Kiểm duyệt dự án `published` mới tạo When bấm "Ẩn" Then dự án rời Khám phá ngay (giữ dữ liệu); bấm "Hiện lại" Then trở lại Khám phá — dùng đúng cặp chuyển trạng thái hiện có, không trạng thái mới (e2e `admin-projects` nếu đã có, hoặc bổ sung ca mới).
- Given 10k dự án × điều kiện BR-TRIAL-04 When truy vấn Khám phá dự án Then `EXPLAIN` không `Seq Scan` trên `projects`/`membership_fees` lớn (int `project-visibility › EXPLAIN`).

## CONSTRAINTS
- DO NOT: thêm giá trị `ProjectStatus` mới; giữ luồng revision-chờ-duyệt cho sửa dự án `published` (D-108 đã bỏ, chỉ giữ cho Gọi vốn — không chạm Gọi vốn ở TIP này); check tên vai trò; query trong vòng lặp; để trang gian hàng hiện dự án giả/placeholder khi trống; hardcode giá (không liên quan TIP này nhưng vẫn áp luật chung).
- REUSE: cặp chuyển trạng thái `hide`/`republish` đã có (`project-admin.repository.ts`, `project-status.ts` `REVIEW_TRANSITIONS`); mẫu `visibleStore(now)`/BR-TRIAL-04 của `store-explore.repository.ts`; mẫu UI khối `features/needs/components/store-needs.tsx` cho `StoreProjects`; `isMine` đã có ở `StoreDetail` (TIP-710).
- SKIP: đổi cơ chế Admin Kiểm duyệt dự án (giữ nguyên transition hiện có); đổi gì ở Gọi vốn/fundraising (thẩm định tài chính riêng, ngoài phạm vi); dự án do Cá nhân/Tổ chức/Sinh viên đăng không qua gian hàng (đã hoạt động đúng từ trước, chỉ thêm `province` nhập tay — không bắt buộc gắn `storeId`).

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] Migration `--create-only` rồi sửa SQL (`store_id` nullable FK, `province` default ''); áp `opchub_dev` + `opchub_test`; test migration
- [ ] `project-write.service.ts`/`project-status.ts`: dự án mới + sửa dự án `published` không còn chạm `pending_review`/revision — kiểm bằng int test, không chỉ đọc code
- [ ] `visibleTo` + mọi hàm gọi nó nhận `now`, lọc BR-TRIAL-04 đúng mẫu store; EXPLAIN ≥ 10k dòng không Seq Scan
- [ ] Khối "Dự án OPC" trong gian hàng đúng thứ tự prototype (sau "Đang cần"), prefill đúng trường, câu trống đúng prototype khi không có dự án
- [ ] FE ≤ 400 dòng / file, hàm ≤ 80; 10 ngôn ngữ; parity khối mới ≤ 3% ở 1440 + 390; e2e không tụt số test so với 710
- [ ] Không bịa số liệu — `test:int`, `e2e`, parity chạy thật, ghi số thật vào completion report
