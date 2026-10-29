import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { advanceMockBot, botState } from '../bot-execution';
import { admitMockBotReply } from '../bot-reply-admission';
import { advanceMockReplies } from '../bot-reply-worker';
import { mockDb, resetMockDb } from '../store';
import { mockDashboardThreads } from '../dashboard-threads';
import { listChatMessages } from '../chat-messages';
import { hideMockBotMessages } from '../bot-emergency';
import { seedManualMockBotScenario } from '../bot-demo-scenario';
import { AUTO_NOW, autoFixture } from '../tests/bot-auto-fixture';
import { memberSource, replyFixture, replyThread } from '../tests/bot-reply-fixture';
import { captureCommunitySnapshot, restoreCommunitySnapshot } from './snapshot';

const wire = () => JSON.parse(JSON.stringify(captureCommunitySnapshot())) as unknown;
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(AUTO_NOW);
  vi.spyOn(Math, 'random').mockReturnValue(0);
});
afterEach(() => {
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('REQ-208 REQ-411 bot/chat persisted runtime boundary (not browser transport proof)', () => {
  it('D-112 rejects zero-minute automatic/script snapshots, unlike reply N/A timing', () => {
    autoFixture(2);
    advanceMockBot(AUTO_NOW);
    const thread = botState().threads[0];
    if (!thread) throw new Error('Missing automatic conversation');
    thread.snapshot.delayMinutes = 0;
    expect(() => wire()).toThrow();
    thread.snapshot.delayMinutes = 6;
    expect(() => wire()).not.toThrow();
  });
  it('restores actual publication, Dashboard identity and per-turn idempotency in a fresh runtime', () => {
    autoFixture(2);
    advanceMockBot(AUTO_NOW);
    const before = captureCommunitySnapshot();
    const thread = botState().threads[0];
    const opening = mockDashboardThreads()[0];
    if (!thread || !opening) throw new Error('Missing publication control');
    resetMockDb();
    restoreCommunitySnapshot(JSON.parse(JSON.stringify(before)) as unknown);
    expect(captureCommunitySnapshot()).toEqual(before);
    expect(mockDashboardThreads()[0]).toEqual(opening);
    advanceMockBot(AUTO_NOW);
    expect(mockDb().botMessageMeta.size).toBe(1);
    advanceMockBot(AUTO_NOW + 60000);
    expect(botState().threads[0]?.cursor).toBe(2);
    expect(mockDb().botMessageMeta.size).toBe(2);
    expect(mockDashboardThreads()[0]?.replyCount).toBe(1);
  });

  it('keeps a pending real-member reply/quote and cooldown through a fresh runtime without double posting', () => {
    replyFixture();
    mockDb().botSettings.enabled = true;
    mockDb().botSettings.autoGenerate = false;
    mockDb().botSettings.replyToMembers = true;
    const source = memberSource('persisted-trigger');
    const id = admitMockBotReply(source.id, AUTO_NOW, () => 0);
    const nextAt = replyThread().nextAt;
    expect(id).toBeTruthy();
    if (nextAt === null) throw new Error('Missing due deadline');
    const snapshot = wire();
    resetMockDb();
    restoreCommunitySnapshot(snapshot);
    expect(admitMockBotReply(source.id, AUTO_NOW, () => 0)).toBe(id);
    advanceMockReplies(nextAt);
    const messages = listChatMessages('m1', 'c1-general', undefined, undefined, 50);
    if (!messages.ok) throw new Error(messages.message);
    const reply = messages.data.items.find((message) => message.replyTo?.text === source.body);
    expect(reply?.replyTo?.name).toBe(source.sender.name);
    expect(reply).not.toHaveProperty('isSimulated');
    expect(mockDb().botMessageMeta.size).toBe(1);
    const posted = wire();
    resetMockDb();
    restoreCommunitySnapshot(posted);
    advanceMockReplies(nextAt);
    expect(mockDb().botMessageMeta.size).toBe(1);
  });

  it('restores hidden content for Admin without resurrecting it in Dashboard/Portal', () => {
    autoFixture(2);
    advanceMockBot(AUTO_NOW);
    expect(hideMockBotMessages('admin', {}).ok).toBe(true);
    const snapshot = wire();
    resetMockDb();
    restoreCommunitySnapshot(snapshot);
    expect(mockDashboardThreads()).toEqual([]);
    expect(mockDb().messages.get('c1-general')?.[0]?.hiddenAt).toBeTruthy();
    expect(mockDb().messages.get('c1-general')?.[0]?.body).toContain('First topic');
  });

  it('keeps the one-time manual scenario marker so explicit enable survives reload', () => {
    autoFixture(2);
    seedManualMockBotScenario();
    mockDb().botSettings.autoGenerate = true;
    const snapshot = wire();
    resetMockDb();
    restoreCommunitySnapshot(snapshot);
    seedManualMockBotScenario();
    expect(mockDb().botSettings.autoGenerate).toBe(true);
  });

  it('rejects malformed chat before applying a valid-looking bot mutation', () => {
    autoFixture(2);
    advanceMockBot(AUTO_NOW);
    const before = captureCommunitySnapshot();
    const bad = structuredClone(before);
    bad.bot.settings.enabled = false;
    const message = bad.chat.messages[0]?.[1][0];
    if (!message) throw new Error('Missing message');
    message.roomId = 'wrong-room';
    expect(() => restoreCommunitySnapshot(bad)).toThrow();
    expect(captureCommunitySnapshot()).toEqual(before);
  });

  it('rejects duplicate map keys and credential-bearing top-level payloads', () => {
    autoFixture(2);
    const before = captureCommunitySnapshot();
    expect(() => restoreCommunitySnapshot({ ...before, accessToken: 'not-allowed' })).toThrow();
    const bad = structuredClone(before);
    bad.bot.state.daily = [
      ['duplicate', 1],
      ['duplicate', 2],
    ];
    expect(() => restoreCommunitySnapshot(bad)).toThrow();
    expect(captureCommunitySnapshot()).toEqual(before);
  });
});
