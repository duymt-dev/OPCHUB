# TIP-V46-808 — Completion evidence (IN PROGRESS)

- Branch: `feature/TIP-V46-808-global-search`, based on `dev`8543728d.
- TIP commit: c9dc8a69. Implementation not yet finalized; no DONE claim.
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
