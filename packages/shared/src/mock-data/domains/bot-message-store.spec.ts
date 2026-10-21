import { beforeEach, describe, expect, it } from 'vitest';
import { recordMockBotMessage } from './bot-message-store';
import { mockDashboardThreads } from './dashboard-threads';
import { mockDb } from './store';
import { emptyBotHistory, writeThreadMessage } from './tests/dashboard-thread-fixture';

beforeEach(() => emptyBotHistory());

describe('REQ-411 D-48 private mock bot write identity', () => {
  it('rejects cross-persona replay of one execution/room/turn and global message-ID collision', () => {
    const db = mockDb();
    const first = writeThreadMessage('original', 'execution', 0);
    const persona = db.personas[1];
    if (!persona) throw new Error('Missing persona');
    expect(
      recordMockBotMessage(
        db,
        { ...first, id: 'replay' },
        {
          threadId: 'execution',
          kind: 'script',
          turn: 0,
          personaId: persona.id,
        },
      ),
    ).toBe(false);
    expect(
      recordMockBotMessage(
        db,
        { ...first, roomId: 'c2-general' },
        {
          threadId: 'different',
          kind: 'auto',
          turn: 0,
          personaId: persona.id,
        },
      ),
    ).toBe(false);
    expect(db.botMessageMeta.size).toBe(1);
    expect([...db.messages.values()].flat()).toHaveLength(1);
    expect(mockDashboardThreads()[0]?.id).toBe('original');
  });

  it('retains 120 latest simulated rows, preserves humans and never duplicates an old replay after pruning', () => {
    const db = mockDb();
    const first = writeThreadMessage('bot-000', 'execution-0');
    const human = { ...first, id: 'human', body: 'Human content', isSimulated: false };
    db.messages.set('c1-general', [human, first]);
    for (let n = 1; n <= 120; n++)
      writeThreadMessage(`bot-${String(n).padStart(3, '0')}`, `execution-${n}`);
    const stored = db.messages.get('c1-general') ?? [];
    expect(stored.filter((row) => row.isSimulated)).toHaveLength(120);
    expect(stored.filter((row) => !row.isSimulated)).toEqual([human]);
    expect(stored.some((row) => row.id === first.id)).toBe(false);
    const meta = db.botMessageMeta.get(first.id);
    if (!meta) throw new Error('Missing replay fence');
    expect(recordMockBotMessage(db, { ...first, id: 'replayed-pruned' }, meta)).toBe(false);
    expect((db.messages.get('c1-general') ?? []).length).toBe(121);
  });

  it('validates internal context before mutation and resets metadata with mock data', () => {
    const db = mockDb();
    const first = writeThreadMessage('original');
    const before = db.botMessageMeta.size;
    expect(() =>
      recordMockBotMessage(
        db,
        { ...first, id: 'invalid' },
        {
          threadId: '',
          kind: 'script',
          turn: -1,
          personaId: 'persona',
        },
      ),
    ).toThrow();
    expect(db.botMessageMeta.size).toBe(before);
    emptyBotHistory();
    expect(mockDb()).not.toBe(db);
    expect(mockDb().botMessageMeta.size).toBe(0);
    expect(mockDashboardThreads()).toEqual([]);
  });
});
