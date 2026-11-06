# TIP-V46-813 — IN PROGRESS

## Scope and environment

- Approved TIP: A1–A12 only; A13–A22 belong to814. Branch `feature/TIP-V46-813-debt-code`, TIP commits9098999c/7a165a82 on dev fd540d1d. No application/package/E2E code difference from dev before execution.
- Owner approved reuse of `opchub_v46_812_dev`, integration `opchub_v46_801_test`, Memurai6381; rolling restart ONLY the separate812 runtime to813 when ready. Original native PostgreSQL/Redis6379 and older HOLD remain untouched. Never run two outbox workers against the same DB during cutover.
- Q1–Q4 use explicit TIP defaults: retain module directory names; custom403 only three writes, not candidate GET; overlapping renewal send409 without queueing; joined-group technical cap1000.
- Q5 explicit provider override OR local HTTP stub is approved for tests; no environment-driven fake runtime. Q6 covers EVERY manifest domain denial branch, with additional rollback cases for rule8 domains.
- Additional owner approval: modify `apps/server/src/worker/processors/bot.processor.ts` narrowly to preserve original IntegrationError in terminal UnrecoverableError.cause. Necessary so WorkerFactory can inspect `reason` without string matching or changing retry/failure semantics.
- Additional owner approval: `apps/server/vitest.config.ts` excludes `**/*.int.spec.ts` from the unit project's broad audit glob; the integration project retains every integration case and its test-DB setup. This prevents the new A12 suite from running without DB-test guards.

## Baseline (before functional edits)

Source7a165a82 is application-equivalent to dev fd540d1d. Separate logs `test-results/v46-813-baseline-*` retain actual results; cached commands are labeled as cached.

|Gate|Current evidence|
|---|---|
|lint|8/8 PASS,8 cached; existing nine no-img warnings replayed|
|typecheck|8/8 PASS,8 cached, explicit valid build env|
|build|3/3 PASS,zero cache,3m2.083s; isolated `.next-v46-813-baseline`, no active Next dist overwritten|
|unit|6/6 PASS,3 cached,16m21.715s;2139 passed +2 existing skips|
|integration|Server2005 passed/1 failed (222 files),40m41s. Failure: newest100-replies interactive fixture exceeds5s (A16→814). DB standalone143/143 PASS,59.58s. Root stopped before DB; standalone execution is recorded separately.|
|MSW behavior|Full388 passed/1 failed/4 existing skips,25.2m. Affiliate mobile bulk-rate login timed out; unchanged focused replay1/1 PASS6.6s. Full result remains failed, not relabeled green.|
|depcheck|PASS:2489 modules/7553 dependencies and1143/5334; the latter includes three newly drafted integration files, not functional edits|

The first implementation edits are A6 comments only, after baseline build completed. They do not change rendered markup or server/integration behavior. Server/shared code remains unchanged while baseline integration runs. Final gates will be rerun after functional edits; no earlier checkpoint is substituted for a final result.

## A1–A12 progress

