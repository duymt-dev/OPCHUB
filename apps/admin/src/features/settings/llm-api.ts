import {
  llmConfigSchema,
  llmConfigVerifyResultSchema,
  type LlmConfigUpdate,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

export const llmKey = ['admin-settings', 'llm'] as const;
export const fetchLlmConfig = () => api('/admin/settings/llm', { schema: llmConfigSchema });
export const saveLlmConfig = (body: LlmConfigUpdate) =>
  api('/admin/settings/llm', { method: 'PUT', body, schema: llmConfigSchema });
export const verifyLlmConfig = (body: LlmConfigUpdate) =>
  api('/admin/settings/llm/verify', { method: 'POST', body, schema: llmConfigVerifyResultSchema });
