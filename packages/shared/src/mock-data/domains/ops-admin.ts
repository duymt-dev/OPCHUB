import type { z } from 'zod';
import { normalizeServiceDetails } from '../../api-domains';
import type {
  BotScript,
  Category,
  FeeAction,
  FeeRow,
  MyMembership,
  Notification,
  Persona,
  ServiceRequest,
  TransferConfirmResponse,
  categoryUpsertSchema,
  createServiceRequestSchema,
  personaUpsertSchema,
  scriptUpsertSchema,
} from '../../api-domains';
import type { MembershipFeeStatus, UserStatus } from '../../enums';
import { services } from '../../fixtures';
import { feeStatusOf } from './admin';
import { feePeriodEnd } from './fee-period';
import { FEE_BANK, mockQr } from './extras';
import { setAssignedRole } from './group-admin';
import { mockDb, nextId } from './store';
import { conflict, includesText, iso, MOCK_NOW, notFound, ok, type MockResult } from './util';

/** Nghiệp vụ mock: phí thành viên, tài khoản, dịch vụ, bot, cài đặt, thông báo */

export function myMembership(userId: string): MockResult<MyMembership> {
  const f = mockDb().fees.find((x) => x.userId === userId);
  if (!f) return notFound('Không tìm thấy phí thành viên');
  return ok({
    status: f.status,
    validUntil: f.validUntil,
    // D-41: đối soát chỉ theo Mã TV
    transferRef: `OPCHUB ${f.memberCode}`,
    amount: f.amount,
    memberCode: f.memberCode,
    bank: FEE_BANK,
    // BR-04: OPCHUB [Mã TV] [SĐT]; SĐT chỉ tham khảo (D-41)
    transferContent: `OPCHUB ${f.memberCode} ${localPhone(f.phone)}`.trim(),
    // D-96: QR động cùng số tiền + nội dung
    qr: mockQr(f.amount, `OPCHUB ${f.memberCode} ${localPhone(f.phone)}`.trim()),
    // D-94: chưa đóng phí thật lần nào (trial / hết trial) — như server `paid_at IS NULL`
    neverPaid: f.paidAt === null,
  });
}

/** "+84 912 345 678" → "0912345678" */
const localPhone = (phone: string) => phone.replace(/\D/g, '').replace(/^84/, '0').slice(-10);

/** D-31: chỉ ghi nhận; kích hoạt thật đi qua webhook ngân hàng */
export function confirmTransfer(userId: string): MockResult<TransferConfirmResponse> {
  const f = mockDb().fees.find((x) => x.userId === userId);
  if (!f) return notFound('Không tìm thấy phí thành viên');
  // Gia hạn khi đang hiệu lực cũng chờ webhook (BR-05 cộng nối tiếp)
  return ok({ status: f.status, awaitingWebhook: true });
}

/** Cột "Nhóm tham gia" (prototype v4.2): tên nhóm đang là thành viên, như server `feeGroupNamesQuery` */
const withGroups = (f: FeeRow): FeeRow => {
  const db = mockDb();
  const mine = db.groupMembers.get(f.userId);
  const ids = mine ? [...mine].filter(([, st]) => st === 'member').map(([g]) => g) : [];
  const groups = db.groups.filter((g) => ids.includes(g.id)).map((g) => g.name);
  return { ...f, groups };
};

export function listFees(status?: MembershipFeeStatus, q?: string): FeeRow[] {
  return mockDb()
    .fees.filter(
      (f) =>
        (!status || f.status === status) &&
        (includesText(f.fullName, q) || includesText(f.email, q) || includesText(f.memberCode, q)),
    )
    .map(withGroups);
}

/** BR-05: gia hạn nối tiếp ngày hết hạn hiện tại nếu còn hiệu lực */
export function feeAction(userId: string, action: FeeAction, now = MOCK_NOW): MockResult<FeeRow> {
  const f = mockDb().fees.find((x) => x.userId === userId);
  if (!f) return notFound('Không tìm thấy thành viên');
  if (action === 'remind') return ok(f);
  if (action === 'collect' && f.status === 'active') return conflict('Phí đang hiệu lực');
  const curUntil = f.validUntil ? Date.parse(f.validUntil) : 0;
  // BR-TRIAL-04: thu khi đang miễn phí → 12 tháng từ hôm nay (không nối phần trial)
  const from = action === 'renew' && f.status !== 'trial' && curUntil > now ? curUntil : now;
  f.paidAt = iso(now);
  const until = feePeriodEnd(from);
  f.validUntil = iso(until);
  f.status = feeStatusOf(until, now);
  return ok(f);
}

export { setMockMemberStatus as setUserStatus } from './member-lifecycle';

export const userStatusOf = (userId: string): UserStatus =>
  mockDb().userStatus.get(userId) ?? 'active';

/**
 * GR-R01 / NA-12 như server: gán với vai trò Thành viên / Giảng viên; mỗi cặp MỚI vào nhóm nhận 1
 * thông báo "Bạn đã được thêm vào …"; trả số thành viên có ít nhất 1 nhóm mới.
 */
