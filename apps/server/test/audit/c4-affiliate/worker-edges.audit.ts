import { PROCESSOR, S, T, type AffiliateEdge } from './types.audit';

const confirmed = {
  kind: 'worker',
  label: 'outbox membership_fee.confirmed',
  anchors: [{ file: PROCESSOR, re: /register\('membership_fee.confirmed'.*onFeeConfirmed/ }],
} as const;

const referralGuard = {
  file: `${S}/repositories/commission.repository.ts`,
  re: /where: \{ id, status: 'pending' \}/,
};

export const AFFILIATE_WORKER_EDGES: readonly AffiliateEdge[] = [
  {
    id: 'agent-created',
    label: 'D-94 3A chưa có đại lý → tự tạo (đăng ký / phí / backfill)',
    implementation: [
      {
        file: `${S}/services/affiliate-lifecycle.handler.ts`,
        re: /await this.ensureAffiliate\(tx, p.userId\)/,
      },
      { file: `${S}/services/affiliate-allocation.service.ts`, re: /async ensure\(/ },
    ],
    trigger: confirmed,
    positive: { file: `${T}/lifecycle.int.spec.ts`, re: /it\('AT-AF01 REQ-301 webhook/ },
    blocked: { file: `${T}/lifecycle.int.spec.ts`, re: /it\('D-94 3A backfill idempotent/ },
  },
  {
    id: 'referral-converted',
    label: 'AF-R05 pending referral → converted',
    transition: { machine: 'referral', from: 'pending', to: 'converted' },
    implementation: [
      {
        file: `${S}/services/affiliate-lifecycle.handler.ts`,
        re: /closeReferral\(tx, ref.id, 'converted', at\)/,
      },
      { file: `${S}/repositories/commission.repository.ts`, re: /canReferral\('pending', to\)/ },
      referralGuard,
    ],
    trigger: confirmed,
    positive: { file: `${T}/commission.int.spec.ts`, re: /it\('AT-AF02 REQ-306 phí/ },
    blocked: {
      file: `${T}/referral-terminal.int.spec.ts`,
      re: /it\('REQ-306 void referral \(dữ liệu cũ trước D-110\) không thành converted/,
    },
  },
];
