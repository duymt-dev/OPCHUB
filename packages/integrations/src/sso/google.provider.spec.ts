import { createLocalJWKSet, exportJWK, generateKeyPair, type JWTVerifyGetKey, SignJWT } from 'jose';
import { beforeAll, describe, expect, it } from 'vitest';
import { IntegrationError } from '../errors';
import { GoogleSsoProvider } from './google.provider';

const CLIENT_ID = 'client-123.apps.googleusercontent.com';
const REDIRECT = 'https://opchub.test/sso/callback/google';
const NONCE = 'nonce-abc';

let privateKey: Awaited<ReturnType<typeof generateKeyPair>>['privateKey'];
let jwks: JWTVerifyGetKey;

beforeAll(async () => {
  const pair = await generateKeyPair('RS256');
  privateKey = pair.privateKey;
  const jwk = { ...(await exportJWK(pair.publicKey)), kid: 'k1', alg: 'RS256' };
  jwks = createLocalJWKSet({ keys: [jwk] });
});

interface Claims {
  iss?: string;
  aud?: string;
  exp?: number;
  [k: string]: unknown;
}

const idToken = ({
  iss = 'https://accounts.google.com',
  aud = CLIENT_ID,
  exp,
  ...rest
}: Claims = {}) =>
  new SignJWT({
    sub: 'g-sub-1',
    email: 'An.Nguyen@Gmail.com',
    email_verified: true,
    nonce: NONCE,
    name: 'An Nguyễn',
    ...rest,
  })
    .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
    .setIssuer(iss)
    .setAudience(aud)
    .setIssuedAt()
    .setExpirationTime(exp ?? '5m')
    .sign(privateKey);

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

/** Ghi lại request token để kiểm body; trả response cho trước */
function tokenEndpoint(respond: () => Response | Promise<Response>) {
  const seen: { url?: string; body?: URLSearchParams } = {};
  const fetchImpl: typeof fetch = (input, init) => {
    seen.url = typeof input === 'string' ? input : input instanceof URL ? input.href : input.url;
    if (init?.body instanceof URLSearchParams) seen.body = init.body;
    return Promise.resolve(respond());
  };
  return { seen, fetchImpl };
}

const exchangeReq = {
  code: 'auth-code',
  redirectUri: REDIRECT,
  codeVerifier: 'verifier-xyz',
  nonce: NONCE,
};

async function exchangeWith(token: string | Promise<string>) {
  const t = await token;
  const ep = tokenEndpoint(() => json({ id_token: t, access_token: 'x', expires_in: 3600 }));
  const p = new GoogleSsoProvider({
    clientId: CLIENT_ID,
    clientSecret: 's3cret',
    jwks,
    fetchImpl: ep.fetchImpl,
  });
  return { result: await p.exchange('google', exchangeReq), seen: ep.seen };
}

describe('GoogleSsoProvider (D-64, TIP-V2-116)', () => {
  it('authorizeUrl: code + PKCE S256 + state + nonce + redirect_uri', () => {
    const p = new GoogleSsoProvider({ clientId: CLIENT_ID, clientSecret: 's', jwks });
    const u = new URL(
      p.authorizeUrl('google', {
        redirectUri: REDIRECT,
        state: 'st',
        nonce: NONCE,
        codeChallenge: 'cc',
      }),
    );
    expect(u.origin + u.pathname).toBe('https://accounts.google.com/o/oauth2/v2/auth');
    expect(Object.fromEntries(u.searchParams)).toMatchObject({
      client_id: CLIENT_ID,
      redirect_uri: REDIRECT,
      response_type: 'code',
      scope: 'openid email profile',
      state: 'st',
      nonce: NONCE,
      code_challenge: 'cc',
      code_challenge_method: 'S256',
    });
  });

  it('supports: google + chatgpt/gemini/deepseek; không facebook/linkedin', () => {
    const p = new GoogleSsoProvider({ clientId: CLIENT_ID, clientSecret: 's', jwks });
    expect(['google', 'chatgpt', 'gemini', 'deepseek'].every((b) => p.supports(b as never))).toBe(
      true,
    );
    expect(p.supports('facebook')).toBe(false);
    expect(p.supports('linkedin')).toBe(false);
  });

  it('id_token hợp lệ → danh tính theo sub, email thường; body gửi code_verifier + redirect_uri', async () => {
    const { result, seen } = await exchangeWith(idToken());
    expect(result).toEqual({
      subject: 'g-sub-1',
      email: 'an.nguyen@gmail.com',
      fullName: 'An Nguyễn',
    });
    expect(seen.url).toBe('https://oauth2.googleapis.com/token');
    expect(seen.body?.get('code_verifier')).toBe('verifier-xyz');
    expect(seen.body?.get('redirect_uri')).toBe(REDIRECT);
    expect(seen.body?.get('grant_type')).toBe('authorization_code');
    expect(seen.body?.get('code')).toBe('auth-code');
  });

  it('iss dạng không https vẫn hợp lệ', async () => {
    expect((await exchangeWith(idToken({ iss: 'accounts.google.com' }))).result?.subject).toBe(
      'g-sub-1',
    );
  });

  it.each([
    ['sai aud', { aud: 'other-client' }],
    ['sai iss', { iss: 'https://evil.example' }],
    ['sai nonce', { nonce: 'replayed' }],
    ['hết hạn', { exp: Math.floor(Date.now() / 1000) - 60 }],
    ['email chưa xác minh', { email_verified: false }],
  ])('%s → null', async (_name, claims) => {
    expect((await exchangeWith(idToken(claims))).result).toBeNull();
  });

  it('chữ ký bằng khoá lạ → null', async () => {
    const other = await generateKeyPair('RS256');
    const forged = await new SignJWT({
      sub: 'x',
      email: 'a@b.c',
      email_verified: true,
      nonce: NONCE,
    })
      .setProtectedHeader({ alg: 'RS256', kid: 'k1' })
      .setIssuer('https://accounts.google.com')
      .setAudience(CLIENT_ID)
      .setExpirationTime('5m')
      .sign(other.privateKey);
    expect((await exchangeWith(forged)).result).toBeNull();
  });

  it('token endpoint 400 (invalid_grant) → null', async () => {
    const ep = tokenEndpoint(() => json({ error: 'invalid_grant' }, 400));
    const p = new GoogleSsoProvider({
      clientId: CLIENT_ID,
      clientSecret: 's',
      jwks,
      fetchImpl: ep.fetchImpl,
    });
    expect(await p.exchange('google', exchangeReq)).toBeNull();
  });

  it('token endpoint 500 → IntegrationError retryable, không thử lại (code dùng một lần)', async () => {
    let calls = 0;
    const ep = tokenEndpoint(() => {
      calls += 1;
      return json({}, 500);
    });
    const p = new GoogleSsoProvider({
      clientId: CLIENT_ID,
      clientSecret: 's',
      jwks,
      fetchImpl: ep.fetchImpl,
    });
    const err = await p.exchange('google', exchangeReq).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(IntegrationError);
    expect((err as IntegrationError).retryable).toBe(true);
    expect(calls).toBe(1);
  });
});
