# TIP-V46-811 — AI providers and application notification settings

**STATUS: IN-PROGRESS — full gates/native/parity still being finalized; not ready to merge.**

- Branch: feature/TIP-V46-811-ai-providers-app-notify, from dev a99a6de4 (PR88 merged).
- Approved TIP commit: 97221e1d. Source checkpoint / PR pending lint/type/unit completion.
- Owner explicitly approved private opchub_v46_801_dev/test, Memurai6381 (dev1/test2),
  rolling private810 services to811. Original DBs/Redis6379 are not migration/seed targets.

## Delivered scope

- Six encrypted provider records, strict shared API schemas/catalog, purpose allocations,
  one distinct retryable fallback, common temperature/token ceiling and Redis request limit.
- Actual HTTP adapter usage/latency callback and all-content PII transform; no SDK/fake runtime.
- Durable bigint monthly cost/token/call totals; epoch-fenced60s Redis spend cache. Warning
  is UI color only; bot stops at budget, other purposes use fallback and are still accounted.
- Metadata-only call journal, optional logging, indexed5000-row90-day retention. No prompts,
  completions, plaintext credentials or provider response errors in journal/audit.
- Admin provider grid/detail/allocation/limits draft-save, key last-four only, verification;
  no assistant row. Read-only purpose content/mod allocations await future consumers.
- App/PWA/push settings draft-save only; test publishes one in-app notification to acting
  Admin, never email/Zalo/Web Push. No manifest/service-worker/Portal behavior change.
- ADR0009 replaces only singleton part of ADR0008. Legacy llm_configs remains unchanged,
  no longer read at runtime. Old shared contract is retained for compatible imports.

## Evidence so far

| Gate | Actual evidence |
|---|---|
| baseline full MSW |379 pass/4 skip25.3min; v46-811-baseline-e2e-r2.log |
| baseline bot/settings int |196 pass/1 failed (41files); v46-811-baseline-int-r2.log;10k-message fixture expired5s transaction at5467ms |
| isolated baseline scan |4/4 PASS,46.9s; v46-811-baseline-scan-alone.log; no assertions/fixture/timeouts changed |
| shared new |8/8 PASS; v46-811-shared-test.log |
| existing API key/verify tests |7/7 PASS; initial runtime case needed updated new allocation contract (see history) |
| new router/runtime/settings |13pass/1 failed first run; failure was new test using wrong Prisma outbox model name, not production; fixed app3/3 in next batch |
| additional int batch |8/8 PASS (app3, migration1, plan1, actual bulk worker3); v46-811-more-int-r1.log |
| service isolation after cycle fix |14/14 PASS; v46-811-service-isolated.log |
| full integration |first attempt aborted after new dependency-cycle finding and14 skipped service cases; fresh r2 running, no full PASS claim |
| typecheck |8/8 PASS,1m0.35s; v46-811-type-r3.log; final server revision also PASS (server-type-final.log) |
| lint |8/8 PASS2m14.243s; v46-811-lint-r5.log; final server router/projection scoped lint PASS |
| full unit |PASS2123 +2skip,6/6 tasks15m3.58s; v46-811-unit-r2.log; final UI/MSW6/6 and shared8/8 scoped reruns PASS |
| depcheck |r2 both graphs PASS:2461modules7463edges +1135modules5311edges; v46-811-depcheck-r2.log |
| root MSW build |3/3 PASS; v46-811-build-msw-r1.log; Admin visual revision being rebuilt |
| native build |initial Portal/Admin PASS; final visual source will be rebuilt |
| MSW behavior scope |7/7 PASS (AI2/App2/price3); v46-811-msw-scope-r1.log |
| native behavior |pending AI/App/bot-replies |
| parity reference D134 |MSW final AI1440/390:3.5965%/10.2148%; App11.9794%/3.5642%; data/D124/Q1/legacy nav deviations pending final native review; no threshold changes |

## Acceptance mapping

| Criterion | Evidence / remaining |
|---|---|
| migration old enabled config |ai-migration.int.spec.ts exact data/check/index SQL on connection-local copy; encrypted key opens identically, URL/model/tokens/timeout/routing preserved; down retains legacy |
| save/mask/blank retains/audit |adapted llm-config int7cases, ai-settings.int.spec.ts, MSW2tests; no raw key stored in browser persistence |
| verify actual HTTP/status |existing actual stub key/model/auth/status tests retained, new API200 per TIP; identical E2E both widths (native pending) |
| D124 no assist |strict use schema, shared/API/UI/E2E reject or hide assistant |
| route by purpose |ai-router actual distinct HTTP stubs, durable purpose/provider records |
| retryable fallback |503/429 one distinct fallback;401 no fallback; journals error/fallback |
| budget |1000/500 tokens at10000/30000 =>25VND, totals50, bot stopped, script fallback; budget0 unlimited |
| log false |no extra llm_calls but durable usage75VND; no content columns |
| retention |housekeeping aiCalls89/91-day and idempotence test; full gate running |
| PII |shared phone/email/account/member-code tests; actual outbound history/persona/topic masking and pii=false |
| parameters |actual JSON temperature0.7/max_tokens32 even caller asks1024 |
| app settings |API default/partial/all-off/audit/permission400fields413; UI draft-only; identical E2E F5 and bell |
| permissions |settings.general backend403/unauth401; nav filters existing TAB_KEY |
| tab order |AI after SMTP; App after bank, existing SSO/languages kept last; price regression3PASS |
| bot regression/no fake/rate |runtime/bulk worker tests retained through new router; full bot gate running; native reply pending |
| parity |D-V46-AI/APP1440+390 captured, actual differences under refinement |

