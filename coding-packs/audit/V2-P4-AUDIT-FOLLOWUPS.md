# P4 audit follow-ups — remaining S3 / excluded P5

Full audit source e6dc3cd: 251 invocations completed, but its ledger contains
findings. Corrections 877a461 close the three in-scope S2 audit-reader/precondition
bugs with real native follow-up; see ../reports/V2-P4-final-audit-checkpoint.md.
UAT-14 and static C4 bot finding remain P5, excluded by the user's explicit scope,
not fixed. Existing four S4 env deferrals remain documented elsewhere.

## Raw S3 findings and reasoned follow-up

| IDs | Evidence / current classification | Follow-up and delivery constraint |
|---|---|---|
| A-23 | Resend returns real 429; paused-clock walk repeatedly requests OTP beyond the real cooldown | Audit-path/cooldown reconciliation, S3 tooling backlog. Keep rate-limit protection and negative assertions; do not disable limits to green a walk |
| P-03, P-06, P-08, P-14, P-48, D-06, D-14 | Old walk locator/navigation timeouts; no failed backend transition established by those traces | Reconcile old walk paths against current screen semantics. Full native behavior regression on 877a461 passes 221/221, including these functional areas; old walk timeouts remain S3 harness reconciliation, not new passing screen captures. Any independently reproduced functional regression must still be fixed |
| P-05 | Collector treats protected endpoint 402 responses for an unpaid view as errors | Keep backend 402/paywall enforcement. Deferred S3 preload/expected-error classification; do not blanket-ignore 4xx or call it a proven authorization bypass |
| P-52, P-54, P-96, D-49 | External map script receives the harness's image placeholder, causing MIME console errors | Deferred S3 map-placeholder instrumentation; do not suppress arbitrary console errors or contact real external services merely for acceptance |
| D-84-COM-RECORDED, D-84-COM-RECORDED-MENU, D-84-COM-PAID, D-84-COM-PAID-MENU, D-84-COM-CANCELLED, D-84-COM-CANCELLED-MENU | Native paused-clock walk does not paint the expected blue selected label; raw strict CSS assertion remains red in all six follow-ups | **FIXED 2026-10-22 TIP-V2-558** (`15852e6d`): all six strict paint assertions pass native + MSW. Previously: cosmetic/paint debt TD-P4-UI-08 under user's visual deferral. Actual radio/rows/counts/URL/F5 behavior passes native 52/52. No threshold/mask change, skipped assertion or new pixel PASS claim |

Seven older measured pixel failures remain in V2-P4-UI-TECH-DEBT.md. This file
does not convert the full audit into a zero-finding PASS or waive S1/S2 security,
money, native/UAT requirements. It records bounded S3 investigative/cosmetic work;
final regression results must be checked before phase closure and merge.
