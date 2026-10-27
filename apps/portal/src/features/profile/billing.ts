import type { Fundraising, MyFeePeriod } from '@opchub/shared/api-domains';

/** Một dòng "Lịch sử thanh toán" (prototype `prBill.rows`) — logic thuần, test ở billing.spec.ts */
export type BillingRow =
  | { kind: 'fee'; id: string; at: string; amount: number }
  | {
      kind: 'fund';
      id: string;
      at: string;
      amount: number;
      code: string;
      projectName: string;
      endsAt: string | null;
      status: Fundraising['status'];
    };

/** Kỳ phí + khoản Gói Gọi vốn có mã CK (bỏ khoản legacy), mới nhất trước */
export function billingRows(periods: MyFeePeriod[], funds: Fundraising[]): BillingRow[] {
  const fees: BillingRow[] = periods.map((p) => ({
    kind: 'fee',
    id: p.id,
    at: p.paidAt,
    amount: p.amount,
  }));
  const fundRows: BillingRow[] = funds.flatMap((f) =>
    f.code === null
      ? []
      : [
          {
            kind: 'fund' as const,
            id: f.id,
            at: f.createdAt,
            amount: f.amount,
            code: f.code,
            projectName: f.projectName,
            endsAt: f.endsAt,
            status: f.status,
          },
        ],
  );
  return [...fees, ...fundRows].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}
