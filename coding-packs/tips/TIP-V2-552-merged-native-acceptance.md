# TIP-V2-552 ? Merged P5 native acceptance

Build backend and both frontend lanes from merged99100691, no new behavior.
After build success, verify exact manifest process identities and replace only
owned api/socket/worker/portal/admin with new immutable outputs; preserve ports
and native dev database. Fake external adapters, no real-provider calls.

Run existing9 bot E2E cases on both lanes with identical assertions, no earlier
phase expansion. Native reset is announced; always restore required/demo/cache
in finally. Keep exact failures and source/runtime provenance. Record results,
commit/push and integrate dev only after applicable gates pass. Reuse existing
owner PR5 dev-to-main; do not merge main or enable auto-merge. Preserve approved
P5 spec deviations and separate native Dashboard parity limitation in review.
