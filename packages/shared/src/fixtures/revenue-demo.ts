import { planAmountOf } from '../membership/pricing';
import { PRICE_DEFAULTS } from './price-defaults';

/** Explicit functional scenario, NOT a substitute for prototype screenshot data. */
export const REVENUE_DEMO = {
  receivedAt: '2026-09-15T03:00:00.000Z',
  appointedAt: '2026-08-01T03:00:00.000Z',
  historyId: '62800000-0000-4000-8000-000000000001',
  agentId: 'revenue-demo-agent',
  code: 'REVDEMO',
  province: 'Hà Nội',
  directorId: 'm3',
  month: '2026-09',
} as const;

export const revenueDemoPeople = (
  [
    {
      id: REVENUE_DEMO.agentId,
      name: 'Đại lý demo chia sẻ',
      first: '2022-09-15T03:00:00.000Z',
      plan: 'personal',
      referred: false,
    },
    {
      id: 'revenue-demo-y1',
      name: 'Khách chia sẻ năm một',
      first: REVENUE_DEMO.receivedAt,
      plan: 'personal',
      referred: true,
    },
    {
      id: 'revenue-demo-y2',
      name: 'Khách chia sẻ năm hai',
      first: '2025-09-15T03:00:00.000Z',
      plan: 'personal',
      referred: true,
    },
    {
      id: 'revenue-demo-y3',
      name: 'Khách chia sẻ năm ba',
      first: '2024-09-15T03:00:00.000Z',
      plan: 'personal',
      referred: true,
    },
    {
      id: 'revenue-demo-y4',
      name: 'Khách chia sẻ năm bốn',
      first: '2023-09-15T03:00:00.000Z',
      plan: 'personal',
      referred: true,
    },
    {
      id: 'revenue-demo-direct',
      name: 'Khách đăng ký trực tiếp',
      first: REVENUE_DEMO.receivedAt,
      plan: 'business',
      referred: false,
    },
  ] as const
).map((row, index) => ({
  ...row,
  memberCode: `TV${880001 + index}`,
  email: `${row.id}@demo.opchub.invalid`,
  code: index === 0 ? REVENUE_DEMO.code : `REVDEMO${index}`,
  // One dong above price exercises actual-receipt rounding, not a changed configured price.
  amount: planAmountOf(PRICE_DEFAULTS, row.plan) + (index === 1 ? 1 : 0),
  shareId: `62800000-0000-4000-8001-${String(index).padStart(12, '0')}`,
}));

export const revenueDemoCustomers = revenueDemoPeople.filter((r) => r.id !== REVENUE_DEMO.agentId);
export const revenueDemoPeriods = revenueDemoPeople.flatMap((p) =>
  [...new Set([p.first, REVENUE_DEMO.receivedAt])].map((at, index) => ({
    id: `${p.id}-period-${index}`,
    paymentId: `${p.id}-receipt-${at === p.first ? 'first' : 'renewal'}`,
    userId: p.id,
    amount: p.amount,
    at,
    until: `${Number(at.slice(0, 4)) + 1}${at.slice(4)}`,
    content: `OPCHUB ${p.memberCode}`,
  })),
);
export const revenueDemoReceipt = (person: (typeof revenueDemoPeople)[number]) => {
  const period = revenueDemoPeriods.find(
    (r) => r.userId === person.id && r.at === REVENUE_DEMO.receivedAt,
  );
  if (!period) throw new Error('Missing sharing demo receipt');
  return {
    source: 'membership' as const,
    sourceId: period.paymentId,
    customerId: person.id,
    plan: person.plan,
    amount: period.amount,
    receivedAt: period.at,
    recordedAt: period.at,
  };
};
