# TIP-V2-402C — server-owned Admin policy preview (V2Q-179)

## Header / authorized scope

Corrective API follow-up within the user's active P4 build goal; sequential on
`feature/V2-P4-affiliate`. Depends on TIP-402 policy API. REQ-308/312. No P5.
TIP-404 forbids implementing missing API fields inside its UI-only scope, so
this packet explicitly owns the additive API correction; UI consumption stays
in TIP-404 after this contract passes.

## Contract

- `GET /v1/admin/affiliate/policy/preview?rate=1..50`.
- Require `affiliate.view`, active Admin session and the existing global guards.
- Query rate is a required integer. Invalid/missing input returns the standard
  400 VALIDATION_ERROR envelope with a `rate` field; no silent default rate.
- Shared zod response `{ rate, feeAmount, commission }`, all integer VND where
  applicable. Use the existing commissionAmount floor semantics at the server.
- Current annual list price is **600,000 VND**, fixed by SRS/AGENTS and the
  membership_fee schema default. No configurable price setting exists in this
  app. Document this source explicitly; do not infer the list price from one
  agent's history, balance or an old customer's paid fee.
- This read-only preview does not persist the draft or change PUT policy,
  permissions, audit semantics, agent rates, bank or historical money.
- No DB read/write is necessary for a pure preview of the fixed list price.
  No new SQL, migration, env variable or dependency.

## Exact implementation boundaries

- Shared `api-domains/affiliate.ts`: additive query/response schemas and types.
- Server `affiliate/domain/policy-preview.ts` + dedicated unit spec: formula
  composition using existing `commissionAmount`, no replacement ledger math.
- Existing small Admin policy controller/service: validated guarded GET and pure
  preview delegation only.
- Admin MSW affiliate read handler: simulate this read-only endpoint using the
  same schema/price/formula semantics; apply the existing session guard first.
  No cross-origin ledger command is needed: this preview reads no mutable store.
- Dedicated native integration `test/affiliate/policy-preview.int.spec.ts`;
  expand the existing raw locked-session MSW read regression and native read
  guard route inventory. Add MSW response/validation cases in a dedicated spec.
- `plans/api-contract.md` and contract Admin/coverage specs: register the fifteenth
  Admin Affiliate route and current total 215; preserve full coverage checks.

## Acceptance and evidence

1. Viewer gets 20% → 120,000 VND and 27% → 162,000 VND; boundaries 1/50 work.
2. Missing/empty/zero/51/fraction/text rates return 400 with rate field errors.
3. Anonymous 401; member/action-only 403; locked previously issued session is
   denied; unlock restores access. Apply equivalent guards to MSW.
4. Preview leaves policy, selected agent rate, commission/paid snapshots and
   actor policy-update audit unchanged, checked against the native test DB.
5. Full lint/typecheck/unit/depcheck and Affiliate integration regressions pass;
   fresh server build passes. Record genuine failures as well as final output.
6. Follow-up UI must request the current valid draft rate, reject stale responses,
   display only server amounts, retain all three PUT fields and editable terms,
   and re-run shared MSW builds/browser/parity. API completion alone is not P4
   completion or a claim that the current three image failures are resolved.

Standards: backend/api-conventions, auth-rbac, nestjs-modules;
global/code-structure, git-workflow; database/query-indexing; testing/testing.
