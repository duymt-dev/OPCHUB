# V46-802 — persisted MSW revenue lifecycle

**IN PROGRESS, not TIP-DONE.** Source **`b4fb7ec7`**, committed and pushed.
Branch `feature/TIP-V46-802-revenue-sharing`; no native HOLD replacement.

## Implemented

- MSW dashboard/current/former beneficiary, ledger, balance, months, payout and
  payout-history endpoints use the shared contracts and permission keys. Payout
  rechecks authorization and validates body/key; oversized payloads return413.
- Mock fee collection/renewal and fundraising reconciliation capture actual
  receipts. Manual reconciliation passes original transaction amount/time, not
  the list price. Fundraising review is not a second payment. Reminders, blocked
  director membership renewal and zero receipts do not create sharing rows.
- Pending receipt snapshots retain policy/referral/region/director/bank. Local
  outbox drain is source-idempotent. Customer epoch backfills existing positive
  fees only, without inventing historical director entitlements. Older receipts
  reanchor unpaid shares; paid snapshots remain frozen with a review audit.
- Shared pure math is extracted unchanged from the server domain and reused by
  MSW. Server domain is a facade; native financial integration rerun below.
- Financial state, pending events and idempotency receipts participate in the
  existing cross-app browser lease. Zod validates the whole snapshot before any
  restore: duplicate sources/keys/banks, inconsistent balances and payout ownership
  fail rather than partially replace state. Reload does not replay money effects.
- Mock beneficiary bank now follows the native implementation: revocation retains
  the person's bank and clears the slot; replacement does not inherit it;
  reappointment uses the same person's retained bank, including explicit null.
  Updated two old tests asserting vacant-slot inheritance; added stronger explicit
  former/replacement/reload tests instead of dropping coverage.
- Read models use exact BigInt aggregation/string contracts and paired keysets.
  Search matches prototype due/paid filtering while leaving allocation global.
  Payout retry across JSON reload returns the original receipt without extra money,
  audit or notification; different keys cannot repay already-settled shares.

## Evidence

| Scope | Result |
| --- | --- |
| Focused shared revenue/director/persistence | 103/103,13 files,2.72s |
| MSW HTTP revenue + existing director endpoints | 20/20,2 files,3.74s |
| Native receipt/payment/payout/retained-bank integration | 41/41,5 files,53.79s |
| Root lint/typecheck/unit/depcheck | PASS;2152 passed +2 existing skips |

Root unit breakdown: Admin612, Portal418, shared697, server266, UI56,
integrations103+2 existing skips. Lint/typecheck8/8 tasks each; unit6/6,3 cached.
Depcheck2334 frontend/shared +1049 server modules, no violations. Runner57079
terminal exit0; normal formatting/commit hooks passed. Native runner95188 exit0.

Native integration uses actual opchub_test/Postgres5432 and Redis6379/db2 with a
separate test app. It covers the shared math extraction through existing payment,
outbox, replay, concurrency and payout suites. No query changed, so the eight
EXPLAIN plans in [dashboard evidence](TIP-V46-802-dashboard.md) remain applicable;
their timings are not claimed as remeasured here.

Local ignored logs in `e2e/.parity-out/`: `v46-802-msw-focused-final.log`,
`v46-802-msw-http.log`, `v46-802-shared-math-int.log`, `v46-802-msw-precommit-final.log`.
Initial lint rejected non-null assertions in production helpers; replaced them
with explicit checks, not lint suppressions. Removed redundant tuple assertions in
HTTP tests. No test skip/timeout/assertion waiver.

## Remaining acceptance work

- Common native/MSW actual-receipt demo with known historical appointments; do not
  derive financial entitlements from legacy affiliate commission values. Current
  default mock ledger is intentionally empty until actual simulated receipts occur.
- Outer Affiliate summary/Media Soft retained-total integration (including direct,
  vacant-region and retired-beneficiary amounts), not just the three current slots.
- Same-assertion MSW/server browser tests, parity1440/390, final full integration,
  builds and full E2E regression. Unit HTTP/JSON reload evidence is not browser
  lease/reload proof. No802 browser or parity PASS claimed in this checkpoint.
- Q-V46-802-1/2 remain explicit; ended-month behavior is not acceptance of the
  prototype all-due action. No whole-goal block. 801 failures remain preserved.

No DB migration, native demo mutation, dist overwrite or service restart.
API28484/socket33408/worker16200 retain original30/10/2026 start times.

[Stacked compare](https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V46-801-regional-directors...feature/TIP-V46-802-revenue-sharing)
