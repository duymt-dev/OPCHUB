# TIP-V2-404 — policy checkpoint (IN-PROGRESS)

Source **`b58f863` + `822a9cb`**, committed and pushed. Finish Affiliate/P4,
then stop; no P5. This is not a completion report or a parity waiver.

## Follow-up: API field errors (`7c36279`)

The previously uncovered server 400 mapping gap was reproduced: three added
cases failed with toast-only handling while the earlier eight passed. The
policy hook now uses the existing API-error helper to set errors only on the
three registered form fields. It preserves the entire draft and does not add a
second toast. All **11/11** policy cases now pass, including duplicate/unknown
field rejection and successful retry for each supported server field error.

Fresh forced gates **22/22**, **776 units + 2 existing skips**, both depcheck
graphs (**1459/4002**, server **668/2924**) and Admin MSW/native builds pass.
Committed Affiliate/RBAC MSW regression on `7c36279` also passes **44/44**
(1.5 minutes); no browser 400 fault-injection case was added to that suite.
The three new component cases simulate an API error; they are not native
backend validation or browser fault-injection evidence. Finding UI-404-04 is
fixed on source/unit, not a substitute for remaining native acceptance.

The layout/parity evidence below remains measured on `822a9cb`; this follow-up
does not claim a new pixel measurement or resolve the three failing images.
Evidence: [`evidence/v2-404/policy-field-errors/`](evidence/v2-404/policy-field-errors/).

## Delivered

- Policy layout follows ver2 spacing, labels, numeric columns and the complete
  static rules. The translated rule text is an exact substring of the actual
  prototype, checked independently of the screenshot test.
- Required editable terms remain visible after the rules and before Save.
  Rate, cookie days and terms are sent together using the existing API schema;
  client field errors preserve the draft. Pending writes disable all fields.
- Eight new unit cases cover rendering/order, valid payload, three invalid
  limits, 409 retry preserving the draft, revoked action permission and pending
  state. They do **not** prove server 400 field-error mapping.
- Two new browser cases check 360/390 widths, required-field failure with zero
  PUT requests, a real MSW write and F5 preserving all three fields. The existing
  Admin policy test also now edits and verifies terms after F5. No native/MSW
  assertion branch was added.
- No backend, price, commission formula, ledger, bank snapshot or seed changed.
  The missing monetary preview remains a bounded API gap (V2Q-179); the browser
  must not invent it with frontend arithmetic or a hardcoded 120k example.

## Terminal verification on `822a9cb`

| Check | Result |
|---|---|
| Forced lint/typecheck/unit | **22/22 tasks**, **773 passed + 2 existing skips** |
| Unit breakdown | Admin 291, Portal 163, shared 140, server 111, UI 43, integrations 25 |
| Depcheck | Pass: **1459 modules/4001 dependencies**; server **668/2924** |
| Fresh Admin builds | MSW and native pass, separate dist directories |
| Committed Affiliate/RBAC MSW | **44/44**, 1.5 minutes |
| Raw Admin Affiliate parity | **11/14**, all fourteen measured on `822a9cb` |

The two new browser tests and eight new unit tests are included in those totals,
not additional distinct tests. Native production build is not native browser
acceptance. Prior 48/48 native integrations remain historical API evidence.

| State | Desktop diff | Mobile diff |
|---|---:|---:|
| D-84 | 1.4234% | 1.1162% |
| D-84-AFF | **24.1407% FAIL** | **27.6858% FAIL** |
| D-84-AFF-Q | 1.0907% | 1.9680% |
| D-84-POL | 2.3704% | **13.7312% FAIL** |
| D-85 | 0.9265% | 2.2593% |
| D-85-CUS | 1.8029% | 1.9372% |
| D-85-RATE | 0.9329% | 2.2430% |

Policy desktop improved from 5.37% to 2.37%. Mobile remains above the unchanged
3% limit. Moving terms below rules improved 14.18% (`b58f863`) to 13.73%; it did
not produce a mobile pass. Default agents still retain 62 real agents rather
than rewriting the ledger to the prototype's six. No mask, hidden field or
threshold relaxation was used. Fourteen images cover only seven measured
states, not the complete bulk/cancel/payout/error/permission inventory.

## Failed attempts retained

Initial unit runs incorrectly looked for AntD 6 `role=alert`, then checked its
help DOM before it mounted. Tests now wait for both `aria-invalid` and the
associated help text without dropping error assertions. Another intermediate
gate had two `require-await` lint errors despite passing units; those mocks
were corrected before the final forced 22/22 gate. Logs retain these failures.
The earlier `b58f863` full 44/44 run and 11/14 measurement are separate from the
final `822a9cb` runs and are not summed into the final counts.

## Remaining acceptance at the layout checkpoint (`822a9cb`)

Server 400 field mapping needs inspection/negative coverage. V2Q-179 needs a
server-owned draft-rate preview before its exact monetary caption can be shown.
Three raw parity failures, complete state inventory, native browser AT-AF/CSV
audit/RBAC/locked behavior, seeded C1–C6/audit E2E, UAT/§22.6 reconciliation,
final reports and P4 main merge remain. No P5 implementation.

No native stack startup was attempted in this checkpoint; the prior rejected
startup was not bypassed. After the terminal browser runs, a listener check
found none on 4020/4021/3280/3282/3236/3238/4800. Protected ports were untouched.

Evidence: [`evidence/v2-404/policy-layout/`](evidence/v2-404/policy-layout/).
