import {
  pushPublicConfigSchema,
  pushPreferencesSchema,
  pushMutationResultSchema,
  type PushSubscribe,
  type PushPreferences,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';

export const pushConfigKey = ['push', 'config'] as const;
export const pushPreferencesKey = ['push', 'preferences'] as const;
export const fetchPushConfig = () => api('/push/config', { schema: pushPublicConfigSchema });
export const fetchPushPreferences = () =>
  api('/push/preferences', { schema: pushPreferencesSchema });
export const savePushPreferences = (body: PushPreferences) =>
  api('/push/preferences', { method: 'PUT', body, schema: pushPreferencesSchema });
export const subscribePush = (body: PushSubscribe) =>
  api('/push/subscriptions', { method: 'POST', body, schema: pushMutationResultSchema });
export const unsubscribePush = (endpoint: string) =>
  api('/push/subscriptions', {
    method: 'DELETE',
    body: { endpoint },
    schema: pushMutationResultSchema,
  });
