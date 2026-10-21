import type { TestApp } from '../setup/test-app';

/** Bắt đầu OAuth như trình duyệt (FakeSsoProvider): lấy `state` từ Location + cookie `opchub_sso` */
export async function ssoStart(
  t: TestApp,
  button: string,
): Promise<{ res: Response; state: string; flow: string; cookie: string }> {
  const res = await t.call(`/auth/sso/${button}`, { redirect: 'manual' });
  const loc = new URL(res.headers.get('location') ?? 'http://invalid/');
  const cookie = res.headers.getSetCookie().find((c) => c.startsWith('opchub_sso=')) ?? '';
  return {
    res,
    state: loc.searchParams.get('state') ?? '',
    flow: loc.pathname.split('/').pop() ?? '',
    cookie: cookie.split(';')[0] ?? '',
  };
}

/** Callback với state hợp lệ — `code` dạng email để FakeSsoProvider trả danh tính email đó */
export function ssoCallbackPath(flow: string, code: string, state: string): string {
  return `/auth/sso/${flow}/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`;
}

/** Luồng đầy đủ: bấm nút `button` rồi quay về callback với `code` */
export async function ssoLogin(t: TestApp, button: string, code: string): Promise<Response> {
  const s = await ssoStart(t, button);
  return t.call(ssoCallbackPath(s.flow, code, s.state), { headers: { cookie: s.cookie } });
}
