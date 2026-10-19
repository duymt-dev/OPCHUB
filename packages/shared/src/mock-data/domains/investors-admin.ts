import {
  type AdminInvestor,
  type AdminInvestorSummary,
  canInvestorTransition,
  type CsvFile,
  INVESTOR_ADMIN_NAME,
  type InvestorComment,
  type InvestorInterest,
  type InvestorStatus,
  investorTransitionMessage,
} from '../../api-domains';
import { projects } from '../../fixtures';
import { recordAudit } from './group-admin';
import {
  commentsOf,
  notifyInvestorReplied,
  pushComment,
  type ThreadComment,
} from './investor-thread';
import { mockDb, type MockDb } from './store';
import { conflict, includesText, iso, notFound, ok, type MockResult } from './util';

/**
 * Admin "Nhà đầu tư" (D-58 → D-60): gộp các lần quan tâm theo người, trạng thái kết nối (§9 chỉ đi
 * tiến), trao đổi với nhà đầu tư qua luồng chung `investor-thread` (TIP-V2-107). WeakMap theo MockDb
 * nên `resetMockDb()` tự dựng lại.
 */

interface InvestorState {
  status: Map<string, InvestorStatus>;
}

const states = new WeakMap<MockDb, InvestorState>();
/** Gom theo người (Q-G5c-1) — cùng khoá với luồng trao đổi `investor-thread` */
const groupKey = (i: Pick<InvestorInterest, 'investorName'>) => i.investorName;

function state(): InvestorState {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = { status: new Map() };
    states.set(db, s);
  }
  return s;
}

/** Trạng thái: đã đặt tay → theo đó; Admin đã trả lời → Đang trao đổi; còn lại theo lần quan tâm */
function statusOf(s: InvestorState, k: string, list: InvestorInterest[]): InvestorStatus {
  const set = s.status.get(k);
  if (set) return set;
  if (commentsOf(k).some((c) => !c.fromInvestor)) return 'in_discussion';
  if (list.some((i) => i.status === 'connected')) return 'connected';
  return list.some((i) => i.status === 'in_discussion') ? 'in_discussion' : 'sent';
}

const owners = new Map(projects.map((p) => [p.id, p.owner]));

/** Gộp theo người, mới nhất lên đầu (prototype invPage) */
export function allInvestors(): AdminInvestor[] {
  const s = state();
  const groups = new Map<string, InvestorInterest[]>();
  for (const i of mockDb().interests) {
    const k = groupKey(i);
    groups.set(k, [...(groups.get(k) ?? []), i]);
  }
  const rows = [...groups.entries()].map(([k, list]): AdminInvestor => {
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
      status: statusOf(s, k, list),
      commentCount: commentsOf(k).length,
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

function findGroup(key: string): { k: string; list: InvestorInterest[] } | null {
  const hit = mockDb().interests.find((i) => i.id === key);
  if (!hit) return null;
  const k = groupKey(hit);
  return { k, list: mockDb().interests.filter((i) => groupKey(i) === k) };
}

export function getAdminInvestor(key: string): MockResult<AdminInvestor> {
  const inv = allInvestors().find((x) => x.key === key);
  return inv ? ok(inv) : notFound('Không tìm thấy nhà đầu tư');
}

/** BUG-007, §9: chỉ đi tiến; sai bước → 409 cùng thông điệp server, trạng thái giữ nguyên */
export function setInvestorStatus(
  actorId: string,
  key: string,
  status: InvestorStatus,
): MockResult<AdminInvestor> {
  const g = findGroup(key);
  if (!g) return notFound('Không tìm thấy nhà đầu tư');
  const s = state();
  const from = statusOf(s, g.k, g.list);
  if (!canInvestorTransition(from, status)) {
    return conflict(investorTransitionMessage(from, status));
  }
  s.status.set(g.k, status);
  g.list.forEach((i) => (i.status = status));
  recordAudit(actorId, 'investor.status', key, `${from} → ${status}`);
  return getAdminInvestor(key);
}

const toComment = (c: ThreadComment): InvestorComment => ({
  id: c.id,
  authorName: c.fromInvestor ? c.investorName : INVESTOR_ADMIN_NAME,
  fromInvestor: c.fromInvestor,
  body: c.body,
  createdAt: c.createdAt,
});

export function listInvestorComments(key: string): MockResult<InvestorComment[]> {
  const g = findGroup(key);
  return g ? ok(commentsOf(g.k).map(toComment)) : notFound('Không tìm thấy nhà đầu tư');
}

/**
 * Admin gửi vào luồng chung (IV-R01): NĐT nhận thông báo `invest`; tin đầu tiên khi đang
 * "Đã gửi" → "Đang trao đổi" (IV-R03). Trả kèm bản ghi luồng để handler chép sang cầu cookie.
 */
export function addInvestorComment(
  actorId: string,
  key: string,
  body: string,
): MockResult<InvestorComment & { thread: ThreadComment }> {
  const g = findGroup(key);
  if (!g) return notFound('Không tìm thấy nhà đầu tư');
  const s = state();
  const before = statusOf(s, g.k, g.list);
  const c = pushComment({
    investorName: g.k,
    interestId: null,
    fromInvestor: false,
    body,
    createdAt: iso(Date.now()),
  });
  if (before === 'sent') {
    s.status.set(g.k, 'in_discussion');
    g.list.forEach((i) => (i.status = 'in_discussion'));
  }
  notifyInvestorReplied(c);
  recordAudit(actorId, 'investor.comment', key);
  return ok({ ...toComment(c), thread: c });
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
