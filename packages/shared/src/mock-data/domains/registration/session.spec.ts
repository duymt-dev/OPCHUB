import { beforeEach, expect, it } from 'vitest';
import { beginMockRegistration, activateMockRegistration } from './commands';
import { registeredMockSession } from './session';
import { captureCommunitySnapshot } from '../community-persistence/snapshot';
import { mockDb, resetMockDb } from '../store';
import { myMembership } from '../ops-admin';

beforeEach(() => resetMockDb());
it('UAT-08 REQ-409 allocated member code and submitted phone match the actual transfer/session', () => {
  const email = 'fee-created@example.test';
  beginMockRegistration('personal', {
    email,
    fullName: 'Fresh Fee',
    password: 'SyntheticExample42!',
    phone: { country: 'vn', number: '0912345678' },
    persona: 'expert',
    groupIds: ['c1'],
    agreeTerms: true,
  });
  const me = activateMockRegistration(email);
  if (!me) throw new Error('Expected registration');
  const fee = mockDb().fees.find((row) => row.userId === me.id);
  expect(me.membershipFee?.transferRef).toMatch(/^OPCHUB TV\d{6}$/);
  expect(me.membershipFee?.transferRef).toBe(`OPCHUB ${fee?.memberCode}`);
  expect(myMembership(me.id)).toMatchObject({
    ok: true,
    data: { transferContent: `OPCHUB ${fee?.memberCode} 0912345678` },
  });
  expect(registeredMockSession(email)).toEqual(me);
  expect(JSON.stringify(captureCommunitySnapshot())).not.toMatch(
    /SyntheticExample42|verifier|salt|password/,
  );
});

it('REQ-401 login session uses current fee and account status, not a stale activation copy', () => {
  const email = 'current-created@example.test';
  beginMockRegistration('personal', {
    email,
    fullName: 'Current Fee',
    password: '',
    phone: { country: 'vn', number: '' },
    persona: 'expert',
    groupIds: ['c1'],
    agreeTerms: true,
  });
  const me = activateMockRegistration(email);
  if (!me) throw new Error('Expected registration');
  const fee = mockDb().fees.find((row) => row.userId === me.id);
  if (!fee) throw new Error('Expected fee');
  fee.status = 'active';
  fee.validUntil = '2027-10-21T00:00:00Z';
  mockDb().userStatus.set(me.id, 'locked');
  expect(registeredMockSession(email)).toMatchObject({
    status: 'locked',
    membershipFee: { status: 'active', validUntil: fee.validUntil },
  });
  expect(registeredMockSession('unknown@example.test')).toBeUndefined();
});
