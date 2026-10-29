# TIP-V42-713 — acceptance evidence (IN-PROGRESS)

**Verdict: NOT COMPLETE.** This named deliverable consolidates the evidence; its
existence does not satisfy the goal's completed-TIP requirement. Native browser
verification is still missing and result parity is above3%. No714/M4/full-goal
completion is claimed.

Branch: `feature/TIP-V42-713-bot-workflows`, stacked on712; no merge performed.
[Stacked compare](https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V42-712-admin-llm-config...feature/TIP-V42-713-bot-workflows).
No PR number is claimed. Implementation anchors: `25587692` / `5626203f` backend,
`ab3445e3` native fixture/reset and regression evidence, `42e365c2` actual result
counters/ordered avatars. Stage4g source and final measurements are in the commit
containing this report. Detailed history: [progress](TIP-V42-713-progress.md).

## Acceptance matrix

Test paths below are relative to `apps/server/test/bot/` unless qualified.
Real HTTP in integration tests is not the missing native browser gate.

| Criterion | Authoritative coverage | Verdict / limitation |
|---|---|---|
| AC1 missing schedule/compatibility | `bot-schedule-window.int.spec.ts`: missing live defaults, authenticated read, independent action permission | Native integration verified |
| AC2 VN date boundaries/invalid dates | `packages/shared/src/bot/schedule-window.spec.ts`; schedule HTTP rejects nonexistent/reversed dates and unknown fields | Unit + integration verified |
| AC3 pause/resume/clear and in-flight fences | Schedule integration: queued publication/manual admission, paused real HTTP generation; reply-run pause/resume and stop race cases | Integration verified; new native UI flow not run |
| AC4 manual scan with auto off, one reply, stop | `bot-reply-runs-v42.int.spec.ts`: real HTTP run, stop during generation, automatic20-second boundary, failed-generation advancement | Integration verified |
| AC5 latest-N eligibility and previews | `bot-reply-scan-v42.int.spec.ts`: limit before filtering, hidden/deleted/file/bot/topic exclusions, answered-message exclusion, ranked groups/eight previews; same-group persona coverage in runtime tests | Integration verified |
| AC6 seconds and12/60 budgets | `bot-reply-limits-v42.int.spec.ts`: real Redis atomic group/system windows, replay, rollback; reply runs bypass legacy hours/quota/cooldown but preserve publication guards | Integration verified |
| AC7 rotation, parallel groups, minute gaps | `bot-rotation-v42.int.spec.ts`, `bot-parallel-worker-v42.int.spec.ts`, `bot-minute-gap-v42.int.spec.ts`; MSW A→B→A/reload and automatic lifecycle | Integration + MSW verified; native UI flow not run |
| AC8 real HTTP bulk and explicit selected save | `bot-bulk-generation-v42.int.spec.ts`, `bot-bulk-api-v42.int.spec.ts`, `bot-bulk-worker-v42.int.spec.ts`, `bot-bulk-save-limit-v42.int.spec.ts`: provider output/claim fences, atomic selected save, failed provider without fabricated text, maximum500/4000 boundary | Integration verified; native browser fixture implemented but not executed |
| AC9 persisted custom types/durable recovery | `bot-conversation-types-v42.int.spec.ts`: actual API restart, immutable built-ins, uniqueness, delete/retained-script behavior; bulk reload/select/save MSW scenario | Integration + MSW verified |
| AC10 permission/validation/audit/outbox | Schedule, types, reply-run and bulk HTTP suites assert denied mutations, strict fields/body bounds, concurrent replay and audit failure rollback; real worker/outbox suites | Integration verified |
| AC11 responsive behavior and≤3% parity | `e2e/behavior/bot-{schedule,replies,bulk}-v42.spec.ts`; shared native/MSW assertions; raw image rows/diffs | **Incomplete:** native browser NOT RUN; generated-result images FAIL |

## Regression evidence and scope

Local raw logs are in `.git/codex-v42-713/`; they are not committed and contain no
claimed CI permalink. Committed summaries and raw image diffs are the handoff.

- Full native `pnpm test:int`: server1698 tests/184 files +DB125/26 files,
  **1823 passed**, real PostgreSQL/Redis,23m59.9s. Log
  `stage4-final-native-integration.log`; subsequent DB rerun125/26 passed.
- Full MSW behavior: **332 passed +4 existing skips**,21.1m, log
  `stage4-full-msw-behavior-correct.log`. The two provider-boundary tests were
  collected later and passed separately, not counted as a full334-test run.
- Stage4f root gates passed:1920 unit tests +2 existing skips, lint/typecheck,
  depcheck2206 modules/6588 dependencies and server980/4565. Stage4g changes
  only presentation and strengthens existing completion-status assertions;
  its final lint/typecheck/unit/depcheck gates also passed (`stage4g-*`).
- Root build previously passed3/3 (`stage4e-root-build.log`); isolated native
  server/API/socket/worker and both frontend builds passed. Stage4g isolated
  Admin MSW build and focused modal tests3/3 passed. Builds are not runtime proof.
- Stage4g bulk UI scenario passed2/2 at1440/390, retaining reload, canonical
  selection, saved markers, explicit save and actual eight-line counter checks.

## Query/migration evidence

New lists have real≥10000-row plan tests: reply scan/history, conversation types,
rotation candidates, batch/items/recovery and line collision detection. Tests
require appropriate indexed seeks/deferred payload reads, without forced planner
switches. Maximum4000-hash collision detection exposed a sequential scan and was
corrected to indexed probes;500-script atomic save/replay is covered. Existing
persona GIN is reused rather than retaining the duplicate index. See the detailed
plan timings and corrective history in the progress report.85 migrations were
applied to the permitted native databases; final DB suite reports none pending.

## Hard-rule review

- Domain modules/components/hooks/tests separated; no new monolith, dependency,
  stack change, `any`, `@ts-ignore`, frontend role-name check or app-cross-import.
- Strict shared schemas at boundaries; backend permission keys; audited writes;
  conditional transitions/execution fences and transactional outbox preserved.
- Actual configured HTTP provider, no fake production fallback; automatic tests
  use only local providers. No bank/paid-AI/VPS access or `.env` modification.
- Native HOLD services/data remain untouched by the proposed isolated browser
  lane. No test reset or extra worker was launched after the tool rejected startup.
- Scoped commits/push; no main/dev merge or force-push. Final clean status is
  checked after the report/source/evidence commit, not inferred from this prose.

## Remaining work / Questions

1. Q-V42-713-9: the guarded native Admin3311 startup was explicitly rejected again
   with `blocked by policy` before launch. Do not change launcher to bypass this.
   Native schedule/reply/bulk browser checks remain NOT RUN, despite passing
   API/worker integration. They cannot be called server-dev acceptance for714.
2. Q-V42-713-5/6: generated-result parity remains above3%; keep actual provider
   text, status/cursor/type/saved counts and controls visible. Do not replace
   data, mask regions, increase tolerance or relabel a FAIL as accepted.
3. Final declared D-31–41 visual sweep:36 PASS,2 raw FAIL,2 existing skips,3.0m. Generated results5.50/8.08% at1440/390 (`stage4g-full-parity.log`). D-32 is an existing
   D-91 prototype-unreachable exclusion, not a new skip introduced by713.
4. Do not mark AC11, TIP713, TIP714 or the overall goal complete on the strength
   of the implemented fixture, build output or this report alone.
