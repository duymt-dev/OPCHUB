# TIP-V2-402C evidence — source `986930c`

All archived runs terminal. UTF-8/line endings normalized, ANSI/trailing space
removed, sensitive lines redacted. No private env, credentials or browser traces.

- `402c-msw-focused.log`: failed fixture attempt, **26/27**; final counterpart
  `402c-msw-focused-final.log`: **27/27**.
- `402c-gates.log`: failed initial lint gate, **19/22 tasks**; final counterpart
  `402c-gates-final.log`: **22/22**, **793 units + two existing skips**.
- `402c-native-focused.log`: initial **9/9**; `402c-native-regression.log`:
  **55/55 in 23 files**, including bounded EXPLAIN fixtures, not a load test.
- `402c-native-committed.log`: **9/9** on committed source, after correcting
  assertion typing. This subset is included in 55, never added to that total.
- `402c-depcheck.log`, `402c-server-build.log`: passing boundary/build gates.
- `source-files.txt`: fourteen source/test/contract/packet files in the commit.
- `destination-verification.txt`: safe native DB destination check; no secret URL.

No native browser acceptance was run here. API completion does not finish P4.
