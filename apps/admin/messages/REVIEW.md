# Admin translation review (D-141)

## Scoped standard date/number data — 2026-11-12

Separate from UI translation completeness: standalone FormatJS DateTimeFormat8.0.3 and NumberFormat10.0.4 provide pinned CLDR49 data for km/lo/my, which the installed Chromium does not support natively for dates/numbers. All12 selector identities support native plural rules; the other9 support native dates/numbers. These are actual offline capability observations, not inferred from translated text.

The three scoped constructors/data are the same on SSR/client; no global Intl replacement or per-request default locale mutation. Explicit lazy package locale imports use their version-pinned registration buffers, with source/hash/license contracts. Only the exact historical Asia/Ho_Chi_Minh timezone record is extracted; not a fixed +07 approximation. The MIT notice is also distributed at public/licenses/formatjs-intl.txt. No remote polyfill/CDN/service. The authenticated layout prepares these resources before shell/pages; public auth has no date/currency display and does not evaluate/download unused locale-data assets. QueryClient/UiProvider/ToastProvider and auth/form instances are not keyed by locale.

Fixed tests cover decimal/grouping separators, Myanmar digits/explicit Latin override, VND without conversion, missing/negative/zero values, Gregorian Vietnam midnight/year/leap boundaries and the actual1900 historical offset, cold concurrent locale preparation, selected-script month/weekday names and existing font cmap coverage. Structured resource failures use existing selected-language loading/error/retry strings, not raw technical diagnostics; retry is explicit. Two exact source-audit exceptions are diagnostics only, with the absence of their raw error text in UI tested. Four remaining next-intl date consumers now use the same prepared Admin formatter; authored content/DTOs/exports/parsers/API values are untouched.

Actual built locale-data chunks are mapped and hashed separately for both modes; missing/duplicate/mixed-locale data fails the auditor. Browser evidence checks actual Lao dates/VND against independent Node Intl/raw DTOs, zero unused data payload on public auth, only selected Lao data responses with exact hashes and unchanged global constructor snapshots. This is not the original-baseline/per-route JS budget proof. Full performance and all-language controls/states remain required.

No UI-message leaves are added here:200/250 raw files/eight complete bundles remain. km/my Admin catalogs still missing; standard CLDR names are not substitutes for those translations. Native-speaker-reviewed=false remains unchanged for every Admin target locale; the licensed fonts/binaries and existing Vietnamese source text remain unchanged.

- Scope: Admin UI only; API errors, email, CSV and user content retain their original contract.
- Source baseline: f7c1b2b8; current source has2667 string leaves in25 physical catalogs.
- English completion checkpoint: ec97a874 (2608 leaves); additive AI/validation checkpoint9e962712 (2660 leaves), 2026-11-11. All25 raw English catalogs verified, not whole-TIP completion.
- Native-speaker reviewed: **false for every target locale**, including custom AntD Filipino/Lao dictionaries.
- AI-produced English now covers all25 physical catalogs /2667 source leaves, raw-contract tested against the complete explicit file list before fallback. This is catalog completeness, not a claim that all UI call sites or browser acceptance are complete.
- Provenance: the earlier checkpoint reused464 unambiguous exact-text matches from Portal English catalogs. The remaining English was translated directly from the unchanged Vietnamese source. No Portal app import exists at runtime. No missing key is filled with Vietnamese/TODO stand-ins.
- Simplified Chinese source checkpoint f1cca64b, 2026-11-11, covers25/25 physical files and2660/2660 leaves. Indonesian source checkpoint042dedaf, 2026-11-11, also covers25/25 files and2660/2660 leaves, raw-contract checked before fallback. Other target bundles th/fil/km/lo/my: pending. Malay now has a complete raw bundle as documented below. Aliases en-SG and ms-BN share en/ms catalogs, not separate translations.
- Confidence: English moderate pending owner review; Khmer/Lao/Myanmar require special native-speaker attention when their catalogs are produced. Human review is not fabricated and does not replace technical gates.
- Self-hosted font assets, licenses and reproducible build provenance are recorded below. Full translated-screen/visual/performance acceptance is still pending; font contracts alone do not complete this TIP.
- Auth/upload consumer checkpoint77484e3f uses existing catalog keys only: local error codes render in the live locale; raw API strings are never reverse-matched into translation keys. The owner-approved optional shared LoginPanel formatter is Admin-only; Portal defaults/callbacks/demo clearing remain unchanged and have fresh regression/build evidence. This adds no translation leaves or native-speaker approval.

## English terminology

