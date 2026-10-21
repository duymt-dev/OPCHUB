# TIP-V2-529 — Consistent delayed-job deadline (scoped fix)

## Finding and correction

The fresh full integration at a7f68d00 ended with server1286pass/1fail across
125files (19m15.243s root invocation). Its UAT-14 actual-worker test expected one
reply after nextAt but observed zero. The DB task had been scheduled when Turbo
aborted; no complete DB integration PASS is inferred from this failed root run.
Original raw failure is retained, not replaced by a passing subset.

Source review found a definite producer inconsistency: BotWorkQueueService
computed BullMQ timestamp once, but delay against a later Date.now(). Since
BullMQ uses timestamp + delay, the resulting job could be due before persisted
nextAt. Draft/runner correctly refuse an early execution, so a too-early job
can complete without posting (production tick may recover it later).

New integration uses real Postgres admission and Redis Queue jobs, controlling
only Date.now(), not Prisma or business-service results. Before correction:
zero-drift control passes; advancing-clock case fails by exactly25ms. After:
both2/2 pass unchanged. The one-line correction computes delay against the same
explicit timestamp; durable emergency fence, fixed ID, attempts/backoff, outbox
and strict worker not-before checks remain unchanged. No timeout relaxation.

This proves and fixes the producer deadline defect. It does not retroactively
prove the transient state of the already-cleaned original failing worker job.

## Verification

- Deadline regression: before1fail/1control; after2/2.
- Original actual-worker reply + publication + emergency + pending cleanup:
  **18/18 in4files**,218.15s. Reply waits the actual **170727ms** deadline and
  proves exactly one posted reply plus one auto-moderation report with FakeLlm.
  Original assertions and timeout remain unchanged. No real-provider call.
- Root lint8/8 and typecheck8/8 pass (7cached each). Forced root units:
  **1254pass +2existing storage skips**, six tasks/zero cached,2m48.749s.
  Shared329/Admin443/Portal184/server203/UI43/integrations52. Depcheck passes:
  FE1613modules/4624dependencies; server771/3410.

Private raw receipts: D:/opchub-local/v2/528-full-integration.log,
529-deadline-{before,after}.log and529-worker-regression.log. Sanitized copies
are in evidence/v2-529/. Current full-native222case run uses its pre529 immutable
backend bundle; it cannot be represented as post529 deployment verification.

## Fresh native deployment follow-up

Fresh tsdown build to dist/p5-529 passed at159fc82b. Announced cutover verified
all three managed Node command lines and API/socket listener ownership before
stopping only those backend processes. New backend529 starts with fake providers;
Portal/Admin processes and Next bundles are preserved. Unchanged native bot
CRUD/settings/empty-history/automatic-positive browser cohort **5/5**,1.7min.
Required seed + normal demo + Redis1 flush completed afterward. Native health
receipt confirms all five managed processes alive and Portal/Admin/API HTTP200.
No protected port, migration, real provider or VPS operation in this follow-up.

Remaining: complete post529 full integration (new forced invocation started),
same-assertion Fake live reply, complete acceptance matrices, audits/parity and
final dev review PR. No P5-DONE or complete UAT-14/15 claim.

## Terminal full integration follow-up

Forced post529 invocation at159fc82b is terminal: server1288pass/1fail in126files,
root13m36.897s, zero cached. The previously failing actual-worker reply passes
with80327ms real delay, one published reply and one keyword report. New remaining
failure is the addressed-persona history assertion in bot-reply.int.spec.ts;
it must be investigated separately, not hidden by a focused retry. DB task
aborted, so no full root integration PASS. Full raw/state retained in this
report's evidence directory. TIP-530 browser-only changes do not resolve it.
