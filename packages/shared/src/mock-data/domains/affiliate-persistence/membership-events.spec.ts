import { beforeEach, expect, it } from 'vitest';
import { resetMockDb } from '../store';
import { feeAction } from '../ops-admin';
import { captureMockAffiliateSnapshot } from './snapshot';
import { AFFILIATE_BRIDGE_CHANNEL } from './protocol';
import { membershipChanged } from './membership-events';

const origin = 'http://localhost:3240';
const wire = () => JSON.stringify(captureMockAffiliateSnapshot());
const event = () => {
  const oldValue = wire();
  feeAction('m6', 'collect', Date.parse('2026-10-21T08:00:00Z'));
  return {
    key: `${AFFILIATE_BRIDGE_CHANNEL}:base`,
    url: `${origin}/mock-affiliate-state`,
    oldValue,
    newValue: wire(),
  };
};
beforeEach(() => resetMockDb());

it('AT-LK02 REQ-402 hints only for the changed member, not unrelated reads or accounts', () => {
  const changed = event();
  expect(membershipChanged(changed, origin, 'base', 'm6')).toBe(true);
  expect(membershipChanged(changed, origin, 'base', 'm1')).toBe(false);
  expect(membershipChanged({ ...changed, oldValue: changed.newValue }, origin, 'base', 'm6')).toBe(
    false,
  );
});

it.each([
  { key: 'unrelated' },
  { key: `${AFFILIATE_BRIDGE_CHANNEL}:affiliate` },
  { url: 'http://localhost:3242/mock-affiliate-state' },
  { url: `${origin}/other` },
  { url: `${origin}/mock-affiliate-state?spoof=1` },
  { url: `${origin}/mock-affiliate-state#spoof` },
  { newValue: '{broken' },
  { oldValue: '{broken' },
  { newValue: null },
])('AT-LK02 rejects invalid or unrelated hint %j', (patch) => {
  expect(membershipChanged({ ...event(), ...patch }, origin, 'base', 'm6')).toBe(false);
});
