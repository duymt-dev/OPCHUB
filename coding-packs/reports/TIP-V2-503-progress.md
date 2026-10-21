# TIP-V2-503 — Functional acceptance checkpoint (NOT COMPLETE)

## Terminal full browser receipts

| Lane / source | Cases | Result | Qualification |
|---|---:|---|---|
| MSW baseline4c1fd891 | 221 | 219pass /2fail,8.1min | Demo-account flag on; unresolved registration settings race |
| Native4c1fd891 | 221 | 217pass /4fail,34.8min | Failures below; no skipped case claimed |
| MSW0aef409f | 221 | **221pass**,7.5min | Fresh builds with demo-account flag off and TIP-522; no assertion changes |

Receipts in `evidence/v2-503/`; private originals and browser artifacts remain
outside Git. Native runner terminal metadata confirms required seed + demo seed +
scoped Redis1 cache flush restored=true. Native code/build at4c1fd891 does NOT
include the later Portal registration fix. Post-TIP-523 browser is separate and
must not be presented as a full221 rerun.

## Native findings and next actions

1. **V2Q-163**: native Next built with demo-account display on. Correct isolated
   off builds have succeeded; controlled Portal/Admin cutover and browser
   re-verification pending. Keep the unchanged no-demo-box assertion.
2. **Empty bot history**: worker legitimately generated automatic threads with
   three/four-turn shapes. Deleting scripts does not imply automatic history is
   empty. Requires explicit equivalent manual-only fixture in both lanes and a
   separate automatic-positive test; do not filter away real threads or weaken
   the empty assertion. Historical focused5/5 did not expose this broad-run race.
3. **AT-AF06 payout retry**: full failure reproduced unchanged in focused native
   cohort1pass/1fail. Private trace: POST409, bank PUT200, then exact button
   locator waits and no second POST. Payout confirmation stays rendered; loading
   icon can alter the accessible action name during leave motion. TIP-523 adds
   a stable accessible name and a dedicated before-failing regression. Financial
   assertions, key reuse and receipt snapshots remain untouched.
4. **Dashboard discussion navigation**: old fixture sends two human messages.
   Current Dashboard query deliberately selects persisted simulated bot openings
   only. Replace the precondition with an actual eligible bot publication in both
   lanes and preserve navigation assertion; prove Dashboard provenance/delivery,
   not a synthetic card or title-only UAT-15 claim.

TIP-522 UAT-11 intermittent failure remains disclosed. It passes in this fresh
full MSW run, but one green rerun does not establish an independent root-cause fix.

## Acceptance scope audit

### TIP-523 scoped follow-up

Fresh post-fix payout MSW2/2 and native A-01+payout10/10 pass unchanged. The native
cohort also verifies demo-account display off after owned UI-only cutover.
Required/demo seed and scoped cache flush have run again after that cohort.
Thus configuration and payout findings have scoped verification; the two bot /
Dashboard precondition failures remain open. No new full native221PASS claimed.
See TIP-V2-523-completion.md. Root units now1198pass +2existing storage skips;
lint/typecheck/depcheck pass. Full integration after later patches remains open.

Initial source-derived `V2-acceptance/uat-at-results.md` inventories31UAT/23AT;
`lk-matrix.md` inventories12LK. All remain explicitly UNVERIFIED pending exact
assertion/receipt review; a matching title is not a PASS. In particular UAT-02
is attached to an email-duplicate negative case, not the required OTP-positive
flow. UAT-04 includes Admin membership and welcome-mail log; UAT-15 includes
Dashboard; these must not be inferred from partial navigation/schedule cases.
D-54 supersedes the obsolete refund-driven pause prose in LK-10.

## Open delivery gates

Missing live reply/automatic/cross-app cases, full acceptance matrices, bounded
real-provider E2E, current full integration run after later changes, audit C1-C6
and native browser audit, then parity ver2 remain open. No ready-for-review or
P5-DONE claim. Work stays on feature from dev; final integration is dev and an
owner-review PR dev-to-main, never an agent main merge.

