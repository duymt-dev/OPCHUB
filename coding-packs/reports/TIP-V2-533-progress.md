# TIP-V2-533 — MSW long-running transport diagnosis

IN PROGRESS; no runtime correction or lifecycle PASS claimed.

Attempt533 never entered a test: nested temporary Playwright config resolved
webServer commands from its own directory and startup timed out. Corrected
only the diagnostic cwd to e2e; unchanged lifecycle assertions then reproduced
the original failure in533b: cursor1 instead of2,350000ms,5.9minutes.

Private instrumentation recorded **76 HTTP404 responses** across both app
origins: bot threads/activity, Admin badges and Portal unread. First error at
06:01:08.626Z; last06:02:04.514Z. No structured error code was present. This
is materially different from a proven bot feature-flag denial or a diagnosed
bridge503. The retained Portal-origin ledger still has global enabled=true,
featureEnabled=true, stoppedAt=null, autoGenerate=false, the admitted automatic
thread running/cursor1, and its next deadline06:01:12.545Z.

Installed MSW3.0.3 worker source wraps message processing in event.waitUntil
and awaits sendToClient for MOCKING_ENABLED, INTEGRITY_CHECK_RESPONSE and
KEEPALIVE_RESPONSE. sendToClient resolves only when the transferred MessagePort
receives an acknowledgement. Installed browser channel emits those notifications
without visibly replying to those ports. **Working hypothesis:** unresolved
notification events cause worker lifetime termination and subsequent API
passthrough. HTTP404 and enabled flags narrow the search; they alone do not
prove worker termination or the complete cause.

Attempt533c runs the exact lifecycle assertions against unchanged MSW530 builds,
with one private addInitScript experiment acknowledging only the four expected
MSW notification types from same-origin /mockServiceWorker.js ServiceWorkers.
It does not manually advance turns, change timeouts, reload to recover, alter
business settings or touch native services. Await its actual result before
promoting a correction into source. If successful, a scoped refine TIP must
provide typed/schema-validated transport code, negative/unit controls, fresh
builds and unchanged canonical browser regression. Vendor-generated worker files
must remain untouched. No paid LLM calls were made.

Diagnostic configs/specs are temporary ignored files, removed after their own
process is terminal. Raw full ledger remains private outside Git. Sanitized
failed invocation and path/status/time-only errors: `evidence/v2-533/`.

An additional private Node VM probe executes the unmodified installed worker's
message handler for MOCK_ACTIVATE, KEEPALIVE_REQUEST and INTEGRITY_CHECK_REQUEST.
For each, waitUntil is still unsettled after30ms without a port reply and settles
with a reply (six observations). This confirms the unresolved notification
handshake in that isolated source boundary; it does not by itself prove Chromium
termination or a successful full browser correction. Receipt retained alongside
the original failures. Attempt533c must still reach a terminal result.

## 533c terminal: candidate rejected, no production promotion

The notification-ack experiment **failed** at the900000ms test deadline while
waiting for member login to reach Dashboard, before any cross-app lifecycle
verification. It recorded5 HTTP503 responses from Portal stats/settings/login.
This is not a fix or a passing bot lifecycle. Its broad acknowledgement listener
is retained privately as an unsuccessful experiment and is NOT added to apps or
packages. The isolated VM handshake result must not override this browser red.

Follow-up533d removes that listener and repeats the original unchanged case with
passive worker-start/close observations and one worker-state read only after
the first failed response. It must distinguish actual worker termination from
API-handler/bridge errors before selecting another correction. Both temporary
533c files were removed after its terminal result;533d files remain only while
its own process is live. Native stack/dev data remain untouched.
