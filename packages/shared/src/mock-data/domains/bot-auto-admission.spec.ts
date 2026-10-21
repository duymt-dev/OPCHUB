import { describe, expect, it } from 'vitest';
import { botLogSchema } from '../../api-domains';
import { admitAutomaticMockThreads } from './bot-auto-admission';
import type { ThreadRec } from './bot-state-types';
import { AUTO_NOW, autoFixture } from './tests/bot-auto-fixture';

const occupied = (
  id: string,
  groupIds: string[],
  kind: ThreadRec['kind'] = 'script',
): ThreadRec => ({
  id,
  scriptId: null,
  kind,
  status: 'scheduled',
  createdAt: new Date(AUTO_NOW - 1000).toISOString(),
  cursor: 0,
  nextAt: AUTO_NOW,
  snapshot: { topic: 'Occupied', groupIds, lines: [], delayMinutes: 1 },
});

describe('REQ-208 automatic admission matches native reservation boundaries', () => {
  it('admits empty-body snapshots only; does not generate ahead or manufacture an admin audit', () => {
    const { db, state } = autoFixture();
    expect(admitAutomaticMockThreads(AUTO_NOW, () => 0)).toBe(1);
    expect(state.threads[0]).toMatchObject({ kind: 'auto', status: 'scheduled', cursor: 0 });
    expect(state.threads[0]?.snapshot.lines).toHaveLength(4);
    expect(state.threads[0]?.snapshot.lines.every((line) => line.body === '')).toBe(true);
    expect(db.botMessageMeta.size).toBe(0);
    expect(db.botLog.map((row) => botLogSchema.parse(row))).toHaveLength(1);
    expect(state.audit).toEqual([]);
    expect(admitAutomaticMockThreads(AUTO_NOW, () => 0)).toBe(0);
  });

  it.each(['script', 'reply', 'auto'] as const)('%s active work occupies its groups', (kind) => {
    const { state } = autoFixture();
    state.threads.push(occupied('busy', ['c1'], kind));
    expect(admitAutomaticMockThreads(AUTO_NOW, () => 0)).toBe(0);
    expect(state.threads).toHaveLength(1);
  });

  it('reserves all planned persona appearances across group plans, including the opener twice', () => {
    const { db, state } = autoFixture(2);
    for (const p of db.personas) {
      p.groupIds = ['c1', 'c2'];
      p.postsPerDay = 2;
    }
    expect(admitAutomaticMockThreads(AUTO_NOW, () => 0)).toBe(1);
    expect(state.threads[0]?.snapshot.groupIds).toEqual(['c1']);
    expect(state.threads[0]?.snapshot.lines).toHaveLength(3);
  });

  it('never evicts active work at capacity; a terminal slot is reused without exceeding30', () => {
    const { state } = autoFixture();
    state.threads = Array.from({ length: 30 }, (_, n) => occupied(`busy-${n}`, [`other-${n}`]));
    expect(admitAutomaticMockThreads(AUTO_NOW, () => 0)).toBe(0);
    const terminal = state.threads[0];
    if (!terminal) throw new Error('Missing terminal control');
    terminal.status = 'done';
    terminal.nextAt = null;
    expect(admitAutomaticMockThreads(AUTO_NOW, () => 0)).toBe(1);
    expect(state.threads).toHaveLength(30);
    expect(state.threads.some((row) => row.id === terminal.id)).toBe(false);
    expect(state.threads.filter((row) => row.status !== 'done')).toHaveLength(30);
  });

  it('rotates from the latest automatic topic, not from a later manual topic', () => {
    const { state } = autoFixture();
    const prior = occupied('prior-auto', ['c1'], 'auto');
    prior.status = 'done';
    prior.nextAt = null;
    prior.snapshot.topic = 'First topic';
    const manual = occupied('later-manual', ['c1']);
    manual.status = 'done';
    manual.nextAt = null;
    manual.createdAt = new Date(AUTO_NOW).toISOString();
    state.threads = [manual, prior];
    expect(admitAutomaticMockThreads(AUTO_NOW, () => 0)).toBe(1);
    expect(state.threads[0]?.snapshot.topic).toBe('Second topic');
  });
});
