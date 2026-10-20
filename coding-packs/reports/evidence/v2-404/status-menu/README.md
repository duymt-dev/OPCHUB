# Commission status menus — source `cbf9eaa`

Twelve terminal logs, UTF-8/LF/ANSI-normalized and sensitive-key lines redacted.
No private env values or raw browser traces. `source-files.txt` lists four source
files in the pushed commit.

- `404-status-menu-focused.log`: initial six helper failures, unsupported
  jest-dom matcher; final `...focused-final.log` **6/6** with exact DOM checks.
- `404-status-menu-msw-build.log`: initial Testing Library `exact` type error;
  `...msw-build-final.log` and `...native-build.log`: both corrected builds pass.
- `404-status-menu-gates-final.log`: forced **22/22**, **828 units + 2 skips**;
  six new menu units included, not additional to that count.
- `404-status-menu-depcheck.log`: both graphs pass **1471/4045**, **680/2954**.
- `404-status-menu-e2e-{lint,typecheck}-final.log`: observed terminal exit 0.
- `404-status-menu-committed-msw.log`: **50/50**, 21 files, 1.7 minutes; two
  360/390 menu cases included. No native browser result is implied.
- `404-status-menu-committed-parity.log`, `parity-cbf9eaa.json`: all **22** rows
  verified on the same source, **17 pass/5 raw failures**. Nonzero exit retained.
- `metrics-{before,after}-{app,proto}.json`, `...metrics-after.log`: stabilized
  browser diagnostic geometry. At 390px, the app table grows **1676 → 1844px**,
  matching the prototype after restoring real terminal-row controls; first
  recorded-row/summary positions already matched. Diagnostic passes are not
  added to the fifty application browser tests.
- `screens/`: four inspected actual PNGs, historical `2a589cb` before and current
  `cbf9eaa` after. Fresh before geometry is on baseline `a5683d3` (same pre-fix UI).

Selected commissions improve **1.4513%/5.5311% → 1.2932%/2.4252%** at 1440/390.
The other twenty raw rows are unchanged. No masks, seed/count changes, threshold
relaxation or automatic deviation approval. Five raw failures, full inventory,
native browser/final seeded audits/UAT/report/P4 merge remain open.
