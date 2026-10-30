import {
  directorConfigSchema,
  type DirectorConfig,
  type DirectorHistory,
  type DirectorHistoryQuery,
  type DirectorMemberQuery,
} from '../../../api-domains';
import { listAdminMembers } from '../admin-members';
import { syncMockAffiliates } from '../affiliate';
import { mockDb } from '../store';
import { mockDirectorState } from './state';

export function readMockDirectors(): DirectorConfig {
  const db = mockDb();
  const agents = syncMockAffiliates().agents;
  const primary = [...agents.keys()].flatMap((id) => {
    const groups = db.groupMembers.get(id);
    const group = [...(groups ?? [])].flatMap(([groupId, status]) => {
      const row = db.groups.find((g) => g.id === groupId);
      return status === 'member' && row?.kind === 'province' ? [row] : [];
    })[0];
    return group ? [group.province] : [];
  });
  const state = mockDirectorState();
  const assigned = new Set(state.config.slots.flatMap((slot) => slot.provinces));
  return directorConfigSchema.parse({
    slots: state.config.slots.map((slot) => ({
      ...slot,
      affiliateCount: primary.filter((province) => slot.provinces.includes(province)).length,
    })),
    unassignedProvinces: state.config.unassignedProvinces.filter((name) => !assigned.has(name)),
  });
}

export function mockDirectorCandidates(query: DirectorMemberQuery) {
  const excluded = new Set(
    mockDirectorState().config.slots.flatMap((slot) => (slot.incumbent ? [slot.incumbent.id] : [])),
  );
  const fees = new Map(mockDb().fees.map((fee) => [fee.userId, fee]));
  const normalize = (value: string) =>
    value.normalize('NFD').replace(/\p{M}/gu, '').replace(/đ/gi, 'd').toLowerCase();
  const q = normalize(query.q);
  const rows = listAdminMembers()
    .items.filter((member) => member.status === 'active' && !excluded.has(member.id))
    .map((member) => ({
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      memberCode: fees.get(member.id)?.memberCode ?? '',
      createdAt: member.createdAt,
    }))
    .filter((member) =>
      normalize(`${member.fullName} ${member.email} ${member.memberCode}`).includes(q),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  return {
    items: rows
      .slice((query.page - 1) * query.size, query.page * query.size)
      .map(({ createdAt, ...member }) => {
        void createdAt;
        return member;
      }),
    page: query.page,
    size: query.size,
    total: rows.length,
  };
}

export function readMockDirectorHistory(query: DirectorHistoryQuery): DirectorHistory {
  const rows = mockDirectorState()
    .history.filter((row) => !query.region || row.region === query.region)
    .filter(
      (row) =>
        !query.beforeAt ||
        row.at < query.beforeAt ||
        (row.at === query.beforeAt && row.id < (query.beforeId ?? '')),
    )
    .toSorted((a, b) => b.at.localeCompare(a.at) || b.id.localeCompare(a.id));
  const items = structuredClone(rows.slice(0, query.size));
  const last = items.at(-1);
  return {
    items,
    nextCursor: rows.length > query.size && last ? { at: last.at, id: last.id } : null,
  };
}
