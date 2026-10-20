# P4 native browser — IN-PROGRESS

User-approved cosmetic debt is recorded in `../audit/V2-P4-UI-TECH-DEBT.md`.
Do not spend more P4 time on pixel tuning; this does not waive functional
native/UAT/audit gates. Stop after Affiliate/P4, no P5.

## Runtime corrected

The old local launcher selected `.next-server-v2b`, whereas the freshly verified
Admin build was `.next-server`. Its stale UI lacked the Affiliate menu although
the actual API profile already returned all three Affiliate permission keys.
The first run was interrupted after its initial navigation timeout; this was
not proof that the current backend omitted permissions. The server was rebuilt
and only the five task-owned processes, verified by creation time/command/port,
were stopped. No protected ports, Postgres or Redis services were stopped.

Five explicit service panes now run in the same Herdr tab: API `w3:p5` (4020),
socket `w3:p6` (4021), worker `w3:p7`, Portal `w3:p8` (3280), Admin `w3:p9`
(3282). Both Next servers use `.next-server`. The first pane command attempt
lost double quotes through native argument transport; it failed before server
startup. Single-quoted PowerShell values were used instead. No extra coding
agents, alternate tabs, secret output or private env changes.

## Native findings, not cosmetic waivers

1. Current-runtime first full suite: **20 passed, 1 failed, 31 not run**,
   stopped on the first failure. Immediate successive hard navigations could
   abandon bootstrap refresh. **b9207c5** waits for the real authenticated
   Affiliate heading before a helper navigates onward. No assertions, timeout,
   retries or actual parallel reload were removed. Focused concurrency passed
   once, but that alone was not accepted as whole-suite proof.
2. Full b9207c5 rerun: **20 passed, 1 failed, 31 not run**. Both PATCH writes
   succeeded, then `Promise.all([page.reload(), second.reload()])` lost a tab's
   authentication: per-tab single-flight did not serialize rotating cookies
   across tabs. This is a functional S2 finding, not UI debt.
3. **1eaebae** adds separate `session-refresh-lock.ts`: Admin refresh acquires
   an origin-scoped Web Lock before sending its httpOnly-cookie request. Existing
   per-tab single-flight remains. No tokens are broadcast or persisted; no
   changes to backend rotation/reuse detection, cookies, permissions or money.
   Lock acquisition failure returns false without an unlocked retry. Browsers
   without Web Locks retain the old single-tab fallback, not a claim of
   equivalent cross-tab protection there.

## Verified after lock fix

- Four new lock units (serialization, unsupported fallback, denied lock and
  denied refresh). Existing session single-flight/API tests remain green.
- Gate **22/22**, **19 cached / 3 executed**; Admin **334** units freshly run;
  aggregate **835 passed + 2 existing skips**, including unchanged cached tasks.
  Initial gate had two require-await lint errors in new test callbacks; fixed
  with explicit resolved promises, not lint suppression. Both gate logs retained.
- Depcheck passes; final MSW and native Admin builds pass. Admin was stopped
  before rebuilding its live native dist and then restarted in its owned pane.
- Native concurrent-tab regression **3/3 executions**, the same single case
  repeated three times. Both independent agent PATCH writes, simultaneous reload,
  persisted rates and Portal/Admin cross-origin read-back remain asserted.
  These are not three additional unique acceptance cases.
- All code above committed/pushed. Full committed **52-case native rerun on
  1eaebae is running**, not yet claimed green. Fresh full MSW and seeded audit
  e2e/UAT still required after it; final reports/main merge remain open.

Native API subset remains **55/55 in 23 files**; separate fresh contract coverage
is **2/2 in one file**. This covers the older 24-file selection in two commands,
not a newly executed single-command 57/57 run. Seeded static C1–C6 evidence is
unchanged from the UI-debt checkpoint; its explicit five findings remain visible.

## Evidence

`evidence/v2-404/native-browser/` retains both stopped full-suite failures,
their contexts, focused bootstrap check, lock repeats, successful builds/gates
and initial lint failure. Logs are UTF-8/LF with sensitive lines redacted. Full
running logs are not frozen as final evidence until their process terminates.
No completion report or P4 DONE claim is made here.
