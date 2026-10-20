# TIP-V2-507 ? scoped completion-clock refinement verified

The production runner now samples its write-time clock after generation, while
an explicitly injected Date remains a controlled clock. This prevents a slow
provider from backdating the message/consuming the next turn's minimum spacing,
and ensures active-hour/day-quota checks use the same posting instant.

Two native generation regressions use ONLY a controlled Date and external fake
provider: a 45s provider delay still leaves the full 60s spacing AFTER posting;
a Vietnamese active window that closes during generation produces no message
and advances the skipped turn. No production/business service or Prisma mock.
Current generation/reply/storage native cohort is **25/25 in 3 files**. Repo
unit gate **935 + 2 existing skips**, lint/typecheck/depcheck pass. Raw initial
lint failure (async test callback with no await), fixes and native/gate evidence
are retained in evidence/v2-507/.

This was found by source review; no real-provider/browser failure is invented.
This closes the scoped timing finding, not TIP-501/502/P5. Native demo deployment,
complete stable regression and real-LLM browser acceptance remain pending.
Implementation ships with the current member-reply feature checkpoint; see Git
history for its implementation SHA. Main was not merged or pushed.
