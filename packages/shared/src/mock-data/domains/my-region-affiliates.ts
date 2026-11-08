import { encodeMyRegionAffiliateCursor, type MyRegionAffiliateQuery } from '../../api-domains';
import { affiliateMockState } from './affiliate';
import { mockAffiliateRegion } from './affiliate-regional-projection';
import { mockRegionalDirectors } from './regional-directors';
import { regionalShareState } from './regional-share-state';
import { recordAudit } from './audit-store';

export function mockMyRegionAffiliateRows(userId: string) {
  const slot = mockRegionalDirectors(false).items.find((s) => s.member?.id === userId);
  if (!slot) return null;
  const rows = regionalShareState().rows.filter(
    (r) => r.region === slot.region && r.directorUserId === userId,
  );
  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const group = groups.get(row.affiliateId) ?? [];
    group.push(row);
    groups.set(row.affiliateId, group);
  }
  return [...groups]
    .map(([id, group]) => {
      const first = group[0],
        uid = first?.affiliateUserId ?? '';
      const province = mockAffiliateRegion(uid)?.provinceName;
      return {
        id,
        name: first?.affiliateName ?? '',
        code: affiliateMockState().agents.get(uid)?.code ?? '',
        ...(province ? { province } : {}),
        customers: new Set(group.map((r) => r.customerId)).size,
        revenue: group.reduce((n, r) => n + r.baseAmount, 0),
        share: group.reduce((n, r) => n + r.directorAmount, 0),
      };
    })
    .sort((a, b) => b.share - a.share || a.name.localeCompare(b.name) || a.id.localeCompare(b.id));
}
export function mockMyRegionAffiliatePage(userId: string, query: MyRegionAffiliateQuery) {
  const all = mockMyRegionAffiliateRows(userId);
  if (!all) return null;
  const cursor = query.cursor;
  const rows = cursor
    ? all.filter(
        (r) =>
          BigInt(r.share) < BigInt(cursor.share) ||
          (BigInt(r.share) === BigInt(cursor.share) &&
            (r.name.localeCompare(cursor.name) > 0 ||
              (r.name === cursor.name && r.id.localeCompare(cursor.id) > 0))),
      )
    : all;
  const items = rows.slice(0, query.limit),
    last = items.at(-1),
    more = rows.length - items.length;
  return {
    items,
    more,
    nextCursor:
      more && last
        ? encodeMyRegionAffiliateCursor({ share: String(last.share), name: last.name, id: last.id })
        : null,
  };
}
export function mockMyRegionAffiliateCsv(userId: string) {
  const rows = mockMyRegionAffiliateRows(userId);
  if (!rows) return null;
  const safe = (v: string) => (/^[\s]*[=+\-@\t\r]/.test(v) ? `'${v}` : v);
  const cell = (v: string | number) => `"${String(v).replaceAll('"', '""')}"`;
  const lines: (string | number)[][] = rows
    .slice(0, 20_000)
    .map((r) => [
      safe(r.name),
      safe(r.code),
      safe(r.province ?? ''),
      r.customers,
      r.revenue,
      r.share,
    ]);
  recordAudit(
    userId,
    'regional.affiliates.export',
    'regional_director',
    `Xuất affiliate (${lines.length} dòng)`,
    { count: lines.length, truncated: rows.length > 20_000 },
  );
  if (rows.length > 20_000) lines.push(['Đã cắt tại 20.000 dòng']);
  return (
    '\uFEFFHọ tên,Mã affiliate,Tỉnh,Khách hàng,Doanh thu,Chia cho vùng\n' +
    lines.map((r) => r.map(cell).join(',')).join('\n')
  );
}
