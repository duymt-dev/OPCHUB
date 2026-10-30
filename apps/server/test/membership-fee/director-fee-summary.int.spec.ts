import { pageSchema } from '@opchub/shared/api';
import { feeRowSchema, feeSummarySchema } from '@opchub/shared/api-domains';
import { afterAll, beforeAll, expect, it } from 'vitest';
import { createUser, flushAuthState, loginOf, tokenBodySchema } from '../factories/user.factory';
import { createTestApp, type TestApp } from '../setup/test-app';

let t: TestApp;
const ids: string[] = [];
beforeAll(async () => {
  t = await createTestApp();
  await flushAuthState(t);
});
afterAll(async () => {
  await t.prisma.db.user.deleteMany({ where: { id: { in: ids } } });
  await t.close();
});

it('REQ-616 P9 native summary separates exemption count and status filter from paid/trial', async () => {
  const admin = await createUser(t, { systemRole: 'admin' });
  ids.push(admin.id);
  const token = tokenBodySchema.parse(await (await loginOf(t, admin)).json()).accessToken;
  const read = async () => {
    const response = await t.call('/admin/fees/summary', { token });
    expect(response.status).toBe(200);
    return feeSummarySchema.parse(await response.json());
  };
  const before = await read();
  const director = await createUser(t, { fee: 'active' });
  ids.push(director.id);
  const original = await t.prisma.db.membershipFee.findUniqueOrThrow({
    where: { userId: director.id },
    select: { validUntil: true },
  });
  // Isolate the read model fixture: lifecycle/transaction invariants have their own HTTP suite.
  await t.prisma.db.membershipFee.update({
    where: { userId: director.id },
    data: {
      status: 'regional_director',
      directorPreviousStatus: 'active',
      directorPreviousValidUntil: original.validUntil,
    },
  });
  const after = await read();
  expect(after.total).toBe(before.total + 1);
  expect(after.regional_director).toBe(before.regional_director + 1);
  expect(after.paid).toBe(before.paid);
  expect(after.trial).toBe(before.trial);
  expect(after.revenue).toBe(before.revenue);
  expect(after.total).toBe(
    after.trial +
      after.active +
      after.pending_payment +
      after.expiring +
      after.expired +
      after.regional_director,
  );
  const response = await t.call(`/admin/fees?status=regional_director&q=${director.email}`, {
    token,
  });
  expect(response.status).toBe(200);
  const page = pageSchema(feeRowSchema).parse(await response.json());
  expect(page.total).toBe(1);
  expect(page.items.map((row) => ({ id: row.userId, status: row.status }))).toEqual([
    { id: director.id, status: 'regional_director' },
  ]);
});
