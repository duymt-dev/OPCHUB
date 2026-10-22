# TIP-V2-559: Đóng các lỗi P5 còn OPEN (paid cache, UAT-11 reset login, MSW diag, fee clock ledger)

## HEADER
- TIP-ID: TIP-V2-559
- Project: OPCHUB
- Module: Portal membership/auth + e2e behavior + sổ P5
- Priority: P1 (S2 trước, S3/S4 sau)
- Depends on: none (nền `dev` 8bff1f1c)
- Estimated: L
- **Files touched:**
  - `e2e/behavior/bank-fee-link.spec.ts` (chỉ đọc/chạy; sửa chỉ khi chứng minh lỗi test, ghi lý do)
  - `e2e/behavior/auth-flows.spec.ts` (UAT-11: chỉ thêm chẩn đoán/assertion, không nới)
  - `apps/portal/src/features/membership/hooks/*` (modify chỉ khi 546 native còn fail)
  - `apps/portal/src/features/auth/**` (modify nếu nguyên nhân UAT-11 nằm ở FE login/reset)
  - `apps/portal/src/mocks/**` (modify nếu nguyên nhân UAT-11/DIAG nằm ở MSW)
  - `apps/server/src/modules/auth/**` (modify CHỈ nếu chứng minh lỗi backend; dừng và báo trước khi sửa)
  - `e2e/playwright*.config.ts`, `e2e/server/*.ts` (modify chỉ cho P5-MSW-DIAG-01 nếu là harness)
  - `coding-packs/audit/V2-P5-BUGS.md`, `coding-packs/reports/TIP-V2-559-completion.md`, `coding-packs/reports/evidence/v2-559/**`
  - `coding-packs/02-TASK-GRAPH.md` (chỉ dòng V2-559)
- **Parallel-safe with:** TIP-V2-560 (bot UI, file khác), TIP-V2-561 (ops, file khác). Dùng chung `V2-P5-BUGS.md` và `02-TASK-GRAPH.md` với 560/561 → sequential merge: chỉ thêm dòng/mục của mình.

## CONTEXT
- Working dir `D:\CODING\OPCHUB\CODING`, nhánh `feature/TIP-V2-559-p5-open-bugs` từ `dev`.
- Native lane: API 4020, socket 4021, Portal 3280, Admin 3282, `opchub_dev`, Redis db 1 (`D:/opchub-local/tip558-native.env`). MSW: Portal 3380 / Admin 3381; Admin MSW build PHẢI có `NEXT_PUBLIC_PORTAL_URL` trỏ Portal MSW (bài học TIP-558).
- Đọc trước: `coding-packs/audit/V2-P5-BUGS.md` (mục OPEN), `reports/TIP-V2-546-progress.md`, `reports/TIP-V2-547-progress.md`, `tips/TIP-V2-547-paid-access-cache-recovery.md`, `reports/evidence/v2-526/526-msw-cross-app-browser.log`.

## APPLICABLE STANDARDS
- [testing/testing](../standards/testing/testing.md): cùng assertion hai lane, mã ID trong tên test
- [frontend/data-state](../standards/frontend/data-state.md): invalidation TanStack Query, không polling rộng
- [global/git-workflow](../standards/global/git-workflow.md)

## TASK
Đóng 4 mục OPEN của P5 bằng bằng chứng thật: (1) nghiệm thu native bản sửa P5-NATIVE-PAID-CACHE-01 (`2876a5cf`) qua kịch bản 546; (2) tìm nguyên nhân gốc và sửa UAT-11 login sau reset (P5-MSW-RESET-PENDING-01 + P5-E2E-FLAKE-01); (3) phân loại P5-MSW-DIAG-01; (4) xác nhận và cập nhật tiêu đề sổ cho P5-MSW-FEE-CLOCK-01.

