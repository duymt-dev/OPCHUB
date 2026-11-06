import {
  affiliateBulkRateSchema,
  affiliateCancelSchema,
  affiliatePolicySchema,
  affiliateRestoreSchema,
} from '../../../api-domains';
import { mockCommissionAmount, syncMockAffiliates } from '../affiliate';
import { logSetting } from '../settings-log';
import { notFound, ok } from '../util';
import { affiliateCommissionRefs } from './state';
import { invalidAffiliateInput } from './validation';
import { readMockAffiliatePolicy, replaceMockAffiliatePolicy } from '../affiliate-policy';
import { mockAffiliateNotice } from './notice';

export const mockAffiliatePolicy = readMockAffiliatePolicy;

export function saveMockAffiliatePolicy(actor: string, input: unknown) {
  const parsed = affiliatePolicySchema.safeParse(input);
  if (!parsed.success)
    return parsed.error.issues.every(
      (i) => i.path[0] === 'renewalRate' || i.path[0] === 'renewalMaxYear',
    )
      ? { ...invalidAffiliateInput(parsed.error), status: 422 as const }
      : invalidAffiliateInput(parsed.error);
  if (parsed.data.regionalMin > parsed.data.regionalFirstYear)
    return {
      ok: false as const,
      status: 422 as const,
      code: 'VALIDATION_ERROR' as const,
      message: 'Mức tối thiểu không được vượt năm đầu',
      fields: [{ path: 'regionalMin', message: 'Mức tối thiểu không được vượt năm đầu' }],
    };
  replaceMockAffiliatePolicy(parsed.data);
  logSetting(actor, 'affiliate.policy_update', '1', 'Cập nhật chính sách Affiliate', 'affiliate');
  return ok(mockAffiliatePolicy());
}

export function cancelMockAffiliateCommissions(actor: string, input: unknown) {
  const parsed = affiliateCancelSchema.safeParse(input);
  if (!parsed.success) return invalidAffiliateInput(parsed.error);
  const ids = [...new Set(parsed.data.ids)];
  const refs = affiliateCommissionRefs();
  const rows = ids.map((id) => refs.find((r) => r.row.id === id));
  if (rows.some((row) => !row)) return notFound('Không tìm thấy khoản hoa hồng');
  let cancelled = 0;
  for (const ref of rows) {
    if (!ref || ref.row.status !== 'recorded') continue;
    ref.row.status = 'cancelled';
    ref.row.cancelReason = parsed.data.reason;
    cancelled++;
    mockAffiliateNotice(ref.agentId, 'Hoa hồng đã bị hủy', `Lý do: ${parsed.data.reason}`);
  }
  logSetting(
    actor,
    'affiliate.commission_cancel',
    ids.join(','),
    `Hủy ${cancelled} khoản hoa hồng`,
    'affiliate',
  );
  return ok({ cancelled });
}

/** D-110: khôi phục Đã hủy → Đã ghi nhận (audit); khoản đã chi trả không đổi */
export function restoreMockAffiliateCommissions(actor: string, input: unknown) {
  const parsed = affiliateRestoreSchema.safeParse(input);
  if (!parsed.success) return invalidAffiliateInput(parsed.error);
  const ids = [...new Set(parsed.data.ids)];
  const refs = affiliateCommissionRefs();
  const rows = ids.map((id) => refs.find((r) => r.row.id === id));
  if (rows.some((row) => !row)) return notFound('Không tìm thấy khoản hoa hồng');
  let restored = 0;
  for (const ref of rows) {
    if (!ref || ref.row.status !== 'cancelled') continue;
    ref.row.status = 'recorded';
    ref.row.cancelReason = null;
    restored++;
  }
  logSetting(
    actor,
    'affiliate.commission_restore',
    ids.join(','),
    `Khôi phục ${restored} khoản hoa hồng`,
    'affiliate',
  );
  return ok({ restored });
}

export function setMockAffiliateRates(actor: string, input: unknown) {
  const parsed = affiliateBulkRateSchema.safeParse(input);
  if (!parsed.success) return invalidAffiliateInput(parsed.error);
  const ids = [...new Set(parsed.data.ids)];
  const state = syncMockAffiliates();
  if (ids.some((id) => !state.agents.has(id))) return notFound('Không tìm thấy đại lý');
  for (const id of ids) {
    const agent = state.agents.get(id);
    if (agent) {
      agent.rate = parsed.data.rate;
      mockAffiliateNotice(
        id,
        `Tỷ lệ hoa hồng của bạn đổi thành ${parsed.data.rate}%`,
        'Áp dụng cho các khoản hoa hồng chưa chi trả và khách mới từ hôm nay.',
      );
    }
  }
  for (const ref of affiliateCommissionRefs()) {
    if (
      ids.includes(ref.agentId) &&
      ref.row.status === 'recorded' &&
      (ref.customerYear ?? 1) === 1 &&
      ref.plan !== 'fundraising' &&
      mockCommissionAmount(ref.row.feeAmount, parsed.data.rate) > 0
    ) {
      ref.row.rate = parsed.data.rate;
      ref.row.commission = mockCommissionAmount(ref.row.feeAmount, parsed.data.rate);
    }
  }
  logSetting(
    actor,
    'affiliate.rate_change',
    ids.join(','),
    `Đặt tỷ lệ ${parsed.data.rate}% cho ${ids.length} affiliate`,
    'affiliate',
  );
  return ok({ updated: ids.length });
}