export function assignGroups(
  userIds: string[],
  groupIds: string[],
  role: 'member' | 'lecturer' = 'member',
): MockResult<{ updated: number }> {
  const db = mockDb();
  let updated = 0;
  for (const u of userIds) {
    const mine = db.groupMembers.get(u);
    if (!mine) continue;
    const fresh = groupIds.filter((g) => mine.get(g) !== 'member');
    for (const g of groupIds) {
      mine.set(g, 'member');
      setAssignedRole(u, g, role);
    }
    if (!fresh.length) continue;
    updated += 1;
    const inbox = db.notifications.get(u) ?? [];
    const added = fresh.flatMap((g) => {
      const grp = db.groups.find((x) => x.id === g);
      if (!grp) return [];
      grp.memberCount += 1;
      return [
        {
          id: nextId('nt-assign'),
          type: 'group' as const,
          title: `Bạn đã được thêm vào ${grp.name}`,
          body: 'Hãy vào phòng Chung để làm quen.',
          link: `/chat/${g}`,
          read: false,
          createdAt: iso(MOCK_NOW),
        },
      ];
    });
    db.notifications.set(u, [...added, ...inbox]);
  }
  return ok({ updated });
}

export const listServices = () =>
  services.map((s) => ({ id: s.id, name: s.n, model: s.m, description: s.d, enabled: !!s.on }));

/** Đầu vào đã qua `createServiceRequestSchema` (handler `parseBody` → 400 như server, QT-11) */
export function createServiceRequest(
  input: z.output<typeof createServiceRequestSchema>,
): MockResult<ServiceRequest> {
  // FX-02: rỗng / đã tắt → dịch vụ bật đầu tiên (thứ tự hiển thị); id lạ → 404 như server
  const chosen = services.find((s) => s.id === input.serviceId);
  const svc =
    input.serviceId && !chosen ? undefined : chosen?.on ? chosen : services.find((s) => s.on);
  if (!svc) return notFound('Không tìm thấy dịch vụ');
  const db = mockDb();
  const n = 1001 + db.serviceRequests.length;
  const r: ServiceRequest = {
    code: `YC-${n}`,
    serviceName: svc.n,
    createdAt: iso(MOCK_NOW),
    ...input,
    serviceId: svc.id,
    details: normalizeServiceDetails(input.details),
  };
  db.serviceRequests.unshift(r);
  return ok(r);
}

export const listServiceRequests = (q?: string) =>
  mockDb().serviceRequests.filter(
    (r) =>
      includesText(r.fullName, q) || includesText(r.code, q) || includesText(r.organization, q),
  );

export function addServiceComment(code: string, authorName: string, body: string) {
  const db = mockDb();
  if (!db.serviceRequests.some((r) => r.code === code))
    return notFound('Không tìm thấy phiếu yêu cầu');
  const list = db.serviceComments.get(code) ?? [];
  db.serviceComments.set(code, list);
  const c = { id: nextId('sc'), authorName, body, createdAt: iso(MOCK_NOW) };
  list.push(c);
  return ok(c);
}

/** CRUD dùng chung cho danh sách có `id` trong mock db */
function crud<T extends { id: string }>(list: () => T[], prefix: string, label: string) {
  return {
    create(data: Omit<T, 'id'>): MockResult<T> {
      const item = { id: nextId(prefix), ...data } as T;
      list().push(item);
      return ok(item);
    },
    update(id: string, data: Partial<Omit<T, 'id'>>): MockResult<T> {
      const item = list().find((x) => x.id === id);
      if (!item) return notFound(`Không tìm thấy ${label}`);
      Object.assign(item, data);
      return ok(item);
    },
    remove(id: string): MockResult<{ id: string }> {
      const arr = list();
      const i = arr.findIndex((x) => x.id === id);
      if (i < 0) return notFound(`Không tìm thấy ${label}`);
      arr.splice(i, 1);
      return ok({ id });
    },
  };
}

export const personaCrud = crud<Persona>(() => mockDb().personas, 'ps', 'persona');
export const scriptCrud = crud<BotScript>(() => mockDb().scripts, 'sc', 'kịch bản');
export const categoryCrud = crud<Category>(() => mockDb().categories, 'k', 'danh mục');

export const personaFromInput = (i: z.output<typeof personaUpsertSchema>): Omit<Persona, 'id'> => ({
  ...i,
  postCount: 0,
});
export const scriptFromInput = (i: z.output<typeof scriptUpsertSchema>): Omit<BotScript, 'id'> => i;
export const categoryFromInput = (i: z.output<typeof categoryUpsertSchema>): Omit<Category, 'id'> =>
  i;

export function runScript(id: string): MockResult<{ threadId: string; status: 'scheduled' }> {
  const db = mockDb();
  const sc = db.scripts.find((s) => s.id === id);
  if (!sc) return notFound('Không tìm thấy kịch bản');
  if (!sc.enabled) return conflict('Kịch bản đang tắt');
  const threadId = nextId('th');
  const names = new Map(db.groups.map((g) => [g.id, g.name]));
  db.botLog.unshift({
    id: threadId,
    scriptId: id,
    topic: sc.topic,
    groupNames: sc.groupIds.map((g) => names.get(g) ?? g),
    status: 'scheduled',
    createdAt: iso(MOCK_NOW),
  });
  return ok({ threadId, status: 'scheduled' });
}

export const myNotifications = (userId: string): Notification[] =>
  mockDb().notifications.get(userId) ?? [];
