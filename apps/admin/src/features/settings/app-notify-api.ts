import {
  appNotifySettingsSchema,
  appNotifyTestResultSchema,
  type AppNotifyPatch,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
export const appNotifyKey = ['admin-settings', 'app'] as const;
export const fetchAppNotify = () => api('/admin/settings/app', { schema: appNotifySettingsSchema });
export const saveAppNotify = (body: AppNotifyPatch) =>
  api('/admin/settings/app', { method: 'PATCH', body, schema: appNotifySettingsSchema });
export const testAppNotify = () =>
  api('/admin/settings/app/test', { method: 'POST', schema: appNotifyTestResultSchema });
