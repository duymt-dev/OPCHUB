import {
  type AdminInvestor,
  type AdminInvestorSummary,
  type CsvFile,
  type InvestorInterest,
} from '../../api-domains';
import { projects } from '../../fixtures';
import { recordAudit } from './group-admin';
import { mockDb } from './store';
import { includesText, notFound, ok, type MockResult } from './util';

/**
 * Admin "Nhà đầu tư" (D-58 → D-60, AD-08b): gộp các lần quan tâm theo người, danh sách + xuất CSV.
 * D-72: không trạng thái kết nối, không trao đổi.
 */

/** Gom theo người (Q-G5c-1) */
const groupKey = (i: Pick<InvestorInterest, 'investorName'>) => i.investorName;

const owners = new Map(projects.map((p) => [p.id, p.owner]));

/** Gộp theo người, mới nhất lên đầu (prototype invPage) */
export function allInvestors(): AdminInvestor[] {
  const groups = new Map<string, InvestorInterest[]>();
  for (const i of mockDb().interests) {
    const k = groupKey(i);
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }
  const rows = [...groups.values()].map((list): AdminInvestor => {
    const first = list[0] as InvestorInterest;
    const org = first.organization || (first.kind === 'individual' ? 'Nhà đầu tư cá nhân' : '—');
    return {
      key: first.id,
      name: first.investorName,
      avatarUrl: first.avatarUrl,
      kind: first.kind,
      organization: org,
      phone: first.phone || '—',
      totalAmount: list.reduce((a, i) => a + i.amount, 0),
      lastAt:
        list
          .map((i) => i.createdAt)
          .sort()
          .at(-1) ?? first.createdAt,
      items: list.map((i) => ({
        interestId: i.id,
        projectId: i.projectId,
        projectName: i.projectName,
        ownerName: owners.get(i.projectId) ?? '',
        amount: i.amount,
        currency: i.currency,
        message: i.message,
        createdAt: i.createdAt,
      })),
    };
  });
  return rows.sort((a, b) => b.lastAt.localeCompare(a.lastAt));
}

export const listAdminInvestors = (kind?: AdminInvestor['kind'], q?: string) =>
  allInvestors().filter(
    (x) => (!kind || x.kind === kind) && includesText(`${x.name} ${x.organization} ${x.phone}`, q),
  );

export function adminInvestorSummary(): AdminInvestorSummary {
  const all = allInvestors();
  const n = (k: AdminInvestor['kind']) => all.filter((x) => x.kind === k).length;
  return {
    total: all.length,
    fund: n('fund'),
    business: n('business'),
    individual: n('individual'),
    totalAmount: all.reduce((a, x) => a + x.totalAmount, 0),
  };
}

export function getAdminInvestor(key: string): MockResult<AdminInvestor> {
  const inv = allInvestors().find((x) => x.key === key);
  return inv ? ok(inv) : notFound('Không tìm thấy nhà đầu tư');
}

const KIND_LABEL: Record<AdminInvestor['kind'], string> = {
  fund: 'Quỹ đầu tư',
  business: 'Doanh nghiệp',
  individual: 'Cá nhân',
};
const BOM = String.fromCharCode(0xfeff);
const cell = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;

/** CSV như prototype (danh sách đang lọc); xuất dữ liệu cá nhân → audit_logs (luật 10) */
export function exportInvestorsCsv(
  actorId: string,
  kind?: AdminInvestor['kind'],
  q?: string,
): CsvFile {
  const rows = listAdminInvestors(kind, q);
  const head = 'Loại,Họ tên,Doanh nghiệp/Quỹ,Số điện thoại,Dự án,Tổng quan tâm (VND)';
  const body = rows
    .map((x) =>
      [
        KIND_LABEL[x.kind],
        x.name,
        x.organization,
        x.phone,
        x.items.map((i) => i.projectName).join(' / '),
        x.totalAmount,
      ]
        .map(cell)
        .join(','),
    )
    .join('\n');
  recordAudit(actorId, 'investor.export', 'investors', String(rows.length));
  return { filename: 'nha-dau-tu.csv', csv: `${BOM}${head}\n${body}` };
}
