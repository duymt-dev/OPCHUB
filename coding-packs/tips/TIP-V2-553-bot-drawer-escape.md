# TIP-V2-553 ? Bot drawer first-frame Escape

Merged native552 browser exposed Escape not closing script edit drawer; original
assertion remained red at /bots/scripts/sc100. MSW same case passed. Inspect
Sheet listener installation: passive effect leaves first-commit readiness gap.

Add deterministic component regression dispatching Escape from a later sibling
layout effect. Original production fails (0 close calls), while normal callback
replacement/cleanup case passes. Install listener during layout effect before
paint, preserving window Escape semantics and current callback cleanup.
No layout, API, business rules, test delay or browser assertion changes.

Run focused red/green unit, root gates; rebuild only Admin both lanes and verify
existing Admin bot browser cases after current552 runs terminate and native demo
restore succeeds. Keep original552 red evidence. Do not restart running suites
or reset their database. Commit/push after gates; integration and PR remain open.
