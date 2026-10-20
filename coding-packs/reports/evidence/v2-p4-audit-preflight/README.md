# Preliminary C1–C6 and C5 correction — source `ca6b368`

Six terminal logs, normalized/redacted UTF-8. No private env values are read by
these static checks; C6 scans schema/example **key names** only.

- `404-dialog-mobile-preliminary-audit.log`, `mechanical-before.md`: original
  static output, including fifteen false missing-guard flags from decorator order.
- `404-c5-focused.log`: six AST fixture tests, including absent/comment/sibling
  guards. Included in the final 813 unit count.
- `404-c5-gates.log`: forced **22/22**, **813 passed + two existing skips**.
- `404-c5-depcheck.log`: both graphs pass, **1468/4036**, **673/2937**.
- `404-c5-preliminary-audit-final.log`, `mechanical-after.md`: actual source
  audit after the fix: C5 **173/0**, C4 still **28/1**, C6 still **126/16**.
  Exit 0 is **not** a passing audit verdict. Affiliate C4 edges remain missing.
- `404-c5-native-guards.log`: fresh embedded native API subset **7/7**, not
  browser acceptance and not seven new distinct cases to add to historical 55.
- `native-destination.txt`, `source-files.txt`: safe DB destination and six
  committed audit/config/generated-report paths. No runtime API guard was edited.

No seed/flush or persistent stack startup: this is preliminary static evidence,
not the required post-seed phase audit/E2E sequence. P4 remains IN-PROGRESS.
