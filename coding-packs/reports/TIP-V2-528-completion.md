# TIP-V2-528 — Full functional checkpoint (acceptance still IN PROGRESS)

## Complete behavior invocations

| Lane | Actual source/artifact boundary | Result |
|---|---|---|
| MSW | Full post526 source27731c1e; isolated .next-msw-v2p5-526 bundles | 222/222,6.2min, exit0; receipt in v2-527 |
| Native | Behavior sourcea7f68d00; backend dist/p5-525 at57274693; Portal0aef409f/Admin82dfdc3f production bundles | 222/222,28.5min, exit0; receipt in v2-528 |

Both lanes execute the same222-case registry and assertions, including explicit
manual-only bot fixture, separate actual automatic-positive and actual Admin
publication -> unique Dashboard body/F5/group/time/navigation. All four failures
in the historical217/221 native run have now passed the complete native registry.
The historical failure is retained, not rewritten. No test was skipped/weakened.

Native required seed, normal demo seed and scoped Redis1 flush completed after
the invocation; terminal state restored=true. Portal3280/Admin3282/API4020/
socket4021/worker remained available. This is not a clean browser-console audit:
the behavior reporter result alone cannot prove audit findings absent.

## Integration finding, kept distinct

Forced full root integration at a7f68d00 failed: server1286pass/1fail,125files,
root19m15.243s; DB task did not complete. UAT-14 worker saw zero replies after
its deadline. Full failure and terminal state are retained in v2-529 evidence.
TIP-529 subsequently proves/fixes a producer timestamp/delay inconsistency,
with original worker/publication/emergency cohort18/18. A scoped retry does not
turn the original full invocation into PASS; a new full integration is required.

The native222PASS is explicitly **before529 backend deployment**. It is not
relabelled as a post529 full-native run because the working-tree source changed
while the already-discovered browser registry ran against immutable old bundles.
Current fresh backend/scoped acceptance belongs to the TIP-529 follow-up.

## Delivery limits

Aggregate222PASS does not fill missing UAT/AT/LK rows. Same-assertion Fake live
member-reply chat, full automatic lifecycle/spacing/Dashboard, wider community
cross-app state/session/moderation, audit C1-C6/native browser, ver2 parity,
TEST-GAPS/BUGS disposition and final reports/dev review PR remain required.
No full-P5-DONE, ready-for-review or main merge claim.
