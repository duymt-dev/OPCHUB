# TIP-V2-535 — MSW notification event lifetime

Refine OPEN S2 P5-MSW-LIFECYCLE-01. Passive533d reproduces the unchanged
cursor1 failure: first HTML404 at301seconds after worker start; both installed
workers expose activeClients=0/pending=0. Isolated installed-source probe shows
notification waitUntil promises never settle without an undocumented port ack.
The earlier broad browser ack experiment failed Portal login and is rejected.

Scope: maintainable pnpm patch of existing MSW3.0.3 worker template, plus official
CLI regeneration of both public worker assets. No dependency/stack version
change, hand-edit of generated assets, bot state-machine change, test timeout
change, network fulfillment, native restart/reset or real LLM call.

One-way MOCKING_ENABLED, KEEPALIVE_RESPONSE, INTEGRITY_CHECK_RESPONSE and
CLIENT_CLOSED notifications should use Client.postMessage directly, not await
the request/reply MessageChannel helper. Keep actual REQUEST/RESPONSE RPC helper
unchanged. Add separate tests executing both generated workers: each message
event must finish without an ack; request RPC must still wait and return its
reply. Retain failing tests against unmodified assets and original browser reds.

Apply the package patch through pnpm's patch workflow so installs/regeneration
are reproducible. Mandatory gates, isolated MSW startup regression and unchanged
canonical full lifecycle are required. If browser evidence fails, do not close
the finding or call the patch complete. Fresh app builds if runtime library
changes require them; native artifacts stay immutable. Full behavior/UAT/AT/LK
acceptance remains separate from this bounded transport correction.

Use the existing shared dev-only @types/node dependency explicitly in the
generated-worker test (node:fs/vm/worker_threads). TypeScript6 does not discover
those ambient types automatically in this package. No new dependency or
package version change is needed; no type-check suppression is permitted.
