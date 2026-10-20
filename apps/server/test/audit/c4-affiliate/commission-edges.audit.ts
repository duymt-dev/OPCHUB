import { S, T, type AffiliateEdge } from './types.audit';

const writes = `${S}/repositories/affiliate-write.repository.ts`;
const admin = `${T}/admin-commissions.int.spec.ts`;
const rateInvariant = { file: admin, re: /it\('REQ-308 % đơn\/bulk chỉ tính lại recorded/ };

export const AFFILIATE_COMMISSION_EDGES: readonly AffiliateEdge[] = [
  {
    id: 'commission-paid',
    label: 'AF-R09 recorded commission → paid',
    transition: { machine: 'commission', from: 'recorded', to: 'paid' },
    implementation: [
      { file: writes, re: /canCommission\('recorded', 'paid'\)/ },
      { file: writes, re: /AND month_key=.*AND status='recorded' RETURNING amount/ },
      { file: `${S}/services/payout.service.ts`, re: /month >= monthKey\(now\)/ },
    ],
    trigger: { kind: 'http', routes: ['POST /v1/admin/affiliates/:id/payouts'] },
    positive: { file: `${T}/payout.int.spec.ts`, re: /it\('REQ-309 AT-AF05 paused vẫn chi/ },
    blocked: { file: `${T}/payout.int.spec.ts`, re: /it\('D-63 từ chối tháng hiện tại/ },
  },
  {
    id: 'commission-cancelled',
    label: 'AF-R10 recorded commission → cancelled',
    transition: { machine: 'commission', from: 'recorded', to: 'cancelled' },
    implementation: [
      { file: writes, re: /canCommission\('recorded', 'cancelled'\)/ },
      { file: writes, re: /AND status='recorded' RETURNING id/ },
    ],
    trigger: { kind: 'http', routes: ['POST /v1/admin/affiliate/commissions/cancel'] },
    positive: { file: admin, re: /it\('REQ-310 hủy có lý do\/audit\/notice/ },
    blocked: { file: admin, re: /it\('REQ-310 hủy có lý do\/audit\/notice/ },
  },
  {
    id: 'recorded-rate-only',
    label: 'AF-R08 đổi %: chỉ recorded; paid/cancelled bất biến (invariant)',
    implementation: [
      { file: writes, re: /UPDATE commissions SET rate=/ },
      { file: writes, re: /AND status='recorded'`/ },
    ],
    trigger: {
      kind: 'http',
      routes: ['PATCH /v1/admin/affiliates/:id', 'PUT /v1/admin/affiliates/rate'],
    },
    positive: rateInvariant,
    blocked: rateInvariant,
  },
];
