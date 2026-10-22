# P5 findings ledger (not the historical W1/P4 counts)

| ID | Severity | Finding | State | Regression |
|---|---|---|---|---|
| P5-RT-01 | S2 | Global PubSub channels allow native/test packet crossover despite separate Redis DBs | FIXED source/focused native; deployment + full acceptance pending | TIP-504: cross-DB control, same-DB socket and persona publication |
| P5-RBAC-01 | S2 | Large valid permission matrix rejected because generated audit summary exceeds 500 | FIXED source/focused native; full acceptance pending | TIP-505: valid 50 roles, invalid 60, complete diff |
| P5-TEST-01 | S3 | B5 still checks retired approve audit and can falsely match historical rows | FIXED scoped regression | TIP-506: exact current actor/script scheduling audit |
| P5-SQL-01 | S3 | Correlated simulated/hidden filters lacked real global B-tree prefix bounds; a predicate-only index could lose to Seq Scan | FIXED source/native105/105; full repository/browser acceptance pending | TIP-508: >20k mixed rows, actual SQL/counts, unchanged no-Seq assertion plus stronger Index Cond assertion; no final fixture rebuild or planner hints |
| P5-MAINT-01 | S3 | Production index-bloat monitoring/reindex policy is not established by this query benchmark | DISCLOSED maintenance debt; not a functional hide blocker, no dev/VPS maintenance performed | Native test index measured485 pages/40 tuples after aborted fixtures; diagnostic rebuild failed broad regression and was removed from final tests; seek-index fix documented in TIP-508 |
| P5-BOT-UI-01 | S4 UI | Bot emergency bar adds a padded 62px band inside the padded bot card (D-36..D-41) | FIXED TIP-V2-560; remaining D-36 390/D-37/D-39/D-41 diff recorded in DV-V2-P5-1, P-01-BOTCARD blocked | debt test native before 2fail/after 2pass, MSW pass; native D-36 1440 6.18→2.03% |
| P5-SQL-02 | S3 | New nullable execution identity index displaced ordered prune and visibility read paths | FIXED source/native121/121; full repository/browser acceptance pending | TIP-509; original prune assertions unchanged, real response/count/preview plan fixture, focused19/19 |
| P5-MSW-01 | S3 | Mock Chat accepts missing/cross-room reply targets and invalid-target idempotent replay instead of native404 | FIXED source/HTTP/forced repo units; P5/browser acceptance pending | TIP-510: all three404 regressions retained; valid reply workflow still passes; full units1014 +2 existing skips |
| P5-MSW-02 | S3 | Mock moderation hide does not hide linked messages/close siblings/audit; reads/writes bypass native permissions; keyword duplicates are case-sensitive | FIXED bounded source/HTTP/shared gates; human warn/lock/live/browser acceptance not included | TIP-511: original five failures retained, expanded19/19; forced units1052 +2 existing skips |
| P5-TEST-02 | S3 | Dashboard negative prototype-label fixture conflicts with real demo member m5 persisted by DB seed | FIXED focused native6/6 and uncached full integration1300/1300 at6ce5094b; browser acceptance still pending | TIP-512: all original assertions retained, explicit temporary fixture with finally restore, batched DB identity checks and positive same-name/company + DB-rename HTTP control |
| P5-MSW-03 | S3 | Mock tick never admits due scripts; manual turns use stale snapshotted delay instead of live script spacing | FIXED bounded source/shared13/13 + Admin HTTP2/2; full browser acceptance pending | TIP-513: seven original failures retained; due order/one-shot/rearm/capacity/GC/paused manual/dedupe/reset/emergency controls; complete mock auto/limits/live bridge still pending |
| P5-MSW-04 | S3 | Legacy mock bot run/stop/CRUD handlers lack native permissions and successful-command actor/ID audit boundaries | FIXED bounded source/HTTP54/54; native/browser/storage/avatar acceptance not established by this cohort | TIP-514:17 original failures unchanged, full read/write guard matrix, per-request grants, exact actor/ID and no failed audit, native body byte limit/status/DTO controls |
| P5-MSW-05 | S3 | Script worker invents invalid destinations, ignores durable daily/shared group quotas, and todayCount accumulates across VN days | FIXED bounded source/shared14/14 + two HTTP workflows; full browser acceptance pending | TIP-515: six original failures unchanged; real default IDs/deletion, atomic multi-room quota/rate, cache loss/pruned metadata/global-ID fence, script/reply midnight counts and all-time postCount |
| P5-MSW-06 | S3 | Resolved human warnings have no notification or captured sender/room identity after source removal | FIXED bounded shared11/11 + two HTTP workflows; human lock/ghost seed/live browser acceptance still open | TIP-516: two original failures retained, actual sender not display name, typed deferred jobs, report identity/retry/retention/read/timestamp controls |
| P5-NTF-01 | S3 | Native moderation warning retries create duplicate notifications without stable identity | FIXED for new report-correlated events, focused native14/14; legacy payloads without reportId retain old semantics explicitly | TIP-516: original failing native row assertion unchanged; same-case retry once, different-case/same-message twice; compatible optional reportId payload |
| P5-MSW-07 | S3 | Moderation lock leaves sender active; locked login/refresh succeeds and unlock resurrects old sessions | FIXED scoped runtime/domain/HTTP; D-55/project visibility/cross-origin/live socket/ghost seed still pending | TIP-517: original4 HTTP failures unchanged; shared12, Admin29/Portal8 cohorts; exact captured target/reason/audit, epoch revocation and guarded status endpoints |
| P5-MSW-11 | S2 | Locked member owned groups never transfer; Chat keeps static owner privileges | FIXED source/focused shared+HTTP; live/browser acceptance pending | TIP-518 original4 failures retained; shared12/12; Admin7/7 + Portal1/1; native lock6/6 |
| P5-GROUP-01 | S2 | Native metadata PATCH without owner silently replaces owner with editing Admin, inflates count | FIXED native focused; full acceptance pending | TIP-519 original HTTP failure retained; owner/count/no phantom notice and explicit transfer; native12/12 |
| P5-COPY-01 | S3 | Rendered bot controls still claim approval required and replies are drafts after D-50 | FIXED rendered/component/MSW; native browser pending | TIP-520 copy2 failures retained then2/2; MSW5/5 with stronger replacement runtime case |
| P5-HOURS-01 | S2 | Canonical persona form all-day option rejected by shared hours parser, so native/MSW worker skips eligible turns | FIXED shared/native focused/MSW browser; full acceptance pending | TIP-521 six original failures retained; shared11/11, native unit35/35, native worker/reply16/16; unchanged browser publication assertion now passes |
| P5-AUTH-01 | S2 | Clicking signup while public settings are unresolved navigates into registration even when closed | FIXED source/hook/unchanged MSW negative; post-fix native/full acceptance pending | TIP-522 three original failures retained; delayed/error/cached controls4/4 and unchanged A-11 browser negative passes |
| P5-E2E-FLAKE-01 | S3 | UAT-11 second login after password reset times out in a22case MSW cohort; unchanged standalone case passes | OPEN intermittent, not closed by isolated retry; full rerun/triage pending | TIP-522 browser-focus21pass/1fail and standalone1pass retained |
| P5-NATIVE-CONFIG-01 | S3 | Native Next demo-account flag on contradicts V2Q-163 | FIXED native configuration/scoped10/10; full native rerun pending | Full native217/221; MSW off221/221; TIP-503 progress |
| P5-BOT-FIXTURE-01 | S3 | Empty-history browser fixture allows legitimate automatic threads | FIXED scoped both lanes; full reruns pending | TIP-524 native seed2/2, identical browser5/5 each including empty and separate explicit auto-positive; original assertions unchanged |
| P5-AFF-A11Y-01 | S2 provisional | Payout loading icon changes exact accessible action name and prevents same-dialog browser retry | FIXED scoped both lanes; full native rerun pending; no backend payout failure inferred | Unchanged native focused1pass/1fail; dedicated loading-name regression fails before, focused component11/11 after, native10/10 and MSW2/2; financial assertions unchanged |
| P5-DASH-FIXTURE-01 | S3 | Old Dashboard browser setup creates human replies, not required persisted bot openings | FIXED scoped both lanes; full native rerun pending | TIP-526 actual Admin publication, unique body/F5/group/time/navigation; nativeDashboard3/3, MSWcross-app11/11; no synthetic card or weakened navigation assertion |
| P5-MSW-AUTO-01 | S2 | MSW autoGenerate has no automatic admission/runtime effect | FIXED scoped domain/browser; full acceptance pending | TIP-524 original5fail/8control pass retained; expanded33domain controls; native/MSW5/5 each |
| P5-BOT-PATCH-01 | S2 | Partial bot settings schema defaults omitted generation/reply toggles to true | FIXED shared/native/MSW focused; full acceptance pending | TIP-525 schema5beforefail+1control, native3beforefail; native7/7 after, same browser5/5 each and final root1244+2existing skips |
| P5-MSW-PERSIST-01 | S2 | Per-page bot/chat state loses Admin publication and execution checkpoints across Portal/F5 | FIXED scoped bot/chat; wider community/live acceptance pending | TIP-526 relay3beforefail/1control, persistence41/41, actual cross-origin body/F5/navigation; full post-change rerun pending |
| P5-MSW-DIAG-01 | S4 diagnostic | Empty WebServer Error after successful MSW11case teardown, exit0 | OPEN unclassified diagnostic; browser runtime audit/reproduction required, no product failure inferred | evidence/v2-526/526-msw-cross-app-browser.log retains the line after11passed |
| P5-QUEUE-01 | S2 | Bot producer combines fixed timestamp with later delay clock, so BullMQ deadline can precede persisted nextAt | FIXED source/deployed/focused native/full integration; final browser acceptance pending | TIP-529 deadline2/2 and worker cohort18/18; deployed p5-529; TIP-536 fresh full server1295/1295 + DB23/23 at7cd23214; original full failure retained |
| P5-MSW-LIVE-01 | S2 | Open Portal chat never receives a reply committed by the separate Admin mock runtime without F5 | FIXED scoped both lanes; complete acceptance pending | TIP-530 original MSW failure retained; same case passes in MSW11/11 and native1/1, shared13 +Portal3 lifecycle controls; no history polling/assertion split |
| P5-TEST-HISTORY-01 | S3 | Fixed05:00 fixture claims all10 context rows are another persona although real HTTP question becomes newer | FIXED scoped chronology and complete integration | TIP-531 original scoped13pass/1fail; after15/15 including newest-human control; TIP-536 fresh full server1295/1295 + DB23/23 at7cd23214; originals retained |
| P5-MSW-LIFECYCLE-01 | S2 | MSW notification events remain pending awaiting nonexistent port replies; worker activation disappears at5minutes and API falls through to HTML404 | FIXED ed9dbccc, source boundary and unchanged canonical browser regression; full behavior acceptance pending | TIP-535 generated-worker before8fail/2controls then10/10; canonical MSW10/10 includes full3turn10.2min and member reply; original532/533 failures retained; native same lifecycle already PASS |
| P5-TEST-DASH-TIME-01 | S3 | Dashboard fixtures mix a calendar-fixed clock with current demo/HTTP timestamps, breaking earliest-preview and newest-root premises | FIXED scoped test preconditions/clock/isolation and complete integration | TIP-534 preview5/5; TIP-536 scoped16/16 then fresh full server1295/1295 + DB23/23 at7cd23214; original failures retained, no production query change |

