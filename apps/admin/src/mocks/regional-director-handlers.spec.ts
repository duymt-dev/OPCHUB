import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { setupServer } from 'msw/node';
import { apiErrorSchema } from '@opchub/shared/api';
import {
  directorConfigSchema,
  directorHistorySchema,
  directorMemberPageSchema,
} from '@opchub/shared/api-domains';
import {
  captureMockAffiliateSnapshot,
  restoreMockAffiliateSnapshot,
  listMailLog,
  mockAdminMeOf,
  mockDb,
  resetMockDb,
} from '@opchub/shared/mock-domains';
import { handlers } from './handlers';

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1/admin/gdv`;
const APPOINT = { region: 'north', userId: 'm3', version: 1 };
const BANK = { bankName: 'Vietcombank', bankNo: '001100104567', bankHolder: 'TRAN QUOC BAO' };
const call = (path = '', method = 'GET', body?: unknown, actor = 'admin', raw = false) =>
  fetch(`${BASE}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(actor ? { Authorization: `Bearer mock.${actor}` } : {}),
    },
    ...(body === undefined
      ? {}
      : { body: raw && typeof body === 'string' ? body : JSON.stringify(body) }),
  });
const config = async () => directorConfigSchema.parse(await (await call()).json());
beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-30T03:00:00.000Z'));
  document.cookie = 'opchub-mock-affiliate-demo=; Max-Age=0; Path=/';
  resetMockDb();
});
afterEach(() => vi.useRealTimers());
afterAll(() => server.close());

