# COMPLETION REPORT — TIP-V46-821

**STATUS: IN-PROGRESS — not DONE.** P0 implemented and regression tests collected;
B8/B7/B10 and the final full gate/browser/visual closure remain to be implemented.

## Scope / owner decisions

- Branch `feature/TIP-V46-821-finance-region`, approved TIP/defaults `502d2cc2`,
  based on dev `714a1765` (TIP820 merged). Sequential build, no agents spawned.
- Q821-1..10 approved as recorded in TIP; no repeated business questions.
- Owner confirmed private812 dev/private801 integration, Memurai6381 DB3/DB2,
  private820→821 rolling restart when needed and disposable821 chain DB.
  Original DB/Redis6379/native HOLD remain outside command targets.
- B9 closed without code: no refund/negative-share/reversal feature, NR-R01/D-110.
- No release/main merge; user requested feature PR into dev only.

## P0 — payee isolation

- Regression written first, executed against unchanged production: failed at the
  assertion that a replacement director must have no bank. Red log retained at
  `test-results/v46-821-p0-red.log` (1 failed,7.85s; synthetic fixture account only).
- Revocation records its snapshot, saves a valid retired bank by `(region,userId)`
  in the same transaction and clears slot bank fields. Appointment always clears
  the slot account, never guesses/reuses the old payee account.
- Current recipient uses only slot account; retired recipient uses explicit
  ledger before prior payout/revocation snapshot. Summary uses the same ledger
  precedence, avoiding a UI which still displays noBank after an audited write.
- New strict PUT `admin/regional-directors/:region/payees/:userId/bank` checks
  `affiliate.payout`, retired relationship or pending shares, locks regional slot,
  saves and audits atomically with last4 only. Current-director bank remains the
  existing regional configuration flow, not the retired-payee route.
- Admin noBank retired-payee button/dialog reuses existing bank fields and explicit
  Save; mutation invalidates regional share summary. MSW matches clearing/ledger
  behavior and preserves only valid bank snapshots across its existing bridge.

### Technical file-list connections

- Existing Admin director route is `/admin/gdv`, not `/admin/regional-directors`.
  Dedicated thin payee-bank controller preserves all old paths while implementing
  exactly the new TIP path, without aliasing unrelated existing endpoints.
- Added repository isolates payee-ledger queries; summary repository must read
  ledger too. Account Prisma relation and userId FK index are required for the
  new table. Audit manifest adds the actual new action, no exemption/test weakening.
- New separate mock module avoids cycles; existing bank snapshot helper validates
  empty accounts before bridge persistence. Admin currently has only vi domain
  catalog (other locales reuse it outside auth); new label follows that structure.

### Evidence so far

- Real P0 + existing payout integration:2files/7cases PASS (14.32s), including
  new-director409 until new bank, old payout retained, strict400/403/404/413 and
  masked audit. Dialog focused unit1/1 PASS; shared new+legacy mock9/9 PASS.
- Migration `20261120090000_v46_regional_payee_bank` deployed to both approved
  private DBs.107 migrations empty-chain deploy →821 down →821 up: normalized
  schema identical; owned chain DB dropped. No down/reset on reused DBs.
- Create-only diagnostic again refused **pre-existing** modified applied checksum
  `20261115090000_v46_regional_mail_kinds`; no reset, historical migration edit or
  metadata repair. New additive SQL/down reviewed/authored separately.
- Private dev data check:3 occupied slots with bank;0 suspected inherited regions.
  Counts only, no account details printed; not a production audit and not proof
  production has no affected director. Owner should inspect production if needed.
- AI fingerprint before work: bot flags false, encrypted custom key retained,
  real-provider call count127. No live-provider calls authorized/used by this TIP.
- P0 commit gate: root lint8/typecheck8 PASS; full unit2248 passed+2 existing
  adapter skips (6 tasks,5m5.156s); focused current mock9/9 and typed dialog1/1.
  Depcheck both graphs PASS; no assertion or timeout relaxed. Initial test-only
  matcher typing and required new-route audit-manifest entry were corrected.

## Remaining

B8 automatic revocation, B7 mail QR /
fundraising reminders, B10 logger/paged affiliates/CSV; SQL plan evidence, full
lint/typecheck/unit/integration/depcheck/build/E2E/parity, final report, clean
commit/push and review PR into dev. No claim of task completion at this stage.

## B8 progress

- P0 committed/pushed separately as `5b06f3ec` before starting B8.
- Account lifecycle port has optional deletion effect, dispatched by the real
  AccountProcessor after durable session invalidation. Other domains' deletion
  behavior is not broadened. Regional effect registers via existing registry.
- Account-owned public directory bulk reads/locks lifecycle snapshots; regional
  repository bulk locks eligible occupied slots NOWAIT. At most the three fixed
  permanent slots use the original transactional revoke/fee/bank/audit/outbox
  transition; no unbounded per-user query loop or cross-domain repository read.
