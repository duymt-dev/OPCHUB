import { describe, expect, it } from 'vitest';
import { IntegrationError } from '../errors';
import fixture from './__fixtures__/dlpl-businesses.json';
import { ChainTaxProvider } from './chain';
import { DlplTaxProvider } from './dlpl.provider';
import { EsgooTaxProvider } from './esgoo.provider';

const KEY = 'test-key-0123456789abcdef';
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

interface Call {
  url: string;
  headers: Headers;
}
/** fetch giả — ghi lại request, không gọi mạng thật */
function stub(reply: (url: URL) => Response) {
  const calls: Call[] = [];
  const fetchImpl: typeof fetch = (input, init) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    calls.push({ url, headers: new Headers(init?.headers) });
    return Promise.resolve(reply(new URL(url)));
  };
  return { calls, fetchImpl };
}

describe('DlplTaxProvider (D-65)', () => {
  it('D-65 map fixture thật → TaxInfo, ngành chính đứng đầu, representative null', async () => {
    const { fetchImpl } = stub(() => json(fixture));
    const r = await new DlplTaxProvider({ apiKey: KEY, fetchImpl }).lookup('0101234567');
    expect(r).toEqual({
      taxCode: '0101234567',
      name: 'CÔNG TY TNHH GIẢI PHÁP MEDIASOFT',
      address: 'Tầng 5, 18 Tam Trinh, Phường Vĩnh Tuy, Thành phố Hà Nội',
      representative: null,
      industries: [
        '6201 – Lập trình máy vi tính',
        '6202 – Tư vấn máy vi tính và quản trị hệ thống máy vi tính',
        '6311 – Xử lý dữ liệu, cho thuê và các hoạt động liên quan',
      ],
      status: null,
    });
  });

  it('D-65 gửi Authorization Bearer, không có key trong URL', async () => {
    const { calls, fetchImpl } = stub(() => json(fixture));
    await new DlplTaxProvider({ apiKey: KEY, baseUrl: 'http://stub/v1/', fetchImpl }).lookup(
      '0101234567',
    );
    expect(calls).toHaveLength(1);
    const [c] = calls;
    expect(c?.url).toBe('http://stub/v1/businesses?tax_code=0101234567&per_page=1');
    expect(c?.url).not.toContain(KEY);
    expect(c?.headers.get('authorization')).toBe(`Bearer ${KEY}`);
  });

  it('D-65 ngành dạng chuỗi hoặc chỉ có industry_codes vẫn đưa ngành chính lên đầu', async () => {
    const { fetchImpl } = stub(() =>
      json({
        success: true,
        data: [
          {
            tax_code: '0109999991',
            name: 'CTY B',
            address: null,
            main_industry_code: '7310',
            industry_codes: ['4741', '7310'],
          },
        ],
      }),
    );
    const r = await new DlplTaxProvider({ apiKey: KEY, fetchImpl }).lookup('0109999991');
    expect(r?.industries).toEqual(['7310', '4741']);
    expect(r?.address).toBe('');
  });

  it('D-65 data rỗng → null', async () => {
    const { fetchImpl } = stub(() => json({ success: true, data: [], meta: { total: 0 } }));
    expect(await new DlplTaxProvider({ apiKey: KEY, fetchImpl }).lookup('0101234000')).toBeNull();
  });

  it('D-65 429 quota_exceeded → ném IntegrationError (không trả null)', async () => {
    const { calls, fetchImpl } = stub(() =>
      json({ success: false, code: 'quota_exceeded', message: 'Hết lượt' }, 429),
    );
    const p = new DlplTaxProvider({ apiKey: KEY, fetchImpl }).lookup('0101234429');
    await expect(p).rejects.toBeInstanceOf(IntegrationError);
    await expect(p).rejects.not.toThrow(KEY);
    // 4xx không retry → không đốt thêm lượt
    expect(calls).toHaveLength(1);
  });

  it('D-65 chain: DLPL 403 → dùng ESGOO', async () => {
    const { fetchImpl } = stub((u) =>
      u.host === 'esgoo.net'
        ? json({ error: 0, data: { ten: 'CTY ESGOO', dia_chi: 'HN' } })
        : json({ success: false, code: 'plan_required' }, 403),
    );
    const errors: string[] = [];
    const chain = new ChainTaxProvider(
      [new DlplTaxProvider({ apiKey: KEY, fetchImpl }), new EsgooTaxProvider({ fetchImpl })],
      (p) => errors.push(p),
    );
    expect((await chain.lookup('0101234567'))?.name).toBe('CTY ESGOO');
    expect(errors).toEqual(['dlpl']);
  });
});
