import type {
  AdminInvestor,
  AdminInvestorSummary,
  CsvFile,
  InvestorComment,
  InvestorInterest,
  InvestorStatus,
} from '../../api-domains';
import { projects } from '../../fixtures';
import { recordAudit } from './group-admin';
import { mockDb, nextId, type MockDb } from './store';
import { includesText, iso, notFound, ok, type MockResult } from './util';

/**
 * Admin "Nhà đầu tư" (D-58 → D-60): gộp các lần quan tâm theo người (tên + tổ chức), trạng thái
 * kết nối, trao đổi với nhà đầu tư. WeakMap theo MockDb nên `resetMockDb()` tự dựng lại.
 */

/** Giờ chụp parity (16/10/2026 09:00 giờ VN) — mốc của bình luận mẫu prototype */
const T0 = Date.UTC(2026, 9, 16, 2, 0);
const ADMIN_NAME = 'Admin OPC Hub';

/** Bình luận mẫu của prototype (khóa: tên|tổ chức; mẫu "Siam AI Labs" không khớp ai nên bỏ) */
const SEED_COMMENTS: Record<string, { me: boolean; name: string; text: string; ago: number }[]> = {
  'Nguyễn Hoàng Nam|VinaCapital Ventures': [
    {
      me: false,
      name: 'Nguyễn Hoàng Nam',
      text: 'Chào OPC Hub, quỹ muốn nhận pitch deck và báo cáo tài chính 6 tháng gần nhất của SoloBooks.',
      ago: 1500e5,
    },
    {
      me: true,
      name: ADMIN_NAME,
      text: 'Chào anh Nam, bên em đã chuyển yêu cầu tới chủ dự án. Dự kiến gửi tài liệu trước thứ Sáu.',
      ago: 1400e5,
    },
  ],
};

interface InvestorState {
  status: Map<string, InvestorStatus>;
  comments: Map<string, InvestorComment[]>;
}

const states = new WeakMap<MockDb, InvestorState>();
const groupKey = (i: Pick<InvestorInterest, 'investorName' | 'organization'>) =>
  `${i.investorName}|${i.organization}`;

function state(): InvestorState {
  const db = mockDb();
  let s = states.get(db);
  if (!s) {
    s = { status: new Map(), comments: new Map() };
    for (const [k, list] of Object.entries(SEED_COMMENTS)) {
      s.comments.set(
        k,
        list.map((c, n) => ({
          id: `ivc-seed-${n}-${k.length}`,
          authorName: c.name,
          fromInvestor: !c.me,
          body: c.text,
          createdAt: iso(T0 - c.ago),
        })),
      );
    }
    states.set(db, s);
  }
  return s;
}

/** Trạng thái: đã đặt tay → theo đó; có trao đổi → Đang trao đổi; còn lại theo lần quan tâm */
function statusOf(s: InvestorState, k: string, list: InvestorInterest[]): InvestorStatus {
  const set = s.status.get(k);
  if (set) return set;
  if ((s.comments.get(k) ?? []).length) return 'in_discussion';
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
      commentCount: (s.comments.get(k) ?? []).length,
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

export function setInvestorStatus(
  actorId: string,
  key: string,
  status: InvestorStatus,
): MockResult<AdminInvestor> {
  const g = findGroup(key);
  if (!g) return notFound('Không tìm thấy nhà đầu tư');
  state().status.set(g.k, status);
  g.list.forEach((i) => (i.status = status));
  recordAudit(actorId, 'investor.status', key, status);
  return getAdminInvestor(key);
}

export function listInvestorComments(key: string): MockResult<InvestorComment[]> {
  const g = findGroup(key);
  return g ? ok(state().comments.get(g.k) ?? []) : notFound('Không tìm thấy nhà đầu tư');
}

/** Admin gửi bình luận; lần đầu đang "Đã gửi" thì tự chuyển "Đang trao đổi" (SRS QT-10) */
export function addInvestorComment(
  actorId: string,
  key: string,
  body: string,
): MockResult<InvestorComment> {
  const g = findGroup(key);
  if (!g) return notFound('Không tìm thấy nhà đầu tư');
  const s = state();
  const before = statusOf(s, g.k, g.list);
  const c: InvestorComment = {
    id: nextId('ivc'),
    authorName: ADMIN_NAME,
    fromInvestor: false,
    body,
    createdAt: iso(Date.now()),
  };
  s.comments.set(g.k, [...(s.comments.get(g.k) ?? []), c]);
  if (before === 'sent') s.status.set(g.k, 'in_discussion');
  recordAudit(actorId, 'investor.comment', key);
  return ok(c);
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
