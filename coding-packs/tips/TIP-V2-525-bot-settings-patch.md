# TIP-V2-525 — Preserve omitted bot settings in PATCH

New automatic browser case retains its negative precondition: generation must
stay false while configuring topics/global resume. Native returns it true.
The shared PATCH schema derives partial fields from a full-settings schema with
default(true), so omitted generation/reply toggles can materialize as true.

REQ-208 / D-50: PATCH must update only supplied fields; explicit false remains
false. Keep full GET/stored-settings defaults for backward compatibility.
Scope: shared PATCH schema, dedicated schema + native HTTP/MSW regressions,
reports. No mutation/audit/permission/SQL bypass. Retain the browser assertion.
Validate omission/empty patch/explicit false, response + persisted native state,
full gates, fresh native/MSW builds and both-lane automatic browser tests.
Commit/push only feature from dev; preserve native HOLD after owned cutover and
restore demo. Full P5 acceptance remains open.
