import { isDeepStrictEqual } from 'node:util';
import { z } from 'zod';
import { adminLoginResponseSchema } from '@opchub/shared/api';
import {
  groupAdminUpsertSchema,
  groupDetailSchema,
  personaSchema,
  personaUpsertSchema,
} from '@opchub/shared/api-domains';
import { PREFIX, requireOwned, type OwnedValues } from './types';

type Domain = 'groups' | 'personas';
interface Expected {
  method: 'POST' | 'PATCH';
  path: string;
  body: unknown;
  domain: Domain;
  seen: boolean;
  done: boolean;
}
export class ValuesProtocol {
  readonly errors: string[] = [];
  readonly expected: Expected[] = [];
  private principal = false;
  private owned = new Map<Domain, string>();
  private groupId: string | null = null;
  logins = 0;
  own(value: OwnedValues) {
    requireOwned(value.group.name);
    requireOwned(value.persona.name);
    if (value.persona.enabled || !isDeepStrictEqual(value.persona.groupIds, [value.group.id]))
      throw new Error('Unsafe enabled or unrelated persona fixture');
    this.owned.set('groups', value.group.id);
    this.owned.set('personas', value.persona.id);
    this.groupId = value.group.id;
  }
  expectMutation(domain: Domain, method: 'POST' | 'PATCH', body: unknown, id?: string) {
    if (!this.principal) throw new Error('Canonical fixture requires verified administrator');
    const parsed =
      domain === 'groups' ? groupAdminUpsertSchema.parse(body) : personaUpsertSchema.parse(body);
    requireOwned(parsed.name);
    if (
      domain === 'groups' &&
      (!('kind' in parsed) || parsed.kind !== 'industry' || !parsed.industry?.startsWith(PREFIX))
    )
      throw new Error('Only owned industry groups may be changed');
    if (
      domain === 'personas' &&
      'enabled' in parsed &&
      (parsed.enabled || !this.groupId || !isDeepStrictEqual(parsed.groupIds, [this.groupId]))
    )
      throw new Error('Persona must remain disabled and confined to owned group');
    if (method === 'PATCH' ? !id || this.owned.get(domain) !== id : !!id || this.owned.has(domain))
      throw new Error('Refusing unknown/duplicate canonical fixture target');
    this.expected.push({
      domain,
      method,
      path: `/v1/admin/${domain}${id ? `/${encodeURIComponent(id)}` : ''}`,
      body: structuredClone(body),
      seen: false,
      done: false,
    });
  }
  request(method: string, path: string, body: unknown) {
    if (!path.startsWith('/v1/') || ['GET', 'HEAD', 'OPTIONS'].includes(method)) return;
    if (method === 'POST' && path === '/v1/admin/auth/refresh') return;
    if (method === 'POST' && path === '/v1/admin/auth/login') {
      const data = z
        .object({ identifier: z.literal('admin@opchub.community'), password: z.string() })
        .safeParse(body);
      if (!data.success) this.errors.push('Unapproved canonical login');
      return;
    }
    const entry = this.expected.find((e) => !e.seen && e.method === method && e.path === path);
    if (!this.principal || !entry || !isDeepStrictEqual(entry.body, body)) {
      this.errors.push(`Unapproved/noncanonical mutation ${method} ${path}`);
      return;
    }
    entry.seen = true;
  }
  response(method: string, path: string, status: number, body: unknown) {
    if (path === '/v1/admin/auth/refresh' && status === 401 && !this.principal) return;
    if (status < 200 || status >= 300) this.errors.push(`Unexpected HTTP ${status} ${path}`);
    if (path === '/v1/admin/auth/login' && status === 200) {
      const s = adminLoginResponseSchema.safeParse(body);
      this.principal =
        s.success && s.data.admin.email === 'admin@opchub.community' && s.data.admin.isSuperAdmin;
      if (!this.principal) this.errors.push('Unverified fixture administrator');
      this.logins++;
    }
    const entry = this.expected.find(
      (e) => e.seen && !e.done && e.method === method && e.path === path,
    );
    if (!entry) return;
    const dto =
      entry.domain === 'groups' ? groupDetailSchema.safeParse(body) : personaSchema.safeParse(body);
    const projection = entry.domain === 'groups' ? groupAdminUpsertSchema : personaUpsertSchema;
    const projected = dto.success ? projection.safeParse(dto.data) : null;
    if (
      !dto.success ||
      !projected?.success ||
      !isDeepStrictEqual(projected.data, projection.parse(entry.body))
    ) {
      this.errors.push('Saved canonical DTO differs from exact approved body');
      return;
    }
    if (entry.method === 'POST') {
      this.owned.set(entry.domain, dto.data.id);
      if (entry.domain === 'groups') this.groupId = dto.data.id;
    } else if (this.owned.get(entry.domain) !== dto.data.id)
      this.errors.push('Saved fixture ID changed');
    entry.done = true;
  }
}
