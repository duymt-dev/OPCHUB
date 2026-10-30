# V46-801 — Portal pricing layout (PARTIAL)

Source **`2cad6a9f`**, committed/pushed. Previous goal turn made progress by
finishing full native/MSW gates and isolating the notification precondition.
This slice fixes measured presentation differences, not exemption semantics.

## Read-only measurement → scoped CSS correction

The normal existing Bảo login/pricing journeys were executed on the actual
prototype and current app at1440/390, with the same standard clock/image/font
stabilization. No prototype state/markup injection, new masks or cropped capture.
The temporary measurement suite was removed after it completed2/2; geometry
JSON/logs remain ignored local evidence under `e2e/.parity-out/`.

- At390, service panel widths were both364px but app inner width332 versus
  prototype304, because app replaced30px gutters with16px. First service row
  was185.75px tall versus225.5px, shifting every following row. Keep30px gutters
  and bottom spacing; below1100 use the prototype's24px top spacing.
- At1440, ordinary business status naturally wrapped into a56px header;
  shorter exemption copy collapsed it to24px and annual/exemption slot34→17px.
  Business card height536.671875→494.875px moved the whole service panel up.
  Card-local container layout now stacks name/status on narrow business cards;
  the price/exemption description retains two line-heights across states.
- Retain truthful exemption wording, disabled membership payment, enabled paid
  fundraising, all cards/perks/services/consult controls. No fake revenue,
  entitlement dates, price labels, hidden controls or empty placeholder content.

## Actual verification

| Scope                                  | Result                                                                                                                     |
| -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------- |
| Related PlanCards unit file            | 4/4,4.77s                                                                                                                  |
| Root precommit lint/typecheck          | 8/8 each,exit0                                                                                                             |
| Root unit                              | 2085 passed +2 existing S3 skips,6/6 tasks; changed Portal418 ran fresh,5 unaffected tasks cached                          |
| Depcheck                               | 2282 frontend/shared/e2e +1008 server modules,no violations; two temporary measurement modules included, removed afterward |
| Current Portal MSW build               | PASS, `.next-v46-msw-build`                                                                                                |
| Current Portal native build            | PASS, `.next-server`; no held API binary overwrite                                                                         |
| MSW complete related browser files     | 15/15,1.0m: services,membership,fundraising,regional-director-portal                                                       |
| Native TIP Portal browser              | 1/1,36.5s total (case9.5s),same assertions,including new390px gutters and exemption checks                                 |
| Unmasked pricing parity + normal popup | 7/7,24.0s before commit; includes five visual rows and two harness cases                                                   |
| Post-commit same parity scope          | 7/7,19.7s; actual2cad6a9f SHA in results                                                                                   |

Logs: `v46-801-pricing-layout-{unit,precommit,build,native-build,msw,native,parity}.log`
under `e2e/.parity-out/`. Exact build commands were `pnpm --filter @opchub/portal
build` with the named isolated frontend output/mocking env; not an unfiltered
root build. Native proxy127.0.0.1:4000/socketlocalhost:4001/Portal3200.

| State                       |           1440 |           1366 |            390 |
| --------------------------- | -------------: | -------------: | -------------: |
| Director pricing            | 1.023999% PASS |              — | 1.481406% PASS |
| P-79 ordinary pricing popup | 0.075694% PASS | 0.395296% PASS | 0.108458% PASS |

Before correction director pricing was6.350731%/9.179974%. Failing diff images
are removed by the existing reporter only because the real new capture passes;
prototype/baselines and threshold remain unchanged. Post-commit verification
uses the same built source and records the actual source SHA in results.

## Preserved evidence and remaining work

Backend/shared/native seed are unchanged: full integration1894/1894 at302174ed
remains valid, as do unaffected P6/P9/P17/billing captures. Previous full MSW
342/4 existing skips is **not** a new full gate for this changed Portal CSS.
The corresponding final frontend regression must be rerun before closing801;
do not run full integration/build/E2E after every small styling edit.

Required seed +demo seed +dev-cache flush exit0 after native measurement.
HOLD API/socket/worker retained, runtime4ba6fe16 unchanged. Sidebar mobile,
P16 prototype reachability and related Affiliate visuals remain FAIL/unverified.
No #801 completion/TIP-DONE or #802 start; no acceptance criterion reduced.
