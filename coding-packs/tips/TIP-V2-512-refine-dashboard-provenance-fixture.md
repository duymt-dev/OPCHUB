# TIP-V2-512 — Dashboard provenance integration fixture

Priority P1. Parent TIP-V2-503 / REQ-224 / BUG-012 / TD-010.
Status: IMPLEMENTED / focused verified; full rerun pending. Serial on
feature/V2-P5-bot-acceptance.

## Finding / evidence
Full uncached `pnpm run test:int --force` at f70bdd44 finished with DB21/21,
server1277/1278. The sole failure is the original Dashboard no-prototype test:
`members[id=m5].name` is Somchai Prasert. Demo account seeding deliberately
persists this real user and its company from shared fixtures. The repository
correctly reads users/business_profiles; a global string blacklist is only valid
when these labels are absent from the test's persisted source fixture.
Private raw receipt: D:/opchub-local/v2/503-full-int.log (retain unchanged).

## Bounded task / acceptance
- Keep every original negative string, count, online and country assertion.
- Explicitly relabel only canonical demo member m5 and its business profile for
  that negative fixture, restoring exact values/timestamps in finally. Invalidate
  the actual Dashboard content cache before/after, including exceptional paths.
- Verify every returned member ID/name/company against one batched DB read.
- Add a positive HTTP integration control: a freshly persisted member/company
  with the formerly blacklisted names must appear under its exact DB identity;
  a subsequent DB rename must change the rendered response after invalidation.
- Test-only changes; no name-based production filtering, seed deletion, assertion
  removal/relaxation, schema migration, mock Prisma or provider call.
- Focused native tests plus lint/typecheck/test/depcheck. Retain failed full-run
  receipt, launch fresh uncached full integration and report its actual result.

## Files
- apps/server/test/dashboard/dashboard.int.spec.ts
- apps/server/test/dashboard/dashboard-source.fixture.ts (new)
- apps/server/test/dashboard/dashboard-provenance.int.spec.ts (new)
- This TIP; reports/TIP-V2-512-completion.md; evidence/v2-512/*;
  02-TASK-GRAPH.md; audit/W1/TEST-GAPS.md.

Standards: testing/testing.md, database/query-indexing.md, global/git-workflow.md.
Only opchub_test / Redis2 / Fake; native demo services remain untouched.
