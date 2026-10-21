# TIP-V2-543 — New-member mock fee identity and password login

Refine P5-MSW-NEW-MEMBER-01, preserving542 same-lane cases. Activation/login Me
uses actual allocated fee memberCode, full submitted phone supplies transfer
content. Build login Me from the actual profile/current fee/status, never a
seed proxy or password-independent authentication. Wrong/absent password401;
locked identities remain forbidden. Production/server unchanged.

New independent modules; narrow handler/facade integration. Public registration,
community and affiliate snapshots remain password/hash-free. Portal-private
mock credentials use salted cryptographic verifiers, never plaintext persisted
or public cross-origin bridge/Admin data. Pending verifiers promote only after
successful valid OTP; failed/expired/replayed activation cannot authorize login.
Support browser reload/fresh runtime, passwordless registration, wrong password
and corrupted credential records. Existing Web Crypto/storage APIs, no provider
or dependency. Tests separate; assert credential exclusion from public snapshots.

Strengthen re-login with reload. Fresh isolated MSW builds,542 plus relevant
registration/auth/financial regressions and canonical gates. Retain red evidence;
native resets restore demo finally and preserve owned processes/ports. Keep
live540 full228 invocation. No unrelated password-reset/SSO scope expansion.
