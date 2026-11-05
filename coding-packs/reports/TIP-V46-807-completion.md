# TIP-V46-807 — Completion report

## Status: IN-PROGRESS — not ready to merge

Branch `feature/TIP-V46-807-group1-audit-conversion`, from dev `a7f6e42f`.
Approved TIP checkpoint `e297a009`. No merge/auto-merge/main push.
Implementation is complete; final gates, PR and runtime evidence are pending.

## Implementation

- BR-461: mark-read hook deduplicates each room/latest-other-message key, debounces
  bursts300ms, single-flights requests and drops stale queued rooms. Own messages
  do not trigger reads; failures settle/refetch once, never loop. Clearing an
  uncached room writes an explicit zero without subtracting unrelated counters.
- BR-463: positive-only SQL predicate across Admin/Portal commission pages,
  counts, totals, history and CSV. Historical zero-only converted referrals still
  appear pending. Recalculation that rounds to zero preserves the previous amount;
  new zero amounts are blocked by NOT VALID CHECK, without rewriting old rows.
  Regional-share zero allocations and regional financial rules remain unchanged.
- BR-465: production unlock already existed and is unchanged. New real integration
  cases cover login unlock, scheduler unlock, system audit/outbox exactly once,
  revoked pre-lock refresh tokens and retained unexpired/indefinite locks.
- BR-485:90-day audit keyset pages with exact PostgreSQL microsecond cursors,
  deferred payload/name lookup and bounded batches. Async audit CSV reuses the
  existing export outbox/worker, with request audit in the same transaction,
  filename, BOM, formula-safe cells and absolute Vietnam dates.
- Explicit AST manifest inventories authenticated Admin writes, including
  RequireAnyAdmin and class-level permissions. The one read-only connection-test
  exemption is documented. This catches unclassified/stale routes and missing
  declared action strings, not runtime proof of every branch; domain integration
  tests remain necessary. Public session routes are outside this inventory.
- BR-475–477: conversion uses one aggregate SQL snapshot, earliest current
  provincial group, three regions plus national-only groupless members;60-second
  Redis cache, real director names, denominator excluding trial, correct colors,
  mobile horizontal containment and audited CSV.
- BR-486: actual download BOM assertions on Bank, Groups, Conversion and Audit.
- Permission label is “Chi trả GĐ Vùng”; keys/grants unchanged. Auth hero copy,
  split heading and four title/description blocks updated in Admin Vietnamese
  and Portal Vietnamese plus nine AI-translated languages. Existing footers and
  owner-approved country-flag language control remain unchanged.

## Decisions and migration incident

The five TIP questions use its explicitly permitted safe defaults, recorded in
[questions](ui-parity/questions.md); these are not new owner-approved D-xx decisions.
Screen/export90days does not purge append-only database history.

Owner approved only `opchub_v46_801_dev` / `opchub_v46_801_test`, Memurai6381
DB1/dev and DB2/test, and rolling the owned806 services to807. Original PostgreSQL
5432 and Redis6379 must remain untouched.

The initial generated create-only migration accidentally dropped handwritten
indexes/FK on the private pair. A compensating migration restored all21 indexes
and validated `customer_years_user_fk`; no business rows were removed. Owner then
explicitly approved removing exactly the two accidental/restore migrations and
their private `_prisma_migrations` metadata. Both counts are now zero, both Prisma
statuses report96 migrations up to date, including covering INCLUDE definitions.
Only `20261110090000_v46_commission_positive` ships, with down.sql. Its NOT VALID
CHECK preserves historical rows while rejecting new zero amounts. No fresh-DB
replay or rollback on HOLD databases has been performed.

## Completed checks — 05/11/2026

Logs are ignored local evidence in `test-results/`.

| Gate | Actual result | Log |
|---|---|---|
| Baseline integration |111/111,34 files | v46-807-baseline-int.log |
| Baseline MSW |365 pass +4 existing skips | v46-807-baseline-e2e.log |
| Lint + typecheck R5 |16/16 Turbo tasks successful | v46-807-quality-r5.log |
| Root unit R1 |2041 pass +2 existing S3 skips;6/6 tasks | v46-807-unit-r1.log |
| Chat mark-read scoped unit |8/8 | v46-807-chat-unit.log |
| Audit inventory scoped unit |2/2, including negative fixture | v46-807-audit-coverage.log |
| Admin new UI scoped unit |4/4 | v46-807-admin-unit-r1.log |
| Commission/unlock scoped integration |7/7 | v46-807-int-r1.log |
| Audit/conversion/plan checkpoint |9/9 | v46-807-int-r4.log |
| Final microsecond audit + actual plans |7/7 | v46-807-int-r5.log |
| Dependency boundaries |no violations,2377+1080 modules | v46-807-depcheck-r1.log |
| Latest source quality/full integration/build/E2E/parity |PENDING | report to be updated |

Root units: integrations105+2skip, UI57, Admin558, shared667, server239,
Portal415. The two skips are existing real-S3 tests, not new exclusions.

## Query evidence

[Actual10k-row plans](TIP-V46-807-query-plans.md): commission ordered index with
late payload joins22.416ms; audit covering IDs then51 PK lookups6.980ms;
conversion159.820ms with indexed membership probes. One-pass population scans
and tiny catalog scans are intentional; no repeated membership Seq Scan or
planner flags. These are fixture measurements, not production load certification.

## Remaining before completion

- Complete current final lint/type/unit, full integration, MSW/native builds,
  full MSW and scoped native E2E.
- Measure and inspect A-01/D-01/D-69/D-75 at1440/390. D-01 is now full-page;
  baseline viewport-only values are not directly comparable. D-134 keeps pixel
  failures visible as reference; no new mask or tolerance relaxation.
- Restore demo seed twice after native tests, verify balanced counts and owned
  runtime health; preserve original native services.
- Commit/push explicit scoped files, open PR into dev, update only progress#7
  and milestone M2 evidence. Report final Git SHA and clean working tree.

No DONE or merge-ready claim while any mandatory non-pixel gate remains red or
unmeasured. Nine AI translations still need native-speaker review.
