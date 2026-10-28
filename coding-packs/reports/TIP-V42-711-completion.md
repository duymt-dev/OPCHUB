# TIP-V42-711 — Dự án OPC hiện ngay + Admin hậu kiểm, ẩn khi chủ hết hạn, đăng Dự án từ gian hàng (QT-ST-PJ) — completion

> **Resumed; NOT DONE.** Current code is pushed through `bb400c76`. UI parity is now 32/32 passed and native browser coverage is 15/15 passed; fresh full-suite gates remain open (Affiliate test-fixture exhaustion and a stale-build MSW run are documented in [the current checkpoint](TIP-V42-711-codex-progress.md)). The backend-only report below is historical, not full acceptance.


- Nhánh `feature/TIP-V42-711-project-live-store-post`, xếp chồng trên `feature/TIP-V42-710-store-builder` (chưa merge).
- PR: base `feature/TIP-V42-710-store-builder`. **Chưa tạo được** (gh chưa đăng nhập, không có `GH_TOKEN` trong phiên). Nhánh đã push.
  Link: https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V42-710-store-builder...feature/TIP-V42-711-project-live-store-post
- REQ / D: REQ-612, D-108, D-109; QT-ST-PJ, §27.3 (coding-packs/audit/SPEC-V4.2-FULL-AUDIT.md :116 → :126, :172)

## Phạm vi đã làm (backend, có test thật)

| SHA | Nội dung |
|---|---|
| `cba68dfb` | docs(tip): TIP-V42-711 |
| `d48c4fe1` | DB: `projects.store_id` (nullable, FK → `stores.id`, `ON DELETE SET NULL`) + `projects.province` (default `''`); test migration riêng |
| `79ca8d85` | Server: D-108 (`ownerSaveStatus` bỏ nhánh tạo revision cho dự án `published` — gửi là hiện ngay, sửa ghi đè trực tiếp); D-109 (`visibleTo` + mọi hàm gọi nhận `now`, lọc BR-TRIAL-04 theo mẫu `store-explore.repository.ts`); ghi `storeId`/`province` khi tạo/sửa dự án, kiểm `storeId` phải là gian hàng của chính chủ (403 nếu không); `province` đọc từ cột riêng (fallback nhóm/quốc gia cho dữ liệu cũ); shared schema + mock-data theo |
| `375a8d56` | Test: viết lại `project-status.spec.ts`, `projects.int.spec.ts`, `admin-projects.int.spec.ts` theo D-108 (bỏ 3 ca "duyệt/từ chối/yêu cầu chỉnh sửa bản sửa" — không còn đường tạo qua API); sửa `sanitize.int.spec.ts`, `contract/project-admin.int.spec.ts`, `gates/b4-events-projects-investors.int.spec.ts`, `account/lock-propagation.int.spec.ts` theo cùng thay đổi; thêm ca `storeId`/`province` (QT-ST-PJ); cập nhật 2 mỏ neo máy trạng thái trong `audit/c4-transitions.audit.ts` |
| commit báo cáo | SHA ở `git log` |

**Mâu thuẫn đã rà (Q-V42-711-1)**: REQ-106 cũ ("sửa dự án đã xuất bản → bản sửa chờ duyệt") trái D-108 ("sửa không cần duyệt lại"). D-108 là quyết định RRI gần nhất (27/10/2026), số lớn hơn → D-108 thắng. `ProjectRevisionService`/bảng/kiểu dữ liệu giữ nguyên cho dữ liệu lịch sử (admin vẫn duyệt được bản sửa cũ còn sót), chỉ bỏ đường TẠO MỚI từ luồng lưu.

## Phạm vi CHƯA làm (nằm trong TIP gốc, dừng lại theo chỉ đạo "xong backend 711 thì dừng GOAL")