Raw failures remain in report evidence. Focused 62/62 is not full-suite or browser
acceptance. P4-approved cosmetic debt is not silently waived or reclassified here.

## P5-MSW-REGISTRATION-01 — S2 — FIXED (TIP-539 personal links)

TIP-538 new personal registration cases fail both expected cross-app effects:
sent OTP mail entry absent and newly activated member absent from Admin search.
Actual Me active/pending-payment and Portal navigation pass. Mock activation
creates fee/referral/group state but not an Admin profile/mail effect; fixed
seed listings and current snapshot cannot provide those records. Native new
cases pending; not a claim of a native backend defect. Preserve original0/2
failure, fix through scoped refine and keep identical browser assertions.

TIP-539 separate registration profile/mail state and persistence now supplies
these actual cross-app effects. Fresh MSW cohort24/24 includes both scenarios;
native new4 cohort4/4 with demo restored. Original native2/4 mail failures were
pre-hydration synchronous count sampling; exact recipient/kind/status counts
now retry after reload with the same20second budget on both lanes. No backend
mail defect inferred. Full post539 registry and business LK-01 remain separate.

## P5-MSW-NEW-MEMBER-01 — S2 — FIXED scoped TIP-543

TIP-542 actual new account still receives `OPCHUB NEW` and password login after
logout401 in MSW0/2. Identical native2/2 passes after waiting/closing the real
P-05 welcome preview (original timing failures kept). Source: session placeholder
not synchronized to allocated fee; no dynamic credential-aware registered login.
Fee creation also drops phone; transfer content must be checked after the first
regex failure is fixed. Refine543, preserve password/hash-free public bridge.

