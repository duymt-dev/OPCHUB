# V46-801 — native/MSW regression contract reconciliation (PARTIAL)

Base: `cd203f5a`; production backend/UI still unchanged. This slice fixes one
old MSW fixture error and two contradictory historical E2E expectations; no
bank configuration or later-TIP financial feature is implemented.

## Exact contracts retained

- For `CHUYEN KHOAN SAI NOI DUNG`, native `parsePaymentContent` rejects the
  missing OPCHUB prefix before member-code lookup. The MSW ptx-901 reason now
  matches exactly `Nội dung không bắt đầu bằng OPCHUB`. Amount/content/hints
  are unchanged. ptx-904 (`OPCHUB GV000001`) still reports the distinct missing
  member-code error. Native validation was not changed.
- UAT-10 now requires the exact native reason in both modes; all existing
  reason-required manual-match confirmation, activation, amount, dialog and
  transaction-removal assertions remain. No either-message regex or mode branch.
- The old Portal shell test now requires exactly one selected Vietnamese flag
  with the exact URL and exactly one visible chevron. This follows accepted dev
  commit `6d500837` and its unchanged explicit unit test, rather than silently
  reverting the selected-flag feature to satisfy the stale V4-615 assertion.
  No production flag rendering or prototype file changed. The prototype's old
  globe remains a visual-source discrepancy, not a newly claimed parity PASS.
- The complete native shell file also exposed an invalid welcome-test setup:
  it expected the own-password reminder without supplying a registration
  password. Native `RegisterService.activate` correctly sets `ownPassword` only
  when a hash exists (D-47/Q-B11-1). The test now explicitly sets its own demo
  password before OTP, retaining the reminder assertion and additionally
  asserting that the actual password value is absent from the dialog. No native
  registration or mail rendering behavior was changed to satisfy this test.
- Two new shared unit cases check the distinct malformed-content fixtures and
  successful manual matching removes only its row; replay cannot change the
  member's fee again. These are mock-domain checks, not native DB proof.

## Evidence

- Related shared tests: **4/4**,2 files,783ms, including the existing director
  summary tests. Log `e2e/.parity-out/v46-801-parser-related-unit.log`.
- Root lint/typecheck **8/8** tasks each. Root **`pnpm test --force`** reruns all
  six unit tasks,0 cache: **2085 passed + 2 existing S3 skips** (shared668,
  server248,Admin592,Portal418,UI56,integrations103),4m47.884s. This explicitly
  avoids Q-V46-801-9's cross-package cache gap after changing a shared mock.
- Current MSW Portal/Admin forced build: **2/2**,0 cached,3m15.958s,
  `NEXT_DIST_DIR=.next-v46-msw-build`,mocking=msw,Portal URL localhost:3000,
  `pnpm build --concurrency=1 --filter=@opchub/portal --filter=@opchub/admin --force`.
  Native `.next-server` and held server binaries were not overwritten.
- Both complete affected browser files (`admin-fees`, `portal-shell`) MSW:
  initial **15/15**,1.6m; final own-password-precondition rerun **15/15**,37.8s.
  Logs `v46-801-parser-msw.log` / `v46-801-parser-msw-final.log`. Includes the full UAT-10 flow
  and existing shell behavior beyond the changed icon assertion.
- Native initial same-file run **31200 exit1**,14 passed/1 failed,7.2m:
  UAT-10 and selected-flag case passed; welcome own-password setup failed as
  described above. Retain this result, not a fifteen-pass claim. After fixing
  the setup, both complete files rerun in native **67811** and MSW **37860**;
  final result pending. Ordinary per-case demo resets remain; no simultaneous
  native mutation suite. No retries or deadline increases.
- After the final test-only setup edit, root lint/typecheck/unit/depcheck chain
  exited0 again; unit6/6 reused the immediately preceding forced all-package
  proof (production/test unit files unchanged since that run),2085+2 existing
  skips. Depcheck2279 frontend/shared/e2e +1008 server modules, no violations.
  Logs `v46-801-parser-precommit.log` and `v46-801-parser-final-precommit.log`.

Production server imports no `@opchub/shared/mock*`; only mock fixture/error and
test files changed. The native test targets the held business implementation,
not a claim that its binary was rebuilt to later SQL. Prior full integration
188 unaffected files plus DB128 and the corrected12-case related rerun remain
applicable to unchanged backend code. No new all-green unfiltered integration
command is claimed. Existing P6/P9/P17/billing parity evidence is unchanged by
this invisible transaction-fixture edit; existing visual FAILs remain FAIL.

Before closing #801, complete full MSW regression on rebuilt output, native
terminal checks/demo restoration, remaining Portal/P16/related Affiliate parity
and final completion evidence. No #802 started and no TIP-DONE claim.
