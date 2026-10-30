# V46-801 — Portal visual gate and P16 catalogue (PARTIAL)

Source: `4719e2ea`, 30/10/2026. Production code remains `9a9ad3ea`.

## Portal parity — now measured, not all green

Three new full-page scenarios sign in normally as Bảo on both prototype and
app. Sidebar includes the mobile drawer, billing uses the actual account-menu
journey, pricing opens from the sidebar. No prototype state injection, masks,
baseline edits, cropped replacement gates, retries or threshold changes.

`PARITY_IDS=P-V46-GDV-*`, one worker, `.next-v46-msw-build`,
`pnpm --filter @opchub/e2e parity`: **5 passed / 3 failed** (includes two
capture-harness tests). Pixelmatch threshold 0.1, maximum 3%, unchanged.
The post-commit rerun at `4719e2ea` reproduces every score below (35.6s total).

| State | 1440 | 390 | Gate |
|---|---|---|---|
| Director sidebar / Dashboard | 1.346257% | 5.624571% | mobile FAIL |
| Director profile billing/history | 0.868056% | 1.987733% | PASS both |
| Director pricing | 6.350731% | 9.179974% | FAIL both |

Actual images were inspected, not just scores. The prototype's pricing still
shows the ordinary three-month trial badge, old expiry countdown/renewal, allows
the director's membership registration and locks fundraising. The app correctly
shows incumbent exemption, forbids membership renewal, and leaves paid
fundraising enabled under D-120. The shorter correct copy changes card/grid
height and shifts the service list. The mobile drawer also exposes differences
in the underlying seeded onboarding completion state (e.g. event step), beyond
the sidebar fee correction. Do not call every differing pixel a justified
exemption deviation: data/layout still need investigation.

Additional source inspection explains the event discrepancy without inventing
an event registration for Bảo: prototype `_ob` at 6454–6457 uses the session-
global `Object.keys(s.regs || {}).length > 0` for whichever member is currently
logged in; initial state has `regs:{e2:1}`. The mock checks each actual user in
`db.eventRegs` and seeds those registrations for m1 only, consistent with the
native per-user onboarding query. Do not add a false m3 registration merely to
reproduce the prototype's global-state shortcut. This is not a production fix
or an approved visual deviation; it identifies the conflicting precondition.

Q-V46-801-7 already records the prototype fee contradiction. Keep these FAIL
rows/diffs, preserve valid D-120 behavior and old fee history. Do not restore
forbidden payment controls or fake dates/progress to make a screenshot pass.

## P16 browser functionality

New `regional-director-mail-catalogue.spec.ts`: **1/1 MSW**, 8.0s total / 4.1s
test, and **1/1 native**, 13.4s total / 5.9s test; identical assertions.
Actual Admin `/marketing` → Email tự động: exactly two EM-GDV1/2 rows,
appointment/revocation names, enabled state, no-password notice, no buttons,
textboxes, checkboxes or switches inside the system catalogue. Reload preserves
the auto tab and the same readonly catalogue. Campaign editors are not hidden
or treated as those system templates.

This is not P16 visual parity. The prototype navigation inventory was inspected
in Chromium: Admin sidebar, Nội dung & Sự kiện and account-menu Cài đặt hệ thống.
No Marketing entry. Settings has Email chào mừng and SMTP, not this catalogue.
Source inspection: EM-GDV1/2 markup only at prototype lines 3670–3671 inside
the Marketing panel; `aMarketing` depends on `s.aTab === 'marketing'` (7197).
No UI action setting that tab was found; the existing D-78/D-79 C-05 limitation
is consistent with the actual menu inventory. No new `unreachable` skip was
added and no P16 PASS claimed. The temporary inventory probe was removed; it
is not counted as a product acceptance test.

## Checks and native HOLD

Root precommit lint/typecheck/unit/depcheck exit 0: lint/typecheck 8/8 tasks,
unit 6/6, **2083 passed + 2 existing S3 skips**. E2E lint/typecheck fresh,
unchanged production/package units reused. Existing nine img warnings retained.
Depcheck 2278 frontend/shared/E2E + 1008 server modules, no violations.
No shared/production changes requiring new FE builds or invalidating earlier
P6/P9/P17, discovery/onboarding or Portal browser evidence.

Native catalogue browser used the held API `4ba6fe16`, not the later SQL binary;
SQL-version proof remains current-source integration. Native demo restored
afterward (`seed:demo` 1154ms, cache flush 20 keys). API/socket/worker PIDs
28484/33408/16200 retained. No `.env`, provider, secret or migration changes.

## Next required work

Investigate Portal data/layout discrepancies while preserving D-120; P16
prototype reachability remains unverified, not waived. Keep related D-84/D-85
findings. Full native integration gate has now been started separately at this
source; do not infer PASS until its terminal output is inspected. Full build/
MSW E2E regression and completion/PR-or-compare still required. No #802 started.

Local continuation handle for the single full-integration runner: unified exec
session **20082**, log `e2e/.parity-out/v46-801-full-int.log` (gitignored).
Command `pnpm test:int` uses `--concurrency=1`; DB **128/128**, 27 files, 57.64s,
already terminal PASS; server runner still live when last polled. Resume/poll
that handle and inspect the log, do not start a second native integration runner
or infer completion from a quiet observation window.
