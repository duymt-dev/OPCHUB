import { beforeEach, expect, it } from 'vitest';
import { mockReplyRateAllows } from './bot-reply-rate';
import { REPLY_NOW, replyFixture } from './tests/bot-reply-fixture';
import { writeThreadMessage } from './tests/dashboard-thread-fixture';

beforeEach(replyFixture);
it('limits replies to12 per group per rolling minute, ignores script/auto traffic and expires exactly', () => {
  for (let i = 0; i < 30; i++) writeThreadMessage(`script-${i}`, `script-${i}`, 0);
  expect(mockReplyRateAllows('c1', REPLY_NOW)).toBe(true);
  for (let i = 0; i < 12; i++)
    writeThreadMessage(`reply-${i}`, `reply-${i}`, 0, { kind: 'reply', replyToId: `human-${i}` });
  expect(mockReplyRateAllows('c1', REPLY_NOW + 59999)).toBe(false);
  expect(mockReplyRateAllows('c2', REPLY_NOW + 59999)).toBe(true);
  expect(mockReplyRateAllows('c1', REPLY_NOW + 60000)).toBe(true);
});
it('enforces60 system-wide independently; rejecting one group does not spend another group slot', () => {
  for (let i = 0; i < 60; i++)
    writeThreadMessage(`global-${i}`, `global-${i}`, 0, {
      roomId: `c${Math.floor(i / 12) + 1}-general`,
      kind: 'reply',
      replyToId: `human-${i}`,
    });
  for (let i = 0; i < 3; i++) expect(mockReplyRateAllows('c6', REPLY_NOW + 59999)).toBe(false);
  expect(mockReplyRateAllows('c6', REPLY_NOW + 60000)).toBe(true);
  writeThreadMessage('new-window', 'new-window', 0, {
    roomId: 'c6-general',
    kind: 'reply',
    createdAt: new Date(REPLY_NOW + 60000).toISOString(),
  });
  expect(mockReplyRateAllows('c6', REPLY_NOW + 60000)).toBe(true);
});
