# TIP-V46-812 — parity and acceptance

STATUS: IN-PROGRESS, stage1 baseline. No DONE/ACCEPTED claim.

Branch feature/TIP-V46-812-parity-acceptance, initial8a33b3f1 on dev682a4b9e (811 PR90 merged). No application source edited yet. [Manifest](../tips/TIP-V46-812-manifest.md) records295 scenarios and exact pre-edit paths/reasons.

## Authorization / runtime

Owner confirmed private801 dev/test + Memurai6381 and keeping all existing HOLD. Follow-up explicitly authorizes isolated opchub_v46_812_dev + Redis6381 DB3 + API4310/socket4311 + Next3710/3711, exact seed guard addition. Original PG/Redis6379 and old private811 services remain untouched. New DB provisioned from consistent private801 snapshot; initial restore rolled back on unqualified SQL-helper lookup under pg_dump empty search_path. Atomic retry changes only restore-session search_path, not schema/functions. Source/target index/function/migration checksum definitions match exactly. New DB not seeded or served yet. Encrypted configs/dump remain ignored locally.

Native baseline parity currently uses frozen811 API/worker and new812 baseline Next ports; final behavior/parity must use isolated812 runtime with matching link origins. No mail-link rewriting, fake development LLM or reduced assertions. Original801 AI/App snapshot saved before reset and will be restored after baseline native measurement.

## Actual baseline evidence

| Gate | Result |
|---|---|
| lint |8/8 PASS2m35.77s, baseline-lint.log |
| type |8/8 PASS1m11.344s, baseline-type.log |
| depcheck |both graphs PASS2463/7476 and1135/5312, baseline-depcheck.log |
| root MSW build |3/3 PASS2m13.079s, .next-v46-812-baseline-msw |
| native baseline build |Portal/Admin PASS, .next-v46-812-baseline-native |
| unit first forced |aborted after1 audit coverage timeout5s (server238pass/1fail); root not complete |
| same audit isolated |2/2 PASS4.48s, no code/timeout changes |
| unit bounded full r2 |2123pass+2existing skip,6/6 tasks26m14.735s; UI63/shared712/Admin565/integrations107+2/server239/Portal437 |
| integration |RUNNING, private801 test/Redis DB2; no outcome inferred |
| parity full MSW |RUNNING entire registry,580 listed tests including harness; raw threshold failures retained |
| full MSW behavior |QUEUED after parity, not yet run |
| native parity |RUNNING56 selected scenarios; D78GDV prototype missing Marketing times out, P108 lacks stores prerequisite; both to be addressed per manifest |
| final gates/15 cases/full native |NOT RUN yet |

All logs use ignored test-results/v46-812-* paths. Source frozen during baseline; no new skip/retry/timeout/threshold waiver.

## Gaps / next

Finish baseline; preserve raw ledgers/pairs. Review every targeted >3% with paired image/DOM. Correct only manifested real layout defects and missing acceptance evidence; then rerun full gates, both-mode15 cases, full MSW/native, final same-SHA parity and regression comparison. Keep historical progress801–811 rows. Master acceptance, M1/M3 and row12 remain pending. No PR opened until a tested scoped checkpoint.

Q812-1..5 use explicit TIP defaults (not fabricated owner decisions). Q812-6 records9 absent BR numbers in the range;26 actual definitions are required, absent IDs cannot receive invented PASS tests.

