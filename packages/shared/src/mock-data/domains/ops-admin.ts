import type { z } from 'zod';
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
  updateServiceRequestSchema,
} from '../../api-domains';
import type { MembershipFeeStatus, UserStatus } from '../../enums';
import { services } from '../../fixtures';
import { feeStatusOf } from './admin';
import { FEE_BANK } from './extras';
import { mockDb, nextId } from './store';
import {
  conflict,
  DAY_MS,
  includesText,
  iso,
  MOCK_NOW,
  notFound,
  ok,
  type MockResult,
} from './util';

/** Nghiệp vụ mock: phí thành viên, tài khoản, dịch vụ, bot, cài đặt, thông báo */

const YEAR_MS = 365 * DAY_MS;

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
  });
}

/** D-31: chỉ ghi nhận; kích hoạt thật đi qua webhook ngân hàng */
export function confirmTransfer(userId: string): MockResult<TransferConfirmResponse> {
  const f = mockDb().fees.find((x) => x.userId === userId);
  if (!f) return notFound('Không tìm thấy phí thành viên');
  return ok({ status: f.status, awaitingWebhook: f.status !== 'active' });
}

export function listFees(status?: MembershipFeeStatus, q?: string): FeeRow[] {
  return mockDb().fees.filter(
    (f) =>
      (!status || f.status === status) &&
      (includesText(f.fullName, q) || includesText(f.email, q) || includesText(f.memberCode, q)),
  );
}

/** BR-05: gia hạn nối tiếp ngày hết hạn hiện tại nếu còn hiệu lực */
export function feeAction(userId: string, action: FeeAction): MockResult<FeeRow> {
  const f = mockDb().fees.find((x) => x.userId === userId);
  if (!f) return notFound('Không tìm thấy thành viên');
  if (action === 'remind') return ok(f);
  if (action === 'collect' && f.status === 'active') return conflict('Phí đang hiệu lực');
  const curUntil = f.validUntil ? Date.parse(f.validUntil) : 0;
  const from = action === 'renew' && curUntil > MOCK_NOW ? curUntil : MOCK_NOW;
  f.paidAt = iso(MOCK_NOW);
  f.validUntil = iso(from + YEAR_MS);
  f.status = feeStatusOf(from + YEAR_MS);
  return ok(f);
}

export function setUserStatus(
  userId: string,
  status: UserStatus,
): MockResult<{ id: string; status: UserStatus }> {
  const db = mockDb();
  const cur = db.userStatus.get(userId);
  if (!cur) return notFound('Không tìm thấy thành viên');
  if (cur === status) return conflict('Tài khoản đã ở trạng thái này');
  db.userStatus.set(userId, status);
  return ok({ id: userId, status });
}

export const userStatusOf = (userId: string): UserStatus =>
  mockDb().userStatus.get(userId) ?? 'active';

export function assignGroups(
  userIds: string[],
  groupIds: string[],
): MockResult<{ updated: number }> {
  const db = mockDb();
  let updated = 0;
  for (const u of userIds) {
    const mine = db.groupMembers.get(u);
    if (!mine) continue;
    groupIds.forEach((g) => mine.set(g, 'member'));
    updated += 1;
  }
  return ok({ updated });
}

export const listServices = () =>
  services.map((s) => ({ id: s.id, name: s.n, model: s.m, description: s.d, enabled: !!s.on }));

export function createServiceRequest(
  input: z.output<typeof createServiceRequestSchema>,
): MockResult<ServiceRequest> {
  const svc = services.find((s) => s.id === input.serviceId && s.on);
  if (!svc) return notFound('Không tìm thấy dịch vụ');
  const db = mockDb();
  const n = 1001 + db.serviceRequests.length;
  const r: ServiceRequest = {
    code: `YC-${n}`,
    serviceName: svc.n,
    status: 'new',
    assignee: null,
    createdAt: iso(MOCK_NOW),
    ...input,
  };
  db.serviceRequests.unshift(r);
  return ok(r);
}

export const listServiceRequests = (status?: ServiceRequest['status'], q?: string) =>
  mockDb().serviceRequests.filter(
    (r) =>
      (!status || r.status === status) &&
      (includesText(r.fullName, q) || includesText(r.code, q) || includesText(r.organization, q)),
  );

export function updateServiceRequest(
  code: string,
  patch: z.output<typeof updateServiceRequestSchema>,
): MockResult<ServiceRequest> {
  const r = mockDb().serviceRequests.find((x) => x.code === code);
  if (!r) return notFound('Không tìm thấy phiếu yêu cầu');
  if (patch.status !== undefined) r.status = patch.status;
  if (patch.assignee !== undefined) r.assignee = patch.assignee;
  return ok(r);
}

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
  color: '#1677FF',
});
export const scriptFromInput = (i: z.output<typeof scriptUpsertSchema>): Omit<BotScript, 'id'> => i;
export const categoryFromInput = (i: z.output<typeof categoryUpsertSchema>): Omit<Category, 'id'> =>
  i;

export function runScript(id: string): MockResult<{ threadId: string; status: 'pending' }> {
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
    status: 'pending',
    createdAt: iso(MOCK_NOW),
  });
  return ok({ threadId, status: 'pending' });
}

export const myNotifications = (userId: string): Notification[] =>
  mockDb().notifications.get(userId) ?? [];