## Migration/query safety

Prisma create-only generated in ignored staging history copy, with interactive TERM.
Reviewed generated unrelated DROP FK/index drift and excluded every unrelated statement.
Only20261113090000_v46_ai_providers deployed to both approved private DBs (exit0).
No reset, old migration/checksum/history rewrite, native DB access or new dependency.
Adds3tables/index/CHECKs, six fixed rows and2settings; enabled encrypted legacy config
copies to custom. Bigint aggregate totals follow database standard. Pricing remains
integer VND; API conversion rejects unsafe integer totals.

[Actual10k-row plans](TIP-V46-811-query-plans.md): exact production retention/upsert SQL,
cloned real indexes, no planner forcing. Retention created_at/id index and primary join;
monthly upsert conflict PK, no Seq Scan. One set-based six-provider update, no SQL N+1.

## Resolved findings / honest history

- Baseline command initially passed an extra double-dash to pnpm script, unintentionally
  selecting all integration files. Stopped only verified own test process and ran explicit
  vitest exec/filter instead. Both logs retained, not claimed as completed full gates.
- Baseline10k fixture timeout passed isolated4/4 unchanged. No legacy fixture repair claimed.
- New app test initially referred to nonexistent db.outbox instead of outboxEvent; corrected
  test to inspect the actual model, preserving no-external-outbox assertion. App3/3 passed.
- New unit files initially used jest-dom matchers absent from this repo; replaced with exact
  DOM attribute/value assertions. TanStack passes a mutation context argument: verify exact
  first submitted body rather than incorrectly expecting only one callback argument.
- Existing adapter429 retryability assertion was intentionally updated to true because811
  explicitly adds429 fallback;401/400 remain nonretryable, no automatic adapter retries.
- Existing runtime disable fixture now clears purpose allocation and keeps an unused
  provider enabled, because new API forbids all-off and disabled targets. Exact new unset
  error asserted; no-network/key-rotation/rate-ceiling assertions retained. Bulk worker
  factory adapts configuration only; existing worker assertions unchanged.
- App test notification dependency exposed settings/index exporting SettingsHttpModule,
  making settings->notification->mail->settings a cycle. Removed only HTTP barrel export;
  API bootstrap imports HTTP module directly, domain public index retains core services.
  No forwardRef, rule waiver or cross-domain internal service import. Depcheck now PASS.
- First full int run had14 service tests skipped at suite setup; aborted own test process
  to correct the graph instead of waiting for a known incomplete gate. Exact setup cause
  not captured before abort; not claimed proven from the cycle. Isolated service14/14
  passes afterwards; full fresh r2 remains required.
- Initial parity: AI10.5492%/18.4919%, App12.8606%/5.9458%. Fixed real card separation,
  detail field columns/footer/save placement, App boxed PWA/type list, font/spacing/icon.
  Final measurements/screenshots pending, no fake PASS/masks/tolerance changes.

## Explicit defaults / limitations

Q811-1..7 use the approved TIP defaults, not invented owner D-xx approvals: per-provider
input/output prices default0; OpenAI-compatible HTTP only (Gemini /v1beta/openai);
content/mod stored only; warning only color; budget stops bot but fallback can still
spend for other purposes; journal stored90days without viewer; App configuration has
no Portal effect; both tabs save explicitly. Unknown future usage is checked before
requests, not reserved: concurrent in-flight calls can cross the configured budget.
No real-key @live provider run claimed (no key supplied for this task).

## Native HOLD / hard-rule review

Private810 HOLD remains until authorized811 rolling restart; final manifest/demo reseed,
counts/smoke and current PIDs will be recorded. Original PostgreSQL/Redis6379 remain untouched.
Rules1–14 review pending final source checkpoint: modular separate tests/shared schemas,
backend permission keys, bounded indexed SQL, conditional bot transitions/outbox unchanged,
no chat fanout/financial policy changes, integer VND/UTC, all four Admin actions audited,
only adapter HTTP/local stubs, no new dependencies/secrets/env, scoped commits/push/PR.
