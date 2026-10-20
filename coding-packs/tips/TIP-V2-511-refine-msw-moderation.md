# TIP-V2-511 — MSW moderation hide/permission/audit contract

Status: IMPLEMENTED under P5 scoped-refinement authorization. Priority P1.
Parent TIP-V2-502 / NA-07; native AdminModerationController/Service are authoritative.

## Reproduced finding P5-MSW-02 (S3, mock-only drift)
Five new HTTP cases fail: hide does not set message.hiddenAt or resolve sibling
cases/audit; unauthenticated reads return200; view-only mutations return200;
case-insensitive duplicate keyword insertion returns201 instead of409.

## Bounded scope / files
- Extract report/keyword MSW handlers from mixed legacy files into moderation.ts,
  applying native `groups.view` / `groups.moderate` keys and shared validation.
- Persist private report→message links for real automatic/manual cases; hide only
  the linked message and resolve its open siblings. Keep resolved transitions409.
- Seed the same hidden `rpt-<id>` historical messages as native demo, without new
  publication jobs or visible Portal rows. No guessed sender-account identity.
- Shared moderation action and keyword audit + visible Admin log, one write audit;
  extract existing audit storage to avoid circular imports, preserve old exports.
  New audit writes use the actual request/test clock, not the fixed historical seed time.
- Keyword add/remove matches native citext case folding; preserve literal text.
- Preserve the five original failing assertions and add negative/identity/isolation
  cases. Repo lint/typecheck/forced units/depcheck pass, evidence/report/ledger/graph,
  scoped commit/push/clean tree.

## Explicit exclusions
No native behavior/schema/stack change. This bounded hide/dismiss/permission/audit
correction does not claim full human warn/lock session/outbox/notification effects,
native/mock account-seed alignment, cross-app/live/browser acceptance or P5 DONE.

Evidence: `reports/TIP-V2-511-completion.md` — five original failing assertions
retained and green; focused19/19, forced repo units1052 +2 existing skips;
lint/typecheck/depcheck green. Parent P5 acceptance remains open.
