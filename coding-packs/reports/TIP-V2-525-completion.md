# TIP-V2-525 — Partial bot settings do not enable omitted toggles

## Failure / correction
The new native auto browser case still expected generation=false after setting
topics/global resume, but it became true. The shared full-settings schema has
default(true) toggles; deriving partial() preserves defaults in omitted fields.
Consequently unrelated PATCH operations silently opt generation/replies back in.

PATCH now omits those default-bearing fields before partial(), then defines both
toggles as optional booleans without defaults. Full stored/GET settings retain
legacy defaults. No permission, mutation/audit transaction, SQL or rule changes.
No browser assertion was removed or relaxed.

## Proof
- Schema regression: **5fail/1control pass before**, then6pass. Empty/enabled/
  topics/delay patches preserve omitted keys; explicit false is retained and
  full-settings legacy defaults still apply.
- Native HTTP **3/3 fail before** (enabled/topics/delay); after fix the unchanged
  regressions plus existing bot HTTP controls **7/7 pass** in2files. Assertions
  check both returned settings and persisted Postgres state.
- MSW HTTP3positive PATCH controls are included in final root Admin443pass.
- Retained new native browser failure becomes **5/5 native and5/5 MSW** with
  TIP-524, same assertions and actual UI enable; no manual run substitute.
- Joint final lint/typecheck/depcheck pass; forced root **1244pass +2existing
  storage skips**, six tasks/zero cached. Detailed counts in TIP-524 report.
- Native server dist/p5-525 and fresh isolated MSW builds pass. Native backend
  cutover verified all3 owned processes before any stop and preserved UI. Demo
  required/optional seed plus scoped cache flush restored, health200 verified.

Sanitized receipts: evidence/v2-525/. TIP-524 report qualifies the native runtime
versions and historical1305 integration receipt. Full222 browser/current full
integration, final UAT/Dashboard/replies/LLM/audit/parity and review PR remain open.
No full P5 completion or main merge claim.
