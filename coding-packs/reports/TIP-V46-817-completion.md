# COMPLETION REPORT — TIP-V46-817

**STATUS: PARTIAL — native verification blocked.** Implementation and all executed
functional gates passed. Native 817 E2E/parity has not run because the environment
rejected stopping the owned 816 runtime. This is **not** a DONE/merge-ready declaration.

- Branch: `feature/TIP-V46-817-ai-ops`, base `dev` `7d5f8f0e`.
- Implementation: **`fb0ecf62`**, committed with normal hooks and pushed to origin.
- Draft PR to **dev**: [#102](https://github.com/duymt-dev/OPCHUB/pull/102).
- Scope: D-138, B3 AI metadata log/export, B4 compose/moderation, B5 budget operations.
- No real AI invocation is authorized or used by 817 tests. HTTP providers are
  loopback stubs. Existing real provider credentials are not copied into reports,
  changed, or used by the native E2E fixture.

## Implementation and owner decisions

- Atomic Redis cost reservations use tokenized leases, epoch fencing and a 900s
  protective TTL. Successful durable accounting precedes lease release; accounting
  failure retains the lease and does not replay a paid request. Free requests do
  not unnecessarily invalidate the spend epoch.
- Budget warning/exhaustion claims and events commit together. Settings/month-row
  lock order is consistent; raising budget/threshold rearms notifications. Owner
  approved an outbox-event suffix on the stable month/type prefix, so replay is
  deduplicated while a later rearmed warning still arrives.
- Model override applies to the primary provider only. Fallback uses its own model.
  Existing saved provider models are not migrated to new catalog suggestions.
  The provider's existing select also retains an option for an older/custom saved
  model, so a catalog refresh cannot misleadingly display the first new model
  while silently saving the old one. The draft/save unit case covers this; the
  E2E fixture also checks its saved noncatalog model stays visibly selected.
- Metadata-only keyset log, bounded totals and audited asynchronous CSV export;
  exact microsecond cursor, short actor IDs, BOM/formula-safe CSV and VN timestamps.
- Exactly three compose entry points: store introduction, project summary,
  Marketing email body. Suggestions require explicit acceptance; no autosave or
  automatic replacement. Store field is actually `wizard/step-media.tsx: intro`
  (input bound remains 4,000; suggestion bound 500), not the unrelated SEO field.
- Compose: shared strict input schema, backend fee/permission checks, 10/hour per
  actor/realm and global router 60/minute. Redis failures fail closed.
- Moderation defaults off, runs after member send, masks PII and validates strict
  JSON. Confidence ≥0.8 creates a review case only; no automatic hide, violation or
  lock. Existing keyword enforcement remains unchanged. Owner approved a durable
  message-PK claim ledger because call logging can be disabled and nonviolations
  create no report. Claims cascade when their messages are physically deleted.
  A transient provider failure is not retried through another provider for this
  message; budget refusal may select fallback before any HTTP request is made.
- Admin notifications use existing in-app/outbox/push intent machinery; no email.
  Links use the actual AI settings tab `/settings?tab=llm`.

## Technical file-list adjustments

Independent small service/repository/query/UI/hook files preserve module/file caps.
Additional narrow connections beyond the TIP's illustrative file list include:
`packages/integrations/src/errors.ts` (safe reason codes), the Chat Prisma relation
for the approved claim FK, worker processor/module registrations, socket-resolvable
ModerationCore → LlmConfigCore dependency, shared UI barrel, and two entries in the
Admin audit route manifest. Old runtime tests construct the new reservation/alert
dependencies; their original behavior assertions remain. The router fixture's
input/output prices preserve its original actual 25 VND result while allowing the
new worst-case output reservation.

MSW models the same APIs without production stubs. Its synthetic AI metadata is
session-scoped across reloads, schema-validated on read; no prompt/body is stored.
New short Selects expose nonvirtual options to assistive technology. The native
fixture uses only an unused disabled/keyless provider, restores public settings,
then clears only its own unchanged test ciphertext using an MD5 guard. It never
overwrites the existing `custom` real credential or enables the bot.

## Verification

Final reruns finished on 08/11/2026. Local evidence is under
`test-results/v46-817-*`; raw local logs are not committed as a substitute for the reports.

| Gate | Evidence so far |
|---|---|
| `pnpm lint` | **PASS**, 8 tasks successful, `v46-817-lint-final.log`. |
| `pnpm typecheck --env-mode=loose` | **PASS**, 8 tasks, mocking=msw, `v46-817-typecheck-final.log`. |
| `pnpm test` | **2,209 passed**, 2 existing adapter skips, 6 tasks successful; `v46-817-unit-final.log`. |
| Final `pnpm test:int`, approved test wrapper | **2,116 server +144 DB =2,260 passed**, 240+29 files, 2 tasks successful, 37m38s; `v46-817-int-final.log`. |
| `pnpm depcheck` | **PASS**, both FE/shared and server boundaries; `v46-817-depcheck-final.log`. |
| Integration full first run | DB 144 passed; server 2,113 passed / 2 failed, 240 files. Compose Redis-failure handling and a preexisting Push fixture login failed. Not reported as PASS. |
| Targeted rerun | 30 passed across 9 suites, moderation beforeAll failed login (7 not executed). After isolating the new fixture's auth state: compose/moderation **11/11 passed**, including concurrent claim and no physical moderation retry. |
| MSW new journey, rebuilt final UI | **2/2 passed**, both widths; explicit acceptance, CSV and dialog no-overflow assertion. |
| Full MSW behavior regression | **395 passed, 5 existing skips**, 25.5m, no failure. This full run used the preceding MSW build; the bounded log-drawer CSS correction was then verified separately on the rebuilt final UI (2/2 above). |
| `pnpm build --env-mode=loose`, MSW and native | **PASS**, 3 tasks each; final native rebuild 27.8s. `v46-817-build-msw-final.log`, `v46-817-build-native-final.log`. |
| Migration chain | PASS, 104 migrations, both 817 down/up pairs and identical schema. |
| SQL plans | Actual before/after measurements in linked report. |
| MSW parity | Six paired captures +4 harness checks; raw 3 above/3 below 3% reference. D-134/D-138 classifications and images supplied, no masks/threshold changes. |
| Native E2E | Not yet run on 817: private rolling restart command rejected before stopping any service; owner manual action requested. |

The old Push subscription suite passed all five tests on its isolated rerun. Its
full-run failure occurred while obtaining a login token, before device cleanup.
Owner approved isolating that existing suite's auth fixture. Exactly
`push-subscriptions.int.spec.ts` now calls the existing `flushAuthState` before
each case; no assertion, timeout, authentication or production rate limit changed.
The final full integration rerun included this approved change and passed all
five Push subscription tests, all four compose tests and all seven moderation tests.
It logged one non-failing BullMQ `write ECONNABORTED` during the worker consumer
registration suite; both tests and Turbo's two tasks passed. This warning is
recorded, not silently converted into a failed/passed test count.

**PowerShell host status:** the integration tool session returned outer exit 1
despite all 2,260 tests and both Turbo tasks succeeding. The invocation redirected
native stderr using Windows PowerShell `*>` without an explicit exit statement.
A harmless reproduction (`node` writes stderr and deliberately exits 0) produced
the same outer exit 1; capturing `$LASTEXITCODE` and explicitly `exit`ing it
returned 0. This establishes a shell-status reporting artifact, not an additional
failed assertion. The test counts/task success above come from the real run; no
claim is made that its outer session returned 0. Future invocations must preserve
the native exit code explicitly. Probe logs: `v46-817-powershell-stderr-probe*.log`.

### Acceptance evidence on the final implementation

| Criterion | Test/evidence |
|---|---|
| Five concurrent slow calls / one budget slot, release/expiry/idempotency, accounting fail-closed | `ai-budget-reserve.int.spec.ts` **5/5** |
| Concurrent warning/exhaustion, real relay/replay, permission recipients, rearm | `ai-budget-alert.int.spec.ts` **2/2** |
| Actual primary override and fallback default model | `ai-model-per-purpose.int.spec.ts` **1/1** |
| 120-row filtering, microsecond keyset, totals, CSV BOM/audit, permission and range rejection | `ai-calls-log.int.spec.ts` **2/2** |
| PII masking, metadata only, output sanitization, 10/hour, 409/400/413/403/402/503 | `ai-compose.int.spec.ts` **4/4** |
| Member enqueue, concurrent durable claim, invalid/low-confidence skip, switch off, no automatic punishment or physical retry | `ai-moderation.int.spec.ts` **7/7** |
| Existing AI/router/settings/runtime, keyword and architecture contracts | Full integration +263 server unit tests, including outbox consumer coverage |
| Explicit model save, preserve saved noncatalog model, accept/dismiss suggestion | Admin AI unit **3/3**, shared UI button **2/2** |
| Desktop/mobile model save, explicit rich-editor replacement, log filters/CSV and no-overflow | Final new MSW E2E **2/2**, screenshots in parity report |

- [Actual SQL plans and migration-chain evidence](TIP-V46-817-query-plans.md).
- Migration `--create-only` was attempted on the approved private development DB
  but failed at DevDiagnostic process-termination permissions. No reset was used.
  Read-only schema diff plus reviewed SQL/down scripts supplied the migrations.
- Both private reused DBs deployed both immutable migrations successfully.
- Fresh chain DB: 104 migrations → two 817 downs → two ups → identical schema;
  owned chain DB dropped afterwards. No HOLD/native DB down or reset.
- Initial unit/E2E failures were genuine fixture/accessibility defects and are
  retained in local investigation history, not represented as passing runs.

## Catalog sources checked 08/11/2026

Suggestions are not a promise that a particular gateway exposes upstream models;
all model inputs remain editable. USGate has no verified public model catalog,
so it retains only `auto`; custom has no fabricated suggestions.

- [Anthropic model overview](https://platform.claude.com/docs/en/models/overview):
  Sonnet/Opus/Haiku 5.5 suggestions.
- [OpenAI GPT-4.1 reference](https://developers.openai.com/api/docs/models/gpt-4.1)
  and [deprecations](https://developers.openai.com/api/docs/deprecations): retain
  existing GPT-4.1 family suggestions rather than changing customers' saved models.
- [Google supported models](https://firebase.google.com/docs/ai-logic/models?api=dev):
  Gemini 3.8 Flash, 3.5 Flash-Lite and 4 Argon suggestions.
- [DeepSeek API reference](https://api-docs.deepseek.com/quick_start/pricing):
  `deepseek-flash` and `deepseek-v4-pro` suggestions.

## Boundaries / review

- No new paid provider, stack/dependency upgrade, production deployment or real
  AI smoke run. Moderation remains opt-in.
- Estimates are approximate; reservations may conservatively refuse a request.
  At-most-once moderation deliberately prefers a missed review after a crash over
  a repeated billable classification. Metadata retention remains 90 days.
- New D-138 UI has no prototype equivalent. Paired legacy captures and new desktop/
  mobile screenshots require D-134 classification and owner image review in PR;
  a decision-approved difference is not a functional failed test.
- PostgreSQL 5432/native DB and Redis 6379/original HOLD are preserved. Only the
  owner-approved private runtime may roll from 816 to 817.

## Git handoff

Implementation `fb0ecf62` and evidence are pushed to draft [PR #102](https://github.com/duymt-dev/OPCHUB/pull/102),
base **dev**. The final response supplies the report commit SHA and clean-tree result.
No merge, auto-merge, main push or production deployment was performed.

## Required next action

The owner must first stop the five identified owned 816 processes (the manual
request is pending). Then start the approved private 817 API/socket/worker and
Next builds on their existing ports, run native `admin-ai-ops.spec.ts` with
`SKIP_SEED=1`, and repeat scoped native parity. Preserve the existing real custom
credential, keep bot automation off and restore the unused-provider stub fixture.
Do not replace native evidence with the still-running 816 service results.
Only after these gates and report updates should the PR become ready/DONE.
