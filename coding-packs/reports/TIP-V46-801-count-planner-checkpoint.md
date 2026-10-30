# TIP-V46-801 — count/default-search planner checkpoint (PARTIAL)

Code commit: `462c267c` (pushed). No frontend, shared fixture, mail renderer or
public response contract changed. V46-801 remains incomplete.

## Changes derived from actual failing plans

- Before correction, a fixture with 10,000 users, 10,000 active affiliates and
  40,000 current group memberships showed Seq Scans on group_members, affiliates
  and the empty-search users count. The observed empty count executed redundant
  unaccent/ILIKE work for all 10,011 eligible rows (127.370ms in that run).
- Community owns its SQL in `repositories/province-directory.query.ts`. One
  set-based LATERAL query seeks the earliest current province per unique user,
  skipping industry/deleted/left groups; equal timestamps use group ID. No app
  query-in-loop and no affiliate access to community tables.
- Affiliate identities are a narrow, deterministic user-ID-ordered projection,
  served by their own partial covering index. Paused affiliates are excluded.
- Empty candidate search omits redundant wildcard/unaccent work. Its count uses
  a compact eligible-status index minus eligible incumbents by indexed ID, in one
  SQL/MVCC snapshot. Duplicates, locked/deleted/nonexistent IDs are not subtracted
  twice. Nonempty search keeps the existing GIN expression/deferred page join.

## Migrations and schema

New migrations (both with down.sql):

- `20261030100000_director_count_indexes`: eligible user ID point exclusions,
  active affiliate user-ID covering path, and member `(user_id, created_at,
group_id)` partial covering seek.
- `20261030101000_director_compact_count`: compact partial status count index.
  A later migration was used rather than editing the first after deployment.

Both deployed successfully to **opchub_dev and opchub_test, localhost:5432**;
Prisma reports 89 migrations. `prisma validate` passes. Schema edits are comments
documenting indexes Prisma cannot represent, not generated-model changes.

The first create-only CLI attempt lacked its URL because that pnpm script does
not load .env. The explicit env-file create-only command then refused the known
old checksum drift on `20261028095802_v42_project_store_feed` (Q-V46-801-4).
No reset/resolve/old migration edit was performed. Only the new handwritten
partial-index SQL was deployed; .env was not modified.

## Verification

Related native command:

```text
pnpm --filter @opchub/server exec vitest run --project int
  test/affiliate/regional-director-count-query.int.spec.ts
  test/affiliate/regional-director-query.int.spec.ts
  test/affiliate/regional-directors.int.spec.ts
  test/affiliate/regional-director-mail.int.spec.ts
```

**31/31 passed**, 4 files, 64.32s: new count/default-search 6, existing selective
search/history 3, HTTP/lifecycle 19, native mail 3. Real Postgres + Redis db 2;
no mocked Prisma. Tests cover duplicate IDs, earliest province/tie, industry /
deleted / left membership, empty input, paused affiliate, and exact candidate
count after locked/deleted/incumbent exclusions.

The old incomplete-bank constraint test assumed empty seed banks. With v4.6 demo
banks populated, changing only bankNo is valid. The test now explicitly starts
with all-null bank fields, then retains the original rejecting assertion for an
incomplete write. No DB constraint or assertion was weakened.

Root lint/typecheck/unit/depcheck exit 0 before commit: lint/typecheck 8/8 tasks,
unit 6/6, **2082 passed + 2 existing S3 skips** (shared 666, server 248, Admin 591,
Portal 418, UI 56, integrations 103). Existing 9 img warnings remain. Depcheck:
2271 frontend/shared/e2e modules and 1007 server modules, no violations. Changed
server tasks and DB typecheck ran anew; unchanged frontend/shared unit caches
remain applicable because no shared/FE code or fixture changed.

## EXPLAIN evidence and explicit maintenance conditions

Final related run, production query builders, EXPLAIN ANALYZE/BUFFERS/JSON:

| Query                        | Planning ms | Execution ms | Root rows / loops | Shared hit / read | Large-table path                                                                                                   |
| ---------------------------- | ----------: | -----------: | ----------------: | ----------------: | ------------------------------------------------------------------------------------------------------------------ |
| All 10k province memberships |       1.024 |      131.834 |         10000 / 1 |         30007 / 0 | `group_members_director_province_seek` Index Only Scan, 3 rows × 10000 loops, 0 heap fetches; group PK + Memoize   |
| Active affiliate identities  |       0.105 |        1.064 |         10010 / 1 |           107 / 0 | `affiliates_director_active_users` Index Only Scan, 0 heap fetches                                                 |
| Empty-search first page      |       0.351 |        0.155 |            20 / 1 |            86 / 0 | `users_director_page` Index Only Scan → deferred users PK, 19 visibility heap fetches                              |
| Empty-search count           |       0.291 |        1.022 |             1 / 1 |            12 / 0 | `users_director_count_compact` Index Only Scan over 10011 eligible rows (24 heap fetches), plus ID-exclusion index |

No Seq Scan on the large users/affiliates/group_members relations in these plans.
These are measured fixture results, not an SLA or statistical speedup claim.
Selective search/history also passed unchanged index assertions on this code.

The benchmark explicitly runs normal **test-DB-only VACUUM/ANALYZE** after bulk
inserts. Repeated fixture insert/delete runs also bloated the affiliate identity
index: in the final run it had 284 pages / 2,326,528 bytes versus a 233-page heap.
Plain VACUUM did not shrink it and the planner still chose a heap scan/sort.
The test reports catalog sizes before/after rebuilding **only that test fixture
index**: 108 pages / 884,736 bytes after REINDEX. The subsequent measured path is
Index Only Scan. No Seq Scan disabling, cost override, hint or assertion relaxation.

This does not prove all selectivities or heavily bloated/fresh-write states will
always choose the same plan. Keep these maintenance conditions visible; do not
reuse a healthy-fixture result as proof of a different storage/runtime state.
No VACUUM/REINDEX was run on native dev/HOLD data.

## Native HOLD and remaining work

Only index DDL touched dev. API/socket/worker were not rebuilt, stopped or
restarted: their binaries remain the preceding checkpoint; the new source SQL
was exercised through the real integration API. Do not claim native browser
verification of this commit from those old listeners.

Still required: native browser/mailbox with the same MSW assertions, remaining
exemption discovery/onboarding proof and behavioral cases, parity 1440/390 ≤3%,
final full integration/build/E2E regression gates, completion report and PR/compare.
No V46-802 work started; no acceptance criterion reduced.
