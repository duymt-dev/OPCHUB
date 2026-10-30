# UI parity — implementation decision records

These records apply existing owner instructions and D-xx decisions. They do
not create business decisions or authorize acceptance exceptions.

## V46-802 — owner directs continuation

31/10/2026, owner: “sang 802,.....”. Start V46-802 now, stacked on 801
`e0ded1fa` because refreshed `origin/dev` does not contain it. This supersedes
the sequencing wait for 801 acceptance, not the acceptance criteria. 801 stays
pending acceptance with measured FAILs retained; no DONE or image PASS implied.
Implement financial dependencies in 802/803, then recheck affected acceptance.
Do not resume cosmetic-only 801 loops or block the goal over documented questions.

## V46-801 resumption

- Date: 2026-10-31. Source checkpoint: f0aa291b.
- Owner clarification: record questions, deviations and decisions instead of
  blocking the goal over these unresolved parity/reference issues.
- Classification: the recorded issues do not by themselves establish L3
  (architecture, breaking contract, secrets, or undecided money/legal/security).
- D-120 remains authoritative for incumbent director fee exemption. Do not
  restore renewal/countdown just to imitate the inconsistent prototype.
- D-119/121/122 remain authoritative for financial data and TIP allocation.
  Do not fake amounts, remove real affiliates, or implement later financial
  scope inside801. Record dependency gaps separately from layout defects.
- D-95 permits functional implementation despite an unusable prototype control;
  it does not manufacture missing P16 image evidence or a parity PASS.
- Continue801 investigation/corrections; preserve every measured FAIL and the
  3% threshold. This decision is not TIP closure or permission to skip gates.
- Previous response only promised this correction: no implementation progress
  or live-job wait was established in that turn.


## Full director slots — behavior correction

Source fa887d54. Apply D-120 and the existing prototype Add branch: when all
three slots are occupied, report that the incumbent must be revoked first;
do not open a non-submittable form. This is a frontend interaction correction,
not a new business decision. Existing empty-slot form and confirmation guard
remain; no new region, fee change or request contract. Same-assertion browser
coverage verifies no writes after full-slot Add and canceling revocation.

## P16 — apply existing D-95 instead of demanding an impossible capture

Reviewed at d4650d65 against REQUIREMENTS-MATRIX D-95/D-118 and AGENTS source
precedence. D-95 explicitly says parity only measures the displayable part
when the prototype has a no-op/dead branch. D-118 changes the reference version
but does not revoke that rule. Therefore the earlier claim that a missing P16
capture necessarily blocks acceptance was too strict and is superseded.

P16 inherits the existing D-78/D-79 unreachable Marketing route in screens.md.
Current source has only the aMarketing guard for aTab=marketing, no UI setter;
prior Chromium inventory is recorded in TIP-V46-801-portal-visual-checkpoint.
Classify prototype image comparison as **not measurable under D-95**, not PASS
and not a new skip/threshold exception. No state injection or prototype edit.

Functional acceptance remains mandatory: retained same-assertion catalogue
browser1/1 MSW and1/1 native, and the current full MSW run3719a069 includes this
test passing. EM-GDV1/2 mail delivery/outbox tests remain separately required
and evidenced; a catalogue test alone does not prove delivery.

This applies an existing owner decision, not a new business decision or owner
approval of other deviations. P6/Portal/Affiliate measured FAILs remain FAIL.

## V4.6 / 802 — receipt time and reconciliation period (implementation reading)

D-122 customer age uses actual bank `receivedAt` (bankless manual collection:
recorded time), not registration, package price or worker execution time.
The ledger `monthKey` uses reconciliation `recordedAt`, following §31.3's
record-on-reconciliation flow. A January receipt reconciled in February keeps
January customer-age timing but belongs to the February recorded period.
The cross-plan integration suite explicitly checks this boundary. Worker delay
does not move the period. This is a documented interpretation, not a new D-xx
or permission to rewrite settled history; see Q-V46-802-1 for paid corrections.
