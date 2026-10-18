# TIP-V2-404: Affiliate Admin — Hoa hồng, Đại lý, Chi tiết đại lý, Chính sách (REQ-312, AF-R08…R10, LK-10)

## HEADER
- TIP-ID: TIP-V2-404 · Project: OPCHUB · Module: admin/affiliate · Priority: P0 · Depends on: TIP-V2-402 (API + zod), TIP-V2-204 (ẩn menu, dải "Chế độ chỉ xem", `useCan`/xem thử), TIP-V2-403 (mock store `affiliate.ts` + e2e AT-AF02 dựng dữ liệu) · Estimated: L (14h)
- **Files touched:**
  - `apps/admin/src/features/affiliate/` (create): `api.ts`, `types.ts`, `model.ts` + `model.spec.ts` (nhãn trạng thái, tổng tháng, CSV filename), `hooks/{use-affiliate-params,use-commissions,use-affiliates,use-affiliate-detail,use-policy,use-commission-selection,use-affiliate-actions}.ts`, `components/{affiliate-screen,affiliate-stats,affiliate-tabs,commission-toolbar,commission-table,commission-bulk-bar,cancel-dialog,affiliate-table,affiliate-bulk-bar,bulk-rate-dialog,affiliate-detail,rate-editor,payout-months-tab,customers-tab,policy-form}.tsx` + `*.module.css`, `index.ts`
  - `apps/admin/src/app/(admin)/affiliate/[[...slug]]/page.tsx` (create: `/affiliate?tab=com|aff|cfg&q&status&page&size`, `/affiliate/:id?tab=months|customers`)
  - `apps/admin/src/features/shell/nav.ts` (modify: `AdminNavKey` + mục `affiliate` sau `requests`, trước `settings`, quyền `affiliate.view` theo khoá TIP-V2-201) · `packages/ui/src/icons/paths.ts` (dùng icon `affiliate` TIP-V2-403 tạo; nếu 404 làm trước thì tạo)
  - `apps/admin/messages/vi/affiliate.json` (create) · `apps/admin/messages/vi/common.json` (modify: `nav.affiliate`) · `apps/admin/src/i18n/messages.ts` (modify: 1 dòng)
  - `packages/shared/src/mock-data/domains/affiliate.ts` (modify — thêm thao tác Admin: list/cancel/rate/payout/policy/csv) · `apps/admin/src/mocks/handlers/affiliate.ts` (create) · `handlers/index.ts` (modify) · `apps/admin/src/mocks/affiliate-handlers.spec.ts` (create)
  - `e2e/behavior/admin-affiliate.spec.ts` (create) · `e2e/behavior/affiliate-acceptance.spec.ts` (create: AT-AF01…06 xuyên Portal ↔ Admin) · `e2e/server/api.ts` (modify: helper `expireFee(userId)` gọi endpoint dev/test hoặc SQL qua script có sẵn — xem Câu hỏi Q-404-2)
- **Parallel-safe with:** TIP-V2-403 (khác app; chung `mock-data/domains/affiliate.ts`, 404 chỉ thêm hàm sau khi 403 tạo). `sequential, shares features/shell/nav.ts with TIP-V2-204`.
- **Phase / nhánh:** V2-P4, `feature/V2-P4-affiliate`

