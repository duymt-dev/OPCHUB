# Policy API field errors — source `7c36279`

- `404-policy-fields-before.log`: negative reproduction, **3 failed/8 passed**.
- `404-policy-fields-focused.log`: after correction, **11/11 passed**.
- `404-policy-fields-gates.log`: forced **22/22 tasks**, **776 passed + two
  existing skips**; Admin 294, Portal 163, shared 140, server 111, UI 43,
  integrations 25. Focused cases are included, not added to this total.
- `404-policy-fields-depcheck.log`: both graphs pass, **1459/4002**, **668/2924**.
- `404-policy-fields-{msw,native}-build.log`: separate Admin production builds.
- `404-policy-fields-committed-msw.log`: **44/44** regression on committed
  `7c36279`, 1.5 minutes. Same nineteen files as the preceding full checkpoint,
  listed in `browser-files.txt`; no native target and no browser 400 injection.

Logs normalized to UTF-8, ANSI/trailing whitespace removed, sensitive lines
redacted. Unit failures are retained, not presented as passing gates.
The three additional cases inject an ApiError at the API boundary and verify
Form.Item error association, first-message behavior, ignored unknown fields,
draft retention and retry. This does not prove native/browser 400 acceptance.
Normal-state parity remains the historical `822a9cb` measurement (11/14).
