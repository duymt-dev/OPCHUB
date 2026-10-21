# TIP-V2-528 — Fresh full functional checkpoint

Run all222 existing behavior cases against the managed native HOLD, preserving
the same assertions as MSW. Record source and actual artifact revisions, all
terminal counts, required/demo seed/cache restoration and raw failures. Compare
with the full post526 MSW receipt. Rerun forced root integration on native test
DB/Redis2, not dev1. A passing behavior registry is not complete UAT/AT/LK
coverage, audit, parity or P5 completion. Findings require scoped refine TIPs;
do not skip/narrow cases or rerun until the historical failure disappears.

No app changes belong to this checkpoint. Later TIP-529 producer correction
must be reported separately from the immutable pre529 full-native invocation.
