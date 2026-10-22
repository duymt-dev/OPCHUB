# Bot availability without environment flags — 2026-10-22

Owner explicitly retired both Bot environment flags (amendment in requirements
matrix). This supersedes the Bot portion of D-51 and the older D-05/DV-G4d-5 gate.

## Changes

- Admin navigation follows existing permissions only; Bot screen has no env gate.
- Bot HTTP module is always registered; scheduler, runner, reply admission and
  work queue no longer check FEATURE_BOTS or inject Env for that purpose.
- Both flags removed from schemas, examples and E2E configuration. Legacy values
  are ignored, not required to be deleted before upgrading.
- Runtime settings, pause/resume, emergency fence/stop/hide, audit, limits and
  permissions remain unchanged. No migration or automatic settings change.
- Existing bot.enabled=true settings can run when the upgraded worker starts:
  operators wanting a pause must use runtime settings/emergency stop, not old env.
- Corrected the old env-disabled error message to a data-loading error message.

## Verified

- Root lint, typecheck, test, depcheck passed. Unit: 1475 passed, 2 existing skipped;
  4/6 unit tasks cached. Seven added unit cases cover absent/legacy flags and
  permission denial. Full test graph run with --concurrency=1.
- Native integration: 108/108 across 24 files, 231.41s. Setup explicitly removes
  FEATURE_BOTS after loading env. Includes HTTP contract, scheduler/runner/reply,
  queue deadlines, emergency races, hide, quotas and Dashboard regressions.
- Original Admin Bot E2E assertions unchanged: MSW4/4 (25.8s), native4/4 (29.0s).
  Fresh Admin builds in both lanes and backend build passed, without Bot flags
  in the harness. Native actual API is the changed source, not the old P5 binary.
  Unchanged Portal reused its prior build. Providers fake; no external LLM calls.
- Native required/demo/cache restored (all exit0). Temporary processes were owned
  and stopped; no existing native API/UI listeners were running at preflight.
- Evidence: `evidence/bot-no-env-flags/`. No new pixel-parity claim: no layout
  redesign; previous explicitly accepted P5 visual debt remains unchanged.

## Diagnostic attempts and release

First lint found a now-unused import, removed before passing rerun. Two broad
integration attempts showed no progress and were interrupted; a focused HTTP
probe passed4/4, then verbose full rerun passed108/108. First Next build inherited
development NODE_ENV from the harness and failed prerender; corrected harness to
production for Next only, both builds passed. These were not counted as passes.

Developed from dev, integrate back into dev and submit dev -> main for owner
review/merge. No production deployment or main merge performed by this task.
Deploy this new revision normally: neither Bot flag is needed. LLM/provider
credentials remain separate configuration; removing flags does not provision them.

## PR review correction — Vietnamese error text

Owner spotted ASCII question marks in the PR diff, not a runtime/API failure.
The shell pipeline used for the previous edit had corrupted Vietnamese text.
Corrected the JSON with a UTF-8-safe patch and added a regression test whose
expected string uses Unicode escapes, so the oracle does not share that failure.
This correction changes copy only; no claim of fixing an API/data-loading defect.
Focused encoding test passed 1/1; full root gates are rerun before commit.
