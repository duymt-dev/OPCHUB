# TIP-V2-546 — Fresh-member bank payment linkage acceptance

Bounded test-only continuation of503: UAT-09/LK-02/REQ-402 and AT-NR01.
Existing membership test does not verify the persisted same-user Admin fee.
Register a unique unpaid member using the544 helper, verify own transfer
reference/phone and non-refundable amount, confirm transfer, then actual fake
bank delivery (native dev adapter; MSW existing scheduled fake bank). Only
fixture plumbing may differ, not assertions. No paid demo replacement.

Assert waiting state, activation toast, live popup closure before reload,
Community access, same-user active Admin row and typed API data, actual
paidAt and twelve calendar months, then Portal reload matches the persisted
fee. Run both lanes and root gates. Native reset announced/restored finally.
No production edits: unexpected failures preserved for scoped refine.
Standards: testing/testing.md, global/code-structure.md, global/git-workflow.md.
