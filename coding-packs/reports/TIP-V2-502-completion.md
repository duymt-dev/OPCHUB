# TIP-V2-502 — Implementation and focused acceptance complete

Verified code: `3f9967b2`; backend equivalent to tested `99100691`.
See [TIP501 completion](TIP-V2-501-completion.md) for exact gate/build provenance
and [P5 reconciliation](V2-P5-spec-reconciliation.md) for all seven numbered ACs.

## Verified behavior

- Real member trigger selects eligible persona; delayed live reply quotes the
  source and survives F5. Disabled/unassigned/out-of-hours cases do not generate.
- One pending response per room, unique trigger and 120-second cooldown survive
  replay, Redis loss, thread GC and deleted history; persona messages cannot loop.
- Emergency stop is permission-controlled, audited and transactionally fenced;
  in-flight LLM results/old outbox replay cannot publish after stop/re-enable.
- Hide preserves human/unselected messages, marks Admin history, invalidates
  Dashboard, and reaches open rooms through the 200/201-message socket branches.
- Dashboard uses actual opening/reply messages and persona identity, with cache
  expiry/invalidation and no private simulation fields in the public DTO.
- Provider retryable/terminal failures cannot advance cursor/deadline or publish;
  explicit valid recovery posts once. No claim of automatic terminal-error retry.

Evidence: fresh **108 native integration cases**, final **1468 unit tests plus
2 existing skips**, and nine distinct both-lane P5 browser cases across the
documented runs. TIP552 emergency/hide passed both lanes including the original
next-turn deadline; TIP556 latest merged UI passed live reply/F5 and all four
Admin bot cases, five in each lane. Original failures remain in receipts.

## Accepted limitations and release boundary

UI deviations/debt: DV-V2-P5-1/2, explicitly owner-approved and disclosed in PR.
Measured raw red images are not converted to PASS. Native matched-data bot-card
pixel parity remains testing debt, not an unverified functional assertion.

Historical real LLM: TIP527 UAT14 passed using the supplied provider; the opening
case had a locator failure and was not rerun after its correction under the
two-call cap. No full three/four-turn real-provider PASS is claimed. Current
regressions use FakeLlm; no additional external call or secret enters Git.

Broader earlier-phase test debt is outside the clarified P5 goal and is not
declared resolved. Keep native running; dev-to-main remains owner-review only.
