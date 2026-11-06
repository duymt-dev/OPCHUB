# TIP-V46-811 — AI providers and application notification settings

**STATUS: DONE — required gates PASS; parity measured as reference under D-134. PR90 into dev; owner review/merge required.**

- Branch: feature/TIP-V46-811-ai-providers-app-notify, from dev a99a6de4 (PR88 merged).
- Approved TIP commit: 97221e1d. Core source b36acf04; [PR90](https://github.com/duymt-dev/OPCHUB/pull/90), base dev. Final runtime/native source04a01e8c; mobile-only layout39390b53. Both pushed. Final refinements/evidence follow below.
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

## Final gate evidence

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
| full integration |Final fresh r3 PASS2131/2131: DB126(26files) + server2005(222files),2/2tasks32m23.727s; v46-811-full-integration-r3.log; backend frozen04a01e8c throughout, final FE-only39390b53 does not alter integration runtime |
| typecheck |Final root8/8 PASS34.224s, v46-811-type-mobile-final.log; MSW build env explicit. Earlier invocation lacked API_INTERNAL_URL with local off default; operational env corrected, no source relaxation. |
| lint |Final root8/8 PASS1m39.132s; v46-811-lint-mobile-final.log; existing img warnings only |
| full unit |PASS2123 +2skip,6/6 tasks14m7.494s; v46-811-unit-final.log (Admin565/server239/shared712/Portal437/UI63/integrations107+2skip) |
| depcheck |Final both graphs PASS2463modules7476edges +1135modules5312edges; v46-811-depcheck-delivery.log |
| root MSW build |Final root3/3 PASS33.976s, v46-811-build-mobile-root.log; both final Admin modes separately build PASS (native/mobile + msw/mobile). No active HOLD dist overwritten |
| native build |Portal .next-v46-811-native PASS; final Admin .next-v46-811-native-mobile PASS; actual Next processes use these paths |
| MSW behavior scope |Full381pass/4skip26.0m, v46-811-full-msw.log; final8/8 PASS1.0m, v46-811-final-msw-scope.log after last mobile layout (AI2/App2/price3/bot1). Full suite precedes final narrow refinements, not falsely claimed full-final rerun |
| native behavior |Final5/5 PASS1.9m, v46-811-final-native-scope.log; actual HTTP stub, exact AI/App/bot assertions at source39390b53 |
| parity reference D134 |Final39390b53: MSW AI3.5032%/8.5442%, App11.9794%/3.5642%; native AI3.5028%/8.5432%, App11.9794%/3.5642%; each raw run4 comparisons fail +2 harness pass. Reference only, not <=3% PASS |

## Acceptance mapping

| Criterion | Evidence / remaining |
|---|---|
| migration old enabled config |ai-migration.int.spec.ts exact data/check/index SQL on connection-local copy; encrypted key opens identically, URL/model/tokens/timeout/routing preserved; down retains legacy |
| save/mask/blank retains/audit |adapted llm-config int7cases, ai-settings.int.spec.ts, MSW2tests; no raw key stored in browser persistence |
| verify actual HTTP/status |existing actual stub key/model/auth/status tests retained, new API200 per TIP; identical E2E both widths (native4/4 PASS) |
| D124 no assist |strict use schema, shared/API/UI/E2E reject or hide assistant |
| route by purpose |ai-router actual distinct HTTP stubs, durable purpose/provider records |
| retryable fallback |503/429 one distinct fallback;401 no fallback; journals error/fallback |
| budget |1000/500 tokens at10000/30000 =>25VND, totals50, bot stopped, script fallback; budget0 unlimited |
| log false |no extra llm_calls but durable usage75VND; no content columns |
| retention |housekeeping aiCalls89/91-day and idempotence test; full2131/2131 PASS |
| PII |shared phone/email/account/member-code tests; actual outbound history/persona/topic masking and pii=false |
| parameters |actual JSON temperature0.7/max_tokens32 even caller asks1024 |
| app settings |API default/partial/all-off/audit/permission400fields413; UI draft-only; identical native/MSW E2E F5 and bell PASS |
| permissions |settings.general backend403/unauth401; nav filters existing TAB_KEY |
| tab order |AI after SMTP; App after bank, existing SSO/languages kept last; price regression3PASS |
| bot regression/no fake/rate |runtime/bulk worker tests retained through new router; full2131/2131 PASS; native reply PASS via actual HTTP |
| parity |Final pairs/raw diffs for D-V46-AI/APP1440+390 in both modes, layout reviewed and corrected; D134 reference owner review remains |

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
  passes afterwards; fresh r2 failed three late-added assertions against observed old behavior; final fresh r3 passes all2131.
- Initial parity: AI10.5492%/18.4919%, App12.8606%/5.9458%. Fixed real card separation,
  detail field columns/footer/save placement, App boxed PWA/type list, font/spacing/icon.
  Final paired measurements recorded below; no fake PASS/masks/tolerance changes.

## Explicit defaults / limitations

Q811-1..7 use the approved TIP defaults, not invented owner D-xx approvals: per-provider
input/output prices default0; OpenAI-compatible HTTP only (Gemini /v1beta/openai);
content/mod stored only; warning only color; budget stops bot but fallback can still
spend for other purposes; journal stored90days without viewer; App configuration has
no Portal effect; both tabs save explicitly. Unknown future usage is checked before
requests, not reserved: concurrent in-flight calls can cross the configured budget.
No real-key @live provider run claimed (no key supplied for this task).

## Native HOLD / hard-rule review

Private811 rolling restart complete, source39390b53. Approved DB pair and Memurai6381 retained. Original PostgreSQL5432 PID5932 and Redis6379 PID1244 unchanged; private MemuraiPID20340. API4300/socket4301/worker PIDs30056/31508/29416; native Portal3700/Admin3701 PIDs31548/8664. MSW3920/3921 PIDs8800/5228. Verified owned commands before every replacement; no native-original services stopped. Only unused owned HTTP stub17440 was stopped after tests.

Two post-test demo seeds --affiliate --stores produce identical counts:96users,62affiliates,51referrals,53commissions,65fee periods,53regional shares,1payout,50customer-year anchors,3directors,5bank transactions,17stores; missingSlugs0/unbalanced0. AFTER final seed, original AI/App settings and encrypted credentials restored and cache flushed. Six endpoint/SSR/privacy smokes plus authenticated AI/App GETs PASS. Journal contains17 successful native HTTP bot calls with UUIDv7 IDs (not17 tests). No audit/outbox/journal cleanup to hide test effects.

Native distributions: Portal .next-v46-811-native, Admin .next-v46-811-native-mobile. Baseline809/810 Next processes and prototype server preserved. Local full logs, encrypted snapshot and PID manifests remain ignored under test-results; sanitized final HOLD manifest is attached separately.


## Final refinement evidence / operational rerun history

- Resource UUIDs, including all-digit12-character tails, must survive PII masking. Shared masking tests retain email/phone/STK redaction and now assert exact UUID preservation. Native recorded4 successful custom-provider bot calls, all UUIDv7, actual HTTP (model native-reply-stub); no prompt/body stored.
- Call IDs now use Prisma UUIDv7 default rather than explicit crypto.randomUUID. Client generated again; SQL migration unchanged. Migrated legacy fixture now proves actual HTTP URL/model/decrypted Authorization, not merely byte equality (1/1 PASS, v46-811-migration-http-final.log).
- First native reply failed because demoReset overwrites app_settings after external fixture configuration. e2e/llm/reply-provider-setup.ts configures the real private development router AFTER reset, closes the HTTP stub in finally. Original chat/quote/F5/privacy assertions and timeouts unchanged; native1/1 and identical MSW1/1 PASS.
- Last palette review corrected USGate blue and custom + icon/gray to actual prototype values, not data normalization. Dedicated Admin palette builds initially omitted build-time native API_PROXY_URL and MSW NEXT_PUBLIC_PORTAL_URL: native login proxied4000 and MSW affiliate bridge returned503. Raw failed runs retained. Rebuild with correct4300/3920 targets; no auth assertions, application behavior or timeouts changed.
- One scoped command omitted the correct admin-price-config filename and workers2; corrected final command includes all8 cases. Earlier variadic --project command was corrected to --project=behavior. Neither mistaken invocation counts as a green gate.

- Full integration r2 completed: DB126/126; server2002pass/3fail,222files,60m32.62s. Two failures are new ceiling assertions observing successful fallback; one observes alphabetical provider order. The run started10:18 before runtime corrections10:30 and test additions10:36. A fresh process at final source passes all8 tests across router/settings/migration (v46-811-ai-final-scope.log,16.50s). Stale transform/module caching is inferred from observed old behavior, not asserted as a separately proven mechanism. Final full fresh r3 passed all2131 with backend source frozen. No assertions/order expectations/rate ceilings weakened.
- Final mobile paired review corrected count-under-intro and verify-below-status; AI UI2/2 PASS, root lint/type/build and native5/MSW8 PASS. D134 remaining raw differences are still reported, not treated as <=3%.

## Final parity review (reference D134)

| Screen / width | MSW | Native |
|---|---:|---:|
| AI1440 |3.5032%|3.5028%|
| AI390 |8.5442%|8.5432%|
| App1440 |11.9794%|11.9794%|
| App390 |3.5642%|3.5642%|

Actual matched pairs: [MSW AI mobile](ui-parity/captures/TIP-V46-811-msw-D-V46-AI-390.app.png), [prototype](ui-parity/captures/TIP-V46-811-msw-D-V46-AI-390.proto.png), [native App desktop](ui-parity/captures/TIP-V46-811-native-D-V46-APP-1440.app.png), [prototype](ui-parity/captures/TIP-V46-811-native-D-V46-APP-1440.proto.png). All16 app/prototype PNGs and8 raw diff PNGs retained, ledgers tagged39390b53 by the actual harness. No masks, crop manipulation, threshold or screenshot assertion weakening.

Corrected real grid/spacing/card/footer/mobile and catalog palette defects. Remaining major geometric/data differences are explicit TIP/D decisions: D124 removes assistant allocation (one entire row); Q1 adds two price inputs; secure default six providers off/zero spend versus filled prototype2 enabled/3.18m; status/key/model details differ by fixture; native current month versus prototypeOctober; D33/TIP keeps desktop SSO/language tabs (page1065 versus prototype948, padded full-page background dominates App desktop diff); previously owner-kept country flag versus globe. Raw whole-page comparison still fails and is not called visually identical. Owner should review pairs under D134.

## Hard rules / quality-gate final review

| Rule | Review |
|---|---|
|1,13 structure/tests|Modular domain repositories/services, extracted UI/hooks/types, tests separate; lint max-lines/max-function-size passes. No legacy monolith expanded.|
|2 schemas/strict|Shared zod on settings and provider responses; no any/ignore/typecheck waiver; strict typecheck8/8.|
|3 boundaries|Domain in server/modules, public contracts shared, no cross-app imports; both depcheck graphs PASS.|
|4 authorization|settings.general enforced backend,401/403 regression tests retained; no role-name authorization.|
|5 SQL|Set-based six-row writes; exact indexed bounded retention/upsert plans on10k rows attached; no SQL in per-provider loop.|
|6 realtime|Existing bot transitions/outbox/fanout unchanged; actual reply/quote/F5 and parallel workers pass.|
|7,8 transitions/outbox|Existing conditional bot execution and publication outbox retained; app test is only acting Admin in-app notification, no external outbox.|
|9 money/time|Integer VND, bigint aggregate safe conversion; UTC timestamptz; monthly budget Asia/Ho_Chi_Minh.|
|10 audit|AI save/verify and App save/test audited; secret-free payloads checked.|
|11 adapters|Actual OpenAI-compatible HTTP only; local HTTP stubs for tests, no fake dev/prod LLM; no SDK dependency.|
|12 secrets/env|SecretBox encrypted provider keys, masked GET/audit; no secrets/new env/dependency in repo; journal metadata only.|
|14 Git|Source checkpoints b36acf04/04a01e8c/39390b53 pushed; scoped evidence commit follows; PR base dev, no merge.|

Quality Gate: all16 acceptance rows mapped to actual tests/captures; dependency810 verified merged into dev; TIP/ADR0009/D124/D125/D134 consistent. Required lint/type/unit/int/depcheck/build/E2E gates PASS. Explicit nonblocking gaps: no paid-key @live test, future content/mod consumers/journal viewer/real Web Push intentionally skipped per TIP, raw parity still above3% for owner image review. Full MSW381+4skip precedes final narrow source refinements; final8-case MSW and5-case native reruns cover all changed screens/reply prerequisites. No full native-suite or empty-DB full migration-chain claim.

Verify: run standard pnpm gates against the approved private test pair/Redis6381 DB2, then E2E MSW3920/3921 or native3700/3701. Native review links: http://localhost:3701/settings?tab=llm and ?tab=app; current HOLD manifest [here](TIP-V46-811-native-hold.json). Logs are local ignored test-results/v46-811-*.log; committed parity ledgers/captures/diffs and query-plan report contain review evidence. Final evidence commit SHA can be resolved with git log -1 -- coding-packs/reports/TIP-V46-811-completion.md (avoids a self-referential hash).