## SPECIFICATIONS
### Business Rules
1. PAID-CACHE: chỉ query bị 402 `MEMBERSHIP_REQUIRED` được làm mới khi membership chuyển limited→active cùng user; không polling, không reload trong test.
2. UAT-11: mật khẩu cũ bị từ chối, mật khẩu mới đăng nhập vào `/dashboard`; link đã dùng hết hạn. Không đổi rate-limit/khoá TK để test xanh.
3. Nếu nguyên nhân là flake hạ tầng (timeout, thứ tự chạy), phải tái hiện được rồi sửa nguồn gốc; cấm `retries`, cấm tăng timeout chỉ để che.
4. DIAG-01: nếu là log vô hại của harness → ghi phân loại có bằng chứng; nếu là lỗi → sửa.

### Validation
- PAID-CACHE: chạy `bank-fee-link.spec.ts` native ≥ 3 lần liên tiếp + MSW 1 lần, cùng assertion. Restore demo sau mỗi lượt native.
- UAT-11: trước khi sửa, tái hiện bằng cohort đã từng fail (545d expanded 35 case, MSW) — ghi số pass/fail thật. Sau khi sửa: cohort đó pass ≥ 3 lần liên tiếp cả MSW và native, cộng UAT-11 standalone.
- Mọi lỗi phát sinh khác: ghi vào report, không tự sửa lan.

### Error Handling
- 546 native còn fail sau 547: giữ log đỏ, phân tích trace (không commit trace có cookie/token), sửa hook theo rule 1, thêm unit test tái hiện.
- Không tái hiện được UAT-11 sau 5 lượt cohort: ghi "không tái hiện, N lượt", giữ OPEN với bằng chứng, không đổi thành FIXED.

## ACCEPTANCE CRITERIA
1. Given native stack trên `dev` mới, When chạy UAT-09/AT-NR01 bank-fee-link 3 lần, Then cả 3 PASS gồm Community load không lỗi trước reload; P5-NATIVE-PAID-CACHE-01 → FIXED kèm SHA + log.
2. Given cohort UAT-11 đã từng fail, When chạy trên source đã sửa, Then pass 3/3 lượt mỗi lane; có test/unit tái hiện nguyên nhân gốc FAIL trước và PASS sau; RESET-PENDING-01 và E2E-FLAKE-01 → FIXED (hoặc gộp một mã, ghi rõ).
3. P5-MSW-DIAG-01 có phân loại kèm bằng chứng (FIXED hoặc CLOSED-not-a-defect).
4. P5-MSW-FEE-CLOCK-01 tiêu đề phản ánh trạng thái thật (545c), kèm lượt chạy xác nhận hiện tại.
5. `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck` exit 0; không hồi quy behavior auth/membership hai lane.

## CONSTRAINTS
- DO NOT: thêm `retries`, `test.fixme`, nới assertion, rẽ assertion theo `onServer`, tắt rate-limit, reset dữ liệu ngoài quy trình `seed`/`seed:demo`/`flush:dev-cache`.
- DO NOT: commit trace/HAR có cookie, token, mật khẩu.
- REUSE: helper 544/546 (đăng ký unique, FakeBank), `requestResetLink`, `submitReset`, `login`.
- SKIP: hồi quy toàn bộ P5 (TIP riêng), parity bot (TIP-V2-560), ops (TIP-V2-561).

## ⚠️ BUILDER-CHECKLIST
- [ ] `git branch --show-current` đúng nhánh trước mỗi bước; commit theo đường dẫn
- [ ] Log FAIL trước / PASS sau cho từng lỗi lưu trong `evidence/v2-559/`
- [ ] Số lượt chạy thật (không gộp, không làm tròn)
- [ ] Rule: (1) cùng assertion hai lane; (2) invalidation có mục tiêu, không polling; (3) backend chỉ sửa khi chứng minh, dừng báo trước
- [ ] Gates exit 0, paste output; native HOLD + restore demo + health 200
- [ ] `git status --short` sạch; báo DONE kèm SHA
