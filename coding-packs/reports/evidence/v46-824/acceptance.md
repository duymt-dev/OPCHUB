# TIP-824 — current acceptance audit

Status: **IN PROGRESS / NOT READY TO MERGE**. This audit preserves all16 original
criteria, not just the implemented subset. Historical checkpoints in completion.md
are not a current-source full-suite result.

## Evidence boundary

- Current implementation commit: `7761350c`, pushed. All24 frozen production/CSS/unit/
  harness/verifier Git blobs match HEAD and worktree after normal hooks; clean status verified.
- Current production changes: semantic group write markers, extracted table actions,
  mobile-only action wrapping, SVG Element target traversal and nearest explicit
  control classification. Backend permissions, shared UI, Portal and catalogs unchanged.
- Final candidate builds: both Admin modes pass their49 physical catalog cases and
  production compilation. Final preview browser probes:4/4 MSW and4/4 isolated native,
  including a real SVG click, complete action-label bounds and no business mutation.
- Focused guards:86/86 across5 files, plus16/16 upload/import cases across2 files.
  The13-file root failed one existing5000ms import-audit deadline (1746/1747 Admin);
  exact full-corpus AST/lexer equivalence preserves all515 physical file reads and five consumers.
  No timeout/exclusion/cache waiver. Three test-only files extend the final map to16;
  worker2 retry was stopped after resource-load deadline failures (CPU100%);
  unchanged complete68 CLI/physical cases now pass at worker cap1.
  Normal-priority worker1 full run also exceeded some unchanged deadlines.
  Task-only one-core/AboveNormal scheduling passes77/77 unchanged audit/catalog/formatter
  cases, restores the wrapper resources, and is not a production benchmark.
  Root39155 terminated with7 deadline failures; replacement full root PASS:3492 passed
  +2 existing integration skips, Admin1762/205 files fresh and5 other suites cached.
  Lint/typecheck8/8cached and depcheck2932/8960 plus1260/5995 PASS.
  Resource wrapper restored Normal priority/affinity63. Clean committed-source audit PASS at7761350c:595 files/303 findings/0 unreviewed/errors.
- Original PG5432/opchub_test untouched. Native services held for independent checking;
  browser-owned helpers closed. Browser harness opens no direct PG pool/client.

## Requirement-by-requirement audit

| AC | Actual evidence | Remaining proof before final acceptance |
|---|---|---|
|01 locale resolution|Locale/request/unsafe-cookie/alias units; actual12 selector identities and F5 in both modes. Resolution source unchanged by current correction.|Confirm current root tests and final same-source behavior run; do not infer identity from bundle name alone.|
|02 physical catalogs|Fixed10 bundles ×25 files,26,670 leaves; final builds each run49 physical positive/negative cases. No discovery/fallback shortcut.|Final source/catalog provenance and retained exact copy-policy receipts; no human translation-review claim.|
|03 VI/loader compatibility|Source/split value hashes, shape/ICU/deep-overlay/isolation units; current correction changes no catalog/loader.|Current root gate and final inventory/hash reconciliation.|
|04 public/auth UI|33/33 per mode auth runs at4c6cebd4:24 real first-password/2FA workflows plus9 pure guards. Public local password states24/24 per mode atb3304c74. All12 identities and two widths.|Final same-source rerun; local-only forgot/reset tests do not prove successful sent/API-error states. No populated-secret screenshots.|
|05 navigation/session|Specified member URL/query/page identity, locale sequence, aliases/cookie/F5 and strict no-business-write guards passed in both earlier full runs.|Rerun expanded suite against final builds; preserve actual data/session/permissions assertions.|
|06 English screens/states|Loaded route/tab/dialog matrix; fresh read-only chat populated and empty states; current internal forbidden preview UI at1440/390.|Complete applicable loading/empty/error/secondary-state coverage, then final route matrix. Internal403 UI is not a genuine restricted-account backend403 proof.|
|07 complete language UI|All12 identities on actual Overview/Profile/Settings at1440/390; seven required screenshot languages. Actual controls96/96 per mode at eb9a9a0a.|Final all-language controls/core rerun; no Dashboard image substituted for Profile.|
|08 locale formatting|Number/date/currency/timezone/null/negative/canonical/export units, actual CLDR Fees and Myanmar flow checks, range/API wire assertions.|Reconcile every specified browser boundary with final source; do not infer all numeric widgets from one Fees value.|
|09 native controls|All10 AntD definitions and scoped provider units; actual picker/empty/pagination/editor/link controls across12 identities in both modes.|Final full rerun, retaining current raw/canonical and keyboard assertions.|
|10 drafts/errors|Profile drafts/local password errors, open-modal provider probes and full auth validation/state flows. Unit coverage for hidden avatar-error toast.|Actual remaining avatar/upload-error presentation evidence and final rerun. Covered-handler modal probes are not pointer-access evidence through inert content.|
|11 canonical/RBAC|Real owned group/persona canonical saves10/10 per mode (one four-substep workflow plus9 pure guards); raw readback/editor reopen. Current group semantic guard units for12 identities; real EN/VI/My preview clicks plus SVG, no mutation.|Owned permission-matrix UI save and genuine restricted-account negatives. Other domains' translated write actions are not certified by the group-only probe. Unassigned role fixture is approved but not yet created; changed-role-only UI payload question is pending.|
|12 raw boundaries|Raw API/content/export unit negatives; unchanged sender/message/file/room bytes in fresh real chat; canonical payload/readback proofs.|Actual browser API/field error, notification/audit/email/CSV boundaries as required. No export or mail dispatch to existing users under read-only authorization.|
|13 independent selector|Saved-disabled Myanmar:2/2 per mode, cookie/F5/12 choices/no implicit PATCH, exact original typed settings restored on native. Receipt in disabled-native.log.|Final rerun/restoration receipt. MSW settings reset naturally on reload; do not claim mock business persistence.|
|14 same-source full behavior|Historical208-case full runs passed on their stated source; current registered inventory383 cases/22files, focused later runs separately recorded.|Run the entire expanded suite in both modes on final source/builds with identical assertions and safe prerequisites. Historical/focused sums are not a full383-case run.|
|15 real UI usability|Core/auth unmasked images, glyph/font checks and measured sidebar/popover/auth fixes. Current Myanmar group434/390 overflow corrected by wrapping; final pointer/SVG/label bounds pass both modes.|Remaining keyboard/focus/VI-prototype/state review and final full rerun. No hidden-overflow masking, shortened copy or fabricated owner/native-speaker approval. D-134 owner screenshot review is tracked, not falsely claimed.|
|16 production resources|Original f7c1b2b8 archive and12 vi/en/th route-pair measurements: historical growth1.21–1.84%; single resolved catalog/SSR isolation/selected fonts at measured source.|Refresh measurements and provenance for current production bytes. Original absolute250KiB baseline debt remains explicitly allowed by TIP§37, not reported fixed.|

