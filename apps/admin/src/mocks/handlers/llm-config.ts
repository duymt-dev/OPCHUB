import {
  EMPTY_LLM_CONFIG,
  llmConfigSchema,
  llmConfigUpdateSchema,
  llmConfigVerifySchema,
  type LlmConfig,
} from '@opchub/shared/api-domains';
import { logSetting } from '@opchub/shared/mock-domains';
import { http, HttpResponse } from 'msw/http';
import { mockAdminGuard } from './admin-guard';
import { parseBody, userIdOf } from './domain-util';
import { API, apiError } from './util';

const KEY = 'opchub-mock-llm-config';
let memory: LlmConfig = { ...EMPTY_LLM_CONFIG };
function current(): LlmConfig {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? 'null');
    const parsed = llmConfigSchema.safeParse(value);
    if (parsed.success) return parsed.data;
  } catch {
    /* Node test or disabled storage: use in-memory mock state. */
  }
  return memory;
}

export function resetMockLlmConfig(): void {
  memory = { ...EMPTY_LLM_CONFIG };
  try {
    sessionStorage.removeItem(KEY);
  } catch {
    /* Storage unavailable. */
  }
}

/** Only public masked fields persist across browser reload; never keep a plaintext API key. */
function persist(value: LlmConfig): void {
  memory = value;
  try {
    sessionStorage.setItem(KEY, JSON.stringify(value));
  } catch {
    /* Storage unavailable. */
  }
}

export const llmConfigHandlers = [
  http.get(
    `${API}/admin/settings/llm`,
    ({ request }) => mockAdminGuard(request, 'settings.general') ?? HttpResponse.json(current()),
  ),
  http.put(`${API}/admin/settings/llm`, async ({ request }) => {
    const denied = mockAdminGuard(request, 'settings.general');
    if (denied) return denied;
    const body = await parseBody(request, llmConfigUpdateSchema);
    if (!body.ok) return body.res;
    const { key, ...fields } = body.data;
    const previous = current();
    const hasKey = Boolean(key || previous.hasKey);
    if (fields.enabled && !hasKey) return apiError(409, 'CONFLICT', 'Chưa cấu hình khóa API AI');
    const saved: LlmConfig = {
      ...fields,
      hasKey,
      keyLast4: key ? key.slice(-4) : previous.keyLast4,
      configured: Boolean(fields.enabled && fields.baseUrl && fields.model && hasKey),
      updatedAt: new Date().toISOString(),
    };
    persist(saved);
    logSetting(userIdOf(request), 'llm.update', 'llm_config', 'Cập nhật AI', 'settings');
    return HttpResponse.json(saved);
  }),
  http.post(`${API}/admin/settings/llm/verify`, async ({ request }) => {
    const denied = mockAdminGuard(request, 'settings.general');
    if (denied) return denied;
    const body = await parseBody(request, llmConfigVerifySchema);
    if (!body.ok) return body.res;
    const ok = Boolean(body.data.key || current().hasKey);
    logSetting(
      userIdOf(request),
      'llm.verify',
      'llm_config',
      ok ? 'Kiểm tra AI thành công' : 'Kiểm tra AI thất bại',
      'settings',
    );
    return HttpResponse.json(
      {
        ok,
        message: ok
          ? 'Kết nối AI thành công'
          : 'Không kết nối được AI. Kiểm tra cấu hình và khóa API.',
      },
      { status: 201 },
    );
  }),
];