- Indefinite lock only; temporary lock retained; deletion always revokes. System
  actor/role are literal `system`. Optional reason remains legacy-compatible;
  absent reason is manual in mail/notification rendering. Deleted accounts get
  history only, never revoked mail. Unlock does not appoint.
- Real scoped relay tests execute production Account/Regional processors,
  actual DB leasing/mark/backoff and replay, not Prisma mocks or unrelated old
  outbox. Initial B8+legacy appointment19/19 PASS; final expanded B8 suite5/5
  PASS including transactional rollback (7.06s). Root lint8/typecheck8 PASS,
  full unit2249+2 existing skips PASS (4m14.275s), depcheck both graphs PASS.

## Additional owner-approved B7 connection

- Q821-11 approved: expired paid GV code cannot be reused for a new payment.
  Expiry job creates/reuses a **new pending renewal request with a new code**
  and current price before sending its QR in the same transaction. It never
  activates/extends without actual bank receipt. Owner explicitly approved
  “Duyệt tạo khoản chờ gia hạn mới khi hết hạn”. No QR may target the old paid code.

## B7 progress

- Locally rendered PNG320x320/M via approved pinned qrcode1.5.4 (MIT), no QR/image API.
  First-party HMAC30day URL, strict shared token schema, production MAIL_QR_SECRET
  required (>=32 chars), dev/test domain-separated JWT-key fallback. URL credentials
  are removed from access logs by a narrowly scoped request serializer.
- Domain resolvers read current invoices without mail->project/fee circular imports.
  Fee PK is userId: signed expiry anchor identifies the unpaid renewal occurrence;
  payment/new expiry invalidates its image. D1 only adds image; bank/text/OPCHUB
  fallback remains. Malformed/tampered/expired/unknown/paid targets all return404.
- T14 now includes project/date/current renewal price and no QR. Expiry transition,
  new pending GV request, mail and in-app outbox are atomic. Project lock plus
  unique open-request constraint and bulk sequence allocation prevent duplicate codes;
  pre-existing pending requests are reused. No activation or extension before receipt.
  Rejected paid requests remain blocked under D-113 rather than charged again.
- Mail kind fundraising_expired migration is additive; its down retains mail history.
  108 migrations deployed from empty disposable chain DB; both new821 migrations
  down/up produce identical normalized schema; temporary DB dropped.
- Final B7 integration3files/8cases PASS, including pending-code reuse through real
  member start(), rollback on mail failure and concurrent expiry workers. Root
  lint8/typecheck8, unit2254 passed+2 pre-existing adapter skips (6m42.564s),
  depcheck both graphs PASS. One typecheck invocation omitted frontend mock/API env
  and failed config validation; rerun with explicit MSW env passed, no code exemption.
- Independent local ZXing-C++ decoder read generated synthetic PNG and reproduced
  the exact EMVCo payload (hash/dimensions evidence), not merely PNG headers or an
  encoder-to-itself comparison. OpenCV could not detect this valid code; independent
  ZXing verification succeeded without adding any decoder dependency to the app.
- Technical extra files: resolver registry/ports preserve domain ownership;
  bulk renewal repository/delivery isolate approved Q821-11 from legacy scheduler;
  account directory supplies bulk contacts; masked access logger protects signed URL;
  Admin mail-kind label and enum schema expose the actual new kind.

B10 is in progress. Full final integration/build/E2E/parity and report closure remain.

## B10 progress

- First-party Portal/Admin logger preserves local reportError, sends at most10
  beacons/minute/tab, strips query and dynamic route segments, uses fixed safe
  operation labels instead of forwarding arbitrary Error.message/stack/context.
  Server strict public endpoint throttles20/minute/IP, defensively sanitizes again,
  warns with client label; optional bearer session must pass signature and current
  Redis lock/version checks. No database log sink, Sentry or third-party transport.
- Regional affiliates retain historical financial scope/order, keyset50-page API,
  legacy first50/more, existing24-month cap. Current director relationship plus
  active/not-deleted status is checked from DB; non-director/locked/revoked403.
- CSV batches1000/cap20000, BOM/formula-safe, no contact columns; actual member
  actor audited under regional.affiliates.export. UI loads more with preserved rows
  on error and explicit download; all10 catalogs and MSW mirrors updated.
- Province display/CSV reuses D-128 earliest group through late join, not business
  registration province. Existing table code remains affiliate code, unchanged.
- Integration2files/6cases PASS (130-row paging50/50/30, strict cursor/limit,
  CSV/BOM/no contacts/audit, real auth permissions and logger throttle). Focused
  FE6/6, shared mock7/7 and backend hard-cap1/1 PASS. Root lint8/typecheck8,
  unit2262 passed+2 existing adapter skips (6m21.675s), depcheck both graphs PASS.