## Final delivery gates (still open)

1. Finish actual remaining functional/negative evidence above, without redefining scope.
2. Required root lint/typecheck/test/depcheck on the final frozen inputs; distinguish
   cached suites, fresh tests, filtered diagnostic runs and existing integration skips.
3. Final complete MSW/native behavior runs with identical assertions and all prerequisite
   successes, not merely a list/inventory or sum of old focused runs.
4. Clean committed-source static audit, fixed catalog inventory, current production
   resource measurements and exact post-hook tested-blob comparison (CSS separately).
5. Reconcile route/control coverage, current16-AC verdicts, W1 traceability, task row824
   and completion report. Commit/push scoped paths; verify clean Git status.
6. Report a real Git SHA and remaining owner-review items. No automatic PR merge,
   release or direct push to main; do not mark the goal complete while required work remains.

## Preserved failures / non-claims

- Original English read-only Edit dialog bypass; mobile Myanmar434/390 overflow.
- First static CSS fixture failed because JSDOM import.meta.url was not a file URL;
  the known-failed root run was stopped, not counted as a full pass. resolve(__dirname)
  fixes only the fixture path, leaving assertions intact.
- SVG-path write target originally bypassed capture; actual failure and corrected
  targeted86-case result are retained in preview-quality.log.
- Current dirty pre-commit audit:595 production files/303 findings/0 unreviewed/errors.
  This is not a clean committed-source final audit or complete visual/runtime coverage.

## Current verifier/root checkpoint (2026-11-12 17:15 local)

Previous root39155 terminated1750/1757 Admin tests:7 existing5000ms subprocess-startup timeouts, not a full pass. Source/chunk shared-core extraction preserves all19+6 semantic cases with5 real subprocess parity smoke cases;30/30 focused PASS, no timeout/cache/exclusion/assertion relaxation. Fresh595-file/303-full-finding source equivalence and both83-JS-file/6-payload actual-build inventories match the original verifier exactly. Pre-full lint/typecheck/depcheck PASS. New full root started17:11:19 (Admin Vitest9440),24 frozen blobs, terminal PASS:3492 passed +2 existing skips, Admin1762/205 files fresh,5 other suites cached. Lint/typecheck8/8cached and depcheck2932/8960 plus1260/5995 PASS; wrapper restored Normal/63. No application/CSS change since verified final preview builds and4+4 browser cases. Unassigned prefix role fixture is approved, not yet created; existing roles remain untouched.

## Owner delivery direction (2026-11-12)

Owner requested closing the implementation instead of expanding testing. No further fixture, role-payload policy change, test matrix expansion or unrelated business change will be started for this checkpoint. Finish the already-running mandatory repository gates, commit/push the scoped implementation and provide an explicit handoff. Existing unverified criteria above remain honestly identified; this direction does not retroactively make missing evidence pass.

## Delivery checkpoint

Mandatory repository gates are complete and passing on the frozen24-file candidate. This closes the pending implementation checkpoint, not a fabricated all16-AC/final383-case acceptance. No additional fixtures or test cases are introduced after the owner requested handoff. The whole-TIP limitations above remain reviewable; no automatic merge/release.

## Committed handoff receipt

Source7761350c committed/pushed; all24 frozen code/CSS/unit/harness/verifier blobs match both HEAD and worktree after normal hooks, clean status verified. Fresh clean-source audit PASS:595 production files/303 findings/0 unreviewed/errors,613 fingerprint files, corpus ef4f1047b5ca044d1d4f5576aa1624bd82baeef4062f610657c1166b4d148bf2. Fingerprint excludes CSS/catalogs/browser evidence; those are separately source-bound. No further fixtures/test expansion after owner handoff direction. Whole-TIP final expanded browser/performance/acceptance gaps remain explicitly listed, not silently marked PASS.
