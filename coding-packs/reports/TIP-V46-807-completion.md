# TIP-V46-807 — Completion report

## Status: IN-PROGRESS — not ready to merge

Branch `feature/TIP-V46-807-group1-audit-conversion`, from dev `a7f6e42f`.
Approved TIP checkpoint `e297a009`. No merge/auto-merge/main push.
Source `5257db60` is pushed; [draft PR#85 into dev](https://github.com/duymt-dev/OPCHUB/pull/85).
Implementation, MSW/native builds, full MSW and scoped native E2E are complete;
only final full integration remains pending.

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
| Final root lint/type/unit R6 |22/22 tasks,17 cached,2m11s | v46-807-quality-r6.log |
| Final E2E lint/type |2/2 tasks | v46-807-e2e-quality-r2.log |
| Root MSW build |3/3 tasks,2m30s | v46-807-build-msw-r1.log |
| Root native build |3/3 tasks,2m06s; proxy4300 in both manifests | v46-807-build-native-r1.log |
| Scoped MSW E2E |14/14,21.3s | v46-807-msw-scope-r3.log |
| Scoped native E2E |5/5,1.9m, real API/worker/storage | v46-807-native-scope-r2.log |
| MSW parity |5 image pass /3 image fail +2 harness pass | v46-807-parity-msw-r1.log |
| Native parity |5 image pass /3 image fail +2 harness pass | v46-807-parity-native-r1.log |
| Permission-label exact row-header E2E |1/1,4.2s | v46-807-msw-rbac-final.log |
| Final E2E lint/type after label selector |2/2 tasks | v46-807-e2e-quality-r3.log |
| Final full integration R2 |PENDING | v46-807-full-int-r2.log |
| Full integration R1 server |1923 pass /1 legacy chat-fixture fail,209/210 files; root stopped before DB task | v46-807-full-int-r1.log |
| DB integration separately |126/126,26 files,123.31s | v46-807-db-int-r1.log |
| Approved chat fixture isolation |14/14,11.36s, all assertions unchanged | v46-807-chat-regression-r2.log |
| Full MSW R1 |368 pass /1 label-selector fail +4 existing skips,23.1m | v46-807-msw-full-r1.log |
| Final full MSW R2 |369 pass +4 existing skips,14.2m,4 workers | v46-807-msw-full-r2.log |
| Final quality after approved fixture repair |22/22 tasks,19 cached,1m07s; same2041 unit pass +2 existing skips | v46-807-quality-fixture.log |
| Final dependency boundaries |no violations,2377+1080 modules | v46-807-depcheck-final.log |

Root units: integrations105+2skip, UI57, Admin558, shared667, server239,
Portal415. The two skips are existing real-S3 tests, not new exclusions.

## Query evidence

[Actual10k-row plans](TIP-V46-807-query-plans.md): commission ordered index with
late payload joins22.416ms; audit covering IDs then51 PK lookups6.980ms;
conversion159.820ms with indexed membership probes. One-pass population scans
and tiny catalog scans are intentional; no repeated membership Seq Scan or
planner flags. These are fixture measurements, not production load certification.

## Remaining before completion

- Finish full integration R2 (no other mandatory gate remains pending).
- Commit/push final evidence, update draft PR/progress#7 and milestone M2 evidence.
  Report final Git SHA and clean working tree.

No DONE or merge-ready claim while any mandatory non-pixel gate remains red or
unmeasured. Nine AI translations still need native-speaker review.

## Issues corrected without weakening assertions

- Audit plan initially scanned wide payload rows. A bounded LATERAL PK lookup
  fixed the production query; no planner flags or index assertions were removed.
- FakeStorage ignores its optional filename argument. Integration now spies the
  exact adapter call, while both E2E targets assert the actual downloaded name.
- New auth E2E initially selected both h1 elements; it now targets the hero h1.
  Audit E2E initially used an invalid tab key; it now uses existing `audit-log`.
  The existing login toast assertion now selects that status instead of a new
  conversion-loading status. Exact text assertions remain.
- Existing overview helper matched the new `/overview/conversion` response as if
  it were `/overview`. Native first run4pass/1fail exposed this; exact pathname
  matching fixed it, and all5 native cases passed on rerun.
- New permission-label assertion initially searched a standalone text element,
  but the label is a text node inside the combined `Affiliate …` row header.
  Full MSW and an isolated check reproduced it; the exact accessible row-header
  assertion now passes, including absence of the old exact row-header label.
  Full MSW rerun subsequently passed369+4skip, not inferred from the isolated case.
- Full integration and a standalone rerun reproduced the legacy chat fixture's
  missing `isOwner` group.93 background groups plus nine accumulated case groups
  exceeded the existing overview's first100 groups; unread/read assertions passed.
  Owner approved exact-ID per-case afterEach cleanup in that one test file.
  All assertions remain, scoped14/14 passed, full rerun is running. No background
  groups, API limit or production query were changed. The pre-existing100-group
  overview limitation remains an explicit follow-up, not claimed fixed by807.
- Windows pre-commit failed with100 paths because the command line was too long.
  Source was committed in explicit15-path batches with all hooks enabled, then
  pushed. No hook bypass, new dependency or timeout relaxation.

## Acceptance mapping

| Criteria | Evidence |
|---|---|
| TC-461, bursts/stale refetch/own messages/403 | mark-read unit8/8; identical MSW/native room-switch E2E |
| BR-463 list/count/summary/CSV/Portal fallback/CHECK/recalculation | zero-commission-hidden integration5/5 |
| Regional-share zero rows remain visible | production regional modules unchanged; full regression pending |
| BR-465 login/sweep/idempotency/refresh/retained locks | auto-unlock integration2/2; no production unlock changes |
| BR-485 manifest and negative route | admin-audit-coverage unit2/2; exemption AdminBankReconcileController.test is read-only; no previously unaudited service found |
| BR-48550/50/20 pages,90days, exact cursor | audit-log-page integration6/6 including microseconds; UI unit load-more/error/empty |
| BR-485 job/header120-row builder/BOM/date/formula/audit/403 | audit integration plus actual MSW/native download E2E |
| Audit retention and old domain regressions | baseline111/111; final full integration pending |
| BR-475/47680/70/50/national71, directors, exclusions | conversion integration3/3; UI color unit; actual mobile E2E |
| BR-475 one SQL/cached60seconds/10k plan | conversion integration/cache spy, production SQL plan above |
| BR-477 six-column/three-region CSV, audit, denied permission | integration and actual download E2E; denied account has no overview.view (default accountant does have it, grants unchanged) |
| BR-486 four downloaded BOMs | Bank/Groups/Conversion/Audit passed in full MSW369+4skip; scoped native Conversion/Audit passed |
| Permission label | shared unit plus full MSW RBAC label assertion |
| P1 copy/footer/English,9 translation bundles | AuthHero unit, shared messages tests, scoped auth E2E |
| D-134 comparison and visual inspection | eight MSW pairs inspected, plus all eight native app images against the same prototype |

## MSW parity reference — threshold remains3%

| Screen | Baseline1440/390 |8071440/390 |
|---|---|---|
| A-01 |4.61% /56.72% |0.10% /0.14% |
| D-01 |0.18% /0.23% viewport only |2.26% /1.90% full-page |
| D-69 |2.85% /3.56% |2.86% /3.56% |
| D-75 |7.72% /10.32% |6.73% /7.97% |

A-01 now matches the four title/description blocks and mobile wrapping, without
the old411px overflow. D-01 includes the conversion table, real fixture numbers,
appointed names and rates rather than prototype constants. Its existing chart
mask is unchanged; the prototype also has an empty wrapper adding18px blank gap.
Viewport-only baseline is not directly comparable to this full-page measurement.
D-69 remaining mobile difference is the existing settings navigation/permission
layout and new required label, effectively unchanged from baseline. D-75 heading,
copy, button below heading and row layout match; remaining image differences are
legacy settings navigation (extra security/language/AI panels vs prototype AI
provider/PWA entries), real avatars/fallbacks, shell search and approved flag.
Those navigation features belong to later TIPs; no blind prototype copy/removal.
All16 MSW app/prototype images were visually inspected. No masks/tolerances added.

Native reference on the same UI: A-010.10%/0.14%; D-012.41%/2.31%; D-692.86%/3.56%;
D-7569.65%/68.74%. Native audit correctly shows the first50 real append-only rows
and “Xem thêm”, compared with six static prototype rows: full-page3151/5519px
instead of1006/1680px. It is a fixture/history-length difference, not a failed CSV
job or hidden pagination; no audit deletion, capture truncation or new mask used
to lower it. Main and `server/` parity reports retain their separate measurements;
only the eight selected rows in each changed, older rows keep their original SHA.

## Native HOLD

Owned806 processes rolled to807. API4300 PID20868, socket4301 PID18372,
worker PID20976; native Portal3700 PID26472/Admin3701 PID8072 use
`.next-v46-807-native`. MSW3800 PID29168/Admin3801 PID30052 use separate807 outputs.
Both native route manifests and API/frontend health proxies target4300 and return
200 JSON. Existing local storage adapter shares an ignored private807 directory
between API/worker; no external production storage is used.

After the last native parity run, ordinary `seed:demo --affiliate` ran twice on
private DEV, with identical counts: users80, affiliates62, referrals51,
commissions53, periods65, regional shares53, payouts1, customer-year anchors50,
directors3, bank transactions5; unbalanced shares0. Only Memurai6381 DB1 cache
was cleared by the existing guarded script. Original PostgreSQL5432 PID5932,
Redis6379 PID1244 and Memurai6381 PID20340 remain listening. Evidence:
`v46-807-hold-{seed,counts}-{1,2}.log`, `v46-807-hold-final.log`/`hold.json`.

## Hard rules review

1/13: small domain files and dedicated tests; file caps checked. 2: strict typed
contracts/Zod, no any or suppression added. 3: app/domain boundaries checked by
depcheck. 4: backend permission keys, not role-name conditions. 5: indexed bounded
pages and one aggregate; no per-recipient/row DB query. 6: existing realtime
architecture unchanged; no REST loop tied to socket events. 7: existing conditional
transitions retained. 8: export outbox/request audit share one transaction. 9:
integer VND and timestamptz UTC, explicit VN display. 10: conversion/export writes
audited; manifest limitations stated. 11: existing integration adapters/fakes,
local storage only for private dev runtime. 12: no secrets/new env variable or
console logging added. 14: source committed/pushed with hooks; final evidence and
clean-status check still pending. PM GOAL/handoff and historical TIP rows unchanged.
