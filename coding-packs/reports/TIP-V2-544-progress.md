# TIP-V2-544 — Accountant collection acceptance (PARTIAL)

Added one same-assertion cross-app case for AT-LK02/UAT-10/REQ-402.
Extracted the existing registration helper without weakening the two paywall
and same-account re-login tests. No production code changed.

Native: **3/3 PASS, 41.1s**. A real accountant collects the newly registered
member's own fee; response has the same identity, 600000 VND, actual collection
time and twelve-month validity. The already-open Portal gate disappears before
any reload. Reload then verifies persisted membership/reference and Community
access. Native backend159fc82b/UIed9dbccc; fake provider. Required seed, demo
seed and flush all exit0; restored=true.

Fresh543b MSW builds: **2 PASS / 1 FAIL, 17.5s**. New collection case fails at
paidAt: actual request1792570436210, response1792139400000 (fixed mock clock).
The live gate closure assertion was NOT REACHED; do not infer its outcome.
Both extracted-helper regression cases pass. Preserve the strict assertions.

Initial root lint failed on the unused PORTAL_URL import left by extraction;
removed only that import and formatted the new test. Final gate receipts will
be recorded separately. Evidence: `evidence/v2-544/`; raw originals retained
outside Git. Registry grows to232; this is not a full232 execution.

P5-MSW-FEE-CLOCK-01 remains open; bounded corrective TIP545 follows. No P5
completion, final audit/parity, dev integration or owner-review PR claimed.

Final544b root lint/typecheck/test/depcheck all exit0. Unit1297 passed plus
2 existing skips; 6 tasks successful,4 cached. These gates validate the test
addition but do not override the known MSW browser failure. TIP544 remains
PARTIAL pending corrective545 and unchanged cross-app regression.
