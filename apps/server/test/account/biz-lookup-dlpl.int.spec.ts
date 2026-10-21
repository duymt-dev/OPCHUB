import { ChainTaxProvider, DlplTaxProvider, FakeTaxProvider } from '@opchub/integrations';
import { createServer, type Server } from 'node:http';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { TAX_LOOKUP } from '@/common/integrations';
import { createTestApp, type TestApp } from '../setup/test-app';

/**
 * TIP-V2-118 (D-65): `GET /biz/lookup` qua chuỗi DLPL → nguồn sau, HTTP thật tới stub DLPL
 * cục bộ (không gọi mạng ngoài) + Redis test thật. Nguồn sau là FakeTaxProvider (tên "MediaSoft").
 */
type Mode = 'ok' | 'empty' | 'quota';
let mode: Mode = 'ok';
const hits: string[] = [];

const DLPL_NAME = 'CÔNG TY TNHH DLPL STUB';

function startStub(): Promise<Server> {
  const server = createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://stub');
    hits.push(req.headers.authorization ?? '');
    const send = (status: number, body: unknown) => {
      res.writeHead(status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(body));
    };
    const tax = url.searchParams.get('tax_code') ?? '';
    if (mode === 'quota') return send(429, { success: false, code: 'quota_exceeded' });
    if (mode === 'empty') return send(200, { success: true, data: [] });
    return send(200, {
      success: true,
      data: [
        {
          tax_code: tax,
          name: DLPL_NAME,
          address: 'Hà Nội',
          main_industry_code: '6201',
          industries: [
            { code: '7310', name: 'Quảng cáo' },
            { code: '6201', name: 'Lập trình máy vi tính' },
          ],
        },
      ],
    });
  });
  return new Promise((ok) => server.listen(0, '127.0.0.1', () => ok(server)));
}

/** MST 10 số chưa từng tra (tránh trùng cache giữa các lượt) */
let seq = 0;
const freshTax = () =>
  `09${String(Date.now()).slice(-6)}${String((seq += 1) % 100).padStart(2, '0')}`;

describe('biz lookup qua DLPL (TIP-V2-118, D-65)', () => {
  let t: TestApp;
  let stub: Server;

  beforeAll(async () => {
    stub = await startStub();
    const { port } = stub.address() as AddressInfo;
    const dlpl = new DlplTaxProvider({
      apiKey: 'int-test-key-0123456789',
      baseUrl: `http://127.0.0.1:${port}/v1`,
    });
    t = await createTestApp({
      overrides: [[TAX_LOOKUP, new ChainTaxProvider([dlpl, new FakeTaxProvider()])]],
    });
  });
  afterAll(async () => {
    await t.close();
    await new Promise((ok) => stub.close(ok));
  });
  beforeEach(() => {
    mode = 'ok';
    hits.length = 0;
  });

  it('D-65 DLPL trả DN → 200, ngành chính đứng đầu, representative rỗng', async () => {
    const r = await t.call(`/biz/lookup?tax=${freshTax()}`);
    expect(r.status).toBe(200);
    expect(await r.json()).toMatchObject({
      companyName: DLPL_NAME,
      representative: '',
      mainIndustry: '6201 – Lập trình máy vi tính',
      otherIndustries: ['7310 – Quảng cáo'],
    });
    expect(hits).toEqual(['Bearer int-test-key-0123456789']);
  });

  it('D-65 DLPL 429 hết lượt → lấy nguồn sau, Redis không cache "none" do lỗi DLPL', async () => {
    mode = 'quota';
    const tax = freshTax();
    const r = await t.call(`/biz/lookup?tax=${tax}`);
    expect(r.status).toBe(200);
    expect(((await r.json()) as { companyName: string }).companyName).toContain('MediaSoft');
    const cached = await t.redis.client.get(`biz:lookup:${tax}`);
    expect(cached).not.toBe('none');
    expect(hits).toHaveLength(1);
  });

  it('D-65 DLPL data rỗng → chain thử nguồn sau', async () => {
    mode = 'empty';
    const r = await t.call(`/biz/lookup?tax=${freshTax()}`);
    expect(r.status).toBe(200);
    expect(((await r.json()) as { companyName: string }).companyName).toContain('MediaSoft');
  });

  it('D-65 cả chuỗi không thấy → 404 và chỉ khi đó mới cache "none"', async () => {
    mode = 'empty';
    // FakeTaxProvider: MST đuôi 000 = không thấy
    const tax = `${freshTax().slice(0, 7)}000`;
    expect((await t.call(`/biz/lookup?tax=${tax}`)).status).toBe(404);
    expect(await t.redis.client.get(`biz:lookup:${tax}`)).toBe('none');
  });
});
