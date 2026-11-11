# Admin translation review (D-141)

- Scope: Admin UI only; API errors, email, CSV and user content retain their original contract.
- Source baseline: f7c1b2b8; current source has2660 string leaves in25 physical catalogs.
- English completion checkpoint: ec97a874, 2026-11-11; all25 raw English catalogs verified, not whole-TIP completion.
- Native-speaker reviewed: **false for every target locale**, including custom AntD Filipino/Lao dictionaries.
- AI-produced English now covers all25 physical catalogs /2660 source leaves, raw-contract tested against the complete explicit file list before fallback. This is catalog completeness, not a claim that all UI call sites or browser acceptance are complete.
- Provenance: the earlier checkpoint reused464 unambiguous exact-text matches from Portal English catalogs. The remaining English was translated directly from the unchanged Vietnamese source. No Portal app import exists at runtime. No missing key is filled with Vietnamese/TODO stand-ins.
- Other target bundles zh/id/th/ms/fil/km/lo/my: pending. Aliases en-SG and ms-BN share en/ms catalogs, not separate translations.
- Confidence: English moderate pending owner review; Khmer/Lao/Myanmar require special native-speaker attention when their catalogs are produced. Human review is not fabricated and does not replace technical gates.
- Font assets/provenance/licenses: pending; no font-delivery completion claim.

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

- vi: 25/25 files, 2660/2660 source string leaves present.
- en: 25/25 files, 2660/2660 source string leaves present;25 raw contract cases pass.
- zh: 0/25 files, 0/2660 source string leaves present.
- id: 0/25 files, 0/2660 source string leaves present.
- th: 0/25 files, 0/2660 source string leaves present.
- ms: 0/25 files, 0/2660 source string leaves present.
- fil: 0/25 files, 0/2660 source string leaves present.
- km: 0/25 files, 0/2660 source string leaves present.
- lo: 0/25 files, 0/2660 source string leaves present.
- my: 0/25 files, 0/2660 source string leaves present.

## Content boundaries / exact exceptions

- Six exact copied-text exceptions in the English raw checker: existing person-name examples at `bots.pf.namePh`, `marketing.mail.sampleName`, `settings/access.admins.drawer.namePh`, `settings/mail.mail.sampleName`; existing geographic time-zone label at `settings/core.general.tz.ict`; canonical bank-transfer example at `settings/finance.bank.syntaxValue` (D-123). No namespace-wide exemption.
- `settings/finance.renewal.actions` remains intentionally empty in both source and target, matching the legacy actions-column header. A nonempty source cannot become empty.
- Neutral English count labels (e.g. “Members: {n}”) preserve existing argument types and work for1/other without incorrectly appending a plural noun to1.
- Existing legacy policy strings remain catalog-compatible; they do not enable payouts. Current regional rules continue to state that Media Soft pays only Regional Directors and affiliate commission is reference-only. No rate or business rule changed.
- Event default description sent to the server remains Vietnamese; group-export headers/enum cells/bytes remain Vietnamese; the welcome-email frame previews the existing Vietnamese email even under English Admin chrome. Authored content stays raw. These are D-141 content exceptions, not untranslated GUI controls.
- New52 source labels:40 settings AI-call labels,4 moderation labels and8 client validation labels. Existing source strings were not rewritten. The original524 settings leaves and all2456 original legacy leaves have separate baseline hashes; new roots/keys are excluded explicitly, not by broad feature exemptions.
