import {
  renewalSettingsSchema,
  renewalListSchema,
  renewalSendResultSchema,
  type RenewalSettingsPatch,
  type RenewalSend,
} from '@opchub/shared/api-domains';
import { api } from '@/lib/api-client';
export const renewalKeys = {
  config: ['admin-settings', 'renewal'] as const,
  list: ['admin-renewal', 'members'] as const,
};
export const fetchRenewal = () => api('/admin/settings/renewal', { schema: renewalSettingsSchema });
export const saveRenewal = (body: RenewalSettingsPatch) =>
  api('/admin/settings/renewal', { method: 'PATCH', body, schema: renewalSettingsSchema });
export const fetchRenewalMembers = (cursor?: string) =>
  api('/admin/renewal/members?limit=20' + (cursor ? '&cursor=' + encodeURIComponent(cursor) : ''), {
    schema: renewalListSchema,
  });
export const sendRenewal = (body: RenewalSend) =>
  api('/admin/renewal/send', { method: 'POST', body, schema: renewalSendResultSchema });
