# V46-802 — revenue dashboard and Admin tab checkpoint

**IN PROGRESS, not TIP-DONE.** Source **`8ff530d7`**. Branch:
`feature/TIP-V46-802-revenue-sharing`. Held native processes do not run this source.

## Implemented

- Permission-guarded dashboard with three current regional slots, database policy,
  exact decimal-string totals and batched member identities. Vacant slots never
  display the previous beneficiary's bank. Retired recipients have a separate
  keyset-paginated list and retain their own unpaid/paid balances and bank.
- Admin Affiliate > GĐ Vùng: server-derived KPIs, URL search with responsive draft
  and debounce, expandable ledger, history, pagination and error/retry states.
  Read-only users can inspect without a payout action. Missing banks disable pay.
- Payout confirmation uses the existing ended-month API. It preserves the same
  idempotency key on retry and refetches financial queries after success; no
  optimistic money, client-generated entitlement or real bank transfer.
- Namespaces/types/hooks/subviews are separate files. Shared AdminTable gets an
  optional expandable prop; shared FilterBar gets an accessible search label.
  Those shared changes require corresponding regression coverage at the TIP gate.

## Prototype inspection and corrections

Opened the actual prototype in Chromium; screenshot:
`e2e/.parity-out/v46-802-prototype-initial.png`. Search filters rows and due/paid
KPIs, but not the total-allocation/receipt caption. An initial implementation
incorrectly kept every KPI global; server/UI/tests were corrected to the observed
behavior. This inspection is not an app parity measurement.

The former-recipient query initially performed a large revenue_shares Seq Scan.
Replaced the semi-join with a bank-owner ID page plus indexed LATERAL latest-share
lookup, then deferred payload joins. Kept the no-large-Seq-Scan assertion and
planner defaults. Test fixtures roll back the 10k shares and 10k bank owners.

Other test failures were fixed rather than waived: type-only import cycles removed
by using TanStack's public query types; long functions extracted; URLSearchParams
explicitly stringified; search test queries the real `searchbox` role, not textbox;
AntD virtual-option selection uses keyboard interaction. No timeout, assertion,
skip or parity threshold was relaxed.

## Verification

Root `pnpm lint && pnpm typecheck && pnpm test && pnpm depcheck`: **PASS**.
**2131 passed +2 existing skips**: Admin608, Portal418, UI56, integrations103
+2 skips, server266, shared680. Lint/typecheck8/8; unit6/6 tasks,2 cached;
depcheck2318 frontend/shared +1048 server modules, no violations. Runner40452
terminated exit0. Formatting check and git diff --check pass; normal hooks used.
Focused Admin tests: **12/12**, three files,16.78s (presentation/API/UI).
They cover exact large VND, Vietnam dates, database-policy rendering, URL filters,
permissions, lazy retired/history reads, ended months and same-key payout retry.

Native integration: **16/16**, four files,70.87s. Dashboard suite includes policy
snapshots, totals above Int32, distinct affiliates, prototype filter semantics,
retired bank/balance isolation, stable former cursors and negative permissions.
Affected ledger and payout API suites also pass. Real opchub_test/Postgres5432
and Redis6379/db2; test application is separate from held API.

EXPLAIN ANALYZE BUFFERS of exact production queries,10k shares +10k bank owners:

| Query | Execution ms | Index |
| --- | ---: | --- |
| dashboard aggregation | 0.648 | director_months |
| former recipients | 13.218 | bank PK + director_ledger + share PK |
| former cursor | 15.450 | bank PK + director_ledger + share PK |
| ledger page | 0.109 | director_ledger + share PK |
| ledger cursor | 0.154 | director_ledger + share PK |
| beneficiary balance | 0.196 | director_months |
| months | 0.118 | director_months |
| month cursor | 0.127 | director_months |

No Seq Scan on the two large fixture tables. Small regional-slot scans are not
large-table failures. These are local query measurements, not an SLA/load claim.

Logs under ignored `e2e/.parity-out/`:
`v46-802-dashboard-precommit-final.log`, `v46-802-dashboard-ui-final.log`,
`v46-802-dashboard-int-final.log`, `v46-802-ledger-query-plans.json`.

## Still required

1. MSW revenue domain/handlers, persistence and actual-receipt lifecycle; mirror
   beneficiary-owned bank retention in mock appointment/revocation/configuration.
   Mock currently retains slot banks, so that is a real remaining cross-mode gap.
2. Native/MSW demo derived from actual receipts, not legacy commission amounts.
3. Outer Affiliate summary/Media Soft retained total still uses the legacy model.
   Current director dashboard totals are NOT a replacement for a global retained
   figure: vacant/no-referral receipts and retired recipients must be included.
4. Identical-assertion MSW/server browser tests, parity at1440/390, full integration,
   build and full E2E regression at the TIP gate. None is claimed complete here.
5. Q-V46-802-1 (post-paid correction) and Q-V46-802-2 (cutoff/monthly dialog versus
   prototype all-due action) remain explicit. Do not invent clawbacks or call the
   ended-month dialog a prototype parity PASS. Other work continues without
   blocking the entire goal.

No migration or native demo change in this slice. Original API28484/socket33408/
worker16200 retain their30/10/2026 start times. No restart or dist overwrite.
Old held801 binaries cannot provide802 browser evidence. Prior801 FAILs remain.

[Stacked compare](https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V46-801-regional-directors...feature/TIP-V46-802-revenue-sharing)
