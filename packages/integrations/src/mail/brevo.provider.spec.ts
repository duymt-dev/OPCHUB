import { describe, expect, it } from 'vitest';
import { BrevoMailProvider } from './brevo.provider';

const fakeFetch =
  (routes: Record<string, (req: Request) => Response | Promise<Response>>): typeof fetch =>
  (input, init) => {
    const req = input instanceof Request ? input : new Request(input, init);
    const host = new URL(req.url).host;
    const r = routes[host];
    return r ? Promise.resolve(r(req)) : Promise.reject(new Error(`unknown host: ${host}`));
  };

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json' },
  });

describe('BrevoMailProvider (D-13)', () => {
  const apiKey = 'xkeysib-test-key-123';
  const defaultFrom = { name: 'Appchat', email: 'ngocmddev@mediasoft.vn' };

  it('gửi email thành công qua Brevo REST API', async () => {
    const fetchImpl = fakeFetch({
      'api.brevo.com': async (req) => {
        expect(req.headers.get('api-key')).toBe(apiKey);
        expect(req.headers.get('content-type')).toBe('application/json');
        const body = (await req.json()) as {
          sender: { name: string; email: string };
          to: { email: string }[];
          subject: string;
          htmlContent: string;
        };
        expect(body.sender).toEqual(defaultFrom);
        expect(body.to).toEqual([{ email: 'user@example.com' }]);
        expect(body.subject).toBe('Mã xác thực OTP');
        expect(body.htmlContent).toContain('123456');
        return json({ messageId: '<20261021.brevo-msg-id@smtp-relay.mailin.fr>' });
      },
    });

    const provider = new BrevoMailProvider({ apiKey, defaultFrom, fetchImpl });
    const res = await provider.send({
      to: 'user@example.com',
      subject: 'Mã xác thực OTP',
      html: '<p>123456</p>',
    });

    expect(res.messageId).toBe('<20261021.brevo-msg-id@smtp-relay.mailin.fr>');
  });

  it('verify thành công khi Brevo trả về tài khoản', async () => {
    const fetchImpl = fakeFetch({
      'api.brevo.com': (req) => {
        expect(req.headers.get('api-key')).toBe(apiKey);
        return json({ email: 'ngocmddev@mediasoft.vn', plan: [{ type: 'free' }] });
      },
    });

    const provider = new BrevoMailProvider({ apiKey, defaultFrom, fetchImpl });
    await expect(provider.verify()).resolves.toBeUndefined();
  });

  it('verify ném IntegrationError khi api-key không hợp lệ', async () => {
    const fetchImpl = fakeFetch({
      'api.brevo.com': () => json({ message: 'Key not found' }, 401),
    });

    const provider = new BrevoMailProvider({ apiKey, defaultFrom, fetchImpl });
    await expect(provider.verify()).rejects.toThrow('Không xác thực được tài khoản Brevo');
  });
});
