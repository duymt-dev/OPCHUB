# TIP-V4-624: Đo lại toàn bộ + nghiệm thu UI v4 (D-89)

## HEADER
- TIP-ID: TIP-V4-624
- Project: OPCHUB
- Module: toàn repo (đo), `apps/portal/features/profile` (sửa lỗi tìm thấy khi đo), e2e, báo cáo
- Priority: P1 (goal V4-UI, cuối chuỗi)
- Depends on: TIP-V4-623 (nhánh `feature/TIP-V4-623-affiliate-rest` chưa merge → xếp chồng)
- Estimated: M
- REQ / D: D-89, SEC-R01
- **Files touched:**
  - `apps/portal/src/features/profile/hooks/use-security.ts` (modify): refresh phiên sau đổi mật khẩu.
  - `e2e/behavior/projects.spec.ts` (modify): kiểm luật "Nổi bật" 2 thẻ đầu.
  - `coding-packs/reports/V4-UI-completion.md` (create), `coding-packs/reports/ui-parity/*` (cập nhật).
- **Parallel-safe with:** sequential — cuối chuỗi V4-617 → 624.

## CONTEXT
- Đo: parity toàn bộ, `test:int` toàn bộ (server + db), e2e MSW toàn bộ, e2e:server toàn bộ.
- Áp migration V4 vào `opchub_dev`, seed lại demo; không tắt tiến trình HOLD.

## APPLICABLE STANDARDS
- [frontend/ui-parity](../standards/frontend/ui-parity.md), [testing/testing](../standards/testing/testing.md), [global/git-workflow](../standards/global/git-workflow.md)

## TASK
Chạy toàn bộ bộ kiểm, sửa lỗi thật tìm thấy, ghi số thật vào `V4-UI-completion.md`.

## ACCEPTANCE CRITERIA
- Given server thật When đổi mật khẩu rồi "Đăng xuất" thiết bị khác Then toast "Đã đăng xuất khỏi N thiết bị khác" (e2e:server `profile`).
- Số trong `V4-UI-completion.md` là số của lần chạy thật.

## CONSTRAINTS
- DO NOT: retries / fixme / nới assertion hay timeout, mask thêm, đổi FAIL → PASS, sửa `.env`, tắt tiến trình HOLD.

## ⚠️ BUILDER-CHECKLIST
- [x] Chạy đủ 4 bộ, ghi số thật
- [x] Lỗi thật đã sửa + có test
