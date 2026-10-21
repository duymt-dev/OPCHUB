# P5 release handoff — 2026-10-21

Scope: TIP-V2-501/502 only. Spec/behavior acceptance complete; UI acceptance
has owner-approved deviations and testing debt, NOT pixel parity PASS.
Verified production source: `3f9967b2`, including latest owner dev `d2e984f6`.
Backend/shared/db/integrations are unchanged from tested `99100691`.

## Acceptance evidence

| Gate | Actual result |
| --- | --- |
| TIP501 seven ACs | Mapped to assertions in V2-P5-spec-reconciliation.md; deadlines, limits, skip/continue, pause/resume, NA-07, concurrency |
| TIP502 seven ACs | Same reconciliation; live replies, cooldown/replay, permissions/audit, emergency/hide, Dashboard |
| Focused native integration | 108/108 in 24 files, evidence/v2-551-integration; real PostgreSQL/Redis, fake LLM |
| Final root gates | lint/typecheck/test/depcheck exit 0; 1468 passed + 2 existing skipped; 5/6 unit tasks cached, serialized full test graph; evidence/v2-555-dev-integration |
| Full focused browser baseline | TIP552 MSW9/9; native8/9 with Escape failure; TIP553 fix and all Admin4 pass both lanes. Nine distinct cases have passing evidence in both lanes across runs, not one native9/9 rerun |
| Latest merged UI boundary | TIP556 original Admin4 + live reply/F5: 5/5 native (2.3min), 5/5 MSW (53.7s), unchanged assertions |
| Builds | Native/MSW Portal556 and Admin555 pass; source provenance in TIP555 and runtime manifest |

Full automatic lifecycle and emergency original-deadline waits passed in TIP552.
Provider failure tests cover transactional safety and explicit recovery, not
automatic terminal-error retry. No whole-V2 or full real-LLM suite PASS claim.
Historical real-provider UAT14 passed; opening locator failure was corrected but
not rerun under the exhausted two-call cap (TIP527). Current providers stay fake.
Original failures and their corrections remain in evidence.

## Final pixel measurements (TIP557, source 3f9967b2)

Unmasked, unchanged 3% maximum and pixelmatch threshold 0.1, widths 1440/390.

| Screen | MSW 1440 / 390 | Native 1440 / 390 |
| --- | --- | --- |
| P-01 Dashboard | 0.24% / 2.32% | 40.77% / 38.11% |
| D-36 log | 2.04% / 8.21% | 6.18% / 10.64% |
| D-37 personas | 8.92% / 7.78% | 8.94% / 7.75% |
| D-38 persona drawer | 2.26% / 0.12% | 2.29% / 0.12% |
| D-39 scripts | 10.39% / 11.04% | 10.41% / 11.16% |
| D-40 script drawer | 0.88% / 0.15% | 0.91% / 0.15% |
| D-41 conversations | 22.30% / 18.53% | 8.50% / 10.48% |

Raw result: MSW7/14 PASS, native4/14 PASS; both parity commands exit1.
Native D-36 desktop is also red in this final run (previous checkpoint was
green); retain the final number, not the more favorable historical result.
DV-V2-P5-1 covers owner-approved spec-required Admin layout changes, including
scheduled/running/generated conversations and emergency/hide instead of approval.
DV-V2-P5-2 separately covers native Dashboard unmatched-data UI-testing debt.
Matched-data bot-card pixel parity remains unproven. Neither acceptance changes
the raw failing verdict or claims that all differing pixels have been isolated.
Follow-up: align controlled comparison data and remeasure, preserving spec behavior.

## Native HOLD and release policy

TIP557 restored required/demo/flush successfully (all0; restored=true).
Final HTTP checks at 10:17 UTC: API4020 health, Portal3280/login and Admin3282/login
all200. Socket4021 listener PID28400 and worker PID31056 remain alive.
Backend runtime99100691 is source-equivalent; UI runtime3f9967b2. Keep services
and native PostgreSQL data available; do not shut down or swap real credentials.

Receipts: evidence/v2-557-release; raw images/results: ui-parity and
ui-parity/server. TIP501/502 completion reports give scope limitations.
Integrate by fast-forwarding dev, push dev, then post this handoff on existing
owner PR https://github.com/duymt-dev/OPCHUB/pull/5 (dev -> main).
Owner reviews and merges; no main push/merge or auto-merge is authorized.