- All109 migrations from empty disposable DB, allthree new821 down/up, identical
  normalized schema; temporary DB dropped. New index deployed to private test/dev.
  Real10k-row EXPLAIN uses actual production builders; scope index-only, zero heap
  fetches in vacuumed state. Aggregate ranking still requires scoped aggregation,
  not a claimed seek on stored totals. See query-plan report/raw JSON.
- Technical extras: shared browser factory/export avoids divergent logger security;
  API download helper handles binary CSV separately from existing JSON parser;
  separate paging service/projection and covering-index migration avoid expanding
  existing domain files. System HTTP sink is REST-only; original housekeeping core
  behavior is unchanged. New browser E2E is authored; execution remains pending.

Code milestone only. Final full integration, both builds, full MSW E2E, focused
native E2E/parity and final evidence/report/PR readiness remain; NOT DONE yet.

## Full-gate seed connection repair

The first root integration attempt stopped in DB seed tests: the new P0 payee-bank
FK correctly prevents deleting a parent slot before its ledger child. Fixed only
approved demo reset ordering (delete new ledger before slots/users) and added a
regression that seeds a synthetic child before resetting. Existing assertions,
DB guards and production FKs remain unchanged. Focused seed integration10/10,
DB lint/typecheck PASS. This reset was executed only on approved integration DB,
never on private native dev/HOLD. Full root integration must be rerun.

## Regional regression closure before final fresh full run

- Full root attempt2 ran all145 DB +2170 server cases (31m20.194s), with3 failures.
  Existing query-plan assertions caught normal identity joins scanning affiliates;
  restored narrow LATERAL LIMIT1 lookups in production, no assertion/fixture changes.
- The exact deleted-account row assertion also caught an unnecessary new empty
  province property. Absent province is now omitted in both native/mock responses,
  preserving legacy shape; CSV still writes a blank province cell. Assertion kept.
- Newly added malicious bigint cursor test observed the long-running worker's old
  schema during that diagnostic run. Fresh focused execution verifies overflow400
  with bounded shared schema (not SQL500), no status expectation relaxed.
- Fresh5-file regional integration14/14 PASS (30.05s), including unchanged deployed
  plan/limits,130-row paging/CSV/permissions and P0/B8. Shared schema/mock8/8 PASS.
  Updated10k actual-query plans captured after the identity fix; fixture cleaned.
- One final fresh root integration run and closure/build/E2E/parity remain. No DONE
  claim based on the failed full run or the focused rerun alone.

## Final core gates and log-hardening follow-up

- Fresh full root integration on3bdce39b:145 DB +2170 server =2315/2315 PASS,
  no skipped cases or cache,29m20.411s. Final root lint8/type8/unit2263+2 existing
  adapter skips/depcheck and forced native+MSW builds all PASS.
- Private runtime rolled820->821; original PG5432/Redis6379/Memurai6381 and old
  MSW HOLD3980/3981 preserved. All5 private HTTP health/login checks return200.
- Native log inspection then identified Pino also copies the signed path into
  params/query. Extended the existing new QR sanitizer to cover those copies and
  originalUrl, including case-insensitive routing; error-filter paths use the same
  helper. Referer is redacted so following a signed image cannot echo it later.
  No endpoint/error status or unrelated path semantics changed.
- Post-hardening root lint8/type8/unit2264+2 existing skips/depcheck PASS;
  fresh mail/error-envelope/client-log integration3files/11cases PASS (16.95s).
  Existing assertions/timeouts were kept. Builds/runtime and browser gates are
  being refreshed; no all-gates/single-SHA/DONE claim yet.

## Browser/parity UI correction

- First full MSW run:401 passed,5 pre-existing skips,2 failures (16.9m), both the
  old read-only test's blanket zero-button assertion. TIP821 intentionally adds
  the read-only CSV export. Updated exactly that expectation to one named export
  and still explicitly zero save/payout actions; all other assertions kept.
- Native final build focused journeys3/3 PASS, no reset/seed. Native signed-URL
  log probe proves URL/params/query/referer contain no synthetic bearer marker.
- Initial native parity measured14 pairs (the ID selector also includes related
  prefix scenarios):8 under3%,6 above. Actual images revealed a pre-existing
  mobile month column squeezed to44px. Fixed only the three fixed widths to
  prototype150/120/120, leaving90px at the480px minimum and a flexible desktop
  month column. Added unit and real-browser width regression. No masks/baselines
  or threshold changes. Province remains in CSV/API, not added to prototype row text.
- Post-UI root lint8/type8/unit2265+2 existing skips/depcheck PASS. Source changes
  are confined to the regional components and their browser regression; no ledger,
  configuration or fee mutations. Both builds/full MSW/native/parity are refreshed
  next; previous raw parity measurements are not presented as final results.
