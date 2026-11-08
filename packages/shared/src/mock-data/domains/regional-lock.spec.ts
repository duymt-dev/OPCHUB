import { beforeEach, expect, it } from 'vitest';
import { mockRegionalDirectors } from './regional-directors';
import { mockRegionalSystemRevoke } from './regional-lock';
import { mockRegionalMailLog } from './regional-mail';
import { setMockMemberStatus } from './member-lifecycle';
import { resetMockDb } from './store';

beforeEach(resetMockDb);
it('SPEC5/8 MSW temporary locks preserve role, indefinite locks revoke once and unlock never restores', () => {
  const director = mockRegionalDirectors(false).items.find((s) => s.member);
  const id = director?.member?.id;
  const email = director?.member?.email;
  if (!id) throw new Error('Expected regional seed director');
  expect(
    setMockMemberStatus(id, 'locked', 'admin', null, {
      until: Date.now() + 7 * 86_400_000,
      kind: 'manual',
    }).ok,
  ).toBe(true);
  expect(mockRegionalDirectors(false).items.some((s) => s.member?.id === id)).toBe(true);
  setMockMemberStatus(id, 'active');
  setMockMemberStatus(id, 'locked');
  mockRegionalSystemRevoke(id, 'locked');
  expect(mockRegionalDirectors(false).items.some((s) => s.member?.id === id)).toBe(false);
  expect(
    mockRegionalDirectors(false).history.filter((e) => e.userId === id && e.action === 'revoke'),
  ).toHaveLength(1);
  expect(mockRegionalMailLog().filter((m) => m.to === email)).toHaveLength(1);
  setMockMemberStatus(id, 'active');
  expect(mockRegionalDirectors(false).items.some((s) => s.member?.id === id)).toBe(false);
});
