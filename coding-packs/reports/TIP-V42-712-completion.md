# TIP-V42-712 — Admin AI configuration

## Status and version

Functional implementation and all code/behavior gates complete. **Visual acceptance is not fully PASS**: Q-V42-712-1 → 3 preserve the absent AI reference, mobile navigation differences and real native audit-history differences. Continue sequentially to TIP-713 under the owner's instruction to record questions and continue; carry these findings into TIP-714 rather than block or fabricate PASS.

- Requirement: REQ-607, D-99/D-103, ADR-0008.
- Branch: `feature/TIP-V42-712-admin-llm-config`, stacked on TIP-711.
- Commits: `93f77537` schema/migration; `f8599735` API/runtime; `f97113f0` UI; `0eda7e81` preserved tab order/stub contract; `4a12c37f` mobile non-overlap; `b1238e4c` native evidence; `a61436a0` measured parity/questions.
- [Compare into dev](https://github.com/duymt-dev/OPCHUB/compare/dev...feature/TIP-V42-712-admin-llm-config). No PR created: gh authentication unavailable. No merge, no main push.

## Delivered

- Singleton `llm_configs`, AES-256-GCM via existing SecretBox/DATA_ENC_KEY. Migration `20261028144206_v42_llm_config`, reviewed create-only SQL and down migration, deployed to approved native dev/test databases.
- Permission `settings.general`: GET/PUT `/v1/admin/settings/llm`, POST `/v1/admin/settings/llm/verify`. Shared strict zod contracts, raw technical fields, encrypted key retention, masked output only (hasKey/last4), audited saves and verification. Save + audit in one serialized transaction.
- Runtime in API/worker domain wiring reads durable singleton revision per AI operation; decrypted material only cached in process, invalidated through scoped Redis pub/sub. Missed notifications remain safe because every operation checks DB. No plaintext key in Redis.
- Development/production ignore legacy fake/local provider environment selection and fail closed when disabled/unconfigured. Explicit test environment remains supported. Runtime uses the actual OpenAI-compatible HTTP adapter and shared Redis60/minute ceiling; timeout/token bounds remain enforced.
- Admin form supports save/reload/blank-key retention/verification/disable. AI tab appended after existing tabs, preserving SMTP → Price → Admin order. AI mobile navigation is non-sticky so it cannot overlap the long form. No control hidden for parity.
- MSW stores only public masked settings, never a complete key. Native verification uses an ephemeral loopback HTTP stub, not a paid provider or a fake runtime fallback.

## Verification — actual output

| Gate | Result | Local output |
|---|---|---|
| `pnpm lint` | 8 tasks passed, existing image warnings only | `.git/codex-v42-712/capture-lint.log` |
| `pnpm typecheck` | 8 tasks passed | `capture-types.log` |
| `pnpm test` | **1686 passed + 2 skipped**, 6 tasks | `capture-unit.log` / `ui-final-unit.log` |
| `pnpm test:int` | **server1527 + DB67 passed** (168 + 21 files) | `full-int.log` |
| Focused API/runtime | 11 passed, included in full integration gate | `runtime-int.log` |
| New migration | 5 passed, included in DB67 | `migration-fixed.log` |
| `pnpm depcheck` | no violations; 2071 modules/6069 deps + 923/4237 | `final-depcheck.log` |
| `pnpm build` | 3 tasks passed, isolated MSW output | `final-build.log` |
| Native Admin/Portal build | passed; API proxy4041, no HOLD restart | `native-build.log`, `native-mobile-build.log` |
| Full MSW behavior | **325 passed, 4 skipped**, no retries; workers2 | `final-msw.log` |
| Identical AI browser assertions, native | **2/2 passed** at1440 and390 | `native-capture.log` |
| AI browser assertions, MSW | **2/2 passed**, also included in full325 | `msw-llm.log`, `final-msw.log` |

Integration covers encryption/masking, no key overwrite on blank input, RBAC, enabled-without-key conflict, malformed and oversized input, audit safety, real401/malformed/timeout responses, no fake fallback, configured model/key use, rotation/disable and shared rate limit. The stale-cache test uses a separate cache/runtime instance over real Postgres/Redis with subscription intentionally absent; it verifies durable revision fencing, not a claim that the protected worker was restarted.

Initial findings were not suppressed: the first full MSW run had321 passed/4 failed/4 skipped (tab-order regression plus frozen-clock relay, bot-auto and onboarding timing failures). The tab order was fixed. A complete fresh run with two workers passed325/4 skipped without weakening assertions, increasing timeouts or adding retries. The first native AI run rejected the HTTP fixture because it omitted required `finish_reason`; the fixture was corrected and the unchanged success assertions passed. Initial build invocation mistakenly used `NEXT_PUBLIC_API_MOCKING=on`; corrected to existing `msw`, with no env-file change.

## Visual measurements

AI itself has **no reachable prototype reference** (Q-V42-712-1): N/A, not parity PASS. Real native screenshots were inspected, including correction of the mobile overlapping navigation:

- [Native1440](ui-parity/llm-config/AI-native-1440.png)
- [Native390](ui-parity/llm-config/AI-native-390.png)

| Existing settings state | MSW1440 /390 | Native1440 /390 |
|---|---|---|
| D-66 General | 0.24 /7.28% | 0.24 /7.28% |
| D-67 Categories | 0.23 /5.40% | 0.23 /5.40% |
| D-68 Edit category | 0.23 /5.39% | 0.23 /5.39% |
| D-69 Roles | 2.65 /4.82% | 2.65 /4.82% |
| D-70 Welcome mail | 0.44 /11.76% | 0.44 /11.76% |
| D-71 SMTP | 0.19 /8.99% | 0.19 /8.99% |
| D-72 SMTP failure | 0.19 /11.54% | 0.19 /11.54% |
| D-100 Price | 0.13 /7.64% | 0.13 /7.64% |
| D-73 Admin accounts | 0.30 /7.75% | 0.32 /7.74% |
| D-74 Create-account dialog | 0.74 /1.95% | 0.76 /1.94% |
| D-75 Audit history | 0.35 /7.58% | 95.59 /93.76% |

MSW12/22 images pass, native11/22 pass. The two independent capture-helper tests also pass in each run (reported totals14 and13). Mobile displacement is the required additional visible AI item; native audit history has real retained records and a much longer page. Raw FAILs/diffs remain in the normal reports. Existing reporter regeneration also removes obsolete/unreachable prior-version scenario entries under its existing registry rules; it does not reclassify current failures as PASS. See [questions](ui-parity/questions.md), [MSW results](ui-parity/results.md), [native results](ui-parity/server/results.md).

## Hard-rule review and HOLD

1. Modular domain/API/cache/runtime files; no expanded monolith; frontend view delegates fields/hook/API. 2. Strict shared zod contracts, no any/ts-ignore added. 3. Depcheck clean; no common-to-domain import. 4. Backend permission key enforced. 5. Singleton PK access, no new list/pagination/query loop; 10k EXPLAIN is not applicable to an id=1 constrained singleton. Existing full integration includes query-plan gates. 6. No per-recipient DB lookup. 7. Config writes serialized in domain transaction. 8. Save/audit atomic; pub/sub is a recoverable optimization, DB revision is authoritative. 9. timestamptz UTC; no money change. 10. Save/verify audited without secret. 11. LLM only through adapter; local HTTP test boundary. 12. No real secrets or env-file edits. 13. Tests separate. 14. Source commits pushed after passing gates; clean status checked before branch transition.

Native Postgres5432 dev/test and Redis6379 db1/2 only. API4000/socket4001/worker and prior4040 process untouched; dedicated API4041 runs the new build. No VPS action. `pnpm --filter @opchub/db seed` and `flush:dev-cache` completed after native measurements. The local browser AI fixture ends disabled; no live provider configured or paid call made.

## Remaining / next

- Visual questions above remain open, not owner-approved PASS and not a reason to stop the authorized sequence.
- No live paid-provider test, no protected worker restart; no claim of production deployment.
- Bot scheduling/reply scanning/bulk AI workflows belong to TIP-713. M4 and final whole-product acceptance belong after TIP-714, not this report.
