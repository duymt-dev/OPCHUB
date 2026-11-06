import {
  aiSettingsResponseSchema,
  aiVerifyResultSchema,
  type AiSettingsUpdate,
  type AiProviderId,
  type AiVerify,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
export const aiKey = ['admin-settings', 'ai'] as const;
export const fetchAiSettings = () =>
  api('/admin/settings/ai', { schema: aiSettingsResponseSchema });
export const saveAiSettings = (body: AiSettingsUpdate) =>
  api('/admin/settings/ai', { method: 'PUT', body, schema: aiSettingsResponseSchema });
export const verifyAiProvider = ({ id, ...body }: AiVerify & { id: AiProviderId }) =>
  api(`/admin/settings/ai/providers/${id}/verify`, {
    method: 'POST',
    body,
    schema: aiVerifyResultSchema,
  });
