# V46-801 — mobile card correction checkpoint

Production/test SHA: ff94b23f. Previous turn made progress by identifying
computed-style defects; this turn implements those measured corrections.

## Change

Restore6px top/bottom identity padding and13px referral-code typography inside
mobile agent cards. Remove the overridden duplicate font-size declaration.
Existing responsive tests now require these exact CSS values at360/390 in
both modes. All financial, selection, detail, reload, empty and visibility
assertions remain intact. No fields, agents, business behavior or baseline
changed; no horizontal-table experiment repeated.

## Verification

- Root lint/typecheck/unit/depcheck: exit0. Unit2085 passed,2 existing S3 skips;
  Admin592 ran fresh, other five unit tasks reused unchanged-source cache.
  Existing lint/deprecation/jsdom warnings retained, not a warning-free claim.
- Admin MSW build and native build: exit0; local Portal relay configured for
  MSW. No server binary rebuilt or held process restarted.
- Complete responsive + agent UI-debt files: MSW5/5 in14.5s, native5/5 in54.9s.
  Same CSS assertions at360/390; empty390/1440 and default desktop also pass.
- Post-commit unmasked parity:10 cases,6 pass/4 image failures,32.3s,exit1.
  Includes two harness checks. Actual results/diffs committed, not waived.

| State     | Before mobile | After mobile | Desktop after |
| --------- | ------------: | -----------: | ------------: |
| AFF       |        26.75% |  23.97% FAIL |    5.93% FAIL |
| AFF-Q     |        30.28% |  29.26% FAIL |    1.53% PASS |
| AFF-BULK  |        29.12% |  28.12% FAIL |    1.57% PASS |
| AFF-EMPTY |         1.91% |   1.91% PASS |    0.99% PASS |

Full integration1894/1894 at302174ed remains applicable: server/shared/db
unchanged. Full MSW342/4 at4ff6649b remains historical evidence for unchanged
surfaces, not a new full-suite claim for this CSS. Scoped rechecks cover the
changed agent-card selectors; no shared component or cross-domain change.
Remaining reference/data/model discrepancies stay open in questions/deviations.
TIP801 not complete;802 not started.

Required seed + demo seed + dev cache flush completed exit0 after native
checks. Held API28484/socket33408/worker16200 retain original start times.
Logs: e2e/.parity-out/v46-801-card-{precommit,build,msw,native-build,native,
parity,restore}.log. All runner handles terminal; no running job to poll.