- A6: nine targeted next/no-img-element explanations in the seven approved files; preserve img, dynamic storage URLs and onError fallback. Focused Admin/Portal lint both exit0, zero warnings. Targeted existing regressions Admin23/23, Portal16/16 PASS.
- A1: membership-first seek and deferred group payload join, technical cap1000; one avatar batch and existing room/unread batches. Both named new regressions PASS, plus existing chat REST/contract regressions. Actual10000-group/10003-membership EXPLAIN has index seeks/no Seq Scan; see `TIP-V46-813-query-plans.md`. Scoped lint and server typecheck exit0. Focused A1/A7/A9 run31 passed/4 failed: the four failures were new A9 fixture cleanup FK constraints, not A1. Corrected exact-ID CustomerYear cleanup; subsequent A9+A12 run25/25 PASS.
- A8: shared audit-prefix helper used by capture/restore/schema; preserves affiliate, regional-share and regional-director audits, unrelated audit retained. Actual payout exposed a second boundary: its structured diff was rejected by the old strict snapshot schema. Preserve and validate JSON diff rather than dropping financial audit metadata. Focused23/23 PASS, shared typecheck/lint exit0; initial failed strict-diff run retained.
- A2: Prisma create-only targeted the approved private812 DB. Generated unrelated index/FK drops were removed before any deployment; the unapplied generated directory was renamed to20261114090000 so it follows811. Reviewed up SQL only drops unused `llm_configs`; down recreates the canonical empty table plus all four CHECKs and explicitly does not restore deleted data. Prisma generated successfully. Actual up/down executes only on a connection-local TEMP copy:6/6 focused DB PASS; full DB144/144 PASS after applying the migration to both approved isolated DBs. The811 encrypted-byte/config migration regression also PASS with independent legacy TEMP DDL. Old singleton model/schema/cache/service aliases removed; controller renamed AiSettingsController without route changes. Full white-DB chain remains A21→814, not claimed here.
- A3: runtime always uses Admin-configured LLM, with no NODE_ENV/env-driven fake. Retired env fields removed together from schema/example/test setup. Tests explicitly override LLM in bot-worker, bot-hide, persona-publication; bulk/runtime tests no longer set the retired env switch. Existing local HTTP stub paths retained. ADR8/9 updated. Focused A3/A4/A5 unit19/19 PASS; full integration still running to detect any additional missing explicit override.
- A4: optional denial metadata preserves existing permission keys, status and VIEW_ONLY/FORBIDDEN distinction; only three regional writes use the exact shared message, candidate GET remains generic. Matching MSW write guard preserves auth/password/2FA errors. Five-role real API matrix checks exact code/message and no denied audit; focused six-file run22 passed/1 new A5 fixture expectation failed, with all A4/A11/A9/A2 cases passing. That new A5 expectation was corrected to the actual IntegrationError provider-prefixed message, not a production change.
- A5: reason metadata only classifies unconfigured AI, not budget/auth/timeout failures; WorkerFactory follows a cycle-safe cause chain and logs only that class at debug. Approved BotProcessor extra preserves the cause while keeping UnrecoverableError/no retry. Six worker unit cases PASS; real Redis/BullMQ case proves failed state, attemptsMade1 despite attempts3, exactly one debug/no warn, no published message/no cursor advancement. Combined real worker + A12 replay34/34 PASS.
- A7: actual relay/processor replay twice creates one share and notification; industry child inherits parent region despite contradictory child metadata. Focused real DB regression PASS, including existing ledger cases. No direct fake relay or production change.
- A9: membership/fundraising self-referral and rounded-zero paths produce neither commission nor recorded event; full20-affiliate API page makes one batched region lookup, including child inheritance. New fixture cleanup deletes exact-ID CustomerYear rows before users; assertions and commission guards unchanged.
- A10: Bảo/director navigates every feed, notifications and regional tab without paywall/402. Initial focused run used the unchanged812 UI baseline (1/1 PASS14s); final rebuilt813 full MSW and native both include the passing new case. New helper only supplies the existing director credentials/session, never bypasses onboarding or fabricates auth.
- A11: nonwaiting transaction-scoped advisory lock returns409 RENEWAL_SEND_BUSY only for overlapping manual sends; no audit or delivery for the loser. Real HTTP two-Admin/30-recipient regression PASS: first200, overlap409, exactly30 mails/one app batch/one audit, later resend200 produces60 mails/two batches/two audits and retains30 same-day reminder records. Existing renewal suite also PASS in the focused six-file run. Extra `common/errors/app-error.ts` is the necessary one-line shared-code→409 HTTP mapping; existing Admin error toast handles the message without a UI behavior change.
- A12:20 actual manifest domains each have denied403/no audit/no outbox/unchanged state. Domain inventory is resolved from actual controller declarations, not a hardcoded estimated count. Ten additional audit-failure cases prove rollback for member lock, Admin lock, project approval, fundraising approval, store moderation, moderation/report+lock, affiliate rate/accrued commission, fee activation, director revocation/fee state and payout/payable shares. Real DB state/outbox/mail/audit assertions; only the audit boundary is fault-injected (`logMany` for actual bulk implementations, `log` otherwise).31/31 A12 PASS,34/34 combined with bot cases. Two small dedicated rollback-helper files are the TIP-authorized split, not production logic or a change to A14 AST scanning.

### Final gates underway (not substituted by baseline)

