import {
  REGIONAL_LABELS,
  REGIONAL_REGIONS,
  regionalProvinces,
  regionalBankSchema,
  type RegionalDirectors,
  type RegionalRegion,
  type RegionalPatch,
} from '../../api-domains';
import { members, communities, industryGroups } from '../../fixtures';
import { statusAfterRevoke } from '../../membership/regional-revoke';
import { buildFees } from './admin';
import { mockDb, type MockDb } from './store';
import { conflict, notFound, ok, MOCK_NOW, type MockResult } from './util';
import type { FeeLike } from '../../membership/fee-access';
import { regionalSnapshotSchema, type RegionalSnapshot } from './regional-snapshot';
import { registeredMockProfiles } from './registration/state';
import { rememberRegionalBank } from './regional-share-bank';
import { publishRegionalRevokeNotice, REGIONAL_NOTICE_PREFIX } from './regional-notices';
import { publishMockNotification } from './notification-runtime';

interface State {
  data: RegionalDirectors;
  previous: Map<string, FeeLike>;
}
const states = new WeakMap<MockDb, State>();

export function captureMockRegionalSnapshot(): RegionalSnapshot {
  const { data, previous } = state();
  const notices = [...mockDb().notifications].map(([userId, rows]) => [
    userId,
    rows.filter((row) => row.id.startsWith(REGIONAL_NOTICE_PREFIX)),
  ]);
  return regionalSnapshotSchema.parse({ data, previous: [...previous], notices });
}

export function restoreMockRegionalSnapshot(input: RegionalSnapshot | undefined) {
  if (!input) return;
  const parsed = regionalSnapshotSchema.parse(input);
  states.set(mockDb(), { data: parsed.data, previous: new Map(parsed.previous) });
  for (const [userId, rows] of mockDb().notifications) {
    mockDb().notifications.set(
      userId,
      rows.filter((row) => !row.id.startsWith(REGIONAL_NOTICE_PREFIX)),
    );
  }
  for (const [userId, rows] of parsed.notices) {
    for (const row of rows) publishMockNotification(mockDb(), userId, row);
  }
}
const people = () => [
  ...members.map((m) => ({ id: m.id, fullName: m.name, email: m.email })),
  ...registeredMockProfiles().map(({ id, fullName, email }) => ({ id, fullName, email })),
];
const person = (id: string) => people().find((m) => m.id === id) ?? null;

function state(): State {
  const db = mockDb();
  const found = states.get(db);
  if (found) return found;
  const ids = ['m3', 'm9', 'm10'];
  const data: RegionalDirectors = {
    canManage: false,
    unassignedProvinces: 0,
    history: [],
    items: REGIONAL_REGIONS.map((region, i) => {
      const member = person(ids[i] ?? '');
      return {
        region,
        label: REGIONAL_LABELS[region],
        member,
        provinces: regionalProvinces(region),
        affiliateCount: 0,
        bank: {
          bankName: 'Vietcombank',
          bankNo: `0011 00${i + 1}0 4567`,
          bankHolder: regionalBankSchema.shape.bankHolder.parse(member?.fullName ?? 'DEMO'),
        },
      };
    }),
  };
  const previous = new Map(
    buildFees(false)
      .filter((f) => ids.includes(f.userId))
      .map((f) => [f.userId, { status: f.status, validUntil: f.validUntil }]),
  );
  const fresh = { data, previous };
  states.set(db, fresh);
  return fresh;
}

export function mockRegionalDirectors(canManage: boolean): RegionalDirectors {
  const { data } = state();
  const db = mockDb();
  const counts = new Map<RegionalRegion, number>();
  const memberIds = new Set(people().map((m) => m.id));
  for (const [id, memberships] of db.groupMembers) {
    if (!memberIds.has(id)) continue;
    const first = [...memberships].find(([, status]) => status === 'member')?.[0];
    const group =
      communities.find((g) => g.id === first) ?? industryGroups.find((g) => g.id === first);
    const region = REGIONAL_REGIONS.find((r) =>
      regionalProvinces(r).includes(group?.province ?? ''),
    );
    if (region) counts.set(region, (counts.get(region) ?? 0) + 1);
  }
  return {
    ...data,
    canManage,
    unassignedProvinces: 34 - data.items.reduce((n, s) => n + s.provinces.length, 0),
    items: data.items.map((s) => ({ ...s, affiliateCount: counts.get(s.region) ?? 0 })),
  };
}

