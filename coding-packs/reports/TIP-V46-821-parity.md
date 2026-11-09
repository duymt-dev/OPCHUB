# TIP-V46-821 — parity review

Source: c5848a37. D-134: pixel differences are reference measurements, not a functional release gate. Owner reviews the linked app/prototype pairs; this report does not claim owner has already approved these new images.

Exactly 5 states × 2 viewports × 2 lanes = **20 pairs**. Each lane also executes 4 capture-helper checks, not 4 additional image pairs. Native: 4 pairs ≤3%, 6 above; MSW: 5 pairs ≤3%, 5 above. Raw sampler exits 1 in each lane solely on unchanged pixel assertions; zero navigation/functional journey errors. No masks, baselines, thresholds, retries or assertions weakened.

| Lane | State | Width | Diff | App | Prototype |
|---|---|---:|---:|---|---|
| native | P-V46-REG-BANNER | 1440 | 1.2701% | [image](ui-parity/captures/TIP-V46-821/native/P-V46-REG-BANNER-1440.app.png) | [image](ui-parity/captures/TIP-V46-821/native/P-V46-REG-BANNER-1440.proto.png) |
| native | P-V46-REG-BANNER | 390 | 2.1242% | [image](ui-parity/captures/TIP-V46-821/native/P-V46-REG-BANNER-390.app.png) | [image](ui-parity/captures/TIP-V46-821/native/P-V46-REG-BANNER-390.proto.png) |
| native | P-V46-REG | 1440 | 4.6554% | [image](ui-parity/captures/TIP-V46-821/native/P-V46-REG-1440.app.png) | [image](ui-parity/captures/TIP-V46-821/native/P-V46-REG-1440.proto.png) |
| native | P-V46-REG | 390 | 3.0039% | [image](ui-parity/captures/TIP-V46-821/native/P-V46-REG-390.app.png) | [image](ui-parity/captures/TIP-V46-821/native/P-V46-REG-390.proto.png) |
| native | D-120-GDV | 1440 | 2.1106% | [image](ui-parity/captures/TIP-V46-821/native/D-120-GDV-1440.app.png) | [image](ui-parity/captures/TIP-V46-821/native/D-120-GDV-1440.proto.png) |
| native | D-120-GDV | 390 | 4.0420% | [image](ui-parity/captures/TIP-V46-821/native/D-120-GDV-390.app.png) | [image](ui-parity/captures/TIP-V46-821/native/D-120-GDV-390.proto.png) |
| native | D-120-GDV-OPEN | 1440 | 10.6605% | [image](ui-parity/captures/TIP-V46-821/native/D-120-GDV-OPEN-1440.app.png) | [image](ui-parity/captures/TIP-V46-821/native/D-120-GDV-OPEN-1440.proto.png) |
| native | D-120-GDV-OPEN | 390 | 5.7286% | [image](ui-parity/captures/TIP-V46-821/native/D-120-GDV-OPEN-390.app.png) | [image](ui-parity/captures/TIP-V46-821/native/D-120-GDV-OPEN-390.proto.png) |
| native | D-120-GCFG | 1440 | 2.5058% | [image](ui-parity/captures/TIP-V46-821/native/D-120-GCFG-1440.app.png) | [image](ui-parity/captures/TIP-V46-821/native/D-120-GCFG-1440.proto.png) |
| native | D-120-GCFG | 390 | 4.4123% | [image](ui-parity/captures/TIP-V46-821/native/D-120-GCFG-390.app.png) | [image](ui-parity/captures/TIP-V46-821/native/D-120-GCFG-390.proto.png) |
| msw | P-V46-REG-BANNER | 1440 | 1.2141% | [image](ui-parity/captures/TIP-V46-821/msw/P-V46-REG-BANNER-1440.app.png) | [image](ui-parity/captures/TIP-V46-821/msw/P-V46-REG-BANNER-1440.proto.png) |
| msw | P-V46-REG-BANNER | 390 | 1.9627% | [image](ui-parity/captures/TIP-V46-821/msw/P-V46-REG-BANNER-390.app.png) | [image](ui-parity/captures/TIP-V46-821/msw/P-V46-REG-BANNER-390.proto.png) |
| msw | P-V46-REG | 1440 | 4.6300% | [image](ui-parity/captures/TIP-V46-821/msw/P-V46-REG-1440.app.png) | [image](ui-parity/captures/TIP-V46-821/msw/P-V46-REG-1440.proto.png) |
| msw | P-V46-REG | 390 | 2.9223% | [image](ui-parity/captures/TIP-V46-821/msw/P-V46-REG-390.app.png) | [image](ui-parity/captures/TIP-V46-821/msw/P-V46-REG-390.proto.png) |
| msw | D-120-GDV | 1440 | 2.1061% | [image](ui-parity/captures/TIP-V46-821/msw/D-120-GDV-1440.app.png) | [image](ui-parity/captures/TIP-V46-821/msw/D-120-GDV-1440.proto.png) |
| msw | D-120-GDV | 390 | 4.0291% | [image](ui-parity/captures/TIP-V46-821/msw/D-120-GDV-390.app.png) | [image](ui-parity/captures/TIP-V46-821/msw/D-120-GDV-390.proto.png) |
| msw | D-120-GDV-OPEN | 1440 | 10.6619% | [image](ui-parity/captures/TIP-V46-821/msw/D-120-GDV-OPEN-1440.app.png) | [image](ui-parity/captures/TIP-V46-821/msw/D-120-GDV-OPEN-1440.proto.png) |
| msw | D-120-GDV-OPEN | 390 | 5.7253% | [image](ui-parity/captures/TIP-V46-821/msw/D-120-GDV-OPEN-390.app.png) | [image](ui-parity/captures/TIP-V46-821/msw/D-120-GDV-OPEN-390.proto.png) |
| msw | D-120-GCFG | 1440 | 2.4128% | [image](ui-parity/captures/TIP-V46-821/msw/D-120-GCFG-1440.app.png) | [image](ui-parity/captures/TIP-V46-821/msw/D-120-GCFG-1440.proto.png) |
| msw | D-120-GCFG | 390 | 4.2867% | [image](ui-parity/captures/TIP-V46-821/msw/D-120-GCFG-390.app.png) | [image](ui-parity/captures/TIP-V46-821/msw/D-120-GCFG-390.proto.png) |

