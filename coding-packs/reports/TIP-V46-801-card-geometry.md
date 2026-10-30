# V46-801 — measured mobile card presentation defects

Source: 3060ec9a. Read-only Chromium measurements, 390x844, existing Admin
Affiliate journey, affiliate demo cookie, exact HAOPC code selection on both
sides. No prototype state injection, stylesheet override, seed change or
screenshot/baseline edit. Temporary measurement suite: **2 passed, 9.5s**.
This is diagnostic evidence, not a new parity PASS.

## Measurements

| Property               | Prototype      | App            |
| ---------------------- | -------------- | -------------- |
| Card x / y / width     | 33 / 717 / 324 | 33 / 717 / 324 |
| Card height            | 318            | 222            |
| Identity cell x / y    | 94 / 732       | 94 / 732       |
| Identity height        | 63             | 51             |
| Identity padding       | 6px 12px       | 0px 12px       |
| Checkbox y             | 755.5          | 749.5          |
| Referral code font     | 13px           | 14px           |
| Action padding         | 0px 12px       | 4px 0px 0px    |
| Commission cell height | 35             | 39             |

The first-row identity text is identical, so its missing12px vertical padding
is a presentation defect independent of later financial/domain changes.
Both cards use wrapping flex, not a horizontal table. The missing region cell
and second search result remain802/803 dependencies; do not manufacture them
or interpret the whole96px card-height difference as a CSS defect.

## Source attribution and next correction

- Prototype index.html4501 retains6px vertical identity padding; mobile rules
  at84–92 do not remove it. App agent-layout.module.css mobile general cell
  rule sets0px vertical padding and has no identity override.
- Same mobile rule declares font-size twice (13px then14px), overriding the
  earlier referral-code13px selector. Scope the correction to the code cell;
  do not change all fields or shift numeric column semantics.
- Action padding also differs in computed rendering. Do not assume the mobile
  stylesheet's10px declaration wins: actual prototype computed padding is0px
  vertically. Retain computed-style evidence rather than copying inline CSS.
- Next implementation: correct identity padding and code typography with
  geometry assertions in the existing responsive test; run affected behavior
  and unmasked parity. Keep financial/data FAILs visible, no claim that these
  small changes alone can satisfy the whole Affiliate gate.

Raw diagnostics (ignored): e2e/.parity-out/card-geometry-{proto,app}.json.
Temporary measurement specs/config removed after their runner exited0.
No production source changed; existing full-gate evidence remains scoped to
its original source SHA. Native data/HOLD untouched.
