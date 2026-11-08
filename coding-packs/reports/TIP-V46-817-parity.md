# TIP-V46-817 — UI review and parity

**PARTIAL:** final MSW captures available; native verification blocked by the
rejected private-runtime service-control commands. Draft PR [#102](https://github.com/duymt-dev/OPCHUB/pull/102).
Pixel percentages are D-134 reference measurements, not a
claim that decision-approved app differences are functional failures.

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

## Native boundary

The owner approved rolling only the private 816 runtime to 817. The execution
environment rejected the stop/restart command before any process was stopped;
manual help was requested. Do not substitute old 816 screenshots/tests for 817
native evidence. Original HOLD, native DB and Redis 6379 remain untouched.

Owner image approval occurs during PR review; it has not been claimed here.

### Updated native preflight

The owner has manually stopped the five owned816 processes; all four approved
ports are free. Startup of the five817 processes was also rejected before launch.
Manual startup instructions were supplied. Native captures remain NOT RUN.
