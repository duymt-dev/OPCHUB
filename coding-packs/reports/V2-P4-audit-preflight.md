# P4 audit preflight — IN-PROGRESS, not phase acceptance

## Follow-up: Affiliate C4 and env documentation

Source `1477383` adds **eight mandatory Affiliate checks**: every legal edge in
the three state matrices (six total), plus automatic creation and recorded-only
rate invariants. A separate domain module keeps the old registry a facade.
Nine auditor unit cases include missing implementation/positive/blocked anchors,
missing worker/every HTTP endpoint, empty declarations and exact graph coverage.

Current static counts: **C1 25/0, C2 25/0, C3 88/0, C4 36/1, C5 173/0,
C6 138/4** (pass/findings). C4's one P5 bot finding remains excluded, not fixed.
Env docs `a88b561` resolve twelve missing-key documentation findings. The four
retained S4 warnings are explicitly deferred: three `SENTRY_DSN` placeholders
(Q-B65-1, SDK absent), and DB example `DATABASE_URL` as a runtime/API reference
outside the DB CLI schema scope. No audit suppression or runtime env change.

The C4 checkpoint's forced **22/22 tasks / 822 units + 2 skips** passed, as did
native **57/57 in 24 files**. However, the final focused frozen-clock rerun failed
2/2 on fixture member-code uniqueness before reaching domain assertions. A
UUID-based fixture correction `bc03c9f` passes two consecutive fresh focused runs
and the full **57/57, 24-file native rerun**, plus forced **22/22 / 822 units +
2 skips** and both depcheck graphs. The pre-fix failure is retained, not erased.
See [transition audit checkpoint](V2-P4-transition-audit-checkpoint.md) for current
evidence and limits. This does not prove native browser or phase readiness.

The sections below record the **earlier C5 checkpoint**, not current C4/C6 totals.

## Earlier C5 checkpoint (historical)

Initial inspection on `4949a41`; auditor correction **`ca6b368`**, committed and
pushed. C1–C6 here are **static source checks**: no database, seed, fake bank,
persistent API process or native browser is required or implied.

## Corrected C5 finding, not a new permission bypass

The original route reader only collected decorators preceding `@Get/@Post`.
Affiliate controllers legitimately place `@RequireAdmin` below the HTTP
decorator, so C5 emitted fifteen false S1 "missing guard" findings. Source
inspection showed those method guards; native guard/contract tests exercise
their actual enforcement.

The new independent helper uses the already-installed TypeScript AST to
associate the **whole method decorator list** with the actual HTTP source line,
regardless of order, comments, blanks or multiline calls. Six unit cases cover
both orders and those formats; guard-looking comments/body strings, sibling
methods and class decorators cannot manufacture a method guard. Class guards
remain handled separately by the existing class metadata reader.

No Affiliate route is allowlisted. The stale `DEFERRED` permission-key exemption
is removed, so all three Affiliate keys must now have actual guarded routes.
Production controllers, permission keys and guards were not modified.

## Actual latest preliminary output

| Check | Pass | Findings | Interpretation |
|---|---:|---:|---|
| C1 outbox → consumer | 25 | 0 | Static emitter/consumer anchors, not process execution |
| C2 generated links | 25 | 0 | Static route/target checks, not a browser journey |
| C3 zod/body limits | 88 | 0 | Static bounded-input check |
| C4 transitions | 28 | 1 | Existing S3 bot scheduler/thread finding belongs to excluded P5; **Affiliate edges are not yet enumerated in this audit** |
| C5 permission guards | 173 | 0 | Before correction: 155/15; now Affiliate view 8, action 6, payout 1 routes |
| C6 env examples | 126 | 16 | S4 example/schema documentation findings remain open for triage |

The runner exits 0 even when findings exist. Do **not** call the whole audit
PASS or close final acceptance based on that exit code. No skip/waiver was added
for the remaining C4/C6 findings; raw output before/after is retained.

## Verification

- Focused AST units **6/6**; latest forced lint/typecheck/unit **22/22 tasks**,
  **813 units + 2 existing skips** (server 121, Admin 321, Portal 163, shared 140,
  UI 43, integrations 25).
- Depcheck **1468/4036**, server **673/2937**, both pass. No new dependency:
  TypeScript was already a server development dependency.
- Fresh native guard/preview/Admin-contract subset **7/7, 3 files**, local
  Postgres **5432/opchub_test**, Redis **2**. This includes the contract call
  covering all fifteen Admin endpoints plus existing permission/preview negatives.
  It is a subset of prior Affiliate integration coverage, not seven additional
  distinct endpoints or a native browser run.
- Mobile/RBAC MSW **48/48** on `4949a41` and eight SRS-only dialog screenshots
  are in `TIP-V2-404-dialog-mobile-checkpoint.md`.

## Required next work

1. Enumerate Affiliate transitions/blocked edges in C4 using real implementation,
   endpoint and native test anchors. Its current 28 passing checks do not cover
   those missing edges. The existing 491-line registry is near the module split
   limit: add a separate domain module/facade, not more monolithic logic.
2. Triage all sixteen C6 documentation findings, preserving placeholders and
   not printing real env values. No new env variable was introduced here.
3. Native browser/audit E2E, the requested seeded final sequence, UAT/§22.6,
   other visual states/parity, final reports and P4 merge remain unverified.
   The preflight did not seed/flush dev data and does not replace that sequence.
4. Do not implement the P5 bot finding: user explicitly requested stopping after
   Affiliate. Its existence is retained, not reclassified as completed work.

Evidence: [`evidence/v2-p4-audit-preflight/`](evidence/v2-p4-audit-preflight/).
