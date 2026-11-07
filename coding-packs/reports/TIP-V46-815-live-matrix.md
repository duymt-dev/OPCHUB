# TIP-V46-815 — live matrix

Run: **07/11/2026 15:54–16:03 UTC** (22:54–23:03 Vietnam). Matrix harness `a49ed5cd`; application unchanged from `dev` `7ceb26d7`. Final test-only commit is recorded in completion.

| Provider | Model | Verify | Bot | Tokens in / out | Bot latency | Compatibility / verdict |
|---|---|---|---|---|---|---|
| Claude | Not executed | — | — | — | — | NOT TESTED: no stored key |
| OpenAI | Not executed | — | — | — | — | NOT TESTED: no stored key |
| Gemini | Not executed | — | — | — | — | NOT TESTED: no stored key |
| DeepSeek | Not executed | — | — | — | — | NOT TESTED: no stored key |
| USGate | Not executed | — | — | — | — | NOT TESTED: no stored key |
| Custom /9router | `ag/gemini-3-flash` | OK, connection successful,1929ms | done,246 characters |2649 /68|1596ms|No incompatibility observed; **PASS** |

Matrix reply SHA-256: `3577138f7dac7dd27604fe3a16e752e28c3aa28e90b0648c1116d42d0f285068`.

## Existing real-provider journeys

| Case | Actual result | Characters | Tokens in / out | Provider latency |
|---|---|---|---|---|
| REQ-208 original | Real opening generated/published; obsolete Dashboard assertion failed |86|2115 /22|745ms|
| UAT-14 | **PASS**, quoted real reply survives reload |213|2740 /52|1364ms|
| REQ-208 corrected | **PASS**, real opening visible in chat c1, remainder ungenerated, execution stopped |221|2151 /57|1549ms|

- UAT-14 SHA-256: `6a04b409f83d3baa5d68cb7dcec3f3b7e4ddcb43ae71ee36b240830718e0cb44`.
- Corrected opening SHA-256: `c4edcb1dec0e642f1133e7882cf548ce1d4e4817caa1bc939e377bdbfccff6e1`.
- An intervening stale-topic attempt was stopped with **zero** upstream calls: it matched the preceding completed execution. Unique fixture topics now prevent that; assertions were not weakened.

## Cost and cleanup

**5 physical requests**:1 verify +1 matrix reply +1 original opening +1 UAT reply +1 corrected opening. Owner approved4 initially and exactly1 additional request after identifying the obsolete test. No retry/fallback/adapter retest.

All4 worker calls have `llm_calls.status=ok`. Worker totals9655 input /199 output tokens **exclude verify**: existing verify API does not expose usage or record `llm_calls`, so its usage is not invented. Every call was capped at256 output tokens or less (verify16); budget unchanged. Metadata prices do not establish the provider's actual bill.

Original non-secret AI configuration was restored and compared. Stored key unchanged. Owner-approved exception: retain the last provider, with bot/auto-generation/automatic replies off, because API disallows disabling every provider. Reply sample size restored. No seed/reset of live-key DB, no app/adapter/catalog change, no acceptance of truncated responses.

Safe evidence: ignored `test-results/v46-815-matrix-report.json`, `v46-815-real-req208.log`, `v46-815-real-uat14.log`, `v46-815-stale-topic-metadata.json`, `v46-815-live-REQ-208/metadata.json`. Trace/video/screenshots disabled; receipts contain metadata/digests, not prompts or generated answers.