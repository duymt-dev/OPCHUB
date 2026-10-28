# TIP-V42-711 — resumed implementation checkpoint (not DONE)

## Source and scope

- Resumed the owner's active goal; the earlier backend-only pause is historical, not current status.
- Branch: `feature/TIP-V42-711-project-live-store-post`, stacked on TIP-710. No merge performed.
- Source commits: `a6aaa8f0` (API filter, store posting UI, MSW, translations, fixtures and tests),
  `b553b90c` (full-width project feed, preserving existing widths of unrelated store sections).
- Both commits pushed. PR authentication unavailable; [compare into dev](https://github.com/duymt-dev/OPCHUB/compare/dev...feature/TIP-V42-711-project-live-store-post).
  This is a checkpoint, not a completed TIP or milestone M3.

## Implemented since backend handoff

- `/projects?storeId=…` validates and applies the store filter before deferred pagination and existing visibility rules.
- Explicit project province takes precedence over group province; legacy empty values retain the group fallback.
- Store detail renders API-backed projects with loading/error/retry/empty states and pagination. Owners can open the project form with store name, field/category, audience, province and immutable store association.
- Linked province is read-only; standalone projects retain editable province. Editing preserves the association.
- Submission publishes immediately; the MSW implementation no longer uses the retired D-18 revision workflow.
- Public MSW visibility respects account status and usable fee expiry, with the deterministic fixture clock.
- Translations updated in all ten locales. Demo project `p10` is linked to `st1` in both MSW and native seed, matching the actual prototype.
- New native integration tests cover store filtering, province precedence, private/draft exclusion, expiry/restoration and expired-vs-trial submission.
- New browser test covers prefill, read-only province, POST response, immediate publication and reopening the saved project from its store.
- Split the existing over-limit project browser test file; extracted the existing store wizard Team component to resolve its lint violation without changing behavior.

## Decisions / discrepancies

- **Q-V42-711-2:** reuse the existing project list endpoint with `storeId` rather than introducing a circular store/project service dependency. The TIP permits an endpoint/service alternative; existing backend visibility remains authoritative.
- **Q-V42-711-3:** the actual v4.2 prototype places the project block **before** “Đang cần”, contrary to the TIP's prose. Implemented the prototype ordering under D-93.
- **Q-V42-711-4:** the prototype's MediaSoft store already contains OPC Hub Mobile. Linked the seed explicitly; no runtime inference by owner and no invented placeholder projects.
- Added covering index `(store_id, status, published_at DESC, id DESC) INCLUDE (owner_id, visibility, deleted_at)` in migration `20261028095802_v42_project_store_feed`.
  Generated with `--create-only`; removed Prisma-generated drops of unrelated handwritten indexes. Applied on both `opchub_dev` and `opchub_test`.
- Native dev drift was a missing original `projects_store_id_idx`; restored that original index with `CREATE INDEX IF NOT EXISTS` before generating the new migration. No reset or data deletion.

## Verified gates

| Command | Actual result |
|---|---|
| `pnpm lint` | 8/8 tasks passed; pre-existing admin/portal image warnings remain |
| `pnpm typecheck` | 8/8 tasks passed |
| `pnpm test` | 1663 passed, 2 skipped; 6/6 tasks passed (5 cached in the latest run) |
| Unit breakdown | shared 432; server 225; UI 52; admin 460; integrations 103 + 2 skipped; portal 391 |
| `pnpm depcheck` | passed: 2046 modules/5998 dependencies and 905 modules/4165 dependencies |
| `pnpm build` | 3/3 tasks passed |
| Native `test:int project-store-visibility` | 3/3 passed on Postgres + Redis |
| Full `pnpm test:int` | **1557 passed**: server 1497/164 files + DB 60/19 files; exit 0, 24m2.781s |
| Targeted MSW `store-projects.spec.ts projects-mine.spec.ts` | 6/6 passed |
| Full `pnpm e2e` (correct local relay origin) | **321 passed, 4 skipped**, exit 0, 14.1 minutes |

Both full gates completed successfully, without retries or weakened assertions. The full integration result supersedes the older backend handoff snapshot that reported affiliate bootstrap failures; no database reset or affiliate cleanup was performed in this resumed work.

### Parity measured on the source changes

| Scenario | 1440 | 390 |
|---|---:|---:|
| P-73 create form | 0.72% | 1.45% |
| P-74 form validation | 0.90% | 1.98% |
| P-75 form funding | 0.10% | 2.28% |
| P-76 edit form | 0.79% | 1.77% |
| P-77 saved draft | 0.02% | 0.08% |
| P-108 existing store viewport | 2.50% | 0.26% |
| P-108-PROJECTS complete new block, no mask | 0.00% | **3.34% FAIL** |

Rerun after source commit `b553b90c`: **13/14 passed** (46.0 seconds); the generated parity report stamps this SHA. The initial desktop difference was 12.83% from the old 1080px container; the new block now uses the prototype's available width. Existing store viewport parity is unchanged.

Mobile diagnostic inspection found both rendered blocks are 366px wide and 202px high, and both cards are 328×128px with identical computed typography. Their vertical fractional offsets differ; captured PNG heights differ and the comparison remains **FAIL**. Diagnostic logging was removed. No baseline, mask, threshold, assertion or screenshot-comparison algorithm was altered.

### Test-run configuration finding

The first full MSW run was stopped after repeated Admin login failures: `/v1/admin/auth/login` returned 503 from `affiliate-bridge.ts`, because the Admin build's relay origin defaulted to the public site rather than the local Portal. Rebuilt Admin with process-only `NEXT_PUBLIC_PORTAL_URL=http://localhost:3040` and restarted the full run. No `.env` edits and no weakened assertions. Only the test runner created in this session and its verified descendants were stopped; native HOLD/foreign processes were untouched.

## Remaining before TIP-711 DONE

1. Resolve mobile block parity without hiding differences; add/measure the store-prefilled form scenario as needed.
2. Complete empty/visitor behavior coverage and native browser verification of the touched flow and expiry/restoration.
3. Run native E2E and restore demo seed/HOLD. Full integration and MSW gates have now passed.
4. Run actual query `EXPLAIN (ANALYZE, BUFFERS)` at ≥10k rows for project visibility and the new store feed.
5. Complete acceptance/14-rule audit, final TIP-711 report and M3 report, commit/push all evidence.
6. Only then continue TIP-712 → TIP-714 sequentially. No final acceptance file or later TIP is claimed complete.
