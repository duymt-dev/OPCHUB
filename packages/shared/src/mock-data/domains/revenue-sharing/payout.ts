import {
  affiliateBankSchema,
  affiliatePayoutKeySchema,
  revenuePayoutRequestSchema,
  revenuePayoutSchema,
} from '../../../api-domains';
import { canSettleRevenueShare } from '../../../revenue-sharing/math';
import { directorActor } from '../regional-directors/access';
import { mockRecipientBank } from '../regional-directors/bank';
import { mockAffiliateNotice } from '../affiliate-admin/notice';
import { invalidAffiliateInput } from '../affiliate-admin/validation';
import { logSetting } from '../settings-log';
import { conflict, notFound, ok } from '../util';
import { drainMockRevenue } from './capture';
import { knownMockRevenueDirector } from './read';
import { revenueMonth } from './state';

/** Synchronous domain transaction; the browser bridge serializes cross-tab requests. */
export function payMockDirectorRevenue(
  actorId: string,
  directorId: string,
  month: string,
  key: string | undefined,
  now = Date.now(),
) {
  const actor = directorActor(actorId, 'affiliate.payout');
  if (!actor.ok) return actor;
  const body = revenuePayoutRequestSchema.safeParse({ monthKey: month });
  if (!body.success) return invalidAffiliateInput(body.error);
  const header = affiliatePayoutKeySchema.safeParse({ idempotencyKey: key });
  if (!header.success) return invalidAffiliateInput(header.error);
  const s = drainMockRevenue();
  const requestKey = JSON.stringify([actorId, directorId, month, header.data.idempotencyKey]);
  const prior = s.payouts.find((r) => r.key === requestKey);
  if (prior) return ok(structuredClone(prior.receipt));
  if (month >= revenueMonth(now)) return conflict('Chỉ chi trả tháng đã kết thúc');
  if (!knownMockRevenueDirector(directorId)) return notFound('Không tìm thấy GĐ Vùng');
  const rows = s.shares.filter(
    (r) =>
      r.director?.id === directorId &&
      r.monthKey === month &&
      r.status === 'recorded' &&
      r.directorAmount > 0,
  );
  if (!rows.length) return conflict('Không còn khoản chia sẻ chưa chi trong kỳ');
  const latest = rows.toSorted(
    (a, b) => b.recordedAt.localeCompare(a.recordedAt) || b.id.localeCompare(a.id),
  )[0];
  if (!latest) return conflict('Không còn khoản chia sẻ chưa chi trong kỳ');
  const retained = mockRecipientBank(directorId);
  const bank = affiliateBankSchema.safeParse(
    retained === undefined ? latest.director?.bank : retained,
  );
  if (!bank.success) return conflict('GĐ Vùng chưa cập nhật tài khoản nhận hợp lệ');
  const receipt = revenuePayoutSchema.parse({
    id: crypto.randomUUID(),
    directorId,
    directorName: latest.director?.name,
    region: latest.region,
    monthKey: month,
    amount: rows.reduce((n, r) => n + BigInt(r.directorAmount), 0n).toString(),
    shareCount: rows.length,
    bank: bank.data,
    paidBy: actorId,
    paidAt: new Date(now).toISOString(),
  });
  for (const row of rows) {
    if (!canSettleRevenueShare(row.status, 'paid')) throw new Error('Invalid revenue transition');
    row.status = 'paid';
    row.payoutId = receipt.id;
  }
  s.payouts.push({ key: requestKey, receipt });
  logSetting(
    actorId,
    'affiliate.revenue_payout',
    receipt.id,
    `Chi trả GĐ Vùng ${receipt.directorName} · kỳ ${month} · ${receipt.amount}đ`,
    'affiliate',
    { ...receipt },
    actor.data.name,
  );
  mockAffiliateNotice(
    directorId,
    `Đã chi trả chia sẻ doanh thu ${month}`,
    `${receipt.amount}đ · ${bank.data.bankHolder} · ${bank.data.bankName} ${bank.data.bankNo}`,
  );
  return ok(structuredClone(receipt));
}
