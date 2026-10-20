# Customer mobile evidence — source 3932bbf

This checkpoint is IN-PROGRESS for P4. `source-files.txt` comes directly from
the Git commit, not a manually selected alternate implementation.

| File | Terminal result |
|---|---|
| `404-customer-mobile-gates.log` | Forced workspace lint/typecheck/test 22/22; 765 passed + 2 existing skips |
| `404-customer-mobile-depcheck.log` | Both graphs pass: 1452/3984 and 668/2924 |
| `404-customer-mobile-build.log` | Final Admin MSW build passes |
| `404-customer-mobile-native-build.log` | Final native Admin build passes; no native service startup |
| `404-customer-mobile-focused.log` | Two 360/390 customer tab/pager/size/page/F5 cases pass |
| `404-customer-mobile-committed-msw.log` | Full Affiliate + Admin RBAC 42/42, 1.4m; includes the focused two |
| `404-customer-mobile-committed-parity.log` | Current group 10/14; four default-agent/policy failures remain |
| `parity-results.json` | All fourteen rows verified to SHA 3932bbf; customer 1.80%/1.94% passes |

Logs are UTF-8, newline/trailing-whitespace normalized, ANSI stripped and
sensitive lines redacted. No raw credential-bearing trace is added. No new
failure was hidden: current gates/builds/focused/full behavior passed on their
first run; the raw parity command still exits 1 for its four remaining failures.

MSW uses `.next-msw-v2`, Portal 3236/Admin 3238/prototype 4800, mocking `msw`,
bots `on`, Portal origin 3236. Both browser suites ran serially and Playwright's
owned servers were torn down. Terminal port check found these app/test ports
and native 3280/3282/4020/4021 not listening; native DB/Redis/protected services
were not stopped or reset. Native build uses separate `.next-server`, mocking
`off`, Portal origin 3280/API proxy 4020. No retry bypasses the earlier rejected
native stack startup, and a build is not native browser acceptance.

No API/ledger/seed/money or shared UI change, no control removed, no mask or
threshold change. See `../../../TIP-V2-404-customer-mobile-checkpoint.md` for
remaining native browser/audits/state inventory/final acceptance and P4 merge.
Stop after P4 is actually accepted; no P5 work.
