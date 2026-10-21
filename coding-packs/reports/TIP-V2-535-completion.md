# TIP-V2-535 — MSW lifecycle notification fix

Scoped transport fix verified; P5 acceptance remains IN PROGRESS.

Source commit **ed9dbccc** patches existing MSW3.0.3 via pnpm and regenerates
both public workers with the patched CLI. No bot implementation, library browser
JS, business settings, expectation or timeout changed. See the progress report,
patch README and retained original failures for source diagnosis/provenance.

- Generated-worker source boundary: before8fail/2RPC controls pass; after10/10.
- Final root lint/typecheck/depcheck pass; **uncached1280 unit tests pass plus
 2existing skips**.
- Unchanged canonical MSW three-file cohort: **10/10 PASS**,11.2minutes. This
 includes8 login controls, full automatic3turn lifecycle10.2minutes and actual
 member reply38.6seconds. No private diagnostic test or ack listener is used.
- Full lifecycle preserves two300000ms deadlines, actual opening/other/opener
 bodies, live chat before F5, private identity exclusion, exactly3 persisted
 IDs and original Dashboard opening/earliest-response/count2 assertions. Native
 same canonical case already passes in TIP-532; member reply passes both lanes
 in TIP-530. This establishes both-lane scenario coverage, not full acceptance.
- Runtime: existing immutable530 MSW Next bundles, unchanged MSW browser JS,
 freshly regenerated public worker assets; source baseline6fc259c9 plus exact
 535 changes subsequently committed ed9dbccc. Eight public-worker line changes
 are included in that commit; public assets are served from disk by Next.

Native HOLD/dev data untouched and no additional upstream LLM calls. Original
532/533 failures and rejected533c experiment remain retained. Full224 behavior
MSW regression is now running separately; no aggregate224PASS is claimed here.
Fresh native UI builds are staged separately without stopping the existing UI.
Remaining UAT/AT/LK review/tests, audits, parity and dev review PR are still due.

## Fresh native UI staging / full regression launch

Both native UI builds ated9dbccc pass in isolated.next-server-v2p5-535.
Before cutover, owner was told about the brief UI interruption and per-case
native demo resets. Verified recorded UI command lines and listeners belonged
to this workspace before stopping only Portal/Admin. Fresh UI starts on3280/
3282; backend159fc82b remains untouched (no production server/Prisma/integration
source differences from159fc82b to current HEAD). Both logins/API health200,
socket4021 reachable, all5 owned processes alive after cutover.

Full224-case MSW and native invocations are live, **not yet terminal results**.
Native runner validates opchub_dev/native5432 and Redis1, uses existing Fake
backend and schedules required seed + ordinary seed:demo + flush in finally,
even on test failure. During this announced run native data changes per case;
normal demo is not claimed restored until the runner's terminal restore receipt.
Build/state/health receipts are retained with this report; full receipts follow.

Full MSW535 invocation is now terminal **224/224 PASS**,22.7minutes, including
unchanged automatic lifecycle10.1minutes. Native full remains running. This
collection excludes537 mobile2 and538 registration2 added subsequently: current
registry228. Registration cases expose new missing mock effects (5380/2), so
full current behavior acceptance is not green despite this224-case pass.
