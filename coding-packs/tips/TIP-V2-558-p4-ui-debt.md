# TIP-V2-558: Trả nợ UI pixel P4 Affiliate Admin (TD-P4-UI-01..08), nghiệm thu native

## HEADER
- TIP-ID: TIP-V2-558
- Project: OPCHUB (opchub.community)
- Module: Admin · Affiliate (`apps/admin/src/features/affiliate`) + e2e Affiliate
- Priority: P2 (nợ hiển thị đã được owner hoãn; không chặn release)
- Depends on: none (P4 đã merge; nền `dev` 959ce399)
- Estimated: L
- **Files touched:**
  - `apps/admin/src/features/affiliate/components/affiliate.module.css` (modify: toolbar/Segmented, empty)
  - `apps/admin/src/features/affiliate/components/agent-layout.module.css` (modify: D-84-AFF, D-84-AFF-EMPTY)
  - `apps/admin/src/features/affiliate/components/commission-layout.module.css` (modify: D-84-COM-EMPTY/CANCELLED)
  - `apps/admin/src/features/affiliate/components/commission-status-menu.module.css` (modify: D-84-COM-CANCELLED-MENU)
  - `apps/admin/src/features/affiliate/components/policy-layout.module.css` (modify: D-84-POL 390)
  - `apps/admin/src/features/affiliate/components/list-toolbar.tsx` (modify chỉ khi cần cho TD-08)
  - `apps/admin/src/features/affiliate/components/{affiliate-table,commission-table,policy-form,policy-fields,policy-rules,policy-terms}.tsx` (modify chỉ khi markup bắt buộc đổi; ghi lý do trong report)
  - `apps/admin/src/features/affiliate/components/*.spec.tsx` (create/modify: unit cho thay đổi markup, nếu có)
  - `e2e/behavior/affiliate-ui-debt-agents.spec.ts` (create: D-84-AFF, D-84-AFF-EMPTY)
  - `e2e/behavior/affiliate-ui-debt-commissions.spec.ts` (create: D-84-COM-EMPTY, D-84-COM-CANCELLED, -MENU, TD-08)
  - `e2e/behavior/affiliate-ui-debt-policy.spec.ts` (create: D-84-POL)
  - `coding-packs/audit/V2-P4-UI-TECH-DEBT.md`, `coding-packs/audit/V2-P4-BUGS.md` (UI-404-03), `coding-packs/reports/ui-parity/{results.md,results.json,deviations.md}` (modify: số đo mới, giữ số cũ)
  - `coding-packs/reports/TIP-V2-558-completion.md`, `coding-packs/reports/evidence/v2-558/**` (create)
  - `coding-packs/02-TASK-GRAPH.md` (modify: chỉ dòng V2-558)
- **Parallel-safe with:** không có TIP đang mở cùng phạm vi. Mọi hạng mục dùng chung `affiliate.module.css` nên gộp vào **một TIP, làm tuần tự từng state** (không tách song song).

## CONTEXT
- Working dir: `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V2-558-p4-ui-debt` tách từ `dev` 959ce399. Tích hợp về `dev`; không đụng `main`.
- Tech stack: Next.js 16 + React 19 + Ant Design 6, CSS Modules; Playwright 1.64 + pixelmatch 8 (theo `coding-packs/standards/global/tooling.md`).
- Đọc trước:
  - `coding-packs/audit/V2-P4-UI-TECH-DEBT.md`, `coding-packs/audit/V2-P4-AUDIT-FOLLOWUPS.md` (dòng D-84-COM-*)
  - `coding-packs/reports/ui-parity/deviations.md` (DV-P4-404-1..5), `screens.md` dòng D-84-*
  - Baseline raw: `coding-packs/reports/evidence/v2-404/popup-layout/parity-f394dc5.json` (27/34 pass)
  - Thử nghiệm Policy đã rút: `coding-packs/reports/evidence/v2-404/ui-debt/` (khoảng cách đo được 10,578px → 10px → 8px, mục tiêu 6px)
  - Kịch bản parity: `e2e/parity/scenarios/admin-affiliate-{states,list-states,commission-steps,commission-states}.ts`
  - Behavior mẫu: `e2e/behavior/affiliate-status-filters.spec.ts`, `affiliate-policy-responsive.spec.ts`, `affiliate-agents-responsive.spec.ts`
- Native: `pnpm --filter @opchub/e2e e2e:server` (`playwright.server.config.ts`, project `parity` / `behavior`), cổng lấy từ `TEAM_*`/env e2e (`SERVER_ADMIN_PORT`, `API_PROXY_URL`…), không gõ số tay. Chọn state bằng `PARITY_IDS='D-84-*'`. Prototype: `pnpm --filter @opchub/e2e proto`.

