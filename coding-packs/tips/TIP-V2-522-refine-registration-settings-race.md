# TIP-V2-522 — Registration navigation waits for public configuration

P1 bounded acceptance refinement, A-11 / REQ-123 / D-63. IMPLEMENTED; full acceptance pending.
Full MSW behavior at build4c1fd891:219pass/2fail. One is an intentionally enabled
demo-account build flag (must rebuild off); the other is unchanged closed-signup
browser assertion. Isolated diagnostic confirms cookie=true and actual public
settings registrationOpen=false. Thus cookie transport is not the bug.

Source hook navigates whenever settings are undefined, allowing a click before
the asynchronous public-settings request completes. Preserve original browser
assertions. Dedicated controlled-latency hook tests must fail before fix, covering
closed/open delayed responses, failed load and retry, and cached closed state.
Await/deduplicate the existing query when unknown; never navigate on unknown or
failed configuration. Known closed still reports the original message, known
open still enters /register. A separate generic retry message must not mislabel
network failure as an Admin closure. No change to backend registration guards.

Files: Portal use-registration-open.ts, one-line LoginScreen void callback adapter,
dedicated hook spec, auth.json one key,
TIP/report/evidence/graph/findings/traceability. No API/schema/native migration or
test assertion weakening/onServer branch. Fresh isolated MSW build with demo
accounts off; unchanged browser negative plus positive signup regression cohort;
root gates. Native full baseline continues on immutable4c1fd891 bundles, unaffected
by this unbuilt Portal-only hook change; it is not post-fix native acceptance.
