# P4 Admin Affiliate — visual/behavior acceptance inventory (OPEN)

Sources: TIP-V2-404; REQ-308/309/310/312; actual prototype Affiliate markup and
`afPage` handlers; feature `apps/admin/src/features/affiliate/components/`;
behavior specs below. This inventory is an acceptance worklist, **not a claim
that every state is registered, tested natively or approved**. No P5.

## Comparable prototype states registered so far

Each ID uses both 1440 and 390, real UI navigation, unchanged 3% threshold and
no new masks. Eleven states/22 images are registered, not the complete scope.

| State | ID | Important precondition / assertion |
|---|---|---|
| Commissions default | D-84 | AF0, every real commission retained |
| Agents default | D-84-AFF | Keep all 62 automatic agents, not six prototype rows |
| Agents search | D-84-AFF-Q | Search HAOPC through UI, one exact agent |
| Policy | D-84-POL | Complete rules + actual preview; retain required editable terms |
| Detail month reconciliation | D-85 | HAOPC, immutable paid history |
| Detail customers | D-85-CUS | Correct 14-row history count, pager retained |
| Individual rate editing | D-85-RATE | Inline editor, not a fabricated prototype modal |
| Two commissions selected | D-84-COM-BULK | Search owner Nguyễn Văn An, exactly nine rows; select Đỗ Minh Tuấn + Đặng Ngọc Ánh, count two |
| One agent selected | D-84-AFF-BULK | Search and select HAOPC, count one |
| Commissions no result | D-84-COM-EMPTY | Positive nonempty baseline, then impossible query and zero rows |
| Agents no result | D-84-AFF-EMPTY | Positive nonempty baseline, then impossible query and zero rows |

The new helpers assert nonempty rows before every search. A CSS selector that
matches nothing cannot falsely certify an empty state. Prototype-only execution
proves a navigation path, not app parity. Failed initial selector attempts must
remain in evidence and do not count as successful empty-state verification.

## Additional required states — not closed by those 22 images

| State group | Current implementation / behavior evidence location | Missing acceptance |
|---|---|---|
| Recorded/paid/cancelled filter and page/size/F5 | admin-affiliate, admin-affiliate-operations, affiliate-responsive specs | Register applicable prototype states; native browser run |
| Commission row status menu | commission-table-columns; prototype has three menu options | Measure recorded/paid/cancelled menu availability; preserve irreversible domain transitions |
| Cancel reason blank/whitespace/valid | cancel-dialog; action-dialogs.spec; admin-affiliate.spec | SRS-only dialog screenshots/approval, 360/390 geometry and native browser |
| Cancel pending/conflict/retry and permission loss | action-dialogs.spec, use-affiliate-writes.spec | Native browser/error-state evidence; no false success or lost intent |
| Bulk rate modal invalid/valid/pending/failure/read-only | rate-dialog; action-dialogs.spec; admin-affiliate-operations.spec | Capture full state set and native browser; retain paid/cancelled invariants |
| Individual rate invalid/cancel/pending/conflict/revoked | affiliate-rate-editor.spec; affiliate-inline-rate.spec | Visual registration and native browser beyond one editing screenshot |
| Payout confirmation/missing bank/retry/pending | payout-dialog; affiliate-payout.spec; action-dialogs.spec | Coherent closed-month fixture, native browser; never force early payout |
| Paid receipt expanded / recorded / cancelled history | affiliate-screen, affiliate-cross-app, admin-affiliate-operations specs | Register expanded states and inspect historical bank/date/amount |
| Policy validation/400 fields/409 retry/pending | policy-form.spec; affiliate-policy-responsive.spec | Native browser/error capture; unit API simulation is not native browser proof |
| Policy preview loading/error/stale/wrong rate | policy-rate-preview.spec | Browser fault/error evidence and appropriate visual-state capture |
| List/detail/summary loading/error/retry | affiliate-content, affiliate-stats, affiliate-detail | Exercise failures, retry and layout; not represented by static local prototype |
| View-only/no-view/action-only/payout-only/locked | admin-rbac and affiliate raw-session/guard specs | Affiliate-specific visual coverage, native browser after real permission changes |
| CSV pending/error and audit visibility | admin-affiliate-operations; API integration | Native browser download + audit of the same operation |
| Month/all/size/page URL changes | affiliate-agent-period, affiliate-customers-responsive specs | Relevant visual states and native browser; do not drop controls for a screenshot |

Behavior file references are under `e2e/behavior/` unless they end in component/
hook `.spec` names. Existing MSW and unit coverage is useful but does not turn
the missing native/visual evidence above into PASS. The worklist must be
expanded if further source inspection or actual execution exposes another state.

## Prototype/SRS differences to preserve, not conceal

- Prototype `bulk.cCancel` immediately changes local status; the app requires a
  nonblank cancellation reason and confirmation. Do not remove these safeguards
  or invent a prototype reason dialog to produce a matching screenshot.
- Prototype agent selection markup exposes CSV/clear only. Although its derived
  model has `aRate/aApply`, no corresponding input/apply control is rendered in
  that markup. The required Admin bulk-rate operation remains available in the
  app. Do not infer a visible prototype editor from unused model fields.
- Prototype `payMon` pays directly; native domain requires valid closed-month
  conditions, bank and idempotent confirmation. Do not alter ledger or bypass
  guards to make its open-month demonstration run natively.
- The prototype empty mobile table leaves header labels outside the card;
  current app shows an explicit empty-state message. This visual difference
  needs review, not hiding the empty message or accepting it automatically.

These observations explain why SRS-only states need their own evidence and
explicit deviation review. They are not approved waivers or `unreachable`
flags in the shared parity registry. Final native audits, UAT/§22.6/report/P4
merge remain separate gates; P4 is not complete.
