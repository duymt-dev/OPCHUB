# TIP-V2-507: sample production time after LLM completion

## HEADER
- Priority P1; V2-P5; scoped source-review refinement of TIP-V2-501/502 runner.
- Status: implemented; two native completion-clock regressions verified (25/25 cohort).

## FINDING
The production runner captured its default now before awaiting generation. A slow
provider could backdate the message, consume the next 30s-5m spacing and use an
activity window/day quota that had expired while waiting. This was found by source
review, not claimed as an observed real-provider/browser failure.

## SCOPE / TASK
Only BotRunnerService production-clock sampling and dedicated generation native
regressions. An explicitly injected Date remains a controlled test clock; default
production time is sampled again after generation and before the write transaction.
No relaxed delay/hour/quota assertions or fake provider fallback.

## ACCEPTANCE / TESTS
- External fake provider advances Date by 45s: message time equals completion,
  next due time remains the full configured 60s AFTER that posting time.
- A Vietnamese activity window closes while the provider is pending: no message,
  skip/advance still follows the required lifecycle.
- Existing per-turn generation, replay, member reply and storage cases stay green.
- Repo lint/typecheck/unit/depcheck; final complete P5 gates remain mandatory.

## DELIVERY
Scoped implementation included with member-reply checkpoint on the dev-derived
feature; never main. Retain actual evidence and identify any acceptance not run.
