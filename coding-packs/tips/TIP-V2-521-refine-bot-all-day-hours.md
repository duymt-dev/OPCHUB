# TIP-V2-521 — Honor the canonical all-day persona activity choice

P1 scoped refinement of TIP-501/520, REQ-208/UAT-14/UAT-15. IMPLEMENTED.
Browser520 preserves the publication assertion and fails: actual log says skipped
for disabled/deleted/out-of-hours even after the relevant personas are enabled,
saved with the canonical UI choice "Cả ngày" and quota20. Shared runtime parser
only accepts numeric ranges and rejects this legitimate UI/prototype option.

Scope: recognize the exact trimmed canonical all-day option after invalid-date
guard; preserve every numeric start-inclusive/end-exclusive, overnight, invalid
legacy and quota rule. No generic unknown-string fallback. Shared runtime serves
both native script/auto/reply and MSW. Dedicated positive boundary and negative
near-match tests must fail before fix; existing server hours suite unchanged.
Run scoped native bot worker/reply regressions, same browser520 assertion, root
gates, isolated fresh MSW builds, evidence/report/traceability. No SQL/migration,
provider or native HOLD changes. Native browser deployment still required.
