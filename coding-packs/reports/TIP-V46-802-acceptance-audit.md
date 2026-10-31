# V46-802 — acceptance audit at0741e854

**INCOMPLETE.** This is not a completion report, financial-policy approval or
permission to skip a gate. Branch remains `feature/TIP-V46-802-revenue-sharing`.
The previous turn made progress by rebuilding and verifying native Portal;
those builds/browser tests must not be repeated without an affected change.

## Requirements and current evidence

| Required scope | Evidence and source | Disposition |
|---|---|---|
| Three configurable percentages, D-119 calculation/rounding | Foundation218b49bd; audited policy savesd7e080c1; current matrices72345a1e; shared policy/math, native policy HTTP11/11 and same browser saves/reload | Implemented and covered; policy edits do not recalculate old snapshots |
| Customer year from first actual receipt across all plans, backfill | Foundation migration16/16, capture5851fdc6 cross-plan/outbox suites; later financial41/41 after shared math extraction; common scenario68a3152e | Normal/backfill/unpaid-reanchor paths covered; paid correction accounting remains Q1, not an approved clawback |
| Receipt capture at reconciliation, transactional outbox, no trial/zero/cancelled credit | Capture5851fdc6, payoutcc5e34e9, shared/MSWb4fb7ec7; real relay/replay/rollback and payment-conflict coverage | Implemented; no new full-integration PASS inferred from narrow tests |
| Province-derived beneficiary, vacant region retained by Media Soft, no retrospective appointment allocation | Capture/integration, retained read modelbf8ffbf4, coherent actual demo datad880150b | Implemented; real runtime entitlements never rewritten to match demo |
| Idempotent payout, immutable beneficiary bank/history, retained revoked debt | cc5e34e9 native71/71 including concurrency/API/retention; common browser68a3152e; current full MSW includes AT-GDV04 | Monthly command covered; prototype all-due one-click/cutoff still differs under Q2 |
| Backend permissions/input/status/body size, audit/outbox | Native payout API4cases in71/71; dashboard/read16/16; policy11/11; shared HTTP20/20 | Covered for implemented contracts; not proof of unimplemented alternative payout contract |
| New query EXPLAIN on at least10k rows | Payout/reanchor5plans atcc5e34e9; ledger5ate22fa123; dashboard8at8ff530d7; retained querybf8ffbf4 | Exact production SQL measured, no large-table Seq Scan; retain exact source/report scopes, not aggregate into a fictitious new run |
| Native schema/migrations | Deployment and migration reports; current dev read-only check below |94applied migrations; no schema change afterd7e080c1 |
| Root lint/typecheck/unit/depcheck |586d9010 precommit PASS;2237unit passes +2existing skips | Current: later commits are docs only |
| Application builds | Admin72345a1e both modes; isolated serverd7e080c1; Portal MSWd6ab302c and nativefb9cf3b3 | Current scoped production outputs; held backend dist intentionally not replaced |
| E2E both modes, identical assertions | Current policy6/6each mode; default/layout/sharing and cancellation reports; native cross-app2/2atfb9cf3b3 | Actual native Postgres/Redis evidence; not final812 dev acceptance |
| Full E2E regression | Root MSWd6ab302c:356PASS +4existing skips,360collected,22.7m,exit0 | PASS; do not rerun merely for documentation |
| Full integration | Root5a3ca36b: DB160PASS, server1869PASS/1FAIL | FAIL: fundraising end-of-month arithmetic Q4; no test skip/date shift/waiver |
| Every touched visual/behavior state | Default sharing/detail/search/empty8images PASS; default/draft policy PASS; actual payout85.329244%/38.096884%FAIL at586d9010 | FAIL: confirmation and cutoff differ from prototype. Other green images do not close this state |
| Commit/push/PR-or-compare/completion | Source/evidence commits pushed; authenticated GitHub unavailable; stacked compare in progress | Compare fallback valid; completion report/TIP-DONE intentionally absent |

Detailed source evidence: [foundation](TIP-V46-802-foundation.md),
[capture](TIP-V46-802-capture.md), [payout](TIP-V46-802-payout.md),
[reads](TIP-V46-802-read.md), [dashboard](TIP-V46-802-dashboard.md),
[policy](TIP-V46-802-policy-write.md), [matrices](TIP-V46-802-policy-preview.md),
[action states](TIP-V46-802-action-states.md), [current gates](TIP-V46-802-full-gates.md).
This audit does not relabel all old evidence with the latest documentation SHA.

## Native-dev readiness — actual read-only observation

At0741e854, a guarded localhost5432/opchub_dev transaction explicitly executed
`SET TRANSACTION READ ONLY`, then verified `transaction_read_only = on`.
Result, exit0:

```text
database: opchub_dev
transaction_read_only: on
applied migrations: 94
latest: 20261031100000_v46_revenue_retained
appointed directors: 3
revenue customers: 0
revenue shares: 0
revenue payouts: 0
pending revenue_received / revenue_payout_recorded events: []
```

Local ignored diagnostic: `e2e/.parity-out/v46802-dev-readiness.mts`;
log:`e2e/.parity-out/v46-802-dev-readiness-0741e854.log`. Only counts/schema
metadata printed, no URLs/credentials/customer/bank data. No seed/reset, write,
cache flush, API login or process restart on dev. This is readiness evidence,
**not a passed customer-year/payout scenario**: the necessary receipt history
is absent on that database. Prior AF0/functional evidence is on opchub_test.

Read-only source inspection also confirms the old relay claims only registered
event types. Do not claim it consumes/discards802 events: its held version has
no802 registration. Current802 consumer proof came from the isolated runtime.

## Correct gate placement / next work

GOAL's per-TIP integration command explicitly targets opchub_test/Redis2; its
E2E requirement is actual server +MSW with identical assertions. Final complete
AT-GDV01–07/TC-461–494 acceptance on server dev is explicitly assigned to812.
Earlier progress wording that made a fresh full dev acceptance a prerequisite
for every802 checkpoint overstated that gate. Preserve final dev acceptance as
unfinished goal work; do not reset the held dev demo just to satisfy an invented
extra intermediate gate. This correction does not waive the actual802 full
integration or visual/behavior requirements above.

The next closure work is Q2's financial/cutoff/one-click discrepancy and Q4's
bounded calendar repair, not more build-provenance checks. Existing scope rules
still prohibit an unapproved cross-domain repair or self-approved financial rule.
Q1's post-payment correction accounting remains explicitly unresolved. Keep all
questions in the ledger; no whole-goal block or acceptance waiver follows from
this audit.801 also remains pending acceptance;803–812 have not been implemented.
