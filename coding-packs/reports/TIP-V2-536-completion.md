# TIP-V2-536 — Calendar-independent Dashboard test clock

Scoped fixture correction; P5/full integration still require fresh verification.

Post534 full atc5955d78 is terminal **server1289pass/2fail in127files**;
DB23/23 in5files, root10m44.584s, zero cached. The corrected earliest-preview
and opposite-order controls pass. Additional failures are the original exact
latest50/keyset identity and first published script-card identity assertions:
both root timestamps are pinned to2026-10-21 while seed/demo writes advance
with actual time. No production ordering defect follows from these premises.

ThreadFixture now uses one injectable next-day05:00UTC suite anchor, followed
by its original serial5minute steps. Vietnam-noon anchor preserves the explicit
inactive01:00–02:00 skip control; no test expectation was changed. Four pure
clock controls cover early/late day, year rollover, leap day, monotonicity,
Vietnam noon and nonmutation of the reference. Absolute calendar year removed.

Intermediate scoped run: **14pass/2fail**. Seventy future keyset roots from
the first storage case then correctly displaced its later wall-clock response
cases from the unfiltered latest50. Storage cases now start/close their own
test-owned fixture, including settings restoration/cache invalidation, rather
than sharing all roots until afterAll. No query scoping, LIMIT expansion,
first-card weakening or production change.

Final scoped: **16/16 in3files**,19.61s, including all original Dashboard
execution/cache/hide/concurrency checks, storage SQL-plan/count/privacy/keyset
checks, opposite-order response control and the4 clock controls. Before/full,
intermediate and final receipts retained in `evidence/v2-536/`.

Test-only work on opchub_test/Redis2 with Fake providers. Native HOLD, dev demo,
production source and LLM budget unchanged. Mandatory root gate receipts and
subsequent forced full integration are tracked separately; no full PASS or
P5-DONE is inferred from this scoped result.

Final-state root lint8/8 and typecheck8/8 (7cached each), units6/6 (5cached;
1270pass plus2existing skips), depcheck pass. FE scan1623modules/4660edges
includes the two temporary ignored live diagnostic files; server774/3417.
Those files are not committed and will be removed after their run is terminal.

## Fresh forced complete integration

At7cd23214, `pnpm test:int --force` is terminal **PASS**: server1295/1295
in128files, DB23/23 in5files, root12m34.057s, zero cached. Exact earlier
Dashboard failures, original preview/privacy/count/plan expectations, context
history and actual delayed worker regressions are included. Test database
opchub_test/native5432 and Redis2 only; all providers Fake. Full receipt/state
retained in `evidence/v2-536/536-full-integration*`.

This closes the current full-integration gate, not the red MSW lifecycle, all
UAT/AT/LK assertion review, full224-case both-lane run, audit or parity gates.
