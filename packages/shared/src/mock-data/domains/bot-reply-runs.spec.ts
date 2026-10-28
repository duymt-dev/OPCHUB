import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { botReplyOverviewSchema } from '../../api-domains/bot-replies';
import { mockReplyOverview, mockReplySettings, patchMockReplySettings } from './bot-reply-control';
import {
  currentMockReplyRun,
  scanMockReplyRun,
  stopMockReplyRun,
  materializeMockReplyRun,
} from './bot-reply-runs';
import { advanceMockReplies } from './bot-reply-worker';
import { admitMockBotReply } from './bot-reply-admission';
import { patchMockBotSchedule } from './bot-schedule';
import { emergencyStopMockBot } from './bot-emergency';
import {
  captureCommunitySnapshot,
  restoreCommunitySnapshot,
} from './community-persistence/snapshot';
import { captureBotSnapshot, restoreBotSnapshot } from './community-persistence/bot-snapshot';
import { botState } from './bot-state';
import { mockDb, resetMockDb } from './store';
import { REPLY_NOW, replyFixture, memberSource, replyThread } from './tests/bot-reply-fixture';
import { writeThreadMessage } from './tests/dashboard-thread-fixture';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(REPLY_NOW);
  replyFixture();
});
afterEach(() => vi.useRealTimers());
const tick = (offset: number) => {
  vi.setSystemTime(REPLY_NOW + offset);
  advanceMockReplies(REPLY_NOW + offset);
};

