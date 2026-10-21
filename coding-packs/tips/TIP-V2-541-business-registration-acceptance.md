# TIP-V2-541 — Business registration cross-app acceptance

Under approved503 final-acceptance scope, add the missing UAT-05 full business
tax-autofill → OTP → active pending-payment session → same Admin business
profile/fee → own OTP/welcome delivery scenario. Assert real unique recipient,
shared response schemas, session-ID equality, tax/name/industry/verification
and exact UI status, not a pre-existing business seed record. Preserve submitted
secondary-industry removal. Same code and assertions for MSW/native; no network
fulfillment or lane conditions. Keep current228-case full MSW run alive.
Run new case scoped with fresh context; native reset followed by required seed,
normal demo and cache flush. Run root gates and preserve any red result before
proposing bounded refine. No production source change is authorized by this TIP.
LK-01 Dashboard registration destination remains independently unverified.
