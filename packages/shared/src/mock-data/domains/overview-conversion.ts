import {
  adminConversionSchema,
  REGIONAL_REGIONS,
  regionalProvinces,
  type AdminConversion,
} from '../../api-domains';
import { mockRegionalDirectors } from './regional-directors';
import { mockDb } from './store';
import { logSetting } from './settings-log';
import { mockSafeCsv } from './transparency-csv';

const rate = (paid: number, expired: number) =>
  paid + expired ? Math.round((paid * 100) / (paid + expired)) : 0;
export function mockConversion(): AdminConversion {
  const db = mockDb(),
    directors = mockRegionalDirectors(false).items;
  const rows = REGIONAL_REGIONS.map((region) => ({
    region,
    label: { north: 'Miền Bắc', central: 'Miền Trung', south: 'Miền Nam' }[region],
    directorName: directors.find((d) => d.region === region)?.member?.fullName ?? null,
    trial: 0,
    paid: 0,
    expired: 0,
    ratePct: 0,
  }));
  const total = { trial: 0, paid: 0, expired: 0, ratePct: 0 };
  for (const fee of db.fees) {
    if (fee.accountType === 'investor' || fee.status === 'regional_director') continue;
    const key =
      fee.status === 'trial'
        ? 'trial'
        : fee.status === 'active' || fee.status === 'expiring'
          ? 'paid'
          : 'expired';
    total[key]++;
    // The mock's insertion-ordered membership map corresponds to joined_at (D-128).
    const first = [...(db.groupMembers.get(fee.userId) ?? [])].find(([id, status]) => {
      const g = db.groups.find((g) => g.id === id);
      return status === 'member' && (g?.kind === 'province' || Boolean(g?.parentId));
    });
    const group = db.groups.find((g) => g.id === first?.[0]);
    const province = db.groups.find((g) => g.id === group?.parentId)?.province ?? group?.province;
    const row = rows.find((r) => regionalProvinces(r.region).includes(province ?? ''));
    if (row) row[key]++;
  }
  for (const row of rows) row.ratePct = rate(row.paid, row.expired);
  total.ratePct = rate(total.paid, total.expired);
  return adminConversionSchema.parse({ rows, total });
}
export function exportMockConversion(actor: string) {
  const data = mockConversion();
  logSetting(
    actor,
    'report.conversion_export',
    'conversion',
    'xuất chuyển đổi miễn phí → trả phí theo vùng',
    'report',
  );
  return {
    filename: 'chuyen-doi-theo-vung.csv',
    csv: mockSafeCsv(
      ['Vùng', 'GĐ Vùng', 'Đang dùng thử', 'Đã trả phí', 'Hết hạn chưa trả', 'Tỷ lệ chuyển đổi'],
      data.rows.map((r) => [
        r.label,
        r.directorName ?? 'Chưa bổ nhiệm',
        r.trial,
        r.paid,
        r.expired,
        `${r.ratePct}%`,
      ]),
    ),
  };
}
