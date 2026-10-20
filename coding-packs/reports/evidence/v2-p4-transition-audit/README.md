# Affiliate transition audit and frozen-clock fixture correction

Source commits **`1477383`**, **`a88b561`**, **`bc03c9f`**, pushed on the existing
P4 branch. Nine terminal logs normalized to UTF-8/LF; sensitive-key lines are
redacted, not fabricated. Static snapshots retain public schema/example key names,
not private values. See `source-files.txt` and `native-destination.txt`.

| Evidence | Actual result / scope |
|---|---|
| `404-c4-unit.log` | Nine strict auditor units; included in the final 822 |
| `404-c4-audit.log`, `mechanical-before-c6.md` | C4 36/1, C5 173/0; C6 before docs 126/16 |
| `404-c6-audit.log`, `mechanical-after-c6.md` | C6 138/4 after documenting twelve existing keys |
| `404-c4-terminal-native-committed.log` | Pre-fix **0/2**: frozen-clock fixture collides on persistent member-code uniqueness |
| `404-fixture-repeat-1.log`, `404-fixture-repeat-2.log` | After UUID fixture fix, **2/2** in each fresh process against the same database |
| `404-fixture-gates.log` | Forced **22/22 tasks**, **822 passed + 2 existing skips**, lint has warnings but no errors |
| `404-fixture-depcheck.log` | Both graphs pass: **1468/4036** and server **680/2954** |
| `404-fixture-native-regression.log` | Final-source native Affiliate + Admin/public/coverage contracts: **57/57 in 24 files**, 175.55s |

Full native command:

```text
pnpm --filter @opchub/server test:int test/affiliate test/contract/affiliate-admin.int.spec.ts test/contract/affiliate.int.spec.ts test/contract/coverage.int.spec.ts
```

The two terminal-referral cases are included in 57; focused repeated executions
are **not** four additional distinct cases. The earlier failure is intentionally
retained. No test DB rows or native uniqueness constraints were removed to pass.

Static C1–C6 counts: **25/0, 25/0, 88/0, 36/1, 173/0, 138/4**. The runner exits
zero even with findings: this is not a global PASS. One C4 P5 bot finding is
excluded, not fixed. Four C6 S4 warnings remain explicitly deferred (three
Q-B65-1 Sentry placeholders and one DB-example runtime/API reference).

These are preliminary source checks and embedded native API/handler tests, not
persistent worker execution, native browser or the required post-seed phase audit.
No new screenshot/browser result is claimed. P4 reports/main merge, native
acceptance and the six previously failing parity images remain open.