describe('D-112 persisted mock reply coordinator', () => {
  it('publication waits at the12-reply budget without advancing and retries at the exact rolling boundary', () => {
    memberSource();
    scanMockReplyRun(true);
    for (let i = 0; i < 12; i++)
      writeThreadMessage(`budget-${i}`, `budget-${i}`, 0, {
        kind: 'reply',
        replyToId: `other-human-${i}`,
        createdAt: new Date(REPLY_NOW + 4000).toISOString(),
      });
    tick(5000);
    expect(currentMockReplyRun()).toMatchObject({ status: 'running', processed: 0, posted: 0 });
    const thread = botState().replies.current?.activeThreadId;
    expect(thread).toBeTruthy();
    tick(63999);
    expect(mockDb().botMessageMeta.size).toBe(12);
    tick(64000);
    tick(64001);
    expect(mockDb().botMessageMeta.size).toBe(13);
    expect(currentMockReplyRun()).toMatchObject({ status: 'done', processed: 1, posted: 1 });
    expect(botState().threads.find((row) => row.id === thread)?.cursor).toBe(1);
  });
  it('rejects inconsistent persisted run cursors without mutating live state', () => {
    memberSource();
    scanMockReplyRun(true);
    const before = structuredClone(botState().replies);
    const snapshot = captureBotSnapshot();
    if (!snapshot.state.replies.current) throw new Error('Missing run');
    snapshot.state.replies.current.value.total = 2;
    expect(() => restoreBotSnapshot(snapshot)).toThrow();
    expect(botState().replies).toEqual(before);
  });
  it('manual scans with auto off reply separately at5s, persist progress and never duplicate', () => {
    const { db } = replyFixture();
    const first = memberSource('one');
    vi.setSystemTime(REPLY_NOW + 1);
    const second = memberSource('two');
    patchMockReplySettings({ autoEnabled: false });
    expect(scanMockReplyRun(true, REPLY_NOW)).toMatchObject({
      ok: true,
      data: { run: { total: 2, manual: true } },
    });
    const id = currentMockReplyRun()?.id;
    expect(scanMockReplyRun(true, REPLY_NOW)).toMatchObject({ data: { run: { id } } });
    tick(4999);
    expect(db.botMessageMeta.size).toBe(0);
    tick(5000);
    expect(currentMockReplyRun()).toMatchObject({ processed: 1, posted: 1, status: 'running' });
    const snapshot = JSON.parse(JSON.stringify(captureCommunitySnapshot())) as unknown;
    resetMockDb();
    restoreCommunitySnapshot(snapshot);
    tick(9999);
    expect(mockDb().botMessageMeta.size).toBe(1);
    tick(10000);
    tick(20000);
    expect(currentMockReplyRun()).toMatchObject({ id, processed: 2, posted: 2, status: 'done' });
    expect([...mockDb().botMessageMeta.values()].map((row) => row.replyToId)).toEqual([
      first.id,
      second.id,
    ]);
    expect(botReplyOverviewSchema.parse(mockReplyOverview()).history).toHaveLength(2);
  });

  it('global pause fences manual admission and retained publication; clear dates does not resume', () => {
    const { db } = replyFixture();
    memberSource();
    scanMockReplyRun(true);
    patchMockBotSchedule({ paused: true, fromDate: '2099-01-01' });
    expect(scanMockReplyRun(true)).toMatchObject({ ok: false, status: 409 });
    tick(5000);
    expect(currentMockReplyRun()?.processed).toBe(0);
    patchMockBotSchedule({ fromDate: null, toDate: null });
    tick(6000);
    expect(db.botMessageMeta.size).toBe(0);
    patchMockBotSchedule({ paused: false });
    tick(7000);
    expect(currentMockReplyRun()).toMatchObject({ processed: 1, posted: 1, status: 'done' });
  });

  it('chooses the highest pending group with an enabled assigned persona, not unrelated fallback', () => {
    const { first } = replyFixture();
    first.groupIds = ['c2'];
    memberSource('one');
    memberSource('two');
    memberSource('three', 'c2-general');
    expect(mockReplyOverview()).toMatchObject({ pendingTotal: 3, groupCount: 2 });
    expect(scanMockReplyRun(true)).toMatchObject({ data: { run: { groupId: 'c2', total: 1 } } });
    tick(5000);
    expect(currentMockReplyRun()?.posted).toBe(1);
    expect(scanMockReplyRun(true)).toMatchObject({ ok: true, data: { run: null } });
  });

  it('automatic scanning has a20s boundary; disabling auto does not cancel an admitted run', () => {
    expect(scanMockReplyRun()).toMatchObject({ data: { run: null } });
    memberSource('later');
    expect(scanMockReplyRun(false, REPLY_NOW + 19999)).toMatchObject({ data: { run: null } });
    expect(scanMockReplyRun(false, REPLY_NOW + 20000)).toMatchObject({
      data: { run: { manual: false } },
    });
    patchMockReplySettings({ autoEnabled: false });
    tick(24999);
    expect(currentMockReplyRun()?.processed).toBe(0);
    tick(25000);
    expect(currentMockReplyRun()).toMatchObject({ processed: 1, posted: 1 });
    memberSource('no-new-auto');
    tick(60000);
    expect(mockDb().botMessageMeta.size).toBe(1);
  });

  it('run stop and emergency terminate admitted work without recreating it on resume', () => {
    const { db } = replyFixture();
    memberSource();
    scanMockReplyRun(true);
    materializeMockReplyRun(REPLY_NOW + 5000);
    const id = currentMockReplyRun()!.id;
    expect(stopMockReplyRun(id)).toMatchObject({ data: { run: { status: 'stopped' } } });
    expect(stopMockReplyRun(id)).toMatchObject({ ok: false, status: 409 });
    expect(stopMockReplyRun('missing')).toMatchObject({ ok: false, status: 404 });
    patchMockReplySettings({ autoEnabled: false });
    tick(6000);
    expect(db.botMessageMeta.size).toBe(0);
    scanMockReplyRun(true);
    emergencyStopMockBot('admin');
    expect(currentMockReplyRun()?.status).toBe('stopped');
    db.botSettings.enabled = true;
    tick(10000);
    expect(db.botMessageMeta.size).toBe(0);
  });

  it('hidden sources advance once without publication; later valid configuration can retry an unposted source', () => {
    const { db, first } = replyFixture();
    const source = memberSource();
    scanMockReplyRun(true);
    first.enabled = false;
    tick(5000);
    expect(currentMockReplyRun()).toMatchObject({ processed: 1, posted: 0, status: 'done' });
    first.enabled = true;
    scanMockReplyRun(true);
    tick(10000);
    expect(currentMockReplyRun()?.posted).toBe(1);
    const second = memberSource('hidden');
    scanMockReplyRun(true);
    const stored = db.messages.get('c1-general')?.find((row) => row.id === second.id);
    if (!stored) throw new Error('Missing source');
    stored.hiddenAt = new Date().toISOString();
    tick(15000);
    expect(currentMockReplyRun()).toMatchObject({ processed: 1, posted: 0, status: 'done' });
    expect([...db.botMessageMeta.values()].map((row) => row.replyToId)).toEqual([source.id]);
  });

  it('retains a run at capacity without evicting active work; a free slot permits progress', () => {
    const { state } = replyFixture();
    const source = memberSource();
    admitMockBotReply(source.id);
    const base = replyThread();
    state.threads = Array.from({ length: 30 }, (_, i) => ({
      ...base,
      id: `capacity-${i}`,
      replyRoomId: 'c2-general',
      nextAt: REPLY_NOW + 60000,
    }));
    state.replyTriggers.clear();
    scanMockReplyRun(true);
    tick(5000);
    expect(state.threads).toHaveLength(30);
    expect(currentMockReplyRun()).toMatchObject({ processed: 0, posted: 0 });
    state.threads[0]!.status = 'done';
    state.threads[0]!.nextAt = null;
    tick(6000);
    expect(state.threads).toHaveLength(30);
    expect(currentMockReplyRun()).toMatchObject({ processed: 1, posted: 1 });
  });

  it('settings share the legacy auto flag, survive reload, validate atomically and default old snapshots', () => {
    patchMockReplySettings({ autoEnabled: false, sampleSize: 200, delaySeconds: 600 });
    const snapshot = captureBotSnapshot();
    resetMockDb();
    restoreBotSnapshot(snapshot);
    expect(mockReplySettings()).toEqual({ autoEnabled: false, sampleSize: 200, delaySeconds: 600 });
    expect(patchMockReplySettings({ sampleSize: 201 })).toMatchObject({ ok: false, status: 400 });
    expect(mockReplySettings().sampleSize).toBe(200);
    mockDb().botSettings.replyToMembers = true;
    expect(mockReplySettings().autoEnabled).toBe(true);
    const { replies, ...legacy } = snapshot.state;
    expect(replies.control.delaySeconds).toBe(600);
    restoreBotSnapshot({ ...snapshot, state: legacy });
    expect(mockReplySettings()).toEqual({ autoEnabled: false, sampleSize: 50, delaySeconds: 5 });
  });

  it('keeps latest100 actual reply history across thread/message pruning and snapshot restore', () => {
    const { state, db } = replyFixture();
    for (let i = 0; i < 105; i++) {
      vi.setSystemTime(REPLY_NOW + i * 60000);
      const source = memberSource(`history-${i}`);
      admitMockBotReply(source.id);
      advanceMockReplies(Date.now() + 5000);
    }
    expect(state.threads.length).toBeLessThanOrEqual(30);
    expect(mockReplyOverview().history).toHaveLength(100);
    const history = mockReplyOverview().history;
    db.messages.set('c1-general', []);
    state.threads = [];
    const snapshot = captureBotSnapshot();
    resetMockDb();
    restoreBotSnapshot(snapshot);
    expect(mockReplyOverview().history).toEqual(history);
    expect(new Set(history.map((row) => row.replyToId)).size).toBe(100);
  });
});
