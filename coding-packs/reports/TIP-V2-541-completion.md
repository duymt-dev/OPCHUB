# TIP-V2-541 — Business registration acceptance

Scoped browser scenario PASS both lanes; P5 remains IN PROGRESS.

New UAT-05/REQ-401/LK-01 test performs real UI tax lookup and verifies autofilled
company/industry, removes one secondary industry and validates the actual202
request's shared business schema. Unique recipient/representative proceeds via
OTP to a shared-schema active/business/pending-payment session. Admin navigates
Members, filters business and the new email; the actual response must contain
one profile whose ID equals the newly activated session ID, matching tax/name/
industry/organization/verified status. The same UI row/drawer displays the fields.
Admin Fees must show its own pending fee and collection action; Marketing must
show exactly one own sent OTP and one own sent welcome. No fixture identity
proxy, mocked request, lane branch, skipped assertion or native source change.

MSW **1/1 PASS,7.3s** against existing fresh539 immutable builds, independent
browser context while540 full228 invocation stays alive. Native **1/1 PASS,
22.7s**, original535 native UI/backend unchanged. Native finally required seed,
normal demo seed and dev-cache flush all0; restored=true. Both use Fake providers,
no actual LLM call or extra external service.

Initial root lint passes but typecheck finds exactOptionalPropertyTypes violation
in the temporary ignored scoped Playwright config (`globalTeardown: undefined`).
The config worked at runtime but was still included by TS. Retained red evidence;
removed only that owned config after its test and gate handles were terminal,
then reran canonical gates. This was not a production-source or assertion bug.
Final gate receipts retained adjacent; no synthetic no-run pass.
Final gates exit0: lint8/8 (8cached), typecheck8/8 (5cached), unit6/6
(4cached;1289pass +2existing skips), depcheck FE1634modules/4710edges and
BE774/3417. The scoped temporary config is no longer present.

Registry now229. Live540 full invocation collected228 before this addition;
do not rewrite its collection count. This improves business/profile/fee coverage
of LK-01, but Admin overview registration destination remains independently
unverified. Personal and business happy paths do not prove OTP rate/security
edge cases or all other UAT/LK requirements. Audit and parity remain later gates.

Sanitized raw outputs, source/runtime/restoration receipts: `evidence/v2-541/`.
