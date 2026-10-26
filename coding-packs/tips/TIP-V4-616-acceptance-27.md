# TIP-V4-616: Nghiệm thu §27 (D-86) — UP-01→14, AD-01→12, F01→F09 trên server dev

## HEADER
- TIP-ID: TIP-V4-616
- Project: OPCHUB
- Module: e2e (behavior, chế độ server thật) · báo cáo nghiệm thu
- Priority: P1 (cổng dừng goal V4)
- Depends on: V4-601 → V4-615 (mọi TIP); xếp chồng V4-615 (PR chưa merge)
- Estimated: M
- REQ / D: D-86 · §27.6.1 · §27.6.2 · §27.7 · §27.9
- **Files touched:**
  - `e2e/behavior/**` (modify, chỉ khi test chưa chạy được trên server thật vì kịch bản/fixture — không nới assertion): file cụ thể ghi ở completion.
  - `e2e/server/**` (modify, chỉ khi cần helper API thật cho luồng §27): file cụ thể ghi ở completion.
  - `coding-packs/reports/V4-acceptance.md` (create): ma trận UP / AD / F → spec + kết quả trên server dev.
  - `coding-packs/reports/TIP-V4-616-completion.md` (create), `coding-packs/reports/V4-P5-completion.md` (create), `coding-packs/reports/V4-progress.md` (modify).
- **Parallel-safe with:** sequential — cuối chuỗi V4.

## CONTEXT
- D-86: test nghiệm thu v4 viết theo §27 + D-67…D-88; §26 chỉ tham khảo.
- Server dev = API NestJS (api + socket + worker) trên `opchub_dev`, Redis db 1, storage local, fake bank (D-81), stub DLPL (D-65). Portal / Admin build `NEXT_PUBLIC_API_MOCKING=off` vào `.next-server` (`e2e/server/README.md`).
- `globalSetup` của `playwright.server.config.ts` reset `seed:demo` + xoá cache; fixture `demoReset` reset trước mỗi test.

## APPLICABLE STANDARDS
- [testing/testing](../standards/testing/testing.md) — test hành vi ở `e2e/behavior/`, không retries / fixme.
- [global/git-workflow](../standards/global/git-workflow.md).

## TASK
1. Lập ma trận §27: mỗi mã UP-01→14, AD-01→12, F01→F09 ánh xạ tới test hành vi có sẵn (`e2e/behavior/*.spec.ts`) và test integration (khi spec bỏ qua chế độ server, ví dụ kiểm duyệt).
2. Dựng server dev, build Portal / Admin chế độ server, chạy `pnpm e2e:server --project behavior` toàn bộ một lần.
3. Lỗi do kịch bản chưa theo server thật (fixture, chờ dữ liệu) → sửa test đúng luồng; lỗi do code → sửa code + test. Chạy lại phần lỗi, ghi cả hai lần.
4. Ghi `V4-acceptance.md` (số thật), completion; chạy toàn bộ test:int + toàn bộ e2e MSW cuối pha → `V4-P5-completion.md`. Seed lại demo (native HOLD).

## ACCEPTANCE CRITERIA
- Given server dev chạy tại HEAD của TIP, When chạy `e2e:server --project behavior`, Then mọi test ánh xạ tới UP / AD / F đều pass (skip chỉ khi spec ghi rõ bằng chứng thay thế ở test:int).
- Given ma trận, Then mỗi mã §27 có ít nhất một test pass trên server dev hoặc test:int trên Postgres thật.

## CONSTRAINTS
- DO NOT: retries, fixme, nới assertion / timeout; chạy trên VPS; ngân hàng thật; commit secret / cookie / trace.
- DO NOT: kill tiến trình không do phiên này tạo (Portal 3000, sidecar 3001).
- REUSE: `e2e/server/*` (onServer, newMember, mailbox), `playwright.server.config.ts`.

## ⚠️ BUILDER-CHECKLIST
- [ ] Ma trận đủ 14 + 12 + 9 mã, mỗi mã có test pass (ghi tên spec).
- [ ] Số thật của `e2e:server` (passed / failed / skipped), không bịa.
- [ ] Toàn bộ test:int + e2e MSW cuối pha P5, ghi số thật.
- [ ] Seed lại demo sau khi đo; commit theo đường dẫn, `git status --short` sạch, PR xếp chồng, báo DONE kèm SHA.
