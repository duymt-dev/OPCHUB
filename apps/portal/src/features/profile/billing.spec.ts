import { billingRows } from './billing';

const period = {
  id: 'p1',
  startsAt: '2026-03-02T00:00:00.000Z',
  endsAt: '2027-03-02T00:00:00.000Z',
  amount: 3_600_000,
  source: 'transfer' as const,
  paidAt: '2026-03-02T00:00:00.000Z',
};
const fund = {
  id: 'f1',
  projectId: 'pr1',
  projectName: 'Dự án A',
  code: 'GV000001',
  amount: 15_000_000,
  status: 'pending_review' as const,
  endsAt: null,
  createdAt: '2026-10-10T00:00:00.000Z',
};

describe('billingRows', () => {
  it('gộp kỳ phí + Gói Gọi vốn, mới nhất trước', () => {
    const rows = billingRows([period], [fund]);
    expect(rows.map((r) => r.kind)).toEqual(['fund', 'fee']);
    expect(rows[0]).toMatchObject({ code: 'GV000001', status: 'pending_review' });
  });

  it('bỏ khoản Gọi vốn legacy (không có mã CK)', () => {
    expect(billingRows([], [{ ...fund, code: null }])).toEqual([]);
  });
});