| Source                 | English                | Meaning preserved                                   |
| ---------------------- | ---------------------- | --------------------------------------------------- |
| Thành viên             | Member                 | Member account, not administrator                   |
| Phí thành viên         | Membership fee         | VND fee, no exchange-rate conversion                |
| Nhóm cộng đồng         | Community group        | Group identity/name stays raw                       |
| Sự kiện                | Event                  | Event content/name stays raw                        |
| Dự án                  | Project                | Project content/name stays raw                      |
| Nhà đầu tư             | Investor               | Investor details stay raw                           |
| Affiliate              | Affiliate              | Referral/commission entity                          |
| Giám đốc Vùng          | Regional Director      | The only direct revenue-share recipient             |
| Hoa hồng               | Commission             | Affiliate commission remains reference-only         |
| Phần GĐ Vùng được chia | Regional revenue share | Stored financial snapshot, not recomputed           |
| Lời gọi AI             | AI call                | A logged provider invocation, not a chat message    |
| Kiểm duyệt             | Moderation             | Same permission/action keys and review workflow     |
| Dự phòng               | Fallback               | Existing provider fallback, no configuration change |

## Raw presence snapshot (not completion)

- vi/en/zh/id/ms/fil/th/lo:25/25 files and2667/2667 source string leaves each.
- km/my:0/25 files and0/2667 leaves each.
- Total physical presence200/250, not raw readiness PASS; missing files never count through runtime fallback.

## Content boundaries / exact exceptions

- Six exact copied-text exceptions in the English raw checker: existing person-name examples at `bots.pf.namePh`, `marketing.mail.sampleName`, `settings/access.admins.drawer.namePh`, `settings/mail.mail.sampleName`; existing geographic time-zone label at `settings/core.general.tz.ict`; canonical bank-transfer example at `settings/finance.bank.syntaxValue` (D-123). No namespace-wide exemption.
- `settings/finance.renewal.actions` remains intentionally empty in both source and target, matching the legacy actions-column header. A nonempty source cannot become empty.
- Neutral English count labels (e.g. “Members: {n}”) preserve existing argument types and work for1/other without incorrectly appending a plural noun to1.
- Existing legacy policy strings remain catalog-compatible; they do not enable payouts. Current regional rules continue to state that Media Soft pays only Regional Directors and affiliate commission is reference-only. No rate or business rule changed.
- Event default description sent to the server remains Vietnamese; group-export headers/enum cells/bytes remain Vietnamese; the welcome-email frame previews the existing Vietnamese email even under English Admin chrome. Authored content stays raw. These are D-141 content exceptions, not untranslated GUI controls.
- New52 source labels:40 settings AI-call labels,4 moderation labels and8 client validation labels. Existing source strings were not rewritten. The original524 settings leaves and all2456 original legacy leaves have separate baseline hashes; new roots/keys are excluded explicitly, not by broad feature exemptions.

## Self-hosted font provenance (D-37 / D-141)

Pinned upstream Google Fonts commit `5bb28733cec313b63fbd415b574b5ae35c8aa8b8`. No runtime Google Fonts request or Portal import. Build-only external venv: `fonttools==4.68.0`, `Brotli==1.2.1`; neither is an application dependency. Reproduce with `python infra/scripts/build-admin-fonts.py --cache <external-cache>` after installing these exact tools. Two independent builds produced identical7 binary hashes and cmap/shaping receipts. See `src/i18n/font-assets.json` and the TIP evidence `fonts.log`. Binary hashes are integrity data, never completion Git SHAs.