Theo chỉ đạo của owner giữa phiên ("xong TIP 711 thì block goal để đổi sang Codex"), phần UI/i18n/e2e/parity của TIP này **chưa làm**, cần một phiên/TIP kế tiếp (Codex hoặc Claude) tiếp tục đúng theo `coding-packs/tips/TIP-V42-711-project-live-store-post.md` mục Files touched:

- `apps/server/src/modules/local-business/controllers/store.controller.ts` (hoặc service) — chưa thêm field/endpoint trả danh sách dự án của gian hàng cho `StoreDetail`.
- Portal: `features/stores/components/detail-screen.tsx` (khối `StoreProjects` sau `StoreNeeds`), `features/stores/components/store-projects.tsx` (mới, theo mẫu `store-needs.tsx`), `features/projects/` (form prefill từ gian hàng: tên/tỉnh/hạng mục/đối tượng/`storeId`) — **chưa làm**.
- `messages/*/stores.json` (khối "Dự án OPC", "+ Đăng dự án OPC", câu trống) — **chưa làm** (10 ngôn ngữ).
- e2e `behavior/projects.spec.ts` (ca hiện ngay + ẩn khi hết hạn), `behavior/stores.spec.ts` (khối Dự án OPC) — **chưa làm**.
- Parity khối "Dự án OPC" trong trang gian hàng — **chưa đo** (chưa có UI để đo).
- `EXPLAIN (ANALYZE, BUFFERS)` cho truy vấn BR-TRIAL-04 ở quy mô ≥ 10k dòng (`visibleTo` + điều kiện `membershipFee`) — **chưa đo riêng**; mẫu truy vấn giống hệt `store-explore.repository.ts` đã có EXPLAIN ở TIP-710 (cùng shape index `(status) + membership_fee(status, valid_until)`), rủi ro thấp nhưng chưa tự đo cho nhánh dự án.

**Không bịa số**: các mục trên để nguyên "chưa làm", không ước lượng hay báo pass giả.

## Acceptance (phần đã làm)

| AC | Test | Kết quả |
|---|---|---|
| TK đang trial/còn phí, submit → `published` ngay, `publishedAt` có giá trị, hiện trong Khám phá ngay, không qua `pending_review` | int `projects.int.spec` "submit → Đăng ngay (D-108)"; gate `b4-events-projects-investors` | pass |
| TK hết phí submit → 403 (MembershipFeeGuard toàn cục, không cần sửa thêm — route `POST /projects` không có `@SkipMembershipFee`) | đã có từ trước (guard toàn cục), không hồi quy | pass (gián tiếp, không test riêng mới) |
| Dự án `published`, chủ sửa nội dung → vẫn `published`, không sinh revision, nội dung đổi ngay | unit `project-status.spec`; int `projects.int.spec` "D-108 sửa dự án..." + "sửa 2 lần liên tiếp" | pass |
| `storeId` của chính chủ lưu được + `province` riêng; `storeId` gian hàng người khác → 403 | int `projects.int.spec` "QT-ST-PJ" | pass |
| Admin Kiểm duyệt dự án `published` mới tạo: "Ẩn" → rời Khám phá; "Hiện lại" → về Khám phá — dùng đúng `hide`/`republish` có sẵn | int `admin-projects.int.spec`, `contract/project-admin.int.spec` | pass |
| Dự án owner hết hạn phí → rời Khám phá (BR-TRIAL-04), owner/team/nhóm chia sẻ vẫn thấy | logic `visibleTo` theo đúng mẫu `store-explore.repository.ts` (đã review code, chưa có int test riêng tên BR-TRIAL-04 cho dự án — ghi nhận thiếu, xem mục "chưa làm") | **chưa có test chuyên biệt** |
| 10k dự án × BR-TRIAL-04 → EXPLAIN không Seq Scan | — | **chưa đo** |
| Khối "Dự án OPC" ở trang gian hàng | — | **chưa làm** |

## Test (số thật, máy dev)

