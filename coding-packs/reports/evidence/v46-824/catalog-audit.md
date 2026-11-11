# TIP824 raw catalog readiness - Simplified Chinese raw-bundle checkpoint

**INCOMPLETE / FAIL.** File presence alone is not completion. Counts below are raw source-key presence before any Vietnamese fallback, not native review or proof of ICU validity.

| Bundle | Raw files | Required files | String leaves present | Missing string leaves |
|---|---:|---:|---:|---:|
| vi | 25 | 25 | 2660 | 0 |
| en | 25 | 25 | 2660 | 0 |
| zh | 25 | 25 | 2660 | 0 |
| id | 0 | 25 | 0 | 2660 |
| th | 0 | 25 | 0 | 2660 |
| ms | 0 | 25 | 0 | 2660 |
| fil | 0 | 25 | 0 | 2660 |
| km | 0 | 25 | 0 | 2660 |
| lo | 0 | 25 | 0 | 2660 |
| my | 0 | 25 | 0 | 2660 |

Required source tree:2660 string leaves. All original2456 legacy leaves are hash-protected; the original524 settings leaves retain their exact baseline hash. New52 labels are explicitly additive (40 settings.aiCalls,4 groups.mod,8 ui.errors). All25 English files are now explicitly checked against raw source keys/types/ICU/NFC/nonempty/no-copy contracts:25 passing cases, with six exact copied-text exceptions and one intentionally blank source header documented in REVIEW. Simplified Chinese now passes its own fixed25-file raw suite,10 Admin-context cases and6 canonical-copy cases. Other seven target bundles are not yet created. Runtime fallback does NOT count as a translation. Overall10-bundle readiness remains FAIL; the final mandatory all-bundle production gate is still pending.

Chinese provenance:692 exact-source Portal matches retained,1962 Admin-specific/context-reviewed leaves,6 canonical examples unchanged. Native-reviewed=false. A real-loader request regression covers Chinese and English plus all six physical settings parts; raw-file presence is not used as runtime proof. Overall10-bundle readiness remains FAIL.
