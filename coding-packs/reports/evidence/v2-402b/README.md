# TIP-V2-402B evidence — source 79f7073

Source files are taken directly from Git in `source-files.txt`. Logs are UTF-8,
newline-normalized, ANSI stripped and sensitive lines removed.

| Log | Verified result |
|---|---|
| `402b-committed-native.log` | 48/48, 20 files, 167.96s; Affiliate plus one Admin contract case checking 14 endpoints |
| `402b-native-focused-final.log` | Three new native cases, included in 48; historical unequal rates and bank snapshots |
| `402b-committed-unit.log` | 748 passed + 2 existing skips, six tasks |
| `402b-gates-verified.log` | Forced workspace lint/typecheck/test 22/22 before final real-provider assertion |
| `402b-shared-gates.log` | Final shared lint/typecheck/test 3/3, including the fifth new provider case |
| `402b-depcheck-verified.log` | Both graphs passed: 1441/3961 and 668/2924 |
| `402b-portal-msw-build.log`, `402b-admin-msw-build.log` | Fresh builds of both origins, including relay/provider and required schema |
| `402b-server-build.log` | Production server build passed, no native service started |
| `402b-committed-msw.log` | Full Affiliate + Admin RBAC 39/39, 1.4m |
| `402b-committed-parity.log` | 8/14; six failing UI images retained, source 79f7073 |

Native integration preflight verified localhost opchub_test on port 5432; test
setup pins Redis DB 2. Embedded app tests are not native browser/network E2E.
Admin query-plan fixtures use 10,000-row deployed-schema temp clones, preserving
ID-first deferred pagination and index scans for offset/keyset bank payloads.
No planner costs/index toggles force the result; raw EXPLAIN output is archived.

Initial enum-fixture widening and URLSearchParams template lint failures are
retained. Neither is counted as a successful gate; fixes use literal typing and
explicit serialization, not suppressions. Initial native runs precede the
stronger historical-rate assertion; committed native log is authoritative.

MSW uses Portal 3236/Admin 3238/prototype 4800 and `.next-msw-v2`, mocking `msw`,
bots `on`, Portal origin 3236. Browser-owned servers were torn down after terminal
runs. Native/protected services were not stopped/reset. No bypass retries the
previous rejected native stack startup.

See `../../TIP-V2-402B-completion.md`. UI consumption, remaining parity/native
browser/audit and P4 main merge remain separate required work. No P5 work.
