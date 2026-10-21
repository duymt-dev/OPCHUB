# TIP-V2-534 — Deterministic Dashboard response chronology

Refine P5-TEST-DASH-TIME-01 under TIP-503/UAT-15/REQ-411. Full integration
at4d6656ae and unchanged scoped reproduction both show the earliest-preview
case mixes fixed calendar persona timestamps with the actual HTTP member time.

Scope: only Dashboard integration fixtures/tests. Allow an explicit writer
timestamp without changing existing callers. In the member-first case, derive
later persona timestamps from the persisted member message and preserve every
count, preview and visibility assertion. Add the opposite-order control proving
an actually earlier persona response remains the preview. No production SQL,
ordering/filter changes, assertion weakening, native reset or provider calls.

The wide-row query's roots must also be newer than the earlier cases' actual
HTTP roots: derive its existing tied timestamp from the maximum of the injected
fixture time and wall time. Keep the latest-50, exact counts/previews and all
EXPLAIN expectations unchanged. Retain the intermediate failure if exposed.

Retain raw before/after failures/results. Run the scoped real Postgres suite,
lint/typecheck/unit/depcheck, commit/push, then forced full integration. A scoped
pass does not close the full-integration gate or the separate MSW lifecycle bug.
