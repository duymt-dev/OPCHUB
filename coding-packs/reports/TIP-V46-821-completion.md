# TIP-V46-821 — completion report

**DONE — implementation and functional gates complete.** Source Git commit: **c5848a37**; final evidence/documentation follows in the PR head. [PR #106](https://github.com/duymt-dev/OPCHUB/pull/106), base **dev**. No merge/main release or auto-merge performed. No CI checks were registered on this dev PR at verification; local green gates are not described as green CI.

## Scope and approved decisions

D-139 B7/B8/B9/B10, sequential implementation from dev714a1765. Q821-1 through10 approved in TIP; Q821-11 explicitly approved by owner: expiry creates/reuses a new pending renewal at current price and a new GV code, atomically with mail/outbox. Old paid code never reused; no activation until real payment and existing review flow. No agents spawned. B9 reversal/refund/negative share remains closed without code under NR-R01. B6/B17/B18 and additional live AI-provider verification remain outside scope.

CSV naming clarification Q821-12 has no owner response at report time. Baseline-preserving interpretation: export the existing visible affiliate code (ANOPC…), matching current table, prototype and SPEC17 same-visible-columns rule; header says “Mã affiliate”, not a falsely labelled TV code. This is not recorded as owner-approved. No money or permission rule depends on it.

## Delivered / acceptance evidence

### P0 — bank isolation

Regression first failed against unchanged code; isolated first fix5b06f3ec. Revoke snapshots valid retired bank into regional_payee_banks and clears the slot in the same transaction; appoint never inherits predecessor bank. Explicit retiree ledger takes precedence over old payout/revoke snapshots. New strict PUT /admin/regional-directors/:region/payees/:userId/bank uses affiliate.payout, eligible relationship checks, regional lock and last4-only audit. Existing /admin/gdv routes preserved. Admin dialog saves only on explicit Save; MSW mirrors lifecycle/ledger behavior. Focused original/new regression7 integration, mock9, dialog1 passed. Real native synthetic retired-payee journey confirms save200/audit/cleanup/incumbent invariance at1440/390: [evidence](evidence/v46-821-native-payee.json). Private dev diagnostic found3 occupied bank slots and0 suspicious inherited slots; **not a production audit**. Owner must inspect production for historical revoke/reappoint incidents; migration never guesses incumbent ownership.

### B8 — automatic revocation

Account-owned bulk lifecycle projection, FOR SHARE plus regional NOWAIT locking, existing revokeWithin transition and atomic fee/bank/audit/outbox effects. Indefinite lock revokes, temporary lock does not, unlock never restores; deletion revokes without mail. Retired prior payable shares remain payable, vacant future region receives100% Media Soft. Real relay/processor5-case coverage includes replay, lock retry and outbox rollback. Commit b6585db3.

### B7 — local signed QR and fundraising expiry

Approved MIT qrcode1.5.4 plus dev types1.5.6; local320px PNG, no remote QR API. MAIL_QR_SECRET in examples/Zod, mandatory production; domain-separated JWT fallback only dev/test. Signed canonical HMAC-SHA256 target, constant-time check,30-day expiry. Public image route60/IP/min, private cache; invalid/tampered/expired/paid/unknown404. Fee validUntil anchor invalidates old renewals, D1 image only; text bank fallback remains. T-14 current renewal price/end date enriched, expired fundraising adds new pending request/code and mail/inapp intent atomically, batched200 with locks/unique-open guard, existing pending reuse and paid/review exclusions. No automatic activation or extra milestones. Focused8 integration; independent ZXing-C++ decodes generated synthetic QR exactly ([proof](evidence/v46-821-qr-decode.json)); OpenCV alone did not detect it, so no false decoder claim.

Follow-up e348e586 masks QR bearer in Pino url/originalUrl/params/query, error paths and referer. Native404 probe confirms marker absent and health200 ([proof](evidence/v46-821-native-log-redaction.json)); targeted security/mail/client-log integration11/11. Email clients blocking images still have textual transfer data. Production must configure a stable MAIL_QR_SECRET before deployment.

### B10 — bounded logger, regional paging/export

Shared browser logger factory and thin app facades preserve local reportError; beacon max10/min/tab, fixed messages/allowlisted metadata, no query/stack/body/PII. Public strict endpoint20/min/IP, optional token verifies current auth/lock/version, warn/client label,204, no DB/Sentry. Backend current director relationship, active/nondeleted checks, no role-name authorization. Affiliate keyset50/page, backward-compatible first50 and more,24-month table unchanged. Order share DESC/name ASC/id ASC, validated bigint cursor; covering index plus LATERAL limited identity reads. No OFFSET. Aggregate rank is recomputed: **not** a claim of physical seek on a stored aggregate. CSV1000-row batches/cap20000+note, BOM/formula escaping, visible identity/province/statistics only, no email/phone, audited actual member actor. UI load more/retry/CSV,10 catalogs and MSW. Native130-row50/50/30 integration, export/audit/permissions, unit20k cap and browser mobile/read-only tests. [Query plans](TIP-V46-821-query-plans.md).

## Gate results and provenance

[Machine-readable summary](evidence/v46-821-gates.json). Actual local logs retained under test-results/v46-821-*. No claim every gate ran at one SHA.

| Gate | Final result | Source / evidence log |
|---|---|---|
| pnpm lint | PASS,8 tasks | c5848a37; ui-lint |
| pnpm typecheck | PASS,8 tasks | c5848a37; ui-type |
| pnpm test | 2265 passed,2 existing adapter skips | c5848a37; ui-unit;6tasks,4cached |
| pnpm test:int | 2315/2315 (DB145+server2170),0skip/cache;29m20.411s | 3bdce39b; full-int3 |
| Post-integration security change | targeted integration11/11 plus root lint/type/unit/depcheck | e348e586; security-* |
| pnpm depcheck | PASS, both graphs | c5848a37; ui-dep |
| Forced native/MSW builds | PASS,3 tasks each,0cache;48.990/48.567s | c5848a37; build-*-verified |
| Full MSW E2E | 403 passed,5 existing guarded skips,0fail/flaky;16.6min | c5848a37; msw-e2e-final |
| Focused native E2E | 6/6;38.3s, no seed/reset | c5848a37; native-e2e-verified |
| Retired-bank standalone browser journey | PASS, both viewports; separate from formal6 tests | c5848a37; native-payee |
| Migration empty chain/down/up | 109 migrations,3 new down/up, schema identical; disposable DB dropped | [proof](evidence/v46-821-final-chain.json) |
| Parity | 20 pairs measured,0journey errors; raw pixel exit1, D134 reference | [paired images/classification](TIP-V46-821-parity.md) |

Full integration preceded the log-only security hardening and final FE-only change; follow-up targeted integration covers security, final root unit/type/lint/build and both E2E lanes cover final UI. Integration was not rerun a second time after these narrow changes.

## Failures found and resolved, not hidden

- New payee FK exposed demo reset child ordering: delete child ledger before slots/users; synthetic seed regression10/10. Private native dev never reset/reseeded.
- Initial full integration exposed existing plan/exact deleted-identity assertions: restored production indexed LATERAL reads and omitted absent province. Assertions/plan constraints unchanged. A diagnostic long-running worker held the old cursor schema; fresh run proved overflow400. Final full integration green.
- Initial MSW run401passed/2failed: old zero-button expectation conflicted with approved CSV. Updated only exact Download1 and Save/Payout0 expectations. Final403passed.
- Actual mobile month wrapping was fixed, not excused as data. No prototype edits/masks/threshold relaxation; [parity report](TIP-V46-821-parity.md) distinguishes approved actions and fixture/canonical ledger differences from defects.
- An unquoted PowerShell reporter argument caused CLI parsing error before execution; quoted argument corrected.
- Prisma create-only diagnostic encountered pre-existing applied checksum mismatch20261115090000_v46_regional_mail_kinds. No old migration/metadata repair/reset. New additive SQL reviewed independently; deploy and entire109 migration chain passed.

## Migration / operation safety

New migrations20261120090000_v46_regional_payee_bank,20261120091000_v46_fundraising_expired_mail,20261120092000_v46_region_affiliate_projection all deployed to approved private dev/test only; down tested only on disposable opchub_v46_821_chain_test. Payee ledger PK(region,user_id) and user FK index; historical covering index and regional projection partial covering index. No foreign-key bypass, production planner forcing or production timeout increases. Existing /admin/gdv behavior and domain ownership preserved with separate controllers/resolvers/repositories.

Native private runtime now serves821: API4310/socket4311/Portal3710/Admin3711, DB opchub_v46_812_dev, Memurai6381 DB3. Integration opchub_v46_801_test/DB2. Original5432/6379/6381 and original HOLD3980/3981 PIDs/start times unchanged ([proof](evidence/v46-821-hold.json)); no claim of old API4300 continuity, none was listening at preflight. Current private health/login endpoints200; runtime remains HOLD, no shutdown. Synthetic payee fixture removed, incumbent bank unchanged; immutable audit intentionally preserved.

AI fingerprint and127-call count unchanged, encrypted custom key retained, all3bot flags disabled: [before](evidence/v46-821-ai-before.json), [after](evidence/v46-821-ai-after.json). **Zero live AI calls in821.** No credentials/real bank accounts committed.

## Verify / handoff

Run pnpm lint, pnpm typecheck, pnpm test, pnpm test:int, pnpm depcheck and the repository native/MSW build+Playwright configurations against explicitly approved isolated targets. Browse My Region at1440/390, load/export and verify no write controls; open noBank historical payee as authorized Admin and explicitly save; exercise indefinite/temporary lock/deletion and signed QR invalidation. Inspect the20 linked pairs and2 app-only dialog images. Never run down/reset against HOLD.

Ready for owner review of PR106 into dev. Release dev→main remains a separate owner-reviewed PR under D-139; no auto-merge enabled.
