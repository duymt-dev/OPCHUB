# TIP-V2-404 — agent card checkpoint (IN-PROGRESS)

**UI source: `6ee0fc3`, committed and pushed.** Continue full Affiliate/P4 and
stop after acceptance/merge; do not implement P5. This is not P4 completion.

## Implemented against the actual prototype

- Agent lists now use mobile cards below 768px, retaining all eight data columns
  and row selection instead of clipping them in a horizontally scrolling table.
  The desktop table remains a table with prototype column widths.
- Name/status/email are extracted into `AgentIdentity`; the backend lifecycle
  status remains authoritative. Paused agents do not become active to match an
  image. No bank details are fabricated from the `hasBank` boolean.
- Bulk actions are extracted into `AgentBulkBar`, preserving the existing
  permission guard, loading behavior, selected IDs, edit dialog and export path.
  All-page export and the page-size selector remain available.
- The internal AntD measurement row is hidden as internal layout machinery, not
  a screenshot mask or a removed data row. An early CSS specificity error made
  this row a blank card; the failed intermediate measurement/log is retained.
- The empty-state cell keeps full card width. Desktop/mobile identity, money,
  navigation and status come from the same list DTO; no additional per-row
  detail calls, fixture/seed changes or frontend financial arithmetic were added.

## Evidence already terminal

- Forced workspace lint/typecheck/unit gate **22/22 tasks passed**, **743 unit
  passed + 2 existing skips** (Admin 266, Portal 163, shared 135, server 111,
  UI 43, integrations 25).
- Depcheck passed: **1439 modules / 3954 dependencies** for the main graph,
  **666 / 2913** for the server graph.
- Final Admin MSW production build passed.
- Fresh native Admin build passed; no native service was started by that build.
- Committed-source Affiliate + Admin RBAC MSW **39/39 passed (1.6m)**. The two
  focused mobile cases are included in 39, not counted again.
- Focused mobile behavior **2/2** at **360 and 390px**: every one of the nine
  table cells (including selection) is visible and inside the viewport; actual
  HAOPC rate/revenue/balance remain, checkbox/clear work, reconciliation opens
  the real detail, F5 keeps it, and unmatched search shows a full-width empty
  cell. Same assertions are registered for native; this run is MSW only.
- Initial workspace gate failed the existing function cap when pager wrapping
  expanded `AffiliateTable` to 84 lines; extraction fixed it without suppressing
  lint. Initial uncommitted agent parity was **1/4**, not accepted. Its metadata
  is the base SHA `150e7fd`, not the final source commit.

## Contract gaps remain explicit

TIP-404 explicitly says not to modify the API. The current list DTO lacks a bank
object and distinct period commission/count, while the prototype shows bank
details and monthly totals/counts next to lifetime customer/revenue statistics.
`balance` is recorded/unpaid only, not the total commission of a paid month.
`AffiliateAdminService.listDto` also applies its month argument to the aggregate
query; frontend code must not assume those selected-month counts are lifetime
counts. These are source-inspection findings, not newly executed native tests.

See **V2Q-178** for a scoped corrective API follow-up (TIP-V2-402B) rather than
adding N+1 detail reads, fictional bank values or client-side money calculations.
All 62 real automatic agents remain in the default list, not the prototype's
six. That state is still measured independently of a legitimate HAOPC search.

## Committed-source raw parity — 8/14, NOT accepted globally

The 14-image Admin Affiliate group on `6ee0fc3` still has six failures. Default
commissions/detail, the inline editor and desktop customers remain under 3%.
The four agent images are:

| State | 1440 | 390 |
|---|---:|---:|
| Default agents | 16.58% FAIL | 20.66% FAIL |
| HAOPC filtered by actual search | 1.14% | 6.99% FAIL |

Default desktop improved from 35.27%, but filtered mobile increased from 5.80%
to 6.99%; this is not an across-the-board pixel improvement. Actual cards now
expose the complete current DTO instead of clipping data in a narrow table.
Do not revert to clipped columns to obtain a lower diff, or mask the genuine
62-versus-six dataset mismatch. Missing bank/period fields and extra required
controls remain explicit; the six failing diffs/results are retained unchanged
in threshold/masking policy. Policy is still 5.37%/15.48%; customers mobile is
still 4.92%. No waiver or visual acceptance is inferred from passing behavior.

Parity, native browser AT-AF/audit, remaining states, final reports and P4 main
merge remain required. No deviation is self-approved by this checkpoint.

Evidence: `evidence/v2-404/agent-cards/`.
