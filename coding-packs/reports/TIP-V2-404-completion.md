# TIP-V2-404 — completion with declared visual/audit debt

Status: implemented and verified in the Affiliate Admin scope. User explicitly
accepted remaining cosmetic differences as technical debt. This is not a claim
of zero audit findings or universal pixel parity, and does not deliver P5.

## Source and architecture

- Branch `feature/V2-P4-affiliate`; final executable/test source `d422acd`.
- Production cross-tab refresh correction `1eaebae`; renewal verification
  `694d2e3`; audit preconditions/readers `877a461`; final regression evidence
  starts at `61b3981`. Later completion commits only change evidence/docs.
- Admin `/affiliate` and agent detail are orchestrators over independent API,
  model, hooks, tables/cards, dialogs, policy and history modules. Shared DTOs
  are parsed with zod; amounts are server-owned integer VND.
- Navigation, translations and shared components use existing facade boundaries.
  No copied prototype implementation, new external package or infrastructure.
  The auditor explicitly depends on existing `@opchub/shared` workspace contracts.
- Missing summary/list/policy-preview contracts were separately delivered in
  TIP-402A/B/C, not fabricated by UI calculations or silent backend scope creep.

## Acceptance trace

All behavior references below are in `e2e/behavior/`; they run with the same
assertions against MSW and native. Native-only auditor checks are named explicitly.

| Criterion | Evidence |
|---|---|
| AT-AF01 automatic agent after first confirmed fee | `affiliate-agent-creation.spec.ts`: one automatic Admin row after F5 |
| AT-AF02 referral → first payment → recorded commission | `affiliate-lifecycle.spec.ts`, `affiliate-cross-app.spec.ts`: both apps, actual amounts and persisted history |
| AT-AF03 self referral rejected | `affiliate-portal.spec.ts`: validation prevents registration submission |
| AT-AF04 renewal creates no second commission | `affiliate-renewal.spec.ts`: reactive completion, persisted one-year extension, unchanged commission in both apps |
| AT-AF05 paused owner | `affiliate-paused.spec.ts`, `affiliate-payout.spec.ts`: new referrals rejected, old closed-month commissions still payable |
| AT-AF06 missing bank | `affiliate-payout.spec.ts`: real 409, unchanged state, same-key retry after bank update, immutable paid receipt |
| Required cancellation reason, cancel/confirm/bulk | `admin-affiliate.spec.ts`, `affiliate-dialogs-responsive.spec.ts`, `affiliate-status-menu.spec.ts`: no empty write, Portal readback and F5 |
| Individual/bulk rate, recorded only, terminal history | `admin-affiliate-operations.spec.ts`, `affiliate-inline-rate.spec.ts`, `affiliate-concurrent.spec.ts`: two writes survive concurrent reloads |
| Policy validation and authoritative preview | `admin-affiliate.spec.ts`, `affiliate-policy-responsive.spec.ts`; API preview integration and shared/mock schema tests |
| Accountant action / view-only / denied menu | `admin-rbac.spec.ts`, payout/authorization tests; backend permission tests remain authoritative |
| CSV contains only selected operations and is audited | `admin-affiliate-operations.spec.ts`: reads the download and audit row for that exact export |
| URL search/status/month/page/size and F5 | `admin-affiliate*.spec.ts`, `affiliate-agent-period.spec.ts`, `affiliate-status-filters.spec.ts` |
| Mobile tables/cards, all cells, pagination/dialog/menu | `affiliate-{agents,customers,dialogs,policy}-responsive.spec.ts`, status/filter/menu and responsive cases at 360/390/1440 |
| Frozen time, paused/history/unknown bank | Dedicated frozen-clock, paused, payout and receipt/model/component coverage; native audit findings retained separately |

## Final gates (21 October 2026)

| Gate | Verified result |
|---|---|
| Full native behavior | **221/221, 17.1m**, source 877a461; production unchanged afterward |
| Full MSW behavior | **221/221, 5.2m**, d422acd test content; no skipped target assertions |
| Affiliate/RBAC subset | 52/52 each target on 694d2e3; included in full suites, not additional unique cases |
| Repository units | **835 passed + 2 existing skips**; final six unit tasks cached |
| Lint / typecheck / depcheck | Exit zero; final changed e2e tasks executed, cached other tasks disclosed |
| Native Affiliate API/domain/contracts | **55/55 in 23 files**; separate endpoint-coverage **2/2 in one file** |
| Admin production builds | Native and MSW after refresh-lock fix passed; logs under `native-browser/` |
| Additional native acceptance | Manual-collection AT-LK01/02 **1/1**; final-source account-lock **1/1** |
| Final seeded browser audit | 251 completed invocations; latest **30/30 in-scope UAT** after follow-up, not zero-finding PASS |

First full MSW run retained: 102 passed, 1 failed, 1 interrupted, 117 not run.
Its lock precondition waited on a menu link already removed by the correct
background guard redirect. A synchronous optional click avoids waiting on an
unmounted link; exact URL/locked alert/login assertions remain unchanged.
Focused MSW 3/3 executions of that same case and full MSW rerun pass. This did
not alter production account locking or expand native/MSW assertion differences.

The Admin refresh race was a real production correction: origin-scoped Web Locks
serialize rotating-cookie refresh across tabs, retaining the single-tab fallback
where Web Locks are unsupported. Four dedicated units and real parallel write/
reload behavior pass; no credentials are broadcast or stored by the lock.

## Explicit deviations and follow-ups

- Raw final Admin parity: **27/34 within 3%, seven failures**. Largest default
  agent mismatch is 27.6858%; it is not described as under 10%. Actual rows,
  required controls and thresholds were not removed to manufacture parity.
- Six native paused-clock selected-label paint checks remain red. Interaction,
  rows/counts/URL/F5 pass; cosmetic TD-P4-UI-08 is deferred, not converted to PASS.
- User quote and all measured percentages: `../audit/V2-P4-UI-TECH-DEBT.md`
  and `ui-parity/deviations.md`.
- Full audit raw ledger: four S2, nineteen S3. Three in-scope S2 auditor issues
  are closed with paid-outsider, paid-sender and delivered-mail checks. Remaining
  S2 UAT-14 is explicitly excluded P5, not fixed. All S3 classifications/follow-ups
  remain in `../audit/V2-P4-AUDIT-FOLLOWUPS.md`; static S4 env deferrals remain.
- Older legacy TEST-GAPS tables are historical; P4 current trace is its section 7.
  No claim that all P5 or final V2/TIP-503 trace work is complete.

## Evidence and handoff

`evidence/v2-404/final-audit/` contains terminal full-suite logs, failed runs,
focused follow-ups, unit/static/dependency logs and partitioned UAT/findings.
`V2-P4-final-audit-checkpoint.md` explains raw versus latest results. API evidence
also lives in `ui-debt/` and `native-browser/`; prior TIP completion reports
retain their own exact tested commits and limitations.

Native services must remain running for user acceptance, per the explicit
21 October reply: Portal **3280**, Admin **3282**, API **4020**, socket **4021**,
worker. Preserve native Postgres and Redis. Stop after Affiliate/P4; no P5 work.
Main integration SHA and UAT table are recorded in `V2-P4-completion.md`.
