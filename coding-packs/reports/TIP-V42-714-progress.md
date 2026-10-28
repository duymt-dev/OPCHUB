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

## Full baseline completed (compiled713 source, before714 corrections)

`full-parity.log`: **421 passed,51 failed,74 existing skipped**,546 collected,
26.8m. Of51 failures,42 produced over-threshold images and9 timed out before a
fresh capture. The reporter contains463 fresh rows stamped0b76e98a (421 PASS,
42 FAIL). Its nine older rows are NOT current evidence: P-05 both widths,
P-100/101/102 both widths and P-89@1440. Preserve their old SHAs; do not count
these retained historical images as a passing full run. The74 existing exclusions
still require rationale/behavior evidence under D-95, not automatic acceptance.

The run used unchanged compiled713 MSW frontend outputs, corresponding to source
6ab3adf0 /714 inventory0b76e98a. All714 source edits happened after compilation;
none was rebuilt into the running baseline. Its owned3300/3301 servers exited
normally on completion; protected native processes were not touched.

Confirmed two defects with independent browser assertions on that same baseline:
- E2E-12: Admin saved1,560,000; Portal public endpoint returned1,200,000.
  `pricing-red-browser.log` failed at the exact equality assertion.
- Auth header: Portal and Admin both fail the390 wrap assertion; language starts
  at y30 while support ends at y58 (`auth-red.log`). Measured prototype topbar80px
  versus app36px; support item grouping is the cause, not a masked screen region.

Corrections are in progress, not accepted by this baseline commit. Initial focused
pricing/composition/relay tests15/15 and auth unit1/1 passed; final root forced
unit run1924 +2 existing skips passed with zero cached tasks, lint/typecheck and
depcheck2212/6610 plus server980/4565 passed. Browser-green proof and affected
remeasurements follow after both isolated frontend rebuilds. No current native
browser proof is claimed. Acceptance/spec/E2E maps are explicitly IN-PROGRESS.