# TIP-V4-615: Parity v4 — đo lại toàn bộ trên prototype v4 + tổng hợp

## HEADER
- TIP-ID: TIP-V4-615
- Project: OPCHUB
- Module: e2e parity · Portal / Admin UI (chỉ sửa lệch thật của màn cũ) · báo cáo ui-parity
- Priority: P1 (cổng dừng goal V4)
- Depends on: mọi TIP có UI (V4-601 → V4-614); xếp chồng V4-614 (PR #30 chưa merge)
- Estimated: L
- REQ / D: REQ-517 · D-79 · §27.9
- **Files touched:**
  - `e2e/parity/**` (modify): kịch bản màn cũ theo luồng prototype v4 (menu §27.3, Cài đặt ở menu người dùng…); màn gỡ → `unreachable` kèm lý do.
  - `coding-packs/reports/ui-parity/{results.md,results.json,diffs/**,deviations.md,questions.md,screens.md}` (modify).
  - `apps/portal/src/**`, `apps/admin/src/**` (modify, chỉ khi lệch thật của màn cũ sửa được trong phạm vi đã có D-xx): file cụ thể ghi ở completion.
  - `coding-packs/reports/TIP-V4-615-completion.md` (create).
- **Parallel-safe with:** sequential — dùng chung `results.*` với mọi TIP UI.

## CONTEXT
- D-79: số parity cũ (prototype v2/v3) vô hiệu. Mỗi TIP V4 đã đo màn của mình. V4-615 đo lại **toàn bộ** để `results.md` phản ánh prototype v4 tại một SHA.
- Trước TIP: 485 ảnh, 344 đạt; 141 ảnh / 90 màn > 3%, phần lớn đo ở SHA trước V4 (`c9fcf39`, `0b27e625`…).
- Màn gỡ theo §24 / D-73 / D-78 (`network`, `netreport`, `netplan`, `netkpi`, `marketing`, Portal `network`) = `unreachable`.

## APPLICABLE STANDARDS
- [frontend/ui-parity](../standards/frontend/ui-parity.md): ngưỡng ≤ 3%, pixelmatch 0.1, 1440 + 390.
- [testing/testing](../standards/testing/testing.md).

## TASK
1. Build Portal + Admin (MSW) tại HEAD và chạy `--project=parity` toàn bộ một lần.
2. Phân loại từng màn > 3%:
   - (a) kịch bản cũ không đi được trên prototype v4 → sửa kịch bản theo luồng v4;
   - (b) màn đã gỡ khỏi v4 → `unreachable`;
   - (c) lệch thật do UI app cũ chưa theo v4, sửa được trong phạm vi D-xx đã có → sửa UI + test hành vi;
   - (d) lệch do quyết định đã chốt (D-xx / Q đã chọn) hoặc ngoài phạm vi → DV-V4-615-n chờ owner duyệt.
3. Đo lại các màn đã sửa. Tổng hợp `results.md` (đạt / DV / unreachable), viết completion.

## ACCEPTANCE CRITERIA
- Given HEAD của TIP, When chạy parity toàn bộ, Then mọi dòng `results.md` có SHA ≥ HEAD của V4-614 và mỗi màn hoặc ≤ 3% ở cả 1440 + 390, hoặc có DV-xx trong `deviations.md`, hoặc `unreachable` có lý do.
- Given màn sửa UI ở (c), Then có test hành vi trong `e2e/behavior/` và e2e của domain đó xanh.

## CONSTRAINTS
- DO NOT: nới ngưỡng, mask thêm vùng lệch, đổi FAIL → PASS, sửa ảnh baseline / prototype; retries / fixme / tăng timeout.
- DO NOT: đổi nghiệp vụ để giống ảnh (vd. bỏ khối LIVE — Q-V4-611-1) khi chưa có D-xx.
- REUSE: `e2e/parity/steps.ts` (`nav`, `waitText`, `choose`), kịch bản sẵn có.

## ⚠️ BUILDER-CHECKLIST
- [ ] Đo toàn bộ một lần tại một SHA; ghi số thật đạt / DV / unreachable.
- [ ] Mỗi màn > 3% có phân loại (a/b/c/d) trong completion.
- [ ] Sửa UI (c) kèm test hành vi; lint + typecheck + unit + depcheck + build xanh.
- [ ] Commit theo đường dẫn, `git status --short` sạch, PR xếp chồng #30, báo DONE kèm SHA.
