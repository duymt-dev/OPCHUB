# TIP-V2-549 — Bot provider failure transaction acceptance

P5-only gap from501/502 review: adapter unit tests cover HTTP/network errors,
but bot generation integration currently exercises invalid text rather than
a thrown provider error. Add separate native integration cases for retryable
and terminal IntegrationError at the LLM boundary: propagate error metadata,
do not advance cursor/deadline/publish, release draft lease, permit explicit
valid retry exactly once without duplicate publication. Keep real Postgres,
fake provider and no external calls. No production logic change.

Run new integration file on opchub_test/Redis2, LLM adapter unit files, root
lint/typecheck/test/depcheck. Preserve failures. This is not permission to
re-open earlier-phase acceptance or weaken existing assertions.
