import { describe, expect, it, beforeEach } from 'vitest';
import { buildMessages } from './community';
import {
  eventItemSchema,
  feeRowSchema,
  groupItemSchema,
  investorInterestSchema,
  messageSchema,
  notificationSchema,
  projectItemSchema,
  reportSchema,
  serviceRequestSchema,
} from '../../api-domains';
import {
  actOnReport,
  buildFees,
  feeAction,
  feeStatusOf,
  joinGroup,
  listEvents,
  listGroups,
  listInterests,
  listMessages,
  listProjects,
  listReports,
  mockDb,
  MOCK_NOW,
  myNotifications,
  resetMockDb,
  reviewProject,
  setRegistration,
  DAY_MS,
} from './index';

beforeEach(() => resetMockDb());

describe('seed → DTO khớp zod schema', () => {
  it('mọi DTO parse được', () => {
    const db = mockDb();
    expect(() => listGroups('m1', {}).forEach((g) => groupItemSchema.parse(g))).not.toThrow();
    listEvents('m1').forEach((e) => eventItemSchema.parse(e));
    db.projects.forEach((p) => projectItemSchema.parse(p));
    db.fees.forEach((f) => feeRowSchema.parse(f));
    db.reports.forEach((r) => reportSchema.parse(r));
    db.interests.forEach((i) => investorInterestSchema.parse(i));
    db.serviceRequests.forEach((r) => serviceRequestSchema.parse(r));
    myNotifications('m1').forEach((n) => notificationSchema.parse(n));
    [...db.messages.values()].flat().forEach((m) => messageSchema.parse(m));
  });

  it('giữ đúng số lượng seed prototype', () => {
    const db = mockDb();
    expect(db.groups).toHaveLength(34);
    expect(db.events).toHaveLength(5);
    expect(db.projects).toHaveLength(10);
    expect(db.reports).toHaveLength(4);
    expect(db.joinRequests).toHaveLength(6);
    expect(db.serviceRequests).toHaveLength(5);
    expect(db.personas).toHaveLength(6);
    expect(db.scripts).toHaveLength(3);
    expect(myNotifications('m1')).toHaveLength(4);
  });

  it('dự án đang hiển thị theo state.published', () => {
    expect(listProjects({}, true).map((p) => p.id)).toEqual(['p10', 'p1', 'p2', 'p3', 'p4', 'p6']);
    expect(mockDb().projects.find((p) => p.id === 'p9')?.status).toBe('needs_changes');
  });

  it('nhóm của TK demo là thành viên, nhóm cần duyệt có joinMode approval', () => {
    const g = listGroups('m1', {});
    expect(g.find((x) => x.id === 'c1')).toMatchObject({
      myStatus: 'member',
      joinMode: 'approval',
    });
    expect(g.find((x) => x.id === 'c3')?.myStatus).toBeNull();
  });

  it('phí: m1 mới đóng, m6 chờ thanh toán', () => {
    const fees = buildFees();
    expect(fees.find((f) => f.userId === 'm1')?.status).toBe('active');
    expect(fees.find((f) => f.userId === 'm6')?.status).toBe('pending_payment');
  });
});

describe('nghiệp vụ mock', () => {
  it('feeStatusOf theo ngưỡng 30 ngày', () => {
    expect(feeStatusOf(null)).toBe('pending_payment');
    expect(feeStatusOf(MOCK_NOW - 1)).toBe('expired');
    expect(feeStatusOf(MOCK_NOW + 10 * DAY_MS)).toBe('expiring');
    expect(feeStatusOf(MOCK_NOW + 60 * DAY_MS)).toBe('active');
  });

  it('BR-05: gia hạn nối tiếp ngày hết hạn hiện tại', () => {
    const before = mockDb().fees.find((f) => f.userId === 'm1')?.validUntil ?? '';
    const r = feeAction('m1', 'renew');
    expect(r.ok && Date.parse(r.data.validUntil ?? '') - Date.parse(before)).toBe(365 * DAY_MS);
  });

  it('tham gia nhóm cần duyệt → pending; lặp lại → CONFLICT', () => {
    expect(joinGroup('m4', 'c1', 'Xin chào')).toMatchObject({
      ok: true,
      data: { status: 'pending' },
    });
    expect(joinGroup('m4', 'c1', 'Xin chào')).toMatchObject({ ok: false, code: 'CONFLICT' });
    expect(joinGroup('m4', 'c4')).toMatchObject({ ok: false, code: 'CONFLICT' });
  });

  it('đăng ký sự kiện tăng số chỗ; đăng ký lại → CONFLICT', () => {
    const r = setRegistration('m3', 'e1', true);
    expect(r).toMatchObject({ ok: true, data: { registered: 55, registeredByMe: true } });
    expect(setRegistration('m3', 'e1', true).ok).toBe(false);
  });

  it('chuyển trạng thái có điều kiện', () => {
    expect(reviewProject('p7', 'approve').ok).toBe(true);
    expect(reviewProject('p7', 'approve')).toMatchObject({ ok: false, code: 'CONFLICT' });
    expect(actOnReport('r1', 'hide').ok).toBe(true);
    expect(actOnReport('r1', 'hide')).toMatchObject({ ok: false, code: 'CONFLICT' });
    expect(listReports(undefined, 'open')).toHaveLength(3);
  });

  it('tin nhắn: mới → cũ, cursor before', () => {
    // Keep this existing pagination fixture explicit after adding real bot demo history.
    mockDb().messages.set('c1-general', buildMessages().get('c1-general') ?? []);
    const first = listMessages('c1-general', undefined, undefined, 2);
    expect(first.ok && first.data.items.map((m) => m.id)).toEqual(['c1-general-3', 'c1-general-2']);
    const next = listMessages('c1-general', undefined, 'c1-general-2', 2);
    expect(next.ok && next.data).toMatchObject({ nextCursor: null });
    expect(next.ok && next.data.items[1]?.reactions).toHaveLength(2);
  });

  it('lọc nhà đầu tư theo loại', () => {
    expect(listInterests('fund').every((i) => i.kind === 'fund')).toBe(true);
    expect(listInterests()).toHaveLength(5);
  });
});
