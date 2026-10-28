# TIP-V42-711 — Handoff cho Codex (phần còn lại: Portal UI/i18n/e2e/parity)

> Phiên Claude đã dừng GOAL theo yêu cầu owner ngay sau khi xong **phần backend** của TIP-V42-711.
> Đọc trước: `coding-packs/reports/TIP-V42-711-completion.md` (đã làm gì, test số thật, quyết định Q-V42-711-1 → 5) và `coding-packs/tips/TIP-V42-711-project-live-store-post.md` (đặc tả gốc đầy đủ, mục "Files touched" là bản kê chính xác nhất).

## Trạng thái nhánh

- Nhánh: `feature/TIP-V42-711-project-live-store-post`, xếp chồng trên `feature/TIP-V42-710-store-builder` (chưa merge, đã push).
- Backend/DB/test backend: xong, commit `d48c4fe1` (DB), `79ca8d85` (server+shared), `375a8d56` (test), `faa9e464` (báo cáo). `git status --short` sạch.
- Chưa tạo PR (gh chưa đăng nhập trong phiên trước — Codex có quyền thì tạo PR base `feature/TIP-V42-710-store-builder`).

## Việc còn lại — làm đúng theo TIP gốc, không đổi phạm vi

Lấy nguyên từ mục "Files touched" + "Phạm vi CHƯA làm" trong 2 file trên:

1. **Server**: `apps/server/src/modules/local-business/controllers/store.controller.ts` (hoặc service liên quan) — thêm field/endpoint trả danh sách dự án (`storeId` khớp, lọc theo `visibleTo`) vào `StoreDetail` để Portal render khối "Dự án OPC".
2. **Portal**:
   - `features/stores/components/detail-screen.tsx`: thêm khối `StoreProjects` ngay sau `StoreNeeds`.
   - `features/stores/components/store-projects.tsx` (file mới, theo mẫu `features/needs/components/store-needs.tsx`): danh sách dự án của gian hàng; `isMine=true` → nút "+ Đăng dự án OPC"; trống → câu đúng prototype "Chưa có dự án. Dự án OPC do doanh nghiệp đăng sẽ tự hiện tại đây và ở trang Dự án OPC."
   - `features/projects/` (form tạo): nhận prefill từ gian hàng — `name` (gợi ý theo tên gian hàng, sửa được), `province` (khoá theo gian hàng — **đã có cột `Project.province` riêng, không suy từ `group`**, backend đã xong), `audience`, hạng mục gợi ý từ `field` gian hàng, `storeId` gắn cố định (backend đã validate 403 nếu không phải gian hàng của chính chủ — xem `project-write.service.ts` `prepare()`).
3. **i18n**: `messages/*/stores.json` (10 ngôn ngữ) — khối "Dự án OPC", nút "+ Đăng dự án OPC", câu trống.
4. **e2e**:
   - `behavior/projects.spec.ts`: ca "submit → hiện ngay" (D-108) + ca "ẩn khi chủ hết hạn phí, hiện lại khi đóng phí" (D-109/BR-TRIAL-04).
   - `behavior/stores.spec.ts`: ca khối "Dự án OPC" (có dự án / trống / nút đăng từ gian hàng).
5. **Parity**: đo khối "Dự án OPC" trong trang gian hàng ở 1440 + 390, ngưỡng ≤ 3% theo `coding-packs/standards/frontend/ui-parity.md`. Chưa đo được vì UI chưa có — làm xong UI thì đo luôn, đừng bỏ qua.
6. **EXPLAIN riêng cho BR-TRIAL-04 ở nhánh project** (`visibleTo` + điều kiện `membershipFee`) ở quy mô ≥ 10k dòng — mẫu đã có sẵn ở TIP-710 cho store (`store-explore.repository.ts`, cùng shape index), chỉ cần làm script/test tương tự cho `project.repository.ts`.

## Việc KHÔNG thuộc TIP-711 nhưng phát hiện trong phiên trước — nên xử lý riêng (không bắt buộc gộp vào 711)

- `apps/portal/src/features/stores/components/wizard/step-profile.tsx`: hàm `Team` 84 dòng > trần 80 dòng (ESLint `max-lines-per-function`). Lỗi này đến từ TIP-710 (commit `e87fa2b5`), không phải TIP-711. Cần tách component con.
- `opchub_test` (DB test dùng chung) đã tích luỹ 3111 user / 1025 affiliate qua nhiều lần `test:int` trong suốt GOAL 701→711, làm một số file test domain `affiliate/*` fail ở cấp `beforeAll` khi chạy toàn bộ suite (`AffiliateAllocationService.ensure()` cạn không gian 920 mã cho vài tên trùng). Không liên quan domain `project`/`local-business`. Hai hướng xử lý: (a) dọn dữ liệu test cũ trong `opchub_test` (cẩn thận nếu có phiên khác đang chạy cùng DB), hoặc (b) mở rộng không gian mã trong `apps/server/src/modules/affiliate/services/affiliate-allocation.service.ts`.

## Lưu ý khi code tiếp

- D-108/D-109 đã áp dụng xong ở backend: dự án submit → `published` ngay, sửa dự án `published` ghi đè trực tiếp (không tạo revision), ẩn theo BR-TRIAL-04 khi chủ hết phí. Không cần sửa lại các phần này.
- `storeId`/`province` đã có trên `projectCardSchema`/`projectSaveSchema` (packages/shared), đã có cột DB + validate ownership ở service. Portal chỉ cần dùng, không cần đổi schema backend.
- Theo luật dự án: cập nhật `coding-packs/reports/V4.2-progress.md` dòng 11 (hoặc thêm dòng mới nếu tách TIP) sau khi xong phần UI/e2e/parity; viết completion report bổ sung hoặc cập nhật report hiện có, không bịa số — chạy test/parity thật rồi mới ghi.
- Không tự merge vào `main`/`dev`; tạo PR theo quy trình ở `AGENTS.md` (Git flow hiện hành).
