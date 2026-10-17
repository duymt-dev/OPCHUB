import { listCampaigns, listMailLog, resetMockDb } from '@opchub/shared/mock-domains';
import type { DbTx } from '../../src/client';

/**
 * Domain marketing + mail: chiến dịch cp1–cp4 (CAMP_SEED) và nhật ký gửi (mail chào mừng w1, w2).
 *
 * Server đếm "Email đã gửi 30 ngày" từ số dòng `mail_logs`, còn mock cộng `recipients` của chiến dịch
 * đã gửi (Q-B62-11). Để khớp, mỗi chiến dịch đã gửi có đủ N dòng `mail_logs` kind `campaign` (địa chỉ
 * `<chiến dịch>-<n>@demo.opchub.vn`, không trùng ai) — chèn một câu bằng generate_series.
 */
export async function seedMarketing(tx: DbTx): Promise<void> {
  resetMockDb();
  const campaigns = listCampaigns();
  await tx.campaign.createMany({
    data: campaigns.map((c) => ({
      id: c.id,
      name: c.name,
      subject: c.subject,
      bodyHtml: c.body,
      audience: c.audience,
      groupIds: c.groupIds,
      status: c.status,
      recipients: c.recipients,
      openRate: c.openRate,
      clickRate: c.clickRate,
      sendAt: c.sendAt ? new Date(c.sendAt) : null,
      createdBy: 'admin',
      createdAt: new Date(c.createdAt),
      updatedAt: new Date(c.createdAt),
    })),
  });
  const log = listMailLog();
  await tx.mailLog.createMany({
    data: log.map((m) => ({
      id: m.id,
      to: m.to,
      kind: m.kind,
      subject: m.subject,
      status: 'sent' as const,
      attempts: 1,
      sentAt: new Date(m.sentAt),
      createdAt: new Date(m.sentAt),
      updatedAt: new Date(m.sentAt),
    })),
  });
  const sent = campaigns.filter((c) => c.status === 'sent' && c.recipients && c.sendAt);
  await tx.$executeRaw`
    INSERT INTO mail_logs (id, "to", kind, subject, status, attempts, campaign_id, sent_at, created_at, updated_at)
    SELECT c.id || '-' || n, c.id || '-' || n || '@demo.opchub.vn', 'campaign'::mail_kind, c.subject,
           'sent'::mail_status, 1, c.id, c.send_at, c.send_at, c.send_at
    FROM unnest(${sent.map((c) => c.id)}::text[], ${sent.map((c) => c.subject)}::text[],
                ${sent.map((c) => c.recipients ?? 0)}::int[],
                ${sent.map((c) => new Date(c.sendAt ?? 0))}::timestamptz[])
         AS c(id, subject, recipients, send_at)
    CROSS JOIN LATERAL generate_series(1, c.recipients) AS n`;
}
