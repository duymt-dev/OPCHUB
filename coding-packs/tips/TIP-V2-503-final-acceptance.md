# TIP-V2-503: Nghiệm thu tổng V2 — UAT-01…31, mọi AT, parity ver2, hồi quy audit W1, đóng TEST-GAPS/BUGS

## HEADER
- TIP-ID: TIP-V2-503 · Project: OPCHUB · Module: e2e + coding-packs (không code nghiệp vụ) · Priority: P0 · Depends on: **mọi TIP pha 1–5** (TIP-V2-101…115, 201…204, 301…307, 401…404, 501, 502) · Estimated: XL
- **Files touched:**
  - `e2e/behavior/uat-acceptance.spec.ts` (create: UAT-01…31 còn thiếu test riêng, tên bắt đầu bằng mã UAT), `e2e/behavior/lk-acceptance.spec.ts` (create: AT-LK01…03 + đối chiếu LK-01…12)
  - `e2e/behavior/*.spec.ts` (modify: chỉ đổi tên test gắn mã UAT/AT/REQ còn thiếu, không đổi assertion)
  - `e2e/parity/registry.ts`, `e2e/parity/scenarios/*.ts` (modify chỉ khi baseline ver2 lệch kịch bản do 307 bỏ sót — ghi lý do)
  - `e2e/audit/*.audit.ts`, `apps/server/test/audit/*.audit.ts` (modify: chỉ cập nhật nhãn/đường dẫn đổi theo V2, ví dụ đăng nhập `/admin/auth/login`, khoá quyền 25 ở `c5-permissions`; **không** nới điều kiện phát hiện)
  - `coding-packs/audit/W1/TEST-GAPS.md` (modify: mục 2 + mục 6.1–6.3 cập nhật mức, cột test), `coding-packs/audit/W1/BUGS.md` (modify: thêm dòng "Trạng thái: Đã đóng ở `<sha>` — test `<file>::<tên>`" cho từng BUG), `coding-packs/audit/W1/TECH-DEBT.md` (modify: cột trạng thái TD)
  - `coding-packs/reports/ui-parity/{results.md,results.json,screens.md,deviations.md}`, `coding-packs/reports/ui-parity/server/*` (sinh lại bằng lệnh parity)
  - `coding-packs/reports/V2-acceptance/uat-at-results.md` (create: bảng UAT/AT × msw/server × kết quả + ảnh), `coding-packs/reports/V2-acceptance/lk-matrix.md` (create: LK-01…12 → REQ-401…412)
  - `coding-packs/reports/V2-completion.md` (create), `coding-packs/reports/V2-P5-completion.md` (create)
  - `coding-packs/reports/V2-questions.md` (modify: chỉ thêm dòng câu hỏi mới phát sinh khi nghiệm thu)
- **Parallel-safe with:** sequential — chạy cuối cùng, sau khi mọi nhánh V2-P1…P5 đã merge `main`
- **Phase / nhánh:** V2-P5, `feature/V2-P5-bot-acceptance`

## CONTEXT
- Đọc: §16 UAT-01…31 + tiêu chí "100% UAT đạt"; §20.8 AT-AF01…06; §21.6 AT-RB01…06; §22.6 AT-EV01/02, AT-SEC01, AT-GR01, AT-IV01, AT-NR01; §23.3 LK-01…12 + §23.7 AT-LK01…05; D-63 (mỗi REQ V2 có test ghi mã; e2e chạy msw + server, cấm nhánh `onServer` làm yếu assertion); D-49 (SRS-3.6 ưu tiên).
- Bộ có sẵn: `e2e/behavior/*.spec.ts` (msw: `pnpm --filter @opchub/e2e e2e`, server: `… e2e:server`), `e2e/parity` (`pnpm parity`, `PARITY_MODE=proto-only` chụp baseline), audit W1 `e2e/audit/playwright.audit.config.ts` (UAT trên server thật, ghi `coding-packs/audit/W1/work/*.jsonl`) và `apps/server/test/audit/run-all.audit.ts` (6 kiểm cơ học C1–C6).
- Trạng thái gốc: `coding-packs/audit/W1/TEST-GAPS.md` mục 6 = 117 dòng TRỐNG; `BUGS.md` 44 lỗi; `TECH-DEBT.md`; TEST-GAPS mục 4 liệt kê nhánh `onServer` làm yếu kiểm tra.

