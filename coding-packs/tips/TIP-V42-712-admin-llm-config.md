# TIP-V42-712: Admin AI configuration and runtime LLM adapter

## HEADER
- TIP-ID: TIP-V42-712
- Priority: P1; estimated L; project OPCHUB.
- Module: llm-config; settings UI; integrations/llm.
- Depends on TIP-V42-711; sequential execution only, stacked branch `feature/TIP-V42-712-admin-llm-config`.
- Parallel-safe with: none. TIP-713 depends on this runtime contract; shared integration wiring must be integrated first.
- Files touched (create unless marked modify):
  - `packages/shared/src/api-domains/llm-config.ts`, `packages/shared/src/api-domains/llm-config.spec.ts`, `packages/shared/src/api-domains/index.ts` (modify).
  - `packages/db/prisma/schema/llm-config.prisma`; migration generated with `--create-only` named `v42_llm_config` (`migration.sql` and `down.sql`; timestamp recorded after generation); `packages/db/test/migration-llm-config.int.spec.ts`.
  - `apps/server/src/modules/llm-config/llm-config-core.module.ts`, `llm-config-http.module.ts`, `llm-config.controller.ts`, `llm-config.service.ts`, `llm-runtime.service.ts`, `llm-config-cache.ts` in that same directory.
  - `apps/server/src/common/integrations/integrations.module.ts` (modify), `apps/server/src/common/integrations/llm-provider.ts` (modify), `apps/server/src/common/integrations/llm-provider.spec.ts` (modify), `apps/server/src/api/api-app.module.ts` (modify).
  - `apps/server/test/settings/llm-config.int.spec.ts`, `apps/server/test/settings/llm-runtime.int.spec.ts`, `apps/server/test/helpers/llm-http-stub.ts`.
  - `apps/admin/src/features/settings/llm-api.ts`, `apps/admin/src/features/settings/hooks/use-llm-config.ts`, `apps/admin/src/features/settings/components/llm-tab.tsx`, `apps/admin/src/features/settings/components/llm-fields.tsx`, `apps/admin/src/features/settings/components/llm.module.css`; existing settings `types.ts`, `components/settings-screen.tsx`, `components/settings-nav.tsx` (modify).
  - `e2e/behavior/llm-config.spec.ts`, `e2e/llm/config-stub.ts`, `e2e/parity/scenarios/admin-llm.ts`.
  - Further exact mock/locale/barrel wiring paths must be enumerated before touching them, after inspecting existing routing.

## CONTEXT / source of truth
- Native workspace D:/CODING/OPCHUB/CODING; unchanged approved stack.
- REQ-607, D-99/D-103, ADR-0008; FULL-AUDIT lines 101–102 (AI configuration replacing environment provider selection); GOAL-V4.2 item12.
- Follow encrypted SMTP configuration (`modules/mail/services/smtp-config.service.ts`) and `common/crypto/secret-box.ts`; reuse `LocalLlmProvider` in integrations.
- No AI-settings form located in prototype yet: inspect actual controls before choosing parity scenarios; ADR mandates real form even if prototype has no corresponding reachable state (D-95). Do not fabricate a reference screenshot.

## APPLICABLE STANDARDS
`backend/api-conventions`, `backend/auth-rbac`, `backend/nestjs-modules`, `database/prisma-migrations`, `database/query-indexing`, `integrations/adapters`, `security/security`, `testing/testing`, `frontend/nextjs-structure`, `frontend/data-state`, `frontend/antd-ui`, `frontend/ui-parity`, `global/code-structure`, `global/git-workflow` under coding-packs/standards.

## TASK
Persist singleton AI configuration with encrypted key; expose permission-gated Admin read/save/connection-test operations; replace runtime environment selection with dynamic DB-backed configuration and cross-process invalidation. Add real Admin form, matching MSW contract, local HTTP-stub tests and native behavior coverage. No changes to bot schedules/generation workflows reserved for TIP-713.

