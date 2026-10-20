# P5 findings ledger (not the historical W1/P4 counts)

| ID | Severity | Finding | State | Regression |
|---|---|---|---|---|
| P5-RT-01 | S2 | Global PubSub channels allow native/test packet crossover despite separate Redis DBs | FIXED source/focused native; deployment + full acceptance pending | TIP-504: cross-DB control, same-DB socket and persona publication |
| P5-RBAC-01 | S2 | Large valid permission matrix rejected because generated audit summary exceeds 500 | FIXED source/focused native; full acceptance pending | TIP-505: valid 50 roles, invalid 60, complete diff |
| P5-TEST-01 | S3 | B5 still checks retired approve audit and can falsely match historical rows | FIXED scoped regression | TIP-506: exact current actor/script scheduling audit |

Raw failures remain in report evidence. Focused 62/62 is not full-suite or browser
acceptance. P4-approved cosmetic debt is not silently waived or reclassified here.
