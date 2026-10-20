# TIP-V2-402B — list presentation contract

**Source: `79f7073`, committed and pushed.** Bounded API correction under the
existing full V2 goal. TIP-404/P4 visual/native-browser/audit acceptance is not
complete; finish Affiliate/P4 and then stop, no P5 work.

## Delivered

The protected existing `/admin/affiliates` list now requires these additive
fields through `affiliateAdminListRowSchema`:

- `bank`: the current live account, or null; never a substituted paid receipt.
- `lifetime.customers/revenue`: recorded/paid lifetime counts and revenue,
  independent of a selected month.
- `period.month/customers/commission/payable/paid/status`: requested YYYY-MM or
  null for all months, server-owned valid totals and recorded/paid/mixed/none.

Every legacy row field keeps its prior optional-month semantics. The old base
row and detail schemas are unchanged. No mutation, permission, endpoint, seed,
migration, ledger value, outbox/audit behavior or stack version changed.

Bank columns are selected only after deferred ID pagination. A selected month
adds one existing batched lifetime aggregate over the page IDs, not one query
per row. Without a selected month the legacy aggregate is reused. Both native
and fake providers assemble the same required response; UI components perform
no new financial calculation. TIP-404 still owns consuming these fields.

## Verified evidence

- Native PostgreSQL integration on **opchub_test:5432 / Redis 2**: committed-source
  Affiliate suite plus Admin contract **48/48, 20 files**, 167.96s. The one
  contract case checks 14 endpoints; it is not counted as 14 extra tests.
- Three new native cases are included in 48, not added again: null bank/zero
  data, period/lifetime with cancellation and historical unequal rates, and
  denial without `affiliate.view`. A paid 30% amount remains 180,000 after the
  current rate becomes 20%; selected September total is 300,000, not a client
  reconstruction from current rate. Live bank changes while the paid receipt
  retains its original bank. Empty months retain lifetime statistics.
- Five new shared cases exercise the required schema, fractional/negative VND,
  month validation, null bank/empty/paid periods and the actual AF0 provider:
  HAOPC September 6 customers/900,000 paid versus lifetime 13/7,800,000 revenue.
- Forced workspace lint/typecheck/test **22/22 tasks passed**; final shared
  lint/typecheck/test **3/3** passed after adding the real-provider assertion.
  Committed-source full unit rerun **748 passed + 2 existing skips**, six tasks:
  Admin 266, Portal 163, shared 140, server 111, UI 43, integrations 25.
- Depcheck passed both graphs (1441/3961 and 668/2924).
- Fresh Portal/Admin MSW builds and production server build passed. Neither a
  build nor embedded native integration is evidence of native browser flow.
- Full Affiliate + Admin RBAC MSW on committed source **39/39 passed (1.4m)**,
  using both freshly rebuilt apps/relay provider. This is not native E2E.

## Query-plan scope

The committed native run includes the existing Admin EXPLAIN cases on **10,000
rows**, using temp clones with deployed columns/defaults/indexes. Both offset
and keyset agent queries (now selecting the late bank payload) and commission
queries use index scans, no planner disabling/cost forcing. Existing history
and backfill plan suites also pass. This is not a claim of a 100,000-row load
test or a new production deployment. Raw plans are archived with the run log.

## Remaining P4 acceptance

Fresh 14-image Admin Affiliate parity on `79f7073` is **8/14**, six raw failures
retained in the normal report/diffs with unchanged threshold/masking policy.
This API delivery does not claim to fix the still-unwired presentation UI.

TIP-404 must use the new explicit list fields, finish agent/policy/customer UI
states, rerun parity, native browser AT-AF and audit/regression, write final
reports and merge P4 to main. Default real automatic agents must not be reduced
from 62 to six to match prototype data. No visual deviation is self-approved.

Evidence: `evidence/v2-402b/`. Initial enum-fixture type and URLSearchParams lint
failures are retained; the final gates passed without suppression or `any`.
