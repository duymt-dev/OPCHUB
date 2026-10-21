# TIP-V2-534 — Dashboard fixture chronology correction

Scoped correction complete; full P5 acceptance remains IN PROGRESS.

## Cause / changes

Unchanged scoped reproduction: **3 pass/1 fail**,8.18s. The query correctly
selected an earlier persona response, while the test incorrectly called the
actual HTTP human response earliest. Calendar-fixed05:00+serial fixture dates
were mixed with wall-clock HTTP timestamps.

The writer fixture now optionally accepts an explicit timestamp. In the
member-first case the opening precedes actual HTTP send, then all persona
responses derive from the persisted human timestamp. All original count3,
exact earliest body and hidden/deleted privacy expectations remain unchanged.
A new opposite-order control requires count2 and the actually earlier persona
body, preventing a production human-preference workaround.

Intermediate expanded run: **4 pass/1 fail**. The preceding real-time roots
then exposed the same chronology assumption in the wide-row unfiltered
latest-50 benchmark. Its tied root time now exceeds both the injected fixture
clock and current time. All existing EXPLAIN indexes/no-Seq-Scan, count50,
every-row count2 and exact first-response-body assertions remain unchanged.
No production SQL, message behavior, timeouts or filters changed.

## Evidence

- Final real Postgres scoped file: **5/5**,9.41s. Raw before, intermediate and
  final receipts retained in `evidence/v2-534/`.
- Root lint8/8 and typecheck8/8,6cached each; tests6/6,5cached (reported
 1270pass plus2 existing integration-adapter skips); depcheck passes,
 FE1621modules/4652dependencies and server772/3415. Cached unit output is
 not claimed as an uncached rerun.
- Test database opchub_test/native5432, Redis2, Fake providers only. No native
 HOLD process/data/config changes, rebuild or upstream LLM call required.
- Mandatory next gate: forced full integration after this commit. This report
 does not claim that gate passed, close MSW lifecycle, or mark P5 ready.

Separate diagnostic attempt533 timed out before entering its test because the
nested temporary Playwright config resolved webServer commands from its own
directory. Attempt533b explicitly sets e2e cwd and has entered the unchanged
lifecycle case. Its future result must be evaluated independently; no PASS
is inferred from startup. Harness/raw private ledger stay outside tracked code.
