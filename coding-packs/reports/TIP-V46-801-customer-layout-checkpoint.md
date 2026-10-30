# V46-801 — v4.6 customer table layout (PARTIAL)

Source `ad0d5e3f`, committed/pushed. Previous turn made progress by restoring
D-85 capture readiness and measuring all34 related Affiliate image cases, retaining
all failures. This slice corrects measured presentation only, not802/803 money.

## Correction

Prototype v4.6 `index.html:4537–4550` uses an880px horizontally scrollable
customer table,40px header and minimum56px rows. App retained the v4 mobile
two-column grid/658px table. Remove that obsolete grid, retain all six columns,
use110/90/120/120px fixed middle columns and flexible200/240px name/history
bases,12px cell gutters and current header/row rhythm. History receipt values,
page-size controls, API, fees, commissions, payout actions and seed are unchanged.

The existing same-mode360/390 browser cases retain exact date/300,000đ,
tab switching, pagination/size/F5 and viewport-fit assertions. Header expectation
changes38→40 according to the measured current prototype; new checks require
all six columns,880px table, real local horizontal overflow (not page overflow),
56px minimum first row, scrolling the history header and name cell into view.
No column is hidden, no capture area/mask/baseline/threshold changed.

## Verification

| Scope                              | Actual result                                                                 |
| ---------------------------------- | ----------------------------------------------------------------------------- |
| Root precommit lint/typecheck      | 8/8 each,exit0                                                                |
| Root unit                          | 2085 passed +2 existing S3 skips; Admin592 fresh, five unchanged tasks cached |
| Depcheck                           | 2280 frontend/shared/e2e +1008 server modules, no violations                  |
| Admin MSW build                    | PASS `.next-v46-msw-build`, mocking=msw, local Portal relay                   |
| Admin native build                 | PASS `.next-server`, mocking=off, API proxy127.0.0.1:4000                     |
| Native customer responsive file    | 2/2,21.6s,360/390, same assertions                                            |
| Related MSW complete files         | 7/7,23.2s; Admin Affiliate, customer responsive, inline rate                  |
| Post-commit unmasked D-85/CUS/RATE | 8/8,25.9s; six image rows +two existing harness cases                         |

| State     |           1440 |            390 |
| --------- | -------------: | -------------: |
| D-85      | 0.921373% PASS | 2.352309% PASS |
| D-85-CUS  | 1.836861% PASS | 2.503632% PASS |
| D-85-RATE | 0.927778% PASS | 2.335448% PASS |

CUS previously8.453091%/16.517898%. The reporter removes those two failing
diff files only after actual passing captures atad0d5e3f. Current mobile image
was inspected: truthful old money totals remain different from prototype,
monthly tab retains its old app wording pending803; these do not authorize
claiming the new financial model is implemented merely because pixels pass.

### Retained failed measurement invocation

The first new Admin MSW build omitted its required local Portal relay setting.
It compiled but defaulted `NEXT_PUBLIC_PORTAL_URL` to production origin;
Admin login bridge returned503 (`Mock Affiliate state unavailable`). Initial
parity suite ended2 harness passes/6 login timeouts,6.2m,exit1, no image proof.
Bounded browser diagnosis confirmed `/v1/admin/auth/login`503; no auth traces
or credentials were saved. No test/harness timeout/assertion was weakened.

Only after that original runner40730 was confirmed terminal, rebuilt with
`NEXT_PUBLIC_PORTAL_URL=http://localhost:3000` (plus existing `msw`/isolated
dist env), then the normal unchanged suite passed8/8 above. No `.env` edits
or held service restarts. Native provider is off and does not use this bridge.

Ignored logs under `e2e/.parity-out/`: `v46-801-customers-{build,
build-local-relay,native-build,precommit,parity,parity-ad0d5e3f,native,msw,
restore}.log`. Required seed +demo seed +dev-cache flush exit0 after native
checks. API28484/socket33408/worker16200 retain original start times/binaries.

Backend/shared unchanged: full integration1894/1894 at302174ed remains scoped
evidence. Earlier full MSW342/4 skips predates changed Portal/Admin CSS; final
frontend regression remains required. Sidebar mobile, P16 and other Affiliate
visual/selector gaps remain open. TIP801 not complete;802 not started.
All measurement/build/browser/precommit runners are terminal; no wait required.