## Checkpoint — 2026-11-06, implementation in progress (not DONE)
- Owner approved independent812 runtime: opchub_v46_812_dev, Memurai6381 DB3, API4310/socket4311, Next3710/3711. Existing native/811 HOLD preserved; exact target guard and cache conjunction tested.
- Baseline lint8/8, type8/8, depcheck both graphs, MSW/native builds pass. Full unit2123pass/2 existing skips; integration2131pass; full MSW behavior381pass/4 existing skips. First resource-contention unit audit timeout is retained in raw log; unchanged isolated test and bounded full rerun pass.
- Baseline whole-registry MSW parity: 580 tests =416pass/76skip/88fail; 484 fresh comparisons =414<=3%,70>3%,18 noncaptures. Native selected parity:114 tests =55pass/2skip/57fail;104 fresh comparisons =53<=3%,51>3%,6 noncaptures. Both captured at8a33b3f1. This is not final acceptance.
- Committed infrastructure checkpoint5f989084 and revoke-mail fix18c8526c. New guard8/8, cache guard13/13, mail unit4/4, appointment integration14/14. Current regional mock9/9; read-only guard2/2.
- Implemented source awaiting focused final verification: measured regional bank spacing, preview duplicate-notice removal retaining guard, MyRegion mobile KPI/table geometry, empty referral layout, instant scroll capture, missing stores seed prerequisite, exact HAOPC selector/readiness, AT-GDV02/04 +TC462/491 +BR465 proofs. No production API/schema/migration/business changes beyond TIP-default subject wording.
- Focused auth/search MSW5/5 passes. Earlier failures were new-test locator/fixture assumptions (actual label Nhu cầu địa phương; store title is span twice, not heading; existing Affiliate payment-overlay exemption; PATCH lock returns200). Assertions now target actual semantics, not production shortcuts.
- Native focused run still ongoing; exposed stale October director fee prerequisite and native AntD wrapper specificity. TC462 now appoints already-paid m1 before revoke; remaining failures must be corrected and rerun, not relabeled PASS.
- Full final MSW/native behavior, full same-SHA parity, all targeted cause reviews, final unit/integration/build/static gates, remaining acceptance reports, push and PR are still required. No merge readiness claimed.

Build-operation correction: root Turbo cache does not track custom NEXT_DIST_DIR outputs. ui-r3 reported3/3 but cached Admin did not materialize its new build folder; Playwright fallback started default-dist Admin, so that intermediate focused run is invalid for Admin UI measurement (raw15fail/12pass retained). Rebuilt actual artifacts with root pnpm build --force (3/3,0cache) and validate BUILD_ID before launching; never treat missing custom output as a production regression or weaken tests. Direct filtered native builds do not use Turbo cache. Subsequent forced r4 focused MSW28pass/1fail exposed only selected-tab scroll not reacting to async counts; dependency fixed, all earlier acceptance proofs pass in that run.

## Checkpoint — source pushed, PR draft
- Source0e2a858c and settings6d9e244f pushed. Draft PR91 → dev: https://github.com/duymt-dev/OPCHUB/pull/91 (NOT ready for merge; no auto-merge).
- Owner-approved BR465 correction a7ae103b reloads the user/session projection after conditional auto-unlock (status + permission version), retaining rules/audit/outbox/revoked-old-session checks. Regression integration2/2, native focused20/20 PASS (including BR465, TC462, AT02/04, search and mobile geometry); MSW settings/policy12/12 PASS.
- Current root lint8/8, type8/8 and depcheck2471/7503 +1140/5319 PASS; full forced unit and full integration reruns still running.
- Full behavior runs now391 cases each: MSW on3930/3931 and independent native812 on3710/3711/API4310/Redis3. Separate output directories preserve both lanes' evidence. Runtime mail origins match3710/3711; CLI loads server env without printing secrets for signed unsubscribe proof.
- Actual targeted parity gains: regional banner both widths now<=3%; GCFG desktop4.47→2.41%; AI desktop<=3%; App mobile3.56→2.26%. Other targeted pixels remain raw FAIL pending final cause classification, never relabeled green.
- Remaining measured local RO hint30px vs prototype35px corrected with dedicated class + separate unit1/1; coverage notice/permissions unchanged. Updated generic row readiness after proving HAOPC is not on page1 of66 real mock affiliates; exact filtered HAOPC count assertions retained. These follow-up files await commit/final r7 builds/retakes.
- Original HOLD has not been restarted/stopped. New812 encrypted AI/App snapshot saved before full native settings tests; restore only812 after final seed. No credentials/cookies/traces committed.

