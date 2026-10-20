# TIP-V2-404 — policy preview checkpoint (IN-PROGRESS)

API **`986930c`** (TIP-402C), UI **`e1cb2f7`**, both committed/pushed. Finish P4
then stop, no P5. This closes the missing monetary-caption implementation, not
the three remaining raw parity failures or native browser acceptance.

## Delivered

- Policy rate hint consumes the protected server preview for the **current
  valid integer draft**. No multiplication, balance substitution or hardcoded
  monetary fallback exists in the production UI.
- Query key contains the draft rate. Invalid/missing values and missing view
  permission use `skipToken`; cached data is not shown without view permission.
  Late old-rate and wrong-rate responses cannot label a different draft.
  Loading/error states do not invent an amount.
- Leaf component renders the response through Vietnamese money formatting;
  query logic stays in its feature hook. Save still sends only the three
  existing policy fields; terms, field-error/retry behavior and rules remain.
- Eleven new UI unit cases verify response formatting using deliberately
  non-formula fixture amounts, six invalid values, permission/cache denial,
  out-of-order completion, mismatched rate and API failure.
- Both existing mobile browser cases now additionally inspect the actual GET
  response at 25% (**150,000 VND**), its visible caption and F5 persistence.
  Initial 20% caption is also asserted. Same assertions on native/MSW; only MSW
  browser was executed here.

## Verified

| Check | Terminal result |
|---|---|
| Forced lint/typecheck/unit | **22/22**, **804 units + 2 existing skips** |
| Unit breakdown | Admin 318, Portal 163, shared 140, server 115, UI 43, integrations 25 |
| Depcheck | **1463/4018**, server **671/2935**, both pass |
| Fresh builds | Portal MSW, Admin MSW, Admin native pass; isolated dist directories |
| Committed Affiliate/RBAC MSW | **44/44**, 1.5 minutes |
| Raw Affiliate parity | **11/14**, all fourteen rows SHA **`e1cb2f7`** |

Native API/contract verification is **55/55 in 23 files**, plus a committed
focused 9/9 subset, recorded in [TIP-402C completion](TIP-V2-402C-completion.md).
These are not browser tests or additional distinct cases to add to 55. Focused
UI 22/22 includes the prior eleven policy-form cases and eleven new preview
cases; they are already included in 804.

## Visual result — not an improvement claim

Policy desktop remains PASS at **2.3953%** (previously 2.3704%). Mobile worsened
from **13.7312% to 16.5967%**, still FAIL. The measured screenshot was visually
inspected: it contains the real 120,000/600,000 caption, not a loading message,
and retains visible editable terms before Save. This does not isolate a single
root cause for every changed pixel. The extra required terms section remains
absent from the prototype; no collapse, mask or threshold change was applied.

Default agents still fail **24.1407%/27.6858%**, retaining all 62 real agents
versus six prototype agents. Other measured states remain passing: D-84
1.4234%/1.1162%, HAOPC search 1.0907%/1.9680%, D-85 0.9265%/2.2593%, customers
1.8029%/1.9372%, inline rate 0.9329%/2.2430%. The seven states/fourteen images
are not a complete bulk/cancel/payout/error/permission state inventory.

## Remaining scope

Complete/verify that inventory; resolve or obtain explicit acceptance of visual
differences without deleting real data or required fields; run native browser
AT-AF/CSV-audit/RBAC/locked behavior and seeded C1–C6/audit E2E; reconcile
UAT/§22.6/TEST-GAPS; final reports and P4 main merge. No P4-DONE or P5 work.
No rejected native stack startup was retried or bypassed. Test-owned MSW
servers were torn down; final listener check found none on the seven P4 app/
prototype ports. Native DB/Redis services were not stopped.

Evidence: [`evidence/v2-404/policy-preview/`](evidence/v2-404/policy-preview/).
