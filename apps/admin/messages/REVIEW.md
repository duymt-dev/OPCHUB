# Admin translation review (D-141)

- Scope: Admin UI only; API errors, email, CSV and user content retain their original contract.
- Source baseline: f7c1b2b8; current source has2608 string leaves in25 physical catalogs.
- Native-speaker reviewed: **false for every target locale**, including custom AntD Filipino/Lao dictionaries.
- AI-produced English auth/common/overview/meta/ui/bot-options are complete at this checkpoint and raw-contract tested. The rest of English remains partial.
- Exact-match reuse: 464 candidate strings copied from existing approved Portal English catalogs ONLY where the Vietnamese source text maps unambiguously to one English text. No Portal app import exists at runtime. These candidates still require full raw-contract/semantic review; missing keys are missing, never filled with Vietnamese/TODO stand-ins.
- Other target bundles zh/id/th/ms/fil/km/lo/my: pending. Aliases en-SG and ms-BN share en/ms catalogs, not separate translations.
- Confidence: English moderate pending owner review; Khmer/Lao/Myanmar require special native-speaker attention when their catalogs are produced. Human review is not fabricated and does not replace technical gates.
- Font assets/provenance/licenses: pending; no font-delivery completion claim.

## English terminology

| Source                 | English                | Meaning preserved                           |
| ---------------------- | ---------------------- | ------------------------------------------- |
| Th?nh vi?n             | Member                 | Member account, not administrator           |
| Ph? th?nh vi?n         | Membership fee         | VND fee, no exchange-rate conversion        |
| Nh?m c?ng ??ng         | Community group        | Group identity/name stays raw               |
| S? ki?n                | Event                  | Event content/name stays raw                |
| D? ?n                  | Project                | Project content/name stays raw              |
| Nh? ??u t?             | Investor               | Investor details stay raw                   |
| Affiliate              | Affiliate              | Referral/commission entity                  |
| Gi?m ??c V?ng          | Regional Director      | The only direct revenue-share recipient     |
| Hoa h?ng               | Commission             | Affiliate commission remains reference-only |
| Ph?n G? V?ng ???c chia | Regional revenue share | Stored financial snapshot, not recomputed   |

## Raw presence snapshot (not completion)

- vi: 25/25 files, 2608/2608 source string leaves present.
- en: 25/25 files, 879/2608 source string leaves present.
- zh: 0/25 files, 0/2608 source string leaves present.
- id: 0/25 files, 0/2608 source string leaves present.
- th: 0/25 files, 0/2608 source string leaves present.
- ms: 0/25 files, 0/2608 source string leaves present.
- fil: 0/25 files, 0/2608 source string leaves present.
- km: 0/25 files, 0/2608 source string leaves present.
- lo: 0/25 files, 0/2608 source string leaves present.
- my: 0/25 files, 0/2608 source string leaves present.