## CONTEXT
- Prototype khối `<!-- ===== ADMIN: AFFILIATE ===== -->`: 3 tab "Hoa hồng · Affiliate · Chính sách" kèm số đếm, thẻ thống kê (Doanh thu từ affiliate, Tổng hoa hồng phát sinh, Hoa hồng phải trả, "Doanh thu thuần sau hoa hồng"), toolbar "Tìm thành viên hoặc affiliate...", nút trạng thái cùng hàng, menu "Chuyển trạng thái" từng dòng, BulkBar "Đã chọn N · Hủy · Xuất CSV · Bỏ chọn"; tab Affiliate "Thành viên đóng phí tự động thành đại lý", Select "Hoa hồng theo tháng", cột Đại lý · Mã · % HH · Khách hàng · Doanh thu · Trạng thái tháng · Đối soát & chi trả; Chi tiết "← Quay lại danh sách", "Tỷ lệ hoa hồng · Đã gán cố định · chỉ Admin được thay đổi · Sửa (Admin)", tab tháng (Tháng · Khách · Hoa hồng · Trạng thái · Ngày chi trả · Chi trả) và tab khách (Khách hàng · Ngày · % HH · Hoa hồng · Trạng thái · Lịch sử chi trả); Chính sách: % mặc định, "Thời gian ghi nhận link (ngày)", đoạn Quy tắc, "Lưu chính sách".
- §20.6 dòng Admin; §21.2 (Xem / Sửa %+hủy / Chi trả — Quản trị viên không có Chi trả, Kế toán có cả 3); RB-R07 chế độ chỉ xem; AT-RB02 (Kế toán thấy menu Affiliate).
- Mẫu màn: `apps/admin/src/features/fees/**` (toolbar + bulk bar + selection + URL params), `features/investors/**` (drawer/chi tiết + CSV), `features/projects` (route `[[...slug]]`).

## APPLICABLE STANDARDS
[nextjs-structure](../standards/frontend/nextjs-structure.md) · [data-state](../standards/frontend/data-state.md) · [antd-ui](../standards/frontend/antd-ui.md) · [ui-parity](../standards/frontend/ui-parity.md) · [auth-rbac](../standards/backend/auth-rbac.md) (FE chỉ ẩn/chặn hiển thị, server quyết định) · [testing](../standards/testing/testing.md)

## TASK
Dựng menu + màn Affiliate Admin theo prototype ver2 (Hoa hồng, Đại lý, Chi tiết đại lý, Chính sách) nối API TIP-V2-402, ẩn/chỉ xem theo quyền; viết bộ e2e nghiệm thu AT-AF01…06 chạy cả msw và server.

## SPECIFICATIONS
1. **Tab Hoa hồng**: tìm (debounce, URL `q`) + Segmented trạng thái Tất cả / Đã ghi nhận / Đã chi trả / Đã hủy **cùng hàng**; bảng Ngày · Thành viên mới · Affiliate · Doanh thu · Tỷ lệ · Hoa hồng · Trạng thái · menu; chọn nhiều → Hủy (dialog bắt buộc lý do, AF-R10) / Xuất CSV; phân trang URL `page/size`. Khoản Đã hủy hiện lý do (tooltip). Không có nút "Duyệt" (hoa hồng tự ghi nhận).
2. **Tab Đại lý**: nhãn "Tự động" (active) / "Tạm dừng" (paused), số dư (recorded chưa chi), Select tháng; chọn nhiều → "Đặt %" (InputNumber 1–50, AF-R08) / Xuất CSV; dòng → chi tiết. Không có nút tạo đại lý (AF-R01).
3. **Chi tiết đại lý** (`/affiliate/:id`): thông tin + STK (hoặc "Chưa có số tài khoản" màu cảnh báo), 4 thẻ (Khách hàng, Doanh thu mang về, Tổng hoa hồng, Đã chi trả); sửa % (1–50, toast "…áp dụng cho khoản chưa chi trả"); tab Đối soát & chi trả theo tháng (nút "Chi trả" từng tháng đã kết thúc còn khoản recorded; chưa có STK → nút vẫn bấm được nhưng server 409, hiện thông báo "<Tên> chưa cập nhật số tài khoản" — AT-AF06); tab Khách hàng (cột Lịch sử chi trả: chủ TK · ngân hàng · số tiền, hoặc "Hoa hồng đã hủy — không chi trả." / "Chưa chi trả — sẽ thanh toán cuối <tháng>."); mỗi tab phân trang.
4. **Chính sách**: % mặc định (1–50), thời gian ghi nhận link (ngày), điều khoản (textarea), đoạn Quy tắc tĩnh theo prototype; "Lưu chính sách".
5. **Quyền** (khoá từ TIP-V2-201, dùng hook của TIP-V2-204): không có `affiliate.view` → ẩn menu, vào URL → màn 403 chung; có view không có action → dải "Chế độ chỉ xem", nút Hủy/Đặt %/Sửa %/Xuất/Lưu chặn với thông báo "Vai trò … chỉ có quyền xem mục này" (tìm, lọc, phân trang, chi tiết vẫn dùng); nút "Chi trả" theo khoá chi trả riêng (Quản trị viên mặc định không có → chặn; Kế toán có).
6. Màn chính chỉ orchestrator; mỗi component ≤ 250 dòng (trần 400).

