import { readdirSync, readFileSync } from 'node:fs';
import { join, relative, resolve, sep } from 'node:path';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { apiErrorSchema } from '@opchub/shared/api';
import { AuditService } from '@/common/audit';
import { createTestApp, type TestApp } from '../setup/test-app';
import { createUser, flushAuthState } from '../factories/user.factory';
import { tokenOf } from '../factories/group.factory';
import { adminAuditManifest } from './admin-audit-manifest';
import { auditDenialCases, type AuditBranchContext } from './admin-audit-branches.cases';
import { auditRollbackCases } from './admin-audit-branches.rollback';

function controllerDomains(): Map<string, string> {
  const root = resolve('src/modules');
  const domains = new Map<string, string>();
  const walk = (directory: string): void => {
    for (const entry of readdirSync(directory, { withFileTypes: true })) {
      const file = join(directory, entry.name);
      if (entry.isDirectory()) walk(file);
      else if (entry.name.endsWith('.controller.ts')) {
        const domain = relative(root, file).split(sep)[0];
        if (!domain) throw Error(`Missing domain for ${file}`);
        for (const match of readFileSync(file, 'utf8').matchAll(/\bclass\s+(\w+Controller)\b/g)) {
          if (match[1]) domains.set(match[1], domain);
        }
      }
    }
  };
  walk(root);
  return domains;
}

describe('A12 REQ-624 every manifest domain denied write is side-effect free', () => {
  let t: TestApp;
  let context: AuditBranchContext;
  let deniedToken: string;
  let deniedId: string;
  let roleId: string;
  beforeAll(async () => {
    t = await createTestApp();
    await flushAuthState(t);
    const actor = await createUser(t, { adminPermissions: [] });
    const target = await createUser(t, { fee: 'active' });
    deniedId = actor.id;
    const role = await t.prisma.db.adminUser.findUniqueOrThrow({
      where: { id: actor.id },
      select: { roleId: true },
    });
    if (!role.roleId) throw Error('A12 factory must create an explicit Admin role');
    roleId = role.roleId;
    deniedToken = await tokenOf(t, actor);
    context = { t, targetId: target.id, targetEmail: target.email };
  });
  afterEach(() => vi.restoreAllMocks());
  afterAll(async () => {
    await t.prisma.db.adminUser.deleteMany({ where: { id: deniedId } });
    await t.prisma.db.adminRole.deleteMany({ where: { id: roleId } });
    await t.prisma.db.user.deleteMany({ where: { id: { in: [deniedId, context.targetId] } } });
    await t.close();
  });

  it('A12 covers every actual domain in the Admin audit manifest', () => {
    const domains = controllerDomains();
    const expected = new Set<string>();
    for (const route of Object.keys(adminAuditManifest)) {
      const controller = route.split('.')[0] ?? '';
      const domain = domains.get(controller);
      expect(domain, `Unmapped manifest controller ${controller}`).toBeDefined();
      if (domain) expected.add(domain);
    }
    expect([...new Set(auditDenialCases.map((c) => c.domain))].sort()).toEqual(
      [...expected].sort(),
    );
    for (const c of auditDenialCases) {
      expect(domains.get(c.controller)).toBe(c.domain);
      expect(
        Object.keys(adminAuditManifest).some((key) => key.startsWith(`${c.controller}.`)),
      ).toBe(true);
    }
  });

  it.each(auditDenialCases)('A12 denied $domain: no audit and unchanged data', async (c) => {
    const before = await c.state(context);
    const auditCount = await t.prisma.db.auditLog.count();
    const outboxCount = await t.prisma.db.outboxEvent.count();
    const log = vi.spyOn(t.app.get(AuditService), 'log');
    const response = await t.call(c.path(context), {
      method: c.method,
      token: deniedToken,
      json: c.body,
    });
    expect(response.status).toBe(403);
    expect(apiErrorSchema.parse(await response.json()).error.code).toBe('FORBIDDEN');
    expect(log).not.toHaveBeenCalled();
    expect(await t.prisma.db.auditLog.count()).toBe(auditCount);
    expect(await t.prisma.db.outboxEvent.count()).toBe(outboxCount);
    expect(await c.state(context)).toEqual(before);
  });

  it.each(auditRollbackCases)('A12 audit failure rolls back $name', async (c) => {
    const actor = await createUser(t, { systemRole: 'super_admin' });
    const fixture = await c.prepare(t, { id: actor.id, ip: null, role: 'Super Admin' });
    const before = await fixture.state();
    const auditCount = await t.prisma.db.auditLog.count();
    const outboxCount = await t.prisma.db.outboxEvent.count();
    const mailCount = await t.prisma.db.mailLog.count();
    const failure = new Error(`A12 audit unavailable: ${c.name}`);
    const log = vi
      .spyOn(t.app.get(AuditService), fixture.auditMethod ?? 'log')
      .mockRejectedValueOnce(failure);
    try {
      await expect(fixture.invoke()).rejects.toBe(failure);
      expect(log).toHaveBeenCalledTimes(1);
      expect(await fixture.state()).toEqual(before);
      expect(await t.prisma.db.auditLog.count()).toBe(auditCount);
      expect(await t.prisma.db.outboxEvent.count()).toBe(outboxCount);
      expect(await t.prisma.db.mailLog.count()).toBe(mailCount);
    } finally {
      log.mockRestore();
      await fixture.close?.();
    }
  });
});
