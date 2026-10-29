import { beforeEach, describe, expect, it } from 'vitest';
import { mockDb, resetMockDb } from '../store';
import { createMockBulk } from './create';
import { BULK_NOW, bulkInput, createBulkFixture, finishBulkFixture } from './fixture';
import { advanceMockBulk, retryMockBulk } from './worker';
import { selectMockBulk } from './selection';
import { saveMockBulk } from './save';

beforeEach(() => resetMockDb());
describe('REQ-607 bulk failures, retry and atomic save', () => {
  it('honors retry deadlines and never exceeds a restored three-attempt budget', () => {
    const { record } = createBulkFixture();
    let calls = 0;
    const unavailable = () => {
      calls++;
      throw new Error('Unavailable');
    };
    advanceMockBulk(BULK_NOW, unavailable);
    advanceMockBulk(BULK_NOW + 59_999, unavailable);
    expect(calls).toBe(1);
    expect(record).toMatchObject({ attempts: 1, nextAt: BULK_NOW + 60_000 });
    record.attempts = 3;
    advanceMockBulk(BULK_NOW + 60_000, unavailable);
    expect(calls).toBe(1);
    expect(record.value).toMatchObject({ status: 'failed', cursor: 0, error: 'provider' });
  });
  it('rejects save when every draft is deselected, leaving scripts and saved markers unchanged', () => {
    const { id } = createBulkFixture();
    const record = finishBulkFixture(id);
    expect(
      selectMockBulk(id, { itemIds: record.items.map((item) => item.id), selected: false }).ok,
    ).toBe(true);
    const scripts = structuredClone(mockDb().scripts);
    expect(saveMockBulk(id, 'admin')).toMatchObject({ ok: false, status: 409 });
    expect(mockDb().scripts).toEqual(scripts);
    expect(record.value).toMatchObject({ savedCount: 0, selectedCount: 0 });
  });
  it('rejects unknown groups/types and insufficient personas without admitting a batch', () => {
    expect(createMockBulk('admin', bulkInput({ groupIds: ['missing'] }))).toMatchObject({
      ok: false,
      status: 400,
    });
    expect(createMockBulk('admin', bulkInput({ typeId: 'missing' }))).toMatchObject({
      ok: false,
      status: 404,
    });
    mockDb().personas.forEach((p, i) => {
      p.enabled = i === 0;
    });
    expect(createMockBulk('admin', bulkInput())).toMatchObject({ ok: false, status: 409 });
  });
  it.each(['provider', 'invalid_response', 'duplicate'] as const)(
    'retains ready items after three %s attempts; explicit retry resumes the cursor',
    (error) => {
      const { id, record } = createBulkFixture();
      advanceMockBulk(BULK_NOW);
      const ready = structuredClone(record.items);
      const failure = () => {
        if (error === 'provider') throw new Error('Provider unavailable');
        return error === 'duplicate'
          ? { lines: ready[0]!.lines.map((line) => line.body) }
          : { lines: ['invalid'] };
      };
      for (let i = 0; i < 3; i++) advanceMockBulk(BULK_NOW + 1 + i * 60_000, failure);
      expect(record.value).toMatchObject({ status: 'failed', error, cursor: 1 });
      expect(record.items).toEqual(ready);
      expect(record.nextAt).toBeNull();
      expect(saveMockBulk(id, 'admin')).toMatchObject({ ok: false, status: 409 });
      expect(retryMockBulk(id, BULK_NOW).ok).toBe(true);
      finishBulkFixture(id);
      expect(record.items[0]).toEqual(ready[0]);
      expect(record.value.cursor).toBe(4);
      expect(retryMockBulk(id)).toMatchObject({ ok: false, status: 409 });
    },
  );
  it.each(['groups_missing', 'personas_missing'] as const)(
    'fails safely on %s and retains completed results for repair/retry',
    (error) => {
      const { id, record } = createBulkFixture();
      advanceMockBulk(BULK_NOW);
      if (error === 'groups_missing')
        mockDb().groups = mockDb().groups.filter((g) => g.id !== 'c1');
      else
        mockDb().personas.forEach((p) => {
          p.enabled = false;
        });
      advanceMockBulk(BULK_NOW + 1);
      expect(record.value).toMatchObject({ status: 'failed', error, cursor: 1 });
      expect(record.items).toHaveLength(1);
      expect(saveMockBulk(id, 'admin')).toMatchObject({ ok: false, status: 409 });
    },
  );
  it('selection is all-or-nothing for unknown/saved IDs and cannot delete a saved result', () => {
    const { id } = createBulkFixture();
    const record = finishBulkFixture(id);
    const item = record.items[0]!;
    expect(
      selectMockBulk(id, { itemIds: [item.id, crypto.randomUUID()], selected: false }),
    ).toMatchObject({ ok: false, status: 404 });
    expect(item.selected).toBe(true);
    expect(saveMockBulk(id, 'admin').ok).toBe(true);
    expect(selectMockBulk(id, { itemIds: [item.id], selected: false })).toMatchObject({
      ok: false,
      status: 409,
    });
    expect(item.selected).toBe(true);
  });
  it('save rechecks late collisions and live groups before any selected script is inserted', () => {
    const { id } = createBulkFixture();
    const record = finishBulkFixture(id);
    const script = mockDb().scripts[0]!;
    script.lines.push(structuredClone(record.items[1]!.lines[0]!));
    const before = structuredClone(mockDb().scripts);
    expect(saveMockBulk(id, 'admin')).toMatchObject({ ok: false, status: 409 });
    expect(mockDb().scripts).toEqual(before);
    expect(record.items.every((item) => item.savedScriptId === null)).toBe(true);
    script.lines.pop();
    mockDb().groups = mockDb().groups.filter((g) => g.id !== 'c1');
    expect(saveMockBulk(id, 'admin')).toMatchObject({ ok: false, status: 409 });
    expect(record.value.savedCount).toBe(0);
  });
});