## ACCEPTANCE CRITERIA
- Given TV mới đóng phí lần đầu, When Admin mở tab Đại lý, Then có dòng của TV với nhãn "Tự động" (AT-AF01, REQ-301).
- Given khách qua `/r/MÃ` đã đóng phí, When mở tab Hoa hồng, Then có 1 khoản "Đã ghi nhận" đúng % × 600.000đ (AT-AF02, REQ-306).
- Given khách đó gia hạn năm 2, Then tab Hoa hồng không thêm khoản (AT-AF04).
- Given đại lý hết hạn phí, Then nhãn "Tạm dừng"; khoản Đã ghi nhận trước đó vẫn chi trả được (AT-AF05, REQ-307).
- Given đại lý chưa có STK, When bấm Chi trả tháng, Then báo yêu cầu cập nhật số tài khoản, trạng thái khoản không đổi (AT-AF06, REQ-309).
- Chọn 2 khoản → Hủy không nhập lý do → nút xác nhận vô hiệu; nhập lý do → "Đã hủy 2 khoản hoa hồng", Portal đại lý thấy lý do (REQ-310). Đặt 30% hàng loạt → "Đã đặt tỷ lệ 30% cho N affiliate" (REQ-308).
- Đăng nhập Kế toán: thấy menu Affiliate, Chi trả được; Quản trị viên: Chi trả bị chặn; Biên tập nội dung: không thấy menu (§21.2, AT-RB02).
- Xuất CSV tạo dòng nhật ký (luật 10). Luồng LK-10 referral → commission → paid hiển thị đúng ở cả hai phía (REQ-410).

## TESTS BẮT BUỘC
- Unit `apps/admin/src/features/affiliate/model.spec.ts` (`REQ-312 nhãn/tổng tháng`).
- MSW `apps/admin/src/mocks/affiliate-handlers.spec.ts` (`REQ-309 payout chặn khi chưa STK`, `REQ-310 hủy cần lý do`, `REQ-308 % 1–50`).
- e2e `e2e/behavior/admin-affiliate.spec.ts` (`REQ-312 lọc+trạng thái cùng hàng+phân trang URL`, `REQ-310`, `REQ-308`, `quyền Kế toán/Quản trị viên/Biên tập`).
- e2e `e2e/behavior/affiliate-acceptance.spec.ts`: `AT-AF01`…`AT-AF06` mỗi test một mã, chạy **msw + server** cùng assertion (D-63, cấm `onServer` làm yếu). Server dùng `payFee` / `simulateTransfer` có sẵn.

## CONSTRAINTS
- DO NOT: kiểm quyền bằng tên vai trò ở FE (dùng khoá); tính lại tiền ở FE (hiển thị số server trả, `formatVnd`); import nội bộ feature `fees`/`investors` (copy pattern, không import).
- REUSE: `packages/ui` (`admin-table`, `bulk-bar`, `filter-bar`, `pagination`, `modal`, `status-tag`, `tabs`, `toast`), `@/lib/use-url-params`, `@/lib/api-client`.
- SKIP: thay đổi API (ghi vào báo cáo nếu thiếu field, không tự sửa server).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 1 (FE ≤ 400), 3 (ranh giới feature), 4 (quyền theo khoá), 10 (thao tác Admin có audit — kiểm qua tab Nhật ký trong e2e).
- [ ] File dùng chung (`nav.ts`, `messages/vi/common.json`, `handlers/index.ts`, `i18n/messages.ts`) chỉ thêm dòng, giữ `.wire-lock`.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` + `pnpm e2e` (msw) + `pnpm e2e:server --project behavior -g "Affiliate|AT-AF"` xanh; parity màn Admin · Affiliate ≤ 3%.
- [ ] `git commit -- <paths>`, `git status --short` sạch, báo `TIP-V2-404-DONE <sha>`; report `coding-packs/reports/TIP-V2-404-completion.md`.
