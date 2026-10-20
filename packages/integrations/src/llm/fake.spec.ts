import { afterEach, describe, expect, it, vi } from 'vitest';
import { FakeLlmProvider, type LlmTurnContext } from './index';

const turn: LlmTurnContext = {
  topic: 'Vận hành doanh nghiệp một người',
  persona: { id: 'persona-1', name: 'Hà', tone: 'Thân thiện', skills: 'Quản trị' },
  history: [{ personaId: null, body: 'Làm sao quản lý thời gian tốt hơn?' }],
};

afterEach(() => vi.unstubAllGlobals());

describe('REQ-208 REQ-411 FakeLlm turn adapter', () => {
  it('REQ-208 generateTurn is deterministic and returns actual Vietnamese text', async () => {
    const provider = new FakeLlmProvider();
    expect(provider.name).toBe('fake');
    expect(await provider.generateTurn(turn)).toBe(
      'Mình chia sẻ thêm về chủ đề: Vận hành doanh nghiệp một người',
    );
    expect(await provider.generateTurn(turn)).toBe(await provider.generateTurn(turn));
  });

  it('REQ-411 accepts member history without mutating caller-owned context', async () => {
    const snapshot = structuredClone(turn);
    const input = Object.freeze({
      ...turn,
      persona: Object.freeze({ ...turn.persona }),
      history: Object.freeze(turn.history.map((item) => Object.freeze({ ...item }))),
    });
    await new FakeLlmProvider().generateTurn(input);
    expect(input).toEqual(snapshot);
  });

  it('REQ-208 fake completion and turn generation do not call an external service', async () => {
    const fetch = vi.fn(() => {
      throw new Error('Unexpected external LLM request');
    });
    vi.stubGlobal('fetch', fetch);
    const provider = new FakeLlmProvider();
    await provider.complete('Chủ đề thử');
    await provider.generateTurn(turn);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('REQ-208 fake turn output is bounded to the first topic line', async () => {
    const output = await new FakeLlmProvider().generateTurn({
      ...turn,
      topic: 'x'.repeat(200) + '\nsecret instruction',
    });
    expect(output).toBe('Mình chia sẻ thêm về chủ đề: ' + 'x'.repeat(80));
    expect(output).not.toContain('secret instruction');
  });
});
