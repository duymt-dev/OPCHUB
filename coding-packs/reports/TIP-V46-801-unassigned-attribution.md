# V46-801 unassigned-state image attribution

Read-only analysis at `75385081`, using actual post-commit `03def207` images.
No new capture, source change, mask, baseline edit or acceptance exception.

## Method

Decode the app/prototype PNGs in `e2e/.parity-out`, pad the smaller image with
magenta exactly as `e2e/parity/compare.ts`, and run pixelmatch threshold0.1.
Use `diffMask:true` only to count differing pixels below the shorter image's
height; this does not mask or exclude pixels from the comparison. Whole-image
counts reproduce the committed scores exactly. Local raw output:
`e2e/.parity-out/v46-801-unassigned-attribution.json`.

| Width | App height | Prototype height | Whole differing pixels | Whole difference | Unmatched bottom pixels | Bottom contribution        |
| ----- | ---------- | ---------------- | ---------------------- | ---------------- | ----------------------- | -------------------------- |
| 1440  | 1354       | 1272             | 142491                 | 7.308130%        | 115942                  | 5.946475 percentage points |
| 390   | 3447       | 3285             | 135873                 | 10.107117%       | 61402                   | 4.567480 percentage points |

## Interpretation and limits

Both unmatched bottom contributions exceed the3% whole-image gate on their
own. Tiny chip typography adjustments alone cannot close this state while
these image heights/content remain unchanged. This is attribution of the
current images, not a universal lower bound for every possible layout.

Direct image inspection shows an actual configuration-update history section
in the app, absent from the prototype after province toggling. Additional
unassigned options on other regional cards and different warning copy also
affect height; the bottom calculation cannot attribute every pixel exclusively
to audit history. Upper financial values and affiliate counts differ too.

Source inspection: `RegionalDirectorHistory` renders returned history rows;
prototype province toggle updates its province list without adding a gdvLog
entry. Prototype appointment/revocation handlers do add those entries.
Keeping actual audit/history is intentional under the existing audit rules;
deleting rows or hiding history merely to obtain a passing image is not a fix.

## Disposition

Record DV-V46-801-4 and keep Q-V46-801-17 open. Preserve current FAIL results
and native behavior. This evidence rules out another cosmetic-only iteration
as a sufficient remedy; next review must distinguish correct history/data
presentation from a reference mismatch, without claiming owner approval.
The whole goal remains active; this is not TIP completion or permission to
start802 before its prerequisite gate.
