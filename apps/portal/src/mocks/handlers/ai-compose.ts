import { http, HttpResponse } from 'msw/http';
import { aiComposeSchema, AI_COMPOSE_LIMITS } from '@opchub/shared/api-domains';
import { parseBody } from './domain-util';
import { API, apiError } from './util';

// Explicit MSW fixture only. No component or production endpoint reads this key.
const configured = () => sessionStorage.getItem('opchub-mock-ai-compose') === 'true';
export const aiComposeHandlers = [
  http.get(`${API}/ai/config`, () => HttpResponse.json({ compose: configured() })),
  http.post(`${API}/ai/compose`, async ({ request }) => {
    const body = await parseBody(request, aiComposeSchema);
    if (!body.ok) return body.res;
    if (!configured()) return apiError(409, 'CONFLICT', 'not_configured');
    if (body.data.kind === 'campaign_body') return apiError(403, 'FORBIDDEN', 'Bạn không có quyền');
    return HttpResponse.json({
      text: 'Giải pháp cộng đồng giúp doanh nghiệp kết nối và phát triển bền vững.'.slice(
        0,
        AI_COMPOSE_LIMITS[body.data.kind],
      ),
    });
  }),
];
