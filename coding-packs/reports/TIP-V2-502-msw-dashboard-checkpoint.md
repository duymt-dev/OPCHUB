# TIP-V2-502 message-backed MSW Dashboard checkpoint — IN PROGRESS

## Implemented
- Dashboard mock discussions no longer manufacture cards from script definitions
  or BotThread seed status. The selector reads actual stored simulated opening
  messages in existing groups' default rooms. Hidden/nondefault/deleted-group
  candidates are excluded BEFORE the latest50 limit; `(createdAt,id)` gives a
  stable descending keyset, including tied timestamps.
- Private per-message execution/turn/kind/persona/room/opening metadata is stored
  separately from public Message DTOs. Successful script ticks persist it, with
  unique IDs per destination, one first-successful opening per room/execution,
  execution/room/turn replay protection and the existing 120-row simulated cap.
  Humans are retained. Hidden/pruned opening metadata prevents later turns from
  being promoted into a new card for the same execution.
- Preview/count combines visible execution turns and direct member/bot replies,
  deduplicated by message identity and ordered earliest-first. Private quote
  references are reused; no sender-role or simulated marker is added to Portal.
- Discussion identity survives BotThread GC. Deleted personas yield the same
  neutral `Thành viên`/empty-role/primary-color fallback as native, keeping content.
- The two historical demo discussions now have real stored messages and metadata
  created with the mock database. Only their first known destination is seeded;
  no unknown historical publications in other groups are invented. Removing all
  stored messages returns no cards even though terminal BotThread seed rows remain.
- `MockDb` types were extracted to `store-types.ts`, with the old type export
  preserved. This removes seed/write helper dependency cycles, including type-only
  cycles, without disabling depcheck. No new dependency or native schema change.

## Tests and preserved failures
- New shared cases12: real demo-backed cards, actual script ticks across rooms,
  actual skipped-first-turn publication, per-room openings, hide/delete/no promotion,
  union counts and earliest visible response, GC/persona deletion, latest50/ties/
  keyset/negative scopes before LIMIT, D-48, duplicate identity/ID collision,
  cap120/human retention/pruned replay, internal validation and reset isolation.
- New Portal MSW HTTP cases2: actual discussion IDs/bodies exist in paginated chat
  responses; scoped hide changes both fresh Dashboard and chat responses while
  retaining human content. Focused Portal cohort18/18; shared cohort156/156.
- Initial shared failures142-pass/2-fail are retained. Real seed messages exposed
  three older tests' implicit four-human-message fixture assumptions (shared
  idempotency/pagination and Portal HTTP cursor). Each case now explicitly loads
  that original `buildMessages()` fixture. Every existing assertion and expected
  value remains unchanged; the new tests cover the mixed human/bot default demo.
  The first forced full run also retains that Portal fixture failure.
- Initial depcheck found two type-only cycles through the store/seed helpers;
  extracting the type-only module resolves them. The failed and final green
  receipts are retained. No rule or assertion was relaxed; no `onServer` branch.
- Final repo gate receipts: `evidence/v2-502/msw-dashboard/`. A forced uncached
  unit run is used because shared seed changes affect Admin and Portal consumers;
  local-task cache hits alone do not establish that those consumers were rerun.
- Final forced repo units **982 passed + 2 existing storage-provider skips**:
  server203, Admin360, Portal168, shared156, UI43, integrations52; all six tasks
  executed, **zero cached**. Final lint8/8 and typecheck8/8 (six cached each).
  Depcheck: zero violations, FE1514 modules/4193 dependencies; server761/3373.
  A subsequent literal `pnpm test` confirmation reused all six green task caches.

## Remaining scope — not a TIP/P5 completion
- Full auto/member-reply mock execution, NA-07/metrics alignment, live/cross-app
  mock transport and native/mock demo alignment still require work. This feed
  read is fresh in memory; a complete native-equivalent 10s mock-cache lifecycle
  is not claimed here. The existing native feed/cache implementation is unchanged.
- No browser behavior/parity measurement, full native integration rerun, real-LLM
  worker/browser acceptance, UAT/AT/LK/C1–C6/browser audit or fresh native build is
  claimed from these unit/HTTP mock tests. Native data/services were not modified.
- New message-backed seed changes are not automatically covered by old P4 UI
  waivers. Registry parity still needs measurement after functional acceptance.
- `TEST-GAPS` REQ-141/224/411 remain partial with actual additional references.
  P5-PLAN-01, TIP-501/502/503 reports/final acceptance and owner-reviewed dev→main
  PR remain open. Main has not been merged or pushed by the agent.
