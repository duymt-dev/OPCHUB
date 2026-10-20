# P5 findings ledger (not the historical W1/P4 counts)

| ID | Severity | Finding | State | Regression |
|---|---|---|---|---|
| P5-RT-01 | S2 | Global PubSub channels allow native/test packet crossover despite separate Redis DBs | FIXED source/focused native; deployment + full acceptance pending | TIP-504: cross-DB control, same-DB socket and persona publication |
| P5-RBAC-01 | S2 | Large valid permission matrix rejected because generated audit summary exceeds 500 | FIXED source/focused native; full acceptance pending | TIP-505: valid 50 roles, invalid 60, complete diff |
| P5-TEST-01 | S3 | B5 still checks retired approve audit and can falsely match historical rows | FIXED scoped regression | TIP-506: exact current actor/script scheduling audit |
| P5-SQL-01 | S3 | Correlated simulated/hidden filters lacked real global B-tree prefix bounds; a predicate-only index could lose to Seq Scan | FIXED source/native105/105; full repository/browser acceptance pending | TIP-508: >20k mixed rows, actual SQL/counts, unchanged no-Seq assertion plus stronger Index Cond assertion; no final fixture rebuild or planner hints |
| P5-MAINT-01 | S3 | Production index-bloat monitoring/reindex policy is not established by this query benchmark | DISCLOSED maintenance debt; not a functional hide blocker, no dev/VPS maintenance performed | Native test index measured485 pages/40 tuples after aborted fixtures; diagnostic rebuild failed broad regression and was removed from final tests; seek-index fix documented in TIP-508 |
| P5-SQL-02 | S3 | New nullable execution identity index displaced ordered prune and visibility read paths | FIXED source/native121/121; full repository/browser acceptance pending | TIP-509; original prune assertions unchanged, real response/count/preview plan fixture, focused19/19 |
| P5-MSW-01 | S3 | Mock Chat accepts missing/cross-room reply targets and invalid-target idempotent replay instead of native404 | FIXED source/HTTP/forced repo units; P5/browser acceptance pending | TIP-510: all three404 regressions retained; valid reply workflow still passes; full units1014 +2 existing skips |
| P5-MSW-02 | S3 | Mock moderation hide does not hide linked messages/close siblings/audit; reads/writes bypass native permissions; keyword duplicates are case-sensitive | FIXED bounded source/HTTP/shared gates; human warn/lock/live/browser acceptance not included | TIP-511: original five failures retained, expanded19/19; forced units1052 +2 existing skips |

Raw failures remain in report evidence. Focused 62/62 is not full-suite or browser
acceptance. P4-approved cosmetic debt is not silently waived or reclassified here.

## P5-RT-02 ? S2 ? FIXED source/native, final acceptance pending

Source review found default runner time sampled before the LLM call: provider
latency could consume the next turn spacing and keep an activity window open
past its actual close. TIP-V2-507 samples production posting time after generation.
Two native clock-boundary regressions pass; current cohort 25/25. No real-provider
failure is claimed; final stable full-suite/browser acceptance remains pending.