- Lint8/8 PASS,zero cache,zero warnings,2m40.115s.
- Typecheck8/8 PASS,zero cache,3m1.307s.
- Forced MSW build3/3 PASS,zero cache,2m3.958s, isolated `.next-v46-813-msw`.
- Forced native build3/3 PASS,zero cache,4m26.984s, isolated `.next-v46-813-native`.
- Unit6/6 tasks PASS,zero cache,15m52.106s:2130 passed +2 pre-existing integration-adapter skips. Breakdown:Admin574, Portal438, shared700, server248, integrations107+2skip, UI63. Compared with baseline, server243→248 and shared714→700 reflect intentionally retiring obsolete singleton DTO/env suites and adding the new regressions; no new skip.
- Depcheck r1 detected a type-only cycle between the two new A12 helper files. Shared interfaces moved into the existing cases file; r2 PASS:2489 modules/7559 dependencies and1147/5389. Dedicated follow-up lint/typecheck PASS. No dependency boundary was weakened.
- Full rebuilt MSW390 passed +4 unchanged skips (394),26.2m. Baseline388 passed/1 failed/4skip; the baseline login case now passes in this full run, plus the new A10 case. The first readiness-only failed invocation is retained separately.
- Native affected suite r1:27 passed/1 failed,7.5m; extra new-member send case failed to see the sent row. Its unchanged focused replay1/1 PASS16.1s. Then the complete same28-case suite reran unchanged:28/28 PASS4.6m. No retry flag, timeout, assertion or selector change.
- Affected parity:14 completed captures per lane,1440/390;7 within3% and7 above per lane, plus4 passing harness checks each. Raw runner11 pass/7 threshold failures in each lane. All over-threshold rows match accepted812 data/decision causes (no Zalo/owner805 defaults, provider data/D124/D135, regional financial data/D131); not application failure labels under D134. Paired app/prototype PNGs retained and measurements classified in [parity report](TIP-V46-813-parity.md). No new mask, crop, baseline or threshold. Owner reviews pairs in PR.
- Full integration r1: DB144/144 PASS; server2035 passed/13 failed (2048 tests,227 files), total44m11.766s. All13 are adaptation gaps: three old RBAC message expectations plus ten calls in four suites still relying on the retired implicit fake LLM. Baseline's A16 fixture timeout did not recur in this run. Original full result remains failed; not relabeled green.
- Owner separately approved the exact-three-route RBAC expectation update in `test/admin-account/rbac-matrix.int.spec.ts`; all status/code/permission/other-route assertions retained. Additional A3 explicit overrides, permitted by Q5: `test/bot/bot-reply.int.spec.ts`, `bot-reply-context.int.spec.ts`, `bot-auto-admission.int.spec.ts`, `test/dashboard/bot-threads.int.spec.ts`. No assertion changed. Repaired focused regression1099/1099 PASS across11 files,121.76s. All production/test code committed and pushed at `dea6ad2c37ed67eddcb0b514f1d2d4297044f537`; a full integration replay and closure gates are running on that code source. No concurrent integration run against the same DB.
- First final MSW invocation hit a runtime readiness race (Next port bound before login was ready, harness attempted a duplicate server and got EADDRINUSE); no tests ran. Both actual login endpoints returned200 before starting the recorded r2 full run. No assertion/timeout change or test deletion.

## Not complete

No DONE claim or merge yet. Full integration replay and final gate closure remain required; any draft PR is explicitly not ready for merge. Test timeouts/assertions are not relaxed; A14/A16 stabilization remains outside813.

## Code commits

|Item|Git commit(s)|
|---|---|
|A1|5b2e42b0|
|A2|c3cfc327|
|A3|d5a3a996,2ccc9b2c|
|A4/A11 shared error-contract implementation|dea6ad2c|
|A5|1d910ca3|
|A6|94b71569|
|A7|bb95d92b|
|A8|cfe6a8ba|
|A9|309f2bb0|
|A10|14aff77a|
|A12|6f0cdcd4,22bdcdb1|

These are actual Git commits, not binary/file hashes. Report-only commits do not change the runtime source under test.

## Native HOLD / restoration

- Only the approved separate812 API/socket/worker and Next were rolled to813. One outbox worker for `opchub_v46_812_dev`; API4310, socket4311, Portal3710, Admin3711, Memurai6381 DB3. MSW3930/3931 uses separate dist; no active dist overwritten.
- Original five older HOLD PIDs30056/31508/29416/31548/8664 all remain alive. Native DB and Redis6379 were not migrated, seeded, flushed or restarted. A2 deployment touched only private812dev and801test.
- After native testing: two identical private demo seed/count passes, original encrypted AI/App settings restored from an ignored813 snapshot, private DB3 cache refreshed. Counts:96 users,66 affiliates,51 referrals,53 commissions,65 fee periods,53 balanced shares,1 payout,50 year anchors,3 directors,5 bank transactions,17 stores; zero missing store slug/unbalanced share. AI providers originally all disabled; no external/live provider was enabled or called.
- Current813 server PIDs36320/35080/20736; Next27520/32496. Local PID/restoration evidence: `test-results/v46-813-private-hold.json`, `v46-813-original-hold-status.json`. Secrets/snapshots/runtime helpers/build outputs stay ignored, not committed.
