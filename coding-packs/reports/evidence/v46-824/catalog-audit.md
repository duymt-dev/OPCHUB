# TIP824 raw catalog readiness - complete Filipino raw checkpoint

**INCOMPLETE / FAIL.** File presence alone is not completion. Counts below are raw source-key presence before any Vietnamese fallback, not native review or proof of ICU validity.

| Bundle | Raw files | Required files | String leaves present | Missing string leaves |
|---|---:|---:|---:|---:|
| vi | 25 | 25 | 2667 | 0 |
| en | 25 | 25 | 2667 | 0 |
| zh | 25 | 25 | 2667 | 0 |
| id | 25 | 25 | 2667 | 0 |
| th | 0 | 25 | 0 | 2667 |
| ms | 25 | 25 | 2667 | 0 |
| fil | 25 | 25 | 2667 | 0 |
| km | 0 | 25 | 0 | 2667 |
| lo | 0 | 25 | 0 | 2667 |
| my | 0 | 25 | 0 | 2667 |

Required source tree:2667 string leaves. All original2456 legacy leaves are hash-protected; the original524 settings leaves retain their exact baseline hash. The earlier52 labels are explicitly additive (40 settings.aiCalls,4 groups.mod,8 ui.errors). A further6 ui.errors labels cover numeric/bank/device validation; one settings.ai.customProviderLabel is now added in all five present bundles. Original source leaves are unchanged. All25 English files are explicitly checked against raw source keys/types/ICU/NFC/nonempty/no-copy contracts:25 passing cases, with six exact copied-text exceptions and one intentionally blank source header documented in REVIEW. Simplified Chinese has a fixed25-file raw suite,10 Admin-context cases and6 canonical-copy cases. Indonesian has a fixed25-file raw suite,14 Admin-context cases and6 canonical-copy cases. Filipino now has all25 files/2667 leaves. Four target bundles remain absent. Runtime fallback does NOT count as a translation.150/250 files present is not full acceptance. Overall10-bundle readiness remains FAIL; the final mandatory all-bundle production gate is still pending.

Chinese provenance:692 exact-source Portal matches retained,1969 Admin-specific/context-reviewed leaves,6 canonical examples unchanged. Indonesian:728 retained matches,1933 translated/context-corrected leaves,6 canonical examples. Native-reviewed=false for every target. Real-loader request regressions cover English, Chinese, Indonesian and Malay plus all six physical settings parts; raw-file presence is not used as runtime proof. Overall10-bundle readiness remains FAIL.

Malay:707 final leaves retain unambiguous exact-source Portal Malay matches,1953 are adapted from the reviewed Admin Indonesian catalogs with Malay/context corrections and1 new custom-provider label is translated directly for Admin,6 canonical examples remain exact.54 fixed raw/context/canonical cases, actual ms/ms-BN request loading without fallback and32 current glyph/contract units pass (focused96 total).34 retained Portal leaves corrected for Admin context. Native-reviewed=false; the official DBP term cross-check in REVIEW is not native approval or certification of this UI. Filipino raw contracts pass; th/km/lo/my remain absent; the final mandatory10-bundle gate is still pending.


Filipino staged provenance:277 exact-source Portal matches retained +664 directly translated/context-corrected leaves =941. Includes40 context-corrected Portal leaves and537 direct distinct draft pairs across624 leaves.43 fixed tests (12 raw files,30 Admin-context cases,1 actual Latin cmap check) validate the stated subset only. Remaining files: bots/events/fees/groups/marketing/members/projects/settings core/access/mail/audit/finance/ai. No fallback/placeholder is counted. Native-reviewed=false.


Latest sourcec0b97b51: complete Filipino25-file raw inventory/2667 leaves,82 cases (25 raw +50 Admin-context +6 canonical +1 full Latin-cmap), request loading of actual domains/all6 settings parts without fallback,33 full font/contract units; focused126 total. Complete provenance531 retained Portal matches +2130 direct/context-corrected leaves (includes1 intentionally blank header) +6 canonical examples.1726 unique direct pairs cover2068 leaves;61 Portal-context corrections. Native-reviewed=false. Six authenticated Overview/Profile/Settings browser cases pass per mode,12 unmasked Filipino images; real desktop sidebar label/badge clipping found on visual review remains a known AC15 FAIL, not hidden by the no-page-overflow check. Whole10-bundle readiness is still FAIL because th/km/lo/my are missing.


## Sidebar visual finding supersession (raw inventory unchanged)

Admin-only sidebar correction — source d6efb178 (2026-11-11). Original Filipino fees label extended to283.9375px while its link ended at231px desktop /255px mobile, despite a passing page-width assertion. RootLayout now imports a10-line Admin-only navigation stylesheet: min-width0, normal whitespace/overflow-wrap on labels and nonshrinking badges. Shared/Portal production, copy, fonts, colors, sidebar widths248/76/272 and icon19 remain unchanged.

Actual same-source sidebar7/7 MSW +7/7 approved private-native cases: vi/en/fil at1440/390, every actual text Range line and badge within its link, label/badge separation, full real badges, VI retains single-line layout, Filipino wraps. Real collapse/expand, visible icons/hidden mini labels, unchanged hrefs, focus+Enter navigation and mobile drawer close pass. The seventh case intentionally restores nowrap only on the actual long Filipino label, requires the internal-bounds assertion to fail while document width still passes, then removes the fixture and passes again. This is2 explicitly injected negative cases across modes, not extra user flows. Four unmasked expanded-sidebar images fil-sidebar-{msw,server}-{1440,390}.png and regenerated12 Filipino/12 English images; representative final native Profile1440 and expanded sidebars1440/390 were visually inspected. No owner/native-human approval.

Fresh full regression chain:68 loaded English +10 navigation/probe +6 Filipino +24 font +8 public-error cases per mode, plus7 sidebar =123/mode /246 total. The20 navigation cases include4 explicitly synthetic covered-modal selector-handler probes, not pointer-accessibility evidence. Fonts/public errors have distinct limited scopes. All authenticated subsets require real login200/read-only guard; native listener/approved launch isolation revalidated, no seed/reset/SQL/business writes/original PG5432/testDB/service change; login/refresh sessions only.

Root2910 passed +2 existing skips, Admin1192/180 files fresh,5 suites cached; lint/typecheck8 tasks/6 cached, depcheck2784modules/8543deps plus server1260/5995. Both Admin production builds pass; unchanged Portal build remains historical77484e3f, no fresh Portal build claimed.828 unique manifest paths, no undeclared changed source, all source caps/UTF8/log scans pass. Source AST584 files/301 retained findings/291 exceptions/zero unreviewed, corpus071a0c2dac01e16a2f8ac522f73e62f82dc4b7694d7e421078a3f6f20fd7f54f; CSS/catalogs/browser proof are outside that fingerprint.

Specific sidebar clipping finding is corrected and regression-verified, NOT a whole AC15/TIP PASS. vi/en/zh/id/ms/fil each25files/2667leaves; th/km/lo/my absent,150/250 files and final10-bundle raw gate still FAIL. All-language/state/chat/auth/control/value/API/export/native/VI/visual/performance and named regressions remain open. Owner has now approved an optional AppShell/Sidebar badge-number presentation callback with unchanged raw counts/navigation/default Portal; approved, not yet implemented in this source checkpoint. Entire TIP remains IN PROGRESS / NOT DONE / NOT READY TO MERGE.
