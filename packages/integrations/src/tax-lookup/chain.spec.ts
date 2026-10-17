import { describe, expect, it } from 'vitest';
import { ChainTaxProvider } from './chain';
import { EsgooTaxProvider } from './esgoo.provider';
import { VietqrTaxProvider } from './vietqr.provider';

/** fetch giả theo host — không gọi mạng thật trong test */
const fakeFetch =
  (routes: Record<string, () => Response>): typeof fetch =>
  (input) => {
    const url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    const host = new URL(url).host;
    const r = routes[host];
    return r ? Promise.resolve(r()) : Promise.reject(new Error('network'));
  };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

describe('ChainTaxProvider (D-17)', () => {
  it('ESGOO lỗi 500 → dùng VietQR', async () => {
    const fetchImpl = fakeFetch({
      'esgoo.net': () => json({}, 500),
      'api.vietqr.io': () =>
        json({ code: '00', data: { id: '0101234567', name: 'CTY A', address: 'HN' } }),
    });
    const chain = new ChainTaxProvider([
      new EsgooTaxProvider({ fetchImpl }),
      new VietqrTaxProvider({ fetchImpl }),
    ]);
    expect((await chain.lookup('0101234567'))?.name).toBe('CTY A');
  });

  it('ESGOO thành công → không gọi VietQR', async () => {
    let vietqrCalled = false;
    const fetchImpl = fakeFetch({
      'esgoo.net': () =>
        json({ error: 0, data: { ten: 'CTY B', dia_chi: 'HCM', nganh_nghe: ['6201'] } }),
      'api.vietqr.io': () => {
        vietqrCalled = true;
        return json({ code: '00', data: null });
      },
    });
    const chain = new ChainTaxProvider([
      new EsgooTaxProvider({ fetchImpl }),
      new VietqrTaxProvider({ fetchImpl }),
    ]);
    const r = await chain.lookup('0101234567');
    expect(r?.industries).toEqual(['6201']);
    expect(vietqrCalled).toBe(false);
  });

  it('cả hai lỗi / dữ liệu lạ → null, gọi onError', async () => {
    const errors: string[] = [];
    const fetchImpl = fakeFetch({
      'esgoo.net': () => json({ unexpected: true }),
      'api.vietqr.io': () => json({}, 503),
    });
    const chain = new ChainTaxProvider(
      [new EsgooTaxProvider({ fetchImpl }), new VietqrTaxProvider({ fetchImpl })],
      (p) => errors.push(p),
    );
    expect(await chain.lookup('0101234567')).toBeNull();
    expect(errors).toEqual(['esgoo', 'vietqr']);
  });
});