## Subsequent524/525 functional checkpoint
MSW automatic admission/per-turn execution is now implemented with33new domain
controls. The empty-history case has an explicit equivalent manual-only fixture,
and a separate UI-positive case enables real topic generation. That new case
exposed a partial-settings PATCH bug resetting omitted false toggles to true;
TIP-525 corrects it with before-failing shared/native regressions.
Identical scoped browser5/5 pass on native and MSW. Historical full native4fail
therefore has scoped fixes for configuration, payout and empty-history; Dashboard
human-message precondition remains open. No new full-native222PASS claimed.
Root now1244pass +2existing skips with lint/typecheck/depcheck green. Full
integration1305/1305 at82dfdc3f is terminal, but predates524/525 wiring. Reports
TIP-V2-524/525-completion.md retain limitations. Full behavior registry now222;
new complete reruns and the larger delivery gates remain required.

## Subsequent526 persistence / Dashboard checkpoint
Full MSW222/222 at57274693 completed6.4min. New526 bot/chat transport then passes
41persistence controls, nativeDashboard3/3 and MSWcross-app11/11. Dashboard now
requires an actual unique Admin-published body, source group/time, F5 retention
and navigation; no human-reply/synthetic precondition. All4historical native
failures have scoped fixes, but a fresh complete native run is still required.
Root1254pass +2existing skips, lint/typecheck/depcheck green. The full222receipt
predates526; no new full PASS or complete UAT-14/15 is inferred. Broader community
state/live transport, real LLM, matrix gaps/audits/parity remain open. An empty
MSW WebServer teardown diagnostic is retained, not silently treated as clean
browser-console audit. See TIP-V2-526-completion.md for exact scope/versioning.


## 527/528/529 authoritative functional checkpoint
Full post526 MSW222/222 is terminal at27731c1e. Full native existing behavior
registry222/222 is terminal28.5min at a7f68d00 against immutable pre529 native
artifacts (exact revisions in TIP-528). All4historical native failures now pass
the full registry. Demo required/normal seed and Redis1 flush restored=true.
Separate owner-authorized bounded real-provider reply1/1 proves live open chat
and quoted F5 history; opening invocation failed a two-surface locator after
publication and is NOT recast as PASS (TIP-527, two cumulative upstream calls).
Fresh full integration at a7f68d00 failed server1286pass/1fail; DB task aborted.
TIP-529 proves/fixes actual Redis deadline25ms early under advancing clocks,
unchanged2/2 then original worker/publication/emergency18/18, actual170727ms.
Forced units1254pass +2existing skips, lint/typecheck/depcheck pass. Full
integration after529, fresh deployment proof, same-assertion Fake live reply,
missing UAT/AT/LK, audits/parity and final delivery remain required.


## TIP-530 UAT-14 same-assertion Fake pair
UAT-14 now has actual same-assertion Fake MSW/native receipts, not just an
opt-in real-provider case: MSW11/11 related cohort and native1/1 with live chat,
quote/private-field boundary and F5. Shared13 +Portal3 new controls; root
forced1270pass +2existing skips; final lint/typecheck/test/depcheck pass.
Existing full222 receipts predate the expanded223registry. Post529 full
integration failed a different addressed-persona context expectation:
server1288pass/1fail; original actual-worker/NA-07 case now passes80327ms.
Do not claim full integration/P5 green. Exact findings/evidence in TIP-530
and V2-P5-BUGS; complete UAT/AT/LK, audits/parity and final delivery remain.


## TIP-532 authoritative three-turn checkpoint
Expanded registry224. Native full auto lifecycle1/1,10.4min (no manual run,
actual5minute intervals, opener closes, live/F5/Dashboard provenance/count2).
Same MSW case FAILED cursor2 expected/1 received after350000ms; generic Admin
error snapshot preserved. Thus no complete UAT-15 both-lane/functional gate.
Post531 full integration1289pass/1fail; earlier context correction passes, new
Dashboard earliest-preview chronology fixture failure retained. Root static/
unit gates pass but do not override red integration/browser. Native demo and
services preserved. Reports TIP-V2-531/532 and V2-P5-BUGS track open refinements.
