import { http, HttpResponse } from 'msw/http';
import {
  aiProviderIdSchema,
  aiKeyLast4,
  aiSettingsResponseSchema,
  aiSettingsUpdateSchema,
  aiVerifySchema,
  AI_PROVIDER_CATALOG,
  type AiSettingsResponse,
} from '@opchub/shared/api-domains';
import { emptyAiProviders, logSetting } from '@opchub/shared/mock-domains';
import { mockAdminGuard } from './admin-guard';
import { parseBody, userIdOf } from './domain-util';
import { API, apiError } from './util';
const KEY = 'opchub-mock-ai-providers';
let memory = emptyAiProviders();
function current() {
  try {
    const hit = aiSettingsResponseSchema.safeParse(
      JSON.parse(sessionStorage.getItem(KEY) ?? 'null'),
    );
    if (hit.success) return hit.data;
  } catch {
    /* Non-browser tests use memory only. */
  }
  return memory;
}
function persist(value: AiSettingsResponse) {
  memory = aiSettingsResponseSchema.parse(value);
  try {
    sessionStorage.setItem(KEY, JSON.stringify(memory));
  } catch {
    /* Disabled browser storage: in-memory config. */
  }
}
export function resetMockAiProviders() {
  memory = emptyAiProviders();
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* Memory reset suffices. */
  }
}
export const aiProviderHandlers = [
  http.get(
    `${API}/admin/settings/ai`,
    ({ request }) => mockAdminGuard(request, 'settings.general') ?? HttpResponse.json(current()),
  ),
  http.put(`${API}/admin/settings/ai`, async ({ request }) => {
    const denied = mockAdminGuard(request, 'settings.general');
    if (denied) return denied;
    const body = await parseBody(request, aiSettingsUpdateSchema);
    if (!body.ok) return body.res;
    const { providers, ...config } = body.data;
    if (!providers.some((p) => p.enabled))
      return apiError(409, 'CONFLICT', 'Cần bật ít nhất 1 nhà cung cấp AI');
    const previous = current();
    if (
      providers.some(
        (p) =>
          p.enabled &&
          (!p.model ||
            !p.baseUrl ||
            !(p.key || previous.providers.find((r) => r.id === p.id)?.hasKey)),
      )
    )
      return apiError(409, 'CONFLICT', 'Nhà cung cấp: thiếu API key / Base URL / mô hình');
    if (
      [...Object.values(config.use), config.fallback].some(
        (id) => id && !providers.some((p) => p.id === id && p.enabled),
      )
    )
      return apiError(400, 'VALIDATION_ERROR', 'Nhà cung cấp đang tắt');
    persist({
      ...config,
      providers: providers.map(({ key, ...r }) => {
        const old = previous.providers.find((p) => p.id === r.id);
        return {
          ...r,
          hasKey: Boolean(key || old?.hasKey),
          keyLast4: key ? aiKeyLast4(key) : (old?.keyLast4 ?? null),
          status: key ? 'none' : (old?.status ?? 'none'),
          checkedAt: key ? null : (old?.checkedAt ?? null),
        };
      }),
      spend: {
        ...previous.spend,
        pct: config.budget
          ? Math.min(100, Math.round((previous.spend.cost * 100) / config.budget))
          : 0,
      },
    });
    logSetting(userIdOf(request), 'llm.update', 'ai', 'Đã lưu cấu hình AI Provider', 'settings');
    return HttpResponse.json(current());
  }),
  http.post(`${API}/admin/settings/ai/providers/:id/verify`, async ({ request, params }) => {
    const denied = mockAdminGuard(request, 'settings.general');
    if (denied) return denied;
    const id = aiProviderIdSchema.safeParse(params.id);
    if (!id.success) return apiError(404, 'NOT_FOUND', 'Không tìm thấy');
    const body = await parseBody(request, aiVerifySchema);
    if (!body.ok) return body.res;
    const previous = current();
    if (!(body.data.key || previous.providers.find((p) => p.id === id.data)?.hasKey))
      return apiError(400, 'VALIDATION_ERROR', 'Vui lòng nhập API key');
    persist({
      ...previous,
      providers: previous.providers.map((p) =>
        p.id === id.data ? { ...p, status: 'ok', checkedAt: new Date().toISOString() } : p,
      ),
    });
    logSetting(userIdOf(request), 'llm.verify', 'ai', 'Kiểm tra AI thành công', 'settings');
    return HttpResponse.json({
      ok: true,
      message: `${AI_PROVIDER_CATALOG[id.data].name} · kết nối thành công (${body.data.model})`,
    });
  }),
];
