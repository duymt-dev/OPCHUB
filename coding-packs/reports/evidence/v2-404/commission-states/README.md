# Commission filters and actual open-menu captures

Source **`2f4f2b1`**, readiness **`33ac56d` / `b2913fb` / `c353134`**, pushed.
Seventeen terminal logs normalized to UTF-8/LF, ANSI removed, sensitive-key lines
redacted. No private env values or browser traces. Source paths in `source-files.txt`.

- `404-commission-states-gates.log`: initial missing regex-string escape rejected
  by lint. Corrected forced `...states-gates-final.log` and later
  `...capture-gates.log`: **22/22**, **828 units + 2 existing skips**.
- `...states-{lint,typecheck}-final.log`, `...capture-{lint,typecheck}-final.log`:
  focused terminal exit 0. `...paint-gates.log` and `...filter-paint-gates.log`:
  **22/22**, twenty unaffected tasks cached/two e2e gates executed, not another
  full forced unit run.
- `...states-depcheck.log`: both graphs pass, **1473/4051**, server **680/2954**.
- `...states-prototype-final.log`: **12/12 navigation paths** before capture
  guards; six original menu screenshots are rejected, not app parity passes.
- `404-commission-filters-focused.log`: **2/2**, included in full
  `...states-committed-msw.log` **52/52**, 22 files, 3.2 minutes. No double count.
- `...states-committed-parity.log`, `rejected-parity-2f4f2b1.json`: mechanically
  27/34, but six menu states were not actually painted in the captures. Rejected
  as acceptance evidence; two example blank-menu PNGs explicitly marked rejected.
- `...capture-committed-parity.log`: strict opacity checks correctly fail all six
  app-menu captures; its mixed old/new JSON store was not accepted as current.
- `...paint-committed-parity.log`: menus now actually painted; standalone filter
  motion readiness subsequently strengthened, so this is superseded by final run.
- `...filter-paint-committed-parity.log`, `parity-c353134.json`: final **27/34**,
  all rows on the same source. **No capture/readiness errors**, seven real pixel
  failures retained. The original 22 rows are exactly unchanged at **17/22**;
  twelve additional images are **10/12**, not improvement of the old denominator.
- `screens/`: six inspected actual app/prototype mobile menu captures plus two
  rejected before-capture examples. Final captures assert post-settle menu
  visibility, viewport intersection and popup opacity one; no DOM/style injection.

New cancelled mobile filter/menu remain **5.2758%/5.1425% FAIL**, alongside the
five older failures. No automatic waiver, mask or threshold change. Production
`apps/`/`packages/` unchanged since `cbf9eaa`; final parity commits only affect the
harness/helper. MSW behavior remains source `2f4f2b1`; no native browser rerun,
post-seed final audit, UAT or P4 completion is claimed.
