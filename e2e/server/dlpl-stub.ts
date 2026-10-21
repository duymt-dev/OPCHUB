import { createServer, type IncomingMessage, type ServerResponse } from 'node:http';

/**
 * Stub DLPL API cho e2e server (TIP-V2-118, D-65) — không gọi mạng thật.
 * Chạy: `node --experimental-strip-types server/dlpl-stub.ts <cổng>` (Playwright webServer, mặc định 4810).
 * MST đuôi `000` → data rỗng; `999` → 503 search_unavailable; `429` → 429 quota_exceeded;
 * còn lại → doanh nghiệp mẫu (cùng dữ liệu FakeTaxProvider để test MST cũ vẫn xanh).
 * `POST /__stub/mode {"mode":"ok"}` → mọi MST trả doanh nghiệp mẫu (test "không cache lỗi").
 */
const PORT = Number(process.argv[2] ?? 4810);
let forceOk = false;

const business = (taxCode: string) => ({
  id: taxCode,
  tax_code: taxCode,
  name: 'Công ty TNHH Giải pháp MediaSoft',
  name_short: 'MEDIASOFT',
  address: 'Tầng 5, 18 Tam Trinh, Hai Bà Trưng, Hà Nội',
  status_id: 1,
  cert_date: '2015-03-12',
  main_industry_code: '6201',
  industry_codes: ['6201', '6202', '6311', '4741', '7310'],
  industries: [
    { code: '6202', name: 'Tư vấn máy vi tính và quản trị hệ thống' },
    { code: '6201', name: 'Lập trình máy vi tính' },
    { code: '6311', name: 'Xử lý dữ liệu, cho thuê và các hoạt động liên quan' },
    { code: '4741', name: 'Bán lẻ máy vi tính, phần mềm' },
    { code: '7310', name: 'Quảng cáo' },
  ],
  updated_at: '2026-10-20T03:00:00Z',
});

function send(res: ServerResponse, status: number, body: unknown) {
  res.writeHead(status, { 'content-type': 'application/json' });
  res.end(JSON.stringify(body));
}

function businesses(url: URL, res: ServerResponse) {
  const tax = url.searchParams.get('tax_code') ?? '';
  if (!tax) return send(res, 422, { success: false, code: 'invalid_request', message: 'Thiếu' });
  if (!forceOk && tax.endsWith('999'))
    return send(res, 503, { success: false, code: 'search_unavailable', message: 'Gián đoạn' });
  if (!forceOk && tax.endsWith('429'))
    return send(res, 429, { success: false, code: 'quota_exceeded', message: 'Hết lượt' });
  const data = !forceOk && tax.endsWith('000') ? [] : [business(tax)];
  return send(res, 200, {
    success: true,
    data,
    meta: { page: 1, per_page: 1, total: data.length, has_more: false },
  });
}

function handle(req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', `http://127.0.0.1:${PORT}`);
  if (req.method === 'POST' && url.pathname === '/__stub/mode') {
    let raw = '';
    req.on('data', (c: Buffer) => (raw += c.toString()));
    req.on('end', () => {
      forceOk = raw.includes('"ok"');
      send(res, 200, { forceOk });
    });
    return;
  }
  if (url.pathname === '/__stub/health') return send(res, 200, { ok: true });
  const auth = req.headers.authorization ?? '';
  if (url.searchParams.has('api_key') || !/^Bearer \S{20,}$/.test(auth))
    return send(res, 401, { success: false, code: 'unauthorized', message: 'Thiếu key' });
  if (url.pathname === '/v1/me') return send(res, 200, { success: true, data: { plan: 'stub' } });
  if (url.pathname === '/v1/businesses') return businesses(url, res);
  return send(res, 404, { success: false, code: 'not_found', message: 'Không có' });
}

createServer(handle).listen(PORT, '127.0.0.1');