## APPLICABLE STANDARDS
- [frontend/ui-parity](../standards/frontend/ui-parity.md): ngưỡng 3%, pixelmatch 0.1, lệch có chủ đích ghi `deviations.md` chờ duyệt
- [frontend/antd-ui](../standards/frontend/antd-ui.md): style qua theme token / CSS Modules, không chép inline style
- [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md): FE ≤ 400 dòng, component là orchestrator
- [testing/testing](../standards/testing/testing.md): mã ID trong tên test; behavior chạy cả MSW và server với **cùng assertion**
- [global/git-workflow](../standards/global/git-workflow.md): commit theo đường dẫn, báo DONE kèm SHA

## TASK
Giảm lệch pixel của 7 state Affiliate Admin đang FAIL và sửa TD-P4-UI-08 (nhãn đang chọn không tô xanh khi clock dừng), chỉ bằng CSS Modules/markup trong feature Affiliate. Mỗi thay đổi UI có test behavior native riêng, viết FAIL trước khi sửa và PASS sau khi sửa. State nào vẫn > 3% vì ràng buộc dữ liệu hoặc nghiệp vụ thì ghi deviation kèm số đo mới để owner duyệt, không che giấu.

## SPECIFICATIONS

### Hạng mục (làm tuần tự, mỗi mục một commit)
| # | Debt | State · viewport | Baseline | Hướng điều tra |
|---|---|---|---:|---|
| 1 | TD-P4-UI-08 | D-84-COM-RECORDED/PAID/CANCELLED (+ -MENU) | 6 assertion đỏ | Màu nền của `.ant-segmented-item-selected` khi Playwright clock dừng: thumb animation của Segmented chưa kết thúc. Sửa sao cho label đã chọn có nền `rgb(22,119,255)` ngay sau khi chọn, không phụ thuộc RAF/animation |
| 2 | TD-P4-UI-06 | D-84-COM-CANCELLED 390 | 5,2758% | Pager/controls và vị trí full-frame |
| 3 | TD-P4-UI-07 | D-84-COM-CANCELLED-MENU 390 | 4,7331% | Vị trí popup / scroll full-page |
| 4 | TD-P4-UI-04 | D-84-COM-EMPTY 390 | 7,7236% | Card và header ở empty state |
| 5 | TD-P4-UI-05 | D-84-AFF-EMPTY 390 | 6,5047% | Như mục 4 |
| 6 | TD-P4-UI-03 | D-84-POL 390 | 16,5967% | Khoảng cách label/control/rules (khoảng 10,6px so với 6px) |
| 7 | TD-P4-UI-01/02 | D-84-AFF 1440 / 390 | 24,1407% / 27,6858% | Căn layout với 62 đại lý thật; dự kiến vẫn > 3% do khác dữ liệu (DV-P4-404-1) |

### Business Rules (không được vi phạm khi chỉnh layout)
1. AF-R01: giữ đủ 62 đại lý tự động; trang mặc định 10 dòng. Không lọc hoặc ẩn dòng để giống 6 dòng prototype.
2. Card mobile của Đại lý giữ đủ trường và pagination; bộ chọn cỡ trang và CSV vẫn hiển thị (DV-P4-404-3).
3. Chính sách giữ điều khoản sửa được, preview tỷ lệ từ API, validation ở ô (UI-404-04) và caption V2Q-179.
4. Empty state giữ câu hướng dẫn (DV-P4-404-5); không tái tạo lỗi header tràn ngoài card của prototype.
5. Menu trạng thái: khoản terminal (đã chi trả / đã hủy) không có thao tác ghi; giữ marker trạng thái hiện tại, `aria-disabled`, điều hướng bàn phím; chỉ recorded → cancelled đi qua dialog lý do.
6. Không đổi API, DTO, backend, DB, seed hay MSW handler.

### Validation (đo lường)
- Parity native: `E2E_TARGET=server`, `PARITY_IDS` theo state, ngưỡng 3% và threshold 0.1 giữ nguyên, **không mask**, không đổi kịch bản parity để né vùng lệch. Chỉ được sửa kịch bản parity khi chứng minh được bug của harness, và phải ghi rõ trong report.
- Mỗi lượt đo lưu JSON raw vào `coding-packs/reports/evidence/v2-558/` kèm SHA nguồn.
- Kết quả cuối: đo toàn bộ 34 state D-84/D-85 trên native, rồi chạy MSW để đối chiếu.

### Error Handling / tình huống
- State không xuống được ≤ 3% mà không vi phạm Business Rules: dừng chỉnh, ghi số đo cuối và lý do vào `deviations.md` (sửa DV-P4-404-x hoặc thêm DV-P4-558-x) với trạng thái "chờ owner duyệt". Không ghi PASS.
- Một state đang pass bị đẩy > 3%: revert thay đổi gây ra hoặc sửa tiếp; không được đánh đổi state này lấy state khác.
- Native fail không liên quan TIP: ghi lại bằng chứng, không tự sửa lan, báo trong report.
- TD-08 chỉ pass khi thêm delay hoặc đổi assertion: đó là không đạt; ghi lại nguyên nhân gốc.

