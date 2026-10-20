# TIP-V2-403 — lifecycle acceptance checkpoint

Source: `f821b0e` (lifecycle, query identity boundary, payment clock), `32f6112`
(copy accessibility/unit tests, coherent paused fixture). No source edits during
the final runs captured here. Logs are UTF-8/LF, ANSI removed, sensitive lines
redacted. Browser traces remain outside the repository.

| Evidence | Result |
|---|---|
| `403-finish-lint.log`, `403-finish-typecheck.log` | exit 0, 8/8 tasks each, forced |
| `403-finish-unit.log` | exit 0, 6/6 tasks forced; 599 passed, 2 existing skipped |
| `403-finish-depcheck.log` | exit 0, both dependency graphs |
| `403-finish-db-int.log` | exit 0, 19 tests / 3 files; 28 migrations applied |
| `403-finish-{msw,native}-build.log` | exit 0 each |
| `403-finish-native-behavior.log` | exit 0, 26/26 (12 Affiliate + 14 auth) |
| `403-finish-native-parity.log` | exit 0, P-97/98 desktop/mobile 4/4 |
| `403-finish-msw-behavior.log` | exit 1, 25/26; UAT-11 second login timeout |
| `403-traced-msw-behavior.log` | exit 0, same full selection 26/26 with traces |
| `403-reset-probe.log` | exit 0, isolated UAT-11 repeated 3/3 |
| `403-reset-repeat.log` | exit 0, isolated UAT-11 repeated 12/12 |
| `403-msw-full-repeat.log` | exit 0, full selection repeated twice 52/52 |
| `403-finish-msw-parity.log` | exit 1, 22/26; four known Auth deviations |

The failing MSW regression is retained, not replaced by the passing rerun.
Its intermittent cause is not yet proven. Isolated repeats do not establish
full-suite acceptance by themselves. No assertion/timeout/threshold was relaxed.

`{msw,native}-affiliate-parity.json` contains the four selected results per
target on `32f6112`. `native-auth-parity-f821b0e.json` preserves the earlier 22
Auth captures: 18 pass, four A-17/A-20 failures under `DV-V2-403-1`. The later
source only changes Affiliate copy labels/tests and paused seed chronology;
it does not change Auth layout. These are selected results, not a full registry
run. Playwright targets ran serially to avoid shared parity teardown collisions.

TIP-403 completion uses the later full passing runs, while retaining the
intermittency warning; it does not claim a root-cause fix for UAT-11. See
`TIP-V2-403-completion.md` for scope and follow-up. TIP-404 and P5 are not covered.