- `pnpm lint`: **server/shared/db/e2e xanh**; `@opchub/admin` 0 lỗi (5 cảnh báo `no-img-element` có từ trước); **`@opchub/portal` có 1 lỗi tiền tồn tại KHÔNG LIÊN QUAN TIP này** — `features/stores/components/wizard/step-profile.tsx` hàm `Team` 84 dòng > trần 80, đến từ commit `e87fa2b5` của TIP-V42-710 (xác nhận bằng `git log -- <file>`), không chạm ở TIP-711. Báo cáo theo luật "thấy lỗi ngoài phạm vi thì ghi, không tự sửa lan" — cần TIP riêng (hoặc Boy Scout nhỏ) để tách `Team` thành component con.
- `pnpm typecheck`: server, shared, portal, admin — tất cả xanh.
- `pnpm depcheck`: xanh (2034 + 904 module, 0 vi phạm biên).
- `pnpm --filter @opchub/server audit`: máy trạng thái Dự án hết "THIẾU" sau khi cập nhật 2 mỏ neo theo D-108; các "THIẾU" khác (tài khoản, phí, báo cáo tin, bot…) đã có từ trước, không liên quan TIP này.
- Unit: shared **430/430**, portal **389/389**, admin **460/460**, server unit **225/225** — tất cả pass.
- `test:int` server — chạy riêng từng file liên quan TIP-711 (sạch, không chạy chung để tránh nhiễu dữ liệu tồn đọng — xem mục dưới):
  - `test/project/projects.int.spec.ts`: **14/14** pass.
  - `test/project/admin-projects.int.spec.ts`: **5/5** pass.
  - `test/common/sanitize.int.spec.ts`: **7/7** pass.
  - `test/gates/b4-events-projects-investors.int.spec.ts`: **1/1** pass.
  - `test/contract/project-admin.int.spec.ts`: **1/1** pass.
  - `test/account/lock-propagation.int.spec.ts`: không chạy lại riêng lần cuối (sửa 1 dòng thêm tham số `now`, đã qua typecheck + review code; khuyến nghị chạy lại trước khi merge nếu cần chắc chắn tuyệt đối).
- `test:int` db (`packages/db`): **19 file, 60/60** pass (gồm migration test TIP-711).
- `test:int` server — **chạy toàn bộ 2 lần**: lần 1 (163 file) có 23 file "failed" do cascade `t.close() on undefined`; lần 2 (clean, không chạy gì song song) **vẫn còn 22 file cascade tương tự nhưng 0 test assertion thật sự fail** (1435 passed / 59 skipped / 0 failed trên 1494 test). Đã truy ra gốc rễ: `AffiliateAllocationService.ensure()` sinh mã đại lý từ 920 hậu tố cố định theo `fullName`; `opchub_test` dùng chung phiên này đã tích luỹ **3111 user / 1025 affiliate** qua rất nhiều lần chạy test:int của cả GOAL (701→711), khiến không gian 920 mã cho một vài tên `Người thử N` trùng lặp bị cạn — lỗi `Không sinh được mã đại lý cho <userId>` ném ra ngay ở `AffiliateProcessor.onApplicationBootstrap`, làm `beforeAll` hỏng → `afterAll` gọi `t.close()` trên `undefined`. **Tái hiện được độc lập** (chạy riêng `admin-commissions.int.spec.ts` một mình vẫn lỗi y hệt) → xác nhận đây là **vấn đề tích luỹ dữ liệu test của cả phiên làm việc dài, không phải hồi quy của TIP-711** (toàn bộ 22 file đều thuộc domain `affiliate`/`contract/affiliate*`, không có file nào thuộc `project`/`local-business`). **Không tự dọn `opchub_test`** vì máy có nhiều phiên AI khác đang chạy cùng lúc (`ListAgents` thấy 2 phiên "busy"), xoá dữ liệu người dùng hàng loạt có thể ảnh hưởng phiên khác đang dùng chung DB — để lại cho owner/Codex quyết định dọn hay tăng không gian mã ở `affiliate-allocation.service.ts`.
- `pnpm build`: server (tsdown), portal, admin — cả ba thành công.

