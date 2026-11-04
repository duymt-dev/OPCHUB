import { affiliatePayoutKeySchema, affiliatePayoutRequestSchema } from '../../../api-domains';
import { syncMockAffiliates } from '../affiliate';
import { logSetting } from '../settings-log';
import { conflict, notFound, ok } from '../util';
import {
  affiliateAdminState,
  affiliateCommissionRefs,
  paidSnapshot,
} from '../affiliate-admin/state';
import { invalidAffiliateInput } from '../affiliate-admin/validation';
import { mockAffiliateNotice } from '../affiliate-admin/notice';

export function seedHistoricalMockPayment(
  actor: string,
  id: string,
  month: string,
  key: string | undefined,
  now = Date.now(),
) {
  const body = affiliatePayoutRequestSchema.safeParse({ monthKey: month });
  if (!body.success) return invalidAffiliateInput(body.error);
  const header = affiliatePayoutKeySchema.safeParse({ idempotencyKey: key });
  if (!header.success) return invalidAffiliateInput(header.error);
  const state = syncMockAffiliates();
  const agent = state.agents.get(id);
  if (!agent) return notFound('Không tìm thấy đại lý');
  const extra = affiliateAdminState();
  const receiptKey = JSON.stringify([actor, id, month, header.data.idempotencyKey]);
  const prior = extra.receipts.get(receiptKey);
  if (prior) return ok({ ...prior });
  const current = new Date(now + 7 * 3_600_000).toISOString().slice(0, 7);
  if (month >= current) return conflict('Chỉ chi trả tháng đã kết thúc');
  if (!agent.bank) return conflict(`${agent.name} chưa cập nhật số tài khoản`);
  const refs = affiliateCommissionRefs();
  const recorded = refs.filter(
    (r) => r.agentId === id && r.month === month && r.row.status === 'recorded',
  );
  if (!recorded.length) return conflict(`Không còn hoa hồng chưa chi trong ${month}`);
  // Freeze pre-existing paid snapshots before adding another receipt for the same month.
  refs.filter((r) => r.row.status === 'paid').forEach(paidSnapshot);
  const bank = { ...agent.bank };
  const paidAt = new Date(now).toISOString();
  const result = {
    paid: recorded.length,
    amount: recorded.reduce((n, r) => n + r.row.commission, 0),
  };
  for (const ref of recorded) {
    ref.row.status = 'paid';
    extra.snapshots.set(ref.row.id, { paidAt, bank: { ...bank } });
  }
  const payouts = state.payouts.get(id) ?? [];
  payouts.unshift({ monthKey: month, count: result.paid, amount: result.amount, paidAt, bank });
  state.payouts.set(id, payouts);
  extra.receipts.set(receiptKey, { ...result });
  mockAffiliateNotice(
    id,
    `Đã chi trả hoa hồng ${month}: ${result.amount.toLocaleString('vi-VN')}đ`,
    `Chuyển khoản tới ${bank.bankHolder} · ${bank.bankName} ${bank.bankNo} (${result.paid} khách hàng).`,
  );
  logSetting(
    actor,
    'affiliate.payout',
    id,
    `Chi trả ${result.amount.toLocaleString('vi-VN')}đ · kỳ ${month}`,
    'affiliate',
  );
  return ok(result);
}
