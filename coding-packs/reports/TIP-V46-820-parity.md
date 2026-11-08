# TIP-V46-820 — visual verification

Source: `3a199fb4`. New full-page dashboard scenario includes the independent
guest KPI; the older greeting-only P-109 capture is unchanged. Same journeys,
viewports1440/390, external-image stabilization, threshold0.1/3% and masks as
the existing harness. No prototype edits, added masks or cropped-away new KPI.

## Classification under D-134

- **Actual interface defect fixed:** products were1 column at390 while prototype
  has2. Owner approved narrow CSS correction in820. Final native image has2,
  labels/prices remain visible and no horizontal overflow. New regression passes
  on native and also runs unchanged in full MSW. Desktop auto-fill preserved.
- **D-114:** app dashboard uses actual views/products/open-needs, not prototype
  fake interested-customers/contact/appointments/conversion/activity blocks.
- **D-139 / approved820:** separate guest KPI has no prototype equivalent.
- **D-136 / approved810:** public-page configuration card is an existing addition
  on app dashboard; its dedicated editor-card pair is compared separately.
- **D-133:** country flag instead of prototype globe.
- **Data:** actual view/fee dates, unread badges, chart rows and browser origin
  differ; do not change persisted business rows to mimic a picture.

Raw full-page dashboard measurements exceed3% because these differences alter
height/block positions. Fixing the grid can increase raw full-page pixel distance
by shifting later blocks; it is not a reason to retain a real layout defect.
Those raw threshold failures remain in the ledger; they are not functional test
failures nor evidence that every visual pixel matches. Owner reviews the images
in this PR under D-134. No extra unapproved interface exception is introduced.

## Evidence

- [Native paired images/ledger](evidence/v46-820-parity/native/).
- [Before mobile grid repair](evidence/v46-820-mobile-grid-before/).
- [Anonymous guest pages and generated OG images](evidence/v46-820-public/).
  Guest pages have no reachable matching prototype; these are app-only review
  captures, not fabricated parity pairs. OG is newly approved server output.
- [MSW paired images/ledger](evidence/v46-820-parity/msw/).

## Final measurements

| Pair | Width | MSW diff% | Native diff% |
|---|---:|---:|---:|
| P-108 store detail |1440|2.67793|2.74699|
| P-108 store detail |390|0.36791|0.36669|
| Public editor card |1440|1.49296|1.56831|
| Public editor card |390|2.48041|2.50455|
| Full dashboard / guest KPI |1440|12.12481|12.16293|
| Full dashboard / guest KPI |390|46.66955|46.66712|

Each lane captured6 pairs plus4 harness checks: raw8 passed/2 pixel-threshold
failures, exit1; no missing capture or journey failure. Full dashboard is the
only over-threshold scenario. Native48.1s, MSW2.8m under concurrent test load.
Both mobile final images have the corrected2-column products. Desktop and
mobile app/prototype pairs and generated Vietnamese OG image were inspected.
