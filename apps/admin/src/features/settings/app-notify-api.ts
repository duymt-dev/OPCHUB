import {
  appNotifySettingsSchema,
  appNotifyTestResultSchema,
  type AppNotifyPatch,
  pushPublicConfigSchema,
  pushSubscribeSchema,
  pushMutationResultSchema,
  type PushSubscribe,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
export const appNotifyKey = ['admin-settings', 'app'] as const;
export const fetchAppNotify = () => api('/admin/settings/app', { schema: appNotifySettingsSchema });
export const saveAppNotify = (body: AppNotifyPatch) =>
  api('/admin/settings/app', { method: 'PATCH', body, schema: appNotifySettingsSchema });
export const testAppNotify = () =>
  api('/admin/settings/app/test', { method: 'POST', schema: appNotifyTestResultSchema });
export const fetchDeviceConfig = () => api('/push/config', { schema: pushPublicConfigSchema });
export const registerDevice = (body: PushSubscribe) =>
  api('/push/subscriptions', {
    method: 'POST',
    body: pushSubscribeSchema.parse(body),
    schema: pushMutationResultSchema,
  });
export const unregisterDevice = (endpoint: string) =>
  api('/push/subscriptions', {
    method: 'DELETE',
    body: { endpoint },
    schema: pushMutationResultSchema,
  });
