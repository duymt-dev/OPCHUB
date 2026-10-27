import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { listAdminMembers } from '../admin-members';
import { resetMockDb } from '../store';
import { activateMockRegistration, beginMockRegistration } from './commands';
import { mockDeclarationDraft, mockNeedsDeclaration, saveMockDeclaration } from './declaration';

const NOW = Date.parse('2026-10-26T05:00:00Z');
const email = 'v4-biz@example.test';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  resetMockDb();
});
afterEach(() => vi.useRealTimers());

it('D-89 DN đăng ký v4 không MST → chưa có hồ sơ DN; khai báo MST khớp → hồ sơ verified (D-40)', () => {
  beginMockRegistration(
    'business',
    {
      email,
      representative: 'Lê Thu Hà',
      position: 'Giám đốc',
      password: '',
      phone: { country: 'vn', number: '' },
      agreeTerms: true,
    },
    NOW,
  );
  const me = activateMockRegistration(email, NOW);
  if (!me) throw new Error('activation failed');
  expect(mockNeedsDeclaration(me.id)).toBe(true);
  expect(listAdminMembers({ type: 'business', q: email }).items[0]).toMatchObject({
    fullName: 'Lê Thu Hà',
    organization: '',
    business: null,
  });
  expect(mockDeclarationDraft(me.id)).toMatchObject({ ok: true, data: { business: null } });

  const saved = saveMockDeclaration(me.id, 'business', {
    accountType: 'business',
    taxCode: '0101234567',
    companyName: 'Công ty TNHH Giải pháp MediaSoft',
    mainIndustry: '6201 – Lập trình máy vi tính',
    size: '10',
    province: 'Hà Nội',
    groupIds: ['c1'],
  });
  expect(saved.ok).toBe(true);
  expect(mockNeedsDeclaration(me.id)).toBe(false);
  expect(listAdminMembers({ type: 'business', q: email }).items[0]).toMatchObject({
    organization: 'Công ty TNHH Giải pháp MediaSoft',
    business: { taxCode: '0101234567', position: 'Giám đốc', verification: 'verified' },
  });
});

it('D-89 cá nhân đăng ký v4 không vai trò / nhóm → bản nháp khai báo trống', () => {
  beginMockRegistration(
    'personal',
    {
      email: 'v4-per@example.test',
      fullName: 'Trần Minh Khoa',
      password: '',
      phone: { country: 'vn', number: '' },
      agreeTerms: true,
    },
    NOW,
  );
  const me = activateMockRegistration('v4-per@example.test', NOW);
  if (!me) throw new Error('activation failed');
  expect(mockDeclarationDraft(me.id)).toEqual({
    ok: true,
    data: { persona: null, groupIds: [], business: null },
  });
});
