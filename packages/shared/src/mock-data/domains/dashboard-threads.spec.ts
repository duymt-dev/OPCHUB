import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { chatMessageSchema, dashboardLiveSchema } from '../../api-domains';
import { hideMockBotMessages } from './bot-emergency';
import { advanceMockBot, botState, runBotScript } from './bot-execution';
import { listChatMessages, sendChatMessage } from './chat-messages';
import { dashboardLive } from './dashboard';
import { mockDashboardThreads } from './dashboard-threads';
import { mockDb, resetMockDb } from './store';
import { seedManualMockBotScenario } from './bot-demo-scenario';
import { emptyBotHistory, THREAD_TIME, writeThreadMessage } from './tests/dashboard-thread-fixture';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(THREAD_TIME));
  emptyBotHistory();
  seedManualMockBotScenario();
});
afterEach(() => vi.useRealTimers());

describe('UAT-15 LK-11 REQ-411 message-backed MSW Dashboard', () => {
  it('D-89: no seeded bot history in rooms; feed only reflects stored opening messages', () => {
    resetMockDb();
    const db = mockDb();
    expect(db.botMessageMeta.size).toBe(0);
    expect(dashboardLiveSchema.parse(dashboardLive()).threads).toEqual([]);
    expect(botState().threads).toHaveLength(3);
  });

  it('actual mock script ticks persist unique per-room messages and update the feed after each due turn', () => {
    const db = mockDb();
    const script = db.scripts[0];
    if (!script) throw new Error('Missing script');
    script.groupIds = ['c1', 'c2'];
    for (const persona of db.personas) {
      persona.groupIds = ['c1', 'c2'];
      persona.enabled = true;
      persona.activeHours = '00:00 - 24:00';
      persona.postsPerDay = 120;
    }
    const run = runBotScript(script.id);
    if (!run.ok) throw new Error(run.message);
    expect(mockDashboardThreads()).toEqual([]);
    advanceMockBot();
    const first = mockDashboardThreads();
    expect(first).toHaveLength(2);
    expect(new Set(first.map((row) => row.id)).size).toBe(2);
    expect(first.map((row) => row.groupId).sort()).toEqual(['c1', 'c2']);
    expect(first.every((row) => row.replyCount === 0)).toBe(true);
    const nextAt = botState().threads[0]?.nextAt;
    if (nextAt === null || nextAt === undefined) throw new Error('No next turn');
    advanceMockBot(nextAt);
    expect(mockDashboardThreads().every((row) => row.replyCount === 1)).toBe(true);
    expect(mockDashboardThreads().map((row) => row.id)).toEqual(first.map((row) => row.id));
  });

  it('first successful turn opens once per room, even after skipped turns', () => {
    writeThreadMessage('room1-turn2', 'execution', 2);
    writeThreadMessage('room1-turn3', 'execution', 3);
    writeThreadMessage('room2-turn3', 'execution', 3, { roomId: 'c2-general' });
    const feed = mockDashboardThreads();
    expect(feed.map((row) => row.id)).toEqual(['room2-turn3', 'room1-turn2']);
    expect(feed.find((row) => row.id === 'room1-turn2')?.replyCount).toBe(1);
    expect(feed.find((row) => row.id === 'room2-turn3')?.replyCount).toBe(0);
  });

  it('a skipped actual script turn cannot create a card before the first successful publication', () => {
    const db = mockDb();
    const script = db.scripts[0];
    const first = db.personas[0];
    const second = db.personas[1];
    if (!script || !first || !second) throw new Error('Missing script/personas');
    for (const other of db.scripts) other.enabled = other.id === script.id;
    script.groupIds = ['c1'];
    script.lines = [
      { personaId: first.id, body: 'Must skip' },
      { personaId: second.id, body: 'First posted turn' },
    ];
    first.enabled = false;
    second.enabled = true;
    second.groupIds = ['c1'];
    second.activeHours = '00:00 - 24:00';
    second.postsPerDay = 120;
    const run = runBotScript(script.id);
    if (!run.ok) throw new Error(run.message);
    advanceMockBot();
    expect(mockDashboardThreads()).toEqual([]);
    const next = botState().threads[0]?.nextAt;
    if (next === null || next === undefined) throw new Error('Missing next turn');
    advanceMockBot(next);
    const feed = mockDashboardThreads();
    expect(feed).toHaveLength(1);
    expect(feed[0]?.body).toBe('First posted turn');
    expect(db.botMessageMeta.get(feed[0]?.id ?? '')).toMatchObject({ turn: 1, opening: true });
  });

  it('hiding/deleting an opener never promotes a later turn, including a new post after global hide', () => {
    writeThreadMessage('opening', 'execution', 0);
    writeThreadMessage('response', 'execution', 1);
    expect(mockDashboardThreads()).toHaveLength(1);
    hideMockBotMessages('admin', {});
    expect(mockDashboardThreads()).toEqual([]);
    writeThreadMessage('late', 'execution', 2);
    expect(mockDashboardThreads()).toEqual([]);
    const db = mockDb();
    db.messages.set(
      'c1-general',
      (db.messages.get('c1-general') ?? []).filter((m) => m.id !== 'opening'),
    );
    writeThreadMessage('later', 'execution', 3);
    expect(mockDashboardThreads()).toEqual([]);
  });

  it('execution turns and direct member/bot replies are counted once with earliest visible preview', () => {
    const db = mockDb();
    writeThreadMessage('opening', 'execution', 0);
    writeThreadMessage('bot-response', 'execution', 1, {
      replyToId: 'opening',
      createdAt: '2026-10-21T05:01:00Z',
    });
    db.groupMembers.set('m1', new Map([['c1', 'member']]));
    vi.setSystemTime(new Date('2026-10-21T05:02:00Z'));
    const sent = sendChatMessage('m1', 'c1-general', {
      clientMsgId: 'member-reply',
      kind: 'text',
      body: 'Member response',
      mentions: [],
      replyTo: 'opening',
    });
    if (!sent.ok) throw new Error(sent.message);
    expect(mockDashboardThreads()[0]).toMatchObject({
      replyCount: 2,
      reply: { body: 'Content bot-response' },
    });
    const response = db.messages.get('c1-general')?.find((m) => m.id === 'bot-response');
    if (!response) throw new Error('Missing response');
    response.hiddenAt = new Date().toISOString();
    expect(mockDashboardThreads()[0]).toMatchObject({
      replyCount: 1,
      reply: { body: 'Member response' },
    });
  });

  it('thread GC and persona deletion preserve content using the native neutral identity fallback', () => {
    const db = mockDb();
    writeThreadMessage('opening', 'execution');
    const personaId = db.botMessageMeta.get('opening')?.personaId;
    db.personas = db.personas.filter((p) => p.id !== personaId);
    botState().threads = [];
    expect(mockDashboardThreads()[0]).toMatchObject({
      id: 'opening',
      body: 'Content opening',
      author: { name: 'Thành viên', role: '', color: '#1677FF' },
    });
  });

  it('filters hidden/topic/deleted-group rows before latest50 and pages tied timestamps by ID', () => {
    const db = mockDb();
    const room = db.rooms.find((r) => r.id === 'c1-general');
    if (!room) throw new Error('Missing room');
    db.rooms.push({ ...room, id: 'gone-general', groupId: 'gone' });
    for (let n = 0; n < 70; n++) writeThreadMessage(`visible-${String(n).padStart(3, '0')}`);
    for (let n = 0; n < 10; n++) {
      writeThreadMessage(`newer-hidden-${n}`, `hidden-${n}`, 0, {
        hiddenAt: THREAD_TIME,
        createdAt: '2026-10-21T06:00:00Z',
      });
      writeThreadMessage(`newer-topic-${n}`, `topic-${n}`, 0, {
        roomId: 'c1-qa',
        createdAt: '2026-10-21T06:00:00Z',
      });
      writeThreadMessage(`newer-gone-${n}`, `gone-${n}`, 0, {
        roomId: 'gone-general',
        createdAt: '2026-10-21T06:00:00Z',
      });
    }
    const first = mockDashboardThreads();
    expect(first.map((row) => row.id)).toEqual(
      Array.from({ length: 50 }, (_, i) => `visible-${String(69 - i).padStart(3, '0')}`),
    );
    const last = first.at(-1);
    if (!last) throw new Error('Missing cursor');
    const second = mockDashboardThreads({ at: last.at, id: last.id });
    expect(second.map((row) => row.id)).toEqual(
      Array.from({ length: 20 }, (_, i) => `visible-${String(19 - i).padStart(3, '0')}`),
    );
  });

  it('keeps private execution identity out of Portal DTOs', () => {
    const db = mockDb();
    db.groupMembers.set('m1', new Map([['c1', 'member']]));
    writeThreadMessage('opening', 'execution', 0, { kind: 'auto' });
    const page = listChatMessages('m1', 'c1-general', undefined, undefined, 50);
    if (!page.ok) throw new Error(page.message);
    expect(page.data.items).toHaveLength(1);
    expect(() => chatMessageSchema.strict().parse(page.data.items[0])).not.toThrow();
    expect(page.data.items[0]).not.toHaveProperty('threadId');
    expect(page.data.items[0]).not.toHaveProperty('opening');
    expect(page.data.items[0]).not.toHaveProperty('isSimulated');
  });
});
