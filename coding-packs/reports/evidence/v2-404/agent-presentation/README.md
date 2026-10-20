# Agent bank and period presentation — UI 10a3c71, tests fc642f6

P4 remains IN-PROGRESS. Source paths come from both Git commits in
`source-files.txt`; `source-lines.txt` records a maximum of 227 touched source
lines. The test-only follow-up changes no production file or final build input.

| Evidence | Terminal result |
|---|---|
| `404-presentation-gates-verified.log` | UI forced lint/typecheck/test 22/22, 758 passed + 2 existing skips |
| `404-presentation-reload-gates.log` | Final follow-up forced gate 22/22, same 758 + 2 skips |
| `404-presentation-reload-depcheck.log` | Both graphs passed: 1448/3977 and 668/2924 |
| `404-presentation-msw-build-verified.log` | Final Admin MSW production build passed |
| `404-presentation-native-build.log` | Final native Admin build passed, no native service started |
| `404-presentation-focused-msw.log` | New period/F5 + two 360/390 mobile cases: 3/3 |
| `404-presentation-committed-msw.log` | Initial full suite 39/40, lifecycle row absent after F5; retained failure |
| `404-presentation-lifecycle-traced.log` | Unmodified traced repeats 3/3; not a root-cause proof |
| `trace-observation.txt` | Safe action timing/query observation; raw traces excluded |
| `404-presentation-reload-focused.log` | Six repeats after stronger URL readiness assertions: 6/6 |
| `404-presentation-committed-msw-final.log` | Final committed-source Affiliate + Admin RBAC 40/40, 1.4m |
| `404-presentation-committed-parity.log` | Fresh fc642f6 Admin parity 9/14; five failures remain |

Earlier identity fixture/type, current-month expectation and non-null assertion
lint failures are retained in `type-first`, `gates`, `gates-final` and
`gates-corrected` logs, not counted as passing gates. Prettier check passed.
No assertion, screenshot threshold/mask, real agent or ledger value was removed.

Logs are UTF-8/newline-normalized, ANSI stripped and sensitive lines redacted.
Raw browser traces remain outside the repo because they may contain credentials.
Focused runs/repeats are not added again to distinct unit/browser totals.

Runtime: MSW Portal 3236/Admin 3238/prototype 4800, `.next-msw-v2`, mocking `msw`,
bots `on`, Portal origin 3236. Native build uses `.next-server`, mocking `off`,
Portal origin 3280/API proxy 4020; its preflight found native ports not listening.
The earlier rejected native startup was not retried via a bypass. Playwright's
owned servers were torn down after the terminal runs; DB/Redis and protected
services were not stopped/reset. Native build is not browser acceptance.

See `../../../TIP-V2-404-agent-presentation-checkpoint.md`. Remaining default
agent/policy/customer parity, native browser/audits and P4 completion/merge are
still required. No new deviation is self-approved; no P5 implementation.
