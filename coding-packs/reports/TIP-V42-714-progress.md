# TIP-V42-714 — verification progress (NOT COMPLETE)

Branch:`feature/TIP-V42-714-acceptance`, stacked from713 `6ab3adf0`.
[Compare](https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V42-713-bot-workflows...feature/TIP-V42-714-acceptance).
No PR or merge claimed. Owner direction is to record questions and continue.

## Baseline and open gates

- Full Playwright parity listing contains546 tests in one scenario file; this
  includes existing unreachable states, not546 guaranteed comparable images.
-713 final declared sweep36 PASS/2 FAIL/2 existing skips. Generated results
  remain5.50/8.08%; native browser NOT RUN after guarded startup policy rejection.
  Its report is explicitly IN-PROGRESS, not treated as passed by starting714.
-711/712 visual questions and earlier v4.2 questions remain open unless an
  explicit later decision/evidence resolves them. Full remeasurement follows.
- Current production MSW builds use isolated `.next-v42-713-msw` directories,
  mock flag `msw`, demo-account panel off; no protected native service is changed.
- Logs:`.git/codex-v42-714/`. Test listing:`parity-list.log`. Exact potential
  diff paths are declared in the TIP's artifact manifest before the run.

## Next verification

Full registry parity, then §27–29/E2E-01–16 evidence mapping and corrections under
exact manifests. Missing native runtime remains NOT RUN, not a fabricated PASS.
No714/M4/full acceptance report is marked complete.
