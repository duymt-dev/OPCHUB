# TIP-V2-547 — Paid-query recovery checkpoint, NOT accepted

Owner clarification on2026-10-21: current E2E effort is spec/behavior of P5 bot,
not a repeat acceptance of every previous phase. Stop expanding membership
work. Preserve this already-written patch and evidence without claiming the
native bug closed. No native process replacement or new membership run.

Separate hook subscribes to same-user limited-to-active membership transitions
and invalidates only typed MEMBERSHIP_REQUIRED402 query errors. Successful
history and unrelated failures are not selected; initial login, different
user, renewal and cleanup are covered.3 focused tests PASS. Initial test had
2pass/1fail because it assumed an errored query starts isInvalidated=false;
corrected to assert exact unchanged unrelated state AND predicate exclusion.
These focused outputs were returned directly by the tool, not saved raw logs.

Root547 lint/typecheck/test/depcheck all0; unit1318pass+2existing skips,
6 successful tasks/5cached. Native547 fresh UI build completed both apps but
is NOT deployed; live UI remains535. MSW build was already running when owner
clarified scope. Do not treat either build as browser acceptance of this fix.
P5-NATIVE-PAID-CACHE-01 remains open pending an explicitly scheduled follow-up.

Resume bot501/502 spec/behavior, including UAT14/15 and LK11. Broad legacy
UAT/AT/LK gaps and reset-login timeout remain recorded, not silently PASS.
