# V2-P4 — Affiliate §20 completion / acceptance handoff

Status: P4 implementation and functional verification complete with declared
visual/audit debt. Merged and pushed to main as **cb66075**.
No P5 implementation or full-V2 completion is claimed. User instruction overrides
the old goal: finish Affiliate/P4, then stop; keep native services for acceptance.

## Deliverables and source commits

| Deliverable | Source / report |
|---|---|
| TIP-401 schema, migration, lifecycle/outbox, notifications, backfill | `bac74a5`, `d044c38`; `TIP-V2-401-completion.md` |
| TIP-402 Portal/public/register/Admin APIs, permissions, payout/CSV audit | `ebc6a85`, `fe8a974`, `fb8ecba`; `TIP-V2-402-completion.md` |
| TIP-402A/B/C additive summary/list/policy-preview contracts | `0a9fc8d`, `79f7073`, `986930c`; individual completion reports |
| TIP-403 Portal affiliate/referral/auth/bank/history | `32f6112` and preceding commits in `TIP-V2-403-completion.md` |
| TIP-404 Admin commission/agent/detail/policy and cross-app acceptance | `TIP-V2-404-completion.md`; final UI source `f394dc5`, production refresh fix `1eaebae` |
| Final audit/test corrections | `694d2e3`, `877a461`, `d422acd`; raw failures and follow-ups retained |
| P3 already integrated | Main `4f95c97`, before P4 integration |

P4 has no manual agent creation/commission approval/refund workflow. Commission
is first-fee-only; paused owners reject new referrals while old money remains
payable; cancelled/paid entries retain immutable history and paid bank snapshots.
Permissions are enforced in backend, transitions/outbox are transactional, and
Admin changes/exports are audited. The dedicated API/domain tests cover negative
permission/input/state/replay/race cases; UI does not manufacture missing values.

## Verification

| Gate | Result |
|---|---|
| Full behavior, native / MSW | **221/221 / 221/221** (17.1m / 5.2m) |
| Affiliate/RBAC alone, both targets | 52/52 each; subsets, not extra unique cases |
| Units | **835 passed, 2 existing skips**; final cache usage disclosed |
| Lint / typecheck / depcheck | Passed |
| Native Affiliate domain/API/contracts | 55/55 in 23 files, plus separate coverage 2/2 in one file |
| Native direct manual-collection AT-LK01/02 | 1/1: live popup closes, F5 active, exact calendar-year expiry |
| Final-source native account-lock | 1/1; MSW focused lock repeat 3/3 executions, not three unique tests |
| Seeded static C1–C6 pass/findings | 25/0, 25/0, 88/0, 36/1, 173/0, 138/4 |
| Seeded native audit | 251 invocations completed; caught findings are not global PASS |
| Latest in-scope UAT | **30/30**; full raw range is 30/31, UAT-14 excluded P5 |
| Admin raw parity | 27/34 ≤3%; seven measured failures accepted as debt |

Executable/test source: native full suite 877a461; full MSW suite d422acd content.
Production code is unchanged between these runs. The only intervening behavior
change stabilizes the MSW lock precondition; native assertions are unchanged and
its native case was rerun. Final source also adds the separately run native
manual-collection auditor, not a silently expanded 221/251 count. Subsequent
completion commits change documentation/evidence only.

## UAT table — latest result, preserving raw history

| UAT | Result / evidence |
|---|---|
| 01–04 | PASS: personal registration, required fields, OTP, activated user and welcome log |
| 05 | PASS: business tax lookup, populated identity and OTP activation |
| 06–09 | PASS: mandatory paywall, no dismiss/bypass, transfer information and real payment activation |
| 10–13 | PASS: manual collection/expiry, login/reset entry, group approval, realtime chat |
| 14 | EXCLUDED P5: automatic persona response remains raw FAIL, not implemented |
| 15 | Raw PASS of existing bot audit path; not proof of complete P5 autonomy |
| 16–20 | PASS: event registration, project submit/publish, investor validation and cross-app thread |
| 21–23 | PASS: consultation validation, created request, transitions and mentions |
| 24–27 | PASS: lock, group assignment, current-page selection and pagination |
| 28 | PASS: invalid SMTP configuration rejected |
| 29 | PASS after 877a461: actual delivered FakeMail includes saved intro/document; sent DB HTML is purged |
| 30–31 | PASS: logout and mobile no-horizontal-overflow checks |

Authoritative records are `evidence/v2-404/final-audit/full-e6dc3cd-uat.jsonl`
plus the latest row for each ID in `followup-877a461-uat.jsonl`. Do not count
repeated UAT-28/29 rows as additional cases. Full audit raw UAT was 29/31 before
the delivered-mail correction; the failed/intermediate rows are retained.

AT-AF01–06 and AT-RB01–06 pass in the full native and MSW behavior suites.
AT-LK01/02 have direct native manual-collection evidence; AT-LK03 combines actual
report/hide native verification with Admin moderation UI coverage; AT-LK04/05
verify no-scroll layout and the correct digital-solution consultation request.
§22.6 event/security/group/investor/nonrefund acceptance cases are traced in
TEST-GAPS §6.3. P4 current REQ-301–312/410 mapping is TEST-GAPS §7.

## Accepted debt, exclusions and native HOLD

Three in-scope raw S2 audit issues are corrected and verified; the fourth is
excluded P5 UAT-14. Nineteen S3 findings have bounded follow-ups, including six
selected-filter paint checks that remain red. Four static S4 env findings and
the C4 P5 bot finding are retained. Full legacy native/MSW behavior is green;
this does not retroactively turn every old audit screen walk into a PASS.

User accepted cosmetic debt on 21 October. See `../audit/V2-P4-UI-TECH-DEBT.md`,
`../audit/V2-P4-AUDIT-FOLLOWUPS.md` and `ui-parity/deviations.md` for raw numbers,
reasons and constraints. No masks, threshold relaxation, removed required data,
or security/money waiver was used. No VPS/external paid services were changed.

Keep native running by the user's explicit reply: Portal `http://localhost:3280`,
Admin `http://localhost:3282`; API 4020, socket 4021, worker in existing service
panes. Postgres 5432 native and Redis remain intact. Ports 3100/3000/3001 untouched.
No further feature work and no P5 after this handoff without a new instruction.

## Integration receipt

- **cb66075**: `chore(v2): merge phase 4 affiliate into main`, no-ff integration
  of P4 feature **cb9a95f** into P3 main **4f95c97**; pushed to `origin/main`.
- Exact `git diff --exit-code feature/V2-P4-affiliate HEAD` in the main worktree
  passed immediately after merge: merged tree equals the tested feature tree.
- Main integration ran in `D:/CODING/OPCHUB/wt-v2-main`, clean before and after;
  original working tree stayed on `feature/V2-P4-affiliate`. No forced push,
  skipped hook, destructive cleanup or changes to protected ports/services.
- The feature subsequently fast-forwards to the merge, then carries this
  docs-only receipt; main receives that receipt by fast-forward. The stable
  integration SHA above is not replaced with a binary hash or invented result.
- After tests, demo Affiliate data and dev cache are reset for native HOLD so
  the last lock test does not leave the paid acceptance account locked. Both
  Portal/Admin login pages return HTTP 200. This is environment preparation,
  not another UAT/full-suite run or a reason to alter the recorded test counts.
