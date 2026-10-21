# TIP-V2-537 — Explicit UAT-31 behavior checks

TIP-503 requires390px no horizontal overflow and Admin tables converting to
cards. Existing tests cover Portal drawer interaction and Affiliate responsive
components but have no explicit UAT-31 test. Add scoped canonical assertions
for Portal Dashboard/community/drawer and Admin Members list-to-card behavior.
Measure document scrollWidth against clientWidth (no added tolerance); verify
actual member fields/actions remain accessible, wrapped card layout and bounds,
selection interaction, and desktop restoration. No app/style changes or lane
branches. This is responsive behavior, not screenshot/parity measurement.

Run identical new cases in MSW and native, preserving failures. Do not interfere
with the currently running224-case invocations: their collection is immutable;
the two additional cases belong to subsequent scoped/full receipts. Native
execution must wait for the current native runner/restoration to finish.
Root gates and commit/push are required; uncovered other390px screens remain
explicit scope gaps, not inferred PASS from these representative screens.
