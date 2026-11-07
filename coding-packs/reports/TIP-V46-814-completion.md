# TIP-V46-814 — DONE (D134 reference parity / approved Q1 scope)

## Delivery

- Implementation/frozen source: **ef7934ff528ade7c00ebaf695f0077f2b797065a**; branch feature/TIP-V46-814-test-stability from dev06e9627b. Later report-only commits do not change tested source.
- PR [#96](https://github.com/duymt-dev/OPCHUB/pull/96), **base dev**. No merge/auto-merge; owner reviews the paired images.
- A13–A22 +B12 complete. No815/816 implementation, live AI calls, new dependency or new business rule.
- [Single-SHA gates](TIP-V46-814-gates.md), [closure evidence](evidence/v46-814-closure.json), [parity / paired images](TIP-V46-814-parity.md), [actual query plan](TIP-V46-814-query-plans.md).

## Final verification on one unchanged source SHA

|Gate|Result|
|---|---|
|lint|PASS,8 tasks forced|
|typecheck|PASS,8 tasks forced|
|unit|**2142 passed +2 pre-existing skips**,6 nonempty packages, forced; no fork timeout/no empty-file import|
|test:int|**2200/2200 PASS**: server2056 +DB144|
|depcheck|PASS|
|build|PASS,forced MSW and native builds; separate SHA-specific dist; owned runtime cutover|
|full E2E MSW|**391 PASS /4 existing skips**,0 flaky/unexpected|
|full E2E native|**386 PASS /9 existing skips**,0 flaky/unexpected|
|whole MSW parity|492 captures:433 within3%,59 threshold-only;8 approved prototype failures;78 existing registry-unreachable skips. Runner437 passed/67 raw failed; not relabeled zero exit.|
|selected native parity|128 captures from66 IDs:78 within3%,50 threshold-only;4 existing unreachable skips. Runner82 passed/50 threshold-only; no capture/harness failure.|

All10 commands ran sequentially on ef7934ff without source/HEAD changes. Earlier failed/interrupted attempts below are not combined into this result. Pixel measurements are reference/owner-review under D134, not application failures merely for known data/decisions. Raw command exits and counts remain explicit.

## Acceptance evidence

|Item|Evidence / disposition|
|---|---|
|A13|Original real10-minute lifecycle5/5 failed under4 workers; trace: history JSON200(1),200(2), then HTML404; reset had cleared observed messages. MSW activation acknowledgement +cancel/invalidate without clearing observed data; native reload unchanged. Hook9/9 PASS; final warm5/5 PASS20.7m at4 workers; first rebuilt2/5 had3 initial login503 failures, retained, not count-regression passes. Final full MSW/native lifecycle PASS.|
|A14|Bounded8-file async reads, read text once/AST once per controller. Focused9/9 PASS;3 consecutive forced full root runs2138+2 skips each:10m15.202s /13m20.044s /7m38.927s; final forced unit2142+2 skips PASS. No timeout increase.|
|A15|Per-package absolute Vite cache, forks/maxWorkers50%; root test-only Turbo concurrency2 after actual unbounded fork failures. Same3 forced full root proofs and final single-SHA PASS; no empty-file/fork failure. Neighbor async-ack unit assertion retained.|
|A16|Owner-approved one-connection SQL transaction/finally rollback; no Prisma interactive5s timer, no timeout/index/assertion change. Autocommit cleanup failure retained.5 consecutive file runs4/4 PASS each; final full integration PASS.|
|A17|35000-row hot-room/human/50-background-room fixture reproduced Seq Scan/Hash Join.128-ID recursive keyset pages inside ONE SQL statement, partial-index reads +PK cursor/update; no planner flag/new index/query loop, all stale IDs processed, newest120 retained. Original9 tests +skew +6 tied-time/page-edge regressions PASS; final full integration uses identical SQL and asserts no message Seq Scan/Hash Join.|
|A18|Await actual Admin/Portal login response in Promise.all; assert2xx, clear429 diagnostic; production throttle intact. New helper5/5 MSW +5/5 native, full files6/6 native; final full lanes PASS. Legacy helper from06e9627b replayed in ignored diagnostic copy after sweep:20/20 native attempts, no original failure reproduced. Missing response check was definitely wrong and corrected; Q5 nonreproduction noted, not a claimed throttle root cause.|
|A19|D09 live business count, D17/D22 actual pagination ranges; all6 formerly waived viewport captures complete on final SHA (both lanes). Only P05/P100/P101/P102×2=8 Q1 waivers remain: real UI/trace confirms no reachable password-view journey. No prototype state injection/new unreachable/skip.|
|A20|Both-side viewport/feed/drawer scroll/readiness, no mask/crop/style/threshold/timeout changes. All affected states complete in both final lanes. D44 owner-approved exact Demo Day card action preserves drawer readiness/full-page scope; native real-registration seed is not full. MSW D35 mobile new threshold crossing is transient sticky-overlay measurement with identical content positions, not a production layout change; images retained. Native D43/D44 actual date/registration backdrop differences classified.|
|A21|Final SHA rerun on owned opchub_v46_814_chain_test:101 up→16 down→approved retained-enum restoration→101 up; ACL-preserving normalized pg_dump identical; owned DB dropped.6 invalid targets rejected before connection. Applied historical migration files unchanged.|
|A22|All8 functional gates PASS +both complete classified parity lanes on ef7934ff; timestamps/commands/counts in gate table and raw ledger. No cross-SHA assembly.|
|B12|Distinct appointment/revocation mail kinds/labels, legacy kind retained, priority3; additive migration/down +dedicated MSW mail state/snapshot (only facade lines in legacy marketing file). Shared26/26, combined int25/25, browser2/2 MSW and6/6 native preparation; both final full lanes PASS. BR462 unchanged; BR464 acceptance row corrected.|

## Narrow execution extensions approved by owner

- A16 transaction fixture rollback instead of slow autocommit cascade cleanup.
- A21 retained-enum reconstruction on owned white chain DB ONLY; no historical up rewrite or dev/test enum reconstruction.
- bot-reply-storage fixture now actually populates indexed trigger/reply rows; keeps every Index Only Scan/index/no Seq Scan assertion and30s timeout, restores ANALYZE after rollback.
- Worker fixture snapshots/restores control settings and defers only processor bootstrap until after test Redis reset; real production bootstrap/handlers/5s deadline unchanged.20 old standalone attempts did not reproduce full failure; inherited-paused scenario did; corrected5/5. Full log also exposed old-job/flush Missing key race; bootstrap correction final full integration PASS.
- D44 unified exact-card journey, same assertion and capture scope, no DB count fabrication.
- MSW regional memberships: independently reproduced2/2 fresh-runtime failures; six fixture owners' validated membership snapshot +legacy compatibility, no overwrite of explicit empty/left or unrelated user state and no money replay.4 new regressions; focused46/46 PASS; unchanged original Affiliate E2E now passes final full MSW/native. Old standalone E2E20/20 had not reproduced its full-run timing failure; do not confuse that with the deterministic snapshot regression.
- Supporting file-list extensions: root package.json test-only concurrency, mail priority exhaustive mapping, package-local audit/unit support and isolated helper modules are documented with their reasons. No feature scope beyond approved extensions.

## Environment / restoration / remaining review

- Integration: opchub_v46_801_test +Memurai6381 DB2. Native: opchub_v46_812_dev +DB3; API/socket4310/4311, Portal/Admin3710/3711. MSW3930/3931. Fake adapters/local stubs only; native RATE_LIMIT_DISABLED=false.
- External machine reboot12:02 on07/11 ended old HOLD and private PIDs; this is recorded as an interrupted attempt, **not** agent preservation/process continuity. No native PostgreSQL/Redis6379 data/service operation by this work. Private Memurai/runtime restarted without stopping stale/reused numeric PIDs; final owned processes stay running.
- Demo seeded twice with identical counts after all tests (and again after legacy A18 proof), original encrypted813 AI/App snapshot restored, only private cache flushed.96 users/66 affiliates/51 referrals/53 commissions/65 periods/53 shares/1 payout/50 anchors/3 directors/5 bank transactions/17 stores;0 missing slugs/0 unbalanced shares. Final restoration receipt in closure JSON; no secret/snapshot committed.
- Paired images:144 pairs/288 PNGs (39,189,008 bytes), all above3% plus affected journeys. Owner image review remains PR review, not a false all-pixel-green claim. Existing settings-navigation B16 stays deferred by D137. Only8 explicit Q1 prototype waivers, no new skip/unreachable/mask/retry/timeout relaxation.
- No required implementation/functional gate outstanding.815/816 and unrelated deferred B items remain untouched. Do not merge automatically.

## Historical failed/preparation checkpoints (superseded by final evidence above)

The following are chronological records, not current status; earlier pending/failed statements are retained for audit.

## A22 attempt1 / correction checkpoint

Frozen SHA27778a43: lint PASS86.405s, typecheck PASS34.010s, unit2138 passed +2 existing skips PASS551.767s. Full integration FAILED: DB144 passed; server2048 passed/2 failed,25m43s total. No later gate ran. Raw ledger/logs: test-results/v46-814-A22-27778a43-*.

- A17: with only18 pre-existing messages, the35000-row skew makes the target a much larger table share than the earlier focused55028-row table. Planner flattened the lateral range into a whole-message Seq Scan; an ORDER BY/OFFSET0 experiment also failed. Final correction uses128-ID keyset pages inside one recursive SQL statement, keeping newest120 and all stale rows processed. No DB-query loop, planner flags, new index or bounded total deletion. The partial index supplies each page and primary keys supply the cursor/update. Added tied-time/empty/exact-page boundary and idempotence regressions for0/120/121/248/249/376 rows.
- Owner approved extra bot-reply-storage.int.spec.ts fixture correction: its10001 messages had only one nonnull reply pointer and therefore only one row in the partial index under test. Add10000 valid source messages and unique reply pointers, retain all index/Index Only Scan/no Seq Scan assertions and30s timeout. Finally ANALYZE the three affected tables after rollback, because statistics outlive rolled-back fixtures. No production reply change.
- A22 must restart at gate1 after the correction commit; attempt1 is not combined with a later SHA.

Post-correction focused combined suites:18/18 PASS (31.03s), including six new keyset edge cases and every original reply-storage assertion. Root lint8/8 (7 cached), typecheck8/8 (7 cached), unit6/6 tasks (5 cached; changed server tests executed) PASS before committing. Frozen retry will force all tasks again.

## A22 attempt2 / worker fixture exception

Frozen3b83b120: lint/type/unit2138+2skip PASS; integration DB144 PASS, server2055 PASS/1 FAIL (UAT-14 worker admission poll20s),35m49s. Both query-plan failures from attempt1 are resolved in this full sweep. No later gate ran. Old worker case passed20/20 consecutive standalone attempts (debug logs retained); original full-run cause is not conclusively established. Owner approved narrow fixture isolation/diagnostics. A concrete missing precondition was reproduced separately: inherited paused bot_schedule causes the identical admission poll failure. Snapshot/clear/restore bot_schedule, bot_control and bot_reply_settings fixes that inherited-paused reproduction while preserving the real5000ms worker deadline and all assertions/timeouts. Diagnostic on admission failure now captures control settings/job state/queue counts. Q5 evidence is20 original attempts + definitely wrong fixture precondition corrected + passing A22 still required; not a claim that the first full failure's exact cause was proven.

Worker correction proof: inherited-paused scenario5/5 PASS, each verifies paused setting restored after suite; real5000ms deadline retained. Root lint/typecheck/unit all PASS before commit (changed server tasks executed, other packages cached).

## External reboot / bootstrap ordering correction

Machine boot time2026-11-07T05:02:22Z (12:02 local) ended the frozen f64505aa runner and all original HOLD/private runtime PIDs. Attempt3 is INTERRUPTED_WITH_LOGGED_FAILURE, not green: gates1/2/3 passed, integration had already logged UAT-14 failure and BullMQ Missing key errors before reboot; no complete integration summary. Logs ended12:01:18. No agent stop/reset caused the reboot. PostgreSQL native data and Redis6379 were not altered by this work. Private Memurai6381 (nonpersistent), prototype4830 and local tax stub4831 restarted after verification. Prior HOLD process continuity cannot be claimed after external reboot.

Worker processors previously started during Nest bootstrap, before fixture Redis flush, allowing old jobs to run while their keys were deleted. Added a test-only bootstrap provider facade: production processor bootstrap methods run once after test state/reset, with real handlers/queues/services unchanged. No mocked business logic or runtime production change. Snapshot/restore control settings and diagnostics remain. Focused corrected worker PASS with actual5000ms deadline; final five inherited-paused repeats and fresh full A22 required. Runtime orchestration uses explicit reboot receipt/cold start rather than killing/reusing old numeric PIDs.

Final deferred-bootstrap proof: focused worker1/1 plus inherited-paused5/5 PASS, restoration verified each time; root lint8/8/typecheck8/8/unit6/6 tasks PASS (changed server tasks executed). No Missing key stderr in these focused runs.

## A22 attempt4 / approved D44 journey correction

Frozen85fb990e: all eight functional gates PASS: unit2138+2 existing skips; integration2200/2200 (server2056 +DB144); forced MSW/native build; MSW391+4 existing skips; native386+9 existing skips. Parity MSW:438 runner passes,78 existing unreachable skips,58 pixel-threshold-only results,8 approved Q1 prototype failures;492 fresh captures, no other capture failure. Native:82 runner passes,4 existing unreachable skips,48 pixel-threshold-only results,2 D44 capture failures;126 fresh captures. Attempt4 not complete/green.

An ignored orchestration status-parser bug misread the first generated report deletion as non-report after gate9 completed. Fixed only ignored path parsing and resumed gate10 sequentially with identical HEAD/source (no earlier command replaced). Incident retained in ledger. Gate10 then correctly exposed D44's native missing capture.

Owner approved changing the D44 journey on both sides to the exact Demo Day card's registration-list action, keeping Check-in-all drawer readiness, full-page scope and scroll. Native seed has7 real registrations, so the old full-label locator hit the filter rather than a full card. Generic inCard initially selected the whole grid because native cards are article elements; corrected local selector includes article and div, narrowing to the deepest matching card. No global helper/app/DB modification. Final focused MSW6/6 PASS; native4 helper passes +2 completed pixel-only captures (9.18%/42.42%), no missing capture. Actual images inspected: both draw the Demo Day drawer; counts/weekday/current-date hero/backdrop content differ. New native D43 threshold crossing8.44% is the same real-date/registration data: next upcoming hero is Nov18 in native vs Oct22 in frozen prototype, not a new layout defect. Other native over-threshold rows do not newly cross3%; all58 MSW over-threshold rows existed in preparation baseline (largest upward delta0.062pp). Final frozen retry required.

## A22 attempt5 / pending MSW persistence exception

Frozen d1b8a5eb: gates1-6 PASS (forced unit2138+2 skips; full integration2200/2200; lint/type/depcheck/forced both builds). Full MSW behavior390 passed/1 failed/4 existing skips: admin-affiliate-reference region read-only mobile assertion. No later gates ran; this is not DONE. Failure snapshot shows HAOPC with null region after page navigation, not a hidden responsive element. Investigation found financial snapshot restores seeded regional rows but not the six demo owners' group memberships, while region projection reads those memberships. Dedicated fresh-runtime regression reproduces2/2 failures; old E2E repeats are running, owner approval requested for narrow MSW snapshot/regression correction. No E2E assertion/backend/business rule changed.

Old Affiliate E2E standalone20/20 PASS (39.0s), so its full-run timing failure is not independently reproduced in those20. The fresh-runtime missing-membership unit defect is independently reproduced2/2. Pending regression is checkpointed locally under test-results/v46-814-regional-memberships.pending.spec.ts until owner approves the extra mock persistence scope; production/shared source remains unchanged.

## Approved MSW membership snapshot correction

Owner approved narrow snapshot/regression extension. A separate regional-demo-memberships module captures only six known fixture owners, validates user/group/status tuples and duplicate keys, and restores membership with the regional snapshot. Explicit empty/left state persists; unrelated user state is untouched. Older snapshots without the field reconstruct only missing known fixture membership, preserving existing explicit state; no payment/audit/outbox replay and no backend or E2E assertion change. Fresh-runtime baseline2/2 failed; corrected focused persistence suites46/46 PASS (7 files), including new4 regressions for all-owner regions, explicit empty/unrelated membership, legacy-wire left state and malformed-domain rejection before mutation. Full root checks and next frozen A22 pending.
