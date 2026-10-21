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
