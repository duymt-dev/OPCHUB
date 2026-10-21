import { createRemoteJWKSet, type JWTVerifyGetKey, jwtVerify } from 'jose';
import { z } from 'zod';
import { IntegrationError } from '../errors';
import { fetchJson, type HttpOptions } from '../http';
import {
  ssoFlowOf,
  type SsoAuthorizeRequest,
  type SsoButton,
  type SsoExchangeRequest,
  type SsoFlow,
  type SsoIdentity,
  type SsoProvider,
} from './types';

const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const TOKEN_URL = 'https://oauth2.googleapis.com/token';
const JWKS_URL = new URL('https://www.googleapis.com/oauth2/v3/certs');
const ISSUERS = ['https://accounts.google.com', 'accounts.google.com'];

const tokenSchema = z.object({ id_token: z.string().min(1) });
const claimsSchema = z.object({
  sub: z.string().min(1),
  email: z.string().email(),
  email_verified: z.literal(true),
  nonce: z.string(),
  name: z.string().optional(),
});

export interface GoogleSsoOptions extends Pick<HttpOptions, 'fetchImpl'> {
  clientId: string;
  clientSecret: string;
  /** Test: khoá ký giả; mặc định JWKS công khai của Google (jose tự cache + xoay khoá) */
  jwks?: JWTVerifyGetKey;
}

/**
 * D-64: Google OpenID Connect — authorization code + PKCE S256, xác minh `id_token`
 * (chữ ký JWKS, iss, aud, exp, nonce), chỉ nhận email đã xác minh.
 */
export class GoogleSsoProvider implements SsoProvider {
  readonly name = 'google';
  private readonly jwks: JWTVerifyGetKey;

  constructor(private readonly opts: GoogleSsoOptions) {
    this.jwks = opts.jwks ?? createRemoteJWKSet(JWKS_URL);
  }

  supports(button: SsoButton): boolean {
    return ssoFlowOf(button) === 'google';
  }

  flowOf(): SsoFlow {
    return 'google';
  }

  authorizeUrl(_flow: SsoFlow, req: SsoAuthorizeRequest): string {
    const u = new URL(AUTH_URL);
    u.search = new URLSearchParams({
      client_id: this.opts.clientId,
      redirect_uri: req.redirectUri,
      response_type: 'code',
      scope: 'openid email profile',
      state: req.state,
      nonce: req.nonce,
      code_challenge: req.codeChallenge,
      code_challenge_method: 'S256',
      prompt: 'select_account',
    }).toString();
    return u.toString();
  }

  async exchange(_flow: SsoFlow, req: SsoExchangeRequest): Promise<SsoIdentity | null> {
    const idToken = await this.token(req);
    if (!idToken) return null;
    let payload: unknown;
    try {
      ({ payload } = await jwtVerify(idToken, this.jwks, {
        issuer: ISSUERS,
        audience: this.opts.clientId,
      }));
    } catch {
      return null;
    }
    const c = claimsSchema.safeParse(payload);
    if (!c.success || c.data.nonce !== req.nonce) return null;
    const email = c.data.email.toLowerCase();
    return { subject: c.data.sub, email, fullName: c.data.name ?? email.split('@')[0] ?? email };
  }

  /** Code chỉ dùng một lần → không retry; 4xx (invalid_grant…) → null, mạng/5xx → IntegrationError */
  private async token(req: SsoExchangeRequest): Promise<string | null> {
    const body = new URLSearchParams({
      code: req.code,
      client_id: this.opts.clientId,
      client_secret: this.opts.clientSecret,
      redirect_uri: req.redirectUri,
      grant_type: 'authorization_code',
      code_verifier: req.codeVerifier,
    });
    try {
      const r = await fetchJson(TOKEN_URL, tokenSchema, {
        provider: this.name,
        retries: 0,
        ...(this.opts.fetchImpl ? { fetchImpl: this.opts.fetchImpl } : {}),
        init: {
          method: 'POST',
          headers: { 'content-type': 'application/x-www-form-urlencoded' },
          body,
        },
      });
      return r.id_token;
    } catch (err) {
      if (err instanceof IntegrationError && !err.retryable) return null;
      throw err;
    }
  }
}
