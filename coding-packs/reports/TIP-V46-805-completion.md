# TIP-V46-805 — Completion report

## Status: DONE — all non-pixel gates PASS; owner image review per D-134

Branch `feature/TIP-V46-805-renewal-reminders`, from dev `8deb0dd8`;
TIP checkpoint `97f792bb`. REQ-620 / REQ-204, BR-471–474, TC-471/472.
No merge, auto-merge or main push. Source **f2c364a5** committed and pushed; [PR #83 into dev](https://github.com/duymt-dev/OPCHUB/pull/83).
Final verification completed 05/11/2026, approximately 12:53 +07. Source remains f2c364a5;
cb6a2991 records the earlier evidence checkpoint. This report and final checklist are
committed/pushed in the final documentation checkpoint; no uncommitted source is HOLD.

## Implementation

- Admin Settings → Nhắc gia hạn: three independent milestone switches, two channels,
  explicit audited Save, permission `settings.mail`; no Zalo or real Web Push.
- Four validated endpoints: GET/PATCH `/v1/admin/settings/renewal`,
  GET `/v1/admin/renewal/members`, POST `/v1/admin/renewal/send`.
  Unknown schema keys return **400 VALIDATION_ERROR + fields** (owner approved);
  sending with both channels disabled returns **422 RENEWAL_NO_CHANNEL**.
- Shared VN-calendar D30/D7/D1 policy; trial/personal/business within days 1–30,
  excludes incumbent regional directors. Disabled/sent milestones do not replay older
  windows. Existing fee-status sweep, mandatory paywall and old Fees manual action remain.
- Scheduler: bounded 500-row keyset batches, concurrent claim through existing reminder PK;
  claim + mail requests + outbox in one transaction. Channels-off does not consume markers.
  App notifications use the existing real consumer, not a no-op/new provider.
- Manual selected/all send: eligibility filter, repeated same-day `M:yyyy-mm-dd` marker,
  last sent timestamp, bulk mail/outbox and Admin audit in one outer transaction.
  Manual markers do not consume automatic D30/D7/D1 markers.
- D30/D7/trial email content and D1 locally-generated EMVCo VietQR **text fallback**,
  bank/account/amount/`OPCHUB …` transfer content. **No embedded PNG/CID image**;
  this is the TIP-authorized fallback, not a claim that image rendering is implemented.
- Deferred payload joins, strict keyset cursor and covering/partial indexes; session-local
  10k-row EXPLAIN proof in [query plans](TIP-V46-805-query-plans.md).
- Small Admin components/hook/API module, explicit loading/error/empty states, contained
  mobile table scrolling, MSW contract/persistence and opt-in `--renewal` demo fixture.
  Ordinary seed and financial ledgers are not altered to copy prototype numbers.

## Owner-approved database/runtime changes

Only `opchub_v46_801_dev` / `opchub_v46_801_test`, Memurai **6381**, dev DB1/test DB2.
Original PostgreSQL 5432 PID5932 and Redis 6379 PID1244 are not restarted/reset/flushed.
Owner approved rolling the owned 804 API/socket/worker at 4300/4301 to 805.

1. `20261108085900_v46_renewal_milestone_check`: narrowly widen legacy CHECK to accept
   D30/D7/D1 and manual date codes, while retaining historical legacy values.
2. `20261108090000_v46_renewal_reminders`: collision-safe legacy marker mapping using
   latest sent time, default config without overwriting existing settings, two indexes.
   Legacy T+3 history is retained; the new job no longer sends post-expiry reminders.

Both private databases have deployed both migrations. Initial test deployment exposed
the old CHECK; the failed migration was marked rolled-back, the approved prerequisite
added, then deployment passed. The already-applied data migration was not rewritten.
No table/column/Prisma model change. SQL migrations were handcrafted for data/index/CHECK;
**`migrate dev --create-only` was not run**, rather than claiming an unused command.
Each has `down.sql`; rollback data mapping first, then CHECK. CHECK rollback uses
NOT VALID to retain existing manual history while enforcing legacy codes on future writes.
Rollback is supplied/reviewed, **not executed against the HOLD databases**.

## Verification evidence

All log names below are local ignored files under `test-results/`.

| Gate | Actual result | Log |
|---|---|---|
| lint final committed source | PASS 8/8; 6 cached +2 fresh; 3m5.956s, existing img warnings only | v46-805-lint-committed.log |
| typecheck final committed source | PASS 8/8; 6 cached +2 fresh; 47.109s | v46-805-type-committed.log |
| depcheck | PASS both FE/shared/E2E and backend graphs | v46-805-depcheck.log |
| root unit R1 | PASS **2,008 + 2 existing skips**, 6/6 tasks | v46-805-unit-r1.log |
| root unit final R1 | FAIL: Admin532 passed, seven fork-worker startup timeouts; no assertion failure | v46-805-unit-final.log |
| root unit final R2 | PASS **2,008 +2 existing skips**, 6/6 tasks, 5 cached + Admin fresh; 10m31.87s | v46-805-unit-final-r2.log |
| root build MSW final | PASS 3/3 forced tasks | v46-805-build-msw-final.log |
| native FE build final | PASS 2/2 forced tasks | v46-805-build-native-final.log |
| affected integration final | PASS **29/29**, five files | v46-805-int-scope-r4.log |
| full integration | PASS **1,967/1,967**: DB126/26 files + server1,841/203 files; 2/2 fresh tasks, 55m57.454s | v46-805-int-full.log |
| new MSW scope R2 | PASS **4/4**, before final visual polish | v46-805-e2e-msw-scope-r2.log |
| full MSW E2E final R2 | PASS **359 +4 existing skips**, 363 total, 15.8m | v46-805-e2e-msw-final-r2.log |
| native E2E final | PASS **4/4**, same assertions as MSW, final build | v46-805-e2e-native-final.log |
| final parity MSW R1 | 22 images: 12 passed / 10 above3%; two harness passed | v46-805-parity-msw-final.log |
| final parity native | New screen desktop2.79%, mobile23.53%; two harness passed | v46-805-parity-native-final.log |

Root commands use bounded concurrency for this machine, not relaxed assertions/timeouts:
`node node_modules/turbo/bin/turbo run test --concurrency=2 -- --maxWorkers=2`;
private env runner + `turbo run test:int --concurrency=1 -- --maxWorkers=1`, pool4.
MSW E2E uses four workers, production ports 3600/3601; native 3500/3501 forwards to
API4300/socket4301. Builds are separate `.next-v46-805-msw-v2` and
`.next-v46-805-native-v2`; both were healthy before testing and are not restarted mid-run.

### Baseline and corrected failures (not hidden)

- Before implementation: affected legacy integration **11/11** (not a full integration
  baseline); full MSW E2E **355 pass / 4 existing skips**, 359 total; baseline parity
  D-66–75: **9/20 images ≤3%, 11/20 >3%**, plus two harness tests passed.
- Targeted integration R1/R2 failures exposed encoding/test fixture leftovers and timestamp
  casts; repaired Unicode, isolated fixture cleanup and exact runtime SQL parameter types.
  R3 exposed a real candidate-500 sequential scan; production query was corrected,
  not the index/plan assertion. R4 **29/29** passed, all four plans use indexes.
- Initial MSW new-scope failures were mail-log listitem selector and the lecturer's wrong
  login fixture; corrected selectors/credentials, same behavior assertions, R2 **4/4**.
- Final full MSW R1 found the old price test asserting Admin Accounts immediately after
  Price. TIP805 deliberately inserts Renewal there. Test now requires **Price → Renewal →
  Admin Accounts**; price fields and every other assertion remain unchanged. R1 was
  explicitly interrupted after this known failure, not reported as a full pass; R2 ran
  from the beginning on the unchanged final build and passed359/4skip.
- Final visual polish corrected switch size, list heading size and visible mobile empty
  state. React purity lint was corrected with `useNow`, not disabled/suppressed.

Unit final R1 had seven **fork-worker startup timeouts**, not failed assertions.
The complete root suite was run again unchanged after build/native/parity load ended;
Admin115/115 files and548/548 tests passed, no worker errors. No timeout, isolation,
assertion or skip was changed. Final unit breakdown: shared657, server237, Portal407,
Admin548, UI56, integrations103 +2 existing skips. Full integration used pool4 to stay
within the native server connection budget; all203 server files completed in one run.
E2E baseline355/4skip became359/4skip through four new acceptance cases; no test removed.

## Acceptance trace

| Acceptance area | Evidence |
|---|---|
| VN days, three windows, disabled/no catchup | shared `renewal-milestone.spec.ts` (10), existing domain tests |
| Strict schemas/unknown keys/cursor/send union | shared `api-domains/renewal.spec.ts` (7), `renewal-admin.int.spec.ts` |
| Settings partial merge/audit/rollback/RBAC | `renewal-admin.int.spec.ts`, native/MSW save + unauthorized cases |
| Channels off / email only / app only / eligibility / concurrent job | `renewal-scheduler.int.spec.ts` |
| TC-471 no browser request; API422 | `renewal-tab.spec.tsx`, E2E no-channel, admin integration |
| TC-472 repeated manual/last sent/mail/outbox/audit/future D7 | admin integration, E2E send one + all |
| Send all25; keyset45/20 stable pages | admin integration |
| QR local fallback + escaping/trial wording | `templates-renewal.spec.ts` (2) |
| Marker migration collision/idempotence | admin integration migration case |
| No Zalo, loading/error/empty, explicit Save | Admin unit (5), E2E |
| MSW target/kind/channel/history persistence | shared mock renewal tests (3), same E2E assertions |
| Runtime list/keyset/candidates/count ≥10k | `renewal-plan.int.spec.ts`, linked full EXPLAIN |

## Parity / owner image review (D-134)

Final images measured at source **f2c364a5**. New screen: **1440 = 2.7908% PASS**,
**390 = 23.5272% above3%**; MSW and native measurements are identical.
[Desktop app](ui-parity/evidence/TIP-V46-805/renewal-1440-app.png) /
[desktop prototype](ui-parity/evidence/TIP-V46-805/renewal-1440-proto.png);
[mobile app](ui-parity/evidence/TIP-V46-805/renewal-390-app.png) /
[mobile prototype](ui-parity/evidence/TIP-V46-805/renewal-390-proto.png).

Images reviewed directly: panel spacing, switches40x22, heading15px and mobile empty
state corrected. Mobile reference differences are the pre-existing settings navigation
(future bank/PWA entries absent and AI placement), D-125 channel removal and real-data
empty list versus six prototype records. The E2E opt-in fixture separately proves a real
eligible row/send flow; no fake finance rows were added for the screenshot. No clipping
or new whole-page overflow observed; table scroll is contained when populated.

D-66 through75 comparison (percentage of pixels, baseline before805 vs final):

| ID | Width | Baseline % | Final % | Review |
|---|---|---|---|---|
| D-66 | 1440 | 5.6103 | 0.7012 | within3% |
| D-66 | 390 | 12.9222 | 9.9433 | existing nav/data differences; improved vs baseline |
| D-67 | 1440 | 0.4011 | 0.4228 | within3% |
| D-67 | 390 | 6.4582 | 5.9648 | existing nav/data differences; improved vs baseline |
| D-68 | 1440 | 0.4062 | 0.4280 | within3% |
| D-68 | 390 | 6.1549 | 5.6464 | existing nav/data differences; improved vs baseline |
| D-69 | 1440 | 2.8182 | 2.8411 | within3% |
| D-69 | 390 | 2.2629 | 2.9169 | within3% |
| D-70 | 1440 | 0.7655 | 0.8057 | within3% |
| D-70 | 390 | 15.2801 | 13.2395 | existing nav/data differences; improved vs baseline |
| D-71 | 1440 | 0.5822 | 0.6315 | within3% |
| D-71 | 390 | 14.7926 | 11.8443 | existing nav/data differences; improved vs baseline |
| D-72 | 1440 | 0.5822 | 0.6315 | within3% |
| D-72 | 390 | 17.2626 | 14.3459 | existing nav/data differences; improved vs baseline |
| D-73 | 1440 | 5.7467 | 0.8388 | within3% |
| D-73 | 390 | 12.6912 | 10.4402 | existing nav/data differences; improved vs baseline |
| D-74 | 1440 | 1.1383 | 1.1810 | within3% |
| D-74 | 390 | 1.7347 | 1.7195 | within3% |
| D-75 | 1440 | 6.8326 | 1.9409 | within3% |
| D-75 | 390 | 16.7370 | 13.5372 | existing nav/data differences; improved vs baseline |

Final stored reference: **12/20 old-screen images within3%, eight above3%**, versus
9/20 baseline; with the new screen, 13/22 within3% and nine above3%. The first final
measurement had D-74 desktop27.9090% because the screenshot caught the dimmed backdrop
without its animated dialog. Direct image review identified the incomplete capture.
Unchanged-source/unmodified-harness recheck of D-74: **1.1810% / 1.7195%, 4/4 tests
including harness passed**, complete dialog visually verified. R1 remains logged as
10 image failures, not rewritten to claim a single all-green run. No production dialog
code or mask/assertion/tolerance was changed to obtain the recheck.

No mask, pixel threshold or prototype
baseline changes. Default seed has zero eligible members versus six synthetic prototype
rows; do not fabricate six financial records to reduce pixels. D-125 removes Zalo and its
description. Existing settings navigation still lacks future TIP806/811 tabs and differs
in AI/SSO placement; these are baseline/out-of-scope, not silently implemented here.
Flag/globe follows approved D-133. Q-V46-805-1–4 and QR fallback are recorded in
[questions](ui-parity/questions.md). D-134 makes pixel failures reference evidence for
owner review, not permission to leave genuine new UI defects unfixed.

## Hard-rule review / scope

1. New/modified source files remain below caps; screen orchestrates extracted components.
2. Strict TS, no new `any`/ignore; external HTTP inputs/output use shared zod.
3. No cross-app or feature-internal imports; depcheck passed.
4. Backend permission key `settings.mail`, not role-name authorization.
5. No per-recipient DB loop; bounded batch pagination is intentional; four actual plans.
6. Existing realtime/outbox consumer reused; no recipient fanout query added.
7. Existing conditional fee transition sweep reused.
8. Claim/mail/outbox (and manual audit) share transaction; rollback/race tests.
9. Integer VND and timestamptz UTC; reminder windows use Vietnam calendar days.
10. Settings and manual-send audit in transaction.
11. Fake mail/provider adapters; local QR payload only; no external API/dependency.
12. No secret/new env variable committed; local runtime helpers remain ignored.
13. Tests are independent files.
14. Source f2c364a5 committed/pushed, evidence cb6a2991; final docs committed/pushed and
    clean worktree checked before the final DONE message. PR targets dev, owner merges.

## Native HOLD / remaining work

After native behavior/parity, `seed:demo --affiliate` ran twice and counts matched:
80 users /62 affiliates /51 referrals /53 commissions /65 fee periods /53 shares /
1 payout /50 customer-year anchors /3 incumbent directors; **0 unbalanced shares**.
These are **private DEV** counts only; test DB was not seeded or counted as HOLD.
Only dev cache6381 DB1 was flushed. Manifest `test-results/v46-805-hold.json` records
sourcef2c364a5, API/socket/worker PIDs26648/4984/26292, native Next4820/4208 and dist.
Original native PID5932 PostgreSQL and PID1244 Memurai remain live with their original
04/11 startup time. Owned services remain running, original native DB/cache untouched.
Native browser endpoints: Portal `http://localhost:3500`, Admin `http://localhost:3501`;
API `http://127.0.0.1:4300/v1/health`, socket4301. MSW endpoints3600/3601 also remain live.
All non-pixel gates are green. Owner reviews the linked images and merges PR into dev;
agent has not merged or enabled auto-merge.
Not implemented: QR PNG/CID, Zalo, Web Push, fundraising renewal flow, TIP806 bank settings,
TIP807 audit-wide work, TIP811 PWA; no dependency added.

Verification boundary: full MSW suite plus the four TIP805 native behavior cases, not
a claim of a full all-features native browser suite. Concurrent automatic job claims
and sequential repeated manual sending are tested; overlapping Admin manual requests
are not separately stress-tested. Mail-log persistence is proven by API/integration and
page navigation; existing marketing query-cache behavior is unchanged.
