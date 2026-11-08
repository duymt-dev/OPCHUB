# TIP-V46-814 — final single-SHA gates

Source `ef7934ff528ade7c00ebaf695f0077f2b797065a`. All ten commands sequential, no source/HEAD change. Eight functional gates PASS; parity measured/classified under D134 +explicit Q1 scope, not all-pixel-pass.

|Gate|Status|Start UTC|End UTC|Seconds|Evidence|
|---|---|---|---|---:|---|
|1 lint|PASS|2026-11-07T11:31:56.463Z|2026-11-07T11:33:12.543Z|76.078|`test-results\v46-814-A22-ef7934ff-1.log`|
|2 typecheck|PASS|2026-11-07T11:33:12.835Z|2026-11-07T11:33:43.830Z|30.994|`test-results\v46-814-A22-ef7934ff-2.log`|
|3 unit|PASS|2026-11-07T11:33:44.106Z|2026-11-07T11:38:02.741Z|258.634|`test-results\v46-814-A22-ef7934ff-3.log`|
|4 integration|PASS|2026-11-07T11:38:03.042Z|2026-11-07T12:03:57.794Z|1554.751|`test-results\v46-814-A22-ef7934ff-4.log`|
|5 depcheck|PASS|2026-11-07T12:03:58.115Z|2026-11-07T12:04:12.099Z|13.984|`test-results\v46-814-A22-ef7934ff-5.log`|
|6 forced MSW/native builds and owned runtime cutover|PASS|2026-11-07T12:04:12.385Z|2026-11-07T12:06:12.099Z|119.714|`test-results\v46-814-A22-ef7934ff-6.log`|
|7 full MSW behavior|PASS|2026-11-07T12:06:12.383Z|2026-11-07T12:21:04.082Z|891.699|`test-results\v46-814-A22-ef7934ff-7.log`|
|8 full native behavior|PASS|2026-11-07T12:21:04.428Z|2026-11-07T13:19:00.794Z|3476.365|`test-results\v46-814-A22-ef7934ff-8.log`|
|9 whole MSW parity incl old14; Q1 four-ID waivers explicit|MEASURED_OWNER_REVIEW_REQUIRED|2026-11-07T13:19:01.143Z|2026-11-07T13:35:03.294Z|962.151|`test-results\v46-814-A22-ef7934ff-9.log`|
|10 native v46 plus affected parity|MEASURED_OWNER_REVIEW_REQUIRED|2026-11-07T13:35:03.617Z|2026-11-07T13:52:23.779Z|1040.161|`test-results\v46-814-A22-ef7934ff-10.log`|

Unit2142 passed +2 existing skips (six nonempty packages, forced); integration2200/2200 (server2056 +DB144). Full MSW391 pass/4 existing skips, native386 pass/9 existing skips, zero flaky/unexpected behavior. Both builds forced, separate SHA-specific dist, correct private runtime cutover.

Parity MSW437 runner passes/67 raw failures/78 existing unreachable skips:59 threshold-only +8 approved Q1 prototype failures. Native82 runner passes/50 threshold-only/4 existing unreachable skips. No unexpected capture/harness failure;492/128 fresh captures. See parity report/closure JSON for classifications, not a fabricated zero exit code.

Earlier attempts27778a43,3b83b120,f64505aa,85fb990e,d1b8a5eb remain failed/interrupted checkpoints in completion history and ignored raw ledgers. No cross-SHA assembly; no gate10 resume/parser incident in this final sweep. A21 rerun on final SHA:101 up→16 down→101 up, ACL-preserving normalized schema identical, owned temporary DB dropped.
