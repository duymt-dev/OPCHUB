# TIP-V46-801 province ordering checkpoint

Source: `03def207`; not TIP completion.

The province option helper sorts assigned and unassigned options by the existing
34-province catalogue. Removing/reassigning a province no longer moves its chip.
Unknown options remain available; inputs are immutable. No financial, audit,
permission, backend or cross-region assignment semantics changed.

## Verification

- Root `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm depcheck`: exit0.
  Lint/typecheck8/8 tasks; unit2089 passed plus2 existing skips (Admin596 fresh,
  five other tasks cached); depcheck2284 frontend/test and1008 server modules.
- Focused helper unit3/3. Both Admin builds pass using separate MSW/native
  dist directories; held server dist untouched.
- `playwright test --project=behavior behavior/regional-director-provinces.spec.ts`:
  MSW2/2 in11.0s; native with `-c playwright.server.config.ts`2/2 in22.0s.
  Both390/1440 use identical assertions: unassign, reload, reassign, reload,
  stable chip order, retained incumbent and bank account.
- Post-commit `PARITY_IDS=D-V46-GDV-CONFIG,D-V46-GDV-UNASSIGNED`, workers2:
  4 passed/2 failed in22.8s (two harness cases included), exit1.
  Default1.03%/1.14% PASS; unassigned7.31%/10.11% FAIL at1440/390.
  Desktop improves from9.27%; mobile remains unchanged. Actual current rows
  and diff images retained in ui-parity results, without masks/baseline edits.
- Native seed, seed:demo and flush:dev-cache all exit0. Original held processes
  remain API28484, socket33408, worker16200 with unchanged Oct30 start times.

Logs: `e2e/.parity-out/v46-801-province-order-{unit,precommit,build,msw,
native-build,native,parity,restore}.log` (local ignored artifacts).

Retain full backend integration1894 at302174ed: no backend/shared/db changes.
Full MSW342+4 skips at4ff6649b is historical, not a full run of this new source.
No repeated full integration/E2E for this localized presentation change.

## Remaining

Q-V46-801-17 remains open: real audit rows, attribution counts, additional
available provinces and warning presentation differ from reference. Preserve
real data and record uncertainties rather than blocking the whole goal or
inventing approval. Continue scoped correction; no TIP802 or DONE yet.
