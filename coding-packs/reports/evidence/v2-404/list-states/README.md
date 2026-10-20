# Selection/empty-state evidence

Source `4ab2b73` (registration), `a853ba9` (UI), `2a589cb` (count whitespace).
Fourteen logs are terminal, UTF-8/ANSI/line-ending normalized and sensitive lines
redacted. No private env or raw browser trace. Empty lint output accompanies an
observed exit 0, not a claim derived from the absence of log text.

- `404-list-states-prototype.log`: invalid-selector attempt, 4 fail/4 false
  empty passes. `...prototype-final.log`: **8/8** after positive baseline guard.
- `404-list-states-gates.log`: initial forced **22/22**, **804 + 2 skips**.
- `404-list-states-committed-parity.log`: **14/22**; independent snapshot
  `baseline-4ab2b73.json`, all rows on the registration commit.
- `404-bulk-layout-gates.log`: forced **22/22**, same unit count; focused four
  units are included, not added. Depcheck and MSW/native build logs pass.
- `404-bulk-layout-committed-msw.log`: **44/44** on committed UI, same regression
  suite as the preceding checkpoint, financial assertions retained.
- `404-bulk-layout-committed-parity.log`: **13 pass/9 fail**, including four
  selected-count locator failures before image generation. Its mixed-SHA store
  is not presented as current parity; old images were not current captures.
- `404-bulk-readiness-{lint,typecheck}.log`: passing focused helper gates.
- `404-bulk-layout-verified-parity.log`: final **16/22**, six raw visual failures,
  all current rows SHA **`2a589cb`**, also stored in `parity-2a589cb.json`.
- `source-and-artifact-files.txt`: scoped source and measured-summary files in
  these commits; the UI commit also includes the then-generated parity summary.

Live diff artifacts are under `../../../ui-parity/`; only failed current rows
are kept there. Native browser/audit and complete state inventory are not done.
