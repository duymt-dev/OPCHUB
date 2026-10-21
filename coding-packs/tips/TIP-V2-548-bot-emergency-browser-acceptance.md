# TIP-V2-548 — P5 emergency stop/hide browser acceptance

Owner-focused P5 scope:501/502 REQ141/D51 and live Portal propagation.
Add missing same-assertion MSW/native browser coverage, using actual Admin UI
to configure eligible personas and start an automatic thread. Observe a real
first publication, retain a real member message, stop via confirmation, hide
via confirmation. Assert typed HTTP results, terminal thread, bot disappearance
from already-open chat without reload, real message preserved, Dashboard
absence and no further turn past the original actual nextAt deadline.

No direct DB mutation, fulfilled responses, onServer assertions or paid LLM.
Use existing helpers; new helper/test files stay modular. Run root gates and
both lanes only after current5488-case runners terminate; native restore demo.
Permissions/audit/race negatives remain covered separately by bot integration
tests; do not claim this happy browser path proves them. Preserve failures.
