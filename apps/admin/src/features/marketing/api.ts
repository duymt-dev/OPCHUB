import { pageSchema } from '@opchub/shared/api';
import {
  campaignEstimateSchema,
  campaignListSchema,
  campaignSchema,
  groupItemSchema,
  mailJobSchema,
  mailLogRowSchema,
  mailTemplateListSchema,
  marketingSummarySchema,
  welcomeMailSchema,
  type CampaignAudience,
  type CampaignCreate,
  type WelcomeMail,
} from '@opchub/shared/api-domains';
import { z } from 'zod';
import { api } from '@/lib/api-client';

/** Marketing (D-78/D-79) — endpoint ngoài SRS §13: Q-G6b-1. Gửi = job 202 qua outbox. */

export const marketingKeys = {
  all: ['admin-marketing'] as const,
  summary: ['admin-marketing', 'summary'] as const,
  campaigns: ['admin-marketing', 'campaigns'] as const,
  templates: ['admin-marketing', 'templates'] as const,
  log: ['admin-marketing', 'log'] as const,
  welcome: ['admin-marketing', 'welcome'] as const,
  groups: ['admin-marketing', 'groups'] as const,
  estimate: (audience: CampaignAudience, groupIds: string[]) =>
    ['admin-marketing', 'estimate', audience, [...groupIds].sort().join(',')] as const,
};

const enc = encodeURIComponent;

export const fetchSummary = () =>
  api('/admin/marketing/summary', { schema: marketingSummarySchema });
export const fetchCampaigns = () => api('/admin/campaigns', { schema: campaignListSchema });
export const fetchTemplates = () =>
  api('/admin/campaigns/templates', { schema: mailTemplateListSchema });

export function fetchEstimate(audience: CampaignAudience, groupIds: string[]) {
  const qs = new URLSearchParams({ audience });
  if (audience === 'groups' && groupIds.length) qs.set('groupIds', groupIds.join(','));
  return api(`/admin/campaigns/estimate?${qs.toString()}`, { schema: campaignEstimateSchema });
}

/** 34 nhóm (D-29) — một trang đủ */
export const fetchGroups = () =>
  api('/admin/groups?page=1&size=100', { schema: pageSchema(groupItemSchema) });

export const createCampaign = (body: CampaignCreate) =>
  api('/admin/campaigns', { method: 'POST', body, schema: campaignSchema });

export const sendCampaign = (id: string) =>
  api(`/admin/campaigns/${enc(id)}/send`, { method: 'POST', schema: mailJobSchema });

/** BUG-036: dừng chiến dịch đang gửi / đã lên lịch (thư chưa gửi bị huỷ) */
export const cancelCampaign = (id: string) =>
  api(`/admin/campaigns/${enc(id)}/cancel`, { method: 'POST', schema: campaignSchema });

export const deleteCampaign = (id: string) =>
  api(`/admin/campaigns/${enc(id)}`, { method: 'DELETE', schema: z.object({ id: z.string() }) });

export const fetchMailLog = () =>
  api('/admin/mail/log?page=1&size=100', { schema: pageSchema(mailLogRowSchema) });

export const resendMail = (id: string) =>
  api(`/admin/mail/log/${enc(id)}/resend`, { method: 'POST', schema: mailJobSchema });

export const fetchWelcome = () => api('/admin/mail/welcome', { schema: welcomeMailSchema });

export const saveWelcome = (body: WelcomeMail) =>
  api('/admin/mail/welcome', { method: 'PUT', body, schema: welcomeMailSchema });

export const testWelcome = (to: string) =>
  api('/admin/mail/welcome/test', { method: 'POST', body: { to }, schema: mailJobSchema });
