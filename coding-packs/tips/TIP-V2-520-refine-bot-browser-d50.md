# TIP-V2-520 — D-50 browser scheduling controls and stale approval copy

P1 bounded refinement of TIP-501/503. Approved serial P5 feature off dev.
Status IN PROGRESS. Fresh MSW browser baseline:3 pass,2 fail. One old case assumes
the activity log stays empty despite the real worker; another asserts the retired
approval queue. Preserve raw logs. D-50 supersedes D-04/D-48 approval behavior.

Replace retired approve/reject workflow with stronger real browser coverage:
manual run response/actual thread identity, scheduled/running cursor and exact
progress, worker publication without approval, stop terminal state, no later
cursor movement past the configured next-turn delay. Same assertions in MSW and
native; no onServer branches or mocked responses. Keep CRUD/delete/URL controls.
Use actual server-returned entity IDs rather than mock-only ps-number regex.
Test preparation via real UI isolates automatic generation and sets relevant
personas to all-day/high-quota, not a production/test time bypass.

Correct stale rendered approval explanations and reply switch label according to
D-50/QT-07; no layout/pixel change. New component regression must fail before copy
correction. Files: bots.json, ThreadList comment, dedicated AutoPanel spec;
e2e admin-bots.spec.ts and small bot UI helper/new runtime spec; receipts/report/
graph/findings/trace. Fresh isolated MSW build uses .next-msw-v2p5 and relay origin
localhost3240; never replace HOLD .next-server-v2b. Initial browser invocation503
was wrong relay build origin, not an auth product failure; retain diagnostic.
Run root gates and focused browser MSW/native after owned native deployment.
No parity waiver, provider call or main merge. Full P5 acceptance stays open.
