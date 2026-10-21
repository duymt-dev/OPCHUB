# TIP-V2-527 — Bounded real-provider native browser proof

Owner explicitly supplied a private provider and requested real LLM E2E.
Default dev/test and the complete MSW/native behavior suites remain FakeLlm.
This separate opt-in native project must not run under ordinary behavior/parity.

Use the actual LocalLlmProvider -> owned worker/outbox -> persisted message ->
Portal pipeline, no direct completion standing in for E2E and no fake fallback.
Bound the entire run to two upstream completion attempts (including failures):
one automatic opening and one real-member reply. Configure only two eligible
personas in one group through UI; disable new admission before stopping the
opening. Keep actual reply delay and observe live Portal delivery plus F5.
The test does not pretend to prove a complete real-provider3/4turn conversation.

Private credentials stay under D:/opchub-local/v2, never in repo or tool output.
Private loopback proxy may forward unchanged adapter traffic and enforce/report
the hard cap; record only status, lengths/digests and counts, not prompts/keys.
Preflight GET /models is not a completion. Validate ownership before switching
only the managed native worker. Always restore FakeLlm + demo seed/cache in a
finally path, even if the provider/test fails. API/socket/UI remain native HOLD.
No VPS, main merge or unbounded retries. Do not rerun a consumed budget silently.

Deliver: separate Playwright config + bounded native tests/helpers, retained
provider/browser receipts and honest gate/report qualification. Full functional
Fake both-lane acceptance, missing UAT/AT/LK, audits/parity and review PR remain
required; this smoke is not their replacement.
