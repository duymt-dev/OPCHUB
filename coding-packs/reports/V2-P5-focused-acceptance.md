# P5 focused spec/behavior acceptance — IN PROGRESS

Owner clarification2026-10-21: test spec and behavior of P5 itself. Do not
expand into registration/payment/affiliate/events unless a direct P5 dependency
requires it. Earlier503 broad matrix remains historical evidence, not grounds
to keep expanding this current bot acceptance task. No overall V2 PASS claimed.

Current source scope: TIP501/502, D50/D51, NA07/08, UAT14/15, LK11/REQ411;
bot action permissions/audit and FakeLlm error handling. Keep native hold,
fake providers, explicit-path commits and dev-to-main owner-review PR rule.

Existing browser files inspected: admin-bots(3), bot-scheduling(1), bot-auto(1),
bot-auto-lifecycle(1), bot-replies(1):7 cases. Their names alone do not prove
all acceptance; emergency-stop/hide cross-app browser coverage is still to
be verified/added, not inferred from backend integration reports.

Next: run these7 both lanes; map actual assertions and integration evidence to
501/502 criteria; add missing bot-only cases. Keep originals and report exact
counts. Unit/integration negative rules must not be replaced by only happy
browser flows. No pixel adjustments before these functional gates.
