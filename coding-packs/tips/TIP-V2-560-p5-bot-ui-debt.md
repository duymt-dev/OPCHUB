# TIP-V2-560: Trả nợ UI pixel P5 Bot Admin (D-36/37/39/41) + Dashboard P-01 dữ liệu khớp

## HEADER
- TIP-ID: TIP-V2-560
- Project: OPCHUB
- Module: Admin · Bot (`apps/admin/src/features/bots`) + parity/e2e bot
- Priority: P2
- Depends on: none (nền `dev` 8bff1f1c)
- Estimated: L
- **Files touched:**
  - `apps/admin/src/features/bots/components/*.module.css` (modify)
  - `apps/admin/src/features/bots/components/{persona-list,script-list,thread-list,activity-log,bot-tabs,emergency-bar,bits}.tsx` (modify chỉ khi markup bắt buộc đổi; ghi lý do)
  - `apps/admin/src/features/bots/components/*.spec.tsx` (create/modify unit nếu markup đổi)
  - `e2e/behavior/bot-ui-debt-*.spec.ts` (create: mỗi chỗ sửa một test mang ID màn)
  - `e2e/parity/scenarios/admin-groups.ts` (modify CHỈ để thêm state đo riêng có dữ liệu khớp, mục P-01; không sửa state cũ)
  - `coding-packs/reports/ui-parity/{results.md,results.json,server/**,deviations.md}`, `coding-packs/reports/TIP-V2-560-completion.md`, `coding-packs/reports/evidence/v2-560/**`
  - `coding-packs/02-TASK-GRAPH.md` (chỉ dòng V2-560)
- **Parallel-safe with:** TIP-V2-559, TIP-V2-561 (file nguồn khác). Chung `02-TASK-GRAPH.md` → chỉ thêm dòng của mình.

## CONTEXT
- Nhánh `feature/TIP-V2-560-p5-bot-ui-debt` từ `dev`.
- Baseline raw TIP557 (source 3f9967b2): MSW 7/14, native 4/14. Chi tiết: `reports/V2-P5-release-handoff.md`, `reports/TIP-V2-550-parity-review.md`.
- Owner đã duyệt DV-V2-P5-1 (lệch BẮT BUỘC theo spec: không quy trình duyệt, tiến độ lượt, lịch sử hội thoại sinh tự động, nút dừng khẩn/ẩn) và DV-V2-P5-2 (P-01 native khác dữ liệu). Đó là duyệt phần lệch do spec, KHÔNG phải miễn mọi chênh lệch.
- Bài học TIP-558: AntD CSS-in-JS nạp sau CSS Modules khi hard navigation → rule module cùng độ ưu tiên bị đè. Kiểm bằng probe so CSS khai báo vs computed trước khi chỉnh từng px.

## APPLICABLE STANDARDS
- [frontend/ui-parity](../standards/frontend/ui-parity.md), [frontend/antd-ui](../standards/frontend/antd-ui.md), [frontend/nextjs-structure](../standards/frontend/nextjs-structure.md), [testing/testing](../standards/testing/testing.md)

## TASK
Giảm chênh pixel của D-36 390, D-37, D-39, D-41 (1440/390) phần KHÔNG thuộc lệch spec đã duyệt, bằng CSS Modules/markup trong feature bots. Thêm state P-01 đo riêng với dữ liệu khớp prototype cho thẻ bot Dashboard để chứng minh layout thẻ. State nào còn > 3% vì lệch spec thì cập nhật số đo mới vào DV-V2-P5-1, không che giấu.

## SPECIFICATIONS
### Business Rules
1. Giữ nguyên các phần tử spec bắt buộc: thanh dừng khẩn/ẩn (D-50/D-51), tiến độ lượt, hội thoại tự sinh, không có nút Duyệt/đăng.
2. Không đổi API, DTO, seed, MSW handler, worker; không thêm dữ liệu giả vào Dashboard native.
3. State P-01 dữ liệu khớp chỉ là state đo bổ sung (id mới, ví dụ `P-01-BOTCARD`), chụp vùng thẻ bot; state P-01 cũ giữ nguyên số đo.

### Validation
- Parity native + MSW, 3%/0.1, không mask. Lưu JSON raw mỗi lượt trong `evidence/v2-560/`.
- Phân rã diff theo dải (như TIP-558) để tách phần lệch spec với phần layout sửa được; ghi bảng phân rã vào report.

### Error Handling
- Không xuống 3% mà không vi phạm rule 1–2 → ghi số cuối + phân rã vào DV-V2-P5-1, chờ owner.
- State đang pass bị đẩy > 3% → revert.

## ACCEPTANCE CRITERIA
1. Mỗi chỗ sửa có test `bot-ui-debt-*` mang ID màn, FAIL trên source cũ (native) và PASS sau, cùng assertion native + MSW; test kiểm luôn phần tử spec bắt buộc vẫn hiện.
2. Parity D-36..D-41 native + MSW: mỗi state ≤ 3% hoặc có số mới + phân rã trong deviation.
3. P-01-BOTCARD (dữ liệu khớp) đo được trên native; ≤ 3% hoặc deviation có số.
4. D-38, D-40 và các state Admin khác đang pass vẫn ≤ 3%; behavior bot hiện có pass hai lane.
5. Gates exit 0; FE file ≤ 400 dòng.

## CONSTRAINTS
- DO NOT: xoá/ẩn control spec, hạ ngưỡng, mask, đổi FAIL→PASS, sửa `packages/ui` theme global (nếu bắt buộc thì dừng và báo).
- REUSE: probe CSS declared-vs-computed và cách tăng specificity của TIP-558.
- SKIP: Affiliate, lỗi chức năng bot.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đúng nhánh; commit theo đường dẫn, mỗi màn một commit
- [ ] Log FAIL trước / PASS sau từng test; bảng số đo native + MSW từng state
- [ ] Rule: (1) control spec D-50/D-51 vẫn hiện; (2) không dữ liệu giả; (3) lệch chủ đích vào deviations
- [ ] Gates exit 0; native HOLD + restore demo; `git status` sạch; DONE kèm SHA
