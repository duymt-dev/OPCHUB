import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Message } from '../../api-domains';
import { hideMockBotMessages } from './bot-emergency';
import { listChatMessages, sendChatMessage } from './chat-messages';
import { listChatRooms, roomFiles, roomPins } from './chat-ops';
import { chatState, toChatMessage } from './chat-store';
import { listMessages } from './ops-community';
import { mockDb, resetMockDb } from './store';
import type { MockResult } from './util';

const take = <T>(result: MockResult<T>) => {
  if (!result.ok) throw new Error(result.message);
  return result.data;
};
const botMessage = (id: string, roomId = 'c1-general'): Message => ({
  id,
  roomId,
  body: `Private ${id}`,
  sender: { name: 'Persona', avatarUrl: null },
  attachment: null,
  reactions: [],
  pinned: false,
  isSimulated: true,
  createdAt: '2026-10-21T05:00:00Z',
});
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  resetMockDb();
  mockDb().groupMembers.set('m1', new Map([['c1', 'member']]));
  mockDb().messages.set('c1-general', []);
});
afterEach(() => vi.useRealTimers());

describe('REQ-141 D-48 hidden mock chat boundaries', () => {
  it('filters hidden rows before pagination/search; Admin history retains original content and hidden marker', () => {
    const db = mockDb();
    const human = { ...botMessage('human'), isSimulated: false };
    db.messages.set('c1-general', [human, botMessage('bot1'), botMessage('bot2')]);
    take(hideMockBotMessages('admin', { groupIds: ['c1'] }));
    const portal = take(listChatMessages('m1', 'c1-general', undefined, undefined, 1));
    expect(portal.items.map((m) => m.id)).toEqual(['human']);
    expect(portal.nextCursor).toBeNull();
    expect(take(listChatMessages('m1', 'c1-general', 'Private bot', undefined, 50)).items).toEqual(
      [],
    );
    const admin = take(listMessages('c1-general', undefined, undefined, 50));
    expect(admin.items.find((m) => m.id === 'bot1')).toMatchObject({
      body: 'Private bot1',
      hiddenAt: new Date().toISOString(),
    });
    expect(portal.items[0]).not.toHaveProperty('isSimulated');
  });

  it('removes hidden bot previews from room lists, pins and files without altering human rows', () => {
    const bot = {
      ...botMessage('file'),
      attachment: { name: 'secret.txt', size: '1KB', ext: 'TXT' },
    };
    const human = { ...botMessage('human'), isSimulated: false, body: 'Real member' };
    mockDb().messages.set('c1-general', [human, bot]);
    const state = chatState();
    state.pins.set('c1-general', ['file', 'human']);
    expect(roomFiles('c1-general')).toHaveLength(1);
    expect(roomPins('c1-general')).toHaveLength(2);
    take(hideMockBotMessages('admin', {}));
    const rooms = take(listChatRooms('m1', 'c1'));
    expect(rooms.find((r) => r.id === 'c1-general')?.lastMessage).toMatchObject({
      text: 'Real member',
    });
    expect(roomFiles('c1-general')).toEqual([]);
    expect(roomPins('c1-general').map((p) => p.messageId)).toEqual(['human']);
  });

  it('an existing member quote loses hidden content; replies sent after hide also omit the preview', () => {
    const bot = botMessage('source');
    mockDb().messages.set('c1-general', [bot]);
    const input = {
      kind: 'text' as const,
      mentions: [],
      body: 'Member response',
      clientMsgId: 'member-quote',
      replyTo: 'source',
    };
    const before = take(sendChatMessage('m1', 'c1-general', input));
    expect(before.replyTo).toMatchObject({ name: 'Persona', text: 'Private source' });
    take(hideMockBotMessages('admin', {}));
    const after = take(listChatMessages('m1', 'c1-general', undefined, undefined, 50));
    expect(after.items.find((m) => m.id === before.id)?.replyTo).toBeNull();
    expect(
      take(sendChatMessage('m1', 'c1-general', { ...input, clientMsgId: 'second' })).replyTo,
    ).toBeNull();
    expect(after.items[0]).not.toHaveProperty('replyToId');
  });

  it('direct DTO mapping masks hidden content, attachment/reactions/pins and simulated identity', () => {
    const bot = {
      ...botMessage('hidden'),
      hiddenAt: '2026-10-21T05:00:01Z',
      reactions: [{ emoji: '👍', count: 1, names: ['m1'] }],
    };
    mockDb().messages.set('c1-general', [bot]);
    chatState().pins.set('c1-general', ['hidden']);
    const dto = toChatMessage(bot, 'm1');
    expect(dto).toMatchObject({
      body: '',
      attachment: null,
      reactions: [],
      myReactions: [],
      pinned: false,
      replyTo: null,
    });
    expect(dto).not.toHaveProperty('isSimulated');
    expect(bot.body).toBe('Private hidden');
  });
});
