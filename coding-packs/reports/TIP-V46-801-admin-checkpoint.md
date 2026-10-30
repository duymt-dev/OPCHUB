# V46-801 — Admin configuration checkpoint (PARTIAL)

Source: `527ecc39`, branch `feature/TIP-V46-801-regional-directors`.

## Implemented

- Deep link `/affiliate?tab=gcfg`, visible configuration tab; screen/content remain orchestrators. The tab does not load unused legacy list or policy pages (bounded tab-count queries remain unchanged).
- Schema-validated `/admin/gdv` client, query keys, server-owned configuration and keyset history; member search debounced 300 ms with paged results.
- Three permanent cards: incumbent/email/region, province and affiliate counts, province assignment, receiving account, confirmed revocation, appointment dialog for an empty slot, history with actor/role and HCM time.
- `affiliate.view` reads; `affiliate.gdv` controls writes. Mutation permission is checked again, including preview mode. Pending operations disable controls; no optimistic appointment, revocation or province update.
- Config writes carry the current version. Success uses the returned configuration and invalidates history, member candidates and affected member/fee caches. A 409 refetches canonical configuration; bank drafts survive failure.
- Bank input uses shared validation, strips display spaces in account numbers, normalizes the holder, and sends a complete account or null when fully cleared. The Save control appears only while editing (Q-V46-801-8).
- Initial prototype card screen was opened and visually inspected in Chromium before implementation; fixed slots/revoke-first behavior follows D-120 rather than mutable/deleted prototype cards.

## Evidence

- New unit cases: configuration components **10**, director query/mutation hook **6**, URL model **1**, query wiring **1** = **18**.
- Root `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm depcheck`: exit 0 after the final source changes. Root unit **2010 passed + 2 existing S3 skips**: shared 619, server 248, Admin 566, Portal 418, UI 56, integrations 103.
- Depcheck: no violations, 2243 frontend/shared/e2e modules and 1000 server modules.
- `pnpm build`: **3/3 tasks successful**, exit 0; Portal cached, Admin/server built. Frontend uses existing `NEXT_DIST_DIR=.next-v46-msw-build` and MSW mode, isolated from HOLD frontend outputs. No service restart or `.env` modification.
- The previously live full `pnpm test:int` runner finished with exit 0: DB **125/125** across 26 files; server **1750/1750** across 186 files, **1875 integration cases** total, 2/2 tasks successful (25m21.17s). This includes the native regional lifecycle and 10k query suites. Integration runs remained serialized on the test DB/Redis db 2; this Admin work did not modify shared/native fixtures while that runner was active.
- Lint exposed oversized component functions during implementation. Bank/appointment logic moved into hooks, card header/assignment/member selector into components; the 80-line function rule was not disabled or raised.

## Not yet proven / next work

1. Regional MSW domain/handlers/persistence and shared/native demo fixtures (m3, m9, m10). The new UI has **no fake fallback**; until handlers exist, MSW configuration reads fail and show the retry state. Component mocks are test fixtures, not runtime data.
2. Member/fee snapshot restoration metadata must be persisted with regional mock state, not just `db.fees`. Preserve native `regional_director.*` audit names when extending snapshot filters; restoring a snapshot must not replay mail/audit effects.
3. P9 Admin fee filters/status breakdown, P16 automatic template presentation, P17 rendered permission parity. Dedicated appointment/revocation mail relay → fake provider → browser login-link evidence remains missing.
4. Browser behavior in both MSW and native modes, full MSW E2E count gate, parity ≤3% at 1440/390 and saved full EXPLAIN metrics. No browser or parity PASS is claimed by these unit/build/integration results.

No TIP-DONE claim, no V46-802 work, no merge. Native HOLD processes and dev data were not changed.