## SPECIFICATIONS
- Singleton `llm_configs`: id1 as SMTP, base_url, model, nullable key_enc, max_tokens, timeout_ms, enabled, UTC timestamps. Enforce singleton and numeric bounds in SQL; PK lookup only, no unnecessary indexes or pagination.
- Reuse DATA_ENC_KEY/SecretBox AES-256-GCM; no .env changes. Response excludes key/ciphertext; only hasKey and last4. Omitted/blank replacement retains stored key; enabling without complete connection details/key fails validation/conflict. Never log key, bearer headers or provider response secrets.
- GET/PUT `/admin/settings/llm`, POST `/admin/settings/llm/verify`, permission `settings.general`. Verify is bounded and audited, returns sanitized failure; does not persist draft settings. Saves and audit share transaction.
- Read config on runtime use; bounded process cache, invalidation event after committed save across API/worker/socket, safe recovery from missed events. Never persist plaintext key in Redis.
- Missing/disabled config: explicit unavailable state, no fake fallback, no HTTP request. Environment fake injection confined to automated tests; dev/production must obey Admin config. Preserve worker rate limits; adapter timeout and input/output budgets remain enforced.
- Only OpenAI-compatible adapter performs network calls. Validate URL (no embedded auth/query/fragment, HTTPS except explicit loopback HTTP for local adapters/tests); forbid redirect credential forwarding. Local HTTP stub provides success/unauthorized/timeout/malformed replies, never paid AI in automated tests.
- UI: permission-gated AI tab, endpoint/model/key/maxTokens/timeout/enabled, configured/unconfigured status, retained-key hint, save/verify pending/success/error; no returned secret prefill. Explicitly document UI states without prototype references rather than asserting parity not measured.

## ACCEPTANCE CRITERIA
1. Given no/disabled config, when any runtime AI call occurs, then fails closed without fake text/network.
2. Given settings.general, when save valid settings/key, then ciphertext differs from plaintext, audit exists, GET exposes only hasKey/last4; unauthorized read/save/verify denied.
3. Given stored key, when save without replacement, then preserved; when replace, then subsequent calls use new key and old key never reappears.
4. Given two running service instances, when Admin saves changed endpoint/model/key or disables, then subsequent calls observe change without restart; missed invalidation recovers safely.
5. Given a local HTTP stub, when verify succeeds/fails/times out/returns malformed data, then actual request is observed and sanitized result returned; no secrets in response/audit/log.
6. Given invalid URL/numeric limits/unknown fields/oversize body, when write requested, then rejected with normal API errors, never 500 or silent fallback.
7. Given enabled configured adapter, when bot calls existing interface, then stub receives configured model/budget and returns actual parsed text; worker guards/NA-07 retained.
8. Admin behavior runs MSW/native with identical assertions for save/reload/key retention/verify/disable and no plaintext key exposed after reload.

## CONSTRAINTS / QUALITY GATE
No new dependency/major stack change, no Prisma mocks, no native DB other than approved5432 dev/test or Redis1/2, no protected HOLD shutdown. Module files under caps, extensive tests separate. No new production secret. Scope/file paths and missing UI reference are explicit; exact remaining wiring list is a pre-implementation action, not permission to edit unrelated code. Single TIP batch has no pairwise file overlap conflict. TIP-713 remains sequential.

## BUILDER-CHECKLIST
- [ ] Enumerate remaining exact locale/mock/barrel paths before editing.
- [ ] Migration create-only, reviewed SQL/down, deploy dev/test, migration test.
- [ ] All eight AC proven with unit/int/browser evidence, actual HTTP stub not mocked Prisma.
- [ ] Runtime never falls back to fake; cache invalidation cross-process verified.
- [ ] Secret audit/output safety, RBAC and negative/oversize tests.
- [ ] Full lint/typecheck/unit/int/depcheck/build/MSW + native browser gates.
- [ ] Parity actual reachable states at1440/390, no masks; document absent prototype UI.
- [ ] Commit/push, clean status, completion SHA and compare link. Do not claim DONE from planning alone.
