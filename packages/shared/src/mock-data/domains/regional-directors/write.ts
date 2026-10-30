import type { z } from 'zod';
import {
  directorAppointmentSchema,
  directorConfigPatchSchema,
  directorRevokeSchema,
  type DirectorConfig,
  type DirectorRegion,
} from '../../../api-domains';
import type { AdminMe } from '../../../api';
import { provinces } from '../../../fixtures';
import { listAdminMembers } from '../admin-members';
import {
  captureMockAffiliateSnapshot,
  restoreMockAffiliateSnapshot,
} from '../affiliate-persistence/snapshot';
import { mockDb } from '../store';
import { conflict, notFound, ok, type MockResult } from '../util';
import { directorActor } from './access';
import { recordMockDirector } from './effects';
import { mockFeeAfterDirector } from './fee';
import { readMockDirectors } from './read';
import { mockDirectorState } from './state';

function execute<T extends z.ZodType>(
  actorId: string,
  schema: T,
  input: unknown,
  run: (actor: AdminMe, data: z.output<T>) => MockResult<DirectorConfig>,
): MockResult<DirectorConfig> {
  const actor = directorActor(actorId, 'affiliate.gdv');
  if (!actor.ok) return actor;
  const parsed = schema.safeParse(input);
  if (!parsed.success)
    return {
      ok: false,
      status: 400,
      code: 'VALIDATION_ERROR',
      message: 'Dữ liệu không hợp lệ',
      fields: parsed.error.issues.map((issue) => ({
        path: issue.path.join('.'),
        message: issue.message,
      })),
    };
  // Sync affiliate codes before fee mutation; snapshot rollback includes mail, audit and original fees.
  const before = captureMockAffiliateSnapshot();
  try {
    const result = run(actor.data, parsed.data);
    if (!result.ok) restoreMockAffiliateSnapshot(before);
    return result;
  } catch (error: unknown) {
    restoreMockAffiliateSnapshot(before);
    throw error;
  }
}

export function appointMockDirector(actorId: string, input: unknown, now = Date.now()) {
  return execute(actorId, directorAppointmentSchema, input, (actor, data) => {
    const state = mockDirectorState();
    const slot = state.config.slots.find((row) => row.region === data.region);
    if (!slot) return notFound('Không tìm thấy vùng');
    if (slot.version !== data.version) return conflict('Cấu hình đã thay đổi. Vui lòng tải lại.');
    if (slot.incumbent || state.config.slots.some((row) => row.incumbent?.id === data.userId))
      return conflict('Vùng hoặc thành viên đã có GĐ Vùng. Hãy thu hồi bổ nhiệm cũ trước.');
    const member = listAdminMembers().items.find((row) => row.id === data.userId);
    if (!member) return notFound('Không tìm thấy thành viên đã đăng ký');
    if (member.status !== 'active') return conflict('Không thể bổ nhiệm thành viên đang bị khóa');
    const fee = mockDb().fees.find((row) => row.userId === member.id);
    if (!fee) return notFound('Không tìm thấy phí thành viên');
    if (fee.status === 'regional_director') return conflict('Thành viên đã được miễn phí GĐ Vùng');
    state.previousFees.push({ userId: member.id, status: fee.status, validUntil: fee.validUntil });
    fee.status = 'regional_director';
    slot.incumbent = {
      id: member.id,
      fullName: member.fullName,
      email: member.email,
      memberCode: fee.memberCode,
      appointedAt: new Date(now).toISOString(),
    };
    slot.version += 1;
    recordMockDirector(actor, slot.region, 'appointed', slot.incumbent, now);
    return ok(readMockDirectors());
  });
}

export function revokeMockDirector(
  actorId: string,
  region: DirectorRegion,
  input: unknown,
  now = Date.now(),
) {
  return execute(actorId, directorRevokeSchema, input, (actor, data) => {
    const state = mockDirectorState();
    const slot = state.config.slots.find((row) => row.region === region);
    if (!slot) return notFound('Không tìm thấy vùng');
    if (slot.version !== data.version) return conflict('Cấu hình đã thay đổi. Vui lòng tải lại.');
    const member = slot.incumbent;
    if (!member) return conflict('Vùng chưa có GĐ Vùng');
    if (!listAdminMembers().items.some((row) => row.id === member.id))
      return notFound('Không tìm thấy thành viên');
    const fee = mockDb().fees.find((row) => row.userId === member.id);
    const previous = state.previousFees.find((row) => row.userId === member.id);
    if (!fee || fee.status !== 'regional_director' || !previous)
      return conflict('Thành viên không có miễn phí GĐ Vùng để thu hồi');
    fee.status = mockFeeAfterDirector(previous, now);
    fee.validUntil = previous.validUntil;
    state.previousFees = state.previousFees.filter((row) => row.userId !== member.id);
    slot.incumbent = null;
    slot.version += 1;
    recordMockDirector(actor, region, 'revoked', member, now);
    return ok(readMockDirectors());
  });
}

export function configureMockDirector(
  actorId: string,
  region: DirectorRegion,
  input: unknown,
  now = Date.now(),
) {
  return execute(actorId, directorConfigPatchSchema, input, (actor, data) => {
    const catalog = new Set(provinces.map(([name]) => name));
    if (data.provinces.some((name) => !catalog.has(name)))
      return {
        ok: false,
        status: 400,
        code: 'VALIDATION_ERROR',
        message: 'Tỉnh không hợp lệ',
        fields: [{ path: 'provinces', message: 'Chỉ chọn tỉnh trong danh mục 34 tỉnh/thành' }],
      };
    const state = mockDirectorState();
    const slot = state.config.slots.find((row) => row.region === region);
    if (!slot) return notFound('Không tìm thấy vùng');
    if (slot.version !== data.version) return conflict('Cấu hình đã thay đổi. Vui lòng tải lại.');
    const occupied = state.config.slots
      .filter((row) => row.region !== region)
      .flatMap((row) => row.provinces)
      .filter((name) => data.provinces.includes(name));
    if (occupied.length) return conflict(`Tỉnh đã thuộc vùng khác: ${occupied.join(', ')}`);
    slot.provinces = [...data.provinces];
    slot.bank = data.bank;
    slot.version += 1;
    const assigned = new Set(state.config.slots.flatMap((row) => row.provinces));
    state.config.unassignedProvinces = [...catalog].filter((name) => !assigned.has(name));
    recordMockDirector(actor, region, 'updated', slot.incumbent, now, {
      provinces: data.provinces,
      bank: data.bank,
    });
    return ok(readMockDirectors());
  });
}
