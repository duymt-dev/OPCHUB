import { describe, expect, it } from 'vitest';
import {
  DIRECTOR_REGIONS,
  directorAppointmentSchema,
  directorConfigPatchSchema,
  directorConfigSchema,
  directorHistoryQuerySchema,
  directorMemberQuerySchema,
  directorRevokeSchema,
  type DirectorSlot,
} from './regional-directors';

const userId = '019a1b22-0000-7000-8000-000000000001';
const member = {
  id: userId,
  memberCode: 'TV000001',
  fullName: 'Thành viên',
  email: 'tv@example.test',
};
const config = () => ({
  slots: DIRECTOR_REGIONS.map((region) => ({
    region,
    version: 1,
    provinces: [] as string[],
    bank: null,
    incumbent: null as (typeof member & { appointedAt: string }) | null,
    affiliateCount: 0,
  })) as [DirectorSlot, DirectorSlot, DirectorSlot],
  unassignedProvinces: ['Hà Nội'],
});

describe('REQ-616 regional director contracts', () => {
  it('D-120 accepts only fixed region, existing member id and an optimistic version', () => {
    const body = { region: 'north', userId, version: 1 };
    expect(directorAppointmentSchema.parse(body)).toEqual(body);
    expect(directorAppointmentSchema.safeParse({ ...body, region: 'east' }).success).toBe(false);
    expect(directorAppointmentSchema.safeParse({ ...body, userId: '' }).success).toBe(false);
    expect(directorAppointmentSchema.parse({ ...body, userId: 'm1' }).userId).toBe('m1');
    expect(directorAppointmentSchema.safeParse({ ...body, version: 0 }).success).toBe(false);
    expect(directorAppointmentSchema.safeParse({ ...body, password: 'forbidden' }).success).toBe(
      false,
    );
  });

  it('D-120 rejects missing and duplicate fixed slots', () => {
    expect(directorConfigSchema.parse(config()).slots).toHaveLength(3);
    const missing = config();
    missing.slots.pop();
    expect(directorConfigSchema.safeParse(missing).success).toBe(false);
    const duplicate = config();
    duplicate.slots[1] = { ...duplicate.slots[0] };
    expect(directorConfigSchema.safeParse(duplicate).success).toBe(false);
  });

  it('AT-GDV05 rejects a member occupying two regions', () => {
    const value = config();
    const incumbent = { ...member, appointedAt: '2026-10-30T00:00:00Z' };
    value.slots[0].incumbent = incumbent;
    value.slots[1].incumbent = incumbent;
    expect(directorConfigSchema.safeParse(value).success).toBe(false);
  });

  it('REQ-616 rejects duplicated provinces within and across regions or unassigned list', () => {
    const value = config();
    value.slots[0].provinces = ['Hà Nội'];
    expect(directorConfigSchema.safeParse(value).success).toBe(false);
    value.unassignedProvinces = [];
    expect(directorConfigSchema.safeParse(value).success).toBe(true);
    value.slots[1].provinces = ['Hà Nội'];
    expect(directorConfigSchema.safeParse(value).success).toBe(false);
    expect(
      directorConfigPatchSchema.safeParse({
        version: 1,
        provinces: [' Hà Nội ', 'Hà Nội'],
        bank: null,
      }).success,
    ).toBe(false);
  });

  it('REQ-616 validates bank information and permits clearing empty slot configuration', () => {
    expect(
      directorConfigPatchSchema.parse({ version: 2, provinces: [], bank: null }).bank,
    ).toBeNull();
    const body = {
      version: 2,
      provinces: ['Hà Nội'],
      bank: {
        bankName: 'Vietcombank',
        bankNo: '123456789',
        bankHolder: ' Nguyễn Văn An ',
      },
    };
    expect(directorConfigPatchSchema.parse(body).bank?.bankHolder).toBe('NGUYEN VAN AN');
    expect(
      directorConfigPatchSchema.safeParse({ ...body, bank: { ...body.bank, bankNo: 'x' } }).success,
    ).toBe(false);
    expect(directorRevokeSchema.safeParse({}).success).toBe(false);
    expect(directorRevokeSchema.parse({ version: 3 })).toEqual({ version: 3 });
  });

  it('REQ-616 bounds searches and requires both parts of history keyset cursor', () => {
    expect(directorMemberQuerySchema.parse({ q: ' TV01 ' })).toEqual({
      q: 'TV01',
      page: 1,
      size: 20,
    });
    expect(directorMemberQuerySchema.safeParse({ q: ' ' }).success).toBe(false);
    expect(directorMemberQuerySchema.safeParse({ q: 'An', size: 101 }).success).toBe(false);
    expect(directorHistoryQuerySchema.parse({})).toEqual({ size: 20 });
    expect(directorHistoryQuerySchema.safeParse({ beforeId: userId }).success).toBe(false);
    expect(directorHistoryQuerySchema.safeParse({ beforeAt: '2026-10-30T00:00:00Z' }).success).toBe(
      false,
    );
    expect(
      directorHistoryQuerySchema.safeParse({
        beforeId: userId,
        beforeAt: '2026-10-30T00:00:00Z',
        region: 'central',
      }).success,
    ).toBe(true);
  });
});