## APPLICABLE STANDARDS
[testing](../standards/testing/testing.md) · [ui-parity](../standards/frontend/ui-parity.md) · [git-workflow](../standards/global/git-workflow.md)

## TASK
Chạy toàn bộ nghiệm thu V2 trên server dev (và msw cho e2e), bổ sung test e2e còn thiếu cho UAT/AT/LK, chụp lại baseline prototype ver2 và so parity toàn registry (≤ 3%), chạy lại bộ audit W1 làm hồi quy, cập nhật TEST-GAPS/BUGS/TECH-DEBT theo kết quả thật, rồi viết báo cáo V2-completion. Không sửa code nghiệp vụ: lỗi phát hiện → ghi báo cáo + đề xuất TIP refine.

## SPECIFICATIONS
### Quy trình (theo thứ tự)
1. **Chuẩn bị**: `main` mới nhất (đã merge P1…P5); `pnpm install`, `pnpm build`; DB dev reset `seed` + `seed:demo`; worker chạy (bot, nhắc phí, sự kiện); `FEATURE_BOTS=true`, `FEATURE_SERVICES=true`; LLM/bank/mail fake. Ghi SHA + lệnh vào báo cáo.
2. **Cổng chung**: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck` — xanh mới đi tiếp.
3. **E2E hành vi**: chạy msw **và** server. Mỗi UAT-01…31, AT-AF01…06, AT-RB01…06, AT-SEC01, AT-EV01/02, AT-GR01, AT-IV01, AT-NR01, AT-LK01…05 phải có ≥ 1 test có mã trong tên, chạy ở cả hai chế độ. Thiếu → viết trong `uat-acceptance.spec.ts` / `lk-acceptance.spec.ts`. UAT-14/15 (bot) trên server dùng worker thật + fake timer server (`BOT_*` qua env test) — không `onServer` làm yếu assertion. UAT-31: viewport 390px, kiểm `scrollWidth ≤ clientWidth`, bảng Admin thành thẻ.
4. **Đối chiếu LK-01…12** (REQ-401…412): mỗi dòng LK: thao tác phía User → thấy ở màn Admin đúng menu §23.2 → trạng thái dữ liệu đúng cột "Trạng thái / dữ liệu" (kiểm API/DB). LK-10 bỏ cụm "tạm dừng nếu hoàn phí" (D-54). Kết quả vào `lk-matrix.md`.
5. **Parity**: `PARITY_MODE=proto-only pnpm parity` chụp lại baseline prototype ver2 (`docs/spec/index.html` hiện hành), rồi `pnpm parity` msw + server toàn registry; mọi màn ≤ 3% hoặc có DV đã duyệt trong `deviations.md`. Màn mới V2 (Affiliate, TK quản trị, Vai trò, popup V4, Sự kiện Meet) phải có trong registry (307) — thiếu thì ghi lỗi, không tự thêm kịch bản ngoài phạm vi.
6. **Hồi quy audit W1**: `packages/db/node_modules/.bin/tsx apps/server/test/audit/run-all.audit.ts` (C1–C6) và `playwright test -c e2e/audit/playwright.audit.config.ts` trên server thật. Mục tiêu: không còn finding thuộc BUG đã đóng; finding mới → ghi BUGS.md mục mới (BUG-045…), mức theo thang S1–S4.
7. **Cập nhật tài liệu**:
   - `TEST-GAPS.md` mục 6: từng REQ-2xx/3xx/4xx, D-49…63, AT → mức ĐỦ / MỘT PHẦN / TRỐNG kèm `file::tên test`; cập nhật bảng thống kê 6 và mục 1; mục 4 (`onServer`) ghi đã gỡ hay còn.
   - `BUGS.md`: mỗi BUG-001…044 thêm "Trạng thái" (Đã đóng `<sha>` + test bắt / Còn mở + lý do / Không còn áp dụng theo D-xx); cập nhật bảng đếm còn mở.
   - `TECH-DEBT.md`: cột trạng thái TD-001….
8. **Báo cáo** `V2-completion.md`: SHA, môi trường, số test (unit/int/e2e msw/e2e server/parity — số thật từ output, không bịa), bảng UAT/AT đạt/trượt, LK, parity tóm tắt, audit hồi quy, BUG còn mở theo mức, câu hỏi mới, đề xuất TIP refine. Cổng go-live: 100% UAT-01…31 + mọi AT đạt trên server dev; TEST-GAPS mục 6 không còn TRỐNG.

### Business Rules kiểm thêm khi nghiệm thu (dễ sót)
- D-50: không còn nút/luồng duyệt bot; D-51: tắt `FEATURE_BOTS` dừng bot (công tắc khẩn cấp).
- D-54: không có chức năng hoàn phí ở bất kỳ màn nào.
- D-62 / RB-R03: TK quản trị không đăng nhập Portal, TK thành viên không vào Admin, không nút chuyển khu vực.
- NA-28: đổi ma trận quyền áp ngay cho phiên đang mở.

## ACCEPTANCE CRITERIA
- Given `main` sau P1…P5, When chạy e2e msw + server, Then 100% test UAT-01…31 và mọi AT §20.8/§21.6/§22.6/§23.7 xanh ở cả hai chế độ (D-63, §16).
- Given parity toàn registry, Then mọi màn ≤ 3% hoặc có DV đã duyệt (ui-parity).
- Given audit W1 chạy lại, Then không finding nào thuộc BUG đánh "Đã đóng" (hồi quy).
- Given TEST-GAPS mục 6, Then 0 dòng TRỐNG; mỗi dòng ĐỦ có `file::tên test` chứa mã REQ/AT (D-63).
- Given LK-01…12, Then 12/12 khớp hoặc có BUG mở kèm TIP refine (REQ-401…412).
- Given `V2-completion.md`, Then có SHA commit + số test thật; không số bịa.

## TESTS BẮT BUỘC
- `e2e/behavior/uat-acceptance.spec.ts`: một `test('UAT-xx …')` cho mỗi UAT chưa có test riêng (danh sách lấy từ TEST-GAPS mục 2.13 sau P1…P5).
- `e2e/behavior/lk-acceptance.spec.ts`: `AT-LK01 popup phí không tắt được, không vào menu khác`, `AT-LK02 Kế toán xác nhận đã thu → popup tự đóng, hạn 12 tháng` (2 context: Admin Kế toán + Portal), `AT-LK03 báo cáo tin → tab Kiểm duyệt tin nhắn`, `REQ-401…412 LK-xx` cho dòng chưa có test ở TIP khác.
- Chạy (không viết mới): `apps/server/test/audit/run-all.audit.ts`, `e2e/audit/*.audit.ts`, `pnpm parity`.

## CONSTRAINTS
- DO NOT: sửa code nghiệp vụ `apps/**/src`, `packages/**/src` (lỗi → báo cáo + TIP refine); nới assertion hay thêm nhánh `onServer` làm yếu kiểm tra; xoá test đỏ; sửa ảnh baseline bằng tay; bịa số.
- DO NOT sửa `GOAL`/handoff của PM; không in secret `D:\opchub-local\*.env`.
- REUSE: `e2e/server/test.ts` (reset seed mỗi test), `e2e/server/api.ts`, `e2e/audit/lib.ts`.
- SKIP: k6 tải (`infra/k6`) — không thuộc cổng V2 (ghi trong báo cáo nếu chạy).

## ⚠️ BUILDER-CHECKLIST
- [ ] Luật 13, 14; D-63: tên test chứa mã; e2e chạy msw **và** server.
- [ ] Không file test > trần; spec dài tách theo nhóm UAT.
- [ ] `pnpm lint && pnpm typecheck && pnpm test && pnpm test:int && pnpm depcheck` + e2e msw + e2e server + parity + audit W1.
- [ ] `git commit -- <paths>` (từng bước: test → tài liệu audit → báo cáo), `git status --short` sạch, `TIP-V2-503-DONE <sha> — <N> test passed`, kèm `coding-packs/reports/V2-completion.md`.
