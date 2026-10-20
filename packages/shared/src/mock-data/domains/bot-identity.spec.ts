import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import { chatMessageSchema } from '../../api-domains';
import { advanceMockBot, joinGroup, listChatMessages, runBotScript } from './index';
import { mockDb, resetMockDb } from './store';

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date('2026-10-21T05:00:00Z'));
  resetMockDb();
});
afterEach(() => vi.useRealTimers());

/** D-48: tin bot persona hiển thị như thành viên — Portal không biết đâu là bot */
describe('bot identity on portal', () => {
  it('REQ-208 scheduled bot turn reaches portal without isSimulated or a bot role', () => {
    const script = mockDb().scripts[0];
    if (!script) throw new Error('seed has no script');
    const run = runBotScript(script.id);
    if (!run.ok) throw new Error('run failed');
    advanceMockBot();

    const gid = script.groupIds[0] ?? '';
    const roomId = `${gid}-general`;
    const stored = mockDb().messages.get(roomId) ?? [];
    expect(stored.at(-1)?.isSimulated).toBe(true);

    joinGroup('m1', gid);
    const page = listChatMessages('m1', roomId, undefined, undefined, 50);
    if (!page.ok) throw new Error('cannot read room');
    const last = page.data.items.at(-1);
    expect(last).toBeDefined();
    expect(last && 'isSimulated' in last).toBe(false);
    expect(last?.senderRole).toBeNull();
    expect(() => chatMessageSchema.strict().parse(last)).not.toThrow();
  });
});
