# TIP-V4-613: Trợ lý OPC Hub — khung ở chân sidebar Portal, mở danh mục dịch vụ & chương trình

## HEADER
- TIP-ID: TIP-V4-613
- Project: OPCHUB
- Module: portal (assistant mới, shell 1 dòng) · e2e
- Priority: P2 (REQ-513)
- Depends on: V4-605 (danh mục dịch vụ `GET /services`, popup Gói dịch vụ + form tư vấn), V4-606 (menu §27.3); xếp chồng V4-609 (PR #26 chưa merge)
- Estimated: S
- REQ / D: REQ-513 · REQ-509 · D-72, D-74, D-80 · §27.1 QT-13 · §27.6 AD-09 / UP-12 · §27.8
- **Files touched:**
  - `apps/portal/src/features/assistant/**` (create): `index.ts`, `model.ts`, `model.spec.ts`, `components/assistant-panel.tsx`, `components/assistant-item.tsx`, `components/assistant.module.css`, `components/assistant-panel.spec.tsx`.
  - `apps/portal/src/features/membership/navigation.ts` (modify): thêm `openConsultForm(svcId)`; `index.ts` re-export `openPricingPopup`, `openConsultForm`.
  - `apps/portal/src/features/shell/components/portal-shell.tsx` (modify, 1 dòng): `sidebarExtra` = PlanBadge + AssistantPanel.
  - `apps/portal/messages/*/assistant.json` (create, 10 ngôn ngữ), `apps/portal/src/i18n/messages.ts` (modify).
  - `e2e/behavior/assistant.spec.ts` (create).
  - `e2e/parity/scenarios/portal-assistant.ts` (create) + `portal.ts` (registry).
  - `coding-packs/reports/ui-parity/questions.md` (Q-V4-613-x).
- **Parallel-safe with:** sequential — dùng chung `portal-shell.tsx`, `membership/navigation.ts` với V4-605 / V4-610.

## CONTEXT
- §27.1 QT-13: "Trợ lý OPC Hub | Không có | Khung trợ lý ở chân sidebar User Portal, mở danh mục dịch vụ & chương trình. | Mới".
- AD-09 / §27.8: "Danh mục hiển thị ở Bảng giá, Trợ lý OPC Hub, form tư vấn. Mục tắt không hiển thị."
- Prototype v4: **không có markup** của widget. Chỉ có logic mồ côi `svw*` (index.html:5134):
  - accordion danh mục đang bật (`svAc`), mỗi mục có nút mở form tư vấn (`wgo`);
  - "xem tất cả" mở popup Gói dịch vụ (`svwAll`).
  - Logic dựng nút nổi góc dưới. SRS ghi "chân sidebar" → theo SRS (nguồn ưu tiên cao hơn prototype).
- Mã có sẵn:
  - `features/services`: `useServices()` (lọc `enabled`), `ServiceIcon`.
  - `features/membership/navigation.ts`: `openPricingPopup()`; `PAYWALL_PATHS.form(svcId)`.
  - `packages/ui` sidebar: `sidebarExtra` tự ẩn khi thu gọn 76px, nằm trong drawer ở ≤ 767px.

## APPLICABLE STANDARDS
- [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md)
- [frontend/data-state](../standards/frontend/data-state.md)
- [frontend/antd-ui](../standards/frontend/antd-ui.md)
- [frontend/ui-parity](../standards/frontend/ui-parity.md)
- [testing/testing](../standards/testing/testing.md)

## TASK
Thêm khung "Trợ lý OPC Hub" ở chân sidebar Portal, ngay dưới thẻ gói thành viên:
- Khung có thể đóng / mở.
- Khi mở, liệt kê các mục danh mục chương trình & dịch vụ đang bật (dữ liệu Admin AD-09), dạng accordion.
- Mỗi mục có nút "Đăng ký tư vấn" mở form tư vấn của đúng dịch vụ đó.
- Liên kết "Xem tất cả dịch vụ" mở popup Gói dịch vụ.

## SPECIFICATIONS
### Business Rules
1. **Hiện cho mọi thành viên Portal** đã đăng nhập, kể cả chưa đóng phí. `GET /services` có `@SkipMembershipFee`. NĐT cũng thấy.
2. **Chỉ hiện mục `enabled`**: dùng `useServices()`, không gọi API mới. Mục Admin tắt biến mất sau khi refetch (staleTime 5 phút như popup).
3. **Đóng / mở**:
   - Mặc định đóng (khung gọn: icon + "Trợ lý OPC Hub" + dòng phụ).
   - Nhớ trạng thái bằng `localStorage` `opc-assistant-open` (try/catch), giống `opc-sb-mini`.
4. **Accordion**: mỗi lần mở một mục; bấm lại thì đóng (prototype `svAc`).
5. **Đăng ký tư vấn**: mở popup Gói dịch vụ ở bước form của dịch vụ đó (`openConsultForm(id)` = `setPopup(true)` + `pushPath(PAYWALL_PATHS.form(id))`), như prototype `wgo`.
6. **Xem tất cả**: `openPricingPopup()` (prototype `svwAll`).
7. **Sidebar thu gọn 76px**: ẩn cùng PlanBadge (hành vi sẵn có của `sidebarExtra`, prototype `sbFoot`). Mobile 390: nằm trong drawer.
8. **Không đếm "yêu cầu của tôi"** (`nReq`): chưa có API đọc yêu cầu của người dùng → ghi Q-V4-613.

### Copy (vi — prototype không có, TIP chốt)
- Tiêu đề "Trợ lý OPC Hub"; dòng phụ "Dịch vụ & chương trình hỗ trợ thành viên".
- Nút mở / đóng: aria "Mở Trợ lý OPC Hub" / "Thu gọn Trợ lý OPC Hub".
- Nút mục: "Đăng ký tư vấn"; liên kết cuối: "Xem tất cả dịch vụ →".
- Rỗng: "Chưa có chương trình nào đang mở."; lỗi: "Không tải được danh mục" + "Thử lại".

### Validation / Error Handling
- Lỗi tải: khối lỗi nhỏ có nút Thử lại (`refetch`). Không chặn sidebar.
- Đang tải: 3 dòng skeleton nhỏ.

## ACCEPTANCE CRITERIA
- Given thành viên M1 ở Portal, When nhìn chân sidebar, Then thấy khung "Trợ lý OPC Hub" dưới thẻ gói, đang đóng.
- Given khung đang đóng, When bấm mở, Then thấy 10 mục đang bật (MSW seed, `on:1`) và không có mục tắt (vd "Marketing số theo tháng").
- Given đã mở, When tải lại trang, Then khung vẫn mở.
- Given mở mục "Kết nối nguồn vốn", When bấm "Đăng ký tư vấn", Then popup mở ở form tư vấn, ô dịch vụ = "Kết nối nguồn vốn", URL `/services/fund/request`.
- Given khung mở, When bấm "Xem tất cả dịch vụ →", Then popup Gói dịch vụ mở (`/services`).
- Given sidebar thu gọn 76px, Then khung không hiện. Given mobile 390, When mở drawer Menu, Then thấy khung.

## PARITY
- P-117 "Trợ lý OPC Hub · đóng" và P-118 "Trợ lý OPC Hub · mở".
- Prototype không có markup → `unreachable` (ghi lý do). Hành vi kiểm bằng e2e; ảnh app lưu để owner duyệt (DV).
- Các màn shell đã đo (P-01 Dashboard, P-99 sidebar, P-14 / P-99-DRAWER) phải không vượt ngưỡng vì khung mới.
  - Nếu khung làm lệch sidebar so với prototype (prototype không có khung): ghi DV-V4-613-x với số đo thật.
  - Không mask, không nới ngưỡng.

## CONSTRAINTS
- DO NOT: thêm endpoint / bảng mới; dựng nút nổi kiểu chat; sửa `packages/ui` sidebar; nhúng chatbot AI (ngoài phạm vi REQ-513).
- REUSE: `useServices`, `ServiceIcon`, `openPricingPopup`, popup Gói dịch vụ + `ConsultForm` sẵn có.
- SKIP: đếm yêu cầu của tôi (`nReq`), ảnh minh hoạ `sv-*.png`, phân trang 8 mục.

## ⚠️ BUILDER-CHECKLIST
- [ ] Chỉ đụng các file trong `Files touched`.
- [ ] Mỗi Acceptance Criteria có test e2e hoặc unit, ghi kết quả từng cái.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` + build MSW: paste số thật.
- [ ] Rule: feature FE không import nội bộ feature khác — chỉ qua `index.ts` của `services` / `membership`. FE file ≤ 400 dòng. Không `any`.
- [ ] e2e: `assistant.spec.ts` + `portal-shell` + `a-01-login`. Parity P-117 / 118 + đo lại P-01, P-99, P-14, P-99-DRAWER.
- [ ] Commit theo đường dẫn, `git status --short` sạch, báo DONE kèm SHA.
