# Mobile financial dialogs — test source `4949a41`

- `404-dialog-mobile-lint.log`: failed initial helper, seven forbidden non-null
  assertions. Corrected by an explicit missing-box guard, not a fallback rectangle.
- `404-dialog-mobile-focused.log`: initial **4/4** behavior run; body attachments
  alone did not persist images with the list reporter.
- `404-dialog-mobile-captured.log`: **4/4** after explicit screenshot output paths.
- `404-dialog-mobile-unit.log`: **7/7**, three new rate cases plus four existing
  dialog cases; already included in global units, never added to that count.
- `404-dialog-mobile-gates-final.log`: **22/22 tasks**, **807 units + two skips**.
  The later audit preflight folder records the final **813 + two skips** gate.
- `404-dialog-mobile-depcheck.log`: **1467/4031**, server **671/2935** at the dialog
  checkpoint. Audit follow-up adds two helper/test modules and passes its own gate.
- `404-dialog-mobile-committed-msw.log`: **48/48**, twenty files, committed source.
- `screens/`: eight actual PNGs from that full committed run; `screens.json`
  identifies source/target/state. All eight inspected. They are **SRS-only UI
  evidence**, not prototype parity or native browser acceptance.
- `source-files.txt`, `port-check.txt`: three test source files and final TCP check.

Logs are terminal, normalized UTF-8/ANSI-free, trailing spaces trimmed and
sensitive lines redacted. No credentials, private env, edited image or raw trace.
No production behavior or ledger was changed by these tests.
