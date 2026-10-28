import { beforeEach, describe, expect, it } from 'vitest';
import { botBulkBatchSchema, botBulkItemsPageSchema } from '../../../api-domains/bot-bulk';
import { botState } from '../bot-state';
import { mockDb, resetMockDb } from '../store';
import { captureBotSnapshot, restoreBotSnapshot } from '../community-persistence/bot-snapshot';
import { createMockBulk } from './create';
import { BULK_NOW, bulkInput, createBulkFixture, finishBulkFixture } from './fixture';
import { latestMockBulk, listMockBulkItems, readMockBulk } from './state';
import { advanceMockBulk } from './worker';
import { selectMockBulk } from './selection';
import { saveMockBulk } from './save';

beforeEach(() => resetMockDb());
describe('REQ-607 mock bulk persisted workflow', () => {
  it('replays per actor/request before validating changed live dependencies and isolates latest by actor', () => {
    const { id, input } = createBulkFixture();
    mockDb().personas.forEach((p) => {
      p.enabled = false;
    });
    expect(createMockBulk('admin', input, BULK_NOW + 1)).toMatchObject({ ok: true, data: { id } });
    expect(botState().bulk).toHaveLength(1);
    expect(latestMockBulk('different')).toEqual({ batch: null });
    expect(createMockBulk('different', input)).toMatchObject({ ok: false, status: 409 });
    expect(latestMockBulk('admin').batch?.id).toBe(id);
  });
  it('advances strict draft results without publishing, uses persona opener/closer, and pages by ordinal', () => {
    const { id, record } = createBulkFixture();
    const scripts = structuredClone(mockDb().scripts);
    const messages = structuredClone(mockDb().messages);
    mockDb().botSettings.enabled = false;
    advanceMockBulk(BULK_NOW);
    expect(botBulkBatchSchema.parse(record.value)).toMatchObject({
      cursor: 1,
      total: 4,
      status: 'running',
      selectedCount: 1,
    });
    expect(record.items[0]?.lines[0]?.personaId).toBe(record.items[0]?.lines[3]?.personaId);
    expect(record.items[0]?.lines[0]?.personaId).not.toBe(record.items[0]?.lines[1]?.personaId);
    finishBulkFixture(id);
    const first = listMockBulkItems(id, { after: -1, limit: 2 });
    if (!first.ok) throw new Error(first.message);
    expect(botBulkItemsPageSchema.parse(first.data)).toMatchObject({ nextCursor: 1 });
    expect(first.data.items.map((i) => i.ordinal)).toEqual([0, 1]);
    const next = listMockBulkItems(id, { after: 1, limit: 2 });
    expect(next.ok && next.data.items.map((i) => i.ordinal)).toEqual([2, 3]);
    expect(next.ok && next.data.nextCursor).toBeNull();
    expect(mockDb().scripts).toEqual(scripts);
    expect(mockDb().messages).toEqual(messages);
  });
  it('persists progress/selection across reload and saves selected items once even after script deletion', () => {
    const { id } = createBulkFixture();
    advanceMockBulk(BULK_NOW);
    const snapshot = captureBotSnapshot();
    resetMockDb();
    restoreBotSnapshot(JSON.parse(JSON.stringify(snapshot)) as unknown);
    expect(readMockBulk(id)).toMatchObject({ ok: true, data: { cursor: 1 } });
    const record = finishBulkFixture(id);
    const omitted = record.items[0]!;
    expect(selectMockBulk(id, { itemIds: [omitted.id], selected: false }).ok).toBe(true);
    const savedState = captureBotSnapshot();
    resetMockDb();
    restoreBotSnapshot(savedState);
    const result = saveMockBulk(id, 'admin');
    if (!result.ok) throw new Error(result.message);
    expect(result.data.saved).toBe(3);
    const saved = mockDb().scripts.filter((s) => result.data.scriptIds.includes(s.id));
    expect(saved).toHaveLength(3);
    expect(
      saved.every((s) => s.enabled && s.runAt === null && s.delayMinutes === 6 && s.inviteReal),
    ).toBe(true);
    mockDb().scripts = mockDb().scripts.filter((s) => !result.data.scriptIds.includes(s.id));
    expect(saveMockBulk(id, 'admin')).toEqual({ ok: true, data: { saved: 0, scriptIds: [] } });
    expect(readMockBulk(id)).toMatchObject({ ok: true, data: { selectedCount: 3, savedCount: 3 } });
  });
  it('validates 500-item maximum workload and preserves every result across cursor pages', () => {
    const { id, record } = createBulkFixture({
      topics: Array.from({ length: 100 }, (_, i) => `Topic ${i}`),
      perTopic: 5,
      turns: 8,
    });
    finishBulkFixture(id);
    expect(record.items).toHaveLength(500);
    expect(new Set(record.items.map((i) => i.id)).size).toBe(500);
    expect(saveMockBulk(id, 'admin')).toMatchObject({ ok: true, data: { saved: 500 } });
    expect(() =>
      bulkInput({ topics: Array.from({ length: 101 }, (_, i) => `Topic ${i}`) }),
    ).toThrow();
  });
  it('rejects inconsistent snapshots atomically and accepts legacy snapshots without bulk state', () => {
    createBulkFixture();
    const original = captureBotSnapshot();
    const corrupt = structuredClone(original);
    corrupt.state.bulk[0]!.value.cursor = 1;
    expect(() => restoreBotSnapshot(corrupt)).toThrow();
    expect(captureBotSnapshot()).toEqual(original);
    const { bulk, ...legacy } = original.state;
    expect(bulk).toHaveLength(1);
    restoreBotSnapshot({ ...original, state: legacy });
    expect(botState().bulk).toEqual([]);
  });
});
