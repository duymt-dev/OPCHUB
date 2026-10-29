import type { LlmConfigModel as LlmConfig } from '@opchub/db';
import { llmConfigSchema, llmConfigVerifyResultSchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { SecretBox } from '@/common/crypto/secret-box';
import { tokenOf } from '../factories/group.factory';
import { createUser } from '../factories/user.factory';
import { llmHttpStub } from '../helpers/llm-http-stub';
import { createTestApp, type TestApp } from '../setup/test-app';

describe('REQ-607 D-99 Admin AI configuration', () => {
  let t: TestApp;
  let admin: string;
  let denied: string;
  let snapshot: LlmConfig | null;
  let stub: Awaited<ReturnType<typeof llmHttpStub>>;
  const path = '/admin/settings/llm';
  const key = 'local-test-private-key';
  const draft = () => ({
    baseUrl: stub.url,
    model: 'stub-model',
    maxTokens: 128,
    timeoutMs: 1000,
    enabled: true,
  });
  beforeAll(async () => {
    stub = await llmHttpStub();
    t = await createTestApp();
    snapshot = await t.prisma.db.llmConfig.findUnique({ where: { id: 1 } });
    await t.prisma.db.llmConfig.deleteMany();
    admin = await tokenOf(t, await createUser(t, { adminPermissions: ['settings.general'] }));
    denied = await tokenOf(t, await createUser(t, { adminPermissions: ['settings.log'] }));
  });
  afterAll(async () => {
    if (t) {
      await t.prisma.db.llmConfig.deleteMany();
      if (snapshot) await t.prisma.db.llmConfig.create({ data: snapshot });
      await t.close();
    }
    await stub?.close();
  });
  it('absent config is unconfigured; read/write/verify require settings.general', async () => {
    expect(
      llmConfigSchema.parse(await (await t.call(path, { token: admin })).json()).configured,
    ).toBe(false);
    for (const method of ['GET', 'PUT', 'POST']) {
      const r = await t.call(method === 'POST' ? `${path}/verify` : path, {
        token: denied,
        method,
        ...(method !== 'GET' ? { json: draft() } : {}),
      });
      expect(r.status).toBe(403);
    }
    expect((await t.call(path)).status).toBe(401);
    expect((await t.call(path, { method: 'PUT', token: admin, json: draft() })).status).toBe(409);
  });
  it('encrypts key, masks GET, retains omitted key, audits without secrets', async () => {
    const r = await t.call(path, { method: 'PUT', token: admin, json: { ...draft(), key } });
    expect(r.status).toBe(200);
    const result = llmConfigSchema.parse(await r.json());
    expect(result).toMatchObject({ hasKey: true, keyLast4: '-key', configured: true });
    expect(JSON.stringify(result)).not.toContain(key);
    const row = await t.prisma.db.llmConfig.findUniqueOrThrow({ where: { id: 1 } });
    expect(Buffer.from(row.keyEnc ?? []).toString('utf8')).not.toContain(key);
    expect(
      t.app
        .get(SecretBox)
        .open(row.keyEnc ?? new Uint8Array())
        .toString('utf8'),
    ).toBe(key);
    expect(
      (
        await t.call(path, {
          method: 'PUT',
          token: admin,
          json: { ...draft(), model: 'next-model' },
        })
      ).status,
    ).toBe(200);
    const kept = await t.prisma.db.llmConfig.findUniqueOrThrow({ where: { id: 1 } });
    expect(kept.keyEnc).toEqual(row.keyEnc);
    const logs = await t.prisma.db.auditLog.findMany({
      where: { action: 'llm.update' },
      select: { summary: true, diff: true },
    });
    expect(logs.length).toBeGreaterThanOrEqual(2);
    expect(JSON.stringify(logs)).not.toContain(key);
  });
  it('verifies actual HTTP using stored key and does not save draft', async () => {
    const response = await t.call(`${path}/verify`, {
      method: 'POST',
      token: admin,
      json: draft(),
    });
    expect(response.status).toBe(201);
    expect(llmConfigVerifyResultSchema.parse(await response.json()).ok).toBe(true);
    expect(stub.requests.at(-1)).toMatchObject({
      path: '/v1/chat/completions',
      authorization: `Bearer ${key}`,
    });
    expect(stub.requests.at(-1)?.body).toContain('stub-model');
    expect((await t.prisma.db.llmConfig.findUniqueOrThrow({ where: { id: 1 } })).model).toBe(
      'next-model',
    );
  });
  it.each(['unauthorized', 'malformed', 'timeout'] as const)(
    'sanitizes real provider %s',
    async (mode) => {
      stub.setMode(mode);
      const r = await t.call(`${path}/verify`, { method: 'POST', token: admin, json: draft() });
      expect(r.status).toBe(201);
      const result = llmConfigVerifyResultSchema.parse(await r.json());
      expect(result.ok).toBe(false);
      expect(JSON.stringify(result)).not.toMatch(/provider-private-detail|local-test-private-key/);
      stub.setMode('ok');
    },
  );
  it('rejects malformed input and oversized bodies before storing or calling HTTP', async () => {
    const before = stub.requests.length;
    const r = await t.call(path, {
      method: 'PUT',
      token: admin,
      json: { ...draft(), timeoutMs: 0 },
    });
    expect(r.status).toBe(400);
    expect(await r.json()).toMatchObject({
      error: { code: 'VALIDATION_ERROR', fields: [{ path: 'timeoutMs' }] },
    });
    expect(
      (
        await t.call(path, {
          method: 'PUT',
          token: admin,
          json: { ...draft(), key: 'x'.repeat(800_000) },
        })
      ).status,
    ).toBe(413);
    expect(stub.requests.length).toBe(before);
  });
});
