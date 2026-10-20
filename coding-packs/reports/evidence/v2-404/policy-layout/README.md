# Policy layout evidence

Source: `b58f863`, then final order correction `822a9cb`. All runs terminal.
Logs are normalized UTF-8, ANSI/trailing whitespace removed, sensitive lines
redacted. No credentials, raw browser traces or private env files are included.

- `404-policy-layout-gates{,-final,-verified}.log`: failed intermediate runs;
  do not label these as passing gates.
- `404-policy-layout-gates-complete.log`: passing 22/22 on the earlier layout.
- `404-policy-layout-unit-focused.log`: eight focused cases, already included
  in the full unit count. `404-policy-layout-focused.log`: six browser cases,
  already included in the full MSW suite.
- Other `404-policy-layout-*` logs: earlier build/depcheck/full MSW/parity runs
  on the layout checkpoint. `parity-b58f863.json` retains its 11/14 measurement.
- `404-policy-order-*`: **final** 22/22 gate (773 units + two existing skips),
  depcheck, Admin MSW/native builds, 44/44 MSW and 11/14 parity on `822a9cb`.
- Final parity rows/diffs are in `../../../ui-parity/`, including all three
  failures. `source-files.txt` lists the twelve changed source/test files.
- `copy-verification.txt` records exact static rule-copy comparison against
  the prototype. Editable terms remain separate and visible.

See `../../../TIP-V2-404-policy-checkpoint.md` for limits and remaining scope.
