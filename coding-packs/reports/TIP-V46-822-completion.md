# TIP-V46-822 — Admin profile / in-session password

**Status: DONE — implementation, all six acceptance criteria and local verification complete. Owner PR/image review pending; no merge/release performed.**

- Date: 10/11/2026. Branch: `feature/TIP-V46-822-admin-profile`, based on `dev` `cc17d6a1`.
- Source commit: **`b843efb0`**. No merge, auto-merge or main release performed.
- Pull request: [PR #118 → dev](https://github.com/duymt-dev/OPCHUB/pull/118); owner reviews/merges.
- Approved scope: TIP-V46-822, RB-R02/RB-R03, REQ-322/323/351, D-52/D-89, SEC-R01, NA-26.
- Dependency: TIP821 `c5848a37` is an ancestor (`git merge-base --is-ancestor` exit 0); financial flows untouched. No parallel agents/worktrees.

## Delivered

### API, security and persistence

- `AdminMe` / login / refresh now include `phone` and `avatarUrl`, with nullable defaults for legacy payload compatibility. Session repository selects only required columns.
- New **PATCH `/v1/admin/auth/me`** updates only the token subject's name/phone/avatar. Shared strict zod rejects caller-supplied id/email/role/unknown keys; names/phones/URLs bounded. Blank phone clears to null. Full Admin session required, but no menu permission: even an Admin with zero menu grants may edit themselves. Member realm, restricted setup, locked/deleted accounts are refused.
- New **POST `/v1/admin/auth/change-password`**, throttle **5 / 60s**. Shared zod enforces strong/different/matching passwords; server verifies current Argon2 hash and reports errors at the correct field. Exact password bytes are preserved, including HTML-like characters.
- Conditional password-hash write + incremented `perm_version` + revoke **all** old refresh chains + audit + durable `admin.session_changed` outbox share one transaction. Newly issued access/HttpOnly refresh cookie keeps the initiating browser signed in. Existing first-password/2FA/reset flows remain unchanged.
- Outbox worker consumer re-reads the latest Admin version and uses a monotonic Redis Lua write: replay cannot restore an older security version. Admin has no socket realm; no Portal session event is sent. Payload contains only Admin ID, never credentials.
- Profile saves audit `admin_account.update_profile`; password saves audit `admin_account.change_password`, summary “đổi mật khẩu quản trị cá nhân”. No password/hash in audit payloads.

### Avatar / GC

- Reuse the **existing presign + PUT** contract (`POST /uploads/presign`), not the TIP's stale `/uploads/avatar` path (that endpoint does not exist). No new upload endpoint or storage provider.
- Client enforces JPG/PNG/WebP <=5 MB and reuses image compression/upload. Native `ImageRefService` verifies the uploaded object exists, has allowed MIME/size and belongs to the same Admin. External/foreign/missing/oversized/bad-MIME URLs rejected; unchanged legacy avatar accepted.
- Profile write locks the account row before reading the previous avatar, queues replaced/removed storage objects transactionally with reason `admin-avatar-replaced`. GC's batched reference query now includes `admin_users.avatar_url`.
- No migration or new table/index. Self reads/writes use existing PK/email indexes; Admin avatar reference check covers the small Admin directory. No new list/pagination query requiring large-row EXPLAIN evidence.

### Admin UI

- Admin-only `/profile`, protected by the existing `(admin)` AuthGate. Screen is an orchestrator; separate personal-info/password/security cards and mutation hooks. AntD cards/forms, shared UserAvatar/UploadImage, responsive desktop/mobile layout, translated labels, loading/field errors/toasts.
- Email and role read-only. Avatar upload/remove and save; name/avatar update the in-memory session and topbar immediately. Avatar text no longer overrides an existing image; removal returns name initials.
- Password success replaces the in-memory session and clears all password fields. No token/password stored in local/sessionStorage. Security card shows role/2FA state and links to existing `/two-factor` setup when needed.
- MSW uses the same shared contracts, persists to the same fake Admin account, verifies fake upload ownership/MIME/size, keeps setup restrictions and mirrors audit actions.

## Acceptance traceability

| AC | Verdict | Evidence |
|---|---|---|
| AC-01 | PASS | Both browser lanes click topbar “Hồ sơ cá nhân”, assert `/profile`, own email and role; schema/unit/native response fields |
| AC-02 | PASS | Real native self-only update/GET/audit and immutable keys; component store-sync test; both browser lanes save name/phone and observe updated topbar |
| AC-03 | PASS | Both browser lanes perform real presign/PUT workflow, save image, assert same topbar src, remove it and assert initials; native rejects invalid ownership/MIME/size/missing uploads |
| AC-04 | PASS | Native Argon2/version/old access + two refresh-chain revocations/new current session; relay/idempotent monotonic cache test; both browsers change password, clear form and navigate without logout |
| AC-05 | PASS | Shared, component, MSW and native wrong/weak/same/mismatch field checks; native 401/403/409/413/429, no failed-write audit/hash mutation |
| AC-06 | PASS | Native storage test enqueues an in-use Admin avatar, runs real `sweep` past grace, verifies object preserved; replacement/removal enqueue correct reason then unreferenced object is deleted |

Native file: `apps/server/test/admin-account/admin-profile.int.spec.ts` (11 cases), plus retained `admin-auth.int.spec.ts` and `admin-security.int.spec.ts`. Unit: shared `api/admin-auth.spec.ts`, Admin `features/profile/admin-profile.spec.tsx`, `mocks/admin-profile-handlers.spec.ts`. Browser: **same** `e2e/behavior/admin-profile.spec.ts` actions/assertions in both lanes; no target-specific weakening/skips. Historical test gaps receive only an additive TIP822 trace.

## Gate results / reproduction

All local gates below completed. No claim of hosted CI success.

| Gate | Result | Evidence |
|---|---|---|
| `pnpm lint` | PASS: 8 tasks, 6 cached | [lint](evidence/v46-822/lint.log) |
| `pnpm typecheck` | PASS: 8 tasks, 6 cached | [typecheck](evidence/v46-822/typecheck.log) |
| `pnpm test` | **2308 passed, 2 pre-existing S3 skips**; 6 tasks, 4 cached, 47.14s final gate | [unit](evidence/v46-822/unit.log) |
| `pnpm depcheck` | PASS | [depcheck](evidence/v46-822/depcheck.log) |
| Server build (API/socket/worker) | PASS | [server build](evidence/v46-822/build-server.log) |
| Admin production builds, native + MSW | PASS | [native build](evidence/v46-822/build-admin-native.log), [MSW build](evidence/v46-822/build-admin-msw.log) |
| Native profile/auth/security integration | 27 passed / 3 files (11 new + 16 regression), 38.13s | [native integration](evidence/v46-822/native-integration.log) |
| Native browser | 2 passed, 1.2m | [native behavior](evidence/v46-822/native-behavior.log) |
| MSW browser | 2 passed, 46.8s | [MSW behavior](evidence/v46-822/msw-behavior.log) |

Pinned pnpm 12.11.2 was invoked through a TEMP PATH shim to its installed Corepack executable because the global auto-manager path is broken. No repository package-manager change, dependency addition or hook bypass. Published logs are UTF-8/LF, trailing whitespace normalized; cached tasks are identified in the logs, not described as freshly executed tests. Unit totals: server276, shared757, Admin601, Portal476, UI72, integrations126 (+2 existing S3 skips). Admin601 ran freshly in the preceding full run (319.24s), then replayed unchanged in the final gate while server/shared reran. Final focused component/MSW rerun: **7 passed** ([focused log](evidence/v46-822/focused.log)).

```text
pnpm lint
pnpm typecheck
pnpm test
pnpm depcheck
pnpm --filter @opchub/server exec vitest run --project int test/admin-account/admin-profile.int.spec.ts test/admin-account/admin-auth.int.spec.ts test/admin-account/admin-security.int.spec.ts --reporter=verbose
pnpm --filter @opchub/server build
pnpm --filter @opchub/admin build
pnpm --filter @opchub/e2e exec playwright test -c playwright.tip823.config.ts --project=behavior behavior/admin-profile.spec.ts --workers=1
pnpm --filter @opchub/e2e exec playwright test --project=behavior behavior/admin-profile.spec.ts --workers=1
```

Last two commands use separately configured native/MSW environments and builds. The existing isolated native Playwright config intentionally retains its filename; no new orchestration dependency. Native build uses `.next-server-tip823`, MSW `.next-msw-tip823`. Build with `NODE_ENV=production`, correct `NEXT_PUBLIC_PORTAL_URL`, API origin and free local ports.

### Native isolation / issue caught

Reused the **separate native PostgreSQL16/Memurai cluster** provisioned during TIP823: PostgreSQL53790, Redis53791, API53792, Portal53794, Admin53795. Integration uses that cluster's `opchub_test` + Redis DB2; browser uses its `opchub_dev` + DB1. Existing 110 migrations and seed already present. Native tests use real PostgreSQL/Redis and a temporary local storage adapter; browser uploads use native local storage, fake external providers.

**Original PostgreSQL5432 DBs/services remain untouched**: no reset, migration repair, seed or schema mutation there. Only the independently identified isolated API process was restarted after rebuilding; PG/Redis retained for independent verification. `%TEMP%/opchub-tip823-native-current.json` records this local runtime; credentials/temporary runner are not committed. Original environment migration drift is not repaired by this TIP. After the final browser run, re-seeded only the isolated demo and cleared its Redis DB1 cache to restore the demo password: [restore log](evidence/v46-822/native-restore.log). Test-owned profile name/phone may remain.

Native E2E initially found that the new outbox event incorrectly required UUIDs although existing Admin IDs include legacy/demo text IDs. Transaction rolled back safely. Fixed event schema to match the established Admin ID contract, added a shared regression, rebuilt/restarted only isolated API, then both native browser cases passed. No assertion was relaxed to bypass that failure.

## Images / prototype

- Native: [desktop1440](evidence/v46-822/server-profile-1440.png), [mobile390](evidence/v46-822/server-profile-390.png).
- MSW: [desktop1440](evidence/v46-822/msw-profile-1440.png), [mobile390](evidence/v46-822/msw-profile-390.png).
- These are **Admin Profile** captures, unmasked and not edited. Agent inspected desktop/mobile layouts; browser checks no document horizontal overflow. Test-owned native name/phone may survive demo reseed, so counts/text are not forced to prototype constants.
- Prototype `docs/spec/index.html:7166` sends `umProfile` into **Portal**, forbidden for Admin by RB-R03. There is no corresponding Admin Profile screen for a meaningful pixel percentage. Implemented the layout expressly specified in TIP822 using existing shell spacing/cards; do not claim a fake parity PASS.
- Owner image/PR approval remains pending normal review (D-134); not asserted by the agent. Existing Portal profile, financial flows, first-password and 2FA design are not redesigned.

## Quality Gate — Self-review

- Scope, isolated realms, immutable identity/role, shared validation, transactional audit/GC/outbox, modular files and no added dependencies/migration checked.
- All six AC have actual native/browser/unit evidence; full lint/typecheck/unit/depcheck and builds pass. Source committed with normal hooks; feature branch only.
- No automatic merge/release; owner reviews the feature PR into `dev`. Original DB HOLD preserved.
