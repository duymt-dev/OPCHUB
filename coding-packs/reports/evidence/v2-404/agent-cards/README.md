# Affiliate agent cards — source 6ee0fc3

P4 is IN-PROGRESS. Source paths are taken directly from Git in `source-files.txt`.
Logs are UTF-8/newline-normalized, ANSI stripped, sensitive lines redacted.

| Evidence | Result |
|---|---|
| `404-agent-cards-gates-final.log` | Forced lint/typecheck/test: 22/22 tasks; 743 passed + 2 existing skipped |
| `404-agent-cards-depcheck-final.log` | Both import graphs passed (1439/3954, 666/2913) |
| `404-agent-cards-build-final.log` | Admin MSW build passed |
| `404-agent-cards-native-build.log` | Fresh native Admin build passed; not native browser acceptance |
| `404-agent-cards-focused-final.log` | 2/2 at 360/390, including full-width empty state |
| `404-agent-cards-committed-msw.log` | Full Affiliate + Admin RBAC 39/39; focused two included |
| `404-agent-cards-committed-parity.log` | 8/14, six failures, all metadata source 6ee0fc3 |

Initial gate failure (84-line orchestrator) and initial dirty-source parity 1/4
are retained, not counted as passing. Extraction keeps production/test code in
separate small modules. A phantom measurement row in the initial CSS is fixed;
no business row, status, screenshot threshold or mask was removed/changed.

MSW runtime: Portal 3236, Admin 3238, prototype 4800, `.next-msw-v2`, mocking
`msw`, bots `on`, Portal origin 3236. Native build: `.next-server`, mocking `off`,
API 4020, Portal origin 3280; no native process started and no retried bypass of
the previous rejected startup. Browser-owned MSW servers were torn down after
the terminal runs; native DB/Redis and protected ports were not stopped/reset.

See `../../../TIP-V2-404-agent-cards-checkpoint.md` and V2Q-178 for API bank/period
gaps and explicit remaining acceptance. Mobile pixel differences are not all
better; a functioning visible card does not waive failing parity/native/audit.
