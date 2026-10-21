# TIP-V2-538 — Registration delivery and cross-app acceptance

TIP-503 UAT-02/03/04 and personal portion of REQ-401/LK-01. The old UAT-02
title labels a duplicate-email negative case; OTP navigation alone does not
prove mail delivery or a new member visible to Admin. Add canonical personal
registration tests with unique identities: actual UI ->202 OTP dialog, short
OTP blocked without verification request, sent OTP log at Admin Marketing;
valid OTP -> active/pending-payment session -> new member/profile in Admin
Members -> sent welcome log for this exact new recipient. No seed-record proxy.

Same assertions for MSW/native, no HTTP fulfillment or onServer weakening.
Keep raw failures and distinguish test/locator errors from actual missing mock
state/effects. This TIP initially adds acceptance evidence only. Any discovered
production/mock defect needs a separate bounded refine TIP, not silent changes
here. Native cases wait for the live full runner/restoration; no concurrent dev
reset. Business registration and other LK-01/overview details remain explicit
remaining scope, not inferred from a personal-only scenario.

Run root gates, record both-lane results, commit/push; never mark the full goal
done from these two cases. No paid mail/LLM provider or native process changes.
