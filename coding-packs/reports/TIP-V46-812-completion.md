# TIP-V46-812 completion — PARTIAL (strict parity provenance)

- Date:2026-11-06; source Git SHA:`50e42c1b`.
- Branch:`feature/TIP-V46-812-parity-acceptance`; [draft PR91](https://github.com/duymt-dev/OPCHUB/pull/91), base dev. No merge performed.
- **All non-parity gates and all15 required functional acceptance cases PASS.** This is not TIP-DONE because strict AC1 still has14 legacy uncaptured MSW scenarios; raw parity remains nonzero, with paired causes and owner review preserved.

## Implemented

1. Measured regional/settings typography, geometry, empty referrals, mobile tabs, year labels and right-aligned numeric columns; real component regressions. Final read-only notice correction is scoped to Affiliate preview; other menus and real read-only sessions retain their warning/write guard.
2. Actual native/MSW acceptance proof for revoke popup, retained old-fee expiry, revoke-before-payout, literal Vietnamese search, timed-lock auto-unlock and public SEO. Paid revoke mail subject carries VN expiry only when still usable; body/flow unchanged.
3. Owner-approved auto-unlock stale session projection fix; conditional domain transition remains authoritative, integration proves status/permVersion and old-refresh rejection.
4. Owner-approved narrow fixture/runtime corrections: exact private812 guard, real391 Event registrations/future states,4052 actual mail timestamps, canonical invalid-prefix message, DEMO-only D94 identities and tariff defaults, pricing cache namespace, compatible local provider model/auth, native script isolation, proper registration password, exact overview response, real D115 reminder read prerequisite and historical pending_review badge data. No production direct-publish or payment rules changed.
5. D94 obsolete counts changed only after owner approval (62->66,6->10), with real every-eligible-member affiliate invariant; all monetary/commission/period/payout/idempotency assertions preserved.

## Verification

| Gate | Result |
|---|---|
|lint/typecheck|8/8 each, PASS; latest notice-scope-root logs|
|unit|2138 PASS +2 existing skips;6/6 tasks,9m45.436s|
|test:int|2149 PASS =143 DB +2006 server,29+222 files;1h18m11.047s|
|depcheck|2483/7542 +1140/5319, no violations|
|build|Forced root3/3 (zero cache) + latest Admin MSW/native r12 builds PASS; actual BUILD_ID exists|
|full MSW behavior|387 PASS/4 existing skips,26.0m at checkpoint8c9533a0|
|full native behavior|382 PASS/9 existing skips,1.6h at checkpoint8c9533a0|
|latest Admin UI delta|Unit3/3, actual native RBAC9/9, D82 parity1440/390 PASS on50e/r12|
|15 acceptance cases|15/15 exact successful titles matched in both full logs;26 defined BR + REQ628/629 covered|
|final MSW parity|425 test passes/78 skips/77 failures;485 fresh images423<=3/62>3, plus focused same-source MyRegion39010.62%|
|final native parity|64 test passes/4 skips/46 pixel failures;108 fresh images62<=3/46>3, no noncapture|

Full behavior checkpoints are not claimed to be reruns of the later presentation-only delta. Backend production source is identical to passing integration checkpoint. Two parity passes in each lane are harness regressions, not image captures. Baseline full native was NOT RUN; first exploratory350pass/32fail/9skip is not falsely called baseline. Latest full has no functional failure.

Earlier failed full integration (fixture transaction duration), obsolete count failures, exploratory E2E failures, restore-helper cwd error and interrupted parity runs are retained in local raw logs. A successful focused replay does not relabel a failed full run. Integration final has a non-failing worker-shutdown warning; all2149 assertions pass and process exits0.

## Residuals / acceptance

- AC1 PARTIAL: whole MSW still cannot capture P05/P100/P101/P102/D09/D17/D22 at both sizes because of older prototype state/count selectors. Older merged rows are not fresh50e evidence. Fixing unrelated legacy screens is explicitly outside this TIP correction scope.
- MyRegion390 whole-run scrollY0 assertion failed (actual98); unchanged same50e focused run really captured it. Both outcomes remain recorded; no retry configuration, timeout relaxation or assertion weakening.
- Final native has all108 eligible images fresh at50e. D78-GDV new unreachable classification follows the approved TIP default; existing other skips are unchanged.
- All current >3% rows have causes/paired artifact paths. Three >0.5pt deltas (MSW P84/D43, native D18-GDV) have **0% changed app pixels** versus8a baseline; only prototype captures changed. No app UI regression from those deltas.
- Pixel failures stay FAIL. D134 permits owner review, not fabricated PASS, new masks/crops or altered real data. Overall strict acceptance remains PARTIAL; PR stays draft.

## Restoration / handoff

Private812 demo seeded twice with identical counts:96 users,66 affiliates,51 referrals,53 commissions,65 periods,53 regional shares,1 payout,50 customer-year anchors,3 directors,5 bank transactions,17 stores; missing slugs0/unbalanced shares0. AI/App encrypted snapshot restored **after** final seeds; only6381 DB3 cache cleared. Own runtime remains API4310/socket4311/worker + Next3710/3711. All five original HOLD PIDs remain alive; original PostgreSQL/native Redis6379 and old HOLD services not restarted.

Evidence: `test-results/v46-812-final-private-hold.json`, `v46-812-final-original-hold-pids.json`, final gate logs and protected baseline/final paired PNG snapshots. Ignored traces/encrypted snapshots/credentials are not committed. Documentation/generated-report evidence commit follows source50e; final Git SHA/clean-status proof is returned in the session.

[Master acceptance](V4.6-acceptance.md) | [exact cases](V4.6-acceptance-cases.md) | [M1](V4.6-M1-completion.md) | [M3](V4.6-M3-completion.md) | [paired causes](ui-parity/V4.6-causes.md) | [manifest](../tips/TIP-V46-812-manifest.md)
