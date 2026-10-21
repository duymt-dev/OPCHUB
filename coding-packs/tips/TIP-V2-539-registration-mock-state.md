# TIP-V2-539 — Persist mock registration profiles and mail effects

Fix P5-MSW-REGISTRATION-01 against native account registration/mail behavior.
Keep538's exact two failing browser cases. Implement independent modules for
public registration metadata, pending expiry, activated Admin profiles and a
deterministic Fake mail queue/log. Persist through the existing serialized
cross-app lease; no password/hash, OTP code, JWT, provider setting or credential
may enter the snapshot. Preserve full personal/business profile fields rather
than synthesizing a seeded proxy member. Keep fees/referrals/group admission
through existing domain functions and persist registration-owned memberships/
join requests without replaying admission or double-incrementing group counts.

One-shot activation queues one welcome; resend refreshes a live pending OTP and
queues a new OTP log. Reject missing/expired pending activation. Mail read tick
delivers queued fake jobs once with attempts/status; no external SMTP/LLM call.
Merge new logs/profiles into existing Admin listing/sorting/summary, preserving
existing seed rows and financial snapshots. Legacy snapshot without this new
optional domain must remain readable; validate complete composition before
mutating state. New logic belongs in registration modules, not legacy handlers.

Tests: actual new identity/list/filter, queue->sent/idempotency, activation once,
expiry/resend, business metadata, full credential exclusion/corruption rollback,
fresh-runtime snapshot and group-admission count stability. Run root gates,
fresh isolated MSW builds, unchanged538 + mobile + relevant auth/marketing
regressions. Native new cases wait for the live full runner/restoration.
No native production code/process/data change, new dependency or stack change.
Other registration/security/business/LK coverage remains explicit, not waived.

Native source cross-check: pending registration lasts30minutes; OTP lasts10.
Resend only renews OTP, not the pending deadline, and missing-pending resend
still returns202 to avoid disclosing accounts. OTP_INVALID maps to422 with
the native invalid-code message. Preserve these contracts in separate tests.
The legacy handler unit expected400 for OTP_INVALID; correct that exact expected
status from native HTTP_STATUS, not to accommodate a mock-only convention.

Browser follow-up: original native new4 cohort passed mobile2 but failed both
mail checks: reload()+count() sampled before client query render. Replace that
sampling with retrying the same exact recipient/kind/sent count assertions,
same20second outer budget, shared by both lanes. Native rerun4/4 confirms the
original red is a test synchronization defect, not a proven mail backend bug.
