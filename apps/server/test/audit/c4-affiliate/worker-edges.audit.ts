import { PROCESSOR, S, T, type AffiliateEdge } from './types.audit';

const changed = {
  kind: 'worker',
  label: 'outbox membership_fee.changed / activated',
  anchors: [
    { file: PROCESSOR, re: /register\('membership_fee.changed'.*onFeeChanged/ },
    { file: PROCESSOR, re: /register\('membership_fee.activated'.*onFeeChanged/ },
  ],
} as const;
const confirmed = {
  kind: 'worker',
  label: 'outbox membership_fee.confirmed',
  anchors: [{ file: PROCESSOR, re: /register\('membership_fee.confirmed'.*onFeeConfirmed/ }],
} as const;
const repositoryGuard = {
  file: `${S}/repositories/affiliate.repository.ts`,
  re: /where: \{ userId, status: from \}/,
};
const referralGuard = {
  file: `${S}/repositories/commission.repository.ts`,
  re: /where: \{ id, status: 'pending' \}/,
};
const staleFee = {
  file: `${T}/pause.int.spec.ts`,
  re: /it\('REQ-307 retry xác nhận cũ không bật lại/,
};

export const AFFILIATE_WORKER_EDGES: readonly AffiliateEdge[] = [
  {
    id: 'agent-created',
    label: 'AF-R01 chưa có đại lý → tự tạo từ phí (lifecycle)',
    implementation: [
      {
        file: `${S}/services/affiliate-lifecycle.handler.ts`,
        re: /await this.ensureAffiliate\(tx, p.userId\)/,
      },
      { file: `${S}/services/affiliate-allocation.service.ts`, re: /async ensure\(/ },
    ],
    trigger: confirmed,
    positive: { file: `${T}/lifecycle.int.spec.ts`, re: /it\('AT-AF01 REQ-301 webhook/ },
    blocked: { file: `${T}/lifecycle.int.spec.ts`, re: /it\('REQ-301 backfill idempotent/ },
  },
  {
    id: 'agent-paused',
    label: 'AF-R07 active → paused',
    transition: { machine: 'affiliate', from: 'active', to: 'paused' },
    implementation: [
      { file: `${S}/domain/affiliate.state.ts`, re: /active: \['paused'\]/ },
      {
        file: `${S}/services/affiliate-lifecycle.handler.ts`,
        re: /transition\(tx, p.userId, 'active', 'paused'\)/,
      },
      repositoryGuard,
    ],
    trigger: changed,
    positive: { file: `${T}/pause.int.spec.ts`, re: /it\('AT-AF05 REQ-307 hết phí/ },
    blocked: staleFee,
  },
  {
    id: 'agent-resumed',
    label: 'AF-R07 paused → active',
    transition: { machine: 'affiliate', from: 'paused', to: 'active' },
    implementation: [
      { file: `${S}/domain/affiliate.state.ts`, re: /paused: \['active'\]/ },
      {
        file: `${S}/services/affiliate-lifecycle.handler.ts`,
        re: /transition\(tx, p.userId, 'paused', 'active'\)/,
      },
      repositoryGuard,
    ],
    trigger: changed,
    positive: { file: `${T}/pause.int.spec.ts`, re: /it\('AT-AF05 REQ-307 hết phí/ },
    blocked: staleFee,
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
      re: /it\('REQ-306 void referral cannot become converted/,
    },
  },
  {
    id: 'referral-void',
    label: 'AF-R07 pending referral → void',
    transition: { machine: 'referral', from: 'pending', to: 'void' },
    implementation: [
      {
        file: `${S}/services/affiliate-lifecycle.handler.ts`,
        re: /closeReferral\(tx, ref.id, 'void', at\)/,
      },
      { file: `${S}/repositories/commission.repository.ts`, re: /canReferral\('pending', to\)/ },
      referralGuard,
    ],
    trigger: confirmed,
    positive: { file: `${T}/pause.int.spec.ts`, re: /it\('AT-AF05 REQ-307 hết phí/ },
    blocked: {
      file: `${T}/referral-terminal.int.spec.ts`,
      re: /it\('REQ-307 converted referral cannot become void/,
    },
  },
];
