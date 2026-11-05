# TIP-V46-808 — Completion evidence (IN PROGRESS)

- Branch: `feature/TIP-V46-808-global-search`, based on `dev`8543728d.
- TIP commit: c9dc8a69. Implementation not yet finalized; no DONE claim.
- Source checkpoint b708c15e pushed. Draft PR [#86](https://github.com/duymt-dev/OPCHUB/pull/86)
  targets `dev`; not ready for merge yet.
- Scope: indexed global search, permission/visibility-aware aggregation, shared presentation,
  debounced Portal/Admin queries, mock contracts, ten Portal locales, keyboard/outside-click behavior.
- Owner approved reusing private `opchub_v46_801_dev` / `opchub_v46_801_test`, Memurai6381,
  rolling only owned services807→808. Original DB/Redis6379 preserved.
- Owner approved narrow SQL visibility counterparts with equivalence tests against existing
  Prisma predicates. No change to business visibility or production fee rules.
- Q808-1→5 follow explicit TIP defaults, **not new owner decisions**.
- Standard paywall remains402 `MEMBERSHIP_REQUIRED` (TIP's403 wording is inaccurate);
  locked403; FE closes silently for401/402/403, retains text and no toast.

## Evidence so far

| Gate | Actual evidence |
|---|---|
| Baseline full MSW |369 passed,4 skipped; `test-results/v46-808-baseline-e2e.log` |
| Baseline parity P11/P12/D02 |8/8 passed including2 capture-harness tests; archived ignored `test-results/v46-808-baseline-parity/` |
| Scoped real integration |13/13 passed; `test-results/v46-808-search-int.log` |
| Scoped MSW E2E new search + stores |5/5 passed; `test-results/v46-808-search-msw.log` |
| Query debounce/stale response unit |4/4 passed; `test-results/v46-808-hook-test.log` |
| Shared search contract + mock tests |10/10 passed; `test-results/v46-808-shared-test.log` |

Additional checkpoints: lint8/8 tasks PASS; typecheck8/8 PASS; initial full units2061 passed
+2 skipped; latest scope UI6/6 and hook4/4 PASS. Native E2E2/2 PASS. New+regression MSW
parity12/12 PASS. Five actual production SQL plans on10k/domain passed index/noSeqScan tests;
two-character needs measured78.966ms (advisory50ms target not met in this run).

Full final unit rerun and integration, final built-asset E2E, commit/push/PR and HOLD
verification are pending. Full integration has reported legacy failures; these are being
triaged, not ignored. This document is a work log, not completion approval.

## Final-run triage (ongoing)

- Initial direct server integration ran without required seed groups (`c1`/`c34` absent,
  total active groups0). Aborted that invalid-precondition run after recording failures
  in media-refs/chat/projects. Re-seeded private **test** DB only and restarted full root
  `test:int`; DB126/126 passed, server phase running. No production/test assertions changed.
- A unit rerun hit the existing audit manifest's5s timeout under heavy parallel load;
  another attempt hit Vitest fork startup timeouts. Bounded resource rerun uses the same
  Turbo test graph and assertions, package concurrency1 and `--maxWorkers=2`. Audit manifest
  then passed in1514ms. No test/production timeouts changed.
- New group E2E initially used an ambiguous prefix matching province and industry groups.
  Narrowed its accessible-name pattern to the exact province title + member count;
  identical MSW/native3/3 passed on final built assets.
- Full MSW exposed two old Affiliate month selectors that now also match the new accessible
  topbar combobox. Owner approved narrowing three actions to the month label;
  scoped search/Affiliate/stores11/11 passed. Full MSW rerun in progress.
  No assertions, fixtures or production behavior were changed.

## Latest checkpoint

- Full MSW rerun:372 passed,4 skipped, child exit0 (`v46-808-full-msw-r2.log`).
- Native identical search tests3/3; final-asset MSW/native parity each12/12.
- Approved service fixture repair adds returned `commentId` to the existing code filter;
  preserved outbox history and all assertions. First full root run retained an old event
  with the reused code; stopped that known-red run to validate the approved correction.
- Needs2-character query now uses a bounded prefix/fallback SQL strategy with visibility
  before limits and ranked-ID limit before payload join. Same old/new results in8 combinations;
  complete scope38/38 PASS. Latest measured needs2 chars37.967ms (previous78.966/101.447ms).
- Latest lint8/8, typecheck8/8, depcheck PASS; server rebuild PASS. Production query semantics,
  timeout settings, indexes and response contracts are unchanged by this optimization.
- Full final root integration rerun is in progress with one threaded worker and file
  parallelism still disabled; same assertions/isolation, no timeout changes. Final root units
  also use bounded threads after OS-level fork startup failures; final counts pending.

## Migration safety

Prisma create-only generated a Nov5 diff proposing unrelated drops (existing indexes/FK).
It was **never deployed**. Removed its SQL and replaced it with the TIP's Nov11 migration,
containing only three CREATE INDEX statements and matching down.sql. The now-empty Nov5
directory initially blocked Prisma deploy; filesystem removal was denied by the environment.
A temporary ignored config deployed an identical migration tree excluding only that empty
directory; both private DBs applied the three indexes successfully. Owner then explicitly
asked the agent to delete it: checked the exact absolute path and emptiness and removed it
non-recursively. Normal migration paths are restored. No accidental Nov5 SQL was applied,
and no migration metadata or original native data was altered by this incident.