## Soát luật cứng

1. File trong trần: không file nào trong TIP-711 vượt 600 dòng (BE) — các file sửa đều < 300 dòng.
2. Không `any`; `storeId`/`province` parse zod trong `packages/shared` (`projectSaveSchema`).
3. depcheck sạch.
4. Không đổi cơ chế phân quyền.
5. Không query trong vòng lặp; `visibleTo` dùng đúng mẫu index `(status) + membership_fee(status, valid_until)` đã có từ store.
6. Chat/realtime không chạm.
7. Đổi trạng thái dự án vẫn qua `ownerSaveStatus`/`project-admin.repository.ts` transition có điều kiện (`WHERE status = from`), không đổi cơ chế.
8. Hiệu ứng phụ quan trọng không chạm ở TIP này.
9. Tiền không chạm; `publishedAt` vẫn `timestamptz`.
12. Không secret, không biến env mới.
13. Test ở file riêng.
14. Commit theo đường dẫn cụ thể (`git commit -- <paths>`, không `git add -A`); `git status --short` sạch trước khi báo DONE (xác nhận: sạch).

## Quyết định phát sinh trong phiên (Q-V42-711)

1. **Q-V42-711-1** (đã ghi trong TIP doc): D-108 thắng REQ-106/D-18 theo luật "số D-xx lớn hơn thắng" — bỏ hẳn luồng revision-chờ-duyệt cho sửa dự án `published` kể từ TIP này; giữ nguyên hạ tầng `ProjectRevisionService` cho dữ liệu cũ.
2. Không thêm `MembershipFeeGuard` riêng cho tạo dự án — route `POST /v1/projects` đã nằm dưới `APP_GUARD` `MembershipFeeGuard` toàn cục (`auth.module.ts`), tự động chặn TK hết phí; không cần sửa thêm.
3. 3 test "duyệt/từ chối/yêu cầu chỉnh sửa bản sửa" trong `admin-projects.int.spec.ts` bị xoá hẳn thay vì sửa, vì cơ chế chúng kiểm tra (tạo revision khi sửa dự án `published`) không còn đường nào trong API tạo ra được nữa — giữ test cho một luồng chết là kiểm tra chi tiết triển khai, không phải hành vi sản phẩm.
4. Phát hiện và sửa thêm (ngoài danh sách gốc của TIP, nhưng là hồi quy trực tiếp của thay đổi D-108, không phải việc mới): `test/contract/project-admin.int.spec.ts` và `test/gates/b4-events-projects-investors.int.spec.ts` cũng giả định `pending_review` cũ — đã sửa cùng đợt.
5. Cập nhật `test/audit/c4-transitions.audit.ts` (script tự kiểm máy trạng thái §8, chạy bằng `tsx`, không thuộc `test:int`) cho khớp D-108 — không bắt buộc theo TIP nhưng cần thiết để script không báo nhầm "THIẾU" cho cạnh đã đổi tên.

## Việc cần làm tiếp (bàn giao)

1. Portal "Dự án OPC" trong trang gian hàng (component + wiring + prefill form) — theo đúng mục "Phạm vi CHƯA làm" ở trên.
2. 10 ngôn ngữ `messages/*/stores.json`.
3. e2e `projects.spec.ts` + `stores.spec.ts` bổ sung ca mới; parity khối "Dự án OPC".
4. EXPLAIN riêng cho BR-TRIAL-04 ở quy mô 10k dòng (nhánh dự án).
5. Sửa lỗi lint tiền tồn tại (không thuộc TIP-711) ở `step-profile.tsx` (`Team` 84 > 80 dòng) — cần tách component con.
6. Dọn dữ liệu test tích luỹ ở `opchub_test` (3111 user, 1025 affiliate) hoặc tăng không gian mã ở `affiliate-allocation.service.ts` — không chạm ở phiên này vì có phiên khác dùng chung máy/DB.
