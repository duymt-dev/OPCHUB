import { describe, expect, it } from 'vitest';
import { parseOutboxPayload } from '../outbox';
import { adminChangePasswordSchema, adminUpdateProfileSchema, adminMeSchema } from './admin-auth';

describe('TIP-V46-822 REQ-322 REQ-323 REQ-351 RB-R02 / SEC-R01 self-service contracts', () => {
  it('AC-04 durable session event supports the existing text Admin IDs', () => {
    expect(parseOutboxPayload('admin.session_changed', { adminId: 'admin' })).toEqual({
      adminId: 'admin',
    });
    expect(() => parseOutboxPayload('admin.session_changed', { adminId: '' })).toThrow();
  });
  it('AC-02 only editable keys, bounded text, blank phone becomes null', () => {
    expect(adminUpdateProfileSchema.parse({ name: '  Quản Trị  ', phone: ' ' })).toEqual({
      name: 'Quản Trị',
      phone: null,
    });
    for (const body of [
      { name: 'x' },
      { name: 'xx', email: 'a@example.com' },
      { name: 'xx', roleId: 'root' },
      { name: 'xx', id: 'other' },
      { name: 'xx', phone: '1'.repeat(31) },
      { name: 'xx', avatarUrl: 'not-url' },
    ]) {
      expect(adminUpdateProfileSchema.safeParse(body).success).toBe(false);
    }
  });
  it('AC-05 rejects weak/same/mismatched/oversized passwords at the correct field', () => {
    const base = {
      currentPassword: 'OldPass1',
      newPassword: 'NewPass2',
      confirmPassword: 'NewPass2',
    };
    for (const [patch, field] of [
      [{ newPassword: 'short' }, 'newPassword'],
      [{ newPassword: 'lowercase1' }, 'newPassword'],
      [{ newPassword: 'Uppercase' }, 'newPassword'],
      [{ confirmPassword: 'no' }, 'confirmPassword'],
      [{ newPassword: 'OldPass1', confirmPassword: 'OldPass1' }, 'newPassword'],
      [{ currentPassword: '' }, 'currentPassword'],
      [{ newPassword: 'A1'.repeat(65) }, 'newPassword'],
    ] as const) {
      const result = adminChangePasswordSchema.safeParse({ ...base, ...patch });
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.some((issue) => issue.path[0] === field)).toBe(true);
    }
    const value = {
      currentPassword: '<OldPass1>',
      newPassword: '<NewPass2>',
      confirmPassword: '<NewPass2>',
    };
    expect(adminChangePasswordSchema.parse(value)).toEqual(value);
  });
  it('AC-01 legacy session payload is additive-compatible', () => {
    const me = adminMeSchema.parse({
      id: 'a',
      name: 'A',
      email: 'a@a.vn',
      roleId: null,
      roleName: null,
      isSuperAdmin: false,
      permissions: [],
      mustChangePassword: false,
      twoFactor: false,
      twoFactorRequired: false,
    });
    expect(me.phone).toBeNull();
    expect(me.avatarUrl).toBeNull();
  });
});
