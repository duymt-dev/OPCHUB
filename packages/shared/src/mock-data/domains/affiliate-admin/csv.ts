import { affiliateExportSchema } from '../../../api-domains';
import { logSetting } from '../settings-log';
import { notFound, ok } from '../util';
import { mockAdminAffiliateRows, mockAdminCommissionRows } from './read';
import { invalidAffiliateInput } from './validation';

const labels = { recorded: 'Đã ghi nhận', paid: 'Đã chi trả', cancelled: 'Đã hủy' } as const;
const date = new Intl.DateTimeFormat('vi-VN', {
  timeZone: 'Asia/Ho_Chi_Minh',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});
const cell = (value: string | number) => {
  const safe = typeof value === 'string' && /^[\s]*[=+\-@\t\r]/.test(value) ? `'${value}` : value;
  return `"${String(safe).replace(/"/g, '""')}"`;
};
const csv = (head: string[], rows: (string | number)[][]) =>
  `\uFEFF${[head.join(','), ...rows.map((r) => r.map(cell).join(','))].join('\n')}`;

const headerFor = (kind: 'commissions' | 'affiliates') =>
  kind === 'commissions'
    ? [
        'Ngày',
        'Thành viên mới',
        'Affiliate',
        'Mã',
        'Doanh thu',
        'Tỷ lệ (%)',
        'Hoa hồng',
        'Trạng thái',
        'Lý do',
      ]
    : [
        'Đại lý',
        'Mã',
        'Email',
        'Tỷ lệ (%)',
        'Khách hàng',
        'Doanh thu',
        'Số dư',
        'Đã chi',
        'Trạng thái',
      ];

export function exportMockAffiliateCsv(
  actor: string,
  kind: 'commissions' | 'affiliates',
  input: unknown,
) {
  const parsed = affiliateExportSchema.safeParse(input);
  if (!parsed.success) return invalidAffiliateInput(parsed.error);
  const filter = parsed.data;
  const allCommissions = mockAdminCommissionRows({ page: 1, size: 100, status: 'all' });
  const allAgents = mockAdminAffiliateRows({ page: 1, size: 100 });
  const available = new Set((kind === 'commissions' ? allCommissions : allAgents).map((r) => r.id));
  if (filter.ids?.some((id) => !available.has(id)))
    return notFound(
      kind === 'commissions' ? 'Không tìm thấy khoản hoa hồng' : 'Không tìm thấy đại lý',
    );
  const rows =
    kind === 'commissions'
      ? mockAdminCommissionRows({
          page: 1,
          size: 100,
          status: filter.status ?? 'all',
          ...(filter.q ? { q: filter.q } : {}),
        })
          .filter((r) => !filter.ids || filter.ids.includes(r.id))
          .map((r) => [
            date.format(new Date(r.date)),
            r.customerName,
            r.affiliateName,
            r.code,
            r.feeAmount,
            r.rate,
            r.amount,
            labels[r.status],
            r.cancelReason ?? '',
          ])
      : mockAdminAffiliateRows({ page: 1, size: 100, ...(filter.q ? { q: filter.q } : {}) })
          .filter((r) => !filter.ids || filter.ids.includes(r.id))
          .map((r) => [
            r.name,
            r.code,
            r.email,
            r.rate,
            r.customers,
            r.revenue,
            r.balance,
            r.paid,
            r.status === 'active' ? 'Tự động' : 'Tạm dừng',
          ]);
  logSetting(
    actor,
    'affiliate.export',
    filter.ids?.join(',') ?? 'filtered',
    `Xuất CSV ${rows.length} dòng ${kind}`,
    'affiliate',
  );
  return ok({
    filename: kind === 'commissions' ? 'hoa-hong-affiliate.csv' : 'dai-ly-affiliate.csv',
    csv: csv(headerFor(kind), rows),
  });
}
