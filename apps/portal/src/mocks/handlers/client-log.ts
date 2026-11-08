import { http, HttpResponse } from 'msw/http';
import { clientLogSchema } from '@opchub/shared/api-domains';
import { parseBody } from './domain-util';
import { API } from './util';

/** Fake telemetry sink: validate contract without retaining browser errors or PII. */
export const clientLogHandlers = [
  http.post(`${API}/client-logs`, async ({ request }) => {
    const body = await parseBody(request, clientLogSchema);
    return body.ok ? new HttpResponse(null, { status: 204 }) : body.res;
  }),
];