const normalized = (s: string) =>
  s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd')
    .toLowerCase();
export function mockRegionalCandidates(region: RegionalRegion, q: string) {
  const excluded = state()
    .data.items.filter((s) => s.region !== region)
    .map((s) => s.member?.id);
  return {
    items: people()
      .filter(
        (m) =>
          !excluded.includes(m.id) &&
          mockDb().userStatus.get(m.id) !== 'locked' &&
          normalized(`${m.fullName} ${m.email}`).includes(normalized(q)),
      )
      .slice(0, 20)
      .map((m) => ({ id: m.id, fullName: m.fullName, email: m.email })),
  };
}

function log(
  region: RegionalRegion,
  userId: string,
  action: 'appoint' | 'revoke',
  actorRole: string,
  now: number,
) {
  const { data } = state();
  data.history.unshift({
    id: crypto.randomUUID(),
    region,
    userId,
    userName: person(userId)?.fullName ?? userId,
    action,
    actorRole,
    createdAt: new Date(now).toISOString(),
  });
}

export function mockRegionalRevoke(
  region: RegionalRegion,
  actorRole: string,
  now = MOCK_NOW,
): MockResult<{ updated: true }> {
  const { data, previous } = state();
  const slot = data.items.find((s) => s.region === region);
  if (!slot?.member) return conflict('Vùng này chưa có GĐ Vùng');
  const id = slot.member.id;
  rememberRegionalBank(region, id, slot.bank);
  const fee = mockDb().fees.find((f) => f.userId === id);
  const prev = previous.get(id);
  if (fee) {
    const until = prev?.validUntil ? new Date(prev.validUntil) : null;
    fee.status = statusAfterRevoke(prev?.status ?? null, until, new Date(now));
    fee.validUntil = fee.status === 'pending_payment' ? null : (until?.toISOString() ?? null);
  }
  slot.member = null;
  previous.delete(id);
  log(region, id, 'revoke', actorRole, now);
  publishRegionalRevokeNotice(id, region, fee?.validUntil ?? null, now);
  return ok({ updated: true });
}

export function mockRegionalAppoint(
  region: RegionalRegion,
  userId: string,
  actorRole: string,
  now = MOCK_NOW,
): MockResult<{ updated: true }> {
  const { data, previous } = state();
  const member = person(userId);
  const fee = mockDb().fees.find((f) => f.userId === userId);
  if (!member || !fee) return notFound('Không tìm thấy thành viên');
  if (mockDb().userStatus.get(userId) === 'locked')
    return {
      ok: false,
      status: 422,
      code: 'VALIDATION_ERROR',
      message: `Tài khoản ${member.fullName} đang bị khóa – không thể bổ nhiệm.`,
    };
  const existing = data.items.find((s) => s.member?.id === userId);
  if (existing)
    return conflict(
      `${member.fullName} đang là GĐ Vùng ${existing.label} – mỗi thành viên chỉ phụ trách 1 vùng. Thu hồi ở vùng cũ trước.`,
    );
  const slot = data.items.find((s) => s.region === region);
  if (!slot) return notFound();
  if (slot.member) mockRegionalRevoke(region, actorRole, now);
  previous.set(userId, { status: fee.status, validUntil: fee.validUntil });
  fee.status = 'regional_director';
  fee.validUntil = null;
  slot.member = member;
  log(region, userId, 'appoint', actorRole, now);
  return ok({ updated: true });
}

export function mockRegionalPatch(
  region: RegionalRegion,
  patch: RegionalPatch,
): MockResult<{ updated: true }> {
  const slot = state().data.items.find((s) => s.region === region);
  if (!slot) return notFound();
  if (patch.provinces?.some((p) => !regionalProvinces(region).includes(p)))
    return {
      ok: false,
      status: 422,
      code: 'VALIDATION_ERROR',
      message: `Tỉnh không thuộc ${REGIONAL_LABELS[region]}`,
    };
  if (patch.provinces) slot.provinces = patch.provinces;
  if (patch.bank) slot.bank = patch.bank;
  return ok({ updated: true });
}