describe('REQ-616 /admin/gdv MSW HTTP contracts (not browser/native proof)', () => {
  it('AT-GDV01 BR-462 reads three slots, configures, appoints, restores JSON state and revokes', async () => {
    const initial = await config();
    expect(initial.slots).toHaveLength(3);
    const original = structuredClone(mockDb().fees.find((fee) => fee.userId === 'm3'));
    expect(original).toBeDefined();
    const saved = await call('/north', 'PATCH', { version: 1, provinces: ['Hà Nội'], bank: BANK });
    expect(saved.status).toBe(200);
    expect(directorConfigSchema.parse(await saved.json()).slots[0]).toMatchObject({
      version: 2,
      bank: BANK,
    });
    vi.setSystemTime(Date.now() + 1);
    const assigned = await call('', 'POST', { ...APPOINT, version: 2 });
    expect(assigned.status).toBe(200);
    expect(directorConfigSchema.parse(await assigned.json()).slots[0]?.incumbent?.id).toBe('m3');
    expect(mockDb().fees.find((fee) => fee.userId === 'm3')).toEqual({
      ...original,
      status: 'regional_director',
    });
    const snapshot: unknown = JSON.parse(JSON.stringify(captureMockAffiliateSnapshot()));
    resetMockDb();
    restoreMockAffiliateSnapshot(snapshot);
    vi.setSystemTime(Date.now() + 1);
    const revoked = await call('/north', 'DELETE', { version: 3 });
    expect(revoked.status).toBe(200);
    expect(directorConfigSchema.parse(await revoked.json()).slots[0]).toMatchObject({
      version: 4,
      incumbent: null,
      provinces: ['Hà Nội'],
      bank: BANK,
    });
    expect(mockDb().fees.find((fee) => fee.userId === 'm3')?.validUntil).toBe(original?.validUntil);
    const history = directorHistorySchema.parse(
      await (await call('/history?region=north&size=2')).json(),
    );
    expect(history.items.map((row) => row.action)).toEqual(['revoked', 'appointed']);
    expect(history.nextCursor).not.toBeNull();
    const cursor = history.nextCursor;
    if (!cursor) throw new Error('Missing cursor');
    const next = directorHistorySchema.parse(
      await (
        await call(
          `/history?region=north&size=2&beforeAt=${encodeURIComponent(cursor.at)}&beforeId=${cursor.id}`,
        )
      ).json(),
    );
    expect(next.items.map((row) => row.action)).toEqual(['updated']);
    vi.setSystemTime(Date.now() + 1);
    expect(
      listMailLog()
        .filter((row) => row.kind.startsWith('director_'))
        .map((row) => row.kind),
    ).toEqual(['director_revoked', 'director_appointed']);
  });

  it('AT-GDV06 searches registered unlocked members and rechecks a lock after selection', async () => {
    const result = directorMemberPageSchema.parse(
      await (await call('/members?q=tran%20quoc%20bao&size=1')).json(),
    );
    expect(result).toMatchObject({ total: 1, items: [{ id: 'm3' }] });
    mockDb().userStatus.set('m3', 'locked');
    expect((await call('', 'POST', APPOINT)).status).toBe(409);
    expect(
      directorMemberPageSchema.parse(await (await call('/members?q=bao')).json()).items,
    ).toEqual([]);
    expect((await config()).slots.every((slot) => slot.incumbent === null)).toBe(true);
  });

  it('AT-GDV05 concurrent appointments have one winner and no duplicate mail/history', async () => {
    const responses = await Promise.all([
      call('', 'POST', APPOINT),
      call('', 'POST', { ...APPOINT, userId: 'm1' }),
    ]);
    expect(responses.map((row) => row.status).sort()).toEqual([200, 409]);
    expect((await config()).slots[0]?.version).toBe(2);
    expect(directorHistorySchema.parse(await (await call('/history')).json()).items).toHaveLength(
      1,
    );
    expect(listMailLog().filter((row) => row.kind === 'director_appointed')).toHaveLength(1);
  });

  it('AT-GDV03 accountant reads all endpoints but cannot write; anonymous/member/lecturer cannot read', async () => {
    expect(mockAdminMeOf('adm-mai')?.permissions).toContain('affiliate.view');
    expect(mockAdminMeOf('adm-mai')?.permissions).not.toContain('affiliate.gdv');
    for (const path of ['', '/members?q=bao', '/history']) {
      expect((await call(path, 'GET', undefined, 'adm-mai')).status).toBe(200);
      expect((await call(path, 'GET', undefined, '')).status).toBe(401);
      expect((await call(path, 'GET', undefined, 'm3')).status).toBe(401);
      expect((await call(path, 'GET', undefined, 'adm-yen')).status).toBe(403);
    }
    const before = captureMockAffiliateSnapshot();
    for (const [path, method, body] of [
      ['', 'POST', APPOINT],
      ['/north', 'PATCH', { version: 1, provinces: [], bank: null }],
      ['/north', 'DELETE', { version: 1 }],
    ] as const)
      expect((await call(path, method, body, 'adm-mai')).status).toBe(403);
    expect(captureMockAffiliateSnapshot()).toEqual(before);
  });

  it.each([
    ['', 'POST', { ...APPOINT, version: 0 }],
    ['/north', 'PATCH', { version: 1, provinces: ['unknown'], bank: null }],
    ['/north', 'DELETE', {}],
    ['/invalid', 'PATCH', { version: 1, provinces: [], bank: null }],
    ['/invalid', 'DELETE', { version: 1 }],
  ] as const)(
    'REQ-616 validates %s %s with 400 fields and no mutation',
    async (path, method, body) => {
      const before = captureMockAffiliateSnapshot();
      const response = await call(path, method, body);
      expect(response.status).toBe(400);
      const error = apiErrorSchema.parse(await response.json());
      expect(error.error.code).toBe('VALIDATION_ERROR');
      expect(error.error.fields?.length).toBeGreaterThan(0);
      if (path === '/invalid')
        expect(error.error.fields?.map((field) => field.path)).toContain('region');
      expect(captureMockAffiliateSnapshot()).toEqual(before);
    },
  );

  it.each([
    ['', 'POST'],
    ['/north', 'PATCH'],
    ['/north', 'DELETE'],
  ] as const)(
    'REQ-616 rejects oversized UTF-8 %s %s with 413 and malformed JSON with 400',
    async (path, method) => {
      const before = captureMockAffiliateSnapshot();
      const response = await call(path, method, { padding: 'Đ'.repeat(400_000) });
      expect(response.status).toBe(413);
      expect(await response.json()).toMatchObject({ error: { code: 'PAYLOAD_TOO_LARGE' } });
      const malformed = await call(path, method, '{invalid', 'admin', true);
      expect(malformed.status).toBe(400);
      expect(captureMockAffiliateSnapshot()).toEqual(before);
    },
  );

  it('REQ-616 rejects unknown member, stale patch, duplicate province and empty revoke', async () => {
    const before = captureMockAffiliateSnapshot();
    expect((await call('', 'POST', { ...APPOINT, userId: 'unknown' })).status).toBe(404);
    expect((await call('/north', 'PATCH', { version: 2, provinces: [], bank: null })).status).toBe(
      409,
    );
    expect(
      (await call('/south', 'PATCH', { version: 1, provinces: ['Hà Nội'], bank: null })).status,
    ).toBe(409);
    expect((await call('/north', 'DELETE', { version: 1 })).status).toBe(409);
    expect(captureMockAffiliateSnapshot()).toEqual(before);
  });

  it.each(['/members', '/members?q=bao&page=0', '/history?beforeAt=2026-10-30T03:00:00.000Z'])(
    'REQ-616 validates read query %s',
    async (path) => {
      expect((await call(path)).status).toBe(400);
    },
  );
});