| Upstream family | Pinned source                                                                                                                                              | Unchanged license                              |
| --------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------- |
| NotoSans        | [Source](https://raw.githubusercontent.com/google/fonts/5bb28733cec313b63fbd415b574b5ae35c8aa8b8/ofl/notosans/NotoSans%5Bwdth%2Cwght%5D.ttf)               | [OFL](../public/fonts/OFL-NotoSans.txt)        |
| NotoSansSC      | [Source](https://raw.githubusercontent.com/google/fonts/5bb28733cec313b63fbd415b574b5ae35c8aa8b8/ofl/notosanssc/NotoSansSC%5Bwght%5D.ttf)                  | [OFL](../public/fonts/OFL-NotoSansSC.txt)      |
| NotoSansThai    | [Source](https://raw.githubusercontent.com/google/fonts/5bb28733cec313b63fbd415b574b5ae35c8aa8b8/ofl/notosansthai/NotoSansThai%5Bwdth%2Cwght%5D.ttf)       | [OFL](../public/fonts/OFL-NotoSansThai.txt)    |
| NotoSansKhmer   | [Source](https://raw.githubusercontent.com/google/fonts/5bb28733cec313b63fbd415b574b5ae35c8aa8b8/ofl/notosanskhmer/NotoSansKhmer%5Bwdth%2Cwght%5D.ttf)     | [OFL](../public/fonts/OFL-NotoSansKhmer.txt)   |
| NotoSansLao     | [Source](https://raw.githubusercontent.com/google/fonts/5bb28733cec313b63fbd415b574b5ae35c8aa8b8/ofl/notosanslao/NotoSansLao%5Bwdth%2Cwght%5D.ttf)         | [OFL](../public/fonts/OFL-NotoSansLao.txt)     |
| NotoSansMyanmar | [Source](https://raw.githubusercontent.com/google/fonts/5bb28733cec313b63fbd415b574b5ae35c8aa8b8/ofl/notosansmyanmar/NotoSansMyanmar%5Bwdth%2Cwght%5D.ttf) | [OFL](../public/fonts/OFL-NotoSansMyanmar.txt) |

| Self-hosted file              |   Bytes | Actual cmap entries |
| ----------------------------- | ------: | ------------------: |
| NotoSans-Regular.woff2        |   84076 |                1781 |
| NotoSansSC-Regular.woff2      | 1081440 |                7719 |
| NotoSansThai-Regular.woff2    |   10636 |                 121 |
| NotoSansKhmer-Regular.woff2   |   18740 |                 180 |
| NotoSansLao-Regular.woff2     |   10820 |                 117 |
| NotoSansMyanmar-Regular.woff2 |   43372 |                 257 |
| LanguageMenu-Regular.woff2    |    9724 |                  67 |

- Static regular400 instances, width100 when supported. Heavier GUI weights use browser synthesis; these files are not claimed to contain nine real weight masters. Original outlines/shaping tables are retained after subsetting; hinting programs are removed before cross-family merging.
- Latin is the primary face, with a single selected SC/Thai/Khmer/Lao/Myanmar fallback. CSS URLs are compiled into hashed/basePath-aware Next assets. Registering twelve faces for seven binaries does not download them all; the browser loads only referenced families. The selector alone uses a9.7KB merged font covering all twelve unchanged native names/countries, avoiding five full-script downloads merely to open the menu.
- The Latin derivative adds only missing U+2000..27FF punctuation/arrows/checkmarks from licensed Noto Sans SC and preserves the original Latin line metrics. The selector derivative merges subsets of the six listed sources. Both are named OPCHUB, not the reserved name Source. All original copyright/OFL files are packaged byte-for-byte, including upstream whitespace.
- SC includes the GB2312 common repertoire, script punctuation, selector glyphs and all glyphs from the actual Chinese catalog when available. Thai/Khmer/Lao/Myanmar include their Unicode blocks plus current catalog/selector glyphs. Re-run the tool and extend glyph assertions when the remaining catalogs are added. No claim of glyph completeness for absent catalogs.
- Current unit glyph scope is the present vi/en/zh/id/ms catalogs plus twelve native selector names. Platform emoji, arbitrary authored text and monospace code fields are not rewritten into translations. Font-only browser audits use CDP to verify actual custom fonts rather than relying on installed fonts; this does not replace full-screen translated screenshots, parity approval or performance measurement. The Admin auth root has a zero-box marker to override its shared Be Vietnam Pro/system stack without modifying Portal/shared UI.

- Menu CSS splits the same binary into six Unicode-range faces with the original per-script ascent/descent metrics, so Burmese line metrics do not enlarge every Latin country label. A bounded, scrollable Admin-only popover keeps all choices reachable on short/mobile viewports.

## Simplified Chinese terminology and review (AI-produced, native-reviewed=false)

Provenance:692 current leaves retain unambiguous exact-Vietnamese-source matches from Portal Chinese;1962 leaves are Admin-specific translations/context corrections, and6 canonical examples remain byte-identical. No runtime Portal import. All2660 source leaves are present. Reuse was reviewed in Admin context: financial reports are not abuse reports; email body/activity content are not bank-transfer notes; an open need is not a pending moderation item.37 path-specific corrections include these distinctions, Chinese GUI badges/repository visibility and a representative without an added legal-representative claim. Source Vietnamese, enum/payload values, real people/companies/custom roles, bank references, CSV and actual emails remain unchanged. Legacy unused policy prose is catalog-compatible, not new payout behavior.

| Vietnamese / concept | Simplified Chinese  | Boundary                                          |
| -------------------- | ------------------- | ------------------------------------------------- |
| Thành viên           | 会员                | Member account, not administrator                 |
| Phí thành viên       | 会员费              | VND, no exchange conversion                       |
| Nhóm cộng đồng       | 社群群组 / 社区群组 | Group names remain raw                            |
| Affiliate            | 推广员              | Reference commission, no direct Media Soft payout |
| Giám đốc Vùng        | 区域总监            | Only direct regional share recipient              |
| Hoa hồng             | 佣金                | Existing financial rules retained                 |
| Báo cáo B1/B2/B3     | 报表                | Distinct from 举报, a member abuse report         |
| Nội dung email       | 正文                | Distinct from 转账附言                            |
| Kiểm duyệt           | 审核                | Same permission/action keys                       |
| Persona              | 虚拟角色            | Persona bio/name and API values remain raw        |
| Dự phòng             | 备用                | Existing provider fallback                        |
| Nhu cầu đang mở      | 开放需求            | Not a pending moderation queue                    |

Chinese confidence: moderate; terminology and ICU reviewed by the coding agent, not a native speaker. Human review remains false. Current font coverage includes actual vi/en/zh/id catalogs and12 native selector names; other six target catalogs still need translations and glyph checks. The SC subset is regenerated from actual Chinese text in addition to its GB2312 repertoire.

## Indonesian terminology and review (AI-produced, native-reviewed=false)

2026-11-11, source baseline f7c1b2b8 and unchanged2660-leaf source tree.25 raw files are complete.728 leaves retain unambiguous exact-Vietnamese-source Portal Indonesian matches;1926 leaves are translated or context-corrected for Admin, and6 canonical examples remain byte-identical under the same path-specific policy as English/Chinese.23 context corrections distinguish financial reports from reporting actions, month-end payouts, event registration status, audit categories and repository visibility. No runtime Portal import or translation service. Raw content, canonical values, CSV/email bytes and financial rules are not translated or changed. Legacy unused policy prose stays catalog-compatible and does not create new payout behavior.

| Vietnamese / concept     | Indonesian                    | Boundary                                               |
| ------------------------ | ----------------------------- | ------------------------------------------------------ |
| Thành viên               | Anggota                       | Member account, not administrator                      |
| Phí thành viên           | Biaya keanggotaan             | VND, no exchange conversion                            |
| Nhóm cộng đồng           | Grup komunitas                | Authored group names stay raw                          |
| Affiliate                | Afiliasi                      | Reference-only commission; no direct Media Soft payout |
| Giám đốc Vùng            | Direktur Wilayah              | Only direct regional share recipient                   |
| Hoa hồng                 | Komisi                        | Existing financial rules retained                      |
| Báo cáo B1/B2/B3         | Laporan                       | Distinct from the action Laporkan                      |
| Báo cáo vi phạm          | Laporan anggota               | Moderation source, not financial reports               |
| Nội dung email           | Isi email                     | Bank reference remains Berita transfer                 |
| Nhật ký / nhóm hành động | Log aktivitas / Kategori      | Audit taxonomy, not a community group                  |
| Đang mở / đăng ký        | Terbuka / Pendaftaran terbuka | No pending-review reinterpretation                     |
| Persona                  | Persona                       | Names/bios and API values remain raw                   |
| Dự phòng                 | Cadangan                      | Existing provider fallback                             |

Indonesian confidence: moderate; AI translation and context/ICU review by the coding agent, not a native speaker. Native-reviewed=false. All current Indonesian glyphs fit the existing licensed Latin asset, checked against its actual cmap; no additional font download or binary change is needed.

## Additive client-validation labels

The domain client-validation follow-up adds six ui.errors leaves to each present vi/en/zh/id catalog: inclusive numeric bounds, whole-number validation, bank account digits, bank holder letters and notification-device fallback. Current source and each present target have2666 leaves in25 files. Earlier2660-leaf checkpoint counts above are historical; retained Portal matches and canonical-copy counts are unchanged. The six new target translations are AI-produced directly for Admin, native-reviewed=false. Chinese now has1968 Admin-specific/context-corrected leaves plus692 retained matches and6 canonical examples; Indonesian1932 plus728 and6. Other six target bundles and full acceptance remain pending.

## Malay terminology and review (AI-produced, native-reviewed=false)

All25 raw files /2666 source leaves are present. Provenance:707 final leaves retain unambiguous exact-Vietnamese-source Portal Malay matches;1953 are adapted from the already-reviewed Admin Indonesian catalogs and corrected for Malay terminology/Admin context;6 canonical examples remain byte-identical. This is an AI adaptation with source-English context review and Vietnamese contract validation, not a native-speaker translation or native approval. All1683 unique non-reused draft pairs were reviewed;138 received direct wording corrections, with41 exact-English terminology rules and17 path-specific rules.34 reused Portal leaves were corrected where the Admin meaning differs, including noun reports versus reporting actions, province labels, repository visibility and the full Admin Dashboard/User Portal labels. No runtime Portal import or translation-service dependency.

Terminology cross-check: the official DBP dictionary lists [provinsi](https://prpm.dbp.gov.my/Cari1?d=73980&keyword=provinsi) and defines [pelaku](https://prpm.dbp.gov.my/Cari1?d=382696&keyword=pelaku) as someone performing an action. Their application to the province/region distinction and audit actor is the agent's contextual translation choice, not dictionary certification of this UI or native-speaker approval.

| Concept                        | Malay                               | Preserved boundary                             |
| ------------------------------ | ----------------------------------- | ---------------------------------------------- |
| Member / membership            | Ahli / keahlian                     | Not expert or administrator                    |
| Expert / expertise             | Pakar / kepakaran                   | Not ordinary membership                        |
| Membership fee / cost          | Yuran keahlian / kos                | Integer VND, no conversion                     |
| Regional Director              | Pengarah Wilayah                    | The sole direct revenue-share payee            |
| Province / region              | Provinsi / wilayah                  | Keep34 provinces distinct from3 regions        |
| Commission / regional share    | Komisen / bahagian Pengarah Wilayah | Affiliate figures remain reference-only        |
| Budget / estimate              | Bajet / anggaran                    | AI budget is not an estimated amount           |
| Reports / report action        | Laporan / laporkan                  | Financial reports are not abuse-report buttons |
| Actor                          | Pelaku                              | Audit actor is not an entrepreneur             |
| Bank transfer reference        | Rujukan pindahan                    | OPCHUB reference syntax unchanged              |
| Email body                     | Kandungan e-mel                     | Actual email bodies/previews remain raw        |
| Basic information / policy     | Maklumat asas / dasar               | Distinct administrative meanings               |
| Public / private repository    | Awam / persendirian                 | Enum values and URLs unchanged                 |
| Whole number / account digits  | Bilangan bulat / digit akaun        | Same validators and payloads                   |
| Sign in / incoming transaction | Log masuk / transaksi masuk         | Banking is not an authentication operation     |
| Settings / roles / permissions | Tetapan / peranan / kebenaran       | Same permission keys and access checks         |

Malay uses the existing licensed Latin font; all current catalog glyphs are checked against its actual cmap. Selection ms-BN loads the same ms messages while preserving the selected country/locale identity. No new font binary or license is needed. Confidence is moderate pending owner/native review. The final five bundles th/fil/km/lo/my, all-language raw gate and full screen/native/performance acceptance are still required. Legacy unused policy prose remains source-compatible and does not introduce payout behavior.

## Additive custom-provider label and source-number audit

The following source checkpoint adds one settings.ai.customProviderLabel to every present bundle. Current vi/en/zh/id/ms each have25 files /2667 leaves. The Vietnamese custom-provider label is exactly the previous shared catalog name; other provider brands and all provider/model IDs stay raw. English, Chinese, Indonesian and Malay labels are AI-produced directly for Admin, native-reviewed=false. Current provenance totals: Chinese692 retained Portal matches +1969 Admin-specific/context-corrected +6 canonical examples; Indonesian728 +1933 +6; Malay707 +1954 +6. This one direct Malay translation is not counted as an Indonesian adaptation. Earlier checkpoint counts above are historical. Original2456 legacy leaves and524 settings leaves remain hash-protected and unchanged.

The source audit traverses all production Admin TS/TSX outside named test/mock/declaration fixtures, with TypeScript semantic validation. Exact exception registries bind file/kind/literal/reason and actual enum values; new/stale/changed exceptions fail. They preserve content, brands, IDs, protocol/CSS/Intl options, Vietnamese-only formatter branches and finite canonical projections, not entire features. Its static PASS is not proof of every runtime/interprocedural string, browser rendering, native API acceptance or translation quality. Known bot tone/hour presets and age digits are now display-projected; custom tones/schedules, prompts and submitted values remain unchanged. Five target bundles and full acceptance remain pending.

## Historical Filipino staged checkpoint c12b477d —12/25 files

This is **not a complete Filipino bundle**. The explicit staged files are affiliate, auth, bot-options, common, investors, needs, meta, overview, reports, requests, stores and ui. They contain941/2667 source leaves. Remaining13 files (bots, events, fees, groups, marketing, members, projects and all six settings parts) are absent, not filled with copied Vietnamese/English/TODO. Runtime fallback for those missing files does not count as translation readiness. Whole10-bundle readiness remains FAIL; four other target bundles th/km/lo/my remain absent.

Provenance for these941 leaves:277 unambiguous exact-Vietnamese-source Portal Filipino matches retained;664 directly translated or Admin-context-corrected leaves. The direct draft reviews cover537 distinct Vietnamese/English context pairs used in624 leaves;40 reused Portal leaves were corrected for Admin context/terminology. No Portal runtime import or external translation-service dependency. Review is AI contextual review against the unchanged Vietnamese source and English context, not a native speaker or certified translation. Filipino commonly used UI loans (password, email, link, Admin, two-factor authentication) and product/protocol/currency identifiers remain appropriate; this is not wholesale English copy.

| Concept                                | Filipino                                                            | Boundary                                                                    |
| -------------------------------------- | ------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Member / membership fee                | Miyembro / Bayad sa pagiging miyembro                               | Integer VND and eligibility unchanged                                       |
| Regional Director                      | Direktor ng Rehiyon                                                 | Only recipient of Media Soft revenue shares; no direct affiliate payout     |
| North / Central / South                | Hilaga / Gitna / Timog                                              | Canonical region/province values untouched                                  |
| Commission / revenue share             | Komisyon / Bahagi sa kita                                           | Legacy unused policy copy remains source-compatible, no behavior introduced |
| Month-end payout                       | Pagbabayad sa katapusan ng buwan                                    | Timing is not dropped, unlike the reused generic pending label              |
| Reports (noun)                         | Mga Ulat                                                            | Not the reporting-abuse action I-report                                     |
| Investor / investment fund             | Mamumuhunan / Pondong pamumuhunan                                   | Actual identities and investment expressions remain raw                     |
| Province / region                      | Lalawigan / Rehiyon                                                 | Not conflated geographical units                                            |
| Internal discussion                    | Panloob na talakayan                                                | Actual comments/email/notifications remain raw                              |
| Personal / business / fundraising plan | Personal na Plano / Planong Pangnegosyo / Planong Paglikom ng Pondo | Same plan IDs, amounts and payloads                                         |
| Enabled / not enabled                  | Pinagana / Hindi pa pinagana                                        | Activation is distinguished from activity                                   |
| Bold / italic / underline              | Makapal / Pahilis / Salungguhit                                     | Only toolbar labels, not editor content                                     |

The staged raw unit inventory explicitly names all12 files and checks exact keys/types/ICU/nonempty/NFC/no-copied-Vietnamese before fallback. Thirty fixed Admin-context examples protect reports, month-end payments, regions, security and monetary terminology. All941 staged string leaves are checked against the actual existing Latin font cmap; no font binary/license change. These technical checks do not certify the missing13 files, all-language controls, whole Filipino runtime/body/browser performance, or native-human review. The separate font browser audit asserts the actual Filipino login heading/title only, not full Filipino acceptance. The final mandatory fixed10-bundle production gate remains pending until all target files are translated.

## Complete Filipino raw bundle — AI-produced, native-reviewed=false

All25 explicit physical files /2667 source leaves are now present. This supersedes the12-file staged inventory above, not its Git evidence. Added the remaining13 files/1726 leaves without touching the earlier12 catalogs. Provenance across the complete bundle:531 unambiguous exact-Vietnamese-source Portal matches retained,2130 direct/Admin-context-corrected leaves (including the original intentionally blank actions header),6 canonical examples unchanged.1726 unique direct Vietnamese/English draft pairs cover2068 leaves;61 Portal leaves were context-corrected in total (40 earlier +21 new). Actual Vietnamese/English context, numeric limits, ICU argument names/tags and raw-contract examples were reviewed; not native-speaker review. No runtime Portal import, translation service, new dependency, canonical payload, source Vietnamese prose, email/export/API error change.

The expanded glossary retains the earlier terminology. Conversation review = Naghihintay ng pagsusuri, distinct from approval; event open = Bukas ang pagpaparehistro; attendee list = Listahan ng mga dadalo; moderation reports = Mga report ng miyembro, not the noun Mga Ulat used for analytics; audit category = Kategorya, not Grupo; audit actor = Gumawa ng aksyon; email body = Nilalaman ng email, while actual authored email bodies remain raw; household business = Negosyong sambahayan; repository public/private = Pampubliko/Pribado. Provider brands/model IDs, OTP/SMTP/PWA protocols, currency units and product identifiers remain appropriate raw technical identifiers. Canonical examples retain the existing proper names, time-zone geography and OPCHUB transfer syntax. Older unused policy statements stay source-compatible and do not introduce business behavior.

Fixed25-file raw tests plus50 Admin-context cases,6 canonical-copy cases and one all2667-leaf Latin-cmap check pass (82). Request configuration covers actual Filipino auth/Profile/Overview/reports and all six merged settings domains without a fallback warning. The existing full font suite now also explicitly requires25 Filipino files. The installed Vitest5 fsModuleCache retained a pre-Filipino dynamic-import map: changing only a diagnostic comment temporarily made the same request test pass, restoring the exact source reproduced failure; documented vitest --clearCache then made the unchanged loader and assertions pass. The diagnostic edit/probes were removed; no production-loader change or assertion/timeout/skip workaround. Only disposable test caches were cleared, never database data/services.

Four bundles th/km/lo/my, the final fixed10-bundle production gate and full state/all-language/native/control/visual/performance acceptance remain open. A complete raw bundle is not whole-TIP completion or a native-human translation approval. Existing licensed Latin font covers all Filipino glyphs; no binary/license regeneration.

## Complete Thai raw/auth checkpoint — 2026-11-11

All25 explicit catalogs/2667 leaves, including all6 settings parts, now exist.693 unambiguous exact-source Portal Thai matches retained;1968 directly translated/Admin-context-corrected leaves (including1 original blank actions header);6 canonical examples preserved.1693 distinct Vietnamese/English direct draft pairs were produced across the initial12 and remaining13 files, with exact-pair reuse across domains.37 reused Portal leaves were corrected after Admin-context review. Native-speaker-reviewed=false. Raw/font/request tests are not native-human approval or whole-TIP acceptance. No Vietnamese/English/TODO filler catalog was created, and fallback never counts as translation.

| Source concept                  | Thai                                 | Context                                                     |
| ------------------------------- | ------------------------------------ | ----------------------------------------------------------- |
| Member / Membership fee         | สมาชิก / ค่าสมาชิก                   | Raw integer VND, no conversion                              |
| Community group / Project       | กลุ่มชุมชน / โครงการ                 | Authored names remain raw                                   |
| Investor / Investment fund      | นักลงทุน / กองทุนลงทุน               | Do not narrow all funds to mutual funds                     |
| Affiliate                       | แอฟฟิลิเอต                           | Referral entity, distinct from general partners พันธมิตร    |
| Regional Director               | ผู้อำนวยการภูมิภาค                   | Only direct revenue-share recipient                         |
| Commission                      | คอมมิชชัน / ค่าคอมมิชชัน             | Legacy/reference labels, not a changed payout policy        |
| Month-end payout pending        | รอจ่ายเมื่อสิ้นเดือน                 | Preserve timing                                             |
| Administrator / Moderator       | ผู้ดูแลระบบ / ผู้ดูแลเนื้อหา         | Display projections, never permission keys                  |
| User Portal / Admin Dashboard   | พอร์ทัลสมาชิก / แดชบอร์ดผู้ดูแล      | Keep destinations distinct                                  |
| Clear / Delete                  | ล้าง / ลบ                            | Clearing a filter does not delete a record                  |
| Enabled / Not enabled           | เปิดใช้งานแล้ว / ยังไม่เปิดใช้งาน    | Preserve polarity                                           |
| Paid / Expired and unpaid       | ชำระแล้ว / หมดอายุและยังไม่ชำระ      | Conversion denominator unchanged                            |
| Internal discussion             | การสนทนาภายใน                        | Admin-only notes                                            |
| Province / Region               | จังหวัด / ภูมิภาค                    | Canonical province data stays raw                           |
| Persona / Script                | บุคลิกจำลอง / สคริปต์                | Bot roles and dialogue, not member identities               |
| Pending review                  | รอตรวจสอบ                            | Do not imply approval has already occurred                  |
| Email body / Transfer reference | เนื้อหาอีเมล / ข้อความอ้างอิงการโอน  | Do not reuse ambiguous Vietnamese “Nội dung” across domains |
| Attendee list / Bullet list     | รายชื่อผู้เข้าร่วม / รายการสัญลักษณ์ | Context must distinguish list types                         |
| Public / Private                | สาธารณะ / ส่วนตัว                    | Preserve repository/visibility enum values                  |
| Fallback / AI call log          | สำรอง / บันทึกการเรียก AI            | Display only, same model/provider IDs                       |

Review corrections to37 Portal-reused leaves cover affiliate/reference roles and network names, month-end timing, customer count phrasing, proper copyright brand, Thai auth destinations and imperative password hint, investor fund specificity, consistent project labels, review-pending states, attendee lists, email body versus transfer reference, audit category/content, non-destructive Clear and canonical URL labels. Every retained reused translation was checked in its Admin context, not copied by key alone. All legacy VI business wording is retained as-is in source; translation does not resolve old policy wording or change payout/approval behavior. Canonical person names, OPCHUB transfer example, URLs/emails/provider IDs, blank actions header and timezone names are preserved.

83 fixed Thai cases =25 raw shape/key/ICU/NFC/no-copy +50 context +6 canonical +1 all2667-leaf English-filler/Thai-script check (53 exact neutral examples) +1 full Thai/Latin cmap check. Actual request loading additionally checks auth/Profile/Overview/reports and all6 merged settings parts without fallback; the34 full font/asset tests now include all25 Thai files. Existing7 font binaries/six OFLs are unchanged. The known Vitest dynamic-import cache is cleared with documented --clearCache when adding this new bundle; production loader logic is unchanged.

Whole10-bundle inventory remains incomplete:175/250 files; km/lo/my are absent. Actual Thai browser scope must be stated separately: auth heading/title and Overview/Profile/Settings1440/390, not all controls/states/auth flows or owner/native-human approval. Remaining full English/all-language/native/value/visual/performance acceptance is still required by the original TIP.

## Complete Lao raw checkpoint — 2026-11-11

All25 explicit files/2667 leaves, including all6 settings parts, now exist.667 unambiguous exact-Vietnamese-source Portal Lao matches retained,1993 directly translated/Admin-context-corrected leaves,6 canonical examples and1 original blank actions header.1701 distinct Vietnamese/English direct draft pairs;28 Portal-reused leaves corrected in Admin context. This is AI translation and agent context review, **native-speaker-reviewed=false**. No runtime Portal import, external translation service, dependency, raw API value, source Vietnamese/Portal/shared logic, font binary or license change.

| Source concept                  | Lao                                 | Boundary                                            |
| ------------------------------- | ----------------------------------- | --------------------------------------------------- |
| Member / Membership fee         | ສະມາຊິກ / ຄ່າສະມາຊິກ                | Raw VND, no currency conversion                     |
| Project / Investor              | ໂຄງການ / ນັກລົງທຶນ                  | Authored names remain raw                           |
| Investment fund                 | ກອງທຶນລົງທຶນ                        | Not limited to mutual funds                         |
| Affiliate / General partner     | ຜູ້ແນະນຳ / ຄູ່ຮ່ວມງານ               | Distinct referral and business roles                |
| Regional Director               | ຜູ້ອຳນວຍການພາກພື້ນ                  | Only direct revenue-share recipient                 |
| Commission                      | ຄ່ານາຍໜ້າ                           | Existing reference/policy wording, no payout change |
| Pending month-end payout        | ລໍຖ້າຈ່າຍໃນທ້າຍເດືອນ                | Preserve timing                                     |
| Administrator / Moderator       | ຜູ້ດູແລລະບົບ / ຜູ້ດູແລເນື້ອຫາ       | Never permission keys                               |
| User Portal / Admin Dashboard   | ພອດທັລສະມາຊິກ / ແດຊບອດຜູ້ດູແລ       | Keep destinations distinct                          |
| Enabled / Not enabled           | ເປີດໃຊ້ແລ້ວ / ຍັງບໍ່ເປີດໃຊ້         | Preserve polarity                                   |
| Pending review                  | ລໍຖ້າກວດ                            | Not approval already granted                        |
| Clear / Delete                  | ລ້າງ / ລຶບ                          | Filter clearing is not deletion                     |
| Email body / Transfer reference | ເນື້ອຫາອີເມວ / ຂໍ້ຄວາມອ້າງອີງການໂອນ | Context-specific content                            |
| Attendee list / Bullet list     | ລາຍຊື່ຜູ້ເຂົ້າຮ່ວມ / ລາຍການແບບຈຸດ   | Different list types                                |
| Province / Region               | ແຂວງ / ພາກພື້ນ                      | Canonical geography remains raw                     |

All356 distinct retained-candidate Portal source/English/translation groups were checked for Admin context. Corrections include affiliate terminology/network, consistent director label, month-end timing, pending-review meaning, attendee list, copyright brand, auth destinations, imperative password hint, visibility, audit category, non-destructive Clear, Undo and bullet-list labels. Direct drafts preserve numeric limits/ICU variables and source policy wording; translation does not resolve legacy business inconsistencies or enable direct affiliate payouts. Six exact canonical examples, existing URLs/emails/provider IDs and blank header remain unchanged.

59 fixed Lao cases =25 raw shape/key/ICU/NFC/no-copy +26 reviewed-context +6 canonical +1 all2667-leaf English-filler/Lao-script check with53 exact neutral exceptions +1 complete Latin/Lao cmap check. Request configuration checks real Lao domains and all6 merged settings parts without fallback warnings; full font suite now35 cases. Existing licensed Lao font covers all actual catalog characters without regeneration. Documented Vitest --clearCache cleared disposable test caches for the newly added import directory; production loader is unchanged. These checks do not constitute native-human approval or full browser/state/performance acceptance.

Current inventory200/250: km/my remain absent. The original ten-bundle gate and all16 ACs remain required; Lao actual browser evidence is reported separately, never inferred from raw tests.
