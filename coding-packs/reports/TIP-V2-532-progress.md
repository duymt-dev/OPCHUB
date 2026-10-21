# TIP-V2-532 — Full automatic lifecycle: native PASS / MSW FAILED

## Actual identical browser case

Two eligible all-day c1 personas, unique topic, actual Admin switches; no manual
script/run request. Defaults are asserted identically at5minutes. First automatic
execution must be null-script/three-turn, opener closes, remaining bodies blank.
After opening, only new generation admission is disabled; the existing execution
must finish. Member sees the actual opening on Dashboard and navigates to c1;
both later turns must arrive in already-open chat, before any F5. Running cursor2
and terminal cursor3, exact bodies/sender order, three unique persisted IDs,
deadline-to-message timestamps, no early publication/private DTO fields and
Dashboard source ID/group/first-response preview/count2 after F5 are asserted.
No clock edit, fast-forward, fake response, mode-dependent expected value or
new real-provider request. Configured deadline equals message time+300000ms;
actual delivery may be later due to worker/generation latency, never earlier.

## Terminal results (not a passing both-lane gate)

- **Native1/1 PASS**,10.4min (test10.2min), on dist/p5-529 backend159fc82b and
  existing native Next bundles. Complete three-turn execution, opener-closes,
  live chat/F5 and actual Dashboard source/preview/count checks all pass.
  Required seed + normal demo seed + Redis1 flush restored afterward. Existing
  processes/ports/provider preserved; no native source/build change needed.
- **MSW1 FAILED**,6.0min: first opening, plan, Dashboard source and navigation
  pass, then cursor remains1 instead of2 within350000ms. Failure snapshot shows
  Admin's generic error/disabled state. This is NOT proof the immutable build
  feature flag actually changed. Cause needs HTTP/storage/runtime diagnostics;
  do not weaken timeout/assertion, manually advance, or mark PASS by rerun.
  Exact same test and isolated .next-msw-v2p5-530 builds used. Failure retained.
- Root lint8/8 and typecheck8/8 (6cached each), tests6/6 (5cached;1270pass plus
  2existing skips) and depcheck pass. This is unit/static evidence, not a green
  browser or full acceptance gate. FE1621modules/4652dependencies; server772/3415.

New registry now224 cases. Prior full222 receipts remain historical, not a
full224PASS. TIP-532 stays **IN PROGRESS** until unchanged MSW case passes after
scoped correction. UAT-15 native scenario is proven; MSW lifecycle is red.

## Complete integration follow-up, kept separate

Post531 forced full at4d6656ae is terminal: **server1289pass/1fail**,127files,
root13m26.336s, zero cached. Both original14 reply assertions and the new exact
newest-human context control pass. Actual worker reply/NA-07 passes204182ms.
Remaining failure: bot-thread-storage.int.spec.ts expects Earliest real reply,
but an earlier persona response is actually selected. ThreadFixture uses fixed
05:00+serial5minute dates while member HTTP uses real wall time. Scope a separate
fixture chronology correction; preserve every original preview/visibility/count
assertion and add the opposite-order control. No SQL filter change is justified
by this fixture failure. DB task aborted, so no full root integration PASS.
Full integration raw/state retained in evidence/v2-531/.

## Next required work

Diagnose/fix MSW long-running execution (including its generic error boundary)
without changing native behavior or removing this case; repair Dashboard fixture
chronology separately; fresh full gates, remaining UAT/AT/LK, wider community
behavior, C1-C6/native browser audit and then parity/final reports/dev review PR.
No P5-DONE, complete functional gate, ready-for-review or main merge claim.

Sanitized browser/static/restoration receipts: evidence/v2-532/.

Follow-up533b reproduces cursor failure and records76 HTTP404 responses across
both app origins; persisted global/feature flags remain enabled. This narrows
diagnosis to lost interception/transport rather than proving a feature toggle
or bridge503. Private notification-ack experiment533c is running; not a fix or
PASS claim. See TIP-V2-533-progress.md. Dashboard chronology is separately fixed
in scoped5/5 atc5955d78; forced complete integration is pending.