## Owner-approved legacy-fixture checkpoint — 2026-11-06 15:45 ICT
- Owner approved narrow fixture/MSW/test repair of Event, Marketing and Fees; no production business changes. Added exact812-only, case-local prerequisites with mocked-client regressions5/5 (391 real registration rows/unique pairs, e1 switch input, future upcoming events, exact4052 deliveries, native target refusal). Native drawer occupancy now explicitly asserts persisted7/80 rather than mock aggregate54/80; check-in/export/detail-opening assertions retained.
- Fees ptx901 invalid-prefix MSW text and exact browser assertion now match canonical parser; unrelated GV missing-member reason retained (new unit1/1 PASS).
- Before these repairs, full root unit completed2135pass+2existing skips,6/6 tasks15m45.469s (5 cached). Full MSW behavior completed387pass/4existing skips,391total27.0min. Full integration and first full native are still running, not green by inference.
- Root lint8/8 PASS1m56.248s; root typecheck8/8 PASS56.778s with --env-mode=loose and explicit isolated API_INTERNAL_URL (initial strict-Turbo invocations dropped that variable and failed configuration before TypeScript; raw logs retained). New DB test subsequently passes DB lint/typecheck and E2E typecheck.
- Final parity watchers were deliberately stopped after owner expanded fixture scope; partial MSW final-parity attempt aborted, NOT final acceptance. SHA2821 is not a final acceptance freeze.
- Focused MSW repair replay r8 invalid: build omitted compile-time NEXT_PUBLIC_PORTAL_URL, so mock cross-origin bridge returned503 at login. Diagnostic confirms fixture/test logic was not reached. Rebuild r9 explicitly pins private MSW Portal3930; no production fix/timeout/assertion waiver used.
- Additional full-native failures outside the three approved groups observed: Affiliate fixed20% heading, bank/fee-link1.5m versus expected1.2m, automatic/bulk bot generation. Separate owner question sent; no repair authorized or attempted yet. Full run continues to collect the complete set. Do not claim these are proven baseline failures (baseline full native was not run).
- PR91 remains DRAFT / NOT READY TO MERGE. Original native and HOLD processes/data remain untouched.

## Additional fixture/runtime checkpoint — 2026-11-06 16:08 ICT
- Owner approved additional narrow fixture/cache/runtime repairs, retaining assertions. Investigation corrected the initial Affiliate description: native did NOT show a different percentage; unpaid Hai Yen had no affiliate identity ('Link giới thiệu của bạn đang được khởi tạo') because demo backfill still requires a feePeriod. Added only a case-local real unpaid-affiliate prerequisite.
- Preserved Admin pricing edits explain actual1.5m personal /18m fundraising vs exact1.2m/15m assertions. Case-local default-prices prerequisites restore demo tariff for bank-link and fundraising; cache flush adds only pricing namespace under unchanged target guard. No production pricing or expected values changed.
- Worker proves missing configured AI after seed reset. Automatic lifecycle now uses the existing configured local HTTP provider after demoReset, closes it in finally. Bulk fixture had incompatible model/key vs its own strict HTTP stub; aligned setup, preserved strict authorization/model validation and exact request/variant/turn assertions. Actual setup-to-stub HTTP regression2/2 PASS.
- Event Portal fixed October/real-count prerequisites explain unclickable registration and missing full-capacity state. New guarded case-local fixture materializes391 real registrations, preserves m1's e2 registration, sets e1/e4 future/open; exact55→54/80, Meet privacy and120/120/disabled assertions remain unchanged. Admin close-switch draft explicitly starts ON in both lanes before the original OFF click, removing expired-event scheduler race.
- Guarded prerequisite mocked regressions now8/8 PASS; DB lint/typecheck and E2E lint/typecheck pass after correcting new mock-call typing (no any/ignore bypass).
- Presentation-only numeric column right alignment committed/pushed d9ee03e8, real table regression1/1 PASS. Source is not the final parity freeze yet.
- Latest root unit2137pass+2existing skips,6/6 tasks4m33.66s (4cached). Root forced build3/3,0cache2m4.756s; depcheck2477/7517 +1140/5319 PASS. Root lint8/8 and typecheck8/8 PASS; raw initial configuration failures retained.
- Full integration r1: DB134pass; server2005pass/1fail (222files; bot-reply-scan fixture transaction exceeded5s at7.75s). Unchanged isolated recheck4/4 PASS31.06s. This does NOT turn the failed full gate green; full integration r2 is running on private801test/Redis2.
- Focused legacy MSW22/22 PASS. Additional MSW replay (including real10min auto-lifecycle) and exploratory full native are still running. Final full native rerun, final same-SHA parity/regression review and master acceptance reports remain outstanding; PR91 remains draft, not merge-ready.

