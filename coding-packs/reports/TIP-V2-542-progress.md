# TIP-V2-542 — Fresh-account fee gate: native green / MSW red

IN PROGRESS. Two actual unique password-bearing registrations, not unpaid demo
proxies. UAT-06/07/08/AT-LK01 checks mandatory fees, no close, Escape/backdrop
reminders, blocked navigation, exact OPCHUB TV-six-digit reference, own phone
in payment content, amount and non-refund copy. UAT-30 checks logout clears all
dialogs then password login returns the same ID/name/email/unpaid session.

First MSW0/2 fails at `OPCHUB NEW` and login401. Initial native0/2 fails for a
different reason: asynchronous P-05 welcome replaces the fee gate, detaching the
target. Added same-lane own-recipient welcome-preview assertion/explicit close
before fee checks. Native rerun **2/2 PASS,23.5s**, required/demo/flush all0,
restored=true. MSW rerun **0/2**, same substantive failures after welcome checks.
No native defect, no lane branch, weaker assertion, request fulfillment or skip.

Source: newMemberMe placeholder reference is not synchronized to allocated fee
memberCode; affiliate fee creation also drops submitted phone. Login consults
demo identities, not activated registrations/credentials. Phone-content assertion
is not reached on MSW yet; static omission is not a separately observed failure.
Keep public snapshot credential-free; fix through bounded TIP-543.

Initial lint rejects unnecessary await on synchronous regex assertion; removed
only await, same regex. Final lint8/8 (7cached), typecheck8/8 (7cached), unit6/6
(all cached,1289pass +2existing skips), depcheck allgreen. Scoped temporary
config remained during gates and was removed only after all handles terminated.
Evidence: `evidence/v2-542/`, including original lint and browser red outputs.

Registry231. Live540 full collected228 before541 business and542 new-account
cases. Green old full/native2/2 does not make these new MSW scenarios green.
Demo restored on3280/3282. Remaining audit/parity/final integration not done.
