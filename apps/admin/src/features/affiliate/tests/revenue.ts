import type {
  RevenueDashboard,
  RevenueLedgerItem,
  RevenuePayoutReceipt,
} from '@opchub/shared/api-domains';

export const revenueBank = {
  bankName: 'Vietcombank' as const,
  bankNo: '0123456789',
  bankHolder: 'DIRECTOR',
};
export function revenueFixture(query = ''): RevenueDashboard {
  const zero = {
    receiptCount: '0',
    affiliateCount: '0',
    received: '0',
    allocated: '0',
    paid: '0',
    due: '0',
    mediaSoft: '0',
  };
  const stats = {
    receiptCount: '3',
    affiliateCount: '1',
    received: '303',
    allocated: '153',
    paid: '0',
    due: '153',
    mediaSoft: '150',
  };
  return {
    asOf: '2026-10-15T05:00:00Z',
    policy: { yearOneRate: 50, annualDecrease: 10, minimumRate: 20 },
    stats,
    visible:
      query === 'Miền Nam'
        ? { ids: ['south'], due: '0', paid: '0' }
        : { ids: ['north', 'central', 'south'], due: stats.due, paid: stats.paid },
    items: [
      {
        id: 'north',
        directorId: 'director-north',
        name: 'Bảo',
        email: 'bao@example.com',
        region: 'north',
        provinces: ['Hà Nội'],
        current: true,
        bank: revenueBank,
        stats,
      },
      {
        id: 'central',
        directorId: 'director-central',
        name: 'Hải',
        email: 'hai@example.com',
        region: 'central',
        provinces: ['Đà Nẵng'],
        current: true,
        bank: revenueBank,
        stats: zero,
      },
      {
        id: 'south',
        directorId: null,
        name: null,
        email: null,
        region: 'south',
        provinces: ['TP. Hồ Chí Minh'],
        current: true,
        bank: null,
        stats: zero,
      },
    ],
  };
}

export const revenueLedgerFixture: RevenueLedgerItem = {
  id: '019b76da-a800-7000-8000-000000000001',
  customerId: 'customer-1',
  customerName: 'Khách An',
  affiliateId: 'affiliate-1',
  affiliateName: 'Affiliate Hà',
  plan: 'personal',
  receivedAt: '2026-09-15T05:00:00Z',
  recordedAt: '2026-09-15T05:00:00Z',
  firstReceivedAt: '2026-09-15T05:00:00Z',
  customerYear: 1,
  amount: 101,
  directorRate: 50,
  directorAmount: 51,
  mediaSoftAmount: 50,
  monthKey: '2026-09',
  status: 'recorded',
  payoutId: null,
};
export const revenueReceiptFixture: RevenuePayoutReceipt = {
  id: '019b76da-a800-7000-8000-000000000002',
  directorId: 'director-north',
  directorName: 'Bảo',
  region: 'north',
  monthKey: '2026-09',
  amount: '51',
  shareCount: 1,
  bank: revenueBank,
  paidBy: 'accountant',
  paidAt: '2026-10-01T03:00:00Z',
};
export const revenueMonthFixture = [
  {
    monthKey: '2026-10',
    receiptCount: '2',
    received: '202',
    allocated: '102',
    paid: '0',
    due: '102',
    mediaSoft: '100',
  },
  {
    monthKey: '2026-09',
    receiptCount: '1',
    received: '101',
    allocated: '51',
    paid: '0',
    due: '51',
    mediaSoft: '50',
  },
];
