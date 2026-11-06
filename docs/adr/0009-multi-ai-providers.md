# ADR-0009: Multiple Admin-configured AI providers and purpose routing

- Status: Accepted for implementation by TIP-V46-811 execute request
- Date: 2026-11-06
- Supersedes: ADR-0008 singleton configuration only; its security/test rules remain

## Decision

Six fixed provider records contain encrypted credentials, endpoint/model, verification
status and integer VND prices per million tokens. Shared strict schemas define four
purposes (bot/script/content/mod); no assistant purpose (D-124). Admin saves the entire
draft atomically, with the existing advisory lock, secret-free audit and invalidation.
The old singleton table remains unchanged for rollback/history, never runtime reads.

Use the existing OpenAI-compatible HTTP adapter, without an SDK or implicit retry.
Provider choice is per purpose; one distinct fallback attempt is permitted only for
retryable network/timeout/429/5xx failures. No fake runtime fallback. A purpose-specific
router preserves the explicit fake/local boundary of automated bot tests.

Compatibility endpoints are supported by primary documentation:
[Anthropic](https://platform.claude.com/docs/en/cli-sdks-libraries/libraries/openai-sdk)
and [Gemini](https://ai.google.dev/gemini-api/docs/openai).
Model menus remain the TIP/prototype catalog, not a claim of current availability.
Real-key live verification is separate from local deterministic HTTP stub tests.

All outbound message contents optionally mask email, Vietnamese phone and bank/card
number patterns before HTTP. Logs store only function/provider/model/usage/cost/status,
never prompts, completions, credentials or raw provider errors. Retain calls90 days;
delete bounded indexed batches. Durable monthly bigint totals are authoritative;
Redis60s cached reads use epoch-fenced invalidation after commits.

Month boundaries use Asia/Ho_Chi_Minh. Budget0 is unlimited; prices default0. At the
configured budget, bot stops and other purposes use the configured fallback, still
accounted. The limit is a pre-request spending check, not an exact reservation for
unknown future usage; simultaneous in-flight calls can cross the budget. No automatic
notification is sent at warning threshold; the Admin progress indicator changes color.

Application/PWA/push settings are configuration only (D-125); test sends an in-app
notification solely to the acting Admin, never Web Push/email/Zalo. No manifest,
service worker or existing Portal notification behavior changes.

## Consequences

Admin must enter legitimate endpoint credentials and pricing. No key is read back,
only hasKey/last4; blank replacements retain the encrypted key. Content/mod allocations
are stored for future callers, not new AI product features. The original encrypted
singleton custom config migrates losslessly. Decryption failure disables that provider
without leaking credentials; keys must be reentered after encryption-key rotation.

Q811-1..7 follow explicit TIP defaults, not newly invented owner decisions. No call-log
viewer, external budget alerts, per-purpose model editor or PWA delivery in this TIP.
