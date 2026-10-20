# P4 UI technical debt — user-approved deferral

## Decision, 2026-10-21

User: “nhanh lenh de con done pha 4, UI lenh thi co the noi vao no ky thuat di”.
Accept remaining cosmetic/ver2 pixel differences as technical debt rather than
blocking P4 closure on more pixel tuning. This supersedes the previous pending
visual approval for the known P4 gaps below. It does **not** waive functional,
accessibility, responsive usability, money, authorization, audit or native/UAT
acceptance. Finish Affiliate/P4 and stop; no P5.

Raw measurements remain FAIL above 3%; do not relabel them pixel PASS or lower
the threshold. Approval is a delivery deferral, not a claim that UI now matches.

## Known measured debt

Source UI f394dc5, raw snapshot
`../reports/evidence/v2-404/popup-layout/parity-f394dc5.json`: 27/34 pass.

| Debt | Viewport | Raw difference | Follow-up / retained behavior |
|---|---:|---:|---|
| TD-P4-UI-01 Default agents | 1440 | 24.1407% | Align layout with real 62-agent data; never delete automatic agents to imitate six prototype rows |
| TD-P4-UI-02 Default agents | 390 | 27.6858% | Same data constraint; preserve all mobile card fields and pagination |
| TD-P4-UI-03 Policy | 390 | 16.5967% | Label/control/rules spacing and extra editable terms differ; retain editable terms, API preview and save validation |
| TD-P4-UI-04 Empty commissions | 390 | 7.7236% | Review empty card/header appearance; retain useful empty guidance |
| TD-P4-UI-05 Empty agents | 390 | 6.5047% | Same empty-state constraint; do not recreate broken prototype overflow |
| TD-P4-UI-06 Cancelled filter | 390 | 5.2758% | Required pager/controls and full-frame placement differ; retain real cancelled row, amount and reason |
| TD-P4-UI-07 Cancelled menu | 390 | 4.7331% | Popup/full-page scroll placement; retain readable current marker, keyboard access and disabled terminal writes |

DV-P4-404-1..5 in `../reports/ui-parity/deviations.md` retain their rationale;
known cosmetic differences are now deferred by the user. Remaining unregistered
cosmetic states are follow-up work, not assumed visually verified. Functional
pending/error/revocation cases and native acceptance remain separate open gates.

## Policy experiment stopped, no unverified production change retained

Before this approval, an uncommitted policy spacing experiment added three
strict geometry probes (360/390/1440). Initial measured gap was 10.578px; scoped
CSS attempts measured 10px then 8px against a 6px target, still red. Existing two
policy functional cases passed in the intermediate run. These probes and CSS
were withdrawn together after the scope decision, restoring exact committed
source; they are not three newly passing tests and do not alter the current
52-case behavior suite. Logs are retained in
`../reports/evidence/v2-404/ui-debt/`.

The experimental native build is replaced with a build of restored source
before native acceptance; no parity improvement is claimed for this experiment.

## Native handoff evidence

Restored-source Admin native build passed. Native Affiliate plus the two
Affiliate contract files passed **55/55 in 23 files** (101.35 seconds), not a
claimed repetition of the older differently scoped 57/24 run. Destination was
verified as native 5432/opchub_test; test setup pins Redis 2.

`seed`, `seed:demo --affiliate`, `flush:dev-cache` then static C1–C6 completed
on verified native 5432/opchub_dev and Redis 1. Counts (pass/findings) remain
**25/0, 25/0, 88/0, 36/1, 173/0, 138/4**: P5 bot and four documented S4
deferrals are not silently greened. Static exit zero is not all findings PASS.

At the user's request, service pane `w3:p5` in the same Herdr tab was opened;
Git Bash ran the existing native stack launcher after the plain WSL `bash`
alias failed because its `/bin/bash` was absent. API/socket/Portal/Admin health
was verified at 4020/4021/3280/3282. No extra coding agents were launched.
The first browser invocation failed in CLI project parsing before any tests;
correct `--project=behavior` starts the unchanged **52-case** native suite.
It is still running at this checkpoint: no native browser pass count claimed.

## Delivery gates still required

Native browser/UAT/AT-AF/AT-RB/AT-LK/§22.6, native CSV/audit correlation, final
seeded audits, completion reports and merge main are **not** waived. UI-404-03
becomes DEFERRED (cosmetic debt), not FIXED. Native failures must be investigated
and reported honestly before P4 can be called complete.