TIP-543 real padded fee code/phone and current registered session plus private
salted-verifier credential persistence fix the original two failures. Fresh
MSW34/34 then stronger Projects-menu/F5 cases2/2 on both lanes; native demo
restored. Original5420/2 retained. Full current231 regression remains separate.

## P5-RT-02 ? S2 ? FIXED source/native, final acceptance pending

Source review found default runner time sampled before the LLM call: provider
latency could consume the next turn spacing and keep an activity window open
past its actual close. TIP-V2-507 samples production posting time after generation.
Two native clock-boundary regressions pass; current cohort 25/25. No real-provider
failure is claimed; final stable full-suite/browser acceptance remains pending.

## P5-MSW-FEE-CLOCK-01 � S2 � OPEN (TIP545)

TIP544 fresh-account accountant collection returns fixed MOCK_NOW rather than
actual request time. MSW2pass/1fail; native3/3pass and demo restored. Open-Portal
gate closure was not reached on MSW. Preserve actual-time and calendar12month
assertions; inspect Admin feeAction boundary and downstream membership sync.

### TIP545 clock/calendar checkpoint
P5-MSW-FEE-CLOCK-01 corrected in source; unchanged fresh browser case passes
paidAt and calendar expiry, then exposes P5-MSW-FEE-LIVE-01 (S2 OPEN): Portal
gate remains open20s after actual accountant collection. MSW2pass/1fail53.8s;
native3/3pass42.5s restored=true. TIP545 continues with membership relay hints.

### TIP545c � P5-MSW-FEE-LIVE-01 FIXED scoped
Validated same-member relay hint triggers authenticated membership read and
Query/session update. Fresh545c MSW3/3 passes unchanged, including closure
before reload; no broad polling. Shared10/Portal3 new controls. Root1315pass
plus2skips/all gates0. Clock/calendar also pass; original reds retained.
Native previous545 same3/3/demo restored; final fresh native full build pending.

## P5-NATIVE-PAID-CACHE-01 � S2 � OPEN (TIP547)
546 fresh bank payment twice: toast/popup closure pass, Community load error.
Trace initial /groups402, no retry after activation. MSW1/1passes19.7s. Both
native final restores all0. Retry only membership-denied queries on activation.

## P5-MSW-RESET-PENDING-01 � S3 � OPEN investigation
545d expanded35:34pass/1fail4.7min; UAT11 reset login times out while button
shows loading and previous wrong-password alert. Root cause not yet established.
Preserve raw evidence; do not infer credential corruption from UI timeout alone.
