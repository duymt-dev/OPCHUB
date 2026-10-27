import { adminPriceConfigSchema, priceConfigSchema } from '@opchub/shared';
import { PRICE_DEFAULTS } from '@opchub/shared/fixtures';
import { listSettingsLog, resetMockDb } from '@opchub/shared/mock-domains';
import { setupServer } from 'msw/node';
import { handlers } from './handlers';

/** TIP-V42-703 (D-94 5A): MSW Cấu hình bảng giá — khoá settings.general, version, nhật ký `pricing` */

const server = setupServer(...handlers);
const BASE = `${location.origin}/v1`;

beforeAll(() => server.listen({ onUnhandledFrame: 'error' }));
beforeEach(() => resetMockDb());
afterAll(() => server.close());

const send = (path: string, method = 'GET', body?: unknown, token = 'mock.admin') =>
  fetch(`${BASE}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  });
const NEXT = { ...PRICE_DEFAULTS, per: { list: 250_000, y: 1_500_000 } };

describe('MSW admin — Cấu hình bảng giá', () => {
  it('giá mặc định §27.2; lưu → version + 1, giá công khai đổi ngay, nhật ký tag pricing', async () => {
    const cur = adminPriceConfigSchema.parse(await (await send('/admin/price-config')).json());
    expect(priceConfigSchema.parse(cur)).toEqual(PRICE_DEFAULTS);
    const res = await send('/admin/price-config', 'PUT', { ...NEXT, version: cur.version });
    expect(res.status).toBe(200);
    expect(adminPriceConfigSchema.parse(await res.json()).version).toBe(cur.version + 1);
    const pub = priceConfigSchema.parse(await (await send('/public/price-config')).json());
    expect(pub.per).toEqual(NEXT.per);
    expect(listSettingsLog()[0]).toMatchObject({ tag: 'pricing', summary: 'Cập nhật bảng giá' });
  });

  it('thiếu settings.general → 403; version cũ → 409; giá bán 0 → 400', async () => {
    const cur = adminPriceConfigSchema.parse(await (await send('/admin/price-config')).json());
    const body = { ...NEXT, version: cur.version };
    expect((await send('/admin/price-config', 'PUT', body, 'mock.adm-mai')).status).toBe(403);
    expect((await send('/admin/price-config', 'PUT', { ...body, version: 99 })).status).toBe(409);
    const zero = { ...body, biz: { list: 1, y: 0 } };
    expect((await send('/admin/price-config', 'PUT', zero)).status).toBe(400);
  });
});
