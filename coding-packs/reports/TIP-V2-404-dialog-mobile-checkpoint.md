# TIP-V2-404 — mobile financial dialogs (IN-PROGRESS)

Test source **`4949a41`**, committed/pushed. No production UI/API/seed/ledger
change. User scope remains finish Affiliate/P4 then stop; no P5.

## Actual browser evidence

Four new tests run the same assertions for either target, at **360×844** and
**390×844**. Only the MSW browser target was executed in this checkpoint.

- Cancellation: select the two exact customers of Nguyễn Văn An; blank and
  whitespace reasons disable confirmation; closing a filled draft sends zero
  POSTs and leaves the recorded row unchanged. Reopen starts with an empty
  draft. One confirmed POST sends the trimmed reason and returns cancelled=2;
  F5 shows that reason on both correct rows with their 120,000 VND retained.
  The third unselected customer remains recorded.
- Bulk rate: select HAOPC/KHOAOPC on the current filtered page; empty input
  disables Save and displays its error. Closing sends zero PUTs and leaves Hà
  at 25%. Reopen, enter 30%, confirm one PUT with updated=2, then F5 verifies
  both agents at 30%. Query/size URL readiness is asserted before reload.
- At each blank/invalid and valid state, every dialog/input/textarea/button
  rectangle is checked inside the viewport. Eight **actual screenshots** are
  retained, one per state/width, and all eight were visually inspected.
  These are Chromium viewport tests, not physical-phone/virtual-keyboard proof.

The prototype does not render these confirmation/form dialogs. Screenshots are
explicitly **SRS-only evidence**, not fabricated prototype matches or extra
passing parity rows. They do not approve a visual deviation automatically.

## Unit negative/pending states

Three new `rate-dialog.spec.tsx` cases verify bulk 409 retaining the rate and both
IDs for retry, revoked `affiliate.action` preventing an API call/false close,
and pending input/footer/ESC dismissal behavior until the response arrives.
These mock the API boundary, not native backend failures. Existing four dialog
cases remain; focused **7/7** is included in the global unit count.

## Verification

| Check | Result |
|---|---|
| Focused mobile browser | **4/4**, initial and explicit-path capture rerun |
| Committed Affiliate/RBAC MSW | **48/48**, 2.8 minutes on `4949a41`; four new cases included |
| Forced gates after dialog tests | **22/22**, **807 passed + 2 existing skips** |
| Latest forced gates after audit correction | **22/22**, **813 passed + 2 existing skips**, source `ca6b368` |
| Latest unit breakdown | Admin 321, Portal 163, shared 140, server 121, UI 43, integrations 25 |
| Latest depcheck | Both pass, **1468/4036**, server **673/2937** |

Six extra server units belong to the separate C5 audit parser correction, not
six additional mobile cases. No fresh app build was needed: only tests/audit
tooling changed; production UI remains `a853ba9`. No new pixel measurement was
run: the last actual group remains **16/22 on `2a589cb`**, six raw failures.

Initial helper lint rejected seven non-null assertions; the helper now checks
for a real box explicitly. Initial body-only screenshot attachments did not
persist files with the list reporter; the final helper writes an explicit test
output path and the committed full run produced the eight archived PNGs.
No fabricated image, image edit or assertion weakening was used.

## Remaining

Native dialog/browser acceptance, browser conflict/pending/permission captures,
other inventory states, six parity failures, seeded audits/UAT/§22.6, final
reports and P4 main merge remain. Preliminary static audit findings and its
corrected C5 parser are documented in `V2-P4-audit-preflight.md`; audit exit 0
does not mean all checks passed. No rejected native startup was retried. Final
TCP checks found all seven app/prototype ports closed; DB/Redis were not stopped.

Evidence: [`evidence/v2-404/dialog-mobile/`](evidence/v2-404/dialog-mobile/).
