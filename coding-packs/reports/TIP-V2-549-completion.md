# TIP-V2-549 ? Provider failure acceptance

Status: scoped acceptance PASS; P5 overall still IN PROGRESS.

Added two separate integration cases for retryable and terminal IntegrationError.
Both assert no message, unchanged cursor/deadline/lines, released draft lease,
then explicit recovery publishes once and replay cannot publish again.
No automatic retry policy for terminal errors is claimed. No production changes.

Evidence in evidence/v2-549-bot, source22e6582c plus the new test:
- Native test DB5432/opchub_test and Redis2, fake provider:2/2 PASS,10.87s.
- LLM adapter unit files:27/27 PASS,2files,842ms; no external calls.
- Root lint/typecheck/test/depcheck all exit0. Test tasks6/6,5 cached.
- Root receipt scope label says Accountant fee link due to reused wrapper label;
  commands actually run the repository-wide gates, not a fee-specific suite.

Also closed TIP548 native emergency/hide:1/1 PASS5.9min including original
nextAt wait, live hide and human preservation. Native restore required/demo/flush
all exit0, restored=true. Together with previous8, both browser lanes now have
9 passing focused cases across separate runs, not one combined9-case run.
Native runtime remains backend159fc82b/UIed9dbccc, unchanged by test-only work.

Remaining P5: exact501/502 reconciliation, UI parity, dev integration and
owner-review PR. No overall DONE or older-phase acceptance claim.
