import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botReplyGroupSchema } from '../../api-domains/bot-replies';
import { mockReplyScanOverview, scanMockReplyCandidates } from './bot-reply-scan';
import { chatState } from './chat-store';
import { memberSource, REPLY_NOW, replyFixture } from './tests/bot-reply-fixture';
import { writeThreadMessage } from './tests/dashboard-thread-fixture';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(REPLY_NOW);
  replyFixture();
});
afterEach(() => vi.useRealTimers());

describe('D-112 latest-N mock reply scan matches the native Chat port', () => {
  it('takes N before filtering and does not fill gaps from older human text', () => {
    memberSource('old-human');
    vi.setSystemTime(REPLY_NOW + 1);
    const recent = memberSource('recent-human');
    writeThreadMessage('recent-bot', 'recent-bot', 0, {
      createdAt: new Date(REPLY_NOW + 2).toISOString(),
    });
    expect(scanMockReplyCandidates(1)).toEqual([]);
    expect(scanMockReplyCandidates(2)[0]?.messageIds).toEqual([recent.id]);
    expect(scanMockReplyCandidates(3)[0]?.pending).toBe(2);
  });

  it('ignores hidden, attachment, system, empty, persona and non-default-room messages', () => {
    const { db } = replyFixture();
    const valid = memberSource('valid');
    const hidden = memberSource('hidden');
    const image = memberSource('image');
    const system = memberSource('system');
    const empty = memberSource('empty');
    memberSource('topic', 'c1-qa');
    writeThreadMessage('persona');
    for (const row of db.messages.get('c1-general') ?? []) {
      if (row.id === hidden.id) row.hiddenAt = new Date(REPLY_NOW).toISOString();
      if (row.id === empty.id) row.body = '';
    }
    const ext = chatState().ext;
    ext.get(image.id)!.kind = 'image';
    ext.get(system.id)!.senderId = null;
    expect(scanMockReplyCandidates(50)[0]?.messageIds).toEqual([valid.id]);
    db.groups = db.groups.filter((group) => group.id !== 'c1');
    expect(scanMockReplyCandidates(50)).toEqual([]);
  });

  it('ranks by pending count then stable group ID; snapshots candidates oldest first', () => {
    const first = memberSource('one');
    vi.setSystemTime(REPLY_NOW + 1);
    const second = memberSource('two');
    const other = memberSource('three', 'c2-general');
    const candidates = scanMockReplyCandidates(50);
    expect(candidates.map((group) => group.groupId)).toEqual(['c1', 'c2']);
    expect(candidates[0]?.messageIds).toEqual([first.id, second.id]);
    memberSource('four', 'c2-general');
    expect(scanMockReplyCandidates(50).map((group) => group.groupId)).toEqual(['c1', 'c2']);
    memberSource('five', 'c2-general');
    expect(scanMockReplyCandidates(50)[0]).toMatchObject({
      groupId: 'c2',
      pending: 3,
    });
    expect(scanMockReplyCandidates(50)[0]?.messageIds).toContain(other.id);
  });

  it('never repeats an answered source after hiding, thread GC or display pruning', () => {
    const { db, state } = replyFixture();
    const source = memberSource('answered');
    writeThreadMessage('answer', 'answer', 0, {
      kind: 'reply',
      replyToId: source.id,
      hiddenAt: new Date(REPLY_NOW).toISOString(),
    });
    for (let n = 0; n < 121; n++)
      writeThreadMessage(`later-${n}`, `later-${n}`, 0, {
        createdAt: new Date(REPLY_NOW + n + 1).toISOString(),
      });
    state.threads = [];
    state.replyTriggers.clear();
    expect(db.messages.get('c1-general')?.some((message) => message.id === 'answer')).toBe(false);
    expect(scanMockReplyCandidates(200)).toEqual([]);
  });

  it('bounds overview bodies to8 while retaining exact pending totals and assigned counts', () => {
    const { first, second, state } = replyFixture();
    second.enabled = true;
    second.groupIds = ['c2'];
    first.activeHours = '01:00 - 02:00';
    first.postsPerDay = 1;
    state.daily.set(`${first.id}:2026-10-21`, 1);
    const ids: string[] = [];
    for (let n = 0; n < 12; n++) {
      vi.setSystemTime(REPLY_NOW + n);
      ids.push(memberSource(`pending-${n}`).id);
    }
    const overview = mockReplyScanOverview(50);
    expect(overview).toMatchObject({ pendingTotal: 12, groupCount: 1 });
    const group = botReplyGroupSchema.parse(overview.groups[0]);
    expect(group.personaCount).toBe(1); // Replies ignore script hours/quota, never group assignment.
    expect(group.preview.map((row) => row.id)).toEqual(ids.slice(-8).reverse());
    first.enabled = false;
    expect(mockReplyScanOverview(50).groups[0]?.personaCount).toBe(0);
    expect(mockReplyScanOverview(50).pendingTotal).toBe(12);
  });

  it('caps displayed groups at10 without dropping totals; validates the shared sample bound', () => {
    const { db } = replyFixture();
    const source = memberSource('source');
    const stored = db.messages.get('c1-general')?.find((row) => row.id === source.id);
    const sourceExt = chatState().ext.get(source.id);
    if (!stored || !sourceExt) throw new Error('Missing source fixture');
    for (const group of db.groups.slice(0, 12)) {
      const room = db.rooms.find((row) => row.groupId === group.id && row.isDefault);
      if (!room) throw new Error('Missing default room');
      const id = `group-source-${group.id}`;
      db.messages.set(room.id, [{ ...stored, id, roomId: room.id }]);
      chatState().ext.set(id, { ...sourceExt });
    }
    expect(mockReplyScanOverview(50)).toMatchObject({ pendingTotal: 12, groupCount: 12 });
    expect(mockReplyScanOverview(50).groups).toHaveLength(10);
    for (const invalid of [0, 201, 1.5, NaN])
      expect(() => scanMockReplyCandidates(invalid)).toThrow();
  });
});
