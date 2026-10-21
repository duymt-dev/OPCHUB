# TIP-V2-547 — Recover membership-blocked queries after payment

Refine503 from546 native failure, reproduced twice. Trace shows initial
GET /groups402 while newly registered/unpaid; after actual payment toast/live
gate closure, no new /groups request and Community displays load error.
Do not weaken546 or add a test reload before access assertion.

Implement a separate membership hook/helper that retries only queries denied
for membership (typed402) when the authenticated same user's fee transitions
from limited to active. Apply to native socket and mock activation through
their common session state; avoid cross-feature imports, broad polling or
refetching all successful chat/history data. Handle logout/user switch/initial
mount carefully; membership read itself must not loop. Add focused tests for
transition, unrelated errors, paid-to-paid changes and cleanup.

Run unchanged546 both lanes, membership/paywall regressions and root gates.
Fresh UI builds required; announce owned native UI replacement/reset, verify
process ownership and restore demo. Backend/DB/payment/outbox unchanged.
Standards frontend/data-state, code-structure, testing and git-workflow apply.
Preserve546 raw failures; final full registry/audit/parity remains separate.
