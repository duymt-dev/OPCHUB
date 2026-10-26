import type { DeclarationDraft, DeclarationRequest } from '../../../api';
import { provinces, registrationRoles } from '../../../fixtures';
import { joinOnRegister } from '../ops-community';
import { mockDb } from '../store';
import { ok, type MockResult } from '../util';
import { registrationState } from './state';

/**
 * V4-607: khai báo sau đăng nhập trên MSW — chỉ TK tạo trong phiên mock (`n-…`) cần khai báo;
 * TK seed coi như đã khai báo (như backfill migration). Lưu cùng snapshot đăng ký.
 */
export function mockNeedsDeclaration(userId: string): boolean {
  const s = registrationState();
  return s.profiles.has(userId) && !s.declared.has(userId);
}

function fail<T>(status: 400 | 403, message: string, path?: string): MockResult<T> {
  const code = status === 403 ? 'FORBIDDEN' : 'VALIDATION_ERROR';
  return { ok: false, status, code, message, ...(path ? { fields: [{ path, message }] } : {}) };
}

export function mockDeclarationDraft(userId: string): MockResult<DeclarationDraft> {
  const s = registrationState();
  const meta = s.metadata.get(userId);
  const groups = [...(mockDb().groupMembers.get(userId) ?? [])]
    .filter(([, st]) => st === 'member')
    .map(([id]) => id);
  if (!meta) return ok({ persona: null, groupIds: groups, business: null });
  if (meta.accountType === 'personal')
    return ok({ persona: meta.input.persona, groupIds: groups, business: null });
  const b = meta.input;
  return ok({
    persona: null,
    groupIds: groups,
    business: {
      taxCode: b.taxCode,
      companyName: b.companyName,
      mainIndustry: b.mainIndustry,
      size: b.size || null,
      province: s.declared.get(userId)?.province ?? null,
    },
  });
}

export function saveMockDeclaration(
  userId: string,
  accountType: 'personal' | 'business' | 'investor',
  req: DeclarationRequest,
): MockResult<{ id: string }> {
  if (accountType === 'investor')
    return fail(403, 'Nhà đầu tư không cần khai báo thông tin tham gia');
  if (req.accountType !== accountType) return fail(403, 'Loại khai báo không khớp loại tài khoản');
  const db = mockDb();
  const groupIds = req.groupIds.filter((id) => db.groups.some((g) => g.id === id));
  if (!groupIds.length) return fail(400, 'Vui lòng chọn OPC bạn muốn tham gia', 'groupIds');
  if (req.accountType === 'personal' && !registrationRoles.some((r) => r.id === req.persona))
    return fail(400, 'Vui lòng chọn bạn là ai', 'persona');
  if (req.accountType === 'business' && !provinces.some(([p]) => p === req.province))
    return fail(400, 'Vui lòng chọn tỉnh/thành đăng ký kinh doanh trong danh sách', 'province');
  const s = registrationState();
  const meta = s.metadata.get(userId);
  if (meta?.accountType === 'personal' && req.accountType === 'personal') {
    s.metadata.set(userId, { ...meta, input: { ...meta.input, persona: req.persona } });
  } else if (meta?.accountType === 'business' && req.accountType === 'business') {
    const { taxCode, companyName, mainIndustry, size } = req;
    s.metadata.set(userId, {
      ...meta,
      input: { ...meta.input, taxCode, companyName, mainIndustry, size },
    });
  }
  joinOnRegister(userId, groupIds);
  s.declared.set(userId, {
    at: new Date().toISOString(),
    province: req.accountType === 'business' ? req.province : null,
  });
  return ok({ id: userId });
}

/** Loại TK + `me` sau khi lưu: TK tạo trong phiên mock lấy từ phiên đăng ký, TK seed từ hồ sơ */
export function mockDeclarationAccount(userId: string) {
  const profile = registrationState().profiles.get(userId);
  return profile ? { accountType: profile.accountType, email: profile.email } : undefined;
}
