import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { admitMockBotReply } from './bot-reply-admission';
import { hideMockBotMessages, emergencyStopMockBot } from './bot-emergency';
import { advanceMockBot } from './bot-execution';
import { chatState } from './chat-store';
import { writeThreadMessage } from './tests/dashboard-thread-fixture';
import { memberSource, REPLY_NOW, replyFixture, replyThread } from './tests/bot-reply-fixture';

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(REPLY_NOW);
  replyFixture();
});
afterEach(() => vi.useRealTimers());

describe('UAT-14 REQ-411 MSW reply admission', () => {
  it('admits exactly one per source and one pending per room with a 30s–5min due boundary', () => {
    const { state } = replyFixture();
    const source = memberSource();
    const id = admitMockBotReply(source.id, REPLY_NOW);
    expect(id).not.toBeNull();
    expect(admitMockBotReply(source.id, REPLY_NOW)).toBe(id);
    expect(replyThread().nextAt).toBe(REPLY_NOW + 30000);
    expect(admitMockBotReply(memberSource('second').id, REPLY_NOW)).toBeNull();
    expect(state.threads).toHaveLength(1);
    state.threads = [];
    state.replyAdmissions.clear();
    expect(
      admitMockBotReply(memberSource('max-delay', 'c2-general').id, REPLY_NOW, () => 1),
    ).not.toBeNull();
    expect(replyThread().nextAt).toBe(REPLY_NOW + 300000);
  });

  it('addressed eligible persona beats recent speakers and randomness', () => {
    const { first, second } = replyFixture();
    second.enabled = true;
    writeThreadMessage('quoted', 'history1', 0, {
      personaId: second.id,
      createdAt: new Date(REPLY_NOW - 60000).toISOString(),
    });
    writeThreadMessage('recent', 'history2', 0, { personaId: first.id });
    const source = memberSource('addressed', 'c1-general', 'quoted');
    expect(admitMockBotReply(source.id, REPLY_NOW, () => 0)).not.toBeNull();
    expect(replyThread().snapshot.lines[0]?.personaId).toBe(second.id);
  });

  it('hidden quoted personas cannot override the latest10 visible room speakers', () => {
    const { first, second } = replyFixture();
    second.enabled = true;
    writeThreadMessage('hidden', 'history1', 0, {
      personaId: second.id,
      hiddenAt: new Date().toISOString(),
    });
    writeThreadMessage('recent', 'history2', 0, { personaId: first.id });
    const source = memberSource('hidden-address', 'c1-general', 'hidden');
    admitMockBotReply(source.id, REPLY_NOW, () => 1);
    expect(replyThread().snapshot.lines[0]?.personaId).toBe(first.id);
  });

  it('a cross-room legacy quote cannot nominate the addressed persona', () => {
    const { first, second } = replyFixture();
    second.enabled = true;
    writeThreadMessage('other-room', 'history1', 0, { roomId: 'c2-general', personaId: second.id });
    writeThreadMessage('recent', 'history2', 0, { personaId: first.id });
    const source = memberSource();
    const ext = chatState().ext.get(source.id);
    if (!ext) throw new Error('Missing quote fixture');
    ext.replyToId = 'other-room';
    admitMockBotReply(source.id, REPLY_NOW, () => 1);
    expect(replyThread().snapshot.lines[0]?.personaId).toBe(first.id);
  });

  it('persona preference uses only the latest10 visible messages, not unbounded room history', () => {
    const { first, second } = replyFixture();
    second.enabled = true;
    writeThreadMessage('old-speaker', 'history1', 0, {
      personaId: second.id,
      createdAt: new Date(REPLY_NOW - 60000).toISOString(),
    });
    for (let n = 0; n < 10; n++) memberSource(`recent-human-${n}`);
    const source = memberSource();
    admitMockBotReply(source.id, REPLY_NOW, () => 0);
    expect(replyThread().snapshot.lines[0]?.personaId).toBe(first.id);
  });

  it.each(['feature', 'global', 'reply'] as const)(
    'honors the %s switch before admission',
    (flag) => {
      const { db, state } = replyFixture();
      const source = memberSource();
      if (flag === 'feature') state.featureEnabled = false;
      if (flag === 'global') db.botSettings.enabled = false;
      if (flag === 'reply') db.botSettings.replyToMembers = false;
      expect(admitMockBotReply(source.id)).toBeNull();
      expect(state.threads).toHaveLength(0);
    },
  );

  it.each(['disabled', 'unassigned', 'hours', 'quota'] as const)(
    'skips %s persona once, without later unsolicited replay',
    (condition) => {
      const { first, state } = replyFixture();
      if (condition === 'disabled') first.enabled = false;
      if (condition === 'unassigned') first.groupIds = ['c2'];
      if (condition === 'hours') first.activeHours = '01:00 - 02:00';
      if (condition === 'quota') state.daily.set(`${first.id}:2026-10-21`, first.postsPerDay);
      const source = memberSource();
      expect(admitMockBotReply(source.id)).toBeNull();
      first.enabled = true;
      first.groupIds = ['c1'];
      first.activeHours = '00:00 - 24:00';
      state.daily.clear();
      expect(admitMockBotReply(source.id)).toBeNull();
      expect(state.activity.filter((row) => row.id === `bot-reply-skip-${source.id}`)).toHaveLength(
        1,
      );
    },
  );

  it('ignores topic messages and persona messages to prevent bot loops', () => {
    const { state } = replyFixture();
    expect(admitMockBotReply(memberSource('topic', 'c1-qa').id)).toBeNull();
    const simulated = writeThreadMessage('simulated');
    expect(admitMockBotReply(simulated.id)).toBeNull();
    expect(state.threads).toHaveLength(0);
  });

  it('cooldown survives hidden publication, thread GC and ephemeral cache loss; exact 2min boundary is allowed', () => {
    const { state } = replyFixture();
    const source = memberSource();
    admitMockBotReply(source.id);
    advanceMockBot(REPLY_NOW + 30000);
    hideMockBotMessages('admin', {});
    state.threads = [];
    state.replyAdmissions.clear();
    state.replyPosted.clear();
    vi.setSystemTime(REPLY_NOW + 149999);
    const second = memberSource('cooldown');
    expect(admitMockBotReply(second.id)).toBeNull();
    vi.setSystemTime(REPLY_NOW + 150000);
    expect(admitMockBotReply(second.id)).not.toBeNull();
  });

  it('emergency stop fences old triggers after re-enable but accepts a genuinely later member message', () => {
    const { db, state } = replyFixture();
    const source = memberSource();
    admitMockBotReply(source.id);
    expect(emergencyStopMockBot('admin')).toEqual({
      ok: true,
      data: { enabled: false, stopped: 1 },
    });
    db.botSettings.enabled = true;
    expect(admitMockBotReply(source.id)).toBeNull();
    advanceMockBot(REPLY_NOW + 300000);
    expect(state.todayCount).toBe(0);
    vi.setSystemTime(REPLY_NOW + 120001);
    expect(admitMockBotReply(memberSource('fresh').id)).not.toBeNull();
  });

  it('global 30-active cap never evicts active work, and only terminal snapshots are pruned', () => {
    const { state } = replyFixture();
    admitMockBotReply(memberSource().id);
    const base = replyThread();
    state.threads = Array.from({ length: 30 }, (_, i) => ({
      ...base,
      id: `active-${i}`,
      replyRoomId: 'c2-general',
    }));
    state.replyAdmissions.clear();
    const source = memberSource('capacity');
    expect(admitMockBotReply(source.id)).toBeNull();
    expect(state.threads).toHaveLength(30);
    for (const row of state.threads) {
      row.status = 'done';
      row.nextAt = null;
    }
    expect(admitMockBotReply(source.id)).not.toBeNull();
    expect(state.threads).toHaveLength(30);
    expect(state.threads.filter((row) => row.status === 'scheduled')).toHaveLength(1);
  });
});
