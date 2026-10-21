# TIP-V2-532 — Full automatic conversation lifecycle, both Fake lanes

Close the UAT-15 lifecycle gap left by opening/Stop-only cases. Use actual Admin
UI to configure two all-day personas in c1, disable replies, set a unique topic,
enable automatic generation and observe an actual null-script execution with
three planned turns and opener closing (P5-PLAN-01). No manual run request.
After opening disable only new automatic admission; the admitted conversation
must still finish all three turns. Keep the default five-minute spacing and
actual wall time in both lanes: no provider call, fast-forward, clock edit,
synthetic message or onServer expectation branch.

Member must see the actual opening on Dashboard, navigate to c1, receive both
subsequent turns in the already-open chat, retain exact public identities and
all three unique persisted messages after F5. Check configured deadlines and
not-before publication, running cursor2 and terminal cursor3, per-turn bodies,
opener-close order, private-field exclusion and real Dashboard ID/group/replies
after F5. Preserve existing opening/Stop tests separately.

Test-only scope: new behavior spec using existing participant helpers/schema.
Run identical spec against isolated MSW530 and managed native backend529, with
demo restoration in the native runner. Root gates, source/terminal receipts and
honest matrix updates required. New full registry reruns/audits/parity and other
acceptance gaps remain; this case is not the whole P5 completion.