## Inspection and classification

- P-V46-REG-BANNER: below reference threshold in both lanes/viewports.
- P-V46-REG: real ledger totals, affiliate/month rows, current server dates versus fixed prototype dates and registration origin/code differ. CSV is the approved B10 action, absent from prototype. Keep canonical D-94/D-119–D-132 attribution and no fake financial data.
- D-120-GDV / OPEN / GCFG: real/seed pending and paid history, recipient/affiliate counts and resulting content height differ; permanent regional slots follow D-120. Previously owner-selected country flag replaces prototype globe. These are not permission/payment failures.
- A genuine mobile month-layout defect was found and fixed: other fixed columns now 150/120/120px; the month column is 90px in a 480px mobile table. Native regression checks actual widths. Month labels remain readable, rather than wrapping letter by letter. Province stays in API/CSV, not extra table text. This defect is not excused as a data difference.
- Manually inspected native mobile regional table and configuration pairs, plus retired-payee dialog. No outstanding actual layout defect was identified in the inspected scope. Numeric measurements and paired images above remain available for independent owner review.

## New dialog: no prototype counterpart

Q821-2 approved retired-payee bank entry. App-only captures: [desktop](ui-parity/captures/TIP-V46-821/native/retired-bank-1440.app.png), [mobile](ui-parity/captures/TIP-V46-821/native/retired-bank-390.app.png). Real browser journey verified explicit Save (no write on input), PUT200, masked audit, fixture cleanup and unchanged incumbent bank: [evidence](evidence/v46-821-native-payee.json). Not included in the 20 pair count.
