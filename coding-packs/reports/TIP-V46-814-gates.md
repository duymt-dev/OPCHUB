# TIP-V46-814 ? A22 sequential gates

**IN PROGRESS. No complete accepted single-SHA sweep yet. Do not combine green gates across SHAs.**

## 27778a43 ? FAILED

|Gate|Result|Seconds|Counts|
|---|---|---:|---|
|1 lint|PASS|86.405||
|2 typecheck|PASS|34.010||
|3 unit|PASS|551.767|{"integrations":{"passed":107,"skipped":2},"server":{"passed":253,"skipped":0},"portal":{"passed":440,"skipped":0},"shared":{"passed":701,"skipped":0},"ui":{"passed":63,"skipped":0},"admin":{"passed":574,"skipped":0}}|
|4 integration|FAILED|1543.607|{"db":{"passed":144,"skipped":0}}|

Raw ledger: `test-results/v46-814-A22-27778a43-ledger.json`; command logs share the same prefix. Integration gate did not report server and DB results

## 3b83b120 ? FAILED

|Gate|Result|Seconds|Counts|
|---|---|---:|---|
|1 lint|PASS|100.577||
|2 typecheck|PASS|32.143||
|3 unit|PASS|425.873|{"portal":{"passed":440,"skipped":0},"shared":{"passed":701,"skipped":0},"ui":{"passed":63,"skipped":0},"server":{"passed":253,"skipped":0},"integrations":{"passed":107,"skipped":2},"admin":{"passed":574,"skipped":0}}|
|4 integration|FAILED|2149.821|{"db":{"passed":144,"skipped":0}}|

Raw ledger: `test-results/v46-814-A22-3b83b120-ledger.json`; command logs share the same prefix. Integration gate did not report server and DB results

## f64505aa ? INTERRUPTED_EXTERNAL_REBOOT

|Gate|Result|Seconds|Counts|
|---|---|---:|---|
|1 lint|PASS|99.631||
|2 typecheck|PASS|40.747||
|3 unit|PASS|358.628|{"server":{"passed":253,"skipped":0},"ui":{"passed":63,"skipped":0},"integrations":{"passed":107,"skipped":2},"shared":{"passed":701,"skipped":0},"portal":{"passed":440,"skipped":0},"admin":{"passed":574,"skipped":0}}|
|4 integration|INTERRUPTED_WITH_LOGGED_FAILURE|0.000||

Raw ledger: `test-results/v46-814-A22-f64505aa-ledger.json`; command logs share the same prefix. Machine reboot killed runner and all original HOLD processes; step4 had already logged worker failure, but no complete integration summary. Never counted PASS.

## 85fb990e ? FAILED

|Gate|Result|Seconds|Counts|
|---|---|---:|---|
|1 lint|PASS|89.390||
|2 typecheck|PASS|42.095||
|3 unit|PASS|460.453|{"ui":{"passed":63,"skipped":0},"shared":{"passed":701,"skipped":0},"server":{"passed":253,"skipped":0},"integrations":{"passed":107,"skipped":2},"portal":{"passed":440,"skipped":0},"admin":{"passed":574,"skipped":0}}|
|4 integration|PASS|1392.007|{"server":{"passed":2056,"skipped":0},"db":{"passed":144,"skipped":0}}|
|5 depcheck|PASS|14.017||
|6 forced MSW/native builds and owned runtime cutover|PASS|139.261||
|7 full MSW behavior|PASS|865.839|{"startTime":"2026-11-07T06:32:16.578Z","duration":864156.883,"expected":391,"skipped":4,"unexpected":0,"flaky":0}|
|8 full native behavior|PASS|3611.250|{"startTime":"2026-11-07T06:46:42.733Z","duration":3609552.971,"expected":386,"skipped":9,"unexpected":0,"flaky":0}|
|9 whole MSW parity incl old14; Q1 four-ID waivers explicit|MEASURED_OWNER_REVIEW_REQUIRED|1002.598|{"startTime":"2026-11-07T07:46:55.128Z","duration":1000543.6,"expected":438,"skipped":78,"unexpected":66,"flaky":0}|
|10 native v46 plus affected parity|FAILED|1378.236|{"startTime":"2026-11-07T08:13:24.312Z","duration":1376726.6220000002,"expected":82,"skipped":4,"unexpected":50,"flaky":0}|

Raw ledger: `test-results/v46-814-A22-85fb990e-ledger.json`; command logs share the same prefix. Unexpected parity/harness failure at gate10

## d1b8a5eb ? FAILED

|Gate|Result|Seconds|Counts|
|---|---|---:|---|
|1 lint|PASS|86.923||
|2 typecheck|PASS|33.144||
|3 unit|PASS|310.778|{"server":{"passed":253,"skipped":0},"ui":{"passed":63,"skipped":0},"integrations":{"passed":107,"skipped":2},"portal":{"passed":440,"skipped":0},"shared":{"passed":701,"skipped":0},"admin":{"passed":574,"skipped":0}}|
|4 integration|PASS|1658.667|{"server":{"passed":2056,"skipped":0},"db":{"passed":144,"skipped":0}}|
|5 depcheck|PASS|14.390||
|6 forced MSW/native builds and owned runtime cutover|PASS|143.747||
|7 full MSW behavior|FAILED|892.320|{"startTime":"2026-11-07T09:22:55.849Z","duration":890611.235,"expected":390,"skipped":4,"unexpected":1,"flaky":0}|

Raw ledger: `test-results/v46-814-A22-d1b8a5eb-ledger.json`; command logs share the same prefix. Behavior gate7 failed

Latest d1b8a5eb: gate7 failed on Affiliate mock region persistence (390 passed/1 failed/4 existing skips). Native/parity not run in that attempt.85fb990e did pass full MSW391/native386, but its native D44 capture failure prevents treating that earlier sweep as DONE. External reboot ended f64505aa and original HOLD; no continuity claim.
