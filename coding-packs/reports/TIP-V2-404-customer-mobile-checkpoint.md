# TIP-V2-404 — customer mobile checkpoint (IN-PROGRESS)

**Source `3932bbf`, committed and pushed.** Continue Affiliate/P4 acceptance,
then stop; no P5 implementation. This is not TIP-404/P4 completion.

## Delivered

- Detail tabs reveal the selected label and API history count within their own
  horizontal strip on selection/count/width changes. They never scroll the
  page vertically. Switching back reveals the first tab; an already visible
  tab is left alone. The hook is separate from the rendering component.
- Customer pager retains previous/next, every page button, the full range label
  and page-size selector on one compact row. Only its range text may wrap;
  no control, count, history row or paid receipt is hidden or removed.
- Customer date column uses numeric Vietnam calendar dates (`8/10/2026`), and
  its rate header is `% HH`, matching the actual prototype. Padded dates used
  elsewhere, including historical payout presentation, remain unchanged.
- No API, DB, ledger, seed, permission, money calculation or shared UI component
  changed. Production code and extensive tests remain in separate small files.

## Verified on current source

| Check | Result |
|---|---|
| Forced lint/typecheck/unit | **22/22 tasks**, **765 passed + 2 existing skips** |
| Unit breakdown | Admin 283, Portal 163, shared 140, server 111, UI 43, integrations 25 |
| Depcheck | Both graphs pass: **1452/3984**, server **668/2924** |
| Final Admin builds | MSW and native both pass; separate dist directories |
| Focused mobile browser | **2/2**, 360px and 390px |
| Committed Affiliate + Admin RBAC MSW | **42/42**, 1.4m |
| Raw Admin Affiliate parity | **10/14**, all metadata SHA `3932bbf` |

Seven new unit cases cover right/left/visible/empty tab-strip behavior and
numeric dates, Vietnam day boundary, null dates and unchanged padded formatting.
The two new browser cases verify actual customer name/date/150k commission,
selected tab and every pager control inside the viewport, compact footer height,
size 8 → 10, page 2, F5 retaining size/range/tab, and switching back to months.
They use the same assertions for native and MSW; only MSW was executed here.
The focused two are included in 42, not additional distinct cases.

Customer parity now **1.8029% desktop / 1.9372% mobile**, improved from
1.8196% / 4.9199%. The former failing mobile diff was removed automatically
after passing at the unchanged 3% threshold. Tab count, size selector, financial
values, historical snapshots and real agents were retained; no screenshot mask,
seed rewrite or threshold change was used.

## Still required, not waived

Four raw images remain FAIL: default agents **24.14%/27.69%**, policy
**5.37%/15.48%**. Default agents remain 62 actual agents versus prototype six,
not replaced by the passing filtered HAOPC state. Editable policy terms remain
required by SRS §20.6/20.7 and TIP-404; do not remove them to match static copy.
Those requirements were re-read from the actual SRS during this checkpoint.
The fourteen images are the current measured group, not proof that every
required bulk/cancel/payout/error/permission state is registered and accepted;
the complete state inventory and its verification remain required.

Native browser AT-AF/CSV-audit/permissions, regression C1–C6/audit E2E,
UAT/AT-RB/AT-LK/§22.6 evidence reconciliation, complete parity, final reports
and P4 main merge are not complete. Prior native integration 48/48 on
`79f7073` remains historical contract evidence, not a newly run browser suite.
No native service was started; no bypass retried the previously rejected stack
startup. Test-owned MSW servers were torn down after the terminal runs.

Evidence: [`evidence/v2-404/customer-mobile/`](evidence/v2-404/customer-mobile/).
