import type { AdminPermissionKey } from '../../permissions';
import { globalSearchResultSchema, type SearchHit, type SearchKind } from '../../api-domains';
import { memberCodeOf } from './admin';
import { listAdminMembers } from './admin-members';
import { mockNeeds } from './needs-store';
import { visibleProjects } from './ops-project-portal';
import { mockDb } from './store';
import { mockStores, visibleMockStores } from './stores';

const fold = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase();
const statusLabel: Record<string, string> = {
  draft: 'Bản nháp',
  hidden: 'Đã ẩn',
  closed: 'Đã đóng',
  locked: 'Đã khóa',
  pending_review: 'Chờ duyệt',
  rejected: 'Từ chối',
  needs_changes: 'Cần chỉnh sửa',
};
interface Candidate extends SearchHit {
  text: string;
  order: string | number;
}
function top(rows: Candidate[], q: string): SearchHit[] {
  return rows
    .filter((r) => fold(r.text).includes(q))
    .sort(
      (a, b) =>
        Number(fold(b.title).startsWith(q)) - Number(fold(a.title).startsWith(q)) ||
        (typeof a.order === 'number' && typeof b.order === 'number'
          ? b.order - a.order
          : String(b.order).localeCompare(String(a.order))) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 4)
    .map((row) => ({
      id: row.id,
      title: row.title,
      sub: row.sub,
      ...(row.joined !== undefined ? { joined: row.joined } : {}),
      ...(row.memberCount !== undefined ? { memberCount: row.memberCount } : {}),
    }));
}

interface MockSearchOptions {
  admin?: boolean;
  investor?: boolean;
  permissions?: readonly AdminPermissionKey[];
  now?: number;
}
/** MSW only: mirrors the domain visibility helpers, never prototype render code. */
export function mockGlobalSearch(q: string, userId: string, options: MockSearchOptions = {}) {
  const db = mockDb();
  const admin = options.admin ?? false;
  const normalized = fold(q.trim());
  const visibleStores = visibleMockStores(options.now ?? Date.now());
  const visibleIds = new Set(visibleStores.map((s) => s.id));
  const stores = admin ? mockStores() : visibleStores;
  const needs = mockNeeds().filter(
    (n) => admin || (n.status === 'open' && visibleIds.has(n.storeId)),
  );
  const projects = admin ? db.projects : visibleProjects(userId);
  const sub = (parts: string[], status: string) =>
    [...parts, admin ? statusLabel[status] : ''].filter(Boolean).join(' · ');
  const allowed = (key: AdminPermissionKey) => !admin || options.permissions?.includes(key);
  const groups: { kind: SearchKind; items: SearchHit[] }[] = [];
  if (allowed('stores.view')) {
    groups.push({
      kind: 'store',
      items: top(
        stores.map((s) => ({
          id: s.id,
          title: s.name,
          sub: sub([s.field, s.province], s.status),
          text: `${s.name} ${s.field} ${s.province}`,
          order: s.updatedAt,
        })),
        normalized,
      ),
    });
    groups.push({
      kind: 'need',
      items: top(
        needs.map((n) => ({
          id: n.id,
          title: n.title,
          sub: sub([n.field, n.province], n.status),
          text: `${n.title} ${n.field} ${n.province}`,
          order: n.updatedAt,
        })),
        normalized,
      ),
    });
  }
  if (allowed('projects.view'))
    groups.push({
      kind: 'project',
      items: top(
        projects.map((p) => ({
          id: p.id,
          title: p.name,
          sub: sub([p.summary || p.category], p.status),
          text: `${p.name} ${p.summary}`,
          order: p.createdAt,
        })),
        normalized,
      ),
    });
  if (!options.investor && allowed('groups.view'))
    groups.push({
      kind: 'group',
      items: top(
        db.groups.map((g) => ({
          id: g.id,
          title: g.name,
          sub: '',
          memberCount: g.memberCount,
          joined: db.groupMembers.get(userId)?.get(g.id) === 'member',
          text: g.name,
          order: g.memberCount,
        })),
        normalized,
      ),
    });
  if (admin && allowed('members.view'))
    groups.push({ kind: 'member', items: memberHits(q, normalized) });
  return globalSearchResultSchema.parse({ groups: groups.filter((g) => g.items.length) });
}

function memberHits(q: string, normalized: string): SearchHit[] {
  const members = listAdminMembers().items.filter(
    (m) =>
      fold(`${m.fullName} ${m.email}`).includes(normalized) ||
      (/^TV\d{6}$/i.test(q) && memberCodeOf(m.id) === q.toUpperCase()),
  );
  return members
    .sort(
      (a, b) =>
        Number(fold(b.fullName).startsWith(normalized)) -
          Number(fold(a.fullName).startsWith(normalized)) ||
        memberCodeOf(a.id).localeCompare(memberCodeOf(b.id)) ||
        a.id.localeCompare(b.id),
    )
    .slice(0, 4)
    .map((m) => ({
      id: m.id,
      title: m.fullName,
      sub: [m.email, statusLabel[m.status]].filter(Boolean).join(' · '),
    }));
}