## ACCEPTANCE CRITERIA
1. **TD-08:** Given native affiliate demo, clock Playwright đang dừng (paused), When chọn từng bộ lọc Đã ghi nhận / Đã chi trả / Đã hủy (và mở menu dòng đầu), Then label đang chọn có `background-color: rgb(22, 119, 255)` ngay ở assertion đầu tiên. Đủ 6 check trong `admin-affiliate-commission-steps.ts` PASS mà không đổi assertion hay thêm `tick` hay sleep.
2. **Behavior riêng:** Given mỗi hạng mục 1–7, When chạy file `e2e/behavior/affiliate-ui-debt-*.spec.ts` tương ứng (tên test mang ID state, ví dụ `test('D-84-POL TD-P4-UI-03 …')`), Then test có bằng chứng FAIL trên source trước khi sửa (nếu thuộc tính đo được, ví dụ khoảng cách hình học, màu, vị trí popup trong viewport) và PASS sau khi sửa, trên **cả native lẫn MSW với cùng assertion**. Mỗi test kiểm cả ràng buộc nghiệp vụ liên quan: đủ trường card, empty message, điều khoản sửa được, terminal không ghi.
3. **Parity:** Given native sau khi sửa, When chạy parity 7 state mục tiêu, Then mỗi state ≤ 3%, HOẶC có deviation ghi số đo mới, lý do và trạng thái chờ duyệt.
4. **Không hồi quy:** 27 state D-84/D-85 đang pass vẫn ≤ 3% trên native; bộ Affiliate/RBAC behavior **native 52/52** và **MSW 52/52**, cộng các file `affiliate-ui-debt-*` mới (ghi số riêng, không gộp vào 52).
5. **Gates:** `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` exit 0; mọi file FE ≤ 400 dòng.
6. **Sổ sách:** `V2-P4-UI-TECH-DEBT.md` và `V2-P4-BUGS.md` (UI-404-03) cập nhật từng TD sang FIXED hoặc DEFERRED kèm số mới; `ui-parity/results.md|json` và `deviations.md` cập nhật; số cũ f394dc5 giữ làm lịch sử.
7. **Native HOLD:** sau khi đo, chạy `seed`, `seed:demo --affiliate`, `flush:dev-cache`, xác nhận API, socket, Portal và Admin health 200; không tắt dịch vụ, không reset dữ liệu ngoài quy trình demo.

## CONSTRAINTS
- DO NOT: hạ ngưỡng 3%, thêm mask, đổi threshold, skip/`fixme` assertion, rẽ assertion theo `onServer`, đổi nhãn FAIL thành PASS; xóa hoặc ẩn đại lý, trường, control, điều khoản, empty message; chép inline style của prototype; dùng `!important` tràn lan (chỉ dùng khi phải đè style AntD, kèm comment lý do); sửa `packages/ui` hoặc theme global (nếu bắt buộc thì DỪNG và báo, vì ảnh hưởng các màn khác).
- REUSE: `affiliateTestContext()` cho unit; helper `signInAffiliate`, fixture `affiliateDemo`; `COMMISSION_FILTERS`, `commissionRows` trong parity steps (import, không chép lại); token `var(--ant-color-primary)`.
- SKIP: D-85-*, Dashboard/bot P5, Portal Affiliate; nợ test cũ A-23/P-xx (AUDIT-FOLLOWUPS); env S4.
- Không tự merge vào `main`; tích hợp về `dev` sau khi gates và nghiệm thu đạt.

## ⚠️ BUILDER-CHECKLIST (agent PHẢI hoàn thành trước khi báo DONE)
- [ ] `pwd` + `git branch --show-current` = `feature/TIP-V2-558-p4-ui-debt` trước mỗi bước
- [ ] Implement đúng `Files touched`; file ngoài danh sách phải ghi lý do trong report
- [ ] Mỗi hạng mục: behavior test FAIL trước (log lưu evidence) → sửa → PASS native + MSW → parity state đó → commit `git commit -- <paths>`
- [ ] Bảng số đo native cuối cho 7 state mục tiêu + 27 state đối chứng (ghi số thật, không làm tròn thành PASS)
- [ ] 6 assertion TD-08 PASS mà không đổi assertion hay thêm chờ
- [ ] Native 52/52 + MSW 52/52 + số test mới riêng; paste lệnh và output thật
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` exit 0, paste output
- [ ] Rule kiến trúc: (1) FE chỉ là client, không đổi hợp đồng zod `packages/shared` hay API; (2) e2e hai chế độ cùng assertion (testing §5); (3) lệch có chủ đích phải vào `deviations.md`, chờ duyệt (ui-parity)
- [ ] Native HOLD: restore demo + health 200 sau khi đo
- [ ] `git status --short` sạch; báo `TIP-V2-558-DONE <sha>` kèm số đo; KHÔNG báo DONE nếu suite chưa chạy, ghi trung thực phần chưa chạy
