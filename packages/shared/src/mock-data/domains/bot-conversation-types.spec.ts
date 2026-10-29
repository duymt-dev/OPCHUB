import { beforeEach, describe, expect, it } from 'vitest';
import { botConversationTypesPageSchema } from '../../api-domains';
import {
  createMockConversationType,
  findMockConversationType,
  listMockConversationTypes,
  removeMockConversationType,
} from './bot-conversation-types';
import { botState } from './bot-state';
import { captureBotSnapshot, restoreBotSnapshot } from './community-persistence/bot-snapshot';
import { mockDb, resetMockDb } from './store';

beforeEach(() => resetMockDb());
const create = (name: string) => {
  const result = createMockConversationType({ name, description: 'Một góc nhìn riêng' });
  if (!result.ok) throw new Error(result.message);
  return result.data;
};

describe('REQ-607 mock conversation-type catalog', () => {
  it('keeps four immutable builtins and rejects case-insensitive builtin/custom duplicates', () => {
    const page = botConversationTypesPageSchema.parse(listMockConversationTypes({ limit: 50 }));
    expect(page.builtins).toHaveLength(4);
    expect(page.items).toEqual([]);
    const custom = create('  Phỏng vấn  ');
    expect(custom.name).toBe('Phỏng vấn');
    for (const name of ['HỎI ĐÁP', 'phỏng vấn'])
      expect(createMockConversationType({ name, description: '' })).toMatchObject({
        ok: false,
        status: 409,
      });
    for (const type of page.builtins)
      expect(removeMockConversationType(type.id)).toMatchObject({ ok: false, status: 409 });
    expect(botState().conversationTypes).toHaveLength(1);
  });

  it('uses UUID keyset paging without dropping equal names or mutating stored ordering', () => {
    const types = ['Alpha', 'Beta', 'Gamma'].map(create);
    const expected = types.map((type) => type.id).sort();
    const first = listMockConversationTypes({ limit: 2 });
    expect(first.items.map((type) => type.id)).toEqual(expected.slice(0, 2));
    expect(first.nextCursor).toBe(expected[1]);
    if (!first.nextCursor) throw new Error('Missing cursor');
    const next = listMockConversationTypes({ limit: 2, after: first.nextCursor });
    expect(next.items.map((type) => type.id)).toEqual(expected.slice(2));
    expect(next.nextCursor).toBeNull();
    expect(botState().conversationTypes.map((type) => type.id)).toEqual(
      types.map((type) => type.id),
    );
    first.items[0]!.name = 'External edit';
    expect(botState().conversationTypes.some((type) => type.name === 'External edit')).toBe(false);
  });

  it('deleting a definition preserves saved script labels and unknown IDs are not found', () => {
    const type = create('Phỏng vấn');
    const script = mockDb().scripts[0];
    if (!script) throw new Error('Missing script');
    script.type = type.name;
    const before = structuredClone(script);
    expect(findMockConversationType(type.id)).toEqual({ ok: true, data: type });
    expect(removeMockConversationType(type.id)).toEqual({ ok: true, data: { id: type.id } });
    expect(script).toEqual(before);
    expect(findMockConversationType(type.id)).toMatchObject({ ok: false, status: 404 });
    expect(removeMockConversationType(type.id)).toMatchObject({ ok: false, status: 404 });
  });

  it('round trips custom definitions, defaults legacy snapshots and rejects malformed restore atomically', () => {
    const type = create('Phỏng vấn');
    const snapshot = captureBotSnapshot();
    resetMockDb();
    restoreBotSnapshot(JSON.parse(JSON.stringify(snapshot)) as unknown);
    expect(findMockConversationType(type.id)).toEqual({ ok: true, data: type });
    expect(() =>
      restoreBotSnapshot({
        ...snapshot,
        state: { ...snapshot.state, conversationTypes: [{ ...type, custom: false }] },
      }),
    ).toThrow();
    expect(captureBotSnapshot()).toEqual(snapshot);
    const { conversationTypes, ...legacy } = snapshot.state;
    expect(conversationTypes).toHaveLength(1);
    restoreBotSnapshot({ ...snapshot, state: legacy });
    expect(listMockConversationTypes({ limit: 50 }).items).toEqual([]);
    expect(listMockConversationTypes({ limit: 50 }).builtins).toHaveLength(4);
  });
});
