# TIP-V2-530 — Committed live MSW chat and same-assertion UAT-14

## Implementation and boundaries

Portal now observes native browser storage events from the existing separate
Portal-origin relay document. A new typed domain module validates the exact
fixture key, source origin/path and complete financial/community envelope before
comparing room message/quote/pin versions. Only dirty room IDs reach the existing
query cache reload; no private message/persona DTO is emitted. Unread/activity/
sequence-only writes do not refetch history. Corruption/untrusted notifications
cannot mutate storage or clear caches; normal API reads still fail closed.

Mock-only subscription is dynamically imported, cleaned on unmount and guarded
against late installation. Native Socket.IO path remains unchanged. No global
content store, new endpoint, history polling loop, dependency or provider call.
This is live bot/chat invalidation, not full group/session/moderation persistence
or a claim of an autonomous mock worker with every app closed.

## Evidence

- Original new MSW UAT-14 **1 failed**: actual Admin reply execution/body checks
  pass, but the open member chat cannot see it before F5. Original failure kept.
- After fresh isolated .next-msw-v2p5-530 Portal/Admin builds: same UAT-14 passes
  in a complete **11/11** related browser cohort,2.7min (reply39.1s). Automatic
  admission, full manual Stop/no-next-turn interval and Dashboard/F5/navigation
  controls also pass. No assertions removed, split by backend or loosened.
- Native unchanged new case **1/1**,1.6min (test1.5min), on backend529. Actual
  member UI send -> eligible c1 persona -> actual delayed FakeLlm execution ->
  already-open chat -> unique reply and original quote after F5. Both lanes
  assert null senderId and no public isSimulated/personaId. Unique question/body
  provenance prevents a pre-existing demo response from satisfying the test.
- Shared13 room invalidation controls, Portal3 subscription lifecycle controls
  plus existing3 cache/hide regressions pass. Includes native-disabled path,
  late import/unmount, unrelated origin/fixture/path, corruption, read-only
  writes, publication/hide/removal/pins and room-only invalidation.
- Forced root units **1270pass +2existing storage skips**,6tasks/zero cached,
  1m51.683s: shared342/Portal187/Admin443/server203/UI43/integrations52.
  Root lint/typecheck/depcheck pass. Initial three require-await errors in new
  test stubs are retained and corrected with explicit resolved promises, not
  lint suppression. Final gates also rerun after trace-label-only correction.
  Final lint/typecheck8/8 (5cached each), tests6/6 (4cached), depcheck zero
  violations: FE1620modules/4646dependencies; server771/3410.

Trace correction: receipts initially label the new case REQ-207. Requirement
matrix207 is NA-07, not generic replies. Source labels now correctly use
REQ-060/REQ-411/UAT-14; assertions are unchanged. This case does not establish
NA-07 coverage. Its existing native worker/keyword assertions remain separate.

Participant form setup was extracted to behavior/helpers/bot-participants.ts;
the real-provider helper retains a one-line facade. No extra real LLM request
was run; the previous cumulative two-request budget remains spent.

## Acceptance / native HOLD

UAT-14 happy-path row can now reference actual matching assertions/receipts on
both Fake lanes, in addition to the separate real-provider proof. LK-11 remains
PARTIAL: this proves member -> actual Admin reply execution/publication, not a
complete automatic multi-turn script lifecycle. No full UAT-15 claim.

Native required seed + normal demo + Redis1 flush completed after the selected
case. All native processes/builds are preserved; MSW builds use other output
directories and ports. No reset of test DB during native dev seed.

Post529 full integration is terminal **server1288pass/1fail**,126files, root
13m36.897s. Original actual-worker/NA-07 case now passes with80327ms real delay.
Remaining failure is the addressed-persona bounded-history expectation in
bot-reply.int.spec.ts. Retained, requires separate scoped refine; DB task aborted,
so no complete root integration PASS. It is unrelated to this mock-only change.

Existing full222 MSW/native results predate this new223-case registry. Final
full reruns, missing UAT/AT/LK, wider community behavior, audits, parity, final
reports and dev review PR remain open. No P5-DONE or main merge claim.

Sanitized receipts: evidence/v2-530/ (post529 full integration in v2-529/).
