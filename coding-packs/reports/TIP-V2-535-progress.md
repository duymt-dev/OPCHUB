# TIP-V2-535 — Worker notification lifetime correction

IN PROGRESS; unchanged canonical browser regression running, not yet PASS.

## Cause / bounded patch

Passive533d repeats the original failure in6.0minutes, without an acknowledgement
experiment. Worker origins start at06:20:40.388Z/40.849Z. First API error at
06:25:41.180Z is HTML404. Both worker globals then have activeClients=0 and
pendingRequests=0. This demonstrates lost mock activation, not a bot flag flip.
The recorded worker-close event list is empty, so do not claim that Playwright
observed a close event. Source probes separately establish unresolved message
event promises for one-way lifecycle notifications.

Retain533c failed browser-ack experiment; no such listener enters product code.
Instead apply a reproducible pnpm patch to existing MSW3.0.3: four lifecycle
notifications use Client.postMessage directly in source/distributed worker
templates. Actual request/response MessageChannel RPC remains unchanged. Both
public worker assets are generated with the installed patched official CLI,
not edited manually. No package version or runtime dependency changed.

## Actual checks so far

- Original generated-worker tests: **8 failed/2 RPC controls passed**,603ms.
- After patch/CLI regeneration: **10/10**,302ms. Both app assets tested;
 four notifications settle without an ack, and real request RPC waits until
 its port receives the exact response.
- Initial root lint was red because Node ambient types were not discovered by
 TypeScript6 and test stubs used unnecessary async. Existing @types/node is
 now explicitly referenced in this Node-only test; stub methods return typed
 promises. No type suppression, new dependency or assertion weakening.
- Canonical MSW invocation uses existing immutable530 Next bundles (library JS
 unchanged) and the freshly regenerated worker files served from public/. It
 runs login controls, unchanged full automatic lifecycle and member-reply E2E,
 no alternate diagnostic assertions or network fulfillment. Eight login cases
 have passed; lifecycle/member result must be read from the terminal receipt.

Native HOLD/development data untouched. No real-provider calls. Source/type/unit
and browser gates remain separately reported; no P5-DONE or complete MSW gate.

Final-state mandatory gates: lint8/8 (3cached), typecheck8/8 (1cached),
**uncached units1280pass +2existing skips** across6tasks, depcheck pass
(FE1624modules/4655edges, server774/3417). Original lint failure and final gate
receipts retained in `evidence/v2-535/`. Browser remains running at commit time;
this source checkpoint is not a closure of P5-MSW-LIFECYCLE-01.
