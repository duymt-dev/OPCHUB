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
