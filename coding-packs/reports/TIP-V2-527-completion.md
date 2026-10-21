# TIP-V2-527 — Bounded real-provider native evidence (PARTIAL)

## Scope and implementation

Owner explicitly requested actual LLM E2E and supplied a private provider.
Separate opt-in `playwright.llm.config.ts` discovers exactly two native tests;
ordinary Fake MSW/native behavior and parity projects do not discover them.
Global setup checks existing native health without enabling automatic admission.
Per-test manual seed and actual Admin UI configure only two eligible all-day
personas in c1. No synthetic completion, response fulfillment or fake fallback.
The opening test checks current-line generation, null script, three planned
turns, remaining blank lines and Stop. The reply test uses an actual member
message, real delayed admission, the open socket chat and persisted F5 history;
it checks the original quote, null senderId and absence of isSimulated leakage.
This is NOT a full real-provider three/four-turn conversation test.

## Actual results, including the retained failure

- Original invocation: **1 failed / 1 not run**. The single upstream opening
  attempt returned HTTP200 / finish=stop / 424 characters / 262 output tokens.
  Admin execution/cursor/remaining-lines/Stop checks passed. Dashboard's exact
  body locator then matched two surfaces (live preview and article), causing a
  strict-mode failure. The body digest extracted from the original failure
  matches the proxy's upstream digest. This is publication evidence, NOT a
  passing opening E2E. Corrected locator scopes to the intended unique article;
  corrected opening has **not** been rerun against the provider.
- Announced remaining-budget invocation selected only UAT-14: **1/1 passed**,
  1.5min (test1.4min). Actual LocalLlm reply appeared in the already-open member
  chat, survived F5, quoted the real question and passed public-payload checks.
  Second upstream attempt HTTP200 / finish=stop / 317 characters / 190 tokens.
  JSON attachments were submitted by the tests, but the default console reporter
  did not materialize attachment files; no reply digest cross-correlation claim.
- **Cumulative two upstream attempts**, zero rejected excess calls. Private
  loopback proxy persisted the first attempt before continuing and enforced the
  same total cap; budget was not reset. No further provider rerun is authorized
  by this bounded TIP. Default dev/test remains FakeLlm.
- Both terminal invocations restored Fake worker + required seed + normal demo
  seed + scoped Redis1 flush. Final state: testPassed=true refers ONLY to the
  selected reply invocation, restored=true, attempts=2. API/socket/Portal/Admin
  processes were preserved. Provider credentials/configuration remain outside
  Git under D:/opchub-local/v2; no prompt/full completion stored in receipts.

## Gates and broader acceptance

Direct E2E lint/typecheck and two-test discovery passed before the first run.
After the locator correction, root lint8/8 (8cached), typecheck8/8 (7cached),
test6/6 (6cached; prior1254pass +2existing storage skips) and depcheck passed.
Dependency scan: FE1613modules/4624dependencies; server770/3406. Cached results
are explicitly not represented as a fresh uncached1254-test execution.

Full post526 MSW at27731c1e is now terminal **222/222**,6.2min, exit0. This is
the complete Fake behavior suite, not the two-case opt-in real-provider suite.
Its sanitized receipt and source state are retained here. No fresh full-native
222PASS, current full integration, C1-C6/browser audit or parity PASS inferred.

UAT-14 native real-provider happy path is proven, but the required same-assertion
Fake MSW/native acceptance still needs completion. UAT-15 remains partial.
Missing UAT/AT/LK, functional gaps, audits, parity and final reports/dev review
PR remain required. P5 remains IN PROGRESS; no P5-DONE or main merge claim.

Evidence: `evidence/v2-527/`. Original failures and browser artifacts remain
private at D:/opchub-local/v2/527-real-results and 527-opening-original-*.log.
