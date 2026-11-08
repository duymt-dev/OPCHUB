# ADR-0011: AI operations, metadata logs and bounded assistive generation

- Status: Accepted by D-138 / TIP-V46-817 and its execution approvals
- Date: 2026-11-08
- Supersedes: ADR-0009 pre-request-only budget check and deferred content/mod callers

## Decision

Keep the existing Admin-managed, encrypted provider records and OpenAI-compatible
HTTP adapter. No SDK, additional paid service or implicit fake runtime fallback.
Purpose model overrides apply only to the selected primary; fallback uses its own
default model. Automated tests use an explicitly configured loopback HTTP stub.

Reserve estimated integer VND atomically in Redis before each physical request.
The monthly counter and token/amount hash share a refreshed 15-minute TTL. A spend
epoch fences snapshots started before another request settled. Release only after
durable accounting, invalidating the spend cache and advancing its epoch atomically
with release; releasing before recording would admit another request against stale
spend. Expired/duplicate tokens cannot decrement newer reservations. Accounting
failure retains the protective lease until expiry, and never retries a paid call.
Zero-price calls remain usable; Redis failure is fail-closed. Token estimates remain
an approximation, not a promise about a provider's actual billing or missing usage.

Conditional monthly warning/exhaustion claims and their outbox events commit in
one transaction. Read/lock current AI settings before the monthly usage row, the
same lock order as configuration saves, so concurrent reconfiguration neither
deadlocks nor publishes against a superseded threshold. Raising budget/warnPct
re-arms flags in the settings-save transaction. Owner approved notification IDs
containing month, level, outbox event ID and recipient: replay deduplicates while a
new re-armed warning can arrive. Deliver to `settings.general` Admins only, in-app
and via the existing Admin-only high-priority push intent; no email. This reuses
the internal `test` delivery kind, not a new member preference or test message.

Call logs store only metadata, optional actor realm/short displayed ID, never input
or completion. Query/export are bounded to 90-day windows with a stable microsecond
timestamp/ID keyset, ID-first late joins and filtered aggregates. Export uses the
existing asynchronous worker/storage/audit pipeline. CSV cells are formula-safe.

Compose accepts three fixed kinds and structured, bounded inputs, not arbitrary
prompts. Server controls instructions, sanitizes output and enforces fee/permissions
and 10 attempts/person/hour plus the shared physical-request ceiling. A suggestion
never modifies a form until the user accepts it. Owner confirmed the actual store
intro field (4,000 input characters); suggestions there are bounded to 500 characters,
not a fourth SEO/product-description feature.

AI moderation is opt-in, after send and separate from synchronous keyword hiding.
Queue admission reads in-process settings and worker rechecks eligibility/settings.
The owner-approved durable `moderation_ai_claims` PK enforces one logical router
invocation per message independently of optional call logging; FK cascade removes
claims with physically deleted messages. One router invocation may use the existing
bounded fallback policy. Claim-before-call favors at-most-once cost over guaranteed
classification after a crash. Invalid/unavailable AI creates no case. A valid result
at confidence >=0.8 creates an automatic review case only: never hide, increment a
violation or lock a member automatically. Admin action keeps the existing CR-14 flow.

## Consequences

No existing credential/model is migrated to a new suggestion. Provider catalogues
are documented suggestions, not live verification; arbitrary model IDs remain valid.
New UI states have no prototype counterparts; D-134 requires reference measurements
and owner image review, not invented pixel baselines. Native test fixtures allocate
an unused keyless provider and restore configuration without accessing the owner's
real custom key. Original native databases, Redis6379 and original HOLD stay intact.
