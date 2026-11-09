# TIP-V46-817 — UI review and parity

**DONE: MSW and native verification completed.**
Pixel percentages are D-134 reference measurements, not functional failures for
D-138-required or live-data differences. Paired images are supplied for owner
review in [PR #102](https://github.com/duymt-dev/OPCHUB/pull/102). Owner image
approval has not been claimed.

## Legacy paired measurements

Unchanged harness, thresholds and scenarios; no additional masks. Executed
`PARITY_IDS=D-V46-AI,D-33,P-73`, desktop 1440 and mobile 390. Four harness regression
checks passed; six screen comparisons completed. Raw exit 1: three comparisons
exceeded the legacy 3% reference, three did not.

| Screen | 1440 | 390 | Classification |
|---|---:|---:|---|
| P-73 project form | 0.46% | 2.05% | Below reference; compose is hidden when not configured |
| D-33 moderation | 1.46% | 4.38% | D-138 adds the opt-in AI switch; existing demo/report data differ |
| D-V46-AI settings | 8.19% | 11.07% | D-138 per-purpose model fields, call-log entry and budget notice; refreshed catalog |

The final paired run measured committed implementation **`fb0ecf62`**; the six
automatic ledger rows identify that Git SHA. Initial exploratory measurements
were made on a dirty implementation with HEAD `ba49a1f3`; they are not used to
claim that the owner TIP commit contained the implementation.

Pairs and raw diffs: [MSW images](ui-parity/v46-817/msw/).
For example: [AI prototype mobile](ui-parity/v46-817/msw/D-V46-AI-390.proto.png),
[AI app mobile](ui-parity/v46-817/msw/D-V46-AI-390.app.png),
[moderation prototype mobile](ui-parity/v46-817/msw/D-33-390.proto.png),
[moderation app mobile](ui-parity/v46-817/msw/D-33-390.app.png).

## Native paired measurements

Same unchanged scenarios, both widths, SKIP_SEED=1, actual817 API/socket/worker
and Next native builds. Four harness checks passed; all six screen journeys
captured successfully. Raw exit1: four above/ two below the legacy3% reference.

| Screen | 1440 | 390 | Classification |
|---|---:|---:|---|
| P-73 project form | 0.98% | 2.17% | D-138 compose button visible with configured content; no AI request from parity |
| D-33 moderation | 3.40% | 9.61% | D-138 switch; native case ordering and manual-lock availability come from real case/member state rather than prototype hardcoding; notification count data/D-133 flag |
| D-V46-AI settings | 8.29% | 10.61% | D-138 four purpose-model controls/log/budget notice; actual enabled-provider/model/spend state retained, including saved noncatalog model |

[Native pairs and raw diffs](ui-parity/v46-817/native/) were visually inspected.
Moderation still has the same four case cards and rule panel; native ordering/
manual controls are not removed to imitate static fixture state. The existing
functional shared date picker is unchanged. No new817 layout defect was found
in native review; the real mobile log-filter overflow was already corrected
and both lanes' overflow regression passed. Native automatic ledger HEAD is
`ceaccaa3` (implementation `fb0ecf62`, later commits documentation only).

## New D-138 UI

The prototype has no AI call-log drawer, compose suggestion preview or AI
moderation control. No fictitious prototype baseline was created. New app-only
settings/suggestion/log screenshots at both widths are supplied for owner review.
The behavioral journey tests explicit save, no overwrite before acceptance,
accepted rich-editor replacement, filtered log and asynchronous CSV download.

Inspection found a **real** mobile issue in the new log drawer: the vertical
AntD Space inherited the wide table's intrinsic width, clipping filters. This is
not a D-138 waiver. It was replaced by a bounded flex column; the table alone may
scroll horizontally. A dialog overflow regression was added. Rebuilt MSW E2E
passed **2/2**, including the new overflow assertion; final images above were
replaced with those captures. Local log: `v46-817-e2e-target-msw-final.log`.

New short dropdowns use nonvirtual options for screen-reader access. Screenshots
of the log/suggestion use the viewport rather than a full-page composite of a
fixed overlay and the much taller background settings page.

## Native runtime and restored fixture

The owner manually stopped the old private816 processes. After rejected combined
PowerShell commands, standard managed process sessions successfully launched817.
Native E2E **2/2 passed**, including real worker CSV download; native parity
completed as above. Snapshot comparison after E2E and after parity confirmed all
provider metadata/settings hashes unchanged, and all three bot automation flags
remain off. Only the unused-provider stub was used; no real AI call or key change.

Original HOLD/native DB/Redis6379 are untouched. The private817 runtime is kept
running on the approved existing ports for independent verification.
See [native closure evidence](evidence/v46-817-native.json) and
[completion](TIP-V46-817-completion.md).