## Owner-approved root fixture refinement — 2026-11-06 16:28 ICT
- Complete exploratory triage also found AF0 count62 versus required66 and several personal/fundraising price-dependent cases. Replaced redundant case-local synthetic affiliate/tariff modes with shared DEMO-only root corrections: include every non-investor independently of feePeriod, preserve paid-member codes, active status as production D94; reset demo tariff inside existing seed transaction. Required/production seed remains unchanged, preserving Admin prices. No production business logic altered.
- Removed redundant unpaid/tariff calls from original Affiliate/bank/fundraising browser scenarios; their original assertions are unchanged. Added the same configured local HTTP provider fixture to quick automatic admission and emergency-stop cases (imports only, original bodies/assertions/timeouts retained).
- Mocked DB regressions8/8 across two separate files PASS; current root lint8/8 (26.611s), typecheck8/8 (15.938s) PASS. Source checkpoint to be committed immediately; native focused validation follows first exploratory full completion.
- Exploratory native now has actual PASS for all15 required AT/TC rows, including TC461 case324 and TC494 case380. This does NOT make its full gate green: unrelated fixture/runtime failures remain recorded, and the corrected final full replay is still required.
- Master acceptance/case coverage/M1/M3 drafts and progress row12 added as IN PROGRESS/NOT ACCEPTED; historical rows1–11 not changed. Final parity/cause ledger/restoration/clean Git evidence still pending.
# Latest verification checkpoint — 2026-11-06 17:05 ICT

- 17:10 follow-up: latest full integration at f4df98ec stopped on DB141 PASS/2 FAIL, precisely obsolete agent counts62/6 after the DEMO-only D94 fix. Owner approved66/10 plus relational invariant proving no eligible user lacks an affiliate. Real private-test-DB focused5/5 PASS30.68s, all money/period/referral/payout/idempotency assertions unchanged. Earlier2148 PASS is not represented as the final source gate. In-flight MSW parity f4df98ec was interrupted before completion because the approved regression creates a new source checkpoint; retain raw log as INVALID/intermediate, rerun both final parity lanes on the later frozen HEAD.

- Owner approved historical `pending_review` data for the badge case. The fixture is guarded to exact private812 DB; regression7/7 PASS. Badge+1 and existing timeout remain unchanged, D108 production direct publication untouched.
- Long auto/emergency native replay exposed competing seeded script executions, not missing credentials alone. Native-only prerequisite now defers scripts through real Admin APIs and stops active seeded executions through the domain stop endpoint before the original automatic-topic assertions. Focused native replay is running; not yet PASS.
- Latest root lint8/8 (11.475s), typecheck8/8 (8.855s) PASS. Additional full root unit/depcheck rerun is running.
- Full integration r2 completed PASS: DB142 + server2006 =2148 tests; root2/2 tasks,36m1.758s. Earlier full failure and unchanged isolated replay remain recorded, not erased.
- Full MSW replay r2 completed PASS:387 tests,4 existing skips,44.9m at one worker. Source was not frozen throughout this exploratory replay; final same-source evidence remains outstanding.
- PR91 remains DRAFT / NOT MERGE-READY. Final full native, same-SHA parity/cause ledger and final restoration/reports are still required. No new production scheduler logic, assertion/timeout relaxation, skip or queue purge.
