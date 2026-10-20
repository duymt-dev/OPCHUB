# Server-owned policy hint — UI source `e1cb2f7`

API dependency `986930c`; its native evidence is in `../../v2-402c/`.
All nine archived logs are terminal, normalized UTF-8/ANSI-free/trailing-space
trimmed, with sensitive lines redacted. No private env or raw browser trace.

- `404-preview-form-unit.log`: previous eleven form tests still pass.
- `404-preview-focused.log`: **22/22**, including eleven new hint/query tests.
- `404-preview-gates.log`: **22/22 tasks**, **804 units + two existing skips**.
- `404-preview-depcheck.log`: both boundary graphs pass, **1463/4018**, **671/2935**.
- `404-preview-{portal-msw,admin-msw,admin-native}-build.log`: fresh builds.
- `404-preview-committed-msw.log`: same nineteen-file regression, **44/44**;
  the two mobile policy tests also assert the real draft-rate response/caption.
- `404-preview-committed-parity.log`: **11/14**, three failures preserved.
  `parity-e1cb2f7.json` stores exactly the fourteen current measured states.
- `source-files.txt`: eight committed UI/test/i18n files.

Normal caption screenshot was inspected after the terminal measurement. Mobile
policy raw diff worsened to **16.5967%**, not a pass or an improvement. Live
diff/results artifacts remain under `../../../ui-parity/`. No native browser
acceptance, waiver, complete-state inventory or P4 completion is claimed.
