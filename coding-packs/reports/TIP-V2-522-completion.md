# TIP-V2-522 — Public registration settings load race

## Reproduced / fixed
The unchanged A-11 browser negative fails in the first complete MSW run:
219pass/2fail at build4c1fd891. An isolated request confirms the closed cookie is
present and actual public settings correctly returns registrationOpen=false.
The transport is not broken: navigation hook fails open while query data is
undefined. Three new delayed-load/error cases fail before fix; cached-closed
control passes. All four pass unchanged after the correction.

Unknown settings now await the existing query (cancelRefetch=false deduplicates
the in-flight request). Unknown/failed data never enters /register; failure has a
distinct retry message, not a false “Admin closed signup” notice. Known closed
retains the original notice; known open still navigates. LoginScreen has only a
one-line void callback adapter. Backend guards/registration rules are unchanged.

## Verification and remaining failure disclosure
- Shared real QueryClient hook controls4/4 pass: delayed closed/open, failed load
  and successful retry, cached closed with no extra request.
- Fresh MSW Portal/Admin builds with demo-account display **off** correct the
  unrelated V2Q-163 build configuration failure; no test assertion is changed.
- Unchanged A-01/auth-flows browser cohort: **21pass/1fail**. A-11 closed signup,
  positive signup and V2Q-163 pass. UAT-11 password-reset second-login click times
  out in this cohort; unchanged isolated UAT-11 then passes1/1. This is an OPEN
  intermittent finding, not silently discarded or marked fixed by a retry.
- Final root lint8/8 and typecheck8/8 (seven cached each) pass. Forced units
  **1197pass +2 existing storage skips**: shared280/Admin435/Portal184/server203/
  UI43/integrations52, six tasks/zero cached. Depcheck zero violations:
  FE1582 modules/4515 dependencies, server768/3400.
- Initial test-deferred resolvers inferred never; explicit void signatures fix
  strict typing without casts. ESLint caught a Promise callback passed as void;
  explicit void adapter fixes it. Both diagnostics are retained with raw failures.

## Qualification
Current native full behavior invocation is still running on immutable4c1fd891
server/Next bundles. This Portal-only source patch is not deployed there and does
not affect its seed scripts or assertions. No post-fix native browser or complete
MSW suite PASS is claimed. Broad final acceptance, missing P5 live cases, real LLM,
UAT/AT/LK, audits, parity and owner-reviewed dev-to-main PR remain open.
