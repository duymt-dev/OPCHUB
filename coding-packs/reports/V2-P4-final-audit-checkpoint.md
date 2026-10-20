# P4 final audit checkpoint — IN-PROGRESS

## Verified scope

- Affiliate/RBAC on **694d2e3**: **52/52 native (4.6m)** and **52/52 MSW
  (1.8m)**, same assertions. Both include every AT-AF01..06 and AT-RB01..06,
  actual cross-origin writes/F5, immutable paid/cancelled history, renewal and
  CSV with the audit row of that same operation. Not the full legacy suite.
- Renewal follow-up **694d2e3** fixes a test transport assumption: native pushes
  expiry into cache, MSW polls. Both must close the dialog reactively and then
  F5 must return the persisted extended expiry. No extra commission is allowed;
  amount, year extension and both app histories remain asserted. Focused native
  and MSW pass once each, included in the full 52, not additional cases.
- **835 units + 2 existing skips**; latest gate **22/22**, 20 cached/2 e2e tasks
  executed. Admin 334 units were freshly executed in the previous 19-cache gate.
  Do not call a cached gate a forced full rerun. Dependency checks pass.
- Native API domain/contracts: **55/55 in 23 files**, plus separate contract
  coverage **2/2 in one file**, not a new single-command 57/57 run.
- Seed + seed:demo + cache flush precede final static C1–C6 and native audit.
  Static pass/findings: **25/0, 25/0, 88/0, 36/1, 173/0, 138/4**. P5 bot and
  documented S4 env deferrals are retained, not silently greened.

## Full audit is not the same as a clean findings ledger

Source **e6dc3cd** respects each scenario's Affiliate demo precondition. Full
native audit **251/251 test invocations completed, 10.8m**, but the audit catches
findings and records them instead of failing each invocation. Raw findings:
**4 S2, 19 S3**. Raw UAT **29/31**; raw combined screen/check records **243**
(211 OK, 21 with issues, 11 historical unreachable), not 243 new parity images.

Latest UAT after the correction below is **30/31**: only UAT-14 remains outside
the user's stop-after-P4 scope. This is **30/30 in-scope UAT**, not proof that P5
was implemented or that every raw screen check passed.

## Three S2 findings corrected with real native checks — source 877a461

| Finding | Actual cause | Stronger verification retained |
|---|---|---|
| d15-lock-effects | Old observer was a project/team/share member; BR-08 still permits private relationship access. Its hardcoded “no consumer” title was false: the consumer exists | Require a paid outsider with no owner/team/shared-group rights; prove 200 before lock, 404 after lock, group no longer owned by locked user, unlock in finally. No changed visibility/permission/worker logic |
| hide-message | Arbitrarily selected sender's membership had expired; API correctly returned 402 before any moderation action | Select a currently paid member, parse shared DTOs, prove sent message is readable before report/hide, then prove original content is absent. No bypass, fee mutation or empty-baseline PASS |
| UAT-29 | Old test looked for HTML in mail_logs after successful sending, when privacy code deliberately purges it | Save intro and document, verify both in real Admin preview, read actual delivered FakeMail HTML, require marker/document URL, exact returned job sent and DB body NULL |

Checks extracted into three small `e2e/audit/checks/` modules; legacy audit files
only delegate. `@opchub/shared` is now an explicit workspace dev dependency of
e2e to reuse the real zod contracts, not a new external library or duplicated
schema. No production/mail/security/ledger/DB schema change.

Native D-15 command completes 1/1; cross-role command completes 6/6 invocations
(its selector also includes five existing walks), with d15/hide/fee-expired and
all five walks recorded OK. UAT-28/29 final command completes 1/1 and records
**both UAT-28 and UAT-29 ĐẠT**. The intermediate preview selector ambiguity is
retained as a failed UAT-29 row; scoping to preview spans fixes the selector,
not the product. No unique-case count inflation.

## S3 follow-up, not cosmetic PASS

The 19 raw S3 findings remain visible and are reasoned follow-ups in
`../audit/V2-P4-AUDIT-FOLLOWUPS.md`. Six are native paused-clock filter/menu
highlight checks: interaction/rows/counts/F5 pass in the 52 native behavior
cases, but selected blue paint does not satisfy the visual assertion. The user
has deferred cosmetic gaps; do not weaken/skip the assertion or claim it passed.
A clock-poll experiment did not fix this and was reverted; six recheck
invocations completed but all six result rows still say CÓ VẤN ĐỀ.

Other findings concern old navigation paths, expected unpaid 402 collection,
OTP resend limits and external-map placeholder MIME errors. These are not
automatically waived functional regressions. **Full native behavior regression on 877a461 passes 221/221 (17.1m)**,
including old Portal/Admin flows beyond the Affiliate subset. The corresponding
full MSW regression is now running. Final reports/main merge and clean pushed
delivery remain pending. No P4 DONE claim; no P5 work.

## Evidence

`evidence/v2-404/final-audit/`: terminal logs, byte offsets and separate full-run
versus follow-up JSONL partitions. Historical raw failures are retained. Sensitive
strings, ANSI and the external-map URL key are redacted; raw percentages and
result categories are not changed. Do not merge duplicate UAT rows as new cases.
`p4-final-all-native-behavior.log` is the terminal 221/221 native result.
The MSW run is not archived as a terminal result yet.
