# TIP-V2-536 — Dashboard fixture calendar independence

Post534 full integration preserves two additional original failures: latest50
roots lose their expected ordering to current demo openings, and the first
script-publication Dashboard card is a newer seed opening rather than this test's
opening. Both share ThreadFixture's absolute 2026-10-21 clock. Preserve failures.

Use one injected suite clock at the following UTC day's05:00 (Vietnam noon),
then retain serial five-minute advancement. This puts test roots after current
demo/HTTP messages while preserving the explicit01:00–02:00 inactive-window
control. Member-first preview still uses its actual HTTP source chronology.
No production filters/order, first-card/keyset/privacy/count assertions, seed
data, native runtime or provider calls may change. Run both Dashboard integration
files, root gates, commit/push and then forced full integration.

The storage suite must own/close its fixture per case: the70 future keyset roots
otherwise crowd the subsequent wall-clock member-response roots out of latest50.
Preserve the intermediate14pass/2fail cohort. This is test-owned cleanup, not
filtering the repository, changing LIMIT or removing the original assertions.
