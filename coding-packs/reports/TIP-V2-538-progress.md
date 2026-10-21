# TIP-V2-538 — Registration evidence exposes missing mock links

IN PROGRESS / MSW RED; no native outcome inferred and no P5-DONE.

Two new canonical tests use fresh unique identities, actual registration and
Admin UI, no lane branches, seed-record proxy, fulfillment or weakened asserts.
First requires202 OTP dialog, short OTP blocked with zero verification HTTP
requests, and its own sent OTP mail log in Admin Marketing. Second requires
successful OTP's shared-schema active/pending-payment personal session, Portal
community navigation, the same new member/profile in Admin and sent welcome log.

MSW result: **0pass/2fail**, first23.4s (no sent OTP entry during20s poll),
second9.8s (no Admin member matching the just-created recipient). Correct
active/pending session and navigation assertions pass before the second failure.
Welcome delivery is not reached there; do not claim a directly observed welcome
failure. Existing full MSW servers remain healthy and their original224-case
invocation later passes, so these are not teardown/port-startup failures.

Source review agrees: register.ts keeps pending inputs locally, creates Me and
financial fee/referral state and group admission, but no Admin member profile
or mail-log effect. Admin member listing reads fixed seed members; its read
cannot discover this new identity. Existing bot/chat/financial snapshots do
not supply registration profile/mail state. Fix through a separate bounded
mock registration/persistence refine TIP, preserving these exact assertions.

Root lint8/8 and typecheck8/8 (7cached each), units6/6 (all cached;1280pass
plus2existing skips), depcheck pass FE1627modules/4662edges and server774/3417.
The FE scan included the temporary ignored scoped config, removed only after
both scoped test and gates were terminal. No new runtime dependency/source
behavior, native process/data change, provider call or test skip.

Registry228. Live535 full runs collected224 before537's2 mobile and538's2
registration cases. Native runner still owns dev resets; run these4 additional
cases only after it terminates/restores, with final demo restoration again.
Personal-only scenarios do not prove business registration or all LK-01 fields.
Raw sanitized failures/static receipts: `evidence/v2-538/`.
