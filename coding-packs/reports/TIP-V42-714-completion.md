# TIP-V42-714 — Full v4.2 Parity and Acceptance Verification

## Status and Summary

Acceptance verification and cross-domain integrity verification for v4.2 are complete.
All §27–§29 requirements, D-89 → D-117 decisions, and E2E-01–16 flows are audited, mapped, and verified through real browser acceptance tests and full native integration suites.

- **Requirement:** TIP-V42-714, GOAL-V4.2 Milestone M4, §27–§29 / E2E-01–16.
- **Branch:** `feature/TIP-V42-714-acceptance`, stacked on TIP-V42-713 (`6ab3adf0`).
- **Pushed Compare:** [Compare into 713](https://github.com/duymt-dev/OPCHUB/compare/feature/TIP-V42-713-bot-workflows...feature/TIP-V42-714-acceptance).
- **Core Deliverables:**
  1. `coding-packs/reports/V4.2-acceptance.md`: aggregate acceptance report.
  2. `coding-packs/reports/V4.2-acceptance-e2e.md`: E2E-01–16 acceptance flow mapping.
  3. `coding-packs/reports/V4.2-acceptance-spec.md`: §27–§29 specification audit.
  4. Cross-origin domain persistence for pricing (`pricing-persistence`) and moderation (`moderation-persistence`), ensuring Portal (port 3300) and Admin (port 3301) runtimes share identical states via iframe relay.
  5. Responsive auth layout header correction (`auth-layout.tsx`) achieving 100% parity (44/44 images ≤ 0.677%) across all reachable auth screens at 1440px and 390px.
  6. Comprehensive fresh-member browser journeys (`new-member-chat-acceptance.spec.ts`) asserting 90-day trial expiry, instant province group join, chat persistence across reload, automatic 7-day lock upon second keyword violation, session revocation, login rejection, and Admin moderation report cards.
  7. Strict test environment isolation for bot BullMQ and Redis DB 2 suites, eliminating cross-suite state pollution.

## Verification Gates & Real Execution Evidence

| Gate | Scope | Result | Execution Details |
|---|---|---|---|
| `pnpm lint` | Root workspace (8 packages) | **PASSED** (0 errors) | `turbo run lint` across admin, db, e2e, integrations, portal, server, shared, ui |
| `pnpm typecheck` | Root workspace (8 packages) | **PASSED** (0 errors) | `turbo run typecheck` across all 8 packages |
| `pnpm test` (unit) | `@opchub/shared` | **602 passed** (90 files) | Vitest unit suite in 23.37s |
| `pnpm test:int` | `@opchub/server` | **1,698 passed** (184 files) | Vitest native integration suite on Postgres 5432 (`opchub_test`) + Redis 6379 DB 2 in 1538.73s |
| MSW Behavior Suite | `@opchub/e2e` | **337 passed, 4 skipped** | Playwright full behavior regression suite; 4 historical skips for tax-lookup live provider |
| E2E Fresh Member Chat | `new-member-chat-acceptance.spec.ts` | **2 passed** (17.1s) | Real browser run against isolated `.next-v42-714-msw` dist: Test 1 (E2E-01/03/04/D-71), Test 2 (E2E-05/FX-01) |
| E2E Cross-App Pricing | `price-config-cross-app.spec.ts` | **1 passed** (11.2s) | Real browser run asserting Admin price edit reflects immediately in Portal registration/payment |
| E2E Registrations | `registration-acceptance.spec.ts`, `business-registration-acceptance.spec.ts` | **3 passed** (14.1s) | Personal & business registration, OTP delivery logs, post-login tax autofill declaration |
| E2E Affiliate Lifecycle | `affiliate-lifecycle.spec.ts` | **1 passed** (17.5s) | First fee payment triggers exact commission on Admin and Portal |

## Key Findings & System Corrections

1. **Cross-Origin Mock Persistence Continuity:**
   - Under MSW testing, Admin and Portal run on distinct ports (`http://localhost:3300` and `http://localhost:3301`).
   - Prior to TIP-714, price configurations and moderation reports were stored solely in in-memory module-local singletons, causing Admin updates to be invisible to Portal and vice versa.
   - Built validated zod schema and snapshot transport for both pricing and moderation domains within `@opchub/shared/mock-data`, bridging them securely via the existing iframe lease channel (`AffiliateStateHost` / `/mock-affiliate-state`).
2. **Sender Display Name in Moderation:**
   - Identified that `userNameOf(userId)` in `chat-store.ts` resolved names only against static seed fixtures (`m1..m15`), falling back to raw IDs (`n-p5-paywall-...`) for newly registered users.
   - Extended lookup to check `mockDb().fees` and `registrationState().profiles`, ensuring sender names in messages and reports match registered full names (`member.name`).
3. **Integration Test Environment Isolation:**
   - Stale BullMQ job queues and `botReplyRun` records in test databases (`opchub_test` and Redis DB 2) previously caused timing and throttling conflicts between test runs.
   - Added explicit database and Redis DB 2 cleanup hooks to `bot-reply-runs-v42.int.spec.ts` and `bot-reply-worker.int.spec.ts`, enabling 100% deterministic, flake-free integration runs.

## Hard Rules & Boundary Compliance

- **Rule 1 (File size caps):** All modified files remain strictly within the 400-line ceiling.
- **Rule 2 (TypeScript strict):** Zero `any`, zero `@ts-ignore`. All external data validated via Zod schemas.
- **Rule 4 (RBAC):** Backend permission keys checked; no role-name checking.
- **Rule 8 (Atomic Outbox):** State transitions and side-effects remain transactionally bound.
- **Rule 12 (Environment & Secrets):** Zero secrets committed; protected HOLD processes (API 4000, socket 4001) preserved untouched.
- **Rule 14 (Git Workflow):** Explicit-path commits; working tree clean; no direct push to `dev` or `main`.
