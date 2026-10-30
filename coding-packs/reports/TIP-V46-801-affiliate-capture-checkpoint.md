# V46-801 — current Affiliate capture readiness (PARTIAL)

Source `396e2fad`, committed/pushed. Previous continuation made progress with
the exempt sidebar layout and real mobile FAIL retained. This continuation
restores a broken measurement journey; no production/seed/API changes.

## D-85 readiness, not business acceptance

The actual v4.6 prototype monthly tab is `Đối soát theo tháng`
(`index.html:5956`), not the old `Đối soát & chi trả theo tháng` which the
app still displays pending803. The parity navigation now requires the exact
current title for each UI plus the same `Khách hàng của đại lý` landmark.
HAOPC search, Lê Thu Hà detail navigation, clocks/waits, full-page capture,
1440/390 widths,3% threshold and D-85/CUS/RATE scenarios are preserved.
No new skip, timeout increase, state injection, baseline/crop/mask or payout
implementation. In particular, a passing image does not prove D-119 behavior.

The first related six-image run completed6 passed/2 failed in27.3s (including
two existing capture-harness tests). All six images were captured; failures
are real CUS image comparisons, not obsolete-landmark timeouts:

| State              |           1440 |             390 |
| ------------------ | -------------: | --------------: |
| D-85 detail        | 0.921373% PASS |  2.352309% PASS |
| D-85-CUS customers | 8.453091% FAIL | 16.517898% FAIL |
| D-85-RATE edit     | 0.927778% PASS |  2.335448% PASS |

This first run used the uncommitted selector edit, reporter SHA d07c2054;
post-commit whole related-area measurement is recorded separately below.
Do not claim the first run was already at396e2fad or call six images six passes.

Root precommit lint/typecheck8/8 each, unit2085 passed +2 existing S3 skips
(all six tasks cached from unchanged production/test-unit inputs), depcheck
2280+1008 pass. Prettier check and git diff --check pass. No rebuild/native
rerun required for this parity-only selector: current Admin/Portal builds and
native contracts are unchanged. Logs under `e2e/.parity-out/`:
`v46-801-affiliate-detail-{current,precommit}.log` and
`v46-801-affiliate-current-396e2fad.log`.

## Actual CUS defect and next correction boundary

Post-commit whole declared Affiliate group (`PARITY_IDS='D-84*,D-85*'`, two
workers) is terminal exit1: **12 passed /24 failed**,36 collected,2.1m. This
includes two passing harness tests,32 captured images (10 PASS/22 FAIL), and
two uncaptured D-84-AFF-BULK cases. The latter prototype row locator finds two
HAOPC matches where exactly one is required, at both widths; assertion retained.
Those two old0b76e98a rows in results are stale, **not** current PASS evidence.
All32 fresh rows have actual396e2fad SHA. No new skip or discarded failing case.

| Captured state          |            1440 |             390 |
| ----------------------- | --------------: | --------------: |
| D-84                    | 15.713563% FAIL |  7.356264% FAIL |
| D-84-AFF                |  5.933588% FAIL | 26.746280% FAIL |
| D-84-AFF-Q              |  1.534182% PASS | 30.281490% FAIL |
| D-84-POL                | 34.588967% FAIL | 31.441338% FAIL |
| D-84-COM-BULK           | 14.038668% FAIL |  9.063134% FAIL |
| D-84-COM-EMPTY          |  1.571219% PASS |  6.420965% FAIL |
| D-84-AFF-EMPTY          |  0.986420% PASS |  1.913051% PASS |
| D-84-COM-RECORDED       | 15.787056% FAIL | 10.545591% FAIL |
| D-84-COM-RECORDED-MENU  | 15.833952% FAIL | 11.005629% FAIL |
| D-84-COM-PAID           | 17.291942% FAIL | 10.373262% FAIL |
| D-84-COM-PAID-MENU      | 17.384480% FAIL | 10.840668% FAIL |
| D-84-COM-CANCELLED      |  1.825849% PASS | 12.182512% FAIL |
| D-84-COM-CANCELLED-MENU |  1.947531% PASS | 14.556319% FAIL |

D-85/CUS/RATE post-commit values equal the six-image table above. These fresh
measurements supersede old visual evidence; large differences are not attributed
to the selector edit changing production UI. They expose previously unmeasured
v4.6 layouts/model changes. Retain every real failing diff.

Both current mobile images were inspected. Prototype v4.6 uses an880px
horizontal customer table; app `customer-layout.module.css` retains the old
v4 two-column mobile grid and658px desktop minimum. Thus app exposes six
fields stacked in each mobile row while prototype initially shows name/date
with the rest horizontally scrollable. Row rhythm and total page height differ.
This is a genuine layout correction opportunity, not permission to hide
columns, fake financial values or implement803 inside801.

The visible totals also differ: prototype Hà commission5,160,000/paid3,300,000
versus app6,900,000/4,200,000. Those are the existing old financial model versus
v4.6 year/policy semantics; do not rewrite historical transactions to match
pixels. Related802/803 work remains unimplemented and cannot be inferred from
the D-85 detail image passing3%.

## Sidebar diagnosis without changing acceptance

Read-only pixel comparison of the existing390×1418 capture at8b1f0a13 gives
28,139 differing pixels (5.088243%). Attribution using the same threshold0.1:
sidebar8,646 (1.563415 percentage points of the whole image), adjacent overlay
1,250 (0.226032), below viewport18,243 (3.298796). These are diagnostic counts
only; no region was excluded from acceptance, no screenshot modified or new
masked/cropped result generated. The below-viewport onboarding alone exceeds
the full-image3% budget. Further fee-card cosmetics cannot resolve that state
contradiction; preserve actual member profile/event data documented in Q11.

TIP801 remains IN PROGRESS,802 not started. No completion report or accepted
deviation. Full frontend regression remains due after prior Portal CSS edits;
unchanged backend integration1894/1894 at302174ed remains scoped evidence.
