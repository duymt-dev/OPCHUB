# TIP-V2-524 — Automatic MSW runtime / explicit manual demo fixture

Blocking PATCH correction committed first as537e0471 (TIP-525).

## Finding and implementation
MSW exposed autoGenerate but tick admitted only scheduled scripts. New runtime
tests first record5fail/8negative controls pass. Shared native-approved planning
is now one pure module with a native facade: 3–4 turns, opener closes, eligibility
and topic rotation unchanged. MSW admission orders groups, reserves planned daily
appearances across groups and respects occupied groups/30active slots/terminal
retention. Due automatic turns generate only their current blank line with
FakeLlm-compatible text, use live settings spacing and publish with kind=auto
through the existing idempotency/quota/rate/NA-07 path. No network/provider call.

Default demo remains automatic. seed:demo --bot-manual applies autoGenerate=false
inside the native seed transaction. Equivalent MSW opt-in cookie initializes it
once per store before the bot handler; a later explicit enable is not reverted.
Only the empty-history browser case opts into this fixture; the new positive
case starts manual and explicitly enables topic generation through the UI.
All original empty/navigation/catalog assertions remain, no onServer expectation
branch. Legacy script-only unit/HTTP and stopped-work controls now explicitly
seed manual-only preconditions rather than globally disabling automatic behavior.
Separate positive controls prove auto work and new work after emergency resume.

## Evidence and diagnostics
- New automatic/scenario domain controls **33/33**, including3/4shape, topic
  rotation, per-turn generation/replay, live delay/stop, admission gates, capacity,
  cross-group quota reservation, publication rechecks, shared burst gate and
  generated-keyword report with zero human reporters. Original5 failures retained.
- Native demo scenario **2/2** on guarded opchub_test; normal seed re-enables auto.
- New Admin HTTP controls verify default generation, one-time manual fixture,
  explicit enable and denied actors. A new test initially expected403 for a
  member token; existing authentication contract is401. Replaced the mistaken
  assumption with separate member401 and active no-key Admin403 controls.
- Initial shared1 and legacy Admin4 failures expose incidental automatic work
  in script-only fixtures; root also catches the emergency-resume fixture. Raw
  failures retained, assertions unchanged, explicit preconditions added.
- New native browser initially **4pass/1fail**: toggles unexpectedly reset true
  on partial settings PATCH. This is a real bug, not a fixture allowance; TIP-525
  fixes it while retaining the false assertion.
- After TIP-525, **identical browser5/5 native (2.0min) and5/5 MSW (37.5s)**.
  Positive case observes a real null-script auto execution,3/4 planned turns,
  opener closure, generated first line only, actual running cursor and Stop;
  it also proves no manual script/run request. This is not full UAT-15/Dashboard.

## Joint final gates with TIP-525
Lint8/8 (3cached), typecheck8/8 (4cached), forced root **1244pass +2existing storage
skips**, six tasks/zero cached,2m26.058s: shared319/Admin443/Portal184/server203/
UI43/integrations52. Depcheck zero violations: FE1598modules/4568dependencies,
server770/3406. Fresh MSW Portal/Admin and native server bundles pass.
Evidence: evidence/v2-524/ and evidence/v2-525/.

Full integration at82dfdc3f completed **1305/1305**, server1284/124files +DB21/4files,
zero cache,13m23.454s. Only unreferenced new modules/tests were prepared while it
ran; no imported production/seed source was changed before terminal. This receipt
predates524/525 wiring. New native focused7/7 and DB2/2 do not replace a new full
integration run after later changes.

## Native HOLD / remaining scope
Only verified owned API/socket/worker were switched to dist/p5-525 for the real
PATCH fix; Portal/Admin processes remained unchanged. Initial3s health probe was
too early; later /v1/health and both login pages200 verified. Required/demo seed
and scoped Redis1 flush completed after browser. Fake providers retained; no
protected port, VPS, migration or paid provider action. Default auto demo restored.
Full222 behavior reruns, Dashboard precondition/cross-app persistence, member
reply live browser, bounded real LLM, UAT/AT/LK, audit, parity and dev-review PR
remain open. This is scoped implementation evidence, not P5-DONE.
