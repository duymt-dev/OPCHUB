import type { Campaign, CampaignAudience } from '@opchub/shared/api-domains';

export const CAMPAIGN_SELECT = {
  id: true,
  name: true,
  subject: true,
  bodyHtml: true,
  audience: true,
  groupIds: true,
  status: true,
  recipients: true,
  openRate: true,
  clickRate: true,
  sendAt: true,
  createdAt: true,
} as const;

export interface CampaignRow {
  id: string;
  name: string;
  subject: string;
  bodyHtml: string;
  audience: CampaignAudience;
  groupIds: string[];
  status: Campaign['status'];
  recipients: number | null;
  openRate: number | null;
  clickRate: number | null;
  sendAt: Date | null;
  createdAt: Date;
}

const AUD_LABEL: Record<Exclude<CampaignAudience, 'groups'>, string> = {
  all: 'Tất cả thành viên',
  business: 'Doanh nghiệp',
  personal: 'Cá nhân',
};

/** Nhãn đối tượng dựng ở server ("Nhóm: OPC Hà Nội, OPC Bắc Ninh") theo thứ tự đã chọn */
export function audienceLabel(
  audience: CampaignAudience,
  groupIds: readonly string[],
  groupNames: ReadonlyMap<string, string>,
): string {
  if (audience !== 'groups') return AUD_LABEL[audience];
  const names = groupIds.flatMap((id) => {
    const n = groupNames.get(id);
    return n ? [n] : [];
  });
  return `Nhóm: ${names.join(', ')}`;
}

export function toCampaign(r: CampaignRow, groupNames: ReadonlyMap<string, string>): Campaign {
  const sent = r.status === 'sent';
  return {
    id: r.id,
    name: r.name,
    subject: r.subject,
    body: r.bodyHtml,
    audience: r.audience,
    groupIds: r.groupIds,
    audienceLabel: audienceLabel(r.audience, r.groupIds, groupNames),
    recipients: r.recipients,
    openRate: sent ? r.openRate : null,
    clickRate: sent ? r.clickRate : null,
    status: r.status,
    sendAt: r.sendAt?.toISOString() ?? null,
    createdAt: r.createdAt.toISOString(),
  };
}
